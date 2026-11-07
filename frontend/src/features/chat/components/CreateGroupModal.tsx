import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { Avatar } from "../../../components/ui/Avatar";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import { PencilIcon } from "../../../components/ui/PencilIcon";
import { SearchIcon } from "../../../components/ui/SearchIcon";
import { Skeleton } from "../../../components/ui/Skeleton";
import { searchUsers } from "../../profile/api";
import type { Profile } from "../../profile/types";
import { useChat } from "../hooks/useChat";

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function ResultsSkeleton() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 px-2 py-2">
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          <Skeleton className="h-3 w-2/5" />
        </div>
      ))}
    </div>
  );
}

export function CreateGroupModal({ isOpen, onClose }: CreateGroupModalProps) {
  const { chats, createGroupChat } = useChat();
  const [groupName, setGroupName] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selected, setSelected] = useState<Profile[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      setAvatarError("Group photo must be under 5MB.");
      return;
    }

    setAvatarError(null);
    setAvatarFile(file);
    setAvatarPreview((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return URL.createObjectURL(file);
    });
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

  function toggleContact(user: Profile) {
    setSelected((prev) =>
      prev.some((u) => u.user_id === user.user_id)
        ? prev.filter((u) => u.user_id !== user.user_id)
        : [...prev, user],
    );
  }

  function resetAndClose() {
    setGroupName("");
    setQuery("");
    setResults([]);
    setSelected([]);
    setIsCreating(false);
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(null);
    setAvatarPreview(null);
    setAvatarError(null);
    onClose();
  }

  async function handleCreate() {
    if (!groupName.trim() || selected.length === 0 || isCreating) return;
    setIsCreating(true);
    try {
      await createGroupChat(
        groupName.trim(),
        selected.map((u) => u.user_id),
        avatarFile ?? undefined,
      );
      resetAndClose();
    } catch {
      setIsCreating(false);
    }
  }

  // People you already have a direct chat with - the default list shown before searching,
  // reusing the chat list we already have instead of a separate "contacts" API.
  const existingConversations: Profile[] = [];
  const seenUserIds = new Set<string>();
  for (const chat of chats) {
    if (chat.chat_type !== "direct" || !chat.peer || seenUserIds.has(chat.peer.user_id)) continue;
    seenUserIds.add(chat.peer.user_id);
    existingConversations.push(chat.peer);
  }

  const isSearchActive = query.trim().length > 0;
  const candidates = isSearchActive ? results : existingConversations;
  const visibleResults = candidates.filter(
    (user) => !selected.some((u) => u.user_id === user.user_id),
  );

  return (
    <Modal isOpen={isOpen} onClose={resetAndClose}>
      <h2 className="text-lg font-semibold text-ink">New group</h2>

      <div className="mt-4 flex justify-center">
        <div className="relative">
          <Avatar
            src={avatarPreview}
            label={groupName || "Group"}
            className="h-20 w-20 ring-4 ring-surface shadow-lg shadow-primary/10"
            textClassName="text-2xl"
          />
          <button
            type="button"
            aria-label="Upload group photo"
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md shadow-primary/40 ring-2 ring-surface transition-transform hover:scale-105 active:scale-95"
          >
            <PencilIcon className="h-3.5 w-3.5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>
      </div>
      {avatarError && <p className="mt-1.5 text-center text-xs text-red-600">{avatarError}</p>}

      <input
        type="text"
        value={groupName}
        onChange={(event) => setGroupName(event.target.value)}
        placeholder="Group name"
        className="mt-4 w-full rounded-xl bg-surface-muted px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:outline-none"
      />

      {selected.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {selected.map((user) => (
            <button
              key={user.user_id}
              type="button"
              onClick={() => toggleContact(user)}
              className="flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary"
            >
              {user.display_name}
              <span aria-hidden="true">&times;</span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2.5 rounded-full bg-surface-muted px-4 py-2.5">
        <SearchIcon className="h-4 w-4 shrink-0 text-ink-muted" />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search people to add..."
          className="w-full bg-transparent text-sm text-ink placeholder:text-ink-muted focus:outline-none"
        />
      </div>

      {!isSearchActive && existingConversations.length > 0 && (
        <p className="mt-3 px-0.5 text-xs font-medium text-ink-muted">Your conversations</p>
      )}

      <div className="mt-1.5 max-h-56 space-y-0.5 overflow-y-auto scrollbar-hide">
        {isSearching ? (
          <ResultsSkeleton />
        ) : visibleResults.length === 0 ? (
          <p className="px-2 py-2 text-sm text-ink-muted">
            {isSearchActive ? "No users found." : "No conversations yet - search to add people."}
          </p>
        ) : (
          visibleResults.map((user) => (
            <button
              key={user.user_id}
              type="button"
              onClick={() => toggleContact(user)}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-surface-muted"
            >
              <Avatar src={user.avatar_url} label={user.display_name} className="h-9 w-9 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{user.display_name}</p>
                <p className="truncate text-xs text-ink-muted">@{user.username}</p>
              </div>
            </button>
          ))
        )}
      </div>

      <Button
        type="button"
        disabled={!groupName.trim() || selected.length === 0 || isCreating}
        onClick={handleCreate}
        className="mt-4 w-full"
      >
        {isCreating ? "Creating..." : "Create group"}
      </Button>
    </Modal>
  );
}
