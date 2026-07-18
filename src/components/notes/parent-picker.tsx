"use client";

import * as React from "react";
import Link from "next/link";
import {
  Check,
  ChevronRight,
  FolderKanban,
  FolderOpen,
  Link2,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

const NO_PARENT_VALUE = "__none__";

type ParentCandidate = {
  id: string;
  title: string;
  type: string;
};

export function ParentPicker({
  noteId,
  value,
  candidates,
  projectOnly = false,
  onChange,
}: {
  noteId: string;
  value: string | null;
  candidates: ParentCandidate[];
  projectOnly?: boolean;
  onChange: (v: string | null) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const availableCandidates = projectOnly
    ? candidates.filter((candidate) => candidate.type === "project")
    : candidates;
  const selectedParent = availableCandidates.find((candidate) => candidate.id === value) ?? null;

  const handle = (nextValue: string) => {
    onChange(nextValue === NO_PARENT_VALUE ? null : nextValue);
    setOpen(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-[11px] font-medium text-muted-foreground">
          Parent
        </Label>
        {selectedParent?.type === "project" && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
            nativeButton={false}
            render={<Link href={`/projects/${selectedParent.id}`} />}
          >
            <FolderKanban className="size-3.5" />
            Project
          </Button>
        )}
      </div>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex min-h-10 w-full items-center justify-between rounded-xl border border-border/70 bg-background px-3 py-2 text-left transition hover:border-foreground/20 hover:bg-muted/40",
          open && "border-foreground/20 bg-muted/40",
        )}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {selectedParent ? (
          <span className="flex min-w-0 items-center gap-2">
            {selectedParent.type === "project" ? (
              <FolderKanban className="size-4 shrink-0 text-emerald-600" />
            ) : (
              <FolderOpen className="size-4 shrink-0 text-muted-foreground" />
            )}
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-foreground">
                {selectedParent.title || "Untitled"}
              </span>
              <span className="block text-[11px] text-muted-foreground">
                {selectedParent.type === "project"
                  ? "Project parent"
                  : "Linked note"}
              </span>
            </span>
          </span>
        ) : (
          <span className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
            <Link2 className="size-4 shrink-0" />
            No parent note selected
          </span>
        )}

        <Search className="size-4 shrink-0 text-muted-foreground" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg p-0">
          <DialogHeader className="px-5 pt-5 pb-1">
            <DialogTitle>Choose parent note</DialogTitle>
            <DialogDescription>
              {projectOnly
                ? "Projects can be nested only inside another project."
                : "Link this note to a parent note or project and keep the hierarchy easy to move through."}
            </DialogDescription>
          </DialogHeader>

          <Command className="rounded-none border-0 bg-transparent p-0">
            <div className="px-4 pb-3">
              <CommandInput placeholder="Search notes and projects..." />
            </div>
            <CommandList className="max-h-80 px-2 pb-2">
              <CommandEmpty>No matching note found.</CommandEmpty>
              <CommandGroup heading="Available parents">
                <CommandItem
                  value="No parent"
                  onSelect={() => handle(NO_PARENT_VALUE)}
                  className="rounded-xl px-3 py-3"
                >
                  <Link2 className="size-4 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">No parent</div>
                    <div className="text-xs text-muted-foreground">
                      Keep this note at the top level.
                    </div>
                  </div>
                  {!selectedParent && <Check className="size-4 text-foreground" />}
                </CommandItem>

                {availableCandidates.map((candidate) => {
                  const isSelected = candidate.id === selectedParent?.id;
                  const isProject = candidate.type === "project";

                  return (
                    <CommandItem
                      key={candidate.id}
                      value={`${candidate.title} ${candidate.type} ${candidate.id}`}
                      onSelect={() => handle(candidate.id)}
                      className="rounded-xl px-3 py-3"
                    >
                      {isProject ? (
                        <FolderKanban className="size-4 text-emerald-600" />
                      ) : (
                        <FolderOpen className="size-4 text-muted-foreground" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-foreground">
                            {candidate.title || "Untitled"}
                          </span>
                          {isProject && (
                            <Badge
                              variant="secondary"
                              className="rounded-full px-2 py-0 text-[10px]"
                            >
                              Project
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {isProject
                            ? "Open in project view after linking."
                            : "Use as parent note."}
                        </div>
                      </div>
                      {isProject && candidate.id !== noteId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[11px]"
                          nativeButton={false}
                          render={
                            <Link
                              href={`/projects/${candidate.id}`}
                              onClick={() => setOpen(false)}
                            />
                          }
                        >
                          Open
                          <ChevronRight className="size-3.5" />
                        </Button>
                      )}
                      {isSelected && <Check className="size-4 text-foreground" />}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>

      {availableCandidates.length === 0 && (
        <p className="text-[11px] text-muted-foreground">
          No {projectOnly ? "projects" : "notes"} available as parent yet.
        </p>
      )}
    </div>
  );
}
