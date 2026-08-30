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
  BookOpen,
  CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { PlannerData, TaskWithNoteTitle } from "@/server/tasks/planner-service";
import { updateTaskAction } from "@/server/tasks/actions";
import { JournalView } from "@/components/journal/journal-view";
import type { listJournalEntries } from "@/server/journal/journal-service";

interface Props {
  initialData: PlannerData;
  initialJournalEntries?: Awaited<ReturnType<typeof listJournalEntries>>;
  initialTab?: "planner" | "journal";
}

export function PlannerView({
  initialData,
  initialJournalEntries = [],
  initialTab = "planner",
}: Props) {
  const [activeTab, setActiveTab] = React.useState<"planner" | "journal">(initialTab);
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
    <div className="app-page gap-6 sm:gap-8">
      {/* Top Workspace Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-border/70 pb-3">
        <Button
          variant={activeTab === "planner" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("planner")}
          className="gap-2 rounded-xl shadow-xs"
        >
          <Target className="size-4" />
          Task Planner & Goals
        </Button>
        <Button
          variant={activeTab === "journal" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("journal")}
          className="gap-2 rounded-xl shadow-xs"
        >
          <BookOpen className="size-4" />
          Journal & Reflections
          <Badge variant="secondary" className="ml-1 text-[10px]">
            {initialJournalEntries.length}
          </Badge>
        </Button>
      </div>

      {activeTab === "journal" ? (
        <JournalView initialEntries={initialJournalEntries} />
      ) : (
        <>
      {/* Header Banner */}
      <div className="surface-card p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Target className="size-4 text-primary" />
              <span className="section-label">Task & Goal Strategy</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-[-0.035em] sm:text-3xl text-foreground">
              Planner & Next Actions
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              Decompose goals into concrete implementation intentions (&quot;If [cue], then [action]&quot;) to maintain focus and drive execution.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Button
              className="rounded-xl shadow-sm gap-2"
              nativeButton={false}
              render={<Link href="/review" />}
            >
              <Sparkles className="size-4" />
              Start Weekly Review
            </Button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="surface-card p-4">
          <p className="section-label">Overdue</p>
          <p className="mt-2 font-mono text-2xl font-semibold tracking-tight text-destructive">
            {data.overdue.length}
          </p>
        </div>
        <div className="surface-card p-4">
          <p className="section-label">Due Today</p>
          <p className="mt-2 font-mono text-2xl font-semibold tracking-tight text-foreground">
            {data.today.length}
          </p>
        </div>
        <div className="surface-card p-4">
          <p className="section-label">Upcoming (7d)</p>
          <p className="mt-2 font-mono text-2xl font-semibold tracking-tight text-foreground">
            {data.upcoming.length}
          </p>
        </div>
        <div className="surface-card p-4">
          <p className="section-label">Completed Week</p>
          <p className="mt-2 font-mono text-2xl font-semibold tracking-tight text-primary">
            {data.completedThisWeekCount}
          </p>
        </div>
      </div>

      {/* Overdue Section */}
      {data.overdue.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 text-destructive" />
            <h2 className="section-label text-destructive">
              Overdue Items ({data.overdue.length})
            </h2>
          </div>
          <div className="surface-card overflow-hidden divide-y divide-border/70 border-destructive/30">
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
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-muted-foreground" />
            <h2 className="section-label">Today&apos;s Focus ({data.today.length})</h2>
          </div>
          {data.today.length === 0 ? (
            <div className="surface-card-dashed p-8 text-center text-sm text-muted-foreground">
              No tasks scheduled for today. Great job!
            </div>
          ) : (
            <div className="surface-card overflow-hidden divide-y divide-border/70 min-h-[160px]">
              {data.today.map((task) => (
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
          )}
        </section>

        {/* Unplanned / Goal Decomposition Column */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <ListTodo className="size-4 text-muted-foreground" />
            <h2 className="section-label">Goal Intentions ({data.unplanned.length})</h2>
          </div>
          {data.unplanned.length === 0 ? (
            <div className="surface-card-dashed p-8 text-center text-sm text-muted-foreground">
              All active goals have implementation intentions assigned!
            </div>
          ) : (
            <div className="surface-card overflow-hidden divide-y divide-border/70 min-h-[160px]">
              {data.unplanned.map((task) => (
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
          )}
        </section>
      </div>

      {/* Upcoming (Next 7 Days) Section */}
      {data.upcoming.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <CalendarClock className="size-4 text-muted-foreground" />
            <h2 className="section-label">Upcoming Next 7 Days ({data.upcoming.length})</h2>
          </div>
          <div className="surface-card overflow-hidden divide-y divide-border/70">
            {data.upcoming.map((task) => (
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
      </>
      )}

      {/* Edit Cue Dialog */}
      <Dialog
        open={Boolean(editingTaskId)}
        onOpenChange={(open) => {
          if (!open) setEditingTaskId(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="size-5 text-primary" />
              Implementation Intention
            </DialogTitle>
            <DialogDescription>
              Define the exact next action and trigger condition (&quot;If [trigger], then I will [action]&quot;).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Concrete Next Action</Label>
              <Input
                value={nextActionInput}
                onChange={(e) => setNextActionInput(e.target.value)}
                placeholder="e.g., Draft first 200 words of intro"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">If-Then Trigger Cue</Label>
              <Input
                value={ifThenInput}
                onChange={(e) => setIfThenInput(e.target.value)}
                placeholder="e.g., When I open my computer at 9am"
                className="rounded-xl"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditingTaskId(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => editingTaskId && handleSaveGoalCue(editingTaskId)}
              className="rounded-xl shadow-sm"
            >
              Save Cue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
    <div className="flex items-start justify-between gap-3 p-4 transition-colors hover:bg-muted/30">
      <div className="flex items-start gap-3">
        <button
          onClick={() => onComplete(task.id)}
          className="mt-0.5 rounded-full p-1 text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors"
          title="Mark complete"
        >
          <CheckCircle2 className="size-4" />
        </button>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{task.title}</p>
          <p className="text-xs text-muted-foreground">
            From:{" "}
            <Link
              href={`/notes/${task.noteId}`}
              className="hover:underline font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {task.noteTitle}
            </Link>
          </p>
          {task.nextAction ? (
            <div className="mt-1.5 flex items-center gap-1.5">
              <Badge variant="secondary" className="text-[11px] font-medium">
                Next: {task.nextAction}
              </Badge>
            </div>
          ) : null}
          {task.ifThenCue ? (
            <p className="text-[11px] italic text-muted-foreground mt-0.5">
              Trigger: {task.ifThenCue}
            </p>
          ) : null}
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={() => onEditCue(task)} className="text-xs">
        Set Cue
      </Button>
    </div>
  );
}

