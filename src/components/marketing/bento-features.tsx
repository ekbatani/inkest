import type { LucideIcon } from "lucide-react";
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
  FileText,
  FolderKanban,
  Hash,
  Languages,
  Link2,
  ListChecks,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { LogoMark } from "@/components/brand/logo-mark";

/* Knowledge graph for "Connect your digital brain". Nodes and links share one
   0–100 coordinate space: nodes are positioned in %, and the link layer is an
   SVG with viewBox 0 0 100 100 + preserveAspectRatio="none", so every line
   meets its node at any card width. */
type GraphNode = { id: string; x: number; y: number; icon: LucideIcon; label: string; kind: string };

const HUB = { x: 50, y: 50 };

const GRAPH_NODES: GraphNode[] = [
  { id: "note", x: 22, y: 20, icon: FileText, label: "Sunday reflection", kind: "note" },
  { id: "tag", x: 80, y: 18, icon: Hash, label: "design", kind: "tag" },
  { id: "project", x: 79, y: 82, icon: FolderKanban, label: "Website refresh", kind: "project" },
  { id: "daily", x: 21, y: 80, icon: CalendarDays, label: "Jul 14", kind: "daily" },
];

// Faint outer thoughts that hang off the main nodes, giving the graph depth.
const SATELLITES = [
  { x: 4, y: 48, from: "note" },
  { x: 47, y: 4, from: "tag" },
  { x: 97, y: 50, from: "project" },
  { x: 52, y: 97, from: "daily" },
] as const;

function curve(a: { x: number; y: number }, b: { x: number; y: number }, bend = 0.18) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  // Offset the control point perpendicular to the segment for a gentle arc.
  const cx = mx - (b.y - a.y) * bend;
  const cy = my + (b.x - a.x) * bend;
  return `M${a.x} ${a.y}Q${cx} ${cy} ${b.x} ${b.y}`;
}

function nodeById(id: string) {
  return GRAPH_NODES.find((node) => node.id === id) ?? GRAPH_NODES[0];
}

function BrainGraph() {
  return (
    <div className="brain-graph" aria-hidden="true">
      <svg className="brain-graph-links" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="brain-link-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--mk-indigo-bright)" />
            <stop offset="1" stopColor="var(--mk-violet-bright)" />
          </linearGradient>
        </defs>
        {SATELLITES.map((sat) => (
          <path key={`${sat.x}-${sat.y}`} className="brain-link brain-link--faint" d={curve(nodeById(sat.from), sat, 0.12)} />
        ))}
        {/* Backlink between a daily note and the reflection it references. */}
        <path className="brain-link brain-link--backlink" d={curve(nodeById("daily"), nodeById("note"), -0.28)} />
        {GRAPH_NODES.map((node, index) => (
          <g key={node.id}>
            <path className="brain-link" d={curve(HUB, node)} />
            <path
              className="brain-link brain-link--flow"
              d={curve(HUB, node)}
              style={{ animationDelay: `${index * -0.9}s` }}
            />
          </g>
        ))}
      </svg>

      {SATELLITES.map((sat) => (
        <span
          key={`dot-${sat.x}-${sat.y}`}
          className="brain-dot"
          style={{ left: `${sat.x}%`, top: `${sat.y}%` }}
        />
      ))}

      <span className="brain-hub" style={{ left: `${HUB.x}%`, top: `${HUB.y}%` }}>
        <LogoMark variant="monochrome" />
      </span>

      {GRAPH_NODES.map(({ id, x, y, icon: Icon, label, kind }) => (
        <span
          key={id}
          className={`brain-chip brain-chip--${kind}`}
          style={{ left: `${x}%`, top: `${y}%` }}
        >
          <Icon />
          {kind === "note" ? <>[[{label}]]</> : label}
        </span>
      ))}
    </div>
  );
}

const AI_ACTIONS = [
  { icon: WandSparkles, label: "Improve" },
  { icon: ListChecks, label: "Extract tasks" },
  { icon: Languages, label: "Translate" },
] as const;

const KANBAN = [
  { title: "To do", tone: "todo", icon: Circle, cards: ["Write the brief", "Shape the visual system"] },
  { title: "In progress", tone: "doing", icon: Clock3, cards: ["Prototype the new flow"] },
  { title: "Done", tone: "done", icon: CheckCircle2, cards: ["Collect research", "Define the goal"] },
] as const;

export function BentoFeatures() {
  return (
    <section id="product" className="marketing-section" aria-label="Features">
      <div className="marketing-feature-grid">
        <article className="feature-card feature-card--write reveal">
          <div className="feature-card-copy">
            <span className="feature-number">01</span>
            <p className="marketing-eyebrow">Write without friction</p>
            <h3>Markdown that feels like a blank page—not a syntax lesson.</h3>
            <p>Rich formatting, wiki links, diagrams, attachments, RTL writing, and full export freedom.</p>
          </div>
          <div className="writing-demo" aria-hidden="true">
            <div className="writing-demo-toolbar">
              <b>B</b><i>I</i><span>H1</span><Link2 />
              <span className="writing-demo-ai"><Sparkles /> Ask AI</span>
            </div>
            <div className="writing-demo-page">
              <small>IDEA · 12 JULY</small>
              <strong>A slower kind of ambition</strong>
              <p>
                Less output, more <span className="writing-demo-link">[[deep work]]</span> — and a
                weekly review on <span className="writing-demo-tag">#friday</span>.
              </p>
              <span className="writing-line writing-line--long" />
              <mark>Make enough room for the work to surprise you.<span className="writing-caret" /></mark>
            </div>
          </div>
        </article>

        <article className="feature-card feature-card--brain reveal">
          <span className="feature-number">02</span>
          <p className="marketing-eyebrow">Connect your digital brain</p>
          <h3>Ideas become more useful when they find each other.</h3>
          <p>Link notes, build nested spaces, add tags, and find any thought in seconds.</p>
          <BrainGraph />
        </article>

        <article className="feature-card feature-card--ai reveal">
          <span className="feature-number">03</span>
          <p className="marketing-eyebrow">AI in the margins</p>
          <h3>Help that appears in context—and leaves when it&apos;s done.</h3>
          <p>Improve a paragraph, summarize a note, translate a passage, or turn a brainstorm into tasks.</p>
          <div className="ai-margin-demo" aria-hidden="true">
            <p className="ai-margin-selection">
              <span>Ship the writing flow first,</span> then revisit the visual system once the
              core feels calm.
            </p>
            <div className="ai-margin-actions">
              {AI_ACTIONS.map(({ icon: Icon, label }, index) => (
                <span key={label} className={index === 1 ? "is-active" : undefined}>
                  <Icon />
                  {label}
                </span>
              ))}
            </div>
            <div className="ai-prompt-demo">
              <span className="ai-orbit"><Sparkles /></span>
              <div><small>INKEST AI</small><strong>Turn this into a clear project plan</strong></div>
              <ArrowUpRight />
            </div>
          </div>
        </article>

        <article className="feature-card feature-card--plan reveal">
          <div className="feature-card-copy">
            <span className="feature-number">04</span>
            <p className="marketing-eyebrow">Turn thought into progress</p>
            <h3>Your notes and projects finally speak the same language.</h3>
            <p>Shape an idea, extract the work, and track it across a focused project board.</p>
          </div>
          <div className="kanban-demo" aria-hidden="true">
            {KANBAN.map(({ title, tone, icon: Icon, cards }) => (
              <div key={title} className={`kanban-column kanban-column--${tone}`}>
                <small>
                  {title}
                  <em>{cards.length}</em>
                </small>
                {cards.map((card) => <span key={card}><Icon />{card}</span>)}
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
