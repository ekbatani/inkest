import type { Metadata } from "next";
import Link from "next/link";
import { FileEdit, Link2, Hash, CheckSquare, Code2, Image as ImageIcon, Layers } from "lucide-react";
import { CopyCodeBlock } from "@/components/marketing/copy-code-block";

export const metadata: Metadata = {
  title: "Notes & Markdown Editor",
  description: "Learn how to write, format, connect, and render rich Markdown in Inkest.",
};

export default function NotesEditorPage() {
  return (
    <article className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-border/70 pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
          <FileEdit className="size-4" />
          <span>Core Features</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Notes & Markdown Editor
        </h1>
        <p className="text-sm text-muted-foreground">
          Inkest uses an ultra-fast, extensible Markdown editor equipped with live wiki-link completion,
          syntax highlighting, real-time LaTeX math, Mermaid diagrams, and authenticated attachments.
        </p>
      </div>

      {/* Wiki Links */}
      <section className="surface-card flex flex-col gap-4 p-6">
        <div className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Link2 className="size-4.5 text-primary" />
          <h2>Wiki-Links & Bi-Directional Backlinks</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Link any thought to another note by enclosing the note title in double brackets:
        </p>
        <CopyCodeBlock
          code={`Check out [[System Architecture]] and [[Release Checklist 2026]].
You can also specify a custom link title: [[Database Migration Plan|DB Plan]].`}
        />
        <div className="flex flex-col gap-2 rounded-xl bg-muted/40 p-4 text-xs text-muted-foreground">
          <p>
            <strong className="text-foreground">Live Autocomplete:</strong> As soon as you type <code className="font-semibold text-primary">[[</code>, an intelligent search dropdown opens showing matching notes in your workspace.
          </p>
          <p>
            <strong className="text-foreground">Bi-directional Graph:</strong> Every note automatically tracks which other notes link to it in the Backlinks panel.
          </p>
        </div>
      </section>

      {/* Tags */}
      <section className="surface-card flex flex-col gap-4 p-6">
        <div className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Hash className="size-4.5 text-primary" />
          <h2>Tags & Categorization</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Add tags anywhere in your note content using the hash symbol:
        </p>
        <CopyCodeBlock code={`#research #finance #meeting/q3 #deep-work`} />
        <p className="text-xs text-muted-foreground">
          Tags support nesting with slashes (e.g. <code>#project/alpha</code>) and are indexed in real time for rapid filtering across the entire workspace.
        </p>
      </section>

      {/* Task Checklists */}
      <section className="surface-card flex flex-col gap-4 p-6">
        <div className="flex items-center gap-2 text-base font-semibold text-foreground">
          <CheckSquare className="size-4.5 text-primary" />
          <h2>Interactive Checklists</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Write task lists in standard Markdown syntax. In preview mode, checkboxes can be toggled interactively:
        </p>
        <CopyCodeBlock
          code={`- [ ] Unfinished milestone
- [x] Completed item with timestamp
- [ ] Task linked to [[Sprint Backlog]]`}
        />
      </section>

      {/* Math & Mermaid */}
      <section className="surface-card flex flex-col gap-4 p-6">
        <div className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Code2 className="size-4.5 text-primary" />
          <h2>Math (LaTeX) & Mermaid Diagrams</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Render beautiful mathematical formulas and architecture flowcharts natively:
        </p>
        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-semibold text-foreground">LaTeX Expressions:</h4>
          <CopyCodeBlock
            code={`Inline formula: $E = mc^2$

Display equation block:
$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$`}
          />

          <h4 className="text-xs font-semibold text-foreground mt-2">Mermaid Diagrams:</h4>
          <CopyCodeBlock
            code={`\`\`\`mermaid
flowchart TD
    A[Client Request] --> B[Next.js App Router]
    B --> C[Server Action & Auth Scope]
    C --> D[(libSQL SQLite DB)]
\`\`\``}
          />
        </div>
      </section>

      {/* Attachments */}
      <section className="surface-card flex flex-col gap-4 p-6">
        <div className="flex items-center gap-2 text-base font-semibold text-foreground">
          <ImageIcon className="size-4.5 text-primary" />
          <h2>Private Attachments & Media</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Drag and drop images, PDFs, audio recordings, or documents directly into the editor.
          Attachments are securely stored using local filesystem storage or S3/MinIO and are served exclusively via authenticated, workspace-scoped routes.
        </p>
      </section>

      {/* Editor Preferences */}
      <section className="surface-card flex flex-col gap-4 p-6">
        <div className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Layers className="size-4.5 text-primary" />
          <h2>Customizing Editor Behavior</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Configure autosave debounce delays, line numbering, spellcheck language, and typography choices from{" "}
          <Link href="/settings?tab=appearance" className="text-primary underline underline-offset-4">
            Settings → Appearance & Editor
          </Link>.
        </p>
      </section>
    </article>
  );
}
