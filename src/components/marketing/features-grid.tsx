import {
  FileText,
  ListChecks,
  CalendarDays,
  Tag,
  Languages,
  Server,
  Workflow,
  Mic,
} from "lucide-react";

const FEATURES = [
  {
    icon: FileText,
    title: "Markdown-native",
    description: "Notes are plain Markdown with GFM tables, task lists, and Mermaid diagrams.",
  },
  {
    icon: Workflow,
    title: "Projects & tasks",
    description: "Kanban board, due dates, and priorities — right alongside your notes.",
  },
  {
    icon: CalendarDays,
    title: "Daily notes & calendar",
    description: "One note per day, with optional two-way Google Calendar sync.",
  },
  {
    icon: Tag,
    title: "Tags & hierarchy",
    description: "Color-coded tags with OR filtering, and a nested project/note tree.",
  },
  {
    icon: ListChecks,
    title: "AI actions",
    description: "Summarize, improve writing, extract tasks, translate — bring your own key.",
  },
  {
    icon: Mic,
    title: "Speech to text",
    description: "Dictate notes in the browser. No server-side key, no extra cost.",
  },
  {
    icon: Languages,
    title: "RTL support",
    description: "Per-note direction (LTR, RTL, auto) — first-class, not an afterthought.",
  },
  {
    icon: Server,
    title: "Self-hosted or cloud",
    description: "Own your data with Docker, or let us run it. Same open-source core either way.",
  },
];

export function FeaturesGrid() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Everything you need. Nothing you don&apos;t.
        </h2>
        <p className="mt-3 text-muted-foreground">
          Inkest stays deliberately minimal — a calm writing surface with AI where it
          actually helps.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="surface-card-interactive p-5 transition-transform hover:-translate-y-0.5"
          >
            <span className="ai-badge__icon mb-3 inline-flex">
              <feature.icon className="size-4" />
            </span>
            <h3 className="text-sm font-semibold">{feature.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
