import type { Metadata } from "next";
import Link from "next/link";
import { Library, BookOpen, Hash, Search, Download } from "lucide-react";

export const metadata: Metadata = {
  title: "Reader & Knowledge Vault",
  description:
    "Learn about distraction-free reading, web clipping, the knowledge vault, and full-text search in Inkest.",
};

export default function ReaderVaultPage() {
  return (
    <article className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-border/70 pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
          <Library className="size-4" />
          <span>Core Features</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Reader & Knowledge Vault
        </h1>
        <p className="text-sm text-muted-foreground">
          Clip articles from the web, organize notes without rigid folder hierarchies, and explore your digital brain with fast full-text search.
        </p>
      </div>

      {/* Reader View */}
      <section className="surface-card flex flex-col gap-4 p-6">
        <div className="flex items-center gap-2 text-base font-semibold text-foreground">
          <BookOpen className="size-4.5 text-primary" />
          <h2>Distraction-Free Reader & Web Clipping</h2>
        </div>
        <div className="flex flex-col gap-3 text-sm text-muted-foreground">
          <p>
            The <strong className="text-foreground">Reader</strong> mode transforms long articles, documentation, or captured web pages into clean, readable typography stripped of ads and clutter.
          </p>
          <p>
            You can highlight key passages, attach annotations, or use AI prompts like <em>Summarize</em> or <em>Explain</em> directly on clipped articles.
          </p>
        </div>
      </section>

      {/* Vault Organization */}
      <section className="surface-card flex flex-col gap-4 p-6">
        <div className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Hash className="size-4.5 text-primary" />
          <h2>Knowledge Vault Philosophy</h2>
        </div>
        <div className="flex flex-col gap-3 text-sm text-muted-foreground">
          <p>
            Instead of forcing you to organize files into brittle, arbitrary folders, Inkest uses an associative knowledge network powered by:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-muted-foreground">
            <li><strong className="text-foreground">Wiki-Links:</strong> Interconnect notes naturally as you write (<code>[[Concepts]]</code>).</li>
            <li><strong className="text-foreground">Tags & Sub-tags:</strong> Flexible multi-dimensional classification (<code>#science/physics</code>).</li>
            <li><strong className="text-foreground">Backlinks:</strong> Automatically see every note that references your current page.</li>
          </ul>
        </div>
      </section>

      {/* Full-Text Search */}
      <section className="surface-card flex flex-col gap-4 p-6">
        <div className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Search className="size-4.5 text-primary" />
          <h2>Lightning-Fast Search</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Press <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground">Ctrl+K</kbd> (or <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground">Cmd+K</kbd>) to open the command palette. Search instantly across titles, body markdown, and tags across your entire workspace.
        </p>
      </section>

      {/* Data Ownership */}
      <section className="surface-card flex flex-col gap-4 p-6">
        <div className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Download className="size-4.5 text-primary" />
          <h2>Data Portability & Complete ZIP Export</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Your thoughts belong to you forever. Download a complete archive of your workspace containing raw <code>.md</code> files, attachments, and metadata anytime from{" "}
          <Link href="/settings?tab=data" className="text-primary underline underline-offset-4 font-medium">
            Settings → Data & Storage
          </Link>.
        </p>
      </section>
    </article>
  );
}
