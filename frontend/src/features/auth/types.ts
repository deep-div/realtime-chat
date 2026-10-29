export interface AuthUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}

export interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  resendVerificationEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}
