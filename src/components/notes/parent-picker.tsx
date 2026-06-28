"use client";

import { FolderOpen, ChevronRight } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NO_PARENT_VALUE = "__none__";

export function ParentPicker({
  value,
  candidates,
  onChange,
}: {
  value: string | null;
  candidates: { id: string; title: string }[];
  onChange: (v: string | null) => void;
}) {
  const handle = (v: string) => {
    onChange(v === NO_PARENT_VALUE ? null : v);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground">Parent</Label>
      <Select
        value={value ?? NO_PARENT_VALUE}
        onValueChange={(v) => v && handle(v)}
      >
        <SelectTrigger className="h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_PARENT_VALUE}>
            <span className="text-muted-foreground">No parent</span>
          </SelectItem>
          {candidates.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              <span className="flex items-center gap-1.5 truncate">
                <FolderOpen className="size-3 text-muted-foreground" />
                <span className="truncate">{c.title}</span>
                <ChevronRight className="size-3 text-muted-foreground" />
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {candidates.length === 0 && (
        <p className="text-[10px] text-muted-foreground">
          No notes available as parent yet.
        </p>
      )}
    </div>
  );
}