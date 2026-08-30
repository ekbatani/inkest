"use client";

import * as React from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Trophy,
  Check,
  ListTodo,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { PlannerData } from "@/server/tasks/planner-service";
import { updateTaskAction } from "@/server/tasks/actions";
import { summarizeWeeklyReviewAction } from "@/server/ai/review-actions";

// The recap is rendered only on demand; keep the markdown stack out of the
// review page's initial bundle.
const MarkdownPreview = dynamic(
  () => import("@/components/markdown/markdown-preview").then((m) => m.MarkdownPreview),
  { ssr: false },
);

interface Props {
  data: PlannerData;
}

export function ReviewWizard({ data }: Props) {
  const [step, setStep] = React.useState<"overdue" | "unplanned" | "wins" | "complete">("overdue");
  const [overdueList, setOverdueList] = React.useState(data.overdue);
  const [unplannedList, setUnplannedList] = React.useState(data.unplanned);
  const [recapStatus, setRecapStatus] = React.useState<"idle" | "loading" | "done" | "error">("idle");
  const [recapText, setRecapText] = React.useState("");
  const [recapError, setRecapError] = React.useState("");

  const resolveTask = async (
    taskId: string,
    action: "done" | "today" | "next_week",
  ) => {
    try {
      if (action === "done") {
        await updateTaskAction(taskId, { status: "done" });
      } else if (action === "today") {
        await updateTaskAction(taskId, { dueDate: new Date() });
      } else {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        await updateTaskAction(taskId, { dueDate: nextWeek });
      }
      toast.success("Task updated!");
    } catch {
      toast.error("Failed to update task.");
    }
  };

  const handleResolveOverdue = async (taskId: string, action: "done" | "today" | "next_week") => {
    await resolveTask(taskId, action);
    setOverdueList((prev) => prev.filter((t) => t.id !== taskId));
  };

  const handleResolveUnplanned = async (taskId: string, action: "done" | "today" | "next_week") => {
    await resolveTask(taskId, action);
    setUnplannedList((prev) => prev.filter((t) => t.id !== taskId));
  };

  const generateRecap = async () => {
    setRecapStatus("loading");
    const result = await summarizeWeeklyReviewAction();
    if (result.ok) {
      setRecapText(result.output);
      setRecapStatus("done");
    } else {
      setRecapError(result.error);
      setRecapStatus("error");
    }
  };

  return (
    <div className="app-page max-w-3xl gap-6">
      {/* Step Indicator */}
      <div className="surface-card p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-primary" />
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Weekly Review Ritual</h1>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span className={step === "overdue" ? "text-primary font-bold" : ""}>1. Overdue</span> &rarr;
          <span className={step === "unplanned" ? "text-primary font-bold" : ""}>2. Unplanned</span> &rarr;
          <span className={step === "wins" ? "text-primary font-bold" : ""}>3. Wins</span>
        </div>
      </div>

      {/* Step 1: Overdue */}
      {step === "overdue" && (
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">Step 1: Triage Overdue Tasks</h2>
            <p className="text-xs text-muted-foreground">
              Clear out aging items. Complete them now, reschedule for today, or push to next week.
            </p>
          </div>

          {overdueList.length === 0 ? (
            <div className="surface-card-dashed p-8 text-center space-y-2">
              <CheckCircle2 className="mx-auto size-8 text-primary" />
              <p className="text-sm font-medium text-foreground">No overdue tasks!</p>
              <p className="text-xs text-muted-foreground">You are all caught up.</p>
            </div>
          ) : (
            <div className="surface-card overflow-hidden divide-y divide-border/70">
              {overdueList.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-4 text-xs">
                  <div>
                    <p className="font-medium text-foreground">{t.title}</p>
                    <p className="text-muted-foreground">From: {t.noteTitle}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <Button variant="outline" size="sm" onClick={() => void handleResolveOverdue(t.id, "done")}>
                      Done
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => void handleResolveOverdue(t.id, "today")}>
                      Today
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => void handleResolveOverdue(t.id, "next_week")}>
                      Next Week
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <Button size="sm" onClick={() => setStep("unplanned")} className="gap-1.5 rounded-xl shadow-sm">
              Next: Unplanned Goals <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Unplanned Goals */}
      {step === "unplanned" && (
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">Step 2: Review Unplanned Goals</h2>
            <p className="text-xs text-muted-foreground">
              Give every active goal a deadline or complete it, so nothing sits idle without a next step.
            </p>
          </div>

          {unplannedList.length === 0 ? (
            <div className="surface-card-dashed p-8 text-center space-y-2">
              <ListTodo className="mx-auto size-8 text-primary" />
              <p className="text-sm font-medium text-foreground">Every goal has a plan!</p>
              <p className="text-xs text-muted-foreground">Nothing is waiting for a next action.</p>
            </div>
          ) : (
            <div className="surface-card overflow-hidden divide-y divide-border/70">
              {unplannedList.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 p-4 text-xs">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{t.title}</p>
                    <p className="text-muted-foreground">From: {t.noteTitle}</p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <Button variant="outline" size="sm" onClick={() => void handleResolveUnplanned(t.id, "done")}>
                      Done
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => void handleResolveUnplanned(t.id, "today")}>
                      Today
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => void handleResolveUnplanned(t.id, "next_week")}>
                      Next Week
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="outline" size="sm" onClick={() => setStep("overdue")} className="gap-1.5 rounded-xl">
              <ArrowLeft className="size-4" /> Back
            </Button>
            <Button size="sm" onClick={() => setStep("wins")} className="gap-1.5 rounded-xl shadow-sm">
              Next: Weekly Wins <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Wins */}
      {step === "wins" && (
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">Step 3: Celebrate Your Wins</h2>
            <p className="text-xs text-muted-foreground">
              Acknowledge completed work from the past 7 days to maintain momentum.
            </p>
          </div>

          <div className="surface-card p-8 text-center space-y-2">
            <Trophy className="mx-auto size-12 text-primary" />
            <h3 className="text-2xl font-bold text-foreground">{data.completedThisWeekCount} Tasks Completed</h3>
            <p className="text-xs text-muted-foreground">Great progress this week!</p>
          </div>

          <div className="surface-card space-y-3 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Sparkles className="size-4 text-primary" /> AI weekly recap
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  A short coach-style recap of your planner: momentum, risks, and focus for next week.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => void generateRecap()}
                disabled={recapStatus === "loading"}
              >
                {recapStatus === "loading" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4 text-primary" />
                )}
                {recapStatus === "done" ? "Regenerate" : "Generate recap"}
              </Button>
            </div>
            {recapStatus === "error" && (
              <p className="rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-xs text-destructive">
                {recapError}
              </p>
            )}
            {recapStatus === "done" && (
              <div className="rounded-xl border bg-background/80 p-4 text-sm">
                <MarkdownPreview content={recapText} />
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <Button variant="outline" size="sm" onClick={() => setStep("unplanned")} className="gap-1.5 rounded-xl">
              <ArrowLeft className="size-4" /> Back
            </Button>
            <Button size="sm" onClick={() => setStep("complete")} className="gap-1.5 rounded-xl shadow-sm">
              Complete Review <Check className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Complete State */}
      {step === "complete" && (
        <div className="surface-card p-8 text-center space-y-4">
          <CheckCircle2 className="mx-auto size-12 text-primary" />
          <h2 className="text-xl font-bold text-foreground">Weekly Review Complete!</h2>
          <p className="text-xs text-muted-foreground">Your workspace is organized and ready for the week ahead.</p>
          <Link href="/planner">
            <Button size="sm" className="rounded-xl shadow-sm">Return to Planner</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
