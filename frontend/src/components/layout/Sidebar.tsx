import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { AuthModal } from "../../features/auth/components/AuthModal";
import { CreateGroupModal } from "../../features/chat/components/CreateGroupModal";
import { useChat } from "../../features/chat/hooks/useChat";
import { useDecryptedText } from "../../features/chat/hooks/useDecryptedText";
import type { ChatSummary } from "../../features/chat/types";
import { searchUsers } from "../../features/profile/api";
import type { Profile } from "../../features/profile/types";
import { Avatar } from "../ui/Avatar";
import { ArrowLeftIcon } from "../ui/ArrowLeftIcon";
import { ChatBubbleIcon } from "../ui/ChatBubbleIcon";
import { PlusIcon } from "../ui/PlusIcon";
import { SearchIcon } from "../ui/SearchIcon";
import { Skeleton } from "../ui/Skeleton";
import { UserIcon } from "../ui/UserIcon";
import person1 from "../../assests/person1.png";
import person2 from "../../assests/person2.png";
import person3 from "../../assests/person3.png";
import person4 from "../../assests/person4.png";
import person5 from "../../assests/person5.png";
import person6 from "../../assests/person6.png";
import person7 from "../../assests/person7.png";

const SUGGESTED_PEOPLE = [
  { name: "Ananya Sharma", username: "ananyas", avatar: person1 },
  { name: "Liam Carter", username: "liamc", avatar: person2 },
  { name: "Priya Verma", username: "priyav", avatar: person3 },
  { name: "Noah Williams", username: "noahw", avatar: person4 },
  { name: "Sophia Kapoor", username: "sophiak", avatar: person5 },
  { name: "Arjun Mehta", username: "arjunm", avatar: person6 },
  { name: "Olivia Bennett", username: "oliviab", avatar: person7 },
];

function formatChatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function ChatPreviewText({ chat, privateKey }: { chat: ChatSummary; privateKey: CryptoKey | null }) {
  const content =
    chat.last_message !== null
      ? { scheme: chat.last_message_scheme ?? "plaintext-v0", ciphertext: chat.last_message }
      : null;
  const text = useDecryptedText(content, privateKey, chat.peer?.public_key);

  if (content) return <>{text}</>;
  if (chat.chat_type === "group") return <>No messages yet</>;
  return <>{chat.peer ? `@${chat.peer.username}` : ""}</>;
}

function ChatListSkeleton() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 px-3 py-2.5">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-2.5 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface SidebarProps {
  focusSearch?: boolean;
}

export function Sidebar({ focusSearch = false }: SidebarProps) {
  const { user } = useAuth();
  const { chats, isLoadingChats, activeChat, openChat, startDirectChat, presenceByUserId, privateKey } =
    useChat();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [isSuggestedLoading, setIsSuggestedLoading] = useState(true);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timeoutId = setTimeout(() => setIsSuggestedLoading(false), 500);
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (focusSearch) {
      searchInputRef.current?.focus();
    }
  }, [focusSearch]);

  function handleSelectUser(user: Profile) {
    startDirectChat(user);
    setQuery("");
    setResults([]);
  }

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeoutId = setTimeout(() => {
      searchUsers(trimmed)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setIsSearching(false));
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  if (!user) {
    return (
      <aside className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
        <div className="px-5 pt-6">
          <h2 className="text-base font-semibold tracking-tight text-ink">
            Suggested people
          </h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            Find interesting people to chat with
          </p>
        </div>

        <div className="flex-1 space-y-0.5 overflow-y-auto scrollbar-hide px-2 pt-3">
          {isSuggestedLoading ? (
            <ChatListSkeleton />
          ) : (
          SUGGESTED_PEOPLE.map((person) => (
            <button
              key={person.username}
              type="button"
              onClick={() => setShowSignIn(true)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface-muted"
            >
              <Avatar src={person.avatar} label={person.name} className="h-11 w-11 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{person.name}</p>
                <p className="truncate text-xs text-ink-muted">@{person.username}</p>
              </div>
              <span className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary-soft px-3.5 py-2 text-xs font-semibold text-primary">
                <ChatBubbleIcon className="h-4 w-4" />
                Message
              </span>
            </button>
          ))
          )}
        </div>

        <div className="border-t border-border p-3">
          <button
            type="button"
            onClick={() => setShowSignIn(true)}
            className="flex w-full items-center gap-3 rounded-2xl bg-surface-muted p-3 text-left transition-colors hover:bg-primary-soft"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-hover shadow-md shadow-primary/30">
              <UserIcon className="h-5 w-5 text-primary-foreground" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-ink">
                Explore more people
              </span>
              <span className="block truncate text-xs text-ink-muted">
                Discover new friends and communities
              </span>
            </span>
            <ArrowLeftIcon className="h-4 w-4 shrink-0 rotate-180 text-ink-muted" />
          </button>
        </div>

        <AuthModal
          isOpen={showSignIn}
          initialMode="sign-in"
          onClose={() => setShowSignIn(false)}
        />
      </aside>
    );
  }

  return (
    <aside className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-2 px-5 pt-5">
        <div className="flex flex-1 items-center gap-2.5 rounded-full bg-surface-muted px-4 py-2.5 ring-1 ring-transparent transition-shadow focus-within:ring-primary/30">
          <SearchIcon className="h-4.5 w-4.5 shrink-0 text-ink-muted" />
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search people..."
            className="w-full bg-transparent text-sm text-ink placeholder:text-ink-muted focus:outline-none"
          />
        </div>
        <button
          type="button"
          aria-label="New group"
          onClick={() => setShowCreateGroup(true)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-ink-muted transition-colors hover:bg-primary-soft hover:text-primary"
        >
          <PlusIcon className="h-4.5 w-4.5" />
        </button>
      </div>

      <CreateGroupModal isOpen={showCreateGroup} onClose={() => setShowCreateGroup(false)} />

      {query.trim() ? (
            <div className="flex-1 overflow-y-auto scrollbar-hide px-2 pt-2">
              {isSearching ? (
                <ChatListSkeleton />
              ) : results.length === 0 ? (
                <p className="px-3 py-2 text-sm text-ink-muted">No users found.</p>
              ) : (
                results.map((user) => (
                  <button
                    key={user.user_id}
                    type="button"
                    onClick={() => handleSelectUser(user)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface-muted"
                  >
                    <Avatar src={user.avatar_url} label={user.display_name} className="h-10 w-10" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{user.display_name}</p>
                      <p className="truncate text-xs text-ink-muted">@{user.username}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto scrollbar-hide px-2 pt-2">
              {isLoadingChats ? (
                <ChatListSkeleton />
              ) : chats.length === 0 ? null : (
                chats.map((chat) => (
                  <button
                    key={chat.chat_id}
                    type="button"
                    onClick={() => openChat(chat)}
                    disabled={chat.chat_type === "direct" && !chat.peer}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface-muted ${
                      activeChat?.chatId === chat.chat_id ? "bg-surface-muted" : ""
                    }`}
                  >
                    <div className="relative shrink-0">
                      <Avatar
                        src={chat.chat_type === "group" ? null : chat.peer?.avatar_url}
                        label={chat.chat_type === "group" ? chat.title ?? "Group" : chat.peer?.display_name ?? "?"}
                        className="h-10 w-10"
                      />
                      {chat.peer && presenceByUserId[chat.peer.user_id]?.status === "online" && (
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-surface bg-emerald-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium text-ink">
                          {chat.chat_type === "group"
                            ? chat.title ?? "Group chat"
                            : chat.peer?.display_name ?? "Unknown user"}
                        </p>
                        {chat.last_message_at && (
                          <span
                            className={`shrink-0 text-[11px] ${
                              chat.unread_count > 0 ? "font-semibold text-primary" : "text-ink-muted"
                            }`}
                          >
                            {formatChatTimestamp(chat.last_message_at)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs text-ink-muted">
                          <ChatPreviewText chat={chat} privateKey={privateKey} />
                        </p>
                        {chat.unread_count > 0 && (
                          <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                            {chat.unread_count > 99 ? "99+" : chat.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
    </aside>
  );
}
