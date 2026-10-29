import { MainPanel } from "./MainPanel";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-surface">
      <Sidebar />
      <MainPanel />
    </div>
  );
}
