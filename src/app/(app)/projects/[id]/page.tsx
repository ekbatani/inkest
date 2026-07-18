import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  Pencil,
  FileText,
  ListChecks,
  FolderClosed,
  FolderPlus,
  Clock,
} from "lucide-react";
import {
  getNoteById,
  isTaskNote,
  listNotes,
  listProjectTaskNotes,
} from "@/server/notes/service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProjectTitleEditor } from "@/components/projects/project-title-editor";
import { NoteStatusBadge } from "@/components/notes/note-status-badge";
import { MarkdownPreview } from "@/components/markdown/markdown-preview";
import { ProjectTaskNotesPanel } from "@/components/projects/project-task-notes-panel";
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

  const [taskNotes, childNotes] = await Promise.all([
    listProjectTaskNotes(id),
    listNotes({ parentId: id, limit: 100 }),
  ]);
  const referenceNotes = childNotes.filter((note) => !isTaskNote(note));
  const childProjects = childNotes.filter((childNote) => childNote.type === "project");

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b px-3 sm:px-4">
        <Button
          variant="ghost"
          size="icon-sm"
          nativeButton={false}
          render={<Link href="/projects" />}
          aria-label="Back to projects"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <ProjectTitleEditor id={note.id} title={note.title} />
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
            nativeButton={false}
            render={<Link href={`/notes/new?parent=${note.id}&as=project`} aria-label="Create subproject" />}
          >
            <FolderPlus className="size-4" /> Subproject
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            nativeButton={false}
            render={<Link href={`/notes/${note.id}`} aria-label="Edit as note" />}
          >
            <Pencil className="size-4" /> Edit
          </Button>
        </div>
      </div>

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
              {t.id === "tasks" && taskNotes.length > 0 && (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {taskNotes.length}
                </span>
              )}
              {t.id === "notes" && referenceNotes.length > 0 && (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {referenceNotes.length}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-8">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
          {tab === "overview" && <OverviewTab note={note} childProjects={childProjects} />}
          {tab === "tasks" && (
            <ProjectTaskNotesPanel
              projectId={note.id}
              initialTaskNotes={taskNotes}
            />
          )}
          {tab === "notes" && <NotesTab childNotes={referenceNotes} projectId={id} />}
          {tab === "timeline" && (
            <TimelineTab notes={childNotes} taskNotes={taskNotes} />
          )}
        </div>
      </div>
    </div>
  );
}

function OverviewTab({
  note,
  childProjects,
}: {
  note: NonNullable<Awaited<ReturnType<typeof getNoteById>>>;
  childProjects: { id: string; title: string; status: string; updatedAt: Date }[];
}) {
  const isEmpty = note.contentMd.trim().length === 0;

  if (isEmpty && childProjects.length === 0) {
    return (
      <div className="surface-card-dashed p-10 text-center text-sm text-muted-foreground">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full border bg-background">
          <FileText className="size-5" />
        </div>
        This project has no content yet. Use the Edit button to add Markdown,
        then use the Tasks tab to create note-based tasks.
      </div>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      {!isEmpty && <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Created {formatRelativeDate(note.createdAt)}</span>
            <span>|</span>
            <span>Updated {formatRelativeDate(note.updatedAt)}</span>
          </div>
          <MarkdownPreview
            content={note.contentMd}
            direction={note.direction}
            className="max-w-none font-sans text-[0.98rem] leading-8 tracking-[-0.01em] text-foreground/90 sm:text-[1.02rem]"
          />
        </CardContent>
      </Card>}
      {childProjects.length > 0 && (
        <div className="surface-card p-4">
          <h2 className="text-sm font-semibold">Subprojects</h2>
          <p className="mt-1 text-xs text-muted-foreground">Task boards stay local to each project; use a subproject for its own workstream.</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {childProjects.map((project) => (
              <li key={project.id}>
                <Link href={`/projects/${project.id}`} className="surface-card-interactive block p-3">
                  <div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-medium">{project.title}</span><NoteStatusBadge status={project.status as never} /></div>
                  <span className="mt-1 block text-xs text-muted-foreground">Updated {formatRelativeDate(project.updatedAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
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
          nativeButton={false}
          render={<Link href={`/notes/new?parent=${projectId}`} aria-label="Add linked note" />}
        >
          Add note
        </Button>
      </div>
      {childNotes.length === 0 ? (
        <div className="surface-card-dashed p-8 text-center text-sm text-muted-foreground">
          No notes linked to this project. Set a parent in a note&apos;s metadata
          panel to link it here.
        </div>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {childNotes.map((n) => (
            <li key={n.id}>
              <Link
                href={`/notes/${n.id}`}
                className="surface-card-interactive block p-3"
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
  taskNotes,
}: {
  notes: { id: string; title: string; updatedAt: Date }[];
  taskNotes: { id: string; title: string; status: string; updatedAt: Date }[];
}) {
  const taskIds = new Set(taskNotes.map((task) => task.id));
  const events: TimelineEvent[] = [
    ...notes.map((n) => ({
      id: n.id,
      title: n.title,
      at: n.updatedAt,
      kind: taskIds.has(n.id) ? ("task" as const) : ("note" as const),
      status: taskIds.has(n.id)
        ? taskNotes.find((task) => task.id === n.id)?.status
        : undefined,
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  return (
    <div className="flex flex-col gap-2">
      {events.length === 0 ? (
        <p className="surface-card-dashed p-8 text-center text-sm text-muted-foreground">
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
