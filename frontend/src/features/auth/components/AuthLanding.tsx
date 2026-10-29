import { useState } from "react";
import { Button } from "../../../components/ui/Button";
import { AuthModal } from "./AuthModal";
import { HeroIllustration } from "./HeroIllustration";

export function AuthLanding() {
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up" | null>(null);

  return (
    <div className="flex flex-col items-center gap-8 px-6 text-center">
      <HeroIllustration />

      <div className="flex flex-col items-center gap-3">
        <Button onClick={() => setAuthMode("sign-in")}>Sign in</Button>
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
