"use client";

import * as React from "react";
import {
  ArrowRight,
  ArrowUp,
  Bot,
  Check,
  Code2,
  Copy,
  FileText,
  KeyRound,
  Link2,
  Lock,
  MessagesSquare,
  Network,
  Quote,
  Search,
  ShieldCheck,
  Sparkles,
  Terminal,
  Waypoints,
} from "lucide-react";

interface CapabilityItem {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  title: string;
  text: string;
  mode: "assistant" | "harness";
  harnessScenarioIndex?: number;
  demo?: {
    q: string;
    a: string;
    cites: string[];
    tools: string[];
  };
}

const CAPABILITIES: CapabilityItem[] = [
  {
    icon: MessagesSquare,
    title: "Chat with your vault",
    text: "Page-aware conversations with @-mention context and full history.",
    mode: "assistant",
    demo: {
      q: "What did I conclude about the website refresh?",
      a: "On July 12 you decided to ship the writing flow first and defer the visual system to next month — here is the passage.",
      cites: ["Sunday reflection", "Website refresh"],
      tools: ["search_notes", "read_note"],
    },
  },
  {
    icon: Bot,
    title: "Autonomous agent loops",
    text: "Multi-step reasoning engine that searches notes, creates tasks, and plans milestones.",
    mode: "harness",
    harnessScenarioIndex: 0,
  },
  {
    icon: Network,
    title: "Native MCP server",
    text: "First-class Model Context Protocol connecting Claude Desktop, Cursor, and Windsurf.",
    mode: "harness",
    harnessScenarioIndex: 1,
  },
  {
    icon: Quote,
    title: "Citations on every answer",
    text: "Each claim links back to the note, project, or passage it came from.",
    mode: "assistant",
    demo: {
      q: "Where do I stand on deep-work blocks?",
      a: "You keep returning to one rule: protect the first quiet hour, batch reviews after lunch. Two notes and a weekly review say so.",
      cites: ["Designing a life with more room", "Weekly review · Jul 9"],
      tools: ["search_notes", "read_note"],
    },
  },
  {
    icon: Terminal,
    title: "Headless CLI & runners",
    text: "Hermes, OpenClaw, and Custom GPTs integrate via scoped Bearer tokens.",
    mode: "harness",
    harnessScenarioIndex: 2,
  },
  {
    icon: ShieldCheck,
    title: "Granular security sandbox",
    text: "Hard step caps, read-only vs create/update gates, and zero external leakage.",
    mode: "harness",
    harnessScenarioIndex: 0,
  },
];

interface HarnessScenario {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  type: "trace" | "snippet" | "cli";
  title: string;
  protocolBadge: string;
  guardrails: { label: string; value: string; state: "active" | "warn" | "strict" }[];
  goal?: string;
  steps?: {
    num: string;
    status: string;
    thought: string;
    tool: string;
    args: string;
    result: string;
  }[];
  summary?: string;
  codeTitle?: string;
  codeSnippet?: string;
  tools?: string[];
  cliLogs?: string[];
}

const HARNESS_SCENARIOS: HarnessScenario[] = [
  {
    id: "loop",
    label: "Autonomous Task Loop",
    icon: Bot,
    type: "trace",
    title: "Multi-Step Project Deconstruction",
    protocolBadge: "Agent Loop · /api/agent/v1/execute",
    guardrails: [
      { label: "Step Limit", value: "6 steps max", state: "active" },
      { label: "Notes", value: "Read & Modify", state: "active" },
      { label: "Tasks", value: "Create allowed", state: "active" },
      { label: "Deletions", value: "Strictly denied", state: "strict" },
    ],
    goal: "Analyze #roadmap notes, extract dependencies, and generate structured milestone tasks.",
    steps: [
      {
        num: "Step 1 of 6 · Thinking",
        status: "Completed",
        thought: "Searching vault for notes tagged #roadmap and active Q3 milestones...",
        tool: "search_notes",
        args: '{"query": "roadmap milestones", "limit": 4}',
        result: "✓ Found 4 notes (Q3 Plan, Technical Specs, Launch Brief)",
      },
      {
        num: "Step 2 of 6 · Executing",
        status: "Completed",
        thought: "Reading quarterly objectives and cross-referencing task backlog dependencies...",
        tool: "read_note",
        args: '{"noteId": "note_q3_plan"}',
        result: "✓ Parsed 6 deliverables & 2 blocker items",
      },
      {
        num: "Step 3 of 6 · Complete",
        status: "Done",
        thought: "Creating structured tasks with priority tags in project 'Website refresh'...",
        tool: "create_task",
        args: '{"title": "Implement MCP SSE transport", "priority": "high"}',
        result: "✓ Task #104 scheduled in 'Website refresh'",
      },
    ],
    summary: "Loop completed in 3 iterations (Cap: 6) · 3 tasks scheduled · 0 deletions · Sandbox intact",
  },
  {
    id: "mcp",
    label: "Claude & Cursor (MCP)",
    icon: Network,
    type: "snippet",
    title: "Model Context Protocol Server Bridge",
    protocolBadge: "MCP Standard · JSON-RPC 2.0",
    guardrails: [
      { label: "Transport", value: "Native HTTP / SSE", state: "active" },
      { label: "Auth", value: "Bearer ink_agent_live", state: "active" },
      { label: "Scope", value: "Workspace-isolated", state: "active" },
    ],
    codeTitle: "claude_desktop_config.json",
    codeSnippet: `{
  "mcpServers": {
    "inkest": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-fetch"],
      "env": {
        "INKEST_ENDPOINT": "http://localhost:3000/api/agent/v1/mcp",
        "INKEST_AGENT_TOKEN": "ink_agent_live_9f82c47a11"
      }
    }
  }
}`,
    tools: [
      "read_note",
      "search_notes",
      "list_notes",
      "create_note",
      "update_note",
      "create_task",
      "list_tasks",
      "get_planner_data",
    ],
  },
  {
    id: "cli",
    label: "Hermes & Headless CLI",
    icon: Terminal,
    type: "cli",
    title: "Hermes & OpenClaw CLI Runners",
    protocolBadge: "Headless Harness · ink_agent_cli",
    guardrails: [
      { label: "Runner", value: "Hermes CLI v0.4", state: "active" },
      { label: "Endpoint", value: "/api/mcp", state: "active" },
      { label: "Loop Bound", value: "6 iterations", state: "active" },
    ],
    codeTitle: "Terminal Execution",
    codeSnippet: `# 1. Register Inkest MCP server with Hermes agent harness
hermes mcp add inkest http://localhost:3000/api/mcp --token ink_agent_live_9f82c4...

# 2. Run autonomous background reasoning
hermes run --goal "Audit unlinked daily notes and connect to projects"`,
    cliLogs: [
      "[hermes] Connected to Inkest MCP endpoint (latency: 14ms)",
      "[hermes] Scoped permissions verified: 8 tools loaded · Max 6 steps",
      "[hermes] Step 1: list_notes(type=\"daily\") -> 5 unlinked entries",
      "[hermes] Step 2: append_backlinks -> 3 project relationships established",
      "[hermes] Complete: Workspace organized within 3 iterations.",
    ],
  },
];

const HARNESS_CONNECTORS = [
  "Model Context Protocol (MCP)",
  "Claude Desktop",
  "Cursor & Windsurf",
  "Hermes Agent Harness",
  "OpenClaw / OpenHands",
  "ChatGPT Custom Actions",
] as const;

const MODEL_PROVIDERS = [
  "OpenAI",
  "Anthropic",
  "OpenRouter",
  "Ollama · local",
  "NVIDIA",
  "Custom endpoint",
] as const;

export function AiCapabilitiesSection() {
  const [demoMode, setDemoMode] = React.useState<"assistant" | "harness">("assistant");
  const [activeCapIndex, setActiveCapIndex] = React.useState(0);
  const [activeScenarioIndex, setActiveScenarioIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  // Auto-cycle through capabilities when not paused
  React.useEffect(() => {
    if (paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setTimeout(() => {
      setActiveCapIndex((current) => {
        const next = (current + 1) % CAPABILITIES.length;
        const nextCap = CAPABILITIES[next];
        setDemoMode(nextCap.mode);
        if (nextCap.mode === "harness" && nextCap.harnessScenarioIndex !== undefined) {
          setActiveScenarioIndex(nextCap.harnessScenarioIndex);
        }
        return next;
      });
    }, 7000);
    return () => window.clearTimeout(timer);
  }, [activeCapIndex, paused]);

  const pause = () => setPaused(true);
  const resume = (
    event: React.FocusEvent<HTMLDivElement> | React.PointerEvent<HTMLDivElement>,
  ) => {
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) return;
    setPaused(false);
  };

  const handleSelectCapability = (index: number) => {
    setActiveCapIndex(index);
    const selected = CAPABILITIES[index];
    setDemoMode(selected.mode);
    if (selected.mode === "harness" && selected.harnessScenarioIndex !== undefined) {
      setActiveScenarioIndex(selected.harnessScenarioIndex);
    }
  };

  const handleSelectMode = (mode: "assistant" | "harness") => {
    setDemoMode(mode);
    // Align active capability with the selected mode
    const matchingIndex = CAPABILITIES.findIndex((c) => c.mode === mode);
    if (matchingIndex !== -1) {
      setActiveCapIndex(matchingIndex);
      const cap = CAPABILITIES[matchingIndex];
      if (cap.harnessScenarioIndex !== undefined) {
        setActiveScenarioIndex(cap.harnessScenarioIndex);
      }
    }
  };

  const handleCopy = async (text: string, key: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setCopiedKey(key);
        window.setTimeout(() => setCopiedKey(null), 2200);
      }
    } catch {
      // Graceful fallback
    }
  };

  const activeCapability = CAPABILITIES[activeCapIndex];
  const activeScenario = HARNESS_SCENARIOS[activeScenarioIndex];
  const assistantDemo = activeCapability.demo ?? CAPABILITIES[0].demo!;

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
            An assistant and agent harness{" "}
            <span className="mk-grad-text">that knows your vault.</span>
          </h2>
          <p className="ai-section-body">
            Inkest marries a private knowledge engine with an autonomous agent harness.
            Query your notes with hybrid citations, let multi-step reasoning loops execute
            complex projects within strict step caps, or connect external harnesses like Claude
            Desktop, Cursor, and Hermes over native Model Context Protocol (MCP).
          </p>

          <ul className="ai-capabilities" role="list">
            {CAPABILITIES.map((item, index) => (
              <li key={item.title}>
                <button
                  type="button"
                  className="ai-capability"
                  aria-pressed={index === activeCapIndex}
                  aria-controls="ai-demo-window"
                  onClick={() => handleSelectCapability(index)}
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
            <p>Harness Ecosystem</p>
            {HARNESS_CONNECTORS.map((connector) => (
              <span key={connector} className="ai-provider-chip">
                {connector}
              </span>
            ))}
          </div>

          <div className="ai-providers mt-2">
            <p>BYOK Providers</p>
            {MODEL_PROVIDERS.map((provider) => (
              <span key={provider} className="ai-provider-chip">
                {provider}
              </span>
            ))}
            <span className="ai-provider-chip ai-provider-chip--key">
              <KeyRound className="inline size-3 align-[-2px]" aria-hidden="true" />
              {" "}AES-256 encrypted on your server
            </span>
          </div>
        </div>

        <div className="ai-demo reveal">
          <div
            id="ai-demo-window"
            className="ai-demo-window"
            aria-label="Interactive preview of Inkest AI assistant and autonomous agent harness"
          >
            {/* Top Mode Switcher Tabs */}
            <div className="ai-demo-tabs" role="tablist" aria-label="Intelligence modes">
              <button
                type="button"
                role="tab"
                aria-selected={demoMode === "assistant"}
                className="ai-demo-tab"
                onClick={() => handleSelectMode("assistant")}
              >
                <Sparkles aria-hidden="true" />
                <span>Vault Assistant</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={demoMode === "harness"}
                className="ai-demo-tab"
                onClick={() => handleSelectMode("harness")}
              >
                <Bot aria-hidden="true" />
                <span>Agent Harness & MCP</span>
              </button>

              <div className="ml-auto flex items-center gap-1.5 font-mono text-[10px] text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_currentColor]" />
                <span>{demoMode === "assistant" ? "Personal Vault" : "Sandbox Active"}</span>
              </div>
            </div>

            {/* Mode A: Vault Assistant View */}
            {demoMode === "assistant" && (
              <div key="assistant-panel" className="ai-demo-assistant-panel">
                <div className="ai-demo-pipeline" aria-hidden="true">
                  <span className="ai-demo-pipeline-label">Context pack</span>
                  <span className="ai-demo-pipeline-chip">
                    <Search />Full-text
                  </span>
                  <span className="ai-demo-pipeline-chip">
                    <Waypoints />Vector
                  </span>
                  <span className="ai-demo-pipeline-chip">
                    <Link2 />Backlinks
                  </span>
                  <span className="ai-demo-pipeline-arrow">
                    <ArrowRight />
                  </span>
                  <span className="ai-demo-pipeline-chip ai-demo-pipeline-chip--out">
                    <Quote />Cited answer
                  </span>
                </div>

                <div className="ai-demo-body" id="ai-demo-body" key={activeCapIndex}>
                  <p className="ai-demo-q product-ai-step product-ai-step--0">{assistantDemo.q}</p>
                  <div className="product-ai-step product-ai-step--1">
                    <p className="ai-demo-a">
                      {assistantDemo.a}
                      <span className="marketing-caret" aria-hidden="true" />
                    </p>
                  </div>
                  <div className="ai-demo-cites product-ai-step product-ai-step--2">
                    {assistantDemo.cites.map((cite, index) => (
                      <span
                        className="ai-demo-cite"
                        key={cite}
                        style={{ animationDelay: `${0.85 + index * 0.15}s` }}
                      >
                        <FileText />
                        {cite}
                      </span>
                    ))}
                  </div>
                  <div className="ai-demo-tools product-ai-step product-ai-step--3">
                    <span className="ai-demo-tools-label" aria-hidden="true">
                      {activeCapability.title}
                    </span>
                    {assistantDemo.tools.map((tool) => (
                      <span key={tool}>
                        <Check />
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="ai-demo-input">
                  <Sparkles aria-hidden="true" />
                  Ask your notes anything…
                  <span className="send" aria-hidden="true">
                    <ArrowUp />
                  </span>
                </div>
              </div>
            )}

            {/* Mode B: Autonomous Agent Harness & MCP View */}
            {demoMode === "harness" && (
              <div key="harness-panel" className="ai-demo-harness-panel">
                {/* Guardrails Bar */}
                <div className="ai-harness-guardrails" aria-label="Harness safety guardrails">
                  <span className="ai-harness-guardrail-label">Guardrails:</span>
                  {activeScenario.guardrails.map((g) => (
                    <span
                      key={g.label}
                      className={`ai-harness-guardrail-pill ${
                        g.state === "active"
                          ? "ai-harness-guardrail-pill--active"
                          : g.state === "strict"
                            ? "ai-harness-guardrail-pill--strict"
                            : "ai-harness-guardrail-pill--warn"
                      }`}
                    >
                      <Lock className="size-2.5" aria-hidden="true" />
                      {g.label}: <strong>{g.value}</strong>
                    </span>
                  ))}
                </div>

                {/* Scenario Selector Chips */}
                <div className="ai-harness-scenarios" role="tablist" aria-label="Harness scenarios">
                  {HARNESS_SCENARIOS.map((sc, idx) => (
                    <button
                      key={sc.id}
                      type="button"
                      role="tab"
                      aria-selected={idx === activeScenarioIndex}
                      className="ai-harness-scenario-chip"
                      onClick={() => setActiveScenarioIndex(idx)}
                    >
                      <sc.icon className="size-3" aria-hidden="true" />
                      <span>{sc.label}</span>
                    </button>
                  ))}
                </div>

                {/* Scenario Details & Trace / Snippets */}
                <div className="ai-harness-body" key={activeScenario.id}>
                  {activeScenario.type === "trace" && (
                    <>
                      {activeScenario.goal && (
                        <div className="ai-harness-goal">
                          <Bot className="ai-harness-goal-icon size-4" aria-hidden="true" />
                          <div>
                            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground block mb-0.5">
                              Objective Goal
                            </span>
                            <span>{activeScenario.goal}</span>
                          </div>
                        </div>
                      )}

                      <div className="ai-harness-trace">
                        {activeScenario.steps?.map((step) => (
                          <div key={step.num} className="ai-harness-step">
                            <div className="ai-harness-step-header">
                              <span className="ai-harness-step-num">{step.num}</span>
                              <span className="ai-harness-step-status">
                                <Check className="size-3 text-emerald-400" />
                                {step.status}
                              </span>
                            </div>
                            <p className="ai-harness-thought">{step.thought}</p>
                            <div className="ai-harness-tool-call">
                              <span className="ai-harness-tool-name">{step.tool}</span>
                              <span className="ai-harness-tool-args">{step.args}</span>
                              <span className="ai-harness-tool-result">{step.result}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {activeScenario.summary && (
                        <div className="ai-harness-summary">
                          <span>{activeScenario.summary}</span>
                          <span className="ai-harness-summary-badge">Verified</span>
                        </div>
                      )}
                    </>
                  )}

                  {activeScenario.type === "snippet" && (
                    <>
                      <div className="ai-harness-snippet-box">
                        <div className="ai-harness-snippet-header">
                          <span className="flex items-center gap-1.5">
                            <Code2 className="size-3.5 text-primary" />
                            {activeScenario.codeTitle}
                          </span>
                          <button
                            type="button"
                            className="ai-harness-snippet-copy"
                            onClick={() =>
                              handleCopy(activeScenario.codeSnippet || "", "mcp-config")
                            }
                          >
                            {copiedKey === "mcp-config" ? (
                              <>
                                <Check className="size-3 text-emerald-400" />
                                Copied Config
                              </>
                            ) : (
                              <>
                                <Copy className="size-3" />
                                Copy Config
                              </>
                            )}
                          </button>
                        </div>
                        <pre className="ai-harness-snippet-code">
                          {activeScenario.codeSnippet}
                        </pre>
                      </div>

                      <div className="mt-1">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
                          Exposed MCP Tools
                        </span>
                        <div className="ai-harness-tools-list">
                          {activeScenario.tools?.map((tool) => (
                            <span key={tool} className="ai-harness-tool-tag">
                              <Check className="size-2.5" />
                              {tool}
                            </span>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {activeScenario.type === "cli" && (
                    <>
                      <div className="ai-harness-snippet-box">
                        <div className="ai-harness-snippet-header">
                          <span className="flex items-center gap-1.5">
                            <Terminal className="size-3.5 text-primary" />
                            {activeScenario.codeTitle}
                          </span>
                          <button
                            type="button"
                            className="ai-harness-snippet-copy"
                            onClick={() =>
                              handleCopy(activeScenario.codeSnippet || "", "cli-cmd")
                            }
                          >
                            {copiedKey === "cli-cmd" ? (
                              <>
                                <Check className="size-3 text-emerald-400" />
                                Copied Command
                              </>
                            ) : (
                              <>
                                <Copy className="size-3" />
                                Copy Command
                              </>
                            )}
                          </button>
                        </div>
                        <pre className="ai-harness-snippet-code">
                          {activeScenario.codeSnippet}
                        </pre>
                      </div>

                      <div className="rounded-lg border border-border/60 bg-background/90 p-3 font-mono text-[10px] leading-relaxed text-muted-foreground">
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground/80 block mb-1.5 font-bold">
                          Execution Stream Log
                        </span>
                        <div className="space-y-1">
                          {activeScenario.cliLogs?.map((log) => (
                            <div key={log} className="text-emerald-400/90 truncate">
                              {log}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

