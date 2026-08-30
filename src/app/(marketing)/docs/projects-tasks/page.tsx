import type { Metadata } from "next";
import Link from "next/link";
import { CheckSquare, Kanban, Sparkles, Calendar } from "lucide-react";

export const metadata: Metadata = {
  title: "Projects & Tasks",
  description: "Learn how to manage projects, organize Kanban boards, and extract tasks with AI in Inkest.",
};

export default function ProjectsTasksPage() {
  return (
    <article className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-border/70 pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
          <CheckSquare className="size-4" />
          <span>Core Features</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Projects & Task Management
        </h1>
        <p className="text-sm text-muted-foreground">
          Bridge the gap between free-form writing and structured execution with project boards, task tracking, and AI-assisted extraction.
        </p>
      </div>

      {/* Projects Overview */}
      <section className="surface-card flex flex-col gap-4 p-6">
        <div className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Kanban className="size-4.5 text-primary" />
          <h2>Project Spaces & Kanban Boards</h2>
        </div>
        <div className="flex flex-col gap-3 text-sm text-muted-foreground">
          <p>
            Create projects for high-level goals, client deliverables, software sprints, or writing projects.
            Each project features status columns (<em>To Do</em>, <em>In Progress</em>, <em>Paused</em>, <em>Done</em>) with smooth drag-and-drop organization.
          </p>
          <p>
            You can switch between visual Kanban board views and compact List views depending on your workflow preference.
            Alongside the board of task notes, every project has a lightweight checklist for quick tasks — added by hand, synced from markdown checkboxes, or extracted by AI.
          </p>
        </div>
      </section>

      {/* AI Task Extraction */}
      <section className="surface-card flex flex-col gap-4 p-6">
        <div className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Sparkles className="size-4.5 text-primary" />
          <h2>AI Task Extraction</h2>
        </div>
        <div className="flex flex-col gap-3 text-sm text-muted-foreground">
          <p>
            Have a meeting note or long braindump full of implicit action items? Click <strong className="text-foreground">AI Actions → Extract Tasks</strong> while viewing any note.
          </p>
          <p>
            Inkest analyzes the note text, identifies action items, suggests appropriate due dates and project targets, and presents them in an interactive review modal.
            You can edit, deselect, or customize any extracted task before confirming.
          </p>
        </div>
      </section>

      {/* Due Dates & Notifications */}
      <section className="surface-card flex flex-col gap-4 p-6">
        <div className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Calendar className="size-4.5 text-primary" />
          <h2>Due Dates & Automatic Reminders</h2>
        </div>
        <div className="flex flex-col gap-3 text-sm text-muted-foreground">
          <p>
            Assign due dates to any task. Upcoming and overdue tasks are highlighted across your workspace dashboard so nothing falls through the cracks.
          </p>
          <p>
            When Telegram notifications are enabled, you receive automated morning reminders summarizing tasks that are due today.
          </p>
          <div>
            <Link
              href="/docs/telegram"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Learn more about Telegram alerts →
            </Link>
          </div>
        </div>
      </section>
    </article>
  );
}
