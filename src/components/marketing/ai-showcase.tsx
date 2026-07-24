"use client";

import * as React from "react";
import {
  BookOpen,
  Bot,
  CalendarDays,
  Check,
  ChevronDown,
  FileText,
  FolderKanban,
  Hash,
  Home,
  Quote,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const AI_ACTIONS = [
  "Ground answer with citations",
  "Extract tasks to project board",
  "Review diff before applying",
];

export function AiShowcase() {
  const [activeAction, setActiveAction] = React.useState(0);

  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(
      () => setActiveAction((current) => (current + 1) % AI_ACTIONS.length),
      2600,
    );
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="product-window" aria-label="Preview of the Inkest cognitive research workspace">
      <div className="product-window-bar">
        <div className="flex gap-1.5" aria-hidden="true">
          <span /><span /><span />
        </div>
        <div className="product-command"><Search className="size-3" /> Search notes, PDFs, or jump to… <kbd className="ml-auto font-mono text-[9px] opacity-60">Cmd+K</kbd></div>
        <div className="product-avatar">AE</div>
      </div>

      <div className="product-window-body">
        <aside className="product-sidebar" aria-hidden="true">
          <div className="product-brand"><span>in</span> Inkest</div>
          <div className="product-nav-item"><Home /> Home</div>
          <div className="product-nav-item product-nav-item--active"><FileText /> Notes</div>
          <div className="product-nav-item"><BookOpen /> Reader</div>
          <div className="product-nav-item"><CalendarDays /> Daily</div>
          <div className="product-nav-item"><FolderKanban /> Projects</div>
          <p className="product-nav-label">Spaces</p>
          <div className="product-nav-item"><Hash /> Personal vault</div>
          <div className="product-nav-item"><Hash /> Research logs</div>
        </aside>

        <article className="product-note">
          <div className="product-note-meta">
            <span>RESEARCH LOGS · GROUNDED AI</span>
            <span className="product-saved"><Check /> Saved locally</span>
          </div>
          <h2>Cognitive Ergonomics &amp; Local Knowledge</h2>
          <p className="product-date">Updated 10 mins ago · Linked to 4 notes &amp; 1 PDF</p>
          <div className="product-rule" />
          
          <div className="mb-3 flex flex-wrap gap-1.5" aria-label="Source citations">
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
              <Quote className="size-2.5" /> Cited: Attention_Paper.pdf (p.14)
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-600 dark:text-violet-400">
              <ShieldCheck className="size-2.5" /> 100% Grounded Context
            </span>
          </div>

          <h3>The core hypothesis</h3>
          <p>
            What happens when knowledge software prioritizes quiet, evidence-backed reflection
            over infinite notifications and cloud lock-in?
          </p>
          <blockquote>
            “A cognitive workspace holds your context in trust, grounding every AI answer in verified source passages.”
          </blockquote>
          
          <h3>Actionable intentions</h3>
          <label><input type="checkbox" defaultChecked tabIndex={-1} /> Import research PDFs into Deep Reader</label>
          <label><input type="checkbox" tabIndex={-1} /> Set implementation cues (&quot;If [cue], then [action]&quot;)</label>

          <div className="product-ai-popover">
            <div className="product-ai-heading">
              <span><Sparkles /> Grounded AI</span>
              <ChevronDown className="size-3.5" />
            </div>
            {AI_ACTIONS.map((action, index) => (
              <div
                key={action}
                className={cn("product-ai-action", activeAction === index && "is-active")}
              >
                {index === 0 ? <Bot /> : index === 1 ? <Check /> : <Sparkles />}
                {action}
                {activeAction === index && <span>↵</span>}
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="product-floating-card product-floating-card--project" aria-hidden="true">
        <span className="product-card-icon"><FolderKanban /></span>
        <div><small>PROJECT BOARD</small><strong>Research MVP R3</strong></div>
        <span className="product-progress">84%</span>
      </div>

      <div className="product-floating-card product-floating-card--daily" aria-hidden="true">
        <span className="product-card-icon"><BookOpen /></span>
        <div><small>DEEP READER</small><strong>12 PDF passages cited</strong></div>
      </div>
    </div>
  );
}
