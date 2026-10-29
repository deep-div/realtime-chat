import { AuthLanding } from "../../features/auth/components/AuthLanding";
import { ChatPlaceholder } from "../../features/auth/components/ChatPlaceholder";
import { SparkleIcon } from "../ui/SparkleIcon";
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
      <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-gradient-to-br from-surface to-surface-muted/40">
        <ChatView />
      </main>
    );
  }

  return (
    <main className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-surface-muted">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary-soft/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-primary-soft/50 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(22,21,43,0.04)_1px,transparent_0)] [background-size:28px_28px]" />

      <SparkleIcon className="pointer-events-none absolute left-[18%] top-[22%] h-3 w-3 text-primary/30" />
      <SparkleIcon className="pointer-events-none absolute right-[22%] top-[16%] h-5 w-5 text-amber-300/60" />
      <SparkleIcon className="pointer-events-none absolute left-[24%] bottom-[20%] h-4 w-4 text-primary/25" />
      <SparkleIcon className="pointer-events-none absolute right-[16%] bottom-[28%] h-2.5 w-2.5 text-ink/15" />
      <SparkleIcon className="pointer-events-none absolute left-[12%] top-[52%] h-2 w-2 text-amber-300/40" />
      <SparkleIcon className="pointer-events-none absolute right-[30%] top-[70%] h-3 w-3 text-primary/20" />

      <div className="relative z-10">{renderContent()}</div>
    </main>
  );
}
