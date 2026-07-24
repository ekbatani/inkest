import {
  ArrowUpRight,
  BookOpen,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  FileText,
  FolderKanban,
  Link2,
  Quote,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export function BentoFeatures() {
  return (
    <section id="product" className="marketing-section">
      <div className="marketing-feature-grid">
        {/* Feature 1: Writing Surface */}
        <article className="feature-card feature-card--write reveal">
          <div className="feature-card-copy">
            <span className="feature-number">01</span>
            <p className="marketing-eyebrow">Markdown-Native Writing</p>
            <h3>A calm paper surface designed for distraction-free thought.</h3>
            <p>
              Instant inline preview, automatic <code className="rounded bg-[var(--marketing-line)] px-1 py-0.5 font-mono text-xs">[[wiki-links]]</code> with live autocomplete, formatting shortcuts, RTL Persian/Arabic text support, and 100% Markdown file export.
            </p>
          </div>
          <div className="writing-demo" aria-hidden="true">
            <div className="writing-demo-toolbar">
              <b>B</b><i>I</i><span>H1</span><Link2 /><Sparkles />
            </div>
            <div className="writing-demo-page">
              <small>RESEARCH LOG / 24 JULY</small>
              <strong>Cognitive Ergonomics &amp; Local Knowledge</strong>
              <span className="writing-line writing-line--long" />
              <span className="writing-line" />
              <mark>“Treat attention as a sacred place you design, not a resource you constantly lose.”</mark>
            </div>
          </div>
        </article>

        {/* Feature 2: Connected Digital Brain */}
        <article className="feature-card feature-card--brain reveal">
          <span className="feature-number">02</span>
          <p className="marketing-eyebrow">Connected Knowledge &amp; Graph</p>
          <h3>Ideas grow exponentially when they find each other.</h3>
          <p>
            Bi-directional backlinks, interactive visual relation graph, saved filter views, and instant note re-finding in under 30 seconds.
          </p>
          <div className="brain-map" aria-hidden="true">
            <span className="brain-node brain-node--center"><BrainCircuit /></span>
            <span className="brain-node brain-node--a"><FileText /></span>
            <span className="brain-node brain-node--b"><CalendarDays /></span>
            <span className="brain-node brain-node--c"><FolderKanban /></span>
            <svg viewBox="0 0 300 180">
              <path d="M150 90 66 38M150 90 244 42M150 90 236 145M150 90 66 145" />
            </svg>
          </div>
        </article>

        {/* Feature 3: Deep Document Reader */}
        <article className="feature-card feature-card--reader reveal">
          <span className="feature-number">03</span>
          <p className="marketing-eyebrow">Deep Document Reader</p>
          <h3>Read PDFs &amp; papers with margin highlights and extracts.</h3>
          <p>
            Import PDF documents and plain Markdown files. Read in focus mode with custom typography, 4-color margin highlights, and 1-click Extract-to-Note with citation pointers.
          </p>
          <div className="reader-demo-container" aria-hidden="true">
            <div className="reader-demo-card">
              <div className="flex items-center justify-between text-[10px] text-[var(--marketing-muted)] font-mono">
                <span className="flex items-center gap-1"><BookOpen className="size-3 text-[var(--marketing-accent)]" /> Attention_Mechanism.pdf</span>
                <span>Page 14</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[var(--marketing-ink)] font-serif italic border-l-2 border-amber-500/60 pl-2 bg-amber-500/5 py-1">
                “Grounded retrieval restricts hallucination by tying every generated token to verified source passages.”
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span className="inline-flex items-center gap-1 rounded bg-[var(--marketing-accent-bright)] px-2 py-0.5 text-[10px] font-medium text-emerald-950">
                  <Quote className="size-2.5" /> Extract to Note #42
                </span>
                <span className="flex gap-1">
                  <span className="size-2.5 rounded-full bg-amber-400" />
                  <span className="size-2.5 rounded-full bg-emerald-400" />
                  <span className="size-2.5 rounded-full bg-sky-400" />
                  <span className="size-2.5 rounded-full bg-rose-400" />
                </span>
              </div>
            </div>
          </div>
        </article>

        {/* Feature 4: Grounded AI with Source Citations */}
        <article className="feature-card feature-card--ai reveal">
          <span className="feature-number">04</span>
          <p className="marketing-eyebrow">Grounded AI with Source Citations</p>
          <h3>AI anchored in your notes—with transparent source pointers.</h3>
          <p>
            Query your notes and PDF research with zero guesswork. Every AI response comes with openable citations, a full diff preview before applying, and AES-256 encrypted API keys.
          </p>
          <div className="ai-prompt-demo" aria-hidden="true">
            <span className="ai-orbit"><Sparkles /></span>
            <div>
              <small className="flex items-center gap-1"><ShieldCheck className="size-3 text-emerald-500" /> GROUNDED RETRIEVAL</small>
              <strong>Synthesize findings on local-first data models</strong>
              <span className="text-[10px] text-[var(--marketing-accent)] font-mono block mt-0.5">Cited: 3 notes &amp; 1 PDF paper</span>
            </div>
            <ArrowUpRight className="size-4 shrink-0" />
          </div>
        </article>

        {/* Feature 5: Action Boards & Daily Rituals */}
        <article className="feature-card feature-card--plan reveal">
          <div className="feature-card-copy">
            <span className="feature-number">05</span>
            <p className="marketing-eyebrow">Action Boards &amp; Daily Rituals</p>
            <h3>Turn unstructured research into structured progress.</h3>
            <p>
              Extract tasks from notes, define implementation intention triggers (&quot;If [cue], then [action]&quot;), enforce Kanban column WIP limits, and maintain daily reflection journals.
            </p>
          </div>
          <div className="kanban-demo" aria-hidden="true">
            {[
              ["TO DO", "Review PDF citations", "Draft architecture spec"],
              ["IN PROGRESS", "Implement lexical search index"],
              ["DONE", "Zero-Knowledge Vault encryption", "RTL Persian typography"],
            ].map(([title, ...cards]) => (
              <div key={title} className="kanban-column">
                <small>{title}</small>
                {cards.map((card) => (
                  <span key={card}>
                    <CheckCircle2 />
                    {card}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
