import type { EncryptedContent } from "./types";

const DB_NAME = "chat-e2e-keys";
const STORE_NAME = "identity-keys";
const DB_VERSION = 1;
const SCHEME = "ecdh-p256-aes-256-gcm-v1";
const HKDF_INFO = new TextEncoder().encode("realtime-chat-message-key-v1");

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function toBase64(buffer: ArrayBuffer): string {
  let binary = "";
  for (const byte of new Uint8Array(buffer)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

interface IdentityKeyPair {
  privateKey: CryptoKey;
  publicKey: CryptoKey;
}

const keyPairPromises = new Map<string, Promise<IdentityKeyPair>>();

async function loadOrCreateIdentityKeyPair(userId: string): Promise<IdentityKeyPair> {
  const storeKey = `identity:${userId}`;
  const existing = await idbGet<IdentityKeyPair>(storeKey);
  if (existing) return existing;

  const generated = (await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    false,
    ["deriveBits"],
  )) as CryptoKeyPair;

  const identity: IdentityKeyPair = { privateKey: generated.privateKey, publicKey: generated.publicKey };
  await idbSet(storeKey, identity);
  return identity;
}

/** Loads this device's persisted ECDH identity keypair for a user, generating one on first use.
 * Scoped by user id so switching accounts in the same browser never reuses another user's key. */
export function getIdentityKeyPair(userId: string): Promise<IdentityKeyPair> {
  let promise = keyPairPromises.get(userId);
  if (!promise) {
    promise = loadOrCreateIdentityKeyPair(userId);
    keyPairPromises.set(userId, promise);
  }
  return promise;
}

/** Exports a public key as base64-encoded SPKI, for uploading to the backend. */
export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
  const spki = await crypto.subtle.exportKey("spki", publicKey);
  return toBase64(spki);
}

async function importPeerPublicKey(base64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "spki",
    fromBase64(base64),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
}

const sharedKeyCache = new Map<string, Promise<CryptoKey>>();

/** Derives the AES-GCM key two users share for a chat, from (my private key, their public key). */
async function deriveSharedKey(privateKey: CryptoKey, peerPublicKeyBase64: string): Promise<CryptoKey> {
  const cached = sharedKeyCache.get(peerPublicKeyBase64);
  if (cached) return cached;

  const promise = (async () => {
    const peerPublicKey = await importPeerPublicKey(peerPublicKeyBase64);
    const sharedBits = await crypto.subtle.deriveBits(
      { name: "ECDH", public: peerPublicKey },
      privateKey,
      256,
    );
    const hkdfKey = await crypto.subtle.importKey("raw", sharedBits, "HKDF", false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
      { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(0), info: HKDF_INFO },
      hkdfKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
  })();
  sharedKeyCache.set(peerPublicKeyBase64, promise);
  return promise;
}

/** Encrypts plaintext for a chat peer. Falls back to an unencrypted payload if the peer
 * has no public key uploaded yet (e.g. they haven't opened the app on this build). */
export async function encryptForPeer(
  privateKey: CryptoKey,
  peerPublicKeyBase64: string | null | undefined,
  plaintext: string,
): Promise<EncryptedContent> {
  if (!peerPublicKeyBase64) {
    return { scheme: "plaintext-v0", ciphertext: plaintext };
  }

  const aesKey = await deriveSharedKey(privateKey, peerPublicKeyBase64);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, encoded);

  const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.byteLength);

  return { scheme: SCHEME, ciphertext: toBase64(combined.buffer) };
}

/** Decrypts a message's content. Returns the raw ciphertext unchanged for any non-E2E
 * scheme (e.g. legacy plaintext messages sent before encryption existed). */
export async function decryptFromPeer(
  privateKey: CryptoKey,
  peerPublicKeyBase64: string | null | undefined,
  content: { scheme: string; ciphertext: string },
): Promise<string> {
  if (content.scheme !== SCHEME || !peerPublicKeyBase64) {
    return content.ciphertext;
  }

  const aesKey = await deriveSharedKey(privateKey, peerPublicKeyBase64);
  const combined = new Uint8Array(fromBase64(content.ciphertext));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const plainBuffer = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, aesKey, ciphertext);
  return new TextDecoder().decode(plainBuffer);
}
