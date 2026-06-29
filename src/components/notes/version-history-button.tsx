"use client";

import * as React from "react";
import { History, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MarkdownPreview } from "@/components/markdown/markdown-preview";
import { formatDate } from "@/lib/dates";
import {
  listNoteVersionsAction,
  restoreNoteVersionAction,
} from "@/server/notes/versions-actions";
import type { NoteVersion } from "@/server/db/schema";

export function VersionHistoryButton({
  noteId,
  iconOnly = false,
}: {
  noteId: string;
  iconOnly?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [versions, setVersions] = React.useState<NoteVersion[]>([]);
  const [restoring, setRestoring] = React.useState<string | null>(null);
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const open_ = async () => {
    setOpen(true);
    setLoading(true);
    try {
      const list = await listNoteVersionsAction(noteId);
      setVersions(list);
      setActiveId(list[0]?.id ?? null);
    } catch {
      toast.error("Failed to load history.");
    } finally {
      setLoading(false);
    }
  };

  const restore = async (versionId: string) => {
    if (
      !confirm(
        "Restore this version? Your current content will be snapshotted so you can undo this.",
      )
    )
      return;
    setRestoring(versionId);
    try {
      const res = await restoreNoteVersionAction(noteId, versionId);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Restored. The editor will reload with the restored content.");
      setOpen(false);
      // Reload the editor to pick up new content.
      window.location.reload();
    } finally {
      setRestoring(null);
    }
  };

  const activeVersion = versions.find((v) => v.id === activeId) ?? null;

  return (
    <>
      <Button
        variant="outline"
        size={iconOnly ? "icon-sm" : "sm"}
        className={iconOnly ? "rounded-full" : "w-full justify-start gap-2"}
        aria-label="Open version history"
        title="Version history"
        onClick={() => void open_()}
      >
        <History className="size-4" />
        {!iconOnly && "Version history"}
      </Button>
      <Dialog open={open} onOpenChange={(o) => (o ? void open_() : setOpen(false))}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="size-4" /> Version history
          </DialogTitle>
          <DialogDescription>
            Auto-snapshots of the note. Restoring roll-backs content and title
            but first saves your current state as a recoverable snapshot.
          </DialogDescription>
        </DialogHeader>
        <div className="flex min-h-0 gap-3">
          <ScrollArea className="w-44 shrink-0 rounded-lg border">
            <ul className="flex flex-col">
              {loading && (
                <li className="flex items-center justify-center gap-2 p-4 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" /> Loading…
                </li>
              )}
              {!loading && versions.length === 0 && (
                <li className="px-3 py-6 text-center text-xs text-muted-foreground">
                  No snapshots yet.
                </li>
              )}
              {!loading &&
                versions.map((v) => (
                  <li key={v.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(v.id)}
                      className={
                        "flex w-full flex-col items-start gap-0.5 border-l-2 px-3 py-2 text-left text-xs hover:bg-muted " +
                        (activeId === v.id
                          ? "border-foreground bg-muted"
                          : "border-transparent")
                      }
                    >
                      <span className="font-medium">{formatDate(v.createdAt)}</span>
                      <span className="line-clamp-1 text-muted-foreground">
                        {v.title || "Untitled"}
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
          </ScrollArea>
          <div className="flex min-w-0 flex-1 flex-col">
            {activeVersion ? (
              <>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Snapshot · {formatDate(activeVersion.createdAt)}
                  </span>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => void restore(activeVersion.id)}
                    disabled={restoring !== null}
                    className="gap-1.5"
                  >
                    {restoring === activeVersion.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="size-3.5" />
                    )}
                    Restore
                  </Button>
                </div>
                <ScrollArea className="max-h-[55vh] rounded-lg border p-3">
                  <MarkdownPreview content={activeVersion.contentMd} />
                </ScrollArea>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                Select a snapshot on the left.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
      </Dialog>
    </>
  );
}
