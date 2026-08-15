import type { Metadata } from "next";
import Link from "next/link";
import { Zap, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Quick Start Guide",
  description: "Get up and running with Inkest in less than two minutes.",
};

export default function QuickStartPage() {
  return (
    <article className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-border/70 pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
          <Zap className="size-4" />
          <span>Getting Started</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Quick Start Guide
        </h1>
        <p className="text-sm text-muted-foreground">
          Welcome to Inkest! This step-by-step walkthrough will guide you through creating your first note,
          connecting your notes with wiki-links, using the daily journal, and unlocking AI assistance.
        </p>
      </div>

      {/* Step 1 */}
      <section className="surface-card flex flex-col gap-3 p-6">
        <div className="flex items-center gap-3">
          <div className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            1
          </div>
          <h2 className="text-base font-semibold text-foreground">
            Create Your First Markdown Note
          </h2>
        </div>
        <div className="flex flex-col gap-3 text-sm text-muted-foreground pl-10">
          <p>
            Click <strong className="text-foreground">New Note</strong> in the top navigation or press{" "}
            <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground">Ctrl+N</kbd> (or{" "}
            <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground">Cmd+N</kbd> on macOS).
          </p>
          <p>
            Inkest notes are standard Markdown. You can format with headings, bold text, lists, and checklists without touching your mouse:
          </p>
          <div className="rounded-xl border bg-muted/40 p-3.5 font-mono text-xs text-foreground/90 leading-relaxed">
            # Project Roadmap<br />
            <br />
            - [ ] Define MVP architecture<br />
            - [ ] Link to [[Architecture Decision]]<br />
            - [x] Configure SQLite libSQL database #backend<br />
          </div>
        </div>
      </section>

      {/* Step 2 */}
      <section className="surface-card flex flex-col gap-3 p-6">
        <div className="flex items-center gap-3">
          <div className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            2
          </div>
          <h2 className="text-base font-semibold text-foreground">
            Connect Notes with Wiki-Links & Tags
          </h2>
        </div>
        <div className="flex flex-col gap-3 text-sm text-muted-foreground pl-10">
          <p>
            Build your private knowledge graph by typing <code className="text-primary font-semibold">[[</code> anywhere in the editor.
            A live picker will appear matching existing notes. If you type a title that doesn&apos;t exist yet, clicking the link will instantly generate a new note!
          </p>
          <p>
            Use hashtags like <code className="text-primary">#project</code> or <code className="text-primary">#ideas</code> to group notes across multiple topics.
            View the entire tag hierarchy anytime in the <strong className="text-foreground">Tags</strong> view.
          </p>
        </div>
      </section>

      {/* Step 3 */}
      <section className="surface-card flex flex-col gap-3 p-6">
        <div className="flex items-center gap-3">
          <div className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            3
          </div>
          <h2 className="text-base font-semibold text-foreground">
            Start Your Daily Journal
          </h2>
        </div>
        <div className="flex flex-col gap-3 text-sm text-muted-foreground pl-10">
          <p>
            Head to <strong className="text-foreground">Daily</strong> in the sidebar. Every calendar day has a dedicated note for morning intentions, scratchpads, meeting minutes, and end-of-day reflections.
          </p>
          <p>
            Use the calendar navigation bar to jump seamlessly between days, months, and previous weeks.
          </p>
        </div>
      </section>

      {/* Step 4 */}
      <section className="surface-card flex flex-col gap-3 p-6">
        <div className="flex items-center gap-3">
          <div className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            4
          </div>
          <h2 className="text-base font-semibold text-foreground">
            Connect an AI Provider (Optional)
          </h2>
        </div>
        <div className="flex flex-col gap-3 text-sm text-muted-foreground pl-10">
          <p>
            Unlock intelligent summarization, writing improvements, and automatic task extraction by configuring an OpenAI-compatible endpoint.
            Inkest supports OpenAI, OpenRouter, Ollama (local/offline), opencode Zen, and NVIDIA Build.
          </p>
          <div>
            <Link
              href="/docs/ai-assistant"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              See AI setup guide →
            </Link>
          </div>
        </div>
      </section>

      {/* Next Steps */}
      <div className="flex flex-col gap-4 border-t border-border/70 pt-6">
        <h3 className="text-base font-semibold text-foreground">Next Guides to Explore</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/docs/notes-editor"
            className="surface-card flex items-center justify-between p-4 transition-all hover:border-primary/50"
          >
            <div>
              <h4 className="text-xs font-semibold text-foreground">Notes & Markdown Editor</h4>
              <p className="text-[11px] text-muted-foreground">Master math, Mermaid charts, and attachments</p>
            </div>
            <ArrowRight className="size-4 text-primary" />
          </Link>
          <Link
            href="/docs/projects-tasks"
            className="surface-card flex items-center justify-between p-4 transition-all hover:border-primary/50"
          >
            <div>
              <h4 className="text-xs font-semibold text-foreground">Projects & Kanban</h4>
              <p className="text-[11px] text-muted-foreground">Track tasks, deadlines, and project milestones</p>
            </div>
            <ArrowRight className="size-4 text-primary" />
          </Link>
        </div>
      </div>
    </article>
  );
}
