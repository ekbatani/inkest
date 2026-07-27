"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Sparkles, ArrowRight, ArrowLeft, Trophy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { PlannerData } from "@/server/tasks/planner-service";
import { updateTaskAction } from "@/server/tasks/actions";

interface Props {
  data: PlannerData;
}

export function ReviewWizard({ data }: Props) {
  const [step, setStep] = React.useState<"overdue" | "unplanned" | "wins" | "complete">("overdue");
  const [overdueList, setOverdueList] = React.useState(data.overdue);
  const unplannedList = data.unplanned;

  const handleResolveOverdue = async (taskId: string, action: "done" | "today" | "next_week") => {
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
      setOverdueList((prev) => prev.filter((t) => t.id !== taskId));
      toast.success("Task updated!");
    } catch {
      toast.error("Failed to update task.");
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
                    <Button variant="outline" size="sm" onClick={() => handleResolveOverdue(t.id, "done")}>
                      Done
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleResolveOverdue(t.id, "today")}>
                      Today
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleResolveOverdue(t.id, "next_week")}>
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
              Ensure active goals have concrete next actions so they do not sit idle.
            </p>
          </div>

          <div className="surface-card p-6 text-sm">
            <p className="text-muted-foreground">
              Found <strong className="text-foreground">{unplannedList.length}</strong> active tasks/goals missing explicit deadlines or next actions.
            </p>
          </div>

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

