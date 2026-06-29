"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { archiveNoteAction, unarchiveNoteAction } from "@/server/notes/actions";

export function ArchiveToggleButton({
  noteId,
  archived,
  variant = "ghost",
  size = "icon-sm",
  className,
}: {
  noteId: string;
  archived: boolean;
  variant?: Parameters<typeof Button>[0]["variant"];
  size?: Parameters<typeof Button>[0]["size"];
  className?: string;
}) {
  const router = useRouter();
  const [isPending, setIsPending] = React.useState(false);

  const handleClick = async () => {
    if (isPending) return;

    setIsPending(true);
    try {
      if (archived) {
        await unarchiveNoteAction(noteId);
        toast.success("Note restored.");
        router.refresh();
        return;
      }

      await archiveNoteAction(noteId);
    } catch {
      toast.error(archived ? "Failed to restore note." : "Failed to archive note.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={() => void handleClick()}
      disabled={isPending}
      aria-label={archived ? "Unarchive note" : "Archive note"}
      title={archived ? "Unarchive" : "Archive"}
    >
      {isPending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : archived ? (
        <ArchiveRestore className="size-4" />
      ) : (
        <Archive className="size-4" />
      )}
      {size !== "icon-sm" && <span>{archived ? "Unarchive" : "Archive"}</span>}
    </Button>
  );
}
