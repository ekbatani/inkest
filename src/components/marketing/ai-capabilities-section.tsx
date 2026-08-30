"use client";

import * as React from "react";
import {
  ArrowRight,
  ArrowUp,
  Bot,
  Check,
  FileText,
  KeyRound,
  Link2,
  ListChecks,
  MessagesSquare,
  Network,
  PenLine,
  Quote,
  Search,
  Sparkles,
  Waypoints,
} from "lucide-react";

const CAPABILITIES = [
  {
    icon: MessagesSquare,
    title: "Chat with your vault",
    text: "Page-aware conversations with @-mention context and full history.",
    demo: {
      q: "What did I conclude about the website refresh?",
      a: "On July 12 you decided to ship the writing flow first and defer the visual system to next month — here is the passage.",
      cites: ["Sunday reflection", "Website refresh"],
      tools: ["search_notes", "read_note"],
    },
  },
  {
    icon: Quote,
    title: "Citations on every answer",
    text: "Each claim links back to the note, project, or passage it came from.",
    demo: {
      q: "Where do I stand on deep-work blocks?",
      a: "You keep returning to one rule: protect the first quiet hour, batch reviews after lunch. Two notes and a weekly review say so.",
      cites: ["Designing a life with more room", "Weekly review · Jul 9"],
      tools: ["search_notes", "read_note"],
    },
  },
  {
    icon: PenLine,
    title: "Writing tools in the margin",
    text: "Improve, summarize, translate — every edit arrives as a diff you approve.",
    demo: {
      q: "Tighten the intro of this note.",
      a: "Here’s a lighter edit — same voice, fewer words. Review the diff before applying anything.",
      cites: ["Designing a life with more room"],
      tools: ["read_note", "gently_edit"],
    },
  },
  {
    icon: ListChecks,
    title: "Thought → action",
    text: "Extract tasks, generate project plans, and move work forward in place.",
    demo: {
      q: "Turn this week’s reflections into next actions.",
      a: "Created 4 tasks in “Website refresh” and scheduled the review for Friday.",
      cites: ["Daily · Jul 14"],
      tools: ["extract_tasks", "create_task"],
    },
  },
  {
    icon: Network,
    title: "Hybrid knowledge layer",
    text: "Full-text, vector, and backlink retrieval fused into one context pack.",
    demo: {
      q: "How do my notes on attention connect?",
      a: "Six notes orbit “attention as a place I can design” — the earliest is your May journal, linked from three projects.",
      cites: ["May journal", "Sunday reflection", "Deep-work blocks"],
      tools: ["search_fts", "search_vector", "backlinks"],
    },
  },
  {
    icon: Bot,
    title: "Agentic, with permission",
    text: "Scoped tools that read, search, and create — only where you allow it.",
    demo: {
      q: "Draft a launch plan from my rough notes.",
      a: "Outlined 3 milestones in “Website refresh”. With your current grants I can create — never delete.",
      cites: ["Website refresh"],
      tools: ["create_project_plan"],
    },
  },
] as const;

const PROVIDERS = ["OpenAI", "OpenRouter", "Ollama · local", "NVIDIA", "Custom endpoint"] as const;

export function AiCapabilitiesSection() {
  const [active, setActive] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    if (paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setTimeout(
      () => setActive((current) => (current + 1) % CAPABILITIES.length),
      6500,
    );
    return () => window.clearTimeout(timer);
  }, [active, paused]);

  const pause = () => setPaused(true);
  const resume = (
    event: React.FocusEvent<HTMLDivElement> | React.PointerEvent<HTMLDivElement>,
  ) => {
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) return;
    setPaused(false);
  };

  const capability = CAPABILITIES[active];
  const demo = capability.demo;

  return (
    <section id="ai" className="ai-section" aria-labelledby="ai-title">
      <div
        className="ai-section-grid"
        onPointerEnter={pause}
        onPointerLeave={resume}
        onFocus={pause}
        onBlur={resume}
      >
        <div className="reveal">
          <p className="marketing-eyebrow">Inkest intelligence</p>
          <h2 id="ai-title" className="marketing-section-title">
            An assistant that has{" "}
            <span className="mk-grad-text">read everything you wrote.</span>
          </h2>
          <p className="ai-section-body">
            AI is built into every surface — the editor margin, search, chat, and projects — on a
            private knowledge layer that fuses full-text, vector, and backlink retrieval. Answers
            arrive with your context, cite their sources, and act only with your permission.
          </p>

          <ul className="ai-capabilities">
            {CAPABILITIES.map((item, index) => (
              <li key={item.title}>
                <button
                  type="button"
                  className="ai-capability"
                  aria-pressed={index === active}
                  aria-controls="ai-demo-body"
                  onClick={() => setActive(index)}
                >
                  <item.icon aria-hidden="true" />
                  <span className="ai-capability-text">
                    <strong>{item.title}</strong>
                    <span>{item.text}</span>
                  </span>
                  <span className="ai-capability-index" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <div className="ai-providers">
            <p>Bring your own key</p>
            {PROVIDERS.map((provider) => (
              <span key={provider} className="ai-provider-chip">{provider}</span>
            ))}
            <span className="ai-provider-chip ai-provider-chip--key">
              <KeyRound className="inline size-3 align-[-2px]" aria-hidden="true" />
              {" "}Keys stay encrypted on your server
            </span>
          </div>
        </div>

        <div className="ai-demo reveal">
          <div className="ai-demo-window" aria-label="Preview of a cited AI conversation in Inkest">
            <div className="ai-demo-header">
              <span className="mk-ai-tile"><Sparkles /></span>
              <strong>Inkest AI</strong>
              <small>Personal vault</small>
            </div>

            <div className="ai-demo-pipeline" aria-hidden="true">
              <span className="ai-demo-pipeline-label">Context pack</span>
              <span className="ai-demo-pipeline-chip"><Search />Full-text</span>
              <span className="ai-demo-pipeline-chip"><Waypoints />Vector</span>
              <span className="ai-demo-pipeline-chip"><Link2 />Backlinks</span>
              <span className="ai-demo-pipeline-arrow"><ArrowRight /></span>
              <span className="ai-demo-pipeline-chip ai-demo-pipeline-chip--out"><Quote />Cited answer</span>
            </div>

            <div className="ai-demo-body" id="ai-demo-body" key={active}>
              <p className="ai-demo-q product-ai-step product-ai-step--0">{demo.q}</p>
              <div className="product-ai-step product-ai-step--1">
                <p className="ai-demo-a">
                  {demo.a}
                  <span className="marketing-caret" aria-hidden="true" />
                </p>
              </div>
              <div className="ai-demo-cites product-ai-step product-ai-step--2">
                {demo.cites.map((cite, index) => (
                  <span
                    className="ai-demo-cite"
                    key={cite}
                    style={{ animationDelay: `${1.05 + index * 0.18}s` }}
                  >
                    <FileText />
                    {cite}
                  </span>
                ))}
              </div>
              <div className="ai-demo-tools product-ai-step product-ai-step--3">
                <span className="ai-demo-tools-label" aria-hidden="true">{capability.title}</span>
                {demo.tools.map((tool) => (
                  <span key={tool}><Check />{tool}</span>
                ))}
              </div>
            </div>

            <div className="ai-demo-input">
              <Sparkles aria-hidden="true" />
              Ask your notes anything…
              <span className="send" aria-hidden="true"><ArrowUp /></span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
