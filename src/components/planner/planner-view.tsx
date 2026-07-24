"use client";

import * as React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  Target,
  ListTodo,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { PlannerData, TaskWithNoteTitle } from "@/server/tasks/planner-service";
import { updateTaskAction } from "@/server/tasks/actions";

interface Props {
  initialData: PlannerData;
}

export function PlannerView({ initialData }: Props) {
  const [data, setData] = React.useState<PlannerData>(initialData);
  const [editingTaskId, setEditingTaskId] = React.useState<string | null>(null);
  const [nextActionInput, setNextActionInput] = React.useState("");
  const [ifThenInput, setIfThenInput] = React.useState("");

  const handleCompleteTask = async (taskId: string) => {
    try {
      await updateTaskAction(taskId, { status: "done" });
      setData((prev) => ({
        ...prev,
        today: prev.today.filter((t) => t.id !== taskId),
        overdue: prev.overdue.filter((t) => t.id !== taskId),
        upcoming: prev.upcoming.filter((t) => t.id !== taskId),
        unplanned: prev.unplanned.filter((t) => t.id !== taskId),
        completedThisWeekCount: prev.completedThisWeekCount + 1,
      }));
      toast.success("Task completed!");
    } catch {
      toast.error("Failed to complete task.");
    }
  };

  const handleSaveGoalCue = async (taskId: string) => {
    try {
      await updateTaskAction(taskId, {
        nextAction: nextActionInput.trim() || null,
        ifThenCue: ifThenInput.trim() || null,
      });
      toast.success("Implementation intention saved.");
      setEditingTaskId(null);
    } catch {
      toast.error("Could not save planner cue.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-violet-500/20 bg-gradient-to-r from-violet-500/10 via-purple-500/5 to-transparent p-6">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
            <Target className="size-6 text-violet-500" />
            Planner & Next Actions
          </h1>
          <p className="text-sm text-muted-foreground">
            Decompose goals into implementation intentions (&quot;If [cue], then [action]&quot;) and maintain focus.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/review">
            <Button className="gap-2 bg-violet-600 hover:bg-violet-700 text-white">
              <Sparkles className="size-4" /> Start Weekly Review
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Overdue</p>
          <p className="mt-2 text-2xl font-bold text-destructive">{data.overdue.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Due Today</p>
          <p className="mt-2 text-2xl font-bold text-amber-500">{data.today.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Upcoming (7 days)</p>
          <p className="mt-2 text-2xl font-bold text-violet-500">{data.upcoming.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Completed This Week</p>
          <p className="mt-2 text-2xl font-bold text-emerald-500">{data.completedThisWeekCount}</p>
        </div>
      </div>

      {/* Overdue Section */}
      {data.overdue.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-destructive">
            <AlertCircle className="size-5" /> Overdue Items ({data.overdue.length})
          </h2>
          <div className="divide-y rounded-xl border border-destructive/20 bg-card">
            {data.overdue.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onComplete={handleCompleteTask}
                onEditCue={(t) => {
                  setEditingTaskId(t.id);
                  setNextActionInput(t.nextAction || "");
                  setIfThenInput(t.ifThenCue || "");
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* Today & Goal Intentions Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Today Column */}
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Clock className="size-5 text-amber-500" /> Today&apos;s Focus ({data.today.length})
          </h2>
          <div className="divide-y rounded-xl border bg-card min-h-[200px]">
            {data.today.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No tasks scheduled for today. Great job!
              </div>
            ) : (
              data.today.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onComplete={handleCompleteTask}
                  onEditCue={(t) => {
                    setEditingTaskId(t.id);
                    setNextActionInput(t.nextAction || "");
                    setIfThenInput(t.ifThenCue || "");
                  }}
                />
              ))
            )}
          </div>
        </section>

        {/* Unplanned / Goal Decomposition Column */}
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <ListTodo className="size-5 text-violet-500" /> Goal Intentions ({data.unplanned.length})
          </h2>
          <div className="divide-y rounded-xl border bg-card min-h-[200px]">
            {data.unplanned.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                All active goals have implementation intentions assigned!
              </div>
            ) : (
              data.unplanned.slice(0, 5).map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onComplete={handleCompleteTask}
                  onEditCue={(t) => {
                    setEditingTaskId(t.id);
                    setNextActionInput(t.nextAction || "");
                    setIfThenInput(t.ifThenCue || "");
                  }}
                />
              ))
            )}
          </div>
        </section>
      </div>

      {/* Edit Cue Dialog Inline */}
      {editingTaskId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md space-y-4 rounded-2xl border bg-card p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-foreground">Implementation Intention</h3>
            <p className="text-xs text-muted-foreground">
              Define the exact next action and trigger condition (&quot;If [trigger], then I will [action]&quot;).
            </p>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Concrete Next Action</Label>
                <Input
                  value={nextActionInput}
                  onChange={(e) => setNextActionInput(e.target.value)}
                  placeholder="e.g., Draft first 200 words of intro"
                />
              </div>
              <div>
                <Label className="text-xs">If-Then Trigger Cue</Label>
                <Input
                  value={ifThenInput}
                  onChange={(e) => setIfThenInput(e.target.value)}
                  placeholder="e.g., When I open my computer at 9am"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditingTaskId(null)}>
                Cancel
              </Button>
              <Button size="sm" onClick={() => handleSaveGoalCue(editingTaskId)}>
                Save Cue
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskRow({
  task,
  onComplete,
  onEditCue,
}: {
  task: TaskWithNoteTitle;
  onComplete: (id: string) => void;
  onEditCue: (task: TaskWithNoteTitle) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 p-4 transition-colors hover:bg-muted/40">
      <div className="flex items-start gap-3">
        <button
          onClick={() => onComplete(task.id)}
          className="mt-0.5 rounded-full p-1 text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors"
          title="Mark complete"
        >
          <CheckCircle2 className="size-5" />
        </button>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{task.title}</p>
          <p className="text-xs text-muted-foreground">
            From: <Link href={`/notes/${task.noteId}`} className="hover:underline font-medium">{task.noteTitle}</Link>
          </p>
          {task.nextAction ? (
            <div className="mt-1 text-xs text-violet-600 dark:text-violet-300 font-medium">
              Next: {task.nextAction}
            </div>
          ) : null}
          {task.ifThenCue ? (
            <div className="text-[11px] italic text-muted-foreground">
              Trigger: {task.ifThenCue}
            </div>
          ) : null}
        </div>
      </div>
      <Button variant="ghost" size="xs" onClick={() => onEditCue(task)}>
        Set Cue
      </Button>
    </div>
  );
}
