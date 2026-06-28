import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil, FileText, ListChecks, FolderClosed, Clock } from "lucide-react";
import { getNoteById, listNotes } from "@/server/notes/service";
import { listTasks } from "@/server/tasks/service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NoteStatusBadge } from "@/components/notes/note-status-badge";
import { MarkdownPreview } from "@/components/markdown/markdown-preview";
import { TasksPanel } from "@/components/tasks/tasks-panel";
import { formatRelativeDate, formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

type Tab = "overview" | "tasks" | "notes" | "timeline";

const TABS: { id: Tab; label: string; icon: typeof FileText }[] = [
  { id: "overview", label: "Overview", icon: FileText },
  { id: "tasks", label: "Tasks", icon: ListChecks },
  { id: "notes", label: "Notes", icon: FolderClosed },
  { id: "timeline", label: "Timeline", icon: Clock },
];

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab: rawTab } = await searchParams;
  const note = await getNoteById(id);

  if (!note) notFound();
  // Project view works for any note, but the UI is project-oriented.
  const tab: Tab = (["overview", "tasks", "notes", "timeline"] as Tab[]).includes(
    rawTab as Tab,
  )
    ? (rawTab as Tab)
    : "overview";

  const [tasks, childNotes] = await Promise.all([
    listTasks(id),
    listNotes({ parentId: id, limit: 100 }),
  ]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b px-3 sm:px-4">
        <Button
          variant="ghost"
          size="icon-sm"
          render={<Link href="/projects" />}
          aria-label="Back to projects"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <h1 className="truncate text-sm font-medium">{note.title}</h1>
        <div className="ml-2 flex items-center gap-2">
          <NoteStatusBadge status={note.status} />
          {note.priority !== "none" && (
            <Badge variant="outline" className="text-xs">
              {note.priority}
            </Badge>
          )}
          {note.dueDate && (
            <Badge variant="outline" className="text-xs">
              Due {formatRelativeDate(note.dueDate)}
            </Badge>
          )}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            render={
              <Link href={`/notes/${note.id}`} aria-label="Edit as note" />
            }
          >
            <Pencil className="size-4" /> Edit
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <nav className="flex shrink-0 items-center gap-1 border-b px-3 sm:px-4">
        {TABS.map((t) => {
          const Icon = t.icon;
          const href = `/projects/${id}${t.id === "overview" ? "" : `?tab=${t.id}`}`;
          const isActive = tab === t.id;
          return (
            <Link
              key={t.id}
              href={href}
              className={cn(
                "flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors",
                isActive
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" />
              {t.label}
              {t.id === "tasks" && tasks.length > 0 && (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {tasks.length}
                </span>
              )}
              {t.id === "notes" && childNotes.length > 0 && (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {childNotes.length}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-8">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
          {tab === "overview" && <OverviewTab note={note} />}
          {tab === "tasks" && <TasksPanel noteId={note.id} initialTasks={tasks} />}
          {tab === "notes" && <NotesTab childNotes={childNotes} projectId={id} />}
          {tab === "timeline" && <TimelineTab notes={childNotes} tasks={tasks} />}
        </div>
      </div>
    </div>
  );
}

function OverviewTab({
  note,
}: {
  note: NonNullable<Awaited<ReturnType<typeof getNoteById>>>;
}) {
  const isEmpty = note.contentMd.trim().length === 0;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>Created {formatRelativeDate(note.createdAt)}</span>
        <span>·</span>
        <span>Updated {formatRelativeDate(note.updatedAt)}</span>
      </div>
      {isEmpty ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          This project has no content yet. Use the Edit button to add Markdown,
          then the Tasks tab will show your checkboxes.
        </div>
      ) : (
        <div className="inknest-prose max-w-none border bg-card rounded-xl p-5 sm:p-7">
          <MarkdownPreview content={note.contentMd} direction={note.direction} />
        </div>
      )}
    </div>
  );
}

function NotesTab({
  childNotes,
  projectId,
}: {
  childNotes: { id: string; title: string; updatedAt: Date; type: string }[];
  projectId: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Linked notes
        </h2>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          render={
            <Link
              href={`/notes/new?parent=${projectId}`}
              aria-label="Add linked note"
            />
          }
        >
          Add note
        </Button>
      </div>
      {childNotes.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No notes linked to this project. Set a parent in a note’s metadata
          panel to link it here.
        </div>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {childNotes.map((n) => (
            <li key={n.id}>
              <Link
                href={`/notes/${n.id}`}
                className="block rounded-lg border bg-card p-3 transition-colors hover:bg-muted/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate text-sm font-medium">{n.title}</h3>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatRelativeDate(n.updatedAt)}
                  </span>
                </div>
                {n.type !== "note" && (
                  <Badge variant="secondary" className="mt-1 text-[10px]">
                    {n.type}
                  </Badge>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type TimelineEvent = {
  id: string;
  title: string;
  at: Date;
  kind: "note" | "task";
  status?: string;
};

function TimelineTab({
  notes,
  tasks,
}: {
  notes: { id: string; title: string; updatedAt: Date }[];
  tasks: { id: string; title: string; status: string; updatedAt: Date }[];
}) {
  const events: TimelineEvent[] = [
    ...notes.map((n) => ({
      id: n.id,
      title: n.title,
      at: n.updatedAt,
      kind: "note" as const,
    })),
    ...tasks.map((t) => ({
      id: t.id,
      title: t.title,
      at: t.updatedAt,
      kind: "task" as const,
      status: t.status,
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  return (
    <div className="flex flex-col gap-2">
      {events.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No activity yet.
        </p>
      ) : (
        <ol className="relative flex flex-col gap-3 pl-6">
          <span className="absolute left-2 top-1 h-full w-px bg-border" />
          {events.slice(0, 100).map((e) => (
            <li key={`${e.kind}-${e.id}`} className="relative">
              <span
                className={cn(
                  "absolute -left-4 top-1.5 size-2 rounded-full ring-2 ring-background",
                  e.kind === "note" ? "bg-foreground" : "bg-muted-foreground",
                )}
              />
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm">
                  <span className="text-muted-foreground">
                    {e.kind === "note" ? "Note" : "Task"}
                  </span>{" "}
                  <Link href={`/notes/${e.id}`} className="hover:underline">
                    {e.title}
                  </Link>
                  {e.status && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {e.status}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDate(e.at)}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}