import { ChatBubbleIcon } from "../../../components/ui/ChatBubbleIcon";

export function ChatPlaceholder() {
  return (
    <div className="flex flex-col items-center gap-4 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-soft">
        <ChatBubbleIcon className="h-8 w-8 text-primary" />
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-ink">
          Select a chat to start messaging
        </h2>
        <p className="text-sm text-ink-muted">
          Pick a conversation from the list, or start a new one.
        </p>
      </div>
    </div>
  );
}
