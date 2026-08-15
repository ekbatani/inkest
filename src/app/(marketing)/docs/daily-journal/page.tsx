import type { Metadata } from "next";
import Link from "next/link";
import { Calendar, Sun, Clock, Bell } from "lucide-react";

export const metadata: Metadata = {
  title: "Daily Journal & Logs",
  description: "Learn how to use daily notes, journal entries, and reflection routines in Inkest.",
};

export default function DailyJournalPage() {
  return (
    <article className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-border/70 pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
          <Calendar className="size-4" />
          <span>Core Features</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Daily Journal & Daily Notes
        </h1>
        <p className="text-sm text-muted-foreground">
          Capture transient thoughts, track daily priorities, and review reflections with automatic daily note creation and calendar navigation.
        </p>
      </div>

      {/* Overview */}
      <section className="surface-card flex flex-col gap-4 p-6">
        <div className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Sun className="size-4.5 text-primary" />
          <h2>How Daily Notes Work</h2>
        </div>
        <div className="flex flex-col gap-3 text-sm text-muted-foreground">
          <p>
            When you visit the <strong className="text-foreground">Daily</strong> tab in the navigation bar, Inkest automatically opens or creates today&apos;s personal log (formatted by date: <code>YYYY-MM-DD</code>).
          </p>
          <p>
            Daily notes act as an unfiltered scratchpad for meetings, rapid captures, and checklists throughout your day.
            Any tasks or wiki-links you create inside a daily note automatically link into your wider knowledge graph.
          </p>
        </div>
      </section>

      {/* Suggested Daily Structure */}
      <section className="surface-card flex flex-col gap-4 p-6">
        <div className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Clock className="size-4.5 text-primary" />
          <h2>Recommended Daily Workflow</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border/70 bg-card/40 p-4 flex flex-col gap-2">
            <span className="text-xs font-bold text-primary">Morning</span>
            <h4 className="text-xs font-semibold text-foreground">Set Intentions</h4>
            <p className="text-[11px] text-muted-foreground">
              Outline your top 3 needle-moving priorities and review pending tasks from yesterday.
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-card/40 p-4 flex flex-col gap-2">
            <span className="text-xs font-bold text-primary">Midday</span>
            <h4 className="text-xs font-semibold text-foreground">Quick Capture</h4>
            <p className="text-[11px] text-muted-foreground">
              Jot meeting minutes, paste URLs, or capture transient ideas using quick capture.
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-card/40 p-4 flex flex-col gap-2">
            <span className="text-xs font-bold text-primary">Evening</span>
            <h4 className="text-xs font-semibold text-foreground">Reflect & Clear</h4>
            <p className="text-[11px] text-muted-foreground">
              Run AI task extraction to automatically convert meeting minutes into actionable tasks.
            </p>
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section className="surface-card flex flex-col gap-4 p-6">
        <div className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Bell className="size-4.5 text-primary" />
          <h2>Daily Note Nudges via Telegram</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Never break your journaling streak: pair your Telegram account to receive a quiet nudge each morning to open your daily log and reflect on your goals.
        </p>
        <div>
          <Link
            href="/docs/telegram"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Configure Telegram reminders →
          </Link>
        </div>
      </section>
    </article>
  );
}
