import { useAuth } from "../../features/auth/hooks/useAuth";
import { Avatar } from "../ui/Avatar";
import { ChatBubbleIcon } from "../ui/ChatBubbleIcon";

interface NavRailProps {
  onOpenProfile: () => void;
  isProfileOpen: boolean;
}

export function NavRail({ onOpenProfile, isProfileOpen }: NavRailProps) {
  const { profile } = useAuth();

  return (
    <aside className="flex w-16 shrink-0 flex-col items-center bg-surface-gray py-4">
      <nav className="flex flex-1 flex-col items-center gap-2">
        <button
          type="button"
          aria-label="Chats"
          className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${
            !isProfileOpen
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
              : "text-ink-muted hover:bg-surface-muted hover:text-ink"
          }`}
        >
          <ChatBubbleIcon className="h-5.5 w-5.5" />
        </button>
      </nav>

      {profile && (
        <button
          type="button"
          aria-label="Profile"
          onClick={onOpenProfile}
          className={`relative shrink-0 rounded-full ring-2 transition-all ${
            isProfileOpen ? "ring-primary" : "ring-transparent hover:ring-primary/30"
          }`}
        >
          <Avatar src={profile.avatar_url} label={profile.display_name} className="h-10 w-10" />
        </button>
      )}
    </aside>
  );
}
