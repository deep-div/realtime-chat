import { type FormEvent, useState } from "react";
import { Button } from "../../../components/ui/Button";
import { GoogleIcon } from "../../../components/ui/GoogleIcon";
import { Input } from "../../../components/ui/Input";
import { Modal } from "../../../components/ui/Modal";
import { useAuth } from "../hooks/useAuth";

type Mode = "sign-in" | "sign-up";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const INCORRECT_CREDENTIALS = "Incorrect email or password.";

const FRIENDLY_ERRORS: Record<string, string> = {
  "auth/invalid-email": INCORRECT_CREDENTIALS,
  "auth/user-not-found": INCORRECT_CREDENTIALS,
  "auth/wrong-password": INCORRECT_CREDENTIALS,
  "auth/invalid-credential": INCORRECT_CREDENTIALS,
  "auth/invalid-login-credentials": INCORRECT_CREDENTIALS,
  "auth/user-disabled": "This account has been disabled.",
  "auth/email-already-in-use": "An account already exists with that email.",
  "auth/weak-password": "Password should be at least 6 characters.",
  "auth/popup-closed-by-user": "Sign in was cancelled.",
  "auth/too-many-requests": "Too many attempts. Please try again later.",
  "auth/operation-not-allowed":
    "Email/password sign-in isn't enabled for this app yet.",
  "auth/email-not-verified":
    "Please verify your email before signing in. Check your inbox for the verification link.",
};

function hasErrorCode(error: unknown): error is { code: string } {
  return typeof error === "object" && error !== null && "code" in error;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (hasErrorCode(error)) {
    return FRIENDLY_ERRORS[error.code] ?? fallback;
  }
  return fallback;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const {
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    resendVerificationEmail,
  } = useAuth();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  const resetState = () => {
    setEmail("");
    setPassword("");
    setError(null);
    setIsSubmitting(false);
    setVerificationSent(false);
    setNeedsVerification(false);
    setResendStatus(null);
    setMode("sign-in");
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const toggleMode = () => {
    setError(null);
    setMode((current) => (current === "sign-in" ? "sign-up" : "sign-in"));
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
      handleClose();
    } catch (err) {
      setError(getErrorMessage(err, "Something went wrong. Please try again."));
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNeedsVerification(false);
    setResendStatus(null);
    setIsSubmitting(true);
    try {
      if (mode === "sign-up") {
        await signUpWithEmail(email, password);
        setVerificationSent(true);
        setIsSubmitting(false);
      } else {
        await signInWithEmail(email, password);
        handleClose();
      }
    } catch (err) {
      const fallback =
        mode === "sign-in"
          ? INCORRECT_CREDENTIALS
          : "Something went wrong. Please try again.";
      setError(getErrorMessage(err, fallback));
      setNeedsVerification(hasErrorCode(err) && err.code === "auth/email-not-verified");
      setIsSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    setResendStatus(null);
    setIsSubmitting(true);
    try {
      await resendVerificationEmail(email, password);
      setResendStatus("Verification email sent. Check your inbox.");
    } catch {
      setResendStatus("Couldn't resend the email. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (verificationSent) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose}>
        <div className="flex flex-col items-center gap-3 text-center">
          <h2 className="text-lg font-semibold text-ink">Check your email</h2>
          <p className="text-sm text-ink-muted">
            We sent a verification link to <strong>{email}</strong>. Verify
            your address, then sign in.
          </p>
          <Button onClick={handleClose} className="mt-2 w-full">
            Got it
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="flex flex-col gap-5">
        <h2 className="text-center text-lg font-semibold text-ink">
          {mode === "sign-in" ? "Sign in to Mingle" : "Create your account"}
        </h2>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <Input
            id="email"
            type="email"
            label="Email"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <Input
            id="password"
            type="password"
            label="Password"
            placeholder="••••••••"
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={6}
            required
          />

          {error && (
            <div className="space-y-2">
              <p className="text-sm text-red-500">{error}</p>
              {needsVerification && (
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={isSubmitting}
                  className="text-sm font-semibold text-primary hover:underline disabled:opacity-60"
                >
                  Resend verification email
                </button>
              )}
              {resendStatus && (
                <p className="text-sm text-ink-muted">{resendStatus}</p>
              )}
            </div>
          )}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting
              ? "Please wait…"
              : mode === "sign-in"
                ? "Sign in"
                : "Create account"}
          </Button>
        </form>

        <div className="flex items-center gap-3 text-xs text-ink-muted">
          <div className="h-px flex-1 bg-border" />
          or
          <div className="h-px flex-1 bg-border" />
        </div>

        <Button
          variant="secondary"
          onClick={handleGoogleSignIn}
          disabled={isSubmitting}
          className="w-full"
        >
          <GoogleIcon className="h-5 w-5" />
          Continue with Google
        </Button>

        <p className="text-center text-sm text-ink-muted">
          {mode === "sign-in" ? "Don't have an account? " : "Already have an account? "}
          <button
            type="button"
            onClick={toggleMode}
            className="font-semibold text-primary hover:underline"
          >
            {mode === "sign-in" ? "Sign Up" : "Sign in"}
          </button>
        </p>
      </div>
    </Modal>
  );
}
