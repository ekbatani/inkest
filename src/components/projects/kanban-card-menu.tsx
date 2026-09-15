"use client";

import * as React from "react";
import {
  MoreHorizontal,
  Pencil,
  ArrowRightLeft,
  Flag,
  Copy,
  ExternalLink,
  Trash2,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const STATUS_OPTIONS: { id: "todo" | "doing" | "paused" | "done"; label: string }[] = [
  { id: "todo", label: "To do" },
  { id: "doing", label: "In progress" },
  { id: "paused", label: "Paused" },
  { id: "done", label: "Done" },
];

const PRIORITY_OPTIONS: { id: "none" | "low" | "medium" | "high"; label: string }[] = [
  { id: "none", label: "No priority" },
  { id: "low", label: "Low priority" },
  { id: "medium", label: "Medium priority" },
  { id: "high", label: "High priority" },
];

export function KanbanCardMenu({
  onStartRename,
  onUpdateStatus,
  onUpdatePriority,
  currentStatus,
  currentPriority,
  noteId,
  onDelete,
  canEdit = true,
}: {
  onStartRename: () => void;
  onUpdateStatus?: (status: "todo" | "doing" | "paused" | "done") => void;
  onUpdatePriority?: (priority: "none" | "low" | "medium" | "high") => void;
  currentStatus: string;
  currentPriority: string;
  noteId: string;
  onDelete: () => void;
  canEdit?: boolean;
}) {
  const [open, setOpen] = React.useState(false);

  const handleCopyLink = async () => {
    try {
      const url = `${window.location.origin}/notes/${noteId}`;
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard.");
    } catch {
      toast.error("Failed to copy link.");
    }
  };

  const handleOpenNote = () => {
    window.open(`/notes/${noteId}`, "_blank");
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="size-6 text-muted-foreground/60 opacity-60 hover:opacity-100 hover:text-foreground group-hover/card:opacity-100"
            aria-label="Task options"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setOpen((v) => !v);
            }}
          />
        }
      >
        <MoreHorizontal className="size-3.5" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-48 text-xs p-1"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {canEdit && (
          <DropdownMenuItem
            onClick={() => {
              setOpen(false);
              onStartRename();
            }}
            className="gap-2"
          >
            <Pencil className="size-3.5 text-muted-foreground" />
            <span>Rename</span>
          </DropdownMenuItem>
        )}

        {canEdit && onUpdateStatus && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="gap-2">
              <ArrowRightLeft className="size-3.5 text-muted-foreground" />
              <span>Move to</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-40 text-xs p-1">
              {STATUS_OPTIONS.map((col) => (
                <DropdownMenuItem
                  key={col.id}
                  onClick={() => {
                    onUpdateStatus(col.id);
                    setOpen(false);
                  }}
                  className="flex items-center justify-between"
                >
                  <span>{col.label}</span>
                  {currentStatus === col.id && <Check className="size-3 text-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}

        {canEdit && onUpdatePriority && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="gap-2">
              <Flag className="size-3.5 text-muted-foreground" />
              <span>Priority</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-40 text-xs p-1">
              {PRIORITY_OPTIONS.map((p) => (
                <DropdownMenuItem
                  key={p.id}
                  onClick={() => {
                    onUpdatePriority(p.id);
                    setOpen(false);
                  }}
                  className="flex items-center justify-between"
                >
                  <span>{p.label}</span>
                  {currentPriority === p.id && <Check className="size-3 text-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}

        <DropdownMenuItem onClick={handleCopyLink} className="gap-2">
          <Copy className="size-3.5 text-muted-foreground" />
          <span>Copy link</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleOpenNote} className="gap-2">
          <ExternalLink className="size-3.5 text-muted-foreground" />
          <span>Open in new tab</span>
        </DropdownMenuItem>

        {canEdit && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
              className="gap-2"
            >
              <Trash2 className="size-3.5" />
              <span>Delete task</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
