import { useState } from "react";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { EditProfileView } from "../../features/profile/components/EditProfileView";
import { MainPanel } from "./MainPanel";
import { NavRail } from "./NavRail";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<"chats" | "people">("chats");
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-surface">
      {user && (
        <NavRail
          activeView={activeView}
          onSelectView={(view) => {
            setActiveView(view);
            setIsEditingProfile(false);
          }}
          onOpenProfile={() => setIsEditingProfile(true)}
          isProfileOpen={isEditingProfile}
        />
      )}
      {user && isEditingProfile ? (
        <aside className="hidden w-[360px] shrink-0 flex-col border-r border-border bg-surface-cream md:flex">
          <EditProfileView onBack={() => setIsEditingProfile(false)} />
        </aside>
      ) : (
        <Sidebar focusSearch={activeView === "people"} />
      )}
      <div className="flex min-w-0 flex-1 bg-surface-gray p-3">
        <div className="flex min-w-0 flex-1 overflow-hidden rounded-2xl bg-surface shadow-sm">
          <MainPanel />
        </div>
      </div>
    </div>
  );
}
