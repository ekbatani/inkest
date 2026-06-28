import { Sidebar } from "@/components/app-shell/sidebar";
import { Topbar } from "@/components/app-shell/topbar";
import { listNotesTree } from "@/server/notes/service";

export async function AppShell({ children }: { children: React.ReactNode }) {
  // Fresh notes tree on every navigation. Kept shallow (top-level + children)
  // and limited in count; SQLite handles this fast for personal-scale datasets.
  const notesTree = await listNotesTree().catch(() => []);

  return (
    <div className="flex h-dvh w-full overflow-hidden">
      <aside className="hidden w-60 shrink-0 border-r bg-sidebar text-sidebar-foreground md:block">
        <Sidebar notesTree={notesTree} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
