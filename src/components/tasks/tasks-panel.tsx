"use client";

import * as React from "react";
import { Plus, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AiBadge } from "@/components/ai/ai-badge";
import { KanbanDueDatePopover } from "@/components/projects/kanban-due-date-popover";
import { cn } from "@/lib/utils";
import {
  createTaskAction,
  updateTaskAction,
  deleteTaskAction,
} from "@/server/tasks/actions";
import type { Task } from "@/server/db/schema";

const PRIORITY_COLORS: Record<Task["priority"], string> = {
  none: "var(--muted-foreground)",
  low: "#16a34a",
  medium: "#d97706",
  high: "#dc2626",
};

export function TasksPanel({
  noteId,
  initialTasks,
}: {
  noteId: string;
  initialTasks: Task[];
}) {
  const [tasks, setTasks] = React.useState<Task[]>(initialTasks);
  const [newTitle, setNewTitle] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  const handleCreate = async () => {
    const title = newTitle.trim();
    if (!title) return;
    setCreating(true);
    try {
      const task = await createTaskAction({
        noteId,
        title,
        source: "manual",
      });
      setTasks((p) => [...p, task]);
      setNewTitle("");
    } catch {
      toast.error("Failed to add task.");
    } finally {
      setCreating(false);
    }
  };

  const update = async (id: string, next: Partial<Task>, noteIdForAction: string) => {
    setTasks((p) =>
      p.map((t) => (t.id === id ? ({ ...t, ...next } as Task) : t)),
    );
    try {
      await updateTaskAction(id, next, noteIdForAction);
    } catch {
      toast.error("Failed to save task.");
    }
  };

  const remove = async (id: string) => {
    setTasks((p) => p.filter((t) => t.id !== id));
    try {
      await deleteTaskAction(noteId, id);
    } catch {
      toast.error("Failed to delete task.");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <NewTaskForm
          title={newTitle}
          setTitle={setNewTitle}
          onCreate={handleCreate}
          disabled={creating}
        />
        <div className="shrink-0 text-xs text-muted-foreground">
          {tasks.length} task{tasks.length === 1 ? "" : "s"}
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="surface-card-dashed p-6 text-center text-xs text-muted-foreground">
          No checklist items yet. Add one above, or write markdown checkboxes inside the
          project note content.
        </div>
      ) : (
        <TaskList
          tasks={tasks}
          noteId={noteId}
          onUpdate={(id, next) => update(id, next, noteId)}
          onRemove={remove}
        />
      )}
    </div>
  );
}

function NewTaskForm({
  title,
  setTitle,
  onCreate,
  disabled,
}: {
  title: string;
  setTitle: (v: string) => void;
  onCreate: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (!disabled) onCreate();
          }
        }}
        placeholder="Add a task…"
        className="h-8"
      />
      <Button
        size="sm"
        variant="outline"
        onClick={onCreate}
        disabled={disabled || !title.trim()}
        className="gap-1.5"
      >
        <Plus className="size-4" /> Add
      </Button>
    </div>
  );
}

function TaskList({
  tasks,
  noteId,
  onUpdate,
  onRemove,
}: {
  tasks: Task[];
  noteId: string;
  onUpdate: (id: string, next: Partial<Task>) => void;
  onRemove: (id: string) => void;
}) {
  void noteId;
  return (
    <ul className="flex flex-col gap-1">
      {tasks.map((task) => (
        <li key={task.id}>
          <TaskRow task={task} onUpdate={onUpdate} onRemove={onRemove} />
        </li>
      ))}
    </ul>
  );
}

function TaskRow({
  task,
  onUpdate,
  onRemove,
}: {
  task: Task;
  onUpdate: (id: string, next: Partial<Task>) => void;
  onRemove: (id: string) => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [title, setTitle] = React.useState(task.title);

  const toggleDone = () => {
    const next = task.status === "done" ? "todo" : "done";
    onUpdate(task.id, { status: next });
  };

  const saveTitle = () => {
    if (title.trim() && title !== task.title) {
      onUpdate(task.id, { title: title.trim() });
    }
    setEditing(false);
  };

  return (
    <div className="flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-muted/40">
      <button
        type="button"
        onClick={toggleDone}
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
          task.status === "done"
            ? "border-foreground bg-foreground text-background"
            : "border-input hover:bg-muted",
        )}
        aria-label={
          task.status === "done" ? "Mark as not done" : "Mark as done"
        }
      >
        {task.status === "done" && <Check className="size-3.5" />}
      </button>
      <div className="min-w-0 flex-1">
        {editing ? (
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                saveTitle();
              }
              if (e.key === "Escape") {
                setTitle(task.title);
                setEditing(false);
              }
            }}
            className="h-7"
            autoFocus
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="block w-full text-left text-sm"
          >
            <span
              className={cn(
                task.status === "done" && "text-muted-foreground line-through",
              )}
            >
              {task.title}
            </span>
          </button>
        )}
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          {task.source === "markdown" && (
            <Badge variant="ghost" className="text-[10px]">
              md
            </Badge>
          )}
          {task.source === "ai" && (
            <AiBadge className="h-5 text-[10px]" label="AI" />
          )}
          {task.priority !== "none" && (
            <span
              className="inline-flex items-center gap-1"
              style={{ color: PRIORITY_COLORS[task.priority] }}
            >
              <span
                className="size-1.5 rounded-full"
                style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
              />
              {task.priority}
            </span>
          )}
          <KanbanDueDatePopover
            dueDate={task.dueDate}
            isDone={task.status === "done"}
            onSelectDate={(d) => onUpdate(task.id, { dueDate: d })}
          />
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          if (confirm(`Delete task “${task.title}”?`)) onRemove(task.id);
        }}
        className="mt-0.5 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
        aria-label="Delete task"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}
