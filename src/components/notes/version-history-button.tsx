"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { History, RotateCcw, Loader2, Undo2, Redo2 } from "lucide-react";
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
import { formatDate } from "@/lib/dates";
import {
  listNoteVersionsAction,
  restoreNoteVersionAction,
} from "@/server/notes/versions-actions";
import type { NoteVersion } from "@/server/db/schema";

// Dynamically imported — this dialog (and its markdown rendering) is opened rarely,
// so it shouldn't be part of the always-loaded editor toolbar bundle.
const MarkdownPreview = dynamic(
  () => import("@/components/markdown/markdown-preview").then((m) => m.MarkdownPreview),
  { ssr: false },
);

type DraftSnapshot = {
  title: string;
  contentMd: string;
};

type DraftPreviewVersion = DraftSnapshot & {
  id: "draft";
  createdAt: Date;
};

export function VersionHistoryButton({
  noteId,
  iconOnly = false,
  draft,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onRestoreVersion,
}: {
  noteId: string;
  iconOnly?: boolean;
  draft?: DraftSnapshot | null;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onRestoreVersion?: (version: DraftSnapshot) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [versions, setVersions] = React.useState<NoteVersion[]>([]);
  const [restoring, setRestoring] = React.useState<string | null>(null);
  const [activeId, setActiveId] = React.useState<string | "draft" | null>(null);

  const openHistory = async () => {
    setOpen(true);
    setLoading(true);
    try {
      const list = await listNoteVersionsAction(noteId);
      setVersions(list);
      setActiveId(draft ? "draft" : (list[0]?.id ?? null));
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
      const restored = versions.find((version) => version.id === versionId);
      if (restored && onRestoreVersion) {
        onRestoreVersion({
          title: restored.title,
          contentMd: restored.contentMd,
        });
      }
      toast.success("Restored version.");
      setOpen(false);
    } finally {
      setRestoring(null);
    }
  };

  const activeVersion: NoteVersion | DraftPreviewVersion | null =
    activeId === "draft"
      ? draft
        ? {
            id: "draft",
            createdAt: new Date(),
            title: draft.title,
            contentMd: draft.contentMd,
          }
        : null
      : (versions.find((v) => v.id === activeId) ?? null);
  const activeIsDraft = activeId === "draft";

  return (
    <>
      <Button
        variant="outline"
        size={iconOnly ? "icon-sm" : "sm"}
        className={iconOnly ? "rounded-full" : "w-full justify-start gap-2"}
        aria-label="Open version history"
        title="Version history"
        onClick={() => void openHistory()}
      >
        <History className="size-4" />
        {!iconOnly && "Version history"}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => (nextOpen ? void openHistory() : setOpen(false))}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <History className="size-4" /> Version history
                </DialogTitle>
                <DialogDescription>
                  Auto-snapshots of the note. Restoring roll-backs content and title
                  but first saves your current state as a recoverable snapshot.
                </DialogDescription>
              </div>
              {(onUndo || onRedo) && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="outline"
                    onClick={onUndo}
                    disabled={!canUndo}
                    aria-label="Undo recent note changes"
                    title="Undo"
                  >
                    <Undo2 className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="outline"
                    onClick={onRedo}
                    disabled={!canRedo}
                    aria-label="Redo recent note changes"
                    title="Redo"
                  >
                    <Redo2 className="size-4" />
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>
          <div className="flex min-h-0 gap-3">
            <ScrollArea className="w-44 shrink-0 rounded-lg border">
              <ul className="flex flex-col">
                {draft && (
                  <li>
                    <button
                      type="button"
                      onClick={() => setActiveId("draft")}
                      className={
                        "flex w-full flex-col items-start gap-0.5 border-l-2 px-3 py-2 text-left text-xs hover:bg-muted " +
                        (activeId === "draft"
                          ? "border-foreground bg-muted"
                          : "border-transparent")
                      }
                    >
                      <span className="font-medium">Current draft</span>
                      <span className="line-clamp-1 text-muted-foreground">
                        {draft.title || "Untitled"}
                      </span>
                    </button>
                  </li>
                )}
                {loading && (
                  <li className="flex items-center justify-center gap-2 p-4 text-xs text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" /> Loading...
                  </li>
                )}
                {!loading && versions.length === 0 && !draft && (
                  <li className="px-3 py-6 text-center text-xs text-muted-foreground">
                    No snapshots yet.
                  </li>
                )}
                {!loading &&
                  versions.map((version) => (
                    <li key={version.id}>
                      <button
                        type="button"
                        onClick={() => setActiveId(version.id)}
                        className={
                          "flex w-full flex-col items-start gap-0.5 border-l-2 px-3 py-2 text-left text-xs hover:bg-muted " +
                          (activeId === version.id
                            ? "border-foreground bg-muted"
                            : "border-transparent")
                        }
                      >
                        <span className="font-medium">
                          {formatDate(version.createdAt)}
                        </span>
                        <span className="line-clamp-1 text-muted-foreground">
                          {version.title || "Untitled"}
                        </span>
                      </button>
                    </li>
                  ))}
                {!loading && versions.length === 0 && draft && (
                  <li className="px-3 py-6 text-center text-xs text-muted-foreground">
                    No saved snapshots yet.
                  </li>
                )}
              </ul>
            </ScrollArea>
            <div className="flex min-w-0 flex-1 flex-col">
              {activeVersion ? (
                <>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {activeIsDraft
                        ? "Live draft preview"
                        : `Snapshot - ${formatDate(activeVersion.createdAt)}`}
                    </span>
                    {!activeIsDraft && (
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
                    )}
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
