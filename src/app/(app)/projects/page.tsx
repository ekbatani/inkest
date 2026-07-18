import Link from "next/link";
import { FolderKanban, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listNotes } from "@/server/notes/service";
import { createProjectAction } from "@/server/notes/actions";
import { formatRelativeDate } from "@/lib/dates";
import { NoteStatusBadge } from "@/components/notes/note-status-badge";
import type { Note } from "@/server/db/schema";

const STATUS_GROUPS: Record<
  string,
  { label: string; statuses: Note["status"][] }
> = {
  Active: { label: "Active", statuses: ["todo", "doing", "paused"] },
  Done: { label: "Completed", statuses: ["done"] },
  None: { label: "Unfiled", statuses: ["none"] },
  Archived: { label: "Archived", statuses: ["archived"] },
};

export default async function ProjectsPage() {
  const projects = await listNotes({ type: "project", limit: 200 });

  return (
    <div className="app-page gap-6">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <FolderKanban className="size-5 text-muted-foreground" />
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
        </div>
        <form action={createProjectAction}>
          <Button type="submit" size="sm" className="gap-1.5">
            <Plus className="size-4" /> New project
          </Button>
        </form>
      </header>

      <p className="text-sm text-muted-foreground">
        Projects are special notes with status, priority, and a due date. Each
        task in a project lives as its own child note, so the work stays fully
        editable and linkable.
      </p>

      {projects.length === 0 ? (
        <div className="surface-card-dashed flex flex-col items-center gap-3 p-10 text-center">
          <div className="flex size-10 items-center justify-center rounded-full bg-muted">
            <FolderKanban className="size-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">No projects yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create one to organize a piece of work with tasks and notes.
            </p>
          </div>
        </div>
      ) : (
        Object.entries(STATUS_GROUPS).map(([key, group]) => {
          const items = projects.filter((p) =>
            group.statuses.includes(p.status),
          );
          if (items.length === 0) return null;
          return (
            <section key={key}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {group.label} · {items.length}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((p) => (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    className="surface-card-interactive group block p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate font-medium">{p.title}</h3>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatRelativeDate(p.updatedAt)}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                      {stripMarkdown(p.contentMd).slice(0, 140) || "Empty project"}
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <NoteStatusBadge status={p.status} />
                      {p.dueDate && (
                        <Badge variant="outline" className="text-xs">
                          Due {formatRelativeDate(p.dueDate)}
                        </Badge>
                      )}
                      {p.pinned && (
                        <span className="text-xs text-muted-foreground">
                          Pinned
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}

function stripMarkdown(s: string): string {
  return s
    .replace(/[#*_`>~\-[\]()!]/g, "")
    .replace(/\n+/g, " ")
    .trim();
}
