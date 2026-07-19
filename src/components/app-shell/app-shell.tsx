import { Sidebar } from "@/components/app-shell/sidebar";
import { Topbar } from "@/components/app-shell/topbar";
import { SidebarToggleWrapper } from "@/components/app-shell/sidebar-toggle-wrapper";
import { listNotesTree } from "@/server/notes/service";
import { listInboxNotifications } from "@/server/notifications/service";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const [notesTree, notifications] = await Promise.all([
    listNotesTree().catch(() => []),
    listInboxNotifications().catch(() => []),
  ]);

  return (
    <>
      <a
        href="#main-content"
        className="sr-only fixed start-4 top-4 z-[60] rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg focus:not-sr-only focus:outline-none focus:ring-3 focus:ring-ring/50"
      >
        Skip to main content
      </a>
      <SidebarToggleWrapper sidebar={<Sidebar notesTree={notesTree} />}>
        <Topbar notesTree={notesTree} notifications={notifications} />
        <main
          id="main-content"
          tabIndex={-1}
          className="app-canvas min-h-0 min-w-0 flex-1 overflow-y-auto focus:outline-none"
        >
          {children}
        </main>
      </SidebarToggleWrapper>
    </>
  );
}
