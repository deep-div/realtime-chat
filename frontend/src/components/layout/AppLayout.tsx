import { useState } from "react";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { useChat } from "../../features/chat/hooks/useChat";
import { EditProfileView } from "../../features/profile/components/EditProfileView";
import { Skeleton } from "../ui/Skeleton";
import { MainPanel } from "./MainPanel";
import { NavRail } from "./NavRail";
import { Sidebar } from "./Sidebar";

/** Shown while the initial Firebase auth check is still pending, so the app never
 * flashes the signed-out UI before we actually know whether the user is logged in. */
function AppShellSkeleton() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#ffffff]">
      <div className="hidden w-16 shrink-0 flex-col items-center gap-3 bg-surface-gray py-4 md:flex">
        <Skeleton className="h-11 w-11 rounded-xl" />
        <div className="flex-1" />
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
      <div className="flex w-full shrink-0 flex-col gap-1 border-r border-ink/10 bg-surface-cream p-2 pt-4 md:w-[360px]">
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 px-3 py-2.5">
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3 w-2/5" />
              <Skeleton className="h-2.5 w-1/3" />
            </div>
          </div>
        ))}
      </div>
      <div className="hidden min-w-0 flex-1 bg-[#ffffff] md:flex" />
    </div>
  );
}

export function AppLayout() {
  const { user, isLoading } = useAuth();
  const { activeChat } = useChat();
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  if (isLoading) return <AppShellSkeleton />;

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
