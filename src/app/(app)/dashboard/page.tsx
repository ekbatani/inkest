import Link from "next/link";
import {
  ArrowRight,
  Pin,
  FolderKanban,
  CheckCircle2,
  FileText,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NoteStatusBadge } from "@/components/notes/note-status-badge";
import { listDueTaskNotes, listNotes } from "@/server/notes/service";
import { formatDateShort, formatRelativeDate } from "@/lib/dates";
import type { Note } from "@/server/db/schema";
import { QuickCapture } from "./quick-capture";
import { cn } from "@/lib/utils";
import { usesRtlTitleFont } from "@/lib/text/rtl";

export default async function DashboardPage() {
  const [recentNotes, pinnedNotes, activeProjects, dueTasks] =
    await Promise.all([
      listNotes({ limit: 6 }),
      listNotes({ pinnedOnly: true, limit: 6 }),
      listNotes({ type: "project", limit: 4 }),
      listDueTaskNotes(6),
    ]);

  const activeProjectsFiltered = activeProjects.filter((p) =>
    ["todo", "doing", "paused"].includes(p.status),
  );
  const hasDueTasks = dueTasks.overdue.length > 0 || dueTasks.upcoming.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-5 py-10 sm:px-8 sm:py-14">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Welcome back
        </h1>
        <p className="text-muted-foreground">
          A calm place for your notes, projects, and ideas.
        </p>
      </header>

      <QuickCapture />

      {/* Pinned */}
      <section>
        <SectionHeader
          title="Pinned"
          icon={<Pin className="size-4" />}
          actionHref="/notes"
        />
        {pinnedNotes.length === 0 ? (
          <EmptyRow
            label="No pinned notes yet"
            hint="Pin a note to keep it within reach."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pinnedNotes.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </div>
        )}
      </section>

      {/* Recent */}
      <section>
        <SectionHeader
          title="Recent"
          icon={<FileText className="size-4" />}
          actionHref="/notes"
        />
        {recentNotes.length === 0 ? (
          <EmptyRow
            label="No notes yet"
            hint="Create your first note to get started."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {recentNotes.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </div>
        )}
      </section>

      {/* Active projects */}
      <section>
        <SectionHeader
          title="Active projects"
          icon={<FolderKanban className="size-4" />}
          actionHref="/projects"
        />
        {activeProjectsFiltered.length === 0 ? (
          <EmptyRow
            label="No active projects"
            hint="Create a project note to start planning."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {activeProjectsFiltered.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="surface-card-interactive group block p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3
                    className={cn(
                      "truncate font-medium",
                      usesRtlTitleFont(project.title) && "rtl-vazir",
                    )}
                  >
                    {project.title}
                  </h3>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatRelativeDate(project.updatedAt)}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {stripMarkdown(project.contentMd).slice(0, 120) || "Empty project"}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <NoteStatusBadge status={project.status} />
                  {project.dueDate && (
                    <Badge variant="outline" className="text-xs">
                      Due {formatRelativeDate(project.dueDate)}
                    </Badge>
                  )}
                  {project.pinned && (
                    <Pin className="size-3 text-muted-foreground" />
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Due tasks */}
      <section>
        <SectionHeader
          title="Due tasks"
          icon={<CheckCircle2 className="size-4" />}
          actionHref="/notes"
        />
        {!hasDueTasks ? (
          <EmptyRow
            label="Nothing due"
            hint="Task notes with due dates inside your projects show up here."
          />
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            <TaskDueList
              title="Delayed"
              emptyLabel="No delayed tasks"
              taskNotes={dueTasks.overdue}
            />
            <TaskDueList
              title="Upcoming"
              emptyLabel="No upcoming tasks"
              taskNotes={dueTasks.upcoming}
            />
          </div>
        )}
      </section>
    </div>
  );
}

function SectionHeader({
  title,
  icon,
  actionHref,
}: {
  title: string;
  icon: React.ReactNode;
  actionHref: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="gap-1 text-muted-foreground"
        nativeButton={false}
        render={<Link href={actionHref} />}
      >
        View all <ArrowRight className="size-3.5" />
      </Button>
    </div>
  );
}

function EmptyRow({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="surface-card-dashed flex flex-col items-start gap-1 p-5 text-sm">
      <div className="flex items-center gap-2 font-medium">
        <Plus className="size-4 text-muted-foreground" />
        {label}
      </div>
      <p className="text-muted-foreground">{hint}</p>
    </div>
  );
}

function NoteCard({ note }: { note: Note }) {
  const excerpt =
    note.excerpt ||
    note.contentMd
      .replace(/[#*`>\-\[\]()!]/g, "")
      .replace(/\n+/g, " ")
      .trim()
      .slice(0, 120);
  const excerptUsesRtlFont = usesRtlTitleFont(excerpt);

  return (
    <Link
      href={`/notes/${note.id}`}
      className="surface-card-interactive group block p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <h3
          className={cn(
            "truncate font-medium",
            usesRtlTitleFont(note.title) && "rtl-vazir",
          )}
        >
          {note.title}
        </h3>
        <span className="shrink-0 text-xs text-muted-foreground">
          {formatRelativeDate(note.updatedAt)}
        </span>
      </div>
      {excerpt && (
        <p
          className={cn(
            "mt-1 line-clamp-2 text-sm text-muted-foreground",
            excerptUsesRtlFont && "rtl-vazir",
          )}
        >
          {excerpt}
        </p>
      )}
      <div className="mt-2 flex items-center gap-2">
        {note.type !== "note" && (
          <Badge variant="secondary" className="text-xs">
            {note.type}
          </Badge>
        )}
        <NoteStatusBadge status={note.status} />
        {note.pinned && <Pin className="size-3 text-muted-foreground" />}
      </div>
    </Link>
  );
}

function TaskDueList({
  title,
  emptyLabel,
  taskNotes,
}: {
  title: string;
  emptyLabel: string;
  taskNotes: Array<{
    id: string;
    title: string;
    projectTitle: string;
    dueDate: Date | null;
  }>;
}) {
  return (
    <div className="surface-card flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
        <Badge variant="secondary" className="text-xs">
          {taskNotes.length}
        </Badge>
      </div>

      {taskNotes.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <div className="flex flex-col gap-1">
          {taskNotes.map((taskNote) => (
            <Link
              key={taskNote.id}
              href={`/notes/${taskNote.id}`}
              className="flex items-center justify-between gap-3 rounded-lg border px-4 py-2.5 text-sm transition-colors hover:bg-muted/40"
            >
              <div className="flex min-w-0 items-center gap-2">
                <CheckCircle2 className="size-3.5 shrink-0 text-muted-foreground" />
                <span
                  className={cn(
                    "truncate",
                    usesRtlTitleFont(taskNote.title) && "rtl-vazir",
                  )}
                >
                  {taskNote.title}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {taskNote.projectTitle}
                </span>
                {taskNote.dueDate && (
                  <Badge variant="outline" className="text-xs">
                    {formatDateShort(taskNote.dueDate)}
                  </Badge>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function stripMarkdown(value: string) {
  return value
    .replace(/[#*_`>~\-[\]()!]/g, "")
    .replace(/\n+/g, " ")
    .trim();
}
