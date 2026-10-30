import { useEffect, useState } from "react";
import { useAuth } from "../../auth/hooks/useAuth";
import { updateMyPublicKey } from "../../profile/api";
import { exportPublicKey, getIdentityKeyPair } from "../crypto";

/** Loads (or generates) this device's E2E identity keypair for the current user, and
 * keeps the backend's copy of the public key in sync so peers can message us. */
export function useIdentityPrivateKey(): CryptoKey | null {
  const { user, profile } = useAuth();
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null);

  useEffect(() => {
    if (!user || !profile) {
      setPrivateKey(null);
      return;
    }

    let cancelled = false;
    getIdentityKeyPair(user.uid).then(async (keyPair) => {
      if (cancelled) return;
      setPrivateKey(keyPair.privateKey);

      const publicKeyBase64 = await exportPublicKey(keyPair.publicKey);
      if (!cancelled && profile.public_key !== publicKeyBase64) {
        updateMyPublicKey(publicKeyBase64).catch(() => {
          // Best-effort - peers just won't be able to E2E-encrypt to us until this succeeds.
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [user, profile]);

  return privateKey;
}
