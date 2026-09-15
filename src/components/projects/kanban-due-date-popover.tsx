"use client";

import * as React from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  AlertTriangle,
  X,
  CalendarCheck,
} from "lucide-react";
import { format } from "date-fns";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type DueDateStatus =
  | "none"
  | "completed"
  | "overdue"
  | "today"
  | "tomorrow"
  | "soon"
  | "future";

export function getDueDateUrgency(
  dueDate: Date | string | number | null | undefined,
  isDone = false,
): { status: DueDateStatus; label: string; diffDays: number | null } {
  if (!dueDate) {
    return { status: "none", label: "Set date", diffDays: null };
  }

  const d = new Date(dueDate);
  if (isNaN(d.getTime())) {
    return { status: "none", label: "Set date", diffDays: null };
  }

  const now = new Date();
  const todayMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const dueMidnight = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
  ).getTime();

  const diffDays = Math.round(
    (dueMidnight - todayMidnight) / (24 * 60 * 60 * 1000),
  );

  if (isDone) {
    return {
      status: "completed",
      label: format(d, "MMM d"),
      diffDays,
    };
  }

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      status: "overdue",
      label: overdueDays === 1 ? "1d overdue" : `${overdueDays}d overdue`,
      diffDays,
    };
  }

  if (diffDays === 0) {
    return { status: "today", label: "Today", diffDays: 0 };
  }

  if (diffDays === 1) {
    return { status: "tomorrow", label: "Tomorrow", diffDays: 1 };
  }

  if (diffDays < 7) {
    return { status: "soon", label: format(d, "EEEE"), diffDays };
  }

  return { status: "future", label: format(d, "MMM d"), diffDays };
}

function toDateInputValue(d: Date | null | undefined): string {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseDateInputValue(v: string): Date | null {
  if (!v) return null;
  const [y, m, d] = v.split("-").map(Number);
  if (!y || !m || !d) return null;
  // End of the day local time
  return new Date(y, m - 1, d, 23, 59, 59, 999);
}

export function KanbanDueDatePopover({
  dueDate,
  isDone = false,
  onSelectDate,
  disabled = false,
  compact = false,
  className,
}: {
  dueDate: Date | string | number | null | undefined;
  isDone?: boolean;
  onSelectDate: (d: Date | null) => void;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const { status, label } = getDueDateUrgency(dueDate, isDone);
  const dateObj = dueDate ? new Date(dueDate) : null;

  const handleSelectPreset = (daysFromToday: number) => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromToday);
    date.setHours(23, 59, 59, 999);
    onSelectDate(date);
    setOpen(false);
  };

  const handleClear = () => {
    onSelectDate(null);
    setOpen(false);
  };

  const badgeStyles = React.useMemo(() => {
    switch (status) {
      case "overdue":
        return "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20";
      case "today":
        return "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20";
      case "tomorrow":
        return "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-400 hover:bg-sky-500/20";
      case "completed":
        return "border-border/60 bg-muted/30 text-muted-foreground line-through hover:bg-muted/50";
      case "soon":
      case "future":
        return "border-border/80 bg-background text-foreground/80 hover:bg-muted/50";
      case "none":
      default:
        return "border-dashed border-border/80 text-muted-foreground hover:border-foreground/40 hover:text-foreground";
    }
  }, [status]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            disabled={disabled}
            aria-label={dueDate ? `Due ${label}` : "Set due date"}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setOpen((v) => !v);
            }}
            className={cn(
              "inline-flex h-5 items-center gap-1 rounded-md border px-1.5 text-[10px] transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring",
              badgeStyles,
              className,
            )}
          />
        }
      >
        {status === "overdue" ? (
          <AlertTriangle className="size-2.5 shrink-0 text-rose-600 dark:text-rose-400" />
        ) : status === "completed" ? (
          <CalendarCheck className="size-2.5 shrink-0" />
        ) : (
          <CalendarIcon className="size-2.5 shrink-0" />
        )}
        {compact && status === "none" ? (
          <span className="sr-only">Set date</span>
        ) : (
          <span className="truncate max-w-[90px]">{label}</span>
        )}
      </PopoverTrigger>

      <PopoverContent
        align="start"
        side="bottom"
        className="w-64 p-3 shadow-lg rounded-xl text-xs"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-border/60 mb-2.5">
          <span className="font-semibold text-foreground flex items-center gap-1.5">
            <Clock className="size-3.5 text-primary" /> Due Date
          </span>
          {dateObj && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={handleClear}
              className="size-5 rounded-md text-muted-foreground hover:text-destructive"
              title="Clear due date"
            >
              <X className="size-3" />
            </Button>
          )}
        </div>

        {/* Quick Presets */}
        <div className="grid grid-cols-2 gap-1.5 mb-3">
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => handleSelectPreset(0)}
            className={cn(
              "justify-start text-[11px] h-7 px-2",
              status === "today" && "border-primary bg-primary/10 font-semibold",
            )}
          >
            Today
          </Button>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => handleSelectPreset(1)}
            className={cn(
              "justify-start text-[11px] h-7 px-2",
              status === "tomorrow" && "border-primary bg-primary/10 font-semibold",
            )}
          >
            Tomorrow
          </Button>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => handleSelectPreset(3)}
            className="justify-start text-[11px] h-7 px-2"
          >
            In 3 days
          </Button>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => handleSelectPreset(7)}
            className="justify-start text-[11px] h-7 px-2"
          >
            Next week
          </Button>
        </div>

        {/* Custom date input */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-muted-foreground font-medium">
            Custom date
          </span>
          <Input
            type="date"
            value={toDateInputValue(dateObj)}
            onChange={(e) => {
              const next = parseDateInputValue(e.target.value);
              onSelectDate(next);
              if (next) setOpen(false);
            }}
            className="h-8 text-xs rounded-lg"
          />
        </div>

        {dateObj && (
          <div className="mt-2 pt-2 border-t border-border/50 flex justify-between items-center text-[10px] text-muted-foreground">
            <span>Currently: {format(dateObj, "EEE, MMM d, yyyy")}</span>
            <button
              type="button"
              onClick={handleClear}
              className="text-destructive hover:underline font-medium"
            >
              Remove
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
