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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listNotes } from "@/server/notes/service";
import { listUpcomingTasks } from "@/server/tasks/service";
import { formatRelativeDate, formatDateShort } from "@/lib/dates";
import { QuickCapture } from "./quick-capture";

export default async function DashboardPage() {
  const [recentNotes, pinnedNotes, activeProjects, upcomingTasks] =
    await Promise.all([
      listNotes({ limit: 6 }),
      listNotes({ pinnedOnly: true, limit: 6 }),
      listNotes({ type: "project", limit: 4 }),
      listUpcomingTasks(8),
    ]);

  const activeProjectsFiltered = activeProjects.filter((p) =>
    ["todo", "doing", "paused"].includes(p.status),
  );

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
              <Card key={project.id} className="overflow-hidden">
                <Link
                  href={`/projects/${project.id}`}
                  className="block transition-colors hover:bg-muted/40"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="truncate font-medium">{project.title}</h3>
                      <Badge variant="secondary" className="shrink-0 text-xs capitalize">
                        {project.status === "doing" ? "in progress" : project.status}
                      </Badge>
                    </div>
                    {project.dueDate && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Due {formatDateShort(project.dueDate)}
                      </p>
                    )}
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Due tasks */}
      <section>
        <SectionHeader
          title="Upcoming tasks"
          icon={<CheckCircle2 className="size-4" />}
          actionHref="/notes"
        />
        {upcomingTasks.length === 0 ? (
          <EmptyRow
            label="Nothing due"
            hint="Tasks you add to notes show up here."
          />
        ) : (
          <div className="flex flex-col gap-1">
            {upcomingTasks.map((task) => (
              <Link
                key={task.id}
                href={`/notes/${task.noteId}`}
                className="flex items-center justify-between gap-3 rounded-lg border px-4 py-2.5 text-sm transition-colors hover:bg-muted/40"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <CheckCircle2 className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{task.title}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {task.noteTitle}
                  </span>
                  {task.dueDate && (
                    <Badge variant="outline" className="text-xs">
                      {formatDateShort(task.dueDate)}
                    </Badge>
                  )}
                </div>
              </Link>
            ))}
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
        render={<Link href={actionHref} />}
      >
        View all <ArrowRight className="size-3.5" />
      </Button>
    </div>
  );
}

function EmptyRow({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="flex flex-col items-start gap-1 rounded-xl border border-dashed bg-muted/20 p-5 text-sm">
      <div className="flex items-center gap-2 font-medium">
        <Plus className="size-4 text-muted-foreground" />
        {label}
      </div>
      <p className="text-muted-foreground">{hint}</p>
    </div>
  );
}

function NoteCard({ note }: { note: { id: string; title: string; excerpt: string | null; contentMd: string; updatedAt: Date } }) {
  const preview = (note.excerpt || note.contentMd || "")
    .replace(/[#*`>\-\[\]()!]/g, "")
    .replace(/\n+/g, " ")
    .trim()
    .slice(0, 100);

  return (
    <Card className="overflow-hidden">
      <Link
        href={`/notes/${note.id}`}
        className="block transition-colors hover:bg-muted/40"
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate font-medium">{note.title}</h3>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatRelativeDate(note.updatedAt)}
            </span>
          </div>
          {preview && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {preview}
            </p>
          )}
        </CardContent>
      </Link>
    </Card>
  );
}
