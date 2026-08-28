"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  FolderKanban,
  FolderTree,
  Link2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { setProjectParentAction } from "@/server/notes/actions";

const NO_PARENT_VALUE = "__none__";

type ParentCandidate = {
  id: string;
  title: string;
  type: string;
};

export function ProjectParentPicker({
  projectId,
  parentId,
  candidates,
  readOnly = false,
}: {
  projectId: string;
  parentId: string | null;
  candidates: ParentCandidate[];
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [currentParentId, setCurrentParentId] = React.useState(parentId);
  const [prevParentId, setPrevParentId] = React.useState(parentId);

  if (prevParentId !== parentId) {
    setPrevParentId(parentId);
    setCurrentParentId(parentId);
  }

  const projectCandidates = candidates.filter(
    (candidate) => candidate.type === "project" && candidate.id !== projectId,
  );

  const selectedParent =
    projectCandidates.find((candidate) => candidate.id === currentParentId) ??
    null;

  const handleSelect = (nextValue: string) => {
    const nextParentId = nextValue === NO_PARENT_VALUE ? null : nextValue;
    const previous = currentParentId;
    setCurrentParentId(nextParentId);
    setOpen(false);

    startTransition(async () => {
      try {
        await setProjectParentAction(projectId, nextParentId);
        toast.success(
          nextParentId
            ? `Project moved under "${projectCandidates.find((c) => c.id === nextParentId)?.title || "parent"}"`
            : "Project moved to top level",
        );
        router.refresh();
      } catch {
        setCurrentParentId(previous);
        toast.error("Failed to update parent project.");
      }
    });
  };

  if (readOnly) {
    if (!selectedParent) return null;
    return (
      <Badge variant="outline" className="gap-1 text-xs">
        <FolderTree className="size-3 text-muted-foreground" />
        <span className="truncate max-w-[120px]">{selectedParent.title}</span>
      </Badge>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => setOpen(true)}
        className="h-7 gap-1.5 rounded-lg px-2 text-xs font-normal"
        title="Set parent project"
        aria-label="Set parent project"
      >
        <FolderTree className="size-3 text-muted-foreground" />
        {selectedParent ? (
          <span className="truncate max-w-[140px]">
            Parent: {selectedParent.title || "Untitled"}
          </span>
        ) : (
          <span className="text-muted-foreground">Set parent</span>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg p-0">
          <DialogHeader className="px-5 pt-5 pb-1">
            <DialogTitle>Choose parent project</DialogTitle>
            <DialogDescription>
              Set this project as a subproject inside another project, or keep it at the top level.
            </DialogDescription>
          </DialogHeader>

          <Command className="rounded-none border-0 bg-transparent p-0">
            <div className="px-4 pb-3">
              <CommandInput placeholder="Search projects..." />
            </div>
            <CommandList className="max-h-80 px-2 pb-2">
              <CommandEmpty>No matching project found.</CommandEmpty>
              <CommandGroup heading="Project hierarchy">
                <CommandItem
                  value="No parent Root project top level"
                  onSelect={() => handleSelect(NO_PARENT_VALUE)}
                  className="rounded-xl px-3 py-3"
                >
                  <Link2 className="size-4 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">No parent (Top level)</div>
                    <div className="text-xs text-muted-foreground">
                      Keep this project at the top level of your workspace.
                    </div>
                  </div>
                  {!selectedParent && <Check className="size-4 text-foreground" />}
                </CommandItem>

                {projectCandidates.map((candidate) => {
                  const isSelected = candidate.id === currentParentId;
                  return (
                    <CommandItem
                      key={candidate.id}
                      value={`${candidate.title} ${candidate.id}`}
                      onSelect={() => handleSelect(candidate.id)}
                      className="rounded-xl px-3 py-3"
                    >
                      <FolderKanban className="size-4 text-emerald-600 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-foreground">
                            {candidate.title || "Untitled"}
                          </span>
                          <Badge
                            variant="secondary"
                            className="rounded-full px-2 py-0 text-[10px]"
                          >
                            Project
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Make this project a subproject of &quot;{candidate.title || "Untitled"}&quot;
                        </div>
                      </div>
                      {isSelected && <Check className="size-4 text-foreground shrink-0" />}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
