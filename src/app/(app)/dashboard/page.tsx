import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
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
import { formatDateKey } from "@/server/calendar/service";

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
  const dueTaskCount = dueTasks.overdue.length + dueTasks.upcoming.length;
  const todayLabel = new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
  const todayKey = formatDateKey(new Date());

  return (
    <div className="app-page gap-8 sm:gap-10">
      <section className="dashboard-intro surface-card p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <p className="section-label flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary" />
              {todayLabel}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
              Make space for what matters.
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground sm:text-base">
              Capture a thought, continue a project, or open today&apos;s page—your
              whole workspace is within reach.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="rounded-xl"
              nativeButton={false}
              render={<Link href={`/daily?date=${todayKey}`} />}
            >
              <CalendarDays className="size-4" />
              Open daily
            </Button>
            <Button
              className="rounded-xl shadow-sm"
              nativeButton={false}
              render={<Link href="/notes/new" />}
            >
              <Plus className="size-4" />
              New note
            </Button>
          </div>
        </div>

        <div className="mt-7 grid grid-cols-3 divide-x divide-border/70 border-t border-border/70 pt-5">
          <WorkspaceMetric
            icon={<Pin className="size-3.5" />}
            value={pinnedNotes.length}
            label="Pinned"
          />
          <WorkspaceMetric
            icon={<FolderKanban className="size-3.5" />}
            value={activeProjectsFiltered.length}
            label="Active projects"
          />
          <WorkspaceMetric
            icon={<Clock3 className="size-3.5" />}
            value={dueTaskCount}
            label="Due soon"
          />
        </div>
      </section>

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

function WorkspaceMetric({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 px-3 first:pl-0 last:pr-0 sm:gap-3 sm:px-5">
      <span className="hidden size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground sm:flex">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="font-mono text-lg font-semibold leading-none tabular-nums">
          {value}
        </p>
        <p className="mt-1 truncate text-[11px] text-muted-foreground sm:text-xs">
          {label}
        </p>
      </div>
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
        <h2 className="section-label">
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
        <h3 className="section-label">
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
