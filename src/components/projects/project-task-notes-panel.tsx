"use client";

import * as React from "react";
import Link from "next/link";
import {
  Plus,
  ArrowUpRight,
  Check,
  Search,
  X,
  FileText,
  CheckSquare,
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NoteStatusBadge } from "@/components/notes/note-status-badge";
import { KanbanDueDatePopover } from "@/components/projects/kanban-due-date-popover";
import { KanbanCardMenu } from "@/components/projects/kanban-card-menu";
import {
  createProjectTaskNoteAction,
  updateNoteAction,
  deleteProjectTaskNoteAction,
} from "@/server/notes/actions";
import type { Note } from "@/server/db/schema";
import { formatRelativeDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { usesRtlTitleFont } from "@/lib/text/rtl";
import {
  getChecklistProgress,
  hasSubstantialContent,
} from "@/lib/markdown/checkboxes";

type TaskNote = Note;
type TaskStatus = Extract<Note["status"], "todo" | "doing" | "done" | "paused">;
type PriorityFilter = "all" | Note["priority"];
type DueDateFilter = "all" | "overdue" | "today" | "this-week" | "no-date";

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
  canEdit = true,
}: {
  projectId: string;
  initialTaskNotes: TaskNote[];
  canEdit?: boolean;
}) {
  const [taskNotes, setTaskNotes] = React.useState<TaskNote[]>(initialTaskNotes);
  const [view, setView] = React.useState<"list" | "kanban">("kanban");
  const [newTitle, setNewTitle] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = React.useState("");
  const [priorityFilter, setPriorityFilter] = React.useState<PriorityFilter>("all");
  const [dueDateFilter, setDueDateFilter] = React.useState<DueDateFilter>("all");


  const createTaskNote = async (
    customTitle?: string,
    initialStatus: TaskStatus = "todo",
  ) => {
    const title = (customTitle ?? newTitle).trim();
    if (!title) return;

    setCreating(true);
    try {
      const note = await createProjectTaskNoteAction(projectId, title, initialStatus);
      setTaskNotes((current) => sortTaskNotes([...current, note]));
      if (!customTitle) setNewTitle("");
      toast.success("Task note created.");
    } catch {
      toast.error("Failed to create task note.");
    } finally {
      setCreating(false);
    }
  };

  const updateTaskNote = async (
    id: string,
    patch: Partial<Pick<TaskNote, "status" | "priority" | "title" | "dueDate">>,
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

  const deleteTaskNote = async (id: string, title?: string) => {
    const previous = taskNotes;
    setTaskNotes((current) => current.filter((t) => t.id !== id));

    try {
      await deleteProjectTaskNoteAction(id);
      toast.success(title ? `Deleted "${title}".` : "Task deleted.");
    } catch {
      setTaskNotes(previous);
      toast.error("Failed to delete task note.");
    }
  };

  // Filtered tasks
  const filteredTaskNotes = React.useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const weekFromNow = todayStart + 7 * 24 * 60 * 60 * 1000;

    return taskNotes.filter((task) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        if (!task.title.toLowerCase().includes(q)) return false;
      }

      // Priority filter
      if (priorityFilter !== "all") {
        if (task.priority !== priorityFilter) return false;
      }

      // Due date filter
      if (dueDateFilter !== "all") {
        if (dueDateFilter === "no-date") {
          if (task.dueDate) return false;
        } else if (!task.dueDate) {
          return false;
        } else {
          const dueTime = new Date(task.dueDate).getTime();
          const isDone = task.status === "done";
          if (dueDateFilter === "overdue") {
            if (isDone || dueTime >= todayStart) return false;
          } else if (dueDateFilter === "today") {
            const dueDay = new Date(task.dueDate);
            const isToday =
              dueDay.getFullYear() === now.getFullYear() &&
              dueDay.getMonth() === now.getMonth() &&
              dueDay.getDate() === now.getDate();
            if (!isToday) return false;
          } else if (dueDateFilter === "this-week") {
            if (dueTime < todayStart || dueTime > weekFromNow) return false;
          }
        }
      }

      return true;
    });
  }, [taskNotes, searchQuery, priorityFilter, dueDateFilter]);

  const hasActiveFilters =
    searchQuery.trim() !== "" || priorityFilter !== "all" || dueDateFilter !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setPriorityFilter("all");
    setDueDateFilter("all");
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Top Controls: View Switcher, Search, Filters */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between border-b border-border/50 pb-3">
        <div className="flex items-center gap-2">
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

          <span className="text-xs text-muted-foreground">
            {hasActiveFilters
              ? `${filteredTaskNotes.length} of ${taskNotes.length} task${taskNotes.length === 1 ? "" : "s"}`
              : `${taskNotes.length} task${taskNotes.length === 1 ? "" : "s"}`}
          </span>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-48">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="h-7 pl-8 pr-7 text-xs rounded-lg"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          <Select
            value={priorityFilter}
            onValueChange={(value) => setPriorityFilter(value as PriorityFilter)}
          >
            <SelectTrigger size="sm" className="h-7 w-[7.5rem] text-xs">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="none">No priority</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={dueDateFilter}
            onValueChange={(value) => setDueDateFilter(value as DueDateFilter)}
          >
            <SelectTrigger size="sm" className="h-7 w-[7.5rem] text-xs">
              <SelectValue placeholder="Due date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All dates</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="today">Due today</SelectItem>
              <SelectItem value="this-week">Due this week</SelectItem>
              <SelectItem value="no-date">No date set</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              size="xs"
              variant="ghost"
              onClick={clearFilters}
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Main New Task Form (Adds to 'todo') */}
      {canEdit && (
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
            className="h-8 text-sm"
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
      )}

      {taskNotes.length === 0 ? (
        <div className="surface-card-dashed p-8 text-center text-sm text-muted-foreground">
          {canEdit
            ? "No task notes yet. Create one above, then open it like any other note."
            : "No task notes yet."}
        </div>
      ) : filteredTaskNotes.length === 0 ? (
        <div className="surface-card-dashed p-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
          <p>No tasks match the active filters.</p>
          <Button size="xs" variant="outline" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      ) : view === "list" || !canEdit ? (
        <TaskNotesList
          taskNotes={filteredTaskNotes}
          onUpdate={updateTaskNote}
          onDelete={deleteTaskNote}
          canEdit={canEdit}
        />
      ) : (
        <TaskNotesKanban
          taskNotes={filteredTaskNotes}
          onUpdate={updateTaskNote}
          onDelete={deleteTaskNote}
          onCreateInColumn={(title, status) => createTaskNote(title, status)}
          canEdit={canEdit}
        />
      )}
    </div>
  );
}

function TaskNotesList({
  taskNotes,
  onUpdate,
  onDelete,
  canEdit = true,
}: {
  taskNotes: TaskNote[];
  onUpdate: (
    id: string,
    patch: Partial<Pick<TaskNote, "status" | "priority" | "title" | "dueDate">>,
  ) => void;
  onDelete: (id: string, title?: string) => void;
  canEdit?: boolean;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {taskNotes.map((taskNote) => (
        <li key={taskNote.id}>
          <TaskNotesListRow
            taskNote={taskNote}
            onUpdate={onUpdate}
            onDelete={onDelete}
            canEdit={canEdit}
          />
        </li>
      ))}
    </ul>
  );
}

function TaskNotesListRow({
  taskNote,
  onUpdate,
  onDelete,
  canEdit = true,
}: {
  taskNote: TaskNote;
  onUpdate: (
    id: string,
    patch: Partial<Pick<TaskNote, "status" | "priority" | "title" | "dueDate">>,
  ) => void;
  onDelete: (id: string, title?: string) => void;
  canEdit?: boolean;
}) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editTitle, setEditTitle] = React.useState(taskNote.title);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const checklist = React.useMemo(
    () => getChecklistProgress(taskNote.contentMd),
    [taskNote.contentMd],
  );
  const hasContent = React.useMemo(
    () => hasSubstantialContent(taskNote.contentMd),
    [taskNote.contentMd],
  );

  React.useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleSaveTitle = () => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== taskNote.title) {
      onUpdate(taskNote.id, { title: trimmed });
    } else {
      setEditTitle(taskNote.title);
    }
    setIsEditing(false);
  };

  return (
    <div className="surface-card flex flex-wrap items-center gap-3 p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {isEditing ? (
            <Input
              ref={inputRef}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSaveTitle();
                } else if (e.key === "Escape") {
                  setEditTitle(taskNote.title);
                  setIsEditing(false);
                }
              }}
              onBlur={handleSaveTitle}
              className="h-7 text-sm max-w-md"
            />
          ) : (
            <>
              <Link
                href={`/notes/${taskNote.id}`}
                className={cn(
                  "truncate text-sm font-medium hover:underline",
                  usesRtlTitleFont(taskNote.title) && "rtl-vazir",
                  taskNote.status === "done" && "text-muted-foreground line-through",
                )}
                onDoubleClick={() => {
                  if (canEdit) setIsEditing(true);
                }}
                title={canEdit ? "Double click to rename" : undefined}
              >
                {taskNote.title}
              </Link>
              <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground" />
            </>
          )}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-2">
          <NoteStatusBadge status={taskNote.status} />

          {/* Interactive Due Date Popover */}
          <KanbanDueDatePopover
            dueDate={taskNote.dueDate}
            isDone={taskNote.status === "done"}
            disabled={!canEdit}
            onSelectDate={(d) => onUpdate(taskNote.id, { dueDate: d })}
          />

          {hasContent && (
            <span
              className="inline-flex items-center gap-0.5 text-xs text-muted-foreground"
              title="Has detailed note content"
            >
              <FileText className="size-3" />
            </span>
          )}

          {checklist && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10px]",
                checklist.completed === checklist.total
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <CheckSquare className="size-3" />
              {checklist.completed}/{checklist.total}
            </span>
          )}

          <span className="text-xs text-muted-foreground">
            Updated {formatRelativeDate(taskNote.updatedAt)}
          </span>
        </div>
      </div>

      {canEdit && (
        <div className="flex items-center gap-2">
          <Select
            value={taskNote.priority}
            onValueChange={(value) =>
              onUpdate(taskNote.id, { priority: value as TaskNote["priority"] })
            }
          >
            <SelectTrigger size="sm" className="w-[8rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No priority</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>

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

          <KanbanCardMenu
            noteId={taskNote.id}
            currentStatus={taskNote.status}
            currentPriority={taskNote.priority}
            onStartRename={() => setIsEditing(true)}
            onUpdateStatus={(s) => onUpdate(taskNote.id, { status: s })}
            onUpdatePriority={(p) => onUpdate(taskNote.id, { priority: p })}
            onDelete={() => onDelete(taskNote.id, taskNote.title)}
            canEdit={canEdit}
          />
        </div>
      )}
    </div>
  );
}

function TaskNotesKanban({
  taskNotes,
  onUpdate,
  onDelete,
  onCreateInColumn,
  canEdit = true,
}: {
  taskNotes: TaskNote[];
  onUpdate: (
    id: string,
    patch: Partial<Pick<TaskNote, "status" | "priority" | "title" | "dueDate">>,
  ) => void;
  onDelete: (id: string, title?: string) => void;
  onCreateInColumn: (title: string, status: TaskStatus) => void;
  canEdit?: boolean;
}) {
  const dndContextId = React.useId();
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
      id={dndContextId}
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STATUS_COLUMNS.map((column) => {
          const items = taskNotes.filter((taskNote) => taskNote.status === column.id);
          return (
            <TaskNotesColumn
              key={column.id}
              status={column.id}
              label={column.label}
              taskNotes={items}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onCreateInColumn={onCreateInColumn}
              canEdit={canEdit}
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
  onDelete,
  onCreateInColumn,
  canEdit = true,
}: {
  status: TaskStatus;
  label: string;
  taskNotes: TaskNote[];
  onUpdate: (
    id: string,
    patch: Partial<Pick<TaskNote, "status" | "priority" | "title" | "dueDate">>,
  ) => void;
  onDelete: (id: string, title?: string) => void;
  onCreateInColumn: (title: string, status: TaskStatus) => void;
  canEdit?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `column-${status}` });
  const [addingInline, setAddingInline] = React.useState(false);
  const [inlineTitle, setInlineTitle] = React.useState("");

  const handleInlineSubmit = () => {
    const trimmed = inlineTitle.trim();
    if (trimmed) {
      onCreateInColumn(trimmed, status);
      setInlineTitle("");
      setAddingInline(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-48 flex-col gap-2 rounded-xl border bg-muted/30 p-2 transition-colors",
        isOver && "border-foreground/40 bg-muted/60",
      )}
    >
      <div className="flex items-center justify-between px-1">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
          {status === "doing" && taskNotes.length > 5 && (
            <span
              className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400"
              title="WIP limit of 5 exceeded. Focus on completing current tasks before starting new ones."
            >
              WIP Exceeded ({taskNotes.length}/5)
            </span>
          )}
        </h3>
        <span className="text-xs text-muted-foreground">{taskNotes.length}</span>
      </div>

      <div className="flex flex-col gap-2">
        {taskNotes.map((taskNote) => (
          <TaskNoteCard
            key={taskNote.id}
            taskNote={taskNote}
            onUpdate={onUpdate}
            onDelete={onDelete}
            canEdit={canEdit}
          />
        ))}
      </div>

      {taskNotes.length === 0 && !addingInline && (
        <p className="px-1 py-3 text-center text-[11px] text-muted-foreground">
          Drag here
        </p>
      )}

      {/* Quick Add at column bottom */}
      {canEdit && (
        <div className="mt-auto pt-1">
          {addingInline ? (
            <div className="flex flex-col gap-1.5 rounded-lg border bg-background p-2 shadow-xs">
              <Input
                value={inlineTitle}
                onChange={(e) => setInlineTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleInlineSubmit();
                  } else if (e.key === "Escape") {
                    setAddingInline(false);
                    setInlineTitle("");
                  }
                }}
                placeholder={`Task title in ${label}...`}
                className="h-7 text-xs"
                autoFocus
              />
              <div className="flex items-center justify-end gap-1">
                <Button
                  size="icon-xs"
                  variant="ghost"
                  onClick={() => {
                    setAddingInline(false);
                    setInlineTitle("");
                  }}
                  className="size-6 text-muted-foreground"
                >
                  <X className="size-3" />
                </Button>
                <Button
                  size="xs"
                  variant="default"
                  onClick={handleInlineSubmit}
                  disabled={!inlineTitle.trim()}
                  className="h-6 px-2 text-[11px]"
                >
                  Add
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAddingInline(true)}
              className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
            >
              <Plus className="size-3.5" />
              <span>Add task</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function TaskNoteCard({
  taskNote,
  onUpdate,
  onDelete,
  canEdit = true,
}: {
  taskNote: TaskNote;
  onUpdate: (
    id: string,
    patch: Partial<Pick<TaskNote, "status" | "priority" | "title" | "dueDate">>,
  ) => void;
  onDelete: (id: string, title?: string) => void;
  canEdit?: boolean;
}) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editTitle, setEditTitle] = React.useState(taskNote.title);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: taskNote.id, disabled: isEditing });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  const checklist = React.useMemo(
    () => getChecklistProgress(taskNote.contentMd),
    [taskNote.contentMd],
  );
  const hasContent = React.useMemo(
    () => hasSubstantialContent(taskNote.contentMd),
    [taskNote.contentMd],
  );

  React.useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const toggleDone = () => {
    onUpdate(taskNote.id, {
      status: taskNote.status === "done" ? "todo" : "done",
    });
  };

  const handleSaveTitle = () => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== taskNote.title) {
      onUpdate(taskNote.id, { title: trimmed });
    } else {
      setEditTitle(taskNote.title);
    }
    setIsEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "surface-card group/card flex flex-col gap-2 p-3 transition-shadow",
        isDragging && "opacity-50",
      )}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          disabled={!canEdit}
          onClick={(e) => {
            e.stopPropagation();
            toggleDone();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className={cn(
            "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
            taskNote.status === "done"
              ? "border-foreground bg-foreground text-background"
              : "border-input hover:bg-muted",
          )}
          aria-label="Toggle done"
        >
          {taskNote.status === "done" && <Check className="size-3" />}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1">
            {isEditing ? (
              <Input
                ref={inputRef}
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSaveTitle();
                  } else if (e.key === "Escape") {
                    setEditTitle(taskNote.title);
                    setIsEditing(false);
                  }
                }}
                onBlur={handleSaveTitle}
                onPointerDown={(e) => e.stopPropagation()}
                className="h-6 text-xs px-1.5 py-0"
              />
            ) : (
              <Link
                href={`/notes/${taskNote.id}`}
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => {
                  if (canEdit) {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsEditing(true);
                  }
                }}
                className={cn(
                  "block text-xs font-medium hover:underline",
                  usesRtlTitleFont(taskNote.title) && "rtl-vazir",
                  taskNote.status === "done" && "text-muted-foreground line-through",
                )}
                title={canEdit ? "Double click to rename" : undefined}
              >
                {taskNote.title}
              </Link>
            )}

            <KanbanCardMenu
              noteId={taskNote.id}
              currentStatus={taskNote.status}
              currentPriority={taskNote.priority}
              onStartRename={() => setIsEditing(true)}
              onUpdateStatus={(s) => onUpdate(taskNote.id, { status: s })}
              onUpdatePriority={(p) => onUpdate(taskNote.id, { priority: p })}
              onDelete={() => onDelete(taskNote.id, taskNote.title)}
              canEdit={canEdit}
            />
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
            <span>{formatRelativeDate(taskNote.updatedAt)}</span>

            {hasContent && (
              <span
                className="inline-flex items-center gap-0.5 text-muted-foreground/80"
                title="Task has detailed notes"
              >
                <FileText className="size-2.5" />
              </span>
            )}

            {checklist && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-sm px-1 py-0.5 font-mono text-[9px]",
                  checklist.completed === checklist.total
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold"
                    : "bg-muted text-muted-foreground",
                )}
                title={`Checklist: ${checklist.completed} of ${checklist.total} completed (${checklist.percent}%)`}
              >
                <CheckSquare className="size-2.5" />
                {checklist.completed}/{checklist.total}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Card interactive controls: Priority & Due Date */}
      <div className="ml-6 flex flex-wrap items-center gap-1.5 pt-0.5">
        <select
          aria-label={`Priority for ${taskNote.title || "task"}`}
          value={taskNote.priority}
          disabled={!canEdit}
          onChange={(event) =>
            onUpdate(taskNote.id, { priority: event.target.value as TaskNote["priority"] })
          }
          onPointerDown={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          className="h-5 rounded border bg-background px-1 text-[10px] cursor-pointer"
          style={{ color: PRIORITY_COLORS[taskNote.priority] }}
        >
          <option value="none">No priority</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>

        <KanbanDueDatePopover
          dueDate={taskNote.dueDate}
          isDone={taskNote.status === "done"}
          disabled={!canEdit}
          onSelectDate={(date) => onUpdate(taskNote.id, { dueDate: date })}
        />
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
