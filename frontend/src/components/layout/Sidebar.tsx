import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { AuthModal } from "../../features/auth/components/AuthModal";
import { CreateGroupModal } from "../../features/chat/components/CreateGroupModal";
import { deleteChat } from "../../features/chat/api";
import { useChat } from "../../features/chat/hooks/useChat";
import { useDecryptedText } from "../../features/chat/hooks/useDecryptedText";
import type { ChatSummary, UserPresence } from "../../features/chat/types";
import { searchUsers } from "../../features/profile/api";
import type { Profile } from "../../features/profile/types";
import { Avatar } from "../ui/Avatar";
import { ArrowLeftIcon } from "../ui/ArrowLeftIcon";
import { PlusIcon } from "../ui/PlusIcon";
import { SearchIcon } from "../ui/SearchIcon";
import { ContextMenu } from "../ui/ContextMenu";
import { useContextMenu } from "../ui/useContextMenu";
import { Skeleton } from "../ui/Skeleton";
import { UserIcon } from "../ui/UserIcon";
import person1 from "../../assests/person1.png";
import person2 from "../../assests/person2.png";
import person3 from "../../assests/person3.png";
import person4 from "../../assests/person4.png";
import person5 from "../../assests/person5.png";
import person6 from "../../assests/person6.png";
import person7 from "../../assests/person7.png";

interface SuggestedPreview {
  title: string;
  avatar?: string;
  // Set for the mock group row instead of `avatar` - rendered as a stacked-photo
  // avatar, same visual language as a real group's member stack.
  groupAvatars?: string[];
  sender: string | null;
  message: string;
  time: string;
  unreadCount?: number;
}

function GroupAvatarPreview({ avatars }: { avatars: string[] }) {
  return (
    <div className="flex h-11 w-11 shrink-0 items-center">
      {avatars.slice(0, 3).map((avatar, index) => (
        <div
          key={avatar}
          className="rounded-full ring-2 ring-surface"
          style={{ marginLeft: index === 0 ? 0 : -14, zIndex: 3 - index }}
        >
          <Avatar src={avatar} label="" className="h-7 w-7" />
        </div>
      ))}
    </div>
  );
}

// Purely decorative mock inbox shown when logged out - gives the sidebar some life
// instead of an empty state, and doubles as a "here's what you're missing" nudge to sign in.
const SUGGESTED_PREVIEWS: SuggestedPreview[] = [
  { title: "Ananya Sharma", avatar: person1, sender: null, message: "How's the trip going so far? ✈️", time: "5:11 PM", unreadCount: 12 },
  { title: "Aarav Mehta", avatar: person2, sender: null, message: "I'll share the itinerary with everyone 🥑", time: "4:12 PM" },
  { title: "Riya Verma", avatar: person3, sender: null, message: "Why aren't you replying? 😅", time: "3:01 PM", unreadCount: 4 },
  { title: "Rohan Kapoor", avatar: person4, sender: null, message: "I'll be there in 5 minutes 🚗", time: "3:00 PM", unreadCount: 2 },
  { title: "Ishita Malhotra", avatar: person5, sender: "Liam", message: "Want to go watch a movie tonight? 🎬", time: "2:59 PM" },
  {
    title: "Beach Vacation Crew 🏖️",
    groupAvatars: [person6, person1, person4],
    sender: "Arjun",
    message: "Going on vacation next week, who's in?",
    time: "2:46 PM",
  },
  {
    title: "Study Group 📚",
    groupAvatars: [person7, person3, person6],
    sender: "Kavya",
    message: "Let's meet at the library tonight",
    time: "2:34 PM",
    unreadCount: 1,
  },
  {
    title: "Weekend Trip Squad 🏕️",
    groupAvatars: [person3, person5, person2],
    sender: "Priya",
    message: "Let's finalize the packing list tonight",
    time: "1:46 PM",
    unreadCount: 3,
  },
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

function ChatRow({
  chat,
  isActive,
  presenceByUserId,
  privateKey,
  isDeleting,
  onOpen,
  onDelete,
}: {
  chat: ChatSummary;
  isActive: boolean;
  presenceByUserId: Record<string, UserPresence>;
  privateKey: CryptoKey | null;
  isDeleting: boolean;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const { position, close, consumeSuppressedClick, triggerProps } = useContextMenu();

  return (
    <div
      {...triggerProps}
      onClick={() => {
        if (consumeSuppressedClick()) return;
        if (chat.chat_type === "direct" && !chat.peer) return;
        onOpen();
      }}
      className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface-muted ${
        isActive ? "bg-surface-muted" : ""
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
            {chat.chat_type === "group" ? chat.title ?? "Group chat" : chat.peer?.display_name ?? "Unknown user"}
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
      {position && (
        <ContextMenu
          position={position}
          onClose={close}
          items={[
            {
              label: isDeleting ? "Deleting..." : "Delete chat",
              destructive: true,
              onSelect: onDelete,
            },
          ]}
        />
      )}
    </div>
  );
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
  const {
    chats,
    isLoadingChats,
    activeChat,
    openChat,
    startDirectChat,
    presenceByUserId,
    privateKey,
    removeChatFromList,
  } = useChat();
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null);

  async function handleDeleteChat(chat: ChatSummary) {
    const label = chat.chat_type === "group" ? chat.title ?? "this group" : chat.peer?.display_name ?? "this chat";
    if (!window.confirm(`Delete chat with ${label}? This only removes it from your view.`)) return;

    setDeletingChatId(chat.chat_id);
    try {
      await deleteChat(chat.chat_id);
      removeChatFromList(chat.chat_id);
    } catch {
      window.alert("Couldn't delete the chat. Please try again.");
    } finally {
      setDeletingChatId(null);
    }
  }
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
            Your conversations are waiting 👋
          </h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            Sign in to see what you've missed
          </p>
        </div>

        <div className="flex-1 space-y-0.5 overflow-y-auto scrollbar-hide px-2 pt-3">
          {isSuggestedLoading ? (
            <ChatListSkeleton />
          ) : (
          SUGGESTED_PREVIEWS.map((preview) => (
            <button
              key={preview.title}
              type="button"
              onClick={() => setShowSignIn(true)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface-muted"
            >
              {preview.groupAvatars ? (
                <GroupAvatarPreview avatars={preview.groupAvatars} />
              ) : (
                <Avatar src={preview.avatar} label={preview.title} className="h-11 w-11 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-ink">{preview.title}</p>
                  <span
                    className={`shrink-0 text-[11px] ${
                      preview.unreadCount ? "font-semibold text-primary" : "text-ink-muted"
                    }`}
                  >
                    {preview.time}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs text-ink-muted">
                    {preview.sender && <span className="font-medium text-ink">{preview.sender}: </span>}
                    {preview.message}
                  </p>
                  {!!preview.unreadCount && (
                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                      {preview.unreadCount > 99 ? "99+" : preview.unreadCount}
                    </span>
                  )}
                </div>
              </div>
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
                  <ChatRow
                    key={chat.chat_id}
                    chat={chat}
                    isActive={activeChat?.chatId === chat.chat_id}
                    presenceByUserId={presenceByUserId}
                    privateKey={privateKey}
                    isDeleting={deletingChatId === chat.chat_id}
                    onOpen={() => openChat(chat)}
                    onDelete={() => void handleDeleteChat(chat)}
                  />
                ))
              )}
            </div>
          )}
    </aside>
  );
}
