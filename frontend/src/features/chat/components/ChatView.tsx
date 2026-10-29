import { useState } from "react";
import { Avatar } from "../../../components/ui/Avatar";
import { MessageStatusTicks } from "../../../components/ui/MessageStatusTicks";
import { Skeleton } from "../../../components/ui/Skeleton";
import { useAuth } from "../../auth/hooks/useAuth";
import { useChat } from "../hooks/useChat";

const SKELETON_BUBBLE_WIDTHS = ["w-40", "w-56", "w-32", "w-48"];

function MessagesSkeleton() {
  return (
    <div className="space-y-2">
      {SKELETON_BUBBLE_WIDTHS.map((width, index) => (
        <div key={index} className={`flex ${index % 2 === 0 ? "justify-start" : "justify-end"}`}>
          <Skeleton className={`h-9 ${width} rounded-2xl`} />
        </div>
      ))}
    </div>
  );
}

export function ChatView() {
  const { profile } = useAuth();
  const { activeChat, messages, isLoadingMessages, sendMessage } = useChat();
  const [draft, setDraft] = useState("");

  if (!activeChat) return null;

  function handleSend() {
    sendMessage(draft);
    setDraft("");
  }

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center gap-3 border-b border-border px-5 py-4">
        <Avatar
          src={activeChat.peer.avatar_url}
          label={activeChat.peer.display_name}
          className="h-9 w-9"
        />
        <div>
          <p className="text-sm font-semibold text-ink">{activeChat.peer.display_name}</p>
          <p className="text-xs text-ink-muted">@{activeChat.peer.username}</p>
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-5 py-4">
        {isLoadingMessages ? (
          <MessagesSkeleton />
        ) : (
          messages.map((message) => {
            const isMine = message.sender_id === profile?.user_id;
            return (
              <div key={message.message_id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${
                    isMine ? "bg-primary text-primary-foreground" : "bg-surface-muted text-ink"
                  }`}
                >
                  <p>{message.content.ciphertext}</p>
                  {isMine && (
                    <div className="mt-1 flex justify-end">
                      <MessageStatusTicks status={message.localStatus} className="h-3.5 w-3.5 opacity-80" />
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-border px-5 py-4">
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") handleSend();
          }}
          placeholder="Type a message..."
          className="w-full rounded-xl bg-surface-muted px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:outline-none"
        />
        <button
          type="button"
          onClick={handleSend}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
        >
          Send
        </button>
      </div>
    </div>
  );
}
