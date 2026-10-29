import { useState } from "react";
import { Button } from "../../../components/ui/Button";
import { AuthModal } from "./AuthModal";
import { HeroIllustration } from "./HeroIllustration";

export function AuthLanding() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="flex flex-col items-center gap-8 px-6 text-center">
      <HeroIllustration />

      <Button onClick={() => setIsModalOpen(true)}>Sign in</Button>

      <AuthModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
