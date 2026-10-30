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
    <div className="flex h-screen w-screen overflow-hidden bg-[#ffffff]">
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
      <div className="hidden w-[360px] shrink-0 border-r border-ink/10 bg-surface-cream md:flex">
        {user && isEditingProfile ? (
          <EditProfileView onBack={() => setIsEditingProfile(false)} />
        ) : (
          <Sidebar focusSearch={activeView === "people"} />
        )}
      </div>
      <div className="flex min-w-0 flex-1 bg-[#ffffff]">
        <MainPanel />
      </div>
    </div>
  );
}
