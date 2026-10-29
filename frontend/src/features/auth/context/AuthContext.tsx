import {
  type ReactNode,
  createContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type User as FirebaseUser,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { firebaseAuth, googleAuthProvider } from "../../../lib/firebase/config";
import type { AuthContextValue, AuthUser } from "../types";

export const AuthContext = createContext<AuthContextValue | null>(null);

class EmailNotVerifiedError extends Error {
  code = "auth/email-not-verified";
}

function toAuthUser(firebaseUser: FirebaseUser | null): AuthUser | null {
  if (!firebaseUser) return null;
  return {
    uid: firebaseUser.uid,
    displayName: firebaseUser.displayName,
    email: firebaseUser.email,
    photoURL: firebaseUser.photoURL,
    emailVerified: firebaseUser.emailVerified,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const suppressAuthEventsRef = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (firebaseUser) => {
      if (suppressAuthEventsRef.current) return;
      setUser(toAuthUser(firebaseUser));
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  // Some flows (verify-before-login) sign the user in and back out again as
  // an implementation detail. Suppress onAuthStateChanged while that's
  // happening so the app's `user` state doesn't flicker through it.
  async function withSuppressedAuthEvents<T>(fn: () => Promise<T>): Promise<T> {
    suppressAuthEventsRef.current = true;
    try {
      return await fn();
    } finally {
      suppressAuthEventsRef.current = false;
    }
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      signInWithGoogle: async () => {
        await signInWithPopup(firebaseAuth, googleAuthProvider);
      },
      signUpWithEmail: async (email, password) => {
        await withSuppressedAuthEvents(async () => {
          const credential = await createUserWithEmailAndPassword(
            firebaseAuth,
            email,
            password,
          );
          await sendEmailVerification(credential.user);
          await firebaseSignOut(firebaseAuth);
        });
      },
      signInWithEmail: async (email, password) => {
        let verifiedUser: FirebaseUser | null = null;
        await withSuppressedAuthEvents(async () => {
          const credential = await signInWithEmailAndPassword(
            firebaseAuth,
            email,
            password,
          );
          if (!credential.user.emailVerified) {
            await firebaseSignOut(firebaseAuth);
            throw new EmailNotVerifiedError();
          }
          verifiedUser = credential.user;
        });
        if (verifiedUser) {
          setUser(toAuthUser(verifiedUser));
        }
      },
      resendVerificationEmail: async (email, password) => {
        await withSuppressedAuthEvents(async () => {
          const credential = await signInWithEmailAndPassword(
            firebaseAuth,
            email,
            password,
          );
          await sendEmailVerification(credential.user);
          await firebaseSignOut(firebaseAuth);
        });
      },
      signOut: async () => {
        await firebaseSignOut(firebaseAuth);
      },
    }),
    [user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
