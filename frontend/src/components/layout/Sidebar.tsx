import { useEffect, useState } from "react";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { useChat } from "../../features/chat/hooks/useChat";
import { EditProfileView } from "../../features/profile/components/EditProfileView";
import { searchUsers } from "../../features/profile/api";
import type { Profile } from "../../features/profile/types";
import { Avatar } from "../ui/Avatar";
import { ChatBubbleIcon } from "../ui/ChatBubbleIcon";
import { SearchIcon } from "../ui/SearchIcon";
import { Skeleton } from "../ui/Skeleton";

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

export function Sidebar() {
  const { profile } = useAuth();
  const { chats, isLoadingChats, activeChat, openChat, startDirectChat } = useChat();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);

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

  return (
    <aside className="hidden w-[360px] shrink-0 flex-col border-r border-border bg-surface md:flex">
      {isEditingProfile ? (
        <EditProfileView onBack={() => setIsEditingProfile(false)} />
      ) : (
        <>
          <div className="flex items-center justify-between px-5 pt-5">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <ChatBubbleIcon className="h-5 w-5" />
              </span>
              <span className="text-lg font-bold text-ink">messenger</span>
            </div>
            {profile && (
              <button
                type="button"
                aria-label="Profile"
                onClick={() => setIsEditingProfile(true)}
                className="rounded-full ring-1 ring-border transition-opacity hover:opacity-80"
              >
                <Avatar
                  src={profile.avatar_url}
                  label={profile.display_name}
                  className="h-9 w-9"
                />
              </button>
            )}
          </div>

          <div className="px-5 pt-4">
            <div className="flex items-center gap-2 rounded-xl bg-surface-muted px-3 py-2.5">
              <SearchIcon className="h-5 w-5 shrink-0 text-ink-muted" />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search people..."
                className="w-full bg-transparent text-sm text-ink placeholder:text-ink-muted focus:outline-none"
              />
            </div>
          </div>

          {query.trim() ? (
            <div className="flex-1 overflow-y-auto px-2 pt-2">
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
            <div className="flex-1 overflow-y-auto px-2 pt-2">
              {isLoadingChats ? (
                <ChatListSkeleton />
              ) : chats.length === 0 ? (
                <p className="px-3 py-2 text-sm text-ink-muted">
                  No conversations yet. Search for someone to start chatting.
                </p>
              ) : (
                chats.map((chat) => (
                  <button
                    key={chat.chat_id}
                    type="button"
                    onClick={() => openChat(chat)}
                    disabled={!chat.peer}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface-muted ${
                      activeChat?.chatId === chat.chat_id ? "bg-surface-muted" : ""
                    }`}
                  >
                    <Avatar
                      src={chat.peer?.avatar_url}
                      label={chat.peer?.display_name ?? "?"}
                      className="h-10 w-10"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">
                        {chat.peer?.display_name ?? "Unknown user"}
                      </p>
                      {chat.peer && (
                        <p className="truncate text-xs text-ink-muted">@{chat.peer.username}</p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </>
      )}
    </aside>
  );
}
