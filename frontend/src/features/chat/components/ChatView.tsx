import { useEffect, useRef, useState } from "react";
import { ArrowLeftIcon } from "../../../components/ui/ArrowLeftIcon";
import { Avatar } from "../../../components/ui/Avatar";
import { DotsIcon } from "../../../components/ui/DotsIcon";
import { MessageStatusTicks } from "../../../components/ui/MessageStatusTicks";
import { PhoneIcon } from "../../../components/ui/PhoneIcon";
import { SearchIcon } from "../../../components/ui/SearchIcon";
import { Skeleton } from "../../../components/ui/Skeleton";
import { SmileIcon } from "../../../components/ui/SmileIcon";
import { VideoIcon } from "../../../components/ui/VideoIcon";
import { useAuth } from "../../auth/hooks/useAuth";
import { getChatMembers } from "../api";
import { useDecryptedText } from "../hooks/useDecryptedText";
import { useChat } from "../hooks/useChat";
import type { ChatMemberProfile, ChatMessage } from "../types";
import { EmojiPicker } from "./EmojiPicker";

const AVATAR_STACK_VISIBLE_COUNT = 3;

function GroupAvatarStack({ members, onClick }: { members: ChatMemberProfile[]; onClick: () => void }) {
  if (members.length === 0) return null;

  const visible = members.slice(0, AVATAR_STACK_VISIBLE_COUNT);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="View group members"
      className="flex shrink-0 items-center rounded-full transition-opacity hover:opacity-80"
    >
      <div className="flex items-center">
        {visible.map((member, index) => (
          <div
            key={member.user_id}
            className="rounded-full ring-2 ring-surface"
            style={{ marginLeft: index === 0 ? 0 : -10, zIndex: visible.length - index }}
          >
            <Avatar
              src={member.profile?.avatar_url}
              label={member.profile?.display_name ?? "?"}
              className="h-8 w-8"
              textClassName="text-xs"
            />
          </div>
        ))}
      </div>
      <span className="ml-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-primary-soft px-2 text-xs font-semibold text-primary">
        {members.length}
      </span>
    </button>
  );
}

function GroupMembersModal({
  members,
  currentUserId,
  onClose,
}: {
  members: ChatMemberProfile[];
  currentUserId: string | undefined;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-surface p-4 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink">Group members ({members.length})</h3>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
          >
            ×
          </button>
        </div>
        <div className="max-h-80 space-y-1 overflow-y-auto scrollbar-hide">
          {members.map((member) => (
            <div key={member.user_id} className="flex items-center gap-3 rounded-xl px-2 py-2">
              <Avatar
                src={member.profile?.avatar_url}
                label={member.profile?.display_name ?? "?"}
                className="h-9 w-9"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">
                  {member.user_id === currentUserId ? "You" : member.profile?.display_name ?? "Unknown"}
                </p>
                {member.profile?.username && (
                  <p className="truncate text-xs text-ink-muted">@{member.profile.username}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ComingSoonIconButton({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        aria-label={label}
        className="flex h-9 w-9 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface-muted"
      >
        {children}
      </button>
      <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100">
        Coming soon
      </span>
    </div>
  );
}

const SKELETON_BUBBLE_WIDTHS = ["w-40", "w-56", "w-32", "w-48"];
const TYPING_STOP_DELAY_MS = 3000;

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

function MessageBubble({
  message,
  isMine,
  privateKey,
  peerPublicKey,
}: {
  message: ChatMessage;
  isMine: boolean;
  privateKey: CryptoKey | null;
  peerPublicKey: string | null | undefined;
}) {
  const text = useDecryptedText(message.content, privateKey, peerPublicKey);

  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
          isMine ? "bg-primary text-primary-foreground" : "bg-surface text-ink"
        }`}
      >
        <p>{text}</p>
        {isMine && (
          <div className="mt-1 flex justify-end">
            <MessageStatusTicks status={message.localStatus} className="h-3.5 w-3.5 opacity-80" />
          </div>
        )}
      </div>
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
  const {
    activeChat,
    messages,
    isLoadingMessages,
    sendMessage,
    presenceByUserId,
    typingByChatId,
    typingUsersByChatId,
    setTyping,
    privateKey,
    closeChat,
  } = useChat();
  const [draft, setDraft] = useState("");
  const [members, setMembers] = useState<ChatMemberProfile[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const draftInputRef = useRef<HTMLInputElement>(null);

  // Stop announcing typing when leaving this chat (switch or unmount), not just on send.
  useEffect(() => {
    const chatId = activeChat?.chatId;
    return () => {
      if (!chatId) return;
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (isTypingRef.current) {
        isTypingRef.current = false;
        setTyping(chatId, false);
      }
    };
  }, [activeChat?.chatId, setTyping]);

  useEffect(() => {
    setShowEmojiPicker(false);
    setShowMembersModal(false);
  }, [activeChat?.chatId]);

  // Fetch member names for the group header subtitle - not needed for direct chats,
  // which already show the peer's presence/typing status instead.
  useEffect(() => {
    if (!activeChat || activeChat.chatType !== "group") {
      setMembers([]);
      return;
    }
    let cancelled = false;
    getChatMembers(activeChat.chatId)
      .then((result) => {
        if (!cancelled) setMembers(result);
      })
      .catch(() => {
        if (!cancelled) setMembers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [activeChat?.chatId, activeChat?.chatType]);

  if (!activeChat) return null;

  const isGroup = activeChat.chatType === "group";
  const presence = activeChat.peer ? presenceByUserId[activeChat.peer.user_id] : undefined;
  const isPeerTyping = !!typingByChatId[activeChat.chatId];
  const memberNamesLine = members.length
    ? members
        .map((member) =>
          member.user_id === profile?.user_id ? "You" : member.profile?.display_name ?? "Unknown",
        )
        .join(", ")
    : null;
  const typingUserIds = (typingUsersByChatId[activeChat.chatId] ?? []).filter(
    (id) => id !== profile?.user_id,
  );
  const typingNamesLine = typingUserIds.length
    ? typingUserIds
        .map((id) => members.find((member) => member.user_id === id)?.profile?.display_name ?? "Someone")
        .join(", ") + (typingUserIds.length > 1 ? " are typing..." : " is typing...")
    : null;
  const statusLine = isGroup
    ? typingNamesLine ?? memberNamesLine ?? "Group chat"
    : isPeerTyping
      ? "typing..."
      : presence?.status === "online"
        ? "Online"
        : formatLastSeen(presence?.last_seen ?? null);

  function stopTypingNow() {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (isTypingRef.current) {
      isTypingRef.current = false;
      setTyping(activeChat.chatId, false);
    }
  }

  function handleDraftChange(value: string) {
    setDraft(value);

    if (!value.trim()) {
      stopTypingNow();
      return;
    }

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      setTyping(activeChat.chatId, true);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(stopTypingNow, TYPING_STOP_DELAY_MS);
  }

  function handleSend() {
    stopTypingNow();
    sendMessage(draft);
    setDraft("");
  }

  function handleEmojiSelect(emoji: string) {
    const input = draftInputRef.current;
    const start = input?.selectionStart ?? draft.length;
    const end = input?.selectionEnd ?? draft.length;
    const nextDraft = draft.slice(0, start) + emoji + draft.slice(end);
    handleDraftChange(nextDraft);
    requestAnimationFrame(() => {
      input?.focus();
      const cursor = start + emoji.length;
      input?.setSelectionRange(cursor, cursor);
    });
  }

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center gap-3 border-b border-border px-5 py-4">
        <button
          type="button"
          aria-label="Back to chats"
          onClick={closeChat}
          className="-ml-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface-muted md:hidden"
        >
          <ArrowLeftIcon className="h-4.5 w-4.5 stroke-[2.5]" />
        </button>
        <div className="relative shrink-0">
          <Avatar
            src={isGroup ? null : activeChat.peer?.avatar_url}
            label={isGroup ? activeChat.title ?? "Group" : activeChat.peer?.display_name ?? "?"}
            className="h-9 w-9"
          />
          {!isGroup && presence?.status === "online" && (
            <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border-2 border-surface bg-primary" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">
            {isGroup ? activeChat.title ?? "Group chat" : activeChat.peer?.display_name}
          </p>
          <p
            className={`truncate text-xs ${
              (isGroup && typingNamesLine) || (!isGroup && (isPeerTyping || presence?.status === "online"))
                ? "text-primary"
                : "text-ink-muted"
            } ${isPeerTyping || typingNamesLine ? "italic" : ""}`}
          >
            {statusLine}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {isGroup ? (
            <GroupAvatarStack members={members} onClick={() => setShowMembersModal(true)} />
          ) : (
            <ComingSoonIconButton label="Search in chat">
              <SearchIcon className="h-4.5 w-4.5 stroke-[2.5]" />
            </ComingSoonIconButton>
          )}
          <ComingSoonIconButton label="Voice call">
            <PhoneIcon className="h-4.5 w-4.5 stroke-[2.5]" />
          </ComingSoonIconButton>
          <ComingSoonIconButton label="Video call">
            <VideoIcon className="h-4.5 w-4.5 stroke-[2.5]" />
          </ComingSoonIconButton>
          {isGroup && (
            <ComingSoonIconButton label="More options">
              <DotsIcon className="h-4.5 w-4.5" />
            </ComingSoonIconButton>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto scrollbar-hide bg-surface-gray px-5 py-4">
        {isLoadingMessages ? (
          <MessagesSkeleton />
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.message_id}
              message={message}
              isMine={message.sender_id === profile?.user_id}
              privateKey={privateKey}
              peerPublicKey={activeChat.peer?.public_key}
            />
          ))
        )}
      </div>

      {(isPeerTyping || (isGroup && typingNamesLine)) && (
        <div className="flex items-center gap-1 bg-surface-gray px-5 pt-1">
          <span className="h-1 w-1 animate-bounce rounded-full bg-ink-muted [animation-delay:-0.3s]" />
          <span className="h-1 w-1 animate-bounce rounded-full bg-ink-muted [animation-delay:-0.15s]" />
          <span className="h-1 w-1 animate-bounce rounded-full bg-ink-muted" />
        </div>
      )}

      <div className="flex items-center gap-2 bg-surface-gray px-5 py-4">
        <div className="relative w-full">
          {showEmojiPicker && (
            <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setShowEmojiPicker(false)} />
          )}
          <input
            ref={draftInputRef}
            type="text"
            value={draft}
            onChange={(event) => handleDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleSend();
            }}
            placeholder="Type a message..."
            className="w-full rounded-full bg-[#ffffff] py-3.5 pl-4 pr-20 text-sm text-ink placeholder:text-ink-muted focus:outline-none"
          />
          <button
            type="button"
            aria-label="Emoji"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            className={`absolute top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
              draft.trim() ? "right-10" : "right-1.5"
            } ${showEmojiPicker ? "text-primary" : "text-ink-muted hover:text-ink"}`}
          >
            <SmileIcon className="h-5 w-5" />
          </button>
          {draft.trim() && (
            <button
              type="button"
              aria-label="Send"
              onClick={handleSend}
              className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105 active:scale-95"
            >
              <ArrowLeftIcon className="h-4 w-4 rotate-180" />
            </button>
          )}
        </div>
      </div>

      {showMembersModal && isGroup && (
        <GroupMembersModal
          members={members}
          currentUserId={profile?.user_id}
          onClose={() => setShowMembersModal(false)}
        />
      )}
    </div>
  );
}
