import { Sidebar } from "@/components/app-shell/sidebar";
import { Topbar } from "@/components/app-shell/topbar";
import { SidebarToggleWrapper } from "@/components/app-shell/sidebar-toggle-wrapper";
import { listNotesTree } from "@/server/notes/service";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const notesTree = await listNotesTree().catch(() => []);

  return (
    <SidebarToggleWrapper sidebar={<Sidebar notesTree={notesTree} />}>
      <Topbar notesTree={notesTree} />
      <main className="app-canvas min-h-0 min-w-0 flex-1 overflow-y-auto">
        {children}
      </main>
    </SidebarToggleWrapper>
  );
}
