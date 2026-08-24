"use client";

import * as React from "react";
import {
  ArrowUp,
  Bot,
  Check,
  FileText,
  KeyRound,
  ListChecks,
  MessagesSquare,
  Network,
  PenLine,
  Quote,
  Sparkles,
} from "lucide-react";

const CAPABILITIES = [
  {
    icon: MessagesSquare,
    title: "Chat with your vault",
    text: "Page-aware conversations with @-mention context and full history.",
  },
  {
    icon: Quote,
    title: "Citations on every answer",
    text: "Each claim links back to the note, project, or passage it came from.",
  },
  {
    icon: PenLine,
    title: "Writing tools in the margin",
    text: "Improve, summarize, translate, and gentle edits you review as diffs.",
  },
  {
    icon: ListChecks,
    title: "Thought → action",
    text: "Extract tasks, generate project plans, and move work forward in place.",
  },
  {
    icon: Network,
    title: "Hybrid knowledge layer",
    text: "Full-text, vector, and backlink retrieval fused into one context pack.",
  },
  {
    icon: Bot,
    title: "Agentic, with permission",
    text: "Scoped tools that read, search, and create — only when you allow it.",
  },
] as const;

const PROVIDERS = ["OpenAI", "OpenRouter", "NVIDIA", "Custom endpoint"] as const;

const SCENARIOS = [
  {
    q: "What did I conclude about the website refresh?",
    a: "On July 12 you decided to ship the writing flow first and defer the visual system to next month — here is the passage.",
    cites: ["Sunday reflection", "Website refresh"],
    tools: ["search_notes", "read_note"],
  },
  {
    q: "Tighten the intro of this note.",
    a: "Here’s a lighter edit — same voice, fewer words. Review the diff before applying anything.",
    cites: ["Designing a life with more room"],
    tools: ["read_note", "gently_edit"],
  },
  {
    q: "Turn this week’s reflections into next actions.",
    a: "Created 4 tasks in “Website refresh” and scheduled the review for Friday.",
    cites: ["Daily · Jul 14"],
    tools: ["extract_tasks", "create_task"],
  },
] as const;

export function AiCapabilitiesSection() {
  const [active, setActive] = React.useState(0);

  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(
      () => setActive((current) => (current + 1) % SCENARIOS.length),
      6500,
    );
    return () => window.clearInterval(timer);
  }, []);

  const scenario = SCENARIOS[active];

  return (
    <section id="ai" className="ai-section" aria-labelledby="ai-title">
      <div className="ai-section-grid">
        <div className="reveal">
          <p className="marketing-eyebrow">Inkest intelligence</p>
          <h2 id="ai-title" className="marketing-section-title">
            An assistant that has{" "}
            <span className="mk-grad-text">read everything you wrote.</span>
          </h2>
          <p className="ai-section-body">
            Inkest builds a private knowledge layer over your notes — full-text, vector, and
            graph — so the AI answers with your context, shows its sources, and acts only with
            your permission.
          </p>

          <ul className="ai-capabilities">
            {CAPABILITIES.map((capability) => (
              <li key={capability.title} className="ai-capability">
                <capability.icon aria-hidden="true" />
                <div>
                  <strong>{capability.title}</strong>
                  <span>{capability.text}</span>
                </div>
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

            <div className="ai-demo-body" key={active}>
              <p className="ai-demo-q product-ai-step product-ai-step--0">{scenario.q}</p>
              <div className="product-ai-step product-ai-step--1">
                <p className="ai-demo-a">
                  {scenario.a}
                  <span className="marketing-caret" aria-hidden="true" />
                </p>
              </div>
              <div className="ai-demo-cites product-ai-step product-ai-step--2">
                {scenario.cites.map((cite, index) => (
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
                {scenario.tools.map((tool) => (
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
