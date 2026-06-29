"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, ArrowUpRight, Check } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NoteStatusBadge } from "@/components/notes/note-status-badge";
import { createProjectTaskNoteAction, updateNoteAction } from "@/server/notes/actions";
import type { Note } from "@/server/db/schema";
import { formatRelativeDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { usesRtlTitleFont } from "@/lib/text/rtl";

type TaskNote = Note;
type TaskStatus = Extract<Note["status"], "todo" | "doing" | "done" | "paused">;

const STATUS_COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: "todo", label: "To do" },
  { id: "doing", label: "In progress" },
  { id: "paused", label: "Paused" },
  { id: "done", label: "Done" },
];

const PRIORITY_COLORS: Record<Note["priority"], string> = {
  none: "var(--muted-foreground)",
  low: "#16a34a",
  medium: "#d97706",
  high: "#dc2626",
};

export function ProjectTaskNotesPanel({
  projectId,
  initialTaskNotes,
}: {
  projectId: string;
  initialTaskNotes: TaskNote[];
}) {
  const [taskNotes, setTaskNotes] = React.useState<TaskNote[]>(initialTaskNotes);
  const [view, setView] = React.useState<"list" | "kanban">("kanban");
  const [newTitle, setNewTitle] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  const createTaskNote = async () => {
    const title = newTitle.trim();
    if (!title) return;

    setCreating(true);
    try {
      const note = await createProjectTaskNoteAction(projectId, title);
      setTaskNotes((current) => sortTaskNotes([...current, note]));
      setNewTitle("");
    } catch {
      toast.error("Failed to create task note.");
    } finally {
      setCreating(false);
    }
  };

  const updateTaskNote = async (
    id: string,
    patch: Partial<Pick<TaskNote, "status" | "priority" | "title">>,
  ) => {
    const previous = taskNotes;
    setTaskNotes((current) =>
      sortTaskNotes(
        current.map((taskNote) =>
          taskNote.id === id
            ? ({ ...taskNote, ...patch, updatedAt: new Date() } as TaskNote)
            : taskNote,
        ),
      ),
    );

    try {
      await updateNoteAction(id, patch);
    } catch {
      setTaskNotes(previous);
      toast.error("Failed to update task note.");
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
          {taskNotes.length} task note{taskNotes.length === 1 ? "" : "s"}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (!creating) void createTaskNote();
            }
          }}
          placeholder="Create a task note..."
          className="h-8"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => void createTaskNote()}
          disabled={creating || !newTitle.trim()}
          className="gap-1.5"
        >
          <Plus className="size-4" /> Add
        </Button>
      </div>

      {taskNotes.length === 0 ? (
        <div className="surface-card-dashed p-8 text-center text-sm text-muted-foreground">
          No task notes yet. Create one above, then open it like any other note.
        </div>
      ) : view === "list" ? (
        <TaskNotesList taskNotes={taskNotes} onUpdate={updateTaskNote} />
      ) : (
        <TaskNotesKanban taskNotes={taskNotes} onUpdate={updateTaskNote} />
      )}
    </div>
  );
}

function TaskNotesList({
  taskNotes,
  onUpdate,
}: {
  taskNotes: TaskNote[];
  onUpdate: (
    id: string,
    patch: Partial<Pick<TaskNote, "status" | "priority" | "title">>,
  ) => void;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {taskNotes.map((taskNote) => (
        <li key={taskNote.id}>
          <div className="surface-card flex flex-wrap items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Link
                  href={`/notes/${taskNote.id}`}
                  className={cn(
                    "truncate text-sm font-medium hover:underline",
                    usesRtlTitleFont(taskNote.title) && "rtl-vazir",
                  )}
                >
                  {taskNote.title}
                </Link>
                <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground" />
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <NoteStatusBadge status={taskNote.status} />
                {taskNote.dueDate && (
                  <Badge variant="outline" className="text-[10px]">
                    Due {formatRelativeDate(taskNote.dueDate)}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  Updated {formatRelativeDate(taskNote.updatedAt)}
                </span>
              </div>
            </div>
            <Select
              value={taskNote.status}
              onValueChange={(value) =>
                onUpdate(taskNote.id, { status: value as TaskStatus })
              }
            >
              <SelectTrigger size="sm" className="w-[9rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_COLUMNS.map((column) => (
                  <SelectItem key={column.id} value={column.id}>
                    {column.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </li>
      ))}
    </ul>
  );
}

function TaskNotesKanban({
  taskNotes,
  onUpdate,
}: {
  taskNotes: TaskNote[];
  onUpdate: (
    id: string,
    patch: Partial<Pick<TaskNote, "status" | "priority" | "title">>,
  ) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const targetStatus = parseColumnId(String(over.id));
    if (!targetStatus) return;
    const taskNote = taskNotes.find((item) => item.id === String(active.id));
    if (!taskNote || taskNote.status === targetStatus) return;
    onUpdate(taskNote.id, { status: targetStatus });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STATUS_COLUMNS.map((column) => {
          const items = taskNotes.filter((taskNote) => taskNote.status === column.id);
          return (
            <TaskNotesColumn
              key={column.id}
              status={column.id}
              label={column.label}
              taskNotes={items}
              onUpdate={onUpdate}
            />
          );
        })}
      </div>
    </DndContext>
  );
}

function TaskNotesColumn({
  status,
  label,
  taskNotes,
  onUpdate,
}: {
  status: TaskStatus;
  label: string;
  taskNotes: TaskNote[];
  onUpdate: (
    id: string,
    patch: Partial<Pick<TaskNote, "status" | "priority" | "title">>,
  ) => void;
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
        <span className="text-xs text-muted-foreground">{taskNotes.length}</span>
      </div>
      {taskNotes.map((taskNote) => (
        <TaskNoteCard
          key={taskNote.id}
          taskNote={taskNote}
          onUpdate={onUpdate}
        />
      ))}
      {taskNotes.length === 0 && (
        <p className="px-1 py-3 text-center text-[11px] text-muted-foreground">
          Drag here
        </p>
      )}
    </div>
  );
}

function TaskNoteCard({
  taskNote,
  onUpdate,
}: {
  taskNote: TaskNote;
  onUpdate: (
    id: string,
    patch: Partial<Pick<TaskNote, "status" | "priority" | "title">>,
  ) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: taskNote.id });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  const toggleDone = () => {
    onUpdate(taskNote.id, {
      status: taskNote.status === "done" ? "todo" : "done",
    });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "surface-card group/card flex flex-col gap-2 p-3",
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
            taskNote.status === "done"
              ? "border-foreground bg-foreground text-background"
              : "border-input hover:bg-muted",
          )}
          aria-label="Toggle done"
        >
          {taskNote.status === "done" && <Check className="size-3" />}
        </button>
        <div className="min-w-0 flex-1">
          <Link
            href={`/notes/${taskNote.id}`}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "block text-xs hover:underline",
              usesRtlTitleFont(taskNote.title) && "rtl-vazir",
              taskNote.status === "done" && "text-muted-foreground line-through",
            )}
          >
            {taskNote.title}
          </Link>
          <p className="mt-1 text-[10px] text-muted-foreground">
            {formatRelativeDate(taskNote.updatedAt)}
          </p>
        </div>
      </div>

      <div className="ml-6 flex flex-wrap items-center gap-2">
        {taskNote.priority !== "none" && (
          <div
            className="inline-flex items-center gap-1 text-[10px]"
            style={{ color: PRIORITY_COLORS[taskNote.priority] }}
          >
            <span
              className="size-1.5 rounded-full"
              style={{ backgroundColor: PRIORITY_COLORS[taskNote.priority] }}
            />
            {taskNote.priority}
          </div>
        )}
        {taskNote.dueDate && (
          <Badge variant="outline" className="text-[10px]">
            {formatRelativeDate(taskNote.dueDate)}
          </Badge>
        )}
      </div>
    </div>
  );
}

function parseColumnId(value: string): TaskStatus | null {
  if (!value.startsWith("column-")) return null;
  const status = value.slice("column-".length);
  if (status === "todo" || status === "doing" || status === "paused" || status === "done") {
    return status;
  }
  return null;
}

function sortTaskNotes(taskNotes: TaskNote[]) {
  return [...taskNotes].sort((a, b) => {
    const rank = (status: TaskStatus) =>
      status === "todo" ? 0 : status === "doing" ? 1 : status === "paused" ? 2 : 3;

    const statusDiff = rank(a.status as TaskStatus) - rank(b.status as TaskStatus);
    if (statusDiff !== 0) return statusDiff;
    if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime();
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });
}
