"use client";

import * as React from "react";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Phase = "typing" | "improving" | "improved" | "extracting" | "tasks";

const RAW_NOTE =
  "todo: write friday release notes. dont forget the import bug and mention calendar sync";

const IMPROVED_LINES = [
  { type: "h2" as const, text: "Release notes — Friday" },
  { type: "text" as const, text: "Don't forget to mention:" },
  { type: "li" as const, text: "Import-flow bug fix" },
  { type: "li" as const, text: "Calendar sync improvements" },
];

const TASKS = [
  { text: "Write Friday release notes", priority: "High" },
  { text: "Fix import-flow bug", priority: "High" },
  { text: "Mention calendar sync improvements", priority: "Medium" },
];

const PHASE_DURATION: Record<Exclude<Phase, "typing">, number> = {
  improving: 1100,
  improved: 1800,
  extracting: 1100,
  tasks: 2800,
};

const TYPE_INTERVAL_MS = 26;
const TYPE_PAUSE_MS = 650;
const TASK_STAGGER_MS = 380;

export function AiShowcase() {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [visible, setVisible] = React.useState(false);
  const [reducedMotion, setReducedMotion] = React.useState(false);
  const [phase, setPhase] = React.useState<Phase>("typing");
  const [typedLength, setTypedLength] = React.useState(0);
  const [tasksShown, setTasksShown] = React.useState(0);

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  React.useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.35 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Typewriter reveal of the raw note.
  React.useEffect(() => {
    if (reducedMotion || !visible || phase !== "typing") return;
    if (typedLength >= RAW_NOTE.length) {
      const t = setTimeout(() => setPhase("improving"), TYPE_PAUSE_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setTypedLength((n) => n + 1), TYPE_INTERVAL_MS);
    return () => clearTimeout(t);
  }, [reducedMotion, visible, phase, typedLength]);

  // Advance through the AI-action phases, looping back to typing.
  React.useEffect(() => {
    if (reducedMotion || !visible || phase === "typing") return;
    const duration = PHASE_DURATION[phase];
    const t = setTimeout(() => {
      if (phase === "improving") setPhase("improved");
      else if (phase === "improved") setPhase("extracting");
      else if (phase === "extracting") setPhase("tasks");
      else {
        setTasksShown(0);
        setTypedLength(0);
        setPhase("typing");
      }
    }, duration);
    return () => clearTimeout(t);
  }, [reducedMotion, visible, phase]);

  // Stagger the extracted-task checklist in one row at a time.
  React.useEffect(() => {
    if (reducedMotion || !visible || phase !== "tasks") return;
    if (tasksShown >= TASKS.length) return;
    const t = setTimeout(() => setTasksShown((n) => n + 1), TASK_STAGGER_MS);
    return () => clearTimeout(t);
  }, [reducedMotion, visible, phase, tasksShown]);

  const running = phase === "improving" || phase === "extracting";
  const badgeLabel = reducedMotion
    ? "AI review"
    : phase === "improving" || phase === "improved"
      ? "Improve writing"
      : phase === "extracting" || phase === "tasks"
        ? "Extract tasks"
        : "AI";

  const showTyping = !reducedMotion && phase === "typing";
  const showImproved =
    reducedMotion || phase === "improved" || phase === "extracting" || phase === "tasks";
  const showTasks = reducedMotion || phase === "tasks";
  const visibleTaskCount = reducedMotion ? TASKS.length : tasksShown;

  return (
    <div
      ref={containerRef}
      className="surface-card mx-auto w-full max-w-md overflow-hidden shadow-sm"
    >
      <div className="flex items-center justify-between border-b border-border/70 px-4 py-2.5">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-muted-foreground/25" />
          <span className="size-2.5 rounded-full bg-muted-foreground/25" />
          <span className="size-2.5 rounded-full bg-muted-foreground/25" />
        </div>
        <span className={cn("ai-badge transition-opacity", running ? "opacity-100" : "opacity-70")}>
          <span className="ai-badge__icon">
            <Sparkles className={cn("size-3", running && "animate-pulse")} />
          </span>
          {badgeLabel}
        </span>
      </div>

      <div className="min-h-[220px] p-5 font-mono text-sm leading-relaxed">
        {!showImproved ? (
          <p className="whitespace-pre-wrap text-foreground/90">
            {RAW_NOTE.slice(0, showTyping ? typedLength : RAW_NOTE.length)}
            {showTyping && <span className="marketing-caret" aria-hidden="true" />}
          </p>
        ) : (
          <div className="marketing-fade-in space-y-2">
            {IMPROVED_LINES.map((line, i) =>
              line.type === "h2" ? (
                <p key={i} className="font-sans text-base font-semibold text-foreground">
                  {line.text}
                </p>
              ) : line.type === "li" ? (
                <p key={i} className="ps-4 text-foreground/80">
                  · {line.text}
                </p>
              ) : (
                <p key={i} className="text-foreground/80">
                  {line.text}
                </p>
              ),
            )}
          </div>
        )}

        {showTasks && (
          <div className="mt-4 space-y-1.5 border-t border-border/60 pt-4 font-sans">
            {TASKS.slice(0, visibleTaskCount).map((task) => (
              <div key={task.text} className="marketing-pop-in flex items-center gap-2 text-sm">
                <CheckCircle2 className="size-4 shrink-0 text-[var(--ai-start)]" aria-hidden="true" />
                <span className="text-foreground/85">{task.text}</span>
                <span className="ms-auto rounded-full border border-border/70 px-1.5 py-0.5 text-[0.65rem] font-medium text-muted-foreground">
                  {task.priority}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
