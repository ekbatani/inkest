"use client";

import * as React from "react";
import { Plus, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  createTaskAction,
  updateTaskAction,
  deleteTaskAction,
} from "@/server/tasks/actions";
import type { Task } from "@/server/db/schema";

const STATUS_LABELS: { id: Task["status"]; label: string }[] = [
  { id: "todo", label: "To do" },
  { id: "doing", label: "In progress" },
  { id: "done", label: "Done" },
  { id: "canceled", label: "Canceled" },
];

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
  const [view, setView] = React.useState<"list" | "kanban">("kanban");
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
      p.map((t) => (t.id === id ? { ...t, ...next } as Task : t)),
    );
    try {
      await updateTaskAction(noteIdForAction, id, next);
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg border p-0.5">
          <Button
            size="xs"
            variant={view === "list" ? "secondary" : "ghost"}
            onClick={() => setView("list")}
          >
            List
          </Button>
          <Button
            size="xs"
            variant={view === "kanban" ? "secondary" : "ghost"}
            onClick={() => setView("kanban")}
          >
            Kanban
          </Button>
        </div>
        <div className="ml-auto text-xs text-muted-foreground">
          {tasks.length} task{tasks.length === 1 ? "" : "s"}
        </div>
      </div>

      <NewTaskForm
        title={newTitle}
        setTitle={setNewTitle}
        onCreate={handleCreate}
        disabled={creating}
      />

      {tasks.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No tasks yet. Add one above, or write markdown checkboxes inside the
          project note content.
        </div>
      ) : view === "list" ? (
        <TaskList
          tasks={tasks}
          noteId={noteId}
          onUpdate={(id, next) => update(id, next, noteId)}
          onRemove={remove}
        />
      ) : (
        <KanbanBoard
          tasks={tasks}
          noteId={noteId}
          onUpdate={(id, next) => update(id, next, noteId)}
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
            <Badge variant="ghost" className="text-[10px]">
              ai
            </Badge>
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

function KanbanBoard({
  tasks,
  noteId,
  onUpdate,
}: {
  tasks: Task[];
  noteId: string;
  onUpdate: (id: string, next: Partial<Task>) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over) return;
    const overId = String(over.id);
    const newStatus = parseColumnId(overId);
    if (!newStatus) return;
    const activeId = String(active.id);
    const task = tasks.find((t) => t.id === activeId);
    if (!task || task.status === newStatus) return;
    onUpdate(activeId, { status: newStatus });
    // Dragging across columns changes status — leave title untouched.
    void noteId;
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STATUS_LABELS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id);
          return (
            <KanbanColumn
              key={col.id}
              status={col.id}
              label={col.label}
              count={colTasks.length}
              tasks={colTasks}
              onUpdate={onUpdate}
            />
          );
        })}
      </div>
    </DndContext>
  );
}

function KanbanColumn({
  status,
  label,
  count,
  tasks,
  onUpdate,
}: {
  status: Task["status"];
  label: string;
  count: number;
  tasks: Task[];
  onUpdate: (id: string, next: Partial<Task>) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `column-${status}` });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-40 flex-col gap-2 rounded-xl border bg-muted/30 p-2 transition-colors",
        isOver && "border-foreground/40 bg-muted/60",
      )}
    >
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </h3>
        <span className="text-xs text-muted-foreground">{count}</span>
      </div>
      {tasks.map((task) => (
        <KanbanCard
          key={task.id}
          task={task}
          onUpdate={onUpdate}
        />
      ))}
      {tasks.length === 0 && (
        <p className="px-1 py-3 text-center text-[11px] text-muted-foreground">
          Drag here
        </p>
      )}
    </div>
  );
}

function KanbanCard({
  task,
  onUpdate,
}: {
  task: Task;
  onUpdate: (id: string, next: Partial<Task>) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: task.id });
  const style = {
    transform: CSS.Translate.toString(transform),
  };
  const toggleDone = () => {
    onUpdate(task.id, { status: task.status === "done" ? "todo" : "done" });
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group/card flex flex-col gap-1 rounded-lg border bg-card p-2 shadow-sm",
        isDragging && "opacity-50",
      )}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleDone();
          }}
          className={cn(
            "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border",
            task.status === "done"
              ? "border-foreground bg-foreground text-background"
              : "border-input hover:bg-muted",
          )}
          aria-label="Toggle done"
        >
          {task.status === "done" && <Check className="size-3" />}
        </button>
        <p
          className={cn(
            "flex-1 text-xs",
            task.status === "done" && "text-muted-foreground line-through",
          )}
        >
          {task.title}
        </p>
      </div>
      {task.priority !== "none" && (
        <div
          className="ml-6 inline-flex w-fit items-center gap-1 text-[10px]"
          style={{ color: PRIORITY_COLORS[task.priority] }}
        >
          <span
            className="size-1.5 rounded-full"
            style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
          />
          {task.priority}
        </div>
      )}
      {(task.source === "markdown" || task.source === "ai") && (
        <span
          className="ml-6 inline-flex w-fit rounded bg-muted px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-muted-foreground"
        >
          {task.source}
        </span>
      )}
    </div>
  );
}

function parseColumnId(s: string): Task["status"] | null {
  if (!s.startsWith("column-")) return null;
  const val = s.slice("column-".length);
  if (val === "todo" || val === "doing" || val === "done" || val === "canceled") {
    return val;
  }
  return null;
}