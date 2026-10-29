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
      <div className="hidden w-[360px] shrink-0 bg-surface-gray px-3 py-0.5 md:flex">
        <div className="flex min-h-0 w-full flex-1 overflow-hidden rounded-2xl bg-surface-cream shadow-sm">
          {user && isEditingProfile ? (
            <EditProfileView onBack={() => setIsEditingProfile(false)} />
          ) : (
            <Sidebar focusSearch={activeView === "people"} />
          )}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 bg-surface-gray px-3 py-0.5">
        <div className="flex min-w-0 flex-1 overflow-hidden rounded-2xl bg-[#f6f5fb] shadow-sm">
          <MainPanel />
        </div>
      </div>
    </div>
  );
}
