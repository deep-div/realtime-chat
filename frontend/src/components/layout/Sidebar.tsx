import { useState } from "react";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { EditProfileView } from "../../features/profile/components/EditProfileView";
import { Avatar } from "../ui/Avatar";
import { ChatBubbleIcon } from "../ui/ChatBubbleIcon";
import { SearchIcon } from "../ui/SearchIcon";

export function Sidebar() {
  const { profile } = useAuth();
  const [isEditingProfile, setIsEditingProfile] = useState(false);

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
                placeholder="Search conversations..."
                className="w-full bg-transparent text-sm text-ink placeholder:text-ink-muted focus:outline-none"
              />
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
