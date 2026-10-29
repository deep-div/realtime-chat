import { useEffect, useState } from "react";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { AuthModal } from "../../features/auth/components/AuthModal";
import { useChat } from "../../features/chat/hooks/useChat";
import { EditProfileView } from "../../features/profile/components/EditProfileView";
import { searchUsers } from "../../features/profile/api";
import type { Profile } from "../../features/profile/types";
import { Avatar } from "../ui/Avatar";
import { ArrowLeftIcon } from "../ui/ArrowLeftIcon";
import { ChatBubbleIcon } from "../ui/ChatBubbleIcon";
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
  { name: "Ava Thompson", username: "avat", avatar: person1 },
  { name: "Liam Carter", username: "liamc", avatar: person2 },
  { name: "Noah Patel", username: "noahp", avatar: person3 },
  { name: "Maya Chen", username: "mayac", avatar: person4 },
  { name: "Ethan Brooks", username: "ethanb", avatar: person5 },
  { name: "Zara Malik", username: "zaram", avatar: person6 },
  { name: "Aarav Mehta", username: "aaravm", avatar: person7 },
];

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
  const { user, profile } = useAuth();
  const { chats, isLoadingChats, activeChat, openChat, startDirectChat, presenceByUserId } = useChat();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [isSuggestedLoading, setIsSuggestedLoading] = useState(true);

  useEffect(() => {
    const timeoutId = setTimeout(() => setIsSuggestedLoading(false), 500);
    return () => clearTimeout(timeoutId);
  }, []);

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
      <aside className="relative hidden w-[360px] shrink-0 flex-col overflow-hidden border-r border-border bg-surface md:flex">
        <div className="px-5 pt-6">
          <h2 className="text-base font-semibold tracking-tight text-ink">
            Suggested people
          </h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            Find interesting people to chat with
          </p>
        </div>

        <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pt-3">
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
    <aside className="hidden w-[360px] shrink-0 flex-col border-r border-border bg-surface md:flex">
      {isEditingProfile ? (
        <EditProfileView onBack={() => setIsEditingProfile(false)} />
      ) : (
        <>
          <div className="flex items-center gap-3 px-5 pt-5">
            <div className="flex flex-1 items-center gap-2.5 rounded-full bg-surface-muted px-4 py-2.5 ring-1 ring-transparent transition-shadow focus-within:ring-primary/30">
              <SearchIcon className="h-4.5 w-4.5 shrink-0 text-ink-muted" />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search people..."
                className="w-full bg-transparent text-sm text-ink placeholder:text-ink-muted focus:outline-none"
              />
            </div>
            {profile && (
              <button
                type="button"
                aria-label="Profile"
                onClick={() => setIsEditingProfile(true)}
                className="shrink-0 rounded-full ring-2 ring-transparent transition-all hover:ring-primary/30"
              >
                <Avatar
                  src={profile.avatar_url}
                  label={profile.display_name}
                  className="h-10 w-10"
                />
              </button>
            )}
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
              ) : chats.length === 0 ? null : (
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
                    <div className="relative shrink-0">
                      <Avatar
                        src={chat.peer?.avatar_url}
                        label={chat.peer?.display_name ?? "?"}
                        className="h-10 w-10"
                      />
                      {chat.peer && presenceByUserId[chat.peer.user_id]?.status === "online" && (
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-surface bg-emerald-500" />
                      )}
                    </div>
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
