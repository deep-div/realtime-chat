import { useAuth } from "../../features/auth/hooks/useAuth";
import { Avatar } from "../ui/Avatar";
import { ChatBubbleIcon } from "../ui/ChatBubbleIcon";
import { UsersIcon } from "../ui/UsersIcon";

interface NavRailProps {
  activeView: "chats" | "people";
  onSelectView: (view: "chats" | "people") => void;
  onOpenProfile: () => void;
  isProfileOpen: boolean;
}

export function NavRail({ activeView, onSelectView, onOpenProfile, isProfileOpen }: NavRailProps) {
  const { profile } = useAuth();

  return (
    <aside className="hidden w-16 shrink-0 flex-col items-center bg-surface-gray py-4 md:flex">
      <nav className="flex flex-1 flex-col items-center gap-2">
        <button
          type="button"
          aria-label="Chats"
          onClick={() => onSelectView("chats")}
          className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${
            activeView === "chats" && !isProfileOpen
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
              : "text-ink-muted hover:bg-surface-muted hover:text-ink"
          }`}
        >
          <ChatBubbleIcon className="h-5.5 w-5.5" />
        </button>

        <button
          type="button"
          aria-label="People"
          onClick={() => onSelectView("people")}
          className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${
            activeView === "people" && !isProfileOpen
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
              : "text-ink-muted hover:bg-surface-muted hover:text-ink"
          }`}
        >
          <UsersIcon className="h-5.5 w-5.5" />
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
