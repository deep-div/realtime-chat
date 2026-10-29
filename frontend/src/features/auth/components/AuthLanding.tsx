import { useState } from "react";
import { Button } from "../../../components/ui/Button";
import { AuthModal } from "./AuthModal";
import { HeroIllustration } from "./HeroIllustration";

export function AuthLanding() {
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up" | null>(null);

  return (
    <div className="flex flex-col items-center gap-2 px-6 text-center">
      <HeroIllustration />

      <h1 className="mt-3 text-[1.75rem] font-bold tracking-tight text-ink">
        Messenger
      </h1>
      <p className="text-sm text-ink-muted">
        Sign in to pick up your conversations.
      </p>

      <div className="mt-6 flex flex-col items-center gap-4">
        <Button onClick={() => setAuthMode("sign-in")} className="min-w-56">
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
