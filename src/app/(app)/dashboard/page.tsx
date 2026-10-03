import Link from "next/link";
import { differenceInCalendarDays, format } from "date-fns";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  Clock3,
  Pin,
  FolderKanban,
  CheckCircle2,
  Circle,
  FileText,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NoteStatusBadge } from "@/components/notes/note-status-badge";
import {
  listDueTaskNotes,
  listNotes,
  type UpcomingTaskNote,
} from "@/server/notes/service";
import { formatRelativeDate } from "@/lib/dates";
import type { Note } from "@/server/db/schema";
import { QuickCapture } from "./quick-capture";
import { cn } from "@/lib/utils";
import { usesRtlTitleFont } from "@/lib/text/rtl";
import { formatDateKey } from "@/server/calendar/service";

const PINNED_LIMIT = 6;
const RECENT_LIMIT = 6;
const PROJECT_LIMIT = 4;
const DUE_TASK_LIMIT = 6;

export default async function DashboardPage() {
  const [recentCandidates, pinnedNotes, projectCandidates, dueTasks] =
    await Promise.all([
      // Over-fetch so pinned notes can be removed without leaving gaps.
      listNotes({ limit: RECENT_LIMIT + PINNED_LIMIT }),
      listNotes({ pinnedOnly: true, limit: PINNED_LIMIT }),
      listNotes({ type: "project", limit: 24 }),
      listDueTaskNotes(DUE_TASK_LIMIT),
    ]);

  const pinnedIds = new Set(pinnedNotes.map((note) => note.id));
  const recentNotes = recentCandidates
    .filter((note) => !pinnedIds.has(note.id))
    .slice(0, RECENT_LIMIT);
  const activeProjects = projectCandidates.filter((p) =>
    ["todo", "doing", "paused"].includes(p.status),
  );
  const visibleProjects = activeProjects.slice(0, PROJECT_LIMIT);
  const overdueCount = dueTasks.overdue.length;
  const dueTaskCount = overdueCount + dueTasks.upcoming.length;

  const now = new Date();
  const todayLabel = new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(now);
  const todayKey = formatDateKey(now);

  return (
    <div className="app-page gap-8 sm:gap-10">
      <section
        aria-labelledby="dashboard-title"
        className="dashboard-intro surface-card p-6 sm:p-8"
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <p className="section-label flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary" />
              <time dateTime={todayKey}>{todayLabel}</time>
            </p>
            <h1
              id="dashboard-title"
              className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-balance sm:text-4xl"
            >
              Make space for what matters.
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground sm:text-base">
              {dashboardSummary(overdueCount, dueTasks.upcoming.length)}
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
              Open today
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

        <nav
          aria-label="Workspace overview"
          className="mt-7 grid grid-cols-3 gap-2 border-t border-border/70 pt-5"
        >
          <WorkspaceMetric
            href="#due-tasks"
            icon={<Clock3 className="size-3.5" />}
            value={dueTaskCount}
            label="Due soon"
            detail={overdueCount > 0 ? `${overdueCount} overdue` : undefined}
            tone={overdueCount > 0 ? "alert" : "default"}
          />
          <WorkspaceMetric
            href="#active-projects"
            icon={<FolderKanban className="size-3.5" />}
            value={activeProjects.length}
            label="Active projects"
          />
          <WorkspaceMetric
            href="#pinned"
            icon={<Pin className="size-3.5" />}
            value={pinnedNotes.length}
            label="Pinned"
          />
        </nav>
      </section>

      <QuickCapture />

      {/* Focus: what needs attention now */}
      <div className="grid gap-8 sm:gap-10 lg:grid-cols-5 lg:gap-6">
        <section
          id="due-tasks"
          aria-labelledby="due-tasks-title"
          className="scroll-mt-6 lg:col-span-3"
        >
          <SectionHeader
            id="due-tasks-title"
            title="Due tasks"
            icon={<CheckCircle2 className="size-4" />}
            count={dueTaskCount}
            actionHref="/projects"
            actionLabel="All projects"
          />
          {dueTaskCount === 0 ? (
            <EmptyState
              label="Nothing due"
              hint="Tasks with due dates inside your projects show up here."
              actionHref="/projects"
              actionLabel="Open projects"
            />
          ) : (
            <div className="surface-card divide-y divide-border/60 overflow-hidden">
              {overdueCount > 0 && (
                <TaskGroup
                  title="Overdue"
                  tone="alert"
                  taskNotes={dueTasks.overdue}
                  now={now}
                />
              )}
              {dueTasks.upcoming.length > 0 && (
                <TaskGroup
                  title="Upcoming"
                  taskNotes={dueTasks.upcoming}
                  now={now}
                />
              )}
            </div>
          )}
        </section>

        <section
          id="active-projects"
          aria-labelledby="active-projects-title"
          className="scroll-mt-6 lg:col-span-2"
        >
          <SectionHeader
            id="active-projects-title"
            title="Active projects"
            icon={<FolderKanban className="size-4" />}
            count={activeProjects.length}
            actionHref="/projects"
          />
          {visibleProjects.length === 0 ? (
            <EmptyState
              label="No active projects"
              hint="Create a project to plan work and track tasks."
              actionHref="/projects"
              actionLabel="Start a project"
            />
          ) : (
            <ul className="surface-card divide-y divide-border/60 overflow-hidden">
              {visibleProjects.map((project) => (
                <li key={project.id}>
                  <ProjectRow project={project} now={now} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section
        id="pinned"
        aria-labelledby="pinned-title"
        className="scroll-mt-6"
      >
        <SectionHeader
          id="pinned-title"
          title="Pinned"
          icon={<Pin className="size-4" />}
          count={pinnedNotes.length}
          actionHref="/notes"
        />
        {pinnedNotes.length === 0 ? (
          <EmptyState
            label="No pinned notes yet"
            hint="Pin the notes you return to often and they'll wait for you here."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pinnedNotes.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="recent-title">
        <SectionHeader
          id="recent-title"
          title="Recently edited"
          icon={<FileText className="size-4" />}
          actionHref="/notes"
        />
        {recentNotes.length === 0 ? (
          pinnedNotes.length === 0 ? (
            <EmptyState
              label="No notes yet"
              hint="Write your first note above, or start from a blank page."
              actionHref="/notes/new"
              actionLabel="New note"
            />
          ) : (
            <p className="px-1 text-sm text-muted-foreground">
              Everything you&apos;ve edited lately is pinned above.
            </p>
          )
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {recentNotes.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function dashboardSummary(overdue: number, upcoming: number) {
  if (overdue > 0) {
    return `${pluralize(overdue, "task is", "tasks are")} past due${
      upcoming > 0 ? ` and ${upcoming} more coming up` : ""
    }. Start there, or capture what's on your mind.`;
  }
  if (upcoming > 0) {
    return `${pluralize(upcoming, "task is", "tasks are")} coming up. Capture a thought, continue a project, or open today's page.`;
  }
  return "Capture a thought, continue a project, or open today's page—your whole workspace is within reach.";
}

function pluralize(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

type DueTone = "alert" | "soon" | "default";

function describeDueDate(dueDate: Date, now: Date): { label: string; tone: DueTone } {
  const days = differenceInCalendarDays(dueDate, now);
  if (days < -1) return { label: `${-days} days late`, tone: "alert" };
  if (days === -1) return { label: "Yesterday", tone: "alert" };
  if (days === 0) {
    return { label: "Today", tone: dueDate < now ? "alert" : "soon" };
  }
  if (days === 1) return { label: "Tomorrow", tone: "soon" };
  if (days < 7) return { label: format(dueDate, "EEEE"), tone: "default" };
  return {
    label: format(
      dueDate,
      dueDate.getFullYear() === now.getFullYear() ? "MMM d" : "MMM d, yyyy",
    ),
    tone: "default",
  };
}

const dueToneClass: Record<DueTone, string> = {
  alert:
    "border-destructive/30 bg-destructive/8 text-destructive dark:border-destructive/40 dark:bg-destructive/15",
  soon: "border-amber-300/70 bg-amber-500/10 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-200",
  default: "text-muted-foreground",
};

function DueBadge({ dueDate, now }: { dueDate: Date; now: Date }) {
  const { label, tone } = describeDueDate(dueDate, now);
  return (
    <Badge
      variant="outline"
      className={cn("shrink-0 text-xs tabular-nums", dueToneClass[tone])}
    >
      <time dateTime={dueDate.toISOString()} title={format(dueDate, "PPPP")}>
        {label}
      </time>
    </Badge>
  );
}

function WorkspaceMetric({
  href,
  icon,
  value,
  label,
  detail,
  tone = "default",
}: {
  href: string;
  icon: React.ReactNode;
  value: number;
  label: string;
  detail?: string;
  tone?: "default" | "alert";
}) {
  return (
    <a
      href={href}
      className="group -m-1 flex min-w-0 items-center gap-2 rounded-xl p-1 outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring sm:gap-3 sm:p-2"
    >
      <span
        className={cn(
          "hidden size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:text-foreground sm:flex",
          tone === "alert" && "bg-destructive/10 text-destructive group-hover:text-destructive",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block font-mono text-lg font-semibold leading-none tabular-nums">
          {value}
        </span>
        <span className="mt-1 block truncate text-[11px] text-muted-foreground sm:text-xs">
          {label}
          {detail && (
            <span className="text-destructive">
              <span aria-hidden> · </span>
              <span className="sr-only">, </span>
              {detail}
            </span>
          )}
        </span>
      </span>
    </a>
  );
}

function SectionHeader({
  id,
  title,
  icon,
  count,
  actionHref,
  actionLabel = "View all",
}: {
  id: string;
  title: string;
  icon: React.ReactNode;
  count?: number;
  actionHref: string;
  actionLabel?: string;
}) {
  return (
    <div className="mb-3 flex min-h-8 items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground" aria-hidden>
          {icon}
        </span>
        <h2 id={id} className="section-label">
          {title}
        </h2>
        {count !== undefined && count > 0 && (
          <span className="rounded-full bg-muted px-1.5 py-0.5 font-mono text-[0.65rem] font-semibold tabular-nums text-muted-foreground">
            {count}
          </span>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="gap-1 text-muted-foreground"
        nativeButton={false}
        render={<Link href={actionHref} />}
      >
        {actionLabel}
        <ArrowRight className="size-3.5 rtl:rotate-180" aria-hidden />
      </Button>
    </div>
  );
}

function EmptyState({
  label,
  hint,
  actionHref,
  actionLabel,
}: {
  label: string;
  hint: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="surface-card-dashed flex flex-col items-start gap-3 p-5 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <p className="font-medium">{label}</p>
        <p className="text-muted-foreground">{hint}</p>
      </div>
      {actionHref && actionLabel && (
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 rounded-lg"
          nativeButton={false}
          render={<Link href={actionHref} />}
        >
          <Plus className="size-3.5" aria-hidden />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

function NoteCard({ note }: { note: Note }) {
  const excerpt = note.excerpt || stripMarkdown(note.contentMd).slice(0, 140);

  return (
    <Link
      href={`/notes/${note.id}`}
      className="surface-card-interactive group flex flex-col p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-3">
        <h3
          dir="auto"
          className={cn(
            "min-w-0 truncate font-medium",
            usesRtlTitleFont(note.title) && "rtl-vazir",
          )}
        >
          {note.title || "Untitled"}
        </h3>
        <span className="shrink-0 pt-0.5 text-xs text-muted-foreground">
          {formatRelativeDate(note.updatedAt)}
        </span>
      </div>
      {excerpt ? (
        <p
          dir="auto"
          className={cn(
            "mt-1 line-clamp-2 text-sm text-muted-foreground",
            usesRtlTitleFont(excerpt) && "rtl-vazir",
          )}
        >
          {excerpt}
        </p>
      ) : (
        <p className="mt-1 text-sm italic text-muted-foreground/70">Empty note</p>
      )}
      {(note.type !== "note" || note.status !== "none") && (
        <div className="mt-3 flex items-center gap-2">
          {note.type !== "note" && (
            <Badge variant="secondary" className="text-xs capitalize">
              {note.type}
            </Badge>
          )}
          <NoteStatusBadge status={note.status} />
        </div>
      )}
    </Link>
  );
}

function ProjectRow({ project, now }: { project: Note; now: Date }) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="group flex items-center gap-3 px-4 py-3 outline-none transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
        <FolderKanban className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p
            dir="auto"
            className={cn(
              "min-w-0 truncate text-sm font-medium",
              usesRtlTitleFont(project.title) && "rtl-vazir",
            )}
          >
            {project.title || "Untitled project"}
          </p>
          {project.pinned && (
            <Pin className="size-3 shrink-0 text-muted-foreground" aria-label="Pinned" />
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          Updated {formatRelativeDate(project.updatedAt)}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
        <NoteStatusBadge status={project.status} />
        {project.dueDate && <DueBadge dueDate={project.dueDate} now={now} />}
      </div>
    </Link>
  );
}

function TaskGroup({
  title,
  tone = "default",
  taskNotes,
  now,
}: {
  title: string;
  tone?: "default" | "alert";
  taskNotes: UpcomingTaskNote[];
  now: Date;
}) {
  return (
    <div>
      <h3
        className={cn(
          "section-label flex items-center gap-1.5 bg-muted/30 px-4 py-2",
          tone === "alert" && "text-destructive",
        )}
      >
        {tone === "alert" && <AlertCircle className="size-3" aria-hidden />}
        {title}
        <span className="tabular-nums opacity-70">{taskNotes.length}</span>
      </h3>
      <ul className="divide-y divide-border/50">
        {taskNotes.map((taskNote) => (
          <li key={taskNote.id}>
            <Link
              href={`/notes/${taskNote.id}`}
              className="flex items-center gap-3 px-4 py-2.5 text-sm outline-none transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <Circle
                className={cn(
                  "size-3.5 shrink-0 text-muted-foreground/70",
                  tone === "alert" && "text-destructive/70",
                )}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p
                  dir="auto"
                  className={cn(
                    "truncate",
                    usesRtlTitleFont(taskNote.title) && "rtl-vazir",
                  )}
                >
                  {taskNote.title || "Untitled task"}
                </p>
                <p
                  dir="auto"
                  className={cn(
                    "truncate text-xs text-muted-foreground",
                    usesRtlTitleFont(taskNote.projectTitle) && "rtl-vazir",
                  )}
                >
                  {taskNote.projectTitle}
                </p>
              </div>
              {taskNote.dueDate && (
                <DueBadge dueDate={taskNote.dueDate} now={now} />
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function stripMarkdown(value: string) {
  return value
    .replace(/[#*_`>~\-[\]()!]/g, "")
    .replace(/\n+/g, " ")
    .trim();
}
