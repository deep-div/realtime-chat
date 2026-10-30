import { useEffect, useState } from "react";
import { decryptFromPeer } from "../crypto";

/** Decrypts a piece of message content for display, given the current user's identity
 * key and the chat peer's public key. Falls back to the raw text for unencrypted content
 * (e.g. legacy plaintext messages) or while decryption is still in flight. */
export function useDecryptedText(
  content: { scheme: string; ciphertext: string } | null,
  privateKey: CryptoKey | null,
  peerPublicKey: string | null | undefined,
): string {
  const [text, setText] = useState(content?.ciphertext ?? "");

  useEffect(() => {
    if (!content) {
      setText("");
      return;
    }
    if (!privateKey) {
      setText(content.ciphertext);
      return;
    }

    let cancelled = false;
    decryptFromPeer(privateKey, peerPublicKey, content)
      .then((plain) => {
        if (!cancelled) setText(plain);
      })
      .catch(() => {
        if (!cancelled) setText("Unable to decrypt message");
      });

    return () => {
      cancelled = true;
    };
  }, [privateKey, peerPublicKey, content?.scheme, content?.ciphertext]);

  return text;
}
