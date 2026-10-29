import { ChatBubbleIcon } from "../../../components/ui/ChatBubbleIcon";

export function ChatPlaceholder() {
  return (
    <div className="flex flex-col items-center gap-1 px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center">
        <ChatBubbleIcon className="h-7 w-7 text-primary" />
      </div>
      <h2 className="text-sm font-medium text-ink-muted">
        Select a chat to start messaging
      </h2>
    </div>
  );
}
