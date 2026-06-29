"use client";

import * as React from "react";
import { Calendar, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function toDateInputValue(d: Date | null): string {
  if (!d) return "";
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseDateInputValue(v: string): Date | null {
  if (!v) return null;
  // Build a UTC midnight date so value round-trips consistently.
  const [y, m, d] = v.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d));
}

export function DueDatePicker({
  value,
  onChange,
}: {
  value: Date | null;
  onChange: (d: Date | null) => void;
}) {
  const id = "due-date-input";

  return (
    <div className="flex flex-col gap-2">
      <Label
        htmlFor={id}
        className="text-[11px] font-medium text-muted-foreground"
      >
        Due date
      </Label>
      <div className="relative">
        <Calendar className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          type="date"
          value={toDateInputValue(value)}
          onChange={(e) => onChange(parseDateInputValue(e.target.value))}
          className={cn(
            "h-10 rounded-xl border-border/70 bg-background pl-9 text-sm",
            value ? "pr-10" : "pr-3",
          )}
        />
        {value && (
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            className="absolute right-2 top-1/2 z-10 size-6 -translate-y-1/2 rounded-full text-muted-foreground hover:text-foreground"
            onClick={() => onChange(null)}
            aria-label="Clear due date"
          >
            <X className="size-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
