import { AuthLanding } from "../../features/auth/components/AuthLanding";
import { ChatPlaceholder } from "../../features/auth/components/ChatPlaceholder";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { ChatView } from "../../features/chat/components/ChatView";
import { useChat } from "../../features/chat/hooks/useChat";
import { CompleteProfileForm } from "../../features/profile/components/CompleteProfileForm";

export function MainPanel() {
  const { user, isLoading, profile, isProfileLoading } = useAuth();
  const { activeChat } = useChat();

  function renderContent() {
    if (isLoading) return null;
    if (!user) return <AuthLanding />;
    if (user.emailVerified && (isProfileLoading || !profile)) {
      return isProfileLoading ? null : <CompleteProfileForm />;
    }
    return <ChatPlaceholder />;
  }

  if (activeChat) {
    return (
      <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-surface">
        <ChatView />
      </main>
    );
  }

  return (
    <main className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-surface-muted">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary-soft/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-primary-soft/50 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(22,21,43,0.04)_1px,transparent_0)] [background-size:28px_28px]" />

      <div className="relative z-10">{renderContent()}</div>
    </main>
  );
}
