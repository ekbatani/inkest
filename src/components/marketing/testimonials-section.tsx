import { ArrowDown, CalendarDays, NotebookPen, Sparkles, Target } from "lucide-react";

const MOMENTS = [
  {
    time: "07:30",
    icon: NotebookPen,
    label: "Reflect",
    title: "Begin with a daily note",
    text: "Capture the morning before the day starts asking things from you.",
  },
  {
    time: "10:15",
    icon: Sparkles,
    label: "Shape",
    title: "Make a rough idea useful",
    text: "Ask AI to clarify the thought, surface questions, or find the next step.",
  },
  {
    time: "14:00",
    icon: Target,
    label: "Move",
    title: "Turn intention into a project",
    text: "Pull tasks from your notes and move them forward without changing tools.",
  },
  {
    time: "17:45",
    icon: CalendarDays,
    label: "Remember",
    title: "Close the loop",
    text: "See the day, its events, and its unfinished threads in one quiet place.",
  },
];

export function TestimonialsSection() {
  return (
    <section id="workflow" className="workflow-section">
      <div className="workflow-sticky">
        <p className="marketing-eyebrow">A place that follows your thinking</p>
        <h2 className="marketing-section-title">From first thought<br />to finished work.</h2>
        <p className="mt-5 max-w-md text-base leading-7 text-[var(--marketing-muted)]">
          Inkest keeps reflection, knowledge, and action connected across your day—without
          turning your mind into another inbox.
        </p>
        <a href="#open-source" className="marketing-text-link">Choose where it lives <ArrowDown /></a>
      </div>

      <div className="workflow-timeline">
        {MOMENTS.map((moment) => (
          <article key={moment.time} className="workflow-moment reveal">
            <div className="workflow-time">{moment.time}</div>
            <div className="workflow-icon"><moment.icon /></div>
            <div>
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
