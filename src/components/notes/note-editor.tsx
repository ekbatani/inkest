"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Pin,
  PinOff,
  Archive,
  Trash2,
  Eye,
  EyeOff,
  Columns2,
  Maximize,
  ChevronLeft,
  Loader2,
  Check,
  PanelRightOpen,
  PanelRightClose,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Note } from "@/server/db/schema";
import type { Tag } from "@/server/db/schema";
import { updateNoteAction } from "@/server/notes/actions";
import {
  archiveNoteAction,
  deleteNoteAction,
  togglePinnedAction,
} from "@/server/notes/actions";
import { formatDate } from "@/lib/dates";
import { MarkdownEditor } from "@/components/editor/markdown-editor";
import { MarkdownPreview } from "@/components/markdown/markdown-preview";
import { ImageUploadButton } from "@/components/editor/image-upload-button";
import { AiPanel } from "@/components/ai/ai-panel";
import { TagSelector } from "@/components/notes/tag-selector";
import { ParentPicker } from "@/components/notes/parent-picker";
import { DueDatePicker } from "@/components/notes/due-date-picker";
import { VersionHistoryButton } from "@/components/notes/version-history-button";
import type { WikiLinkTarget } from "@/lib/markdown/wiki";
import type { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { cn } from "@/lib/utils";

type EditorMode = "edit" | "preview" | "split" | "focus";

export function NoteEditor({
  note,
  allTags = [],
  noteTagIds = [],
  parentCandidates = [],
  linkableNotes = [],
  backlinks = [],
  selectTitleOnMount = false,
}: {
  note: Note;
  allTags?: Tag[];
  noteTagIds?: string[];
  parentCandidates?: Pick<Note, "id" | "title">[];
  linkableNotes?: WikiLinkTarget[];
  backlinks?: { id: string; title: string }[];
  selectTitleOnMount?: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = React.useState(note.title);
  const [content, setContent] = React.useState(note.contentMd);
  const [mode, setMode] = React.useState<EditorMode>("edit");
  const [showPanel, setShowPanel] = React.useState(true);
  const [saveState, setSaveState] = React.useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [metadata, setMetadata] = React.useState({
    type: note.type,
    direction: note.direction,
    status: note.status,
    priority: note.priority,
    pinned: note.pinned,
    parentId: note.parentId,
    dueDate: note.dueDate,
  });

  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextSave = React.useRef(true);
  const editorRef = React.useRef<ReactCodeMirrorRef>(null);
  const titleInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!selectTitleOnMount) return;

    const input = titleInputRef.current;
    if (!input) return;

    input.focus();
    input.select();
  }, [selectTitleOnMount]);

  React.useEffect(() => {
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }

    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);

    saveTimer.current = setTimeout(async () => {
      try {
        await updateNoteAction(note.id, { title, contentMd: content });
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 2000);
      } catch {
        setSaveState("idle");
        toast.error("Failed to save note.");
      }
    }, 1500);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [title, content, note.id]);

  const forceSave = React.useCallback(async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState("saving");
    try {
      await updateNoteAction(note.id, { title, contentMd: content });
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSaveState("idle");
      toast.error("Failed to save note.");
    }
  }, [note.id, title, content]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();

      if (key === "s") {
        e.preventDefault();
        forceSave();
      } else if (key === "e" && !e.shiftKey) {
        e.preventDefault();
        setMode((m) => (m === "edit" ? "preview" : "edit"));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [forceSave]);

  const onMetadataChange = async (
    field: string,
    value: string | boolean | null | Date,
  ) => {
    const newMetadata = { ...metadata, [field]: value };
    setMetadata(newMetadata);
    setSaveState("saving");
    try {
      await updateNoteAction(note.id, { [field]: value } as Record<string, unknown>);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      toast.error("Failed to update note.");
    }
  };

  const onArchive = async () => {
    await archiveNoteAction(note.id);
    toast.success("Note archived.");
  };

  const onDelete = async () => {
    if (!confirm("Delete this note? It will be moved to trash.")) return;
    await deleteNoteAction(note.id);
    toast.success("Note deleted.");
  };

  const onTogglePin = async () => {
    await togglePinnedAction(note.id);
    setMetadata((m) => ({ ...m, pinned: !m.pinned }));
  };

  const showEditor = mode === "edit" || mode === "split" || mode === "focus";
  const showPreview = mode === "preview" || mode === "split";
  const isFocus = mode === "focus";

  const focusEditorStart = React.useCallback(() => {
    const view = editorRef.current?.view;
    if (!view) return;

    view.dispatch({
      selection: { anchor: 0 },
    });
    view.focus();
  }, []);

  const goBack = React.useCallback(() => {
    if (typeof window === "undefined") {
      router.push("/notes");
      return;
    }

    const hasHistory = window.history.length > 1;
    const hasInternalReferrer =
      !!document.referrer &&
      (() => {
        try {
          return new URL(document.referrer).origin === window.location.origin;
        } catch {
          return false;
        }
      })();

    if (hasHistory && hasInternalReferrer) {
      router.back();
      return;
    }

    router.push("/notes");
  }, [router]);

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      {!isFocus && (
        <div className="flex h-12 shrink-0 items-center gap-2 border-b px-3 sm:px-4">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={goBack}
            aria-label="Back to notes"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <ToggleGroup
            value={[mode]}
            onValueChange={(v) => v[0] && setMode(v[0] as EditorMode)}
            className="ml-1"
          >
            <ToggleGroupItem value="edit" aria-label="Edit mode">
              <EyeOff className="size-3.5" />
              <span className="ml-1 hidden sm:inline">Edit</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="split" aria-label="Split mode">
              <Columns2 className="size-3.5" />
              <span className="ml-1 hidden sm:inline">Split</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="preview" aria-label="Preview mode">
              <Eye className="size-3.5" />
              <span className="ml-1 hidden sm:inline">Preview</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="focus" aria-label="Focus mode">
              <Maximize className="size-3.5" />
              <span className="ml-1 hidden sm:inline">Focus</span>
            </ToggleGroupItem>
          </ToggleGroup>

          {showEditor && <ImageUploadButton editorRef={editorRef} />}
          {showEditor && (
            <AiPanel
              noteId={note.id}
              editorRef={editorRef}
            />
          )}
          {showEditor && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              nativeButton={false}
              render={
                <a
                  href={`/api/export/note/${note.id}`}
                  aria-label="Download this note as Markdown"
                  rel="noopener"
                />
              }
            >
              <Download className="size-4 text-muted-foreground" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          )}

          <div className="ml-auto flex items-center gap-1">
            {saveState === "saving" && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" /> Saving…
              </span>
            )}
            {saveState === "saved" && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Check className="size-3" /> Saved
              </span>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onTogglePin}
              aria-label={metadata.pinned ? "Unpin note" : "Pin note"}
            >
              {metadata.pinned ? (
                <PinOff className="size-4" />
              ) : (
                <Pin className="size-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowPanel((v) => !v)}
              aria-label="Toggle metadata panel"
            >
              {showPanel ? (
                <PanelRightClose className="size-4" />
              ) : (
                <PanelRightOpen className="size-4" />
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Body */}
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Title */}
          <div className="px-6 pt-6 sm:px-10 sm:pt-8">
            <div className="max-w-4xl">
              <Label
                htmlFor="note-title"
                className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/75"
              >
                Note title
              </Label>
              <Input
                id="note-title"
                ref={titleInputRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  focusEditorStart();
                }}
                placeholder="Untitled"
                className="h-auto border-0 bg-transparent px-0 py-0 font-sans text-4xl leading-[1.08] font-medium tracking-[-0.02em] text-foreground/92 shadow-none placeholder:text-muted-foreground/40 focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent sm:text-[3.15rem]"
              />
            </div>
            <div className="mt-5 h-px w-full bg-border/80" />
          </div>

          {/* Content area */}
          <div
            className={cn(
              "flex min-h-0 flex-1 gap-0",
              isFocus ? "px-6 sm:px-10" : "px-6 sm:px-10",
            )}
            dir={metadata.direction}
          >
            {showEditor && (
              <div
                className={cn(
                  "flex min-h-0 flex-1 flex-col py-6",
                  showPreview && "border-r pr-4",
                )}
              >
                <MarkdownEditor
                  value={content}
                  onChange={setContent}
                  direction={metadata.direction}
                  className="flex-1"
                  editorRef={editorRef}
                />
              </div>
            )}
            {showPreview && (
              <div
                className={cn(
                  "min-h-0 flex-1 overflow-y-auto py-6",
                  showEditor && "pl-4",
                )}
              >
                <MarkdownPreview
                  content={content}
                  direction={metadata.direction}
                  linkableNotes={linkableNotes}
                />
              </div>
            )}
          </div>
        </div>

        {/* Metadata panel */}
        {!isFocus && showPanel && (
          <aside className="hidden w-64 shrink-0 border-l overflow-y-auto p-4 sm:block">
            <MetadataPanel
              note={note}
              metadata={metadata}
              onChange={onMetadataChange}
              onArchive={onArchive}
              onDelete={onDelete}
              allTags={allTags}
              noteTagIds={noteTagIds}
              parentCandidates={parentCandidates}
              backlinks={backlinks}
            />
          </aside>
        )}
      </div>
    </div>
  );
}

function MetadataPanel({
  note,
  metadata,
  onChange,
  onArchive,
  onDelete,
  allTags,
  noteTagIds,
  parentCandidates,
  backlinks,
}: {
  note: Note;
  metadata: {
    type: string;
    direction: string;
    status: string;
    priority: string;
    pinned: boolean;
    parentId: string | null;
    dueDate: Date | null;
  };
  onChange: (field: string, value: string | boolean | null | Date) => void;
  onArchive: () => void;
  onDelete: () => void;
  allTags: Tag[];
  noteTagIds: string[];
  parentCandidates: Pick<Note, "id" | "title">[];
  backlinks: { id: string; title: string }[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Properties
        </h3>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Type</Label>
            <Select
              value={metadata.type}
              onValueChange={(v) => v && onChange("type", v)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="note">Note</SelectItem>
                <SelectItem value="project">Project</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Direction</Label>
            <Select
              value={metadata.direction}
              onValueChange={(v) => v && onChange("direction", v)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto</SelectItem>
                <SelectItem value="ltr">LTR</SelectItem>
                <SelectItem value="rtl">RTL</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select
              value={metadata.status}
              onValueChange={(v) => v && onChange("status", v)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="todo">To do</SelectItem>
                <SelectItem value="doing">In progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Priority</Label>
            <Select
              value={metadata.priority}
              onValueChange={(v) => v && onChange("priority", v)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DueDatePicker
            value={metadata.dueDate}
            onChange={(d) => onChange("dueDate", d)}
          />

          <ParentPicker
            value={metadata.parentId}
            candidates={parentCandidates}
            onChange={(v) => onChange("parentId", v)}
          />
        </div>
      </div>

      <Separator />

      <TagSelector
        noteId={note.id}
        allTags={allTags}
        selectedTagIds={noteTagIds}
      />

      {backlinks.length > 0 && (
        <>
          <Separator />
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Linked from
            </h3>
            <ul className="flex flex-col gap-1 text-xs">
              {backlinks.map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/notes/${b.id}`}
                    className="block truncate text-muted-foreground hover:text-foreground"
                  >
                    ← {b.title || "Untitled"}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      <Separator />

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Dates
        </h3>
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          <span>Created: {formatDate(note.createdAt)}</span>
          <span>Updated: {formatDate(note.updatedAt)}</span>
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={onArchive}
        >
          <Archive className="size-4" /> Archive
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="size-4" /> Delete
        </Button>
        <VersionHistoryButton noteId={note.id} />
      </div>
    </div>
  );
}
