import type { ComponentType } from "react";
import {
  FileText,
  CalendarDays,
  Tag,
  Languages,
  Server,
  Workflow,
  Mic,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Feature = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  /** Grid span classes for the bento layout. */
  span?: string;
  /** Highlighted, AI-tinted cell. */
  featured?: boolean;
};

const FEATURES: Feature[] = [
  {
    icon: Sparkles,
    title: "AI actions, built in — not bolted on",
    description:
      "Summarize, improve writing, extract tasks, or translate — right where you're writing. Bring your own key; nothing leaves without you asking.",
    span: "sm:col-span-2 lg:row-span-2",
    featured: true,
  },
  {
    icon: FileText,
    title: "Markdown-native",
    description:
      "Every note is plain Markdown with GFM tables, task lists, and Mermaid diagrams. Yours to export, forever.",
    span: "sm:col-span-2",
  },
  {
    icon: Workflow,
    title: "Projects & tasks",
    description: "A kanban board with due dates and priorities, right beside your notes.",
  },
  {
    icon: CalendarDays,
    title: "Daily notes",
    description: "One note per day, with optional two-way Google Calendar sync.",
  },
  {
    icon: Mic,
    title: "Speech to text",
    description: "Dictate in the browser. No server key, no extra cost.",
  },
  {
    icon: Tag,
    title: "Tags & hierarchy",
    description: "Color-coded tags with OR filtering and a nested note tree.",
  },
  {
    icon: Languages,
    title: "RTL support",
    description: "Per-note direction — first-class, never an afterthought.",
  },
  {
    icon: Server,
    title: "Self-hosted or cloud",
    description: "Own your data with Docker, or let us run it. Same core either way.",
  },
];

const AI_CHIPS = ["Summarize", "Improve writing", "Extract tasks", "Translate"];

export function BentoFeatures() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
      <div className="reveal mx-auto mb-12 max-w-2xl text-center">
        <span className="ai-badge">Everything, deliberately minimal</span>
        <h2 className="mt-5 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          Everything you need. Nothing you don&apos;t.
        </h2>
        <p className="mt-3 text-muted-foreground text-pretty">
          A calm writing surface with AI exactly where it helps — and out of the way
          everywhere else.
        </p>
      </div>

      <div className="reveal grid grid-cols-1 gap-4 sm:grid-cols-2 lg:auto-rows-[minmax(11rem,auto)] lg:grid-cols-4">
        {FEATURES.map((feature) => (
          <article
            key={feature.title}
            className={cn(
              "bento-cell surface-card group flex flex-col p-5 sm:p-6",
              feature.featured &&
                "border-[var(--ai-border)] bg-[color-mix(in_oklch,var(--ai-surface)_60%,var(--card))]",
              feature.span,
            )}
          >
            <span
              className={cn(
                "bento-icon mb-4 inline-flex size-9 items-center justify-center rounded-xl",
                feature.featured
                  ? "ai-badge__icon"
                  : "border border-border/70 bg-muted/50 text-foreground",
              )}
            >
              <feature.icon className="size-4" />
            </span>

            <h3
              className={cn(
                "font-semibold tracking-tight",
                feature.featured ? "text-lg" : "text-sm",
              )}
            >
              {feature.title}
            </h3>
            <p
              className={cn(
                "mt-1.5 text-muted-foreground",
                feature.featured ? "text-sm sm:text-base" : "text-sm",
              )}
            >
              {feature.description}
            </p>

            {feature.featured && (
              <div className="mt-auto flex flex-wrap gap-2 pt-6" aria-hidden="true">
                {AI_CHIPS.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-[var(--ai-border)] bg-[var(--ai-surface)] px-2.5 py-1 text-xs font-medium text-[var(--ai-ink)]"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
