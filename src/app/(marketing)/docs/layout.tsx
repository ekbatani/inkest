import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpen, Sparkles } from "lucide-react";
import { DocsSidebar } from "@/components/docs/docs-sidebar";

export const metadata: Metadata = {
  title: {
    template: "%s | Inkest Documentation",
    default: "Documentation | Inkest",
  },
  description:
    "Guides, tutorials, API setup, self-hosting, and architectural details for Inkest.",
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-[90rem] px-4 py-8 sm:px-6 sm:py-12 lg:px-12">
      {/* Docs Header Bar */}
      <div className="mb-8 flex flex-col gap-4 border-b border-border/70 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BookOpen className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Knowledge Base
              </span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                v0.1
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Inkest Documentation
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Back to App
          </Link>
          <Link
            href="/settings?tab=ai"
            className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/20"
          >
            <Sparkles className="size-3.5" />
            AI Settings
          </Link>
        </div>
      </div>

      {/* Docs Content Grid */}
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12">
        <DocsSidebar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
