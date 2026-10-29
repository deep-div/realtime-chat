import { AuthLanding } from "../../features/auth/components/AuthLanding";
import { ChatPlaceholder } from "../../features/auth/components/ChatPlaceholder";
import { useAuth } from "../../features/auth/hooks/useAuth";

export function MainPanel() {
  const { user, isLoading } = useAuth();

  return (
    <main className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-surface-muted">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary-soft/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-primary-soft/50 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(22,21,43,0.04)_1px,transparent_0)] [background-size:28px_28px]" />

      <div className="relative z-10">
        {isLoading ? null : user ? <ChatPlaceholder /> : <AuthLanding />}
      </div>
    </main>
  );
}
