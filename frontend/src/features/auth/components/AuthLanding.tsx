import { useState } from "react";
import { Button } from "../../../components/ui/Button";
import { AuthModal } from "./AuthModal";
import { HeroIllustration } from "./HeroIllustration";

export function AuthLanding() {
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up" | null>(null);

  return (
    <div className="flex flex-col items-center gap-3 px-6 text-center">
      <HeroIllustration />

      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
        Messenger
      </h1>

      <div className="mt-4 flex flex-col items-center gap-3">
        <Button onClick={() => setAuthMode("sign-in")} className="min-w-48">
          Sign in
        </Button>
        <p className="text-sm text-ink-muted">
          Don't have an account?{" "}
          <button
            type="button"
            onClick={() => setAuthMode("sign-up")}
            className="font-semibold text-primary hover:underline"
          >
            Sign Up
          </button>
        </p>
      </div>

      <AuthModal
        isOpen={authMode !== null}
        initialMode={authMode ?? "sign-in"}
        onClose={() => setAuthMode(null)}
      />
    </div>
  );
}
