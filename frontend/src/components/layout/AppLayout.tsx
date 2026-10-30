import { useState } from "react";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { useChat } from "../../features/chat/hooks/useChat";
import { EditProfileView } from "../../features/profile/components/EditProfileView";
import { MainPanel } from "./MainPanel";
import { NavRail } from "./NavRail";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  const { user } = useAuth();
  const { activeChat } = useChat();
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // On mobile there's only room for one pane: the chat list (+ nav rail) or the
  // open chat, toggled by whether a chat is active. From md up, both show at once.
  const showListPane = !activeChat;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#ffffff]">
      {user && (
        <div className={`${showListPane ? "flex" : "hidden"} md:flex`}>
          <NavRail
            onOpenProfile={() => setIsEditingProfile(true)}
            isProfileOpen={isEditingProfile}
          />
        </div>
      )}
      <div
        className={`w-full shrink-0 border-r border-ink/10 bg-surface-cream md:w-[360px] ${
          showListPane ? "flex" : "hidden"
        } md:flex`}
      >
        {user && isEditingProfile ? (
          <EditProfileView onBack={() => setIsEditingProfile(false)} />
        ) : (
          <Sidebar />
        )}
      </div>
      <div className={`min-w-0 flex-1 bg-[#ffffff] ${showListPane ? "hidden" : "flex"} md:flex`}>
        <MainPanel />
      </div>
    </div>
  );
}
