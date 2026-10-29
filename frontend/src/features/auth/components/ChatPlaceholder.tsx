import { ChatBubbleIcon } from "../../../components/ui/ChatBubbleIcon";
import { useAuth } from "../hooks/useAuth";

export function ChatPlaceholder() {
  const { user, signOut } = useAuth();

  return (
    <div className="flex flex-col items-center gap-4 px-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-soft">
        <ChatBubbleIcon className="h-9 w-9 text-primary" />
      </div>
      <h2 className="text-xl font-semibold text-ink">
        Select a chat to start messaging
      </h2>
      <p className="max-w-xs text-sm text-ink-muted">
        Choose a conversation from the list to pick up where you left off.
      </p>

      {user?.email && !user.emailVerified && (
        <p className="max-w-xs text-sm text-amber-600">
          Please verify your email address ({user.email}) to secure your
          account.
        </p>
      )}

      <button
        type="button"
        onClick={() => void signOut()}
        className="text-sm font-semibold text-primary hover:underline"
      >
        Sign out
      </button>
    </div>
  );
}
