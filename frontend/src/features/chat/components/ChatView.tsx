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

function formatLastSeen(lastSeen: number | null): string {
  if (!lastSeen) return "offline";
  const diffMs = Date.now() - lastSeen;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "last seen just now";
  if (minutes < 60) return `last seen ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `last seen ${hours}h ago`;
  return `last seen ${new Date(lastSeen).toLocaleDateString()}`;
}

export function ChatView() {
  const { profile } = useAuth();
  const { activeChat, messages, isLoadingMessages, sendMessage, presenceByUserId } = useChat();
  const [draft, setDraft] = useState("");

  if (!activeChat) return null;

  const presence = presenceByUserId[activeChat.peer.user_id];
  const statusLine =
    presence?.status === "online" ? "Online" : formatLastSeen(presence?.last_seen ?? null);

  function handleSend() {
    sendMessage(draft);
    setDraft("");
  }

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center gap-3 border-b border-border px-5 py-4">
        <div className="relative shrink-0">
          <Avatar
            src={activeChat.peer.avatar_url}
            label={activeChat.peer.display_name}
            className="h-9 w-9"
          />
          {presence?.status === "online" && (
            <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border-2 border-surface bg-emerald-500" />
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">{activeChat.peer.display_name}</p>
          <p className={`text-xs ${presence?.status === "online" ? "text-emerald-600" : "text-ink-muted"}`}>
            {statusLine}
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto bg-surface-gray px-5 py-4">
        {isLoadingMessages ? (
          <MessagesSkeleton />
        ) : (
          messages.map((message) => {
            const isMine = message.sender_id === profile?.user_id;
            return (
              <div key={message.message_id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                    isMine ? "bg-primary text-primary-foreground" : "bg-surface text-ink"
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
          className="w-full rounded-full bg-surface-muted px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:outline-none"
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
