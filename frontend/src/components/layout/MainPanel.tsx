import { AuthLanding } from "../../features/auth/components/AuthLanding";
import { ChatPlaceholder } from "../../features/auth/components/ChatPlaceholder";
import { useAuth } from "../../features/auth/hooks/useAuth";

export function MainPanel() {
  const { user, isLoading } = useAuth();

  return (
    <main className="flex min-h-0 flex-1 items-center justify-center bg-surface-muted">
      {isLoading ? null : user ? <ChatPlaceholder /> : <AuthLanding />}
    </main>
  );
}
