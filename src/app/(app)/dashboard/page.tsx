"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Pin,
  FolderKanban,
  CheckCircle2,
  Plus,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ItemCard = {
  id: string;
  title: string;
  excerpt?: string | null;
  href: string;
  updatedAt: string;
};

const recentPlaceholder: ItemCard[] = [
  {
    id: "1",
    title: "Welcome to InkNest",
    excerpt: "A calm, Markdown-first workspace. Start by creating your first note.",
    href: "/notes",
    updatedAt: "just now",
  },
];

export default function DashboardPage() {
  const [quickCapture, setQuickCapture] = React.useState("");

  const onQuickCapture = () => {
    const text = quickCapture.trim();
    if (!text) return;
    setQuickCapture("");
    toast.info("Quick capture will create a note once Phase 3 is wired up.", {
      description: "For now, use the “New note” button in the top bar.",
    });
  };

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

      <section className="rounded-xl border bg-card p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Sparkles className="size-4" />
          Quick capture
        </div>
        <Textarea
          value={quickCapture}
          onChange={(e) => setQuickCapture(e.target.value)}
          placeholder="Jot down a thought…"
          className="min-h-20 resize-none border-0 p-0 text-base shadow-none focus-visible:ring-0"
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              onQuickCapture();
            }
          }}
        />
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Press ⌘/Ctrl + Enter to save
          </span>
          <Button size="sm" onClick={onQuickCapture} disabled={!quickCapture.trim()}>
            Save note
          </Button>
        </div>
      </section>

      <section>
        <SectionHeader
          title="Pinned"
          icon={<Pin className="size-4" />}
          actionHref="/notes"
        />
        <EmptyRow
          label="No pinned notes yet"
          hint="Pin a note to keep it within reach."
        />
      </section>

      <section>
        <SectionHeader
          title="Recent"
          icon={<ArrowRight className="size-4" />}
          actionHref="/notes"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          {recentPlaceholder.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <Link
                href={item.href}
                className="block transition-colors hover:bg-muted/40"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="truncate font-medium">{item.title}</h3>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {item.updatedAt}
                    </span>
                  </div>
                  {item.excerpt && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {item.excerpt}
                    </p>
                  )}
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader
          title="Active projects"
          icon={<FolderKanban className="size-4" />}
          actionHref="/projects"
        />
        <EmptyRow
          label="No active projects"
          hint="Create a project note to start planning."
        />
      </section>

      <section>
        <SectionHeader
          title="Due tasks"
          icon={<CheckCircle2 className="size-4" />}
          actionHref="/notes"
        />
        <EmptyRow label="Nothing due" hint="Tasks you add to notes show up here." />
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
    <div
      className={cn(
        "flex flex-col items-start gap-1 rounded-xl border border-dashed p-5",
        "bg-muted/20 text-sm",
      )}
    >
      <div className="flex items-center gap-2 font-medium">
        <Plus className="size-4 text-muted-foreground" />
        {label}
      </div>
      <p className="text-muted-foreground">{hint}</p>
    </div>
  );
}
