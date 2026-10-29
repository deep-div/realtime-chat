import { useState } from "react";
import { Avatar } from "../../../components/ui/Avatar";
import { useAuth } from "../../auth/hooks/useAuth";
import { useChat } from "../hooks/useChat";

export function ChatView() {
  const { profile } = useAuth();
  const { activeChat, messages, sendMessage } = useChat();
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
        {messages.map((message) => {
          const isMine = message.sender_id === profile?.user_id;
          return (
            <div key={message.message_id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${
                  isMine ? "bg-primary text-primary-foreground" : "bg-surface-muted text-ink"
                }`}
              >
                <p>{message.content.ciphertext}</p>
                {isMine && message.localStatus && (
                  <p className="mt-1 text-right text-[10px] opacity-70">{message.localStatus}</p>
                )}
              </div>
            </div>
          );
        })}
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
