import { ArrowDown, BookOpen, NotebookPen, Sparkles, Target } from "lucide-react";

const MOMENTS = [
  {
    time: "07:30",
    icon: NotebookPen,
    label: "Reflect",
    title: "Begin with daily journaling rituals",
    text: "Set morning focus, daily intentions, and structured retrospectives before external demands pull your attention.",
  },
  {
    time: "10:15",
    icon: BookOpen,
    label: "Read & Extract",
    title: "Deep read research documents",
    text: "Import PDFs and notes into a distraction-free reader. Highlight key passages, leave margin notes, and extract findings with source citations.",
  },
  {
    time: "14:00",
    icon: Sparkles,
    label: "Grounded AI",
    title: "Query your digital brain safely",
    text: "Ask AI across your notes and PDF extracts. Every answer comes with openable source citations and full diff preview before applying.",
  },
  {
    time: "17:45",
    icon: Target,
    label: "Plan & Execute",
    title: "Move ideas into Kanban project boards",
    text: "Decompose goals into concrete next actions, set WIP column limits, and close your day calm with zero loose ends.",
  },
];

export function TestimonialsSection() {
  return (
    <section id="workflow" className="workflow-section">
      <div className="workflow-sticky">
        <p className="marketing-eyebrow">A place that follows your thinking</p>
        <h2 className="marketing-section-title">From first thought<br />to finished research.</h2>
        <p className="mt-5 max-w-md text-base leading-7 text-[var(--marketing-muted)]">
          Inkest keeps writing, PDF research, grounded AI, and task execution continuously connected—without turning your cognitive space into a noisy inbox.
        </p>
        <a href="#open-source" className="marketing-text-link">Choose where your data lives <ArrowDown /></a>
      </div>

      <div className="workflow-timeline">
        {MOMENTS.map((moment) => (
          <article key={moment.time} className="workflow-moment reveal">
            <div className="workflow-time">{moment.time}</div>
            <div className="workflow-icon" aria-hidden="true"><moment.icon /></div>
            <div className="workflow-content">
              <p className="marketing-eyebrow">{moment.label}</p>
              <h3>{moment.title}</h3>
              <p>{moment.text}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
