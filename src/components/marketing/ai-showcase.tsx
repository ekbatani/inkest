"use client";

import * as React from "react";
import {
  ArrowUp,
  CalendarDays,
  Check,
  FileText,
  FolderKanban,
  Hash,
  Home,
  Search,
  Sparkles,
} from "lucide-react";
import { LogoMark } from "@/components/brand/logo-mark";

const EXCHANGES = [
  {
    q: "What did I decide about the website refresh?",
    a: "You chose the calmer route: ship the writing flow first, defer the visual system.",
    cites: ["Sunday reflection", "Website refresh"],
    tools: ["search_notes", "read_note"],
  },
  {
    q: "Turn this reflection into next steps",
    a: "Created 4 tasks in “Website refresh”. The review is set for Friday.",
    cites: ["Daily note · Jul 14"],
    tools: ["extract_tasks", "create_task"],
  },
  {
    q: "Polish the opening paragraph",
    a: "Here is a gentler edit — review the diff and apply it if it reads right.",
    cites: ["Designing a life with more room"],
    tools: ["read_note", "gently_edit"],
  },
] as const;

export function AiShowcase() {
  const [active, setActive] = React.useState(0);

  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(
      () => setActive((current) => (current + 1) % EXCHANGES.length),
      5200,
    );
    return () => window.clearInterval(timer);
  }, []);

  const exchange = EXCHANGES[active];

  return (
    <div className="product-window" aria-label="Preview of the Inkest workspace with the AI companion">
      <div className="product-window-bar">
        <div className="flex gap-1.5" aria-hidden="true">
          <span /><span /><span />
        </div>
        <div className="product-command"><Search className="size-3" /> Search or jump to…</div>
        <div className="product-avatar">AE</div>
      </div>

      <div className="product-window-body">
        <aside className="product-sidebar" aria-hidden="true">
          <div className="product-brand">
            <span>
              <LogoMark className="size-full" />
            </span>
            Inkest
          </div>
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
            What would change if I treated <mark>attention</mark> as a place I can design, rather
            than a resource I am always losing?
          </p>
          <blockquote>
            “A good system should hold the details, so the mind can hold the meaning.”
          </blockquote>
          <h3>Small experiments</h3>
          <label><input type="checkbox" defaultChecked tabIndex={-1} /> Protect the first quiet hour</label>
          <label><input type="checkbox" tabIndex={-1} /> Move open loops into the project board</label>
        </article>

        <aside className="product-ai-panel" aria-label="AI companion preview">
          <div className="product-ai-heading">
            <span className="mk-ai-tile"><Sparkles /></span>
            Inkest AI
            <small>PERSONAL VAULT</small>
          </div>

          <div className="product-ai-thread" key={active}>
            <p className="product-ai-q product-ai-step product-ai-step--0">{exchange.q}</p>
            <p className="product-ai-a product-ai-step product-ai-step--1">
              {exchange.a}
              <span className="marketing-caret" aria-hidden="true" />
            </p>
            <div className="product-ai-cites product-ai-step product-ai-step--2">
              {exchange.cites.map((cite, index) => (
                <span
                  className="product-ai-cite"
                  key={cite}
                  style={{ animationDelay: `${1.05 + index * 0.18}s` }}
                >
                  <FileText />
                  {cite}
                </span>
              ))}
            </div>
            <div className="product-ai-tools product-ai-step product-ai-step--3">
              {exchange.tools.map((tool) => (
                <span key={tool}><Check />{tool}</span>
              ))}
            </div>
          </div>

          <div className="product-ai-input">
            <Sparkles className="size-3" aria-hidden="true" />
            Ask your notes…
            <span className="send" aria-hidden="true"><ArrowUp /></span>
          </div>
        </aside>
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
