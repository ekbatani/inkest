"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FolderKanban, FileText } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type ProjectMode = "project" | "note";

export type ProjectModeToggleProps = {
  noteId: string;
  currentMode: ProjectMode;
  canEdit?: boolean;
  onBeforeNavigate?: () => Promise<void> | void;
  className?: string;
};

export function ProjectModeToggle({
  noteId,
  currentMode,
  canEdit = true,
  onBeforeNavigate,
  className,
}: ProjectModeToggleProps) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = React.useState(false);

  const handleNavigate = React.useCallback(
    async (
      e: React.MouseEvent<HTMLAnchorElement>,
      targetHref: string,
    ) => {
      // Allow default browser behavior for modifier keys / non-primary clicks
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
        return;
      }

      if (onBeforeNavigate) {
        e.preventDefault();
        try {
          setIsNavigating(true);
          await onBeforeNavigate();
        } catch {
          // Proceed with navigation even if pre-save rejects
        } finally {
          router.push(targetHref);
        }
      }
    },
    [onBeforeNavigate, router],
  );

  const projectHref = `/projects/${noteId}`;
  const noteHref = `/notes/${noteId}`;

  return (
    <div
      role="group"
      aria-label="Project mode switcher"
      className={cn(
        "flex items-center rounded-lg bg-muted/60 p-0.5 text-xs font-medium border border-border/50 shadow-2xs",
        className,
      )}
    >
      {/* Project Mode Pill */}
      {currentMode === "project" ? (
        <span
          className="flex h-7 items-center gap-1.5 rounded-md bg-background px-2 text-xs font-semibold text-foreground shadow-xs cursor-default select-none sm:px-2.5"
          aria-current="page"
          data-testid="mode-project-active"
        >
          <FolderKanban className="size-3.5 text-amber-500 shrink-0" />
          <span className="hidden lg:inline">Project</span>
        </span>
      ) : (
        <Tooltip>
          <TooltipTrigger
            render={
              <Link
                href={projectHref}
                onClick={(e) => handleNavigate(e, projectHref)}
                aria-label="Switch to Project mode"
                data-testid="mode-project-link"
                className={cn(
                  "flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-background/50 sm:px-2.5",
                  isNavigating && "pointer-events-none opacity-60",
                )}
              />
            }
          >
            <FolderKanban className="size-3.5 text-amber-500/80 shrink-0" />
            <span className="hidden lg:inline">Project</span>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            Switch to Project mode (Overview, Tasks, Timeline)
          </TooltipContent>
        </Tooltip>
      )}

      {/* Note Mode Pill */}
      {currentMode === "note" ? (
        <span
          className="flex h-7 items-center gap-1.5 rounded-md bg-background px-2 text-xs font-semibold text-foreground shadow-xs cursor-default select-none sm:px-2.5"
          aria-current="page"
          data-testid="mode-note-active"
        >
          <FileText className="size-3.5 text-primary shrink-0" />
          <span className="hidden lg:inline">Note</span>
        </span>
      ) : canEdit ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <Link
                href={noteHref}
                onClick={(e) => handleNavigate(e, noteHref)}
                aria-label="Switch to Note mode"
                data-testid="mode-note-link"
                className={cn(
                  "flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-background/50 sm:px-2.5",
                  isNavigating && "pointer-events-none opacity-60",
                )}
              />
            }
          >
            <FileText className="size-3.5 text-primary/80 shrink-0" />
            <span className="hidden lg:inline">Note</span>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            Switch to Note mode (Markdown document editor)
          </TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}
