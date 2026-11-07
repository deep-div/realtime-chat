import { AuthLanding } from "../../features/auth/components/AuthLanding";
import { ChatPlaceholder } from "../../features/auth/components/ChatPlaceholder";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { ChatView } from "../../features/chat/components/ChatView";
import { useChat } from "../../features/chat/hooks/useChat";

export function MainPanel() {
  const { user, isLoading } = useAuth();
  const { activeChat } = useChat();

  function renderContent() {
    if (isLoading) return null;
    if (!user) return <AuthLanding />;
    return <ChatPlaceholder />;
  }

  if (user && activeChat) {
    return (
      <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[#ffffff]">
        <ChatView />
      </main>
    );
  }

  return (
    <main className="relative flex min-h-0 flex-1 overflow-x-hidden overflow-y-auto bg-[#ffffff]">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary-soft/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-primary-soft/50 blur-3xl" />

      {/* min-h-full (not items-center on the scroll container itself) so content past
          the fold scrolls into view instead of being clipped at the top on short screens. */}
      <div className="flex min-h-full w-full items-center justify-center px-4 py-6">
        <div className="relative z-10">{renderContent()}</div>
      </div>
    </main>
  );
}
