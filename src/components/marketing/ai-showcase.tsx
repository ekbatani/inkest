"use client";

import * as React from "react";
import {
  Bot,
  CalendarDays,
  Check,
  ChevronDown,
  FileText,
  FolderKanban,
  Hash,
  Home,
  Search,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const AI_ACTIONS = ["Shape the idea", "Extract next steps", "Polish the writing"];

export function AiShowcase() {
  const [activeAction, setActiveAction] = React.useState(0);

  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(
      () => setActiveAction((current) => (current + 1) % AI_ACTIONS.length),
      2400,
    );
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="product-window" aria-label="Preview of the Inkest writing workspace">
      <div className="product-window-bar">
        <div className="flex gap-1.5" aria-hidden="true">
          <span /><span /><span />
        </div>
        <div className="product-command"><Search className="size-3" /> Search or jump to…</div>
        <div className="product-avatar">AE</div>
      </div>

      <div className="product-window-body">
        <aside className="product-sidebar" aria-hidden="true">
          <div className="product-brand"><span>in</span> Inkest</div>
          <div className="product-nav-item"><Home /> Home</div>
          <div className="product-nav-item product-nav-item--active"><FileText /> Notes</div>
          <div className="product-nav-item"><CalendarDays /> Daily</div>
          <div className="product-nav-item"><FolderKanban /> Projects</div>
          <p className="product-nav-label">Spaces</p>
          <div className="product-nav-item"><Hash /> Personal vault</div>
          <div className="product-nav-item"><Hash /> Product ideas</div>
        </aside>

        <article className="product-note">
          <div className="product-note-meta">
            <span>PERSONAL VAULT</span>
            <span className="product-saved"><Check /> Saved</span>
          </div>
          <h2>Designing a life with more room</h2>
          <p className="product-date">Sunday, July 12 · Daily reflection</p>
          <div className="product-rule" />
          <h3>The question I keep returning to</h3>
          <p>
            What would change if I treated attention as a place I can design, rather
            than a resource I am always losing?
          </p>
          <blockquote>
            “A good system should hold the details, so the mind can hold the meaning.”
          </blockquote>
          <h3>Small experiments</h3>
          <label><input type="checkbox" defaultChecked tabIndex={-1} /> Protect the first quiet hour</label>
          <label><input type="checkbox" tabIndex={-1} /> Move open loops into the project board</label>

          <div className="product-ai-popover">
            <div className="product-ai-heading">
              <span><Sparkles /> Inkest AI</span>
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
        <div><small>PROJECT</small><strong>Website refresh</strong></div>
        <span className="product-progress">68%</span>
      </div>

      <div className="product-floating-card product-floating-card--daily" aria-hidden="true">
        <span className="product-card-icon"><CalendarDays /></span>
        <div><small>TODAY</small><strong>4 thoughts captured</strong></div>
      </div>
    </div>
  );
}
