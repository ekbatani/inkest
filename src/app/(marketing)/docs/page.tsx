import type { Metadata } from "next";
import Link from "next/link";
import {
  Zap,
  Sparkles,
  FileEdit,
  Calendar,
  CheckSquare,
  Send,
  Library,
  Server,
  Keyboard,
  ArrowRight,
  Terminal,
} from "lucide-react";
import { CopyCodeBlock } from "@/components/marketing/copy-code-block";

export const metadata: Metadata = {
  title: "Documentation Overview",
  description:
    "Explore guides and reference materials for using Inkest, configuring AI models, connecting Telegram, and self-hosting.",
};

const DOC_CARDS = [
  {
    title: "Quick Start Guide",
    href: "/docs/quickstart",
    description: "Create your first note, organize ideas, and tour the core workspace interface.",
    icon: Zap,
    badge: "Start here",
  },
  {
    title: "AI Assistant & Privacy",
    href: "/docs/ai-assistant",
    description: "Connect OpenAI, OpenRouter, Ollama, Zen, or NVIDIA NIM endpoints and inspect data privacy.",
    icon: Sparkles,
    badge: "Popular",
  },
  {
    title: "Notes & Markdown Editor",
    href: "/docs/notes-editor",
    description: "Master wiki-links [[Note]], tags, checklists, LaTeX math, Mermaid diagrams, and attachments.",
    icon: FileEdit,
  },
  {
    title: "Daily Journal & Logs",
    href: "/docs/daily-journal",
    description: "Capture daily thoughts, navigate the calendar timeline, and review reflections.",
    icon: Calendar,
  },
  {
    title: "Projects & Tasks",
    href: "/docs/projects-tasks",
    description: "Manage project stages with Kanban boards, list views, and AI-powered task extraction.",
    icon: CheckSquare,
  },
  {
    title: "Telegram Bot Integration",
    href: "/docs/telegram",
    description: "Pair your Telegram bot with BotFather, receive AI results, and get task reminders.",
    icon: Send,
  },
  {
    title: "Reader & Knowledge Vault",
    href: "/docs/reader-vault",
    description: "Clip web articles, explore backlink relationships, browse tags, and full-text search.",
    icon: Library,
  },
  {
    title: "Self-Hosting & Docker",
    href: "/docs/self-hosting",
    description: "Deploy Inkest on your own server or VPS using Docker Compose and configure storage.",
    icon: Server,
  },
  {
    title: "Keyboard Shortcuts",
    href: "/docs/keyboard-shortcuts",
    description: "Speed up your note-taking workflow with rapid command palette and editor hotkeys.",
    icon: Keyboard,
  },
];

export default function DocsPage() {
  return (
    <div className="flex flex-col gap-10">
      {/* Hero Welcome */}
      <div className="surface-card flex flex-col gap-4 p-6 sm:p-8">
        <div className="flex items-center gap-2">
          <span className="ai-badge">Documentation</span>
          <span className="text-xs text-muted-foreground">Inkest Knowledge Hub</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Everything you need to master Inkest
        </h2>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Inkest is a private, Markdown-first personal workspace built for calm writing, connected notes,
          actionable projects, and thoughtful AI assistance. Whether you are running Inkest locally or
          deploying to your own server, explore the guides below to get started.
        </p>

        <div className="mt-2 flex flex-wrap gap-3">
          <Link
            href="/docs/quickstart"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
          >
            <Zap className="size-3.5" />
            Quick Start Guide
          </Link>
          <Link
            href="/docs/ai-assistant"
            className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-card/60 px-4 py-2 text-xs font-medium text-foreground transition hover:bg-muted"
          >
            <Sparkles className="size-3.5 text-primary" />
            Configure AI Provider
          </Link>
          <Link
            href="/docs/self-hosting"
            className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-card/60 px-4 py-2 text-xs font-medium text-foreground transition hover:bg-muted"
          >
            <Server className="size-3.5 text-muted-foreground" />
            Docker Self-Hosting
          </Link>
        </div>
      </div>

      {/* Topic Grid */}
      <section className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold tracking-tight text-foreground">
          Browse by Topic
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DOC_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                href={card.href}
                className="surface-card group flex flex-col justify-between gap-4 p-5 transition-all hover:border-primary/50 hover:shadow-sm"
              >
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <Icon className="size-4.5" />
                    </div>
                    {card.badge && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        {card.badge}
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    {card.title}
                  </h4>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {card.description}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-primary opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
                  <span>Read guide</span>
                  <ArrowRight className="size-3" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Fast 1-Line Self-Host Run */}
      <section className="surface-card flex flex-col gap-4 p-6 sm:p-7">
        <div className="flex items-center gap-2 text-foreground font-semibold text-base">
          <Terminal className="size-4.5 text-primary" />
          <span>Quick Run with Docker</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Spin up an isolated Inkest instance on your local machine or server with a single command:
        </p>
        <CopyCodeBlock
          code={`docker run -d -p 3000:3000 -v inkest-data:/app/data ghcr.io/ekbatani/inkest:latest`}
        />
        <div className="flex justify-end">
          <Link
            href="/docs/self-hosting"
            className="text-xs font-medium text-primary hover:underline"
          >
            Full Docker Compose & environment guide →
          </Link>
        </div>
      </section>
    </div>
  );
}
