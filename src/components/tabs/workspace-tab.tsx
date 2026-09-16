"use client";

import * as React from "react";
import {
  FileText,
  CalendarDays,
  Folder,
  File,
  FilePlus,
  Pin,
  PinOff,
  X,
  Copy,
  MoreHorizontal,
  NotebookPen,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usesRtlTitleFont } from "@/lib/text/rtl";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { WorkspaceTab } from "./tabs-types";

function TabIcon({ type, tabId, className }: { type?: string; tabId?: string; className?: string }) {
  if (tabId === "notes-overview") return <NotebookPen className={className} />;
  if (type === "daily") return <CalendarDays className={className} />;
  if (type === "project") return <Folder className={className} />;
  if (type === "document") return <File className={className} />;
  if (type === "new") return <FilePlus className={className} />;
  return <FileText className={className} />;
}

export function WorkspaceTabItem({
  tab,
  isActive,
  index,
  onSelect,
  onClose,
  onTogglePin,
  onReorder,
}: {
  tab: WorkspaceTab;
  isActive: boolean;
  index: number;
  onSelect: (tabId: string) => void;
  onClose: (tabId: string) => void;
  onTogglePin: (tabId: string) => void;
  onReorder: (srcIndex: number, destIndex: number) => void;
}) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const isRtl = usesRtlTitleFont(tab.title);

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const fullUrl = `${window.location.origin}${tab.url}`;
      void navigator.clipboard.writeText(fullUrl);
      toast.success("Note link copied to clipboard");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleAuxClick = (e: React.MouseEvent) => {
    // Middle click closes the tab
    if (e.button === 1) {
      e.preventDefault();
      e.stopPropagation();
      onClose(tab.id);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuOpen(true);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", String(index));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const srcIndexStr = e.dataTransfer.getData("text/plain");
    const srcIndex = Number.parseInt(srcIndexStr, 10);
    if (!Number.isNaN(srcIndex) && srcIndex !== index) {
      onReorder(srcIndex, index);
    }
  };

  return (
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
      <div
        role="tab"
        aria-selected={isActive}
        tabIndex={0}
        draggable={!tab.pinned}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => onSelect(tab.id)}
        onAuxClick={handleAuxClick}
        onContextMenu={handleContextMenu}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(tab.id);
          }
        }}
        className={cn(
          "group relative flex h-9 shrink-0 items-center gap-2 border-r border-border/40 px-3 text-xs font-normal transition-all select-none cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-ring",
          isActive
            ? "bg-background text-foreground font-medium shadow-2xs border-b-2 border-b-primary z-10"
            : "bg-muted/15 text-muted-foreground hover:bg-muted/50 hover:text-foreground",
          tab.pinned && "px-2.5 max-w-[120px]",
          !tab.pinned && "max-w-[200px] min-w-[100px]",
          isDragOver && "border-l-2 border-l-primary"
        )}
      >
        <Tooltip>
          <TooltipTrigger render={<span className="flex items-center gap-1.5 min-w-0 flex-1" />}>
            {tab.pinned ? (
              <Pin className="size-3.5 shrink-0 text-amber-500 fill-amber-500/20" />
            ) : (
              <TabIcon type={tab.type} tabId={tab.id} className="size-3.5 shrink-0 text-muted-foreground group-hover:text-foreground" />
            )}

            <span
              className={cn(
                "truncate tracking-tight",
                isRtl && "rtl-vazir font-normal"
              )}
            >
              {tab.title || "Untitled"}
            </span>

            {/* Dirty unsaved changes indicator */}
            {tab.isDirty && (
              <span
                className="size-1.5 shrink-0 rounded-full bg-primary"
                title="Unsaved changes"
                aria-label="Unsaved changes"
              />
            )}
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6}>
            <p className={cn("text-xs", isRtl && "rtl-vazir")}>{tab.title || "Untitled"}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Middle click or Alt+W to close
            </p>
          </TooltipContent>
        </Tooltip>

        {/* Tab actions: Close button and dropdown trigger */}
        <div className="flex items-center gap-0.5 shrink-0">
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                }}
                className="rounded p-0.5 text-muted-foreground/60 opacity-0 group-hover:opacity-100 hover:bg-muted hover:text-foreground transition-opacity"
                aria-label="Tab options"
              >
                <MoreHorizontal className="size-3" />
              </button>
            }
          />

          {!tab.pinned && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose(tab.id);
              }}
              className={cn(
                "rounded p-0.5 text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground transition-colors",
                isActive ? "opacity-80 hover:opacity-100" : "opacity-0 group-hover:opacity-100"
              )}
              aria-label={`Close ${tab.title || "tab"}`}
              title="Close tab (Middle click)"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
      </div>

      <DropdownMenuContent align="start" side="bottom" className="w-40 text-xs">
        <DropdownMenuItem
          onClick={() => onTogglePin(tab.id)}
          className="gap-2"
        >
          {tab.pinned ? (
            <>
              <PinOff className="size-3.5" />
              <span>Unpin tab</span>
            </>
          ) : (
            <>
              <Pin className="size-3.5" />
              <span>Pin tab</span>
            </>
          )}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={handleCopyLink}
          className="gap-2"
        >
          <Copy className="size-3.5" />
          <span>Copy note link</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
