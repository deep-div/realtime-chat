import { MainPanel } from "./MainPanel";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-surface">
      <Sidebar />
      <div className="flex min-w-0 flex-1 bg-surface-gray p-3">
        <div className="flex min-w-0 flex-1 overflow-hidden rounded-2xl bg-surface shadow-sm">
          <MainPanel />
        </div>
      </div>
    </div>
  );
}
