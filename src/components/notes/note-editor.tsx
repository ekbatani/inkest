"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Pin,
  PinOff,
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
  Circle,
  CircleDot,
  FolderKanban,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { deleteNoteAction, togglePinnedAction } from "@/server/notes/actions";
import { ArchiveToggleButton } from "@/components/notes/archive-toggle-button";
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
import { containsArabicScript } from "@/lib/text/rtl";

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
  parentCandidates?: Pick<Note, "id" | "title" | "type">[];
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
    archived: note.archived,
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
  const titleUsesRtlFont =
    metadata.direction === "rtl" ||
    (metadata.direction === "auto" && containsArabicScript(title));

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
          {showEditor && <AiPanel noteId={note.id} editorRef={editorRef} />}
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

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
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
                className={cn(
                  "h-auto border-0 bg-transparent px-0 py-0 font-sans text-4xl leading-[1.08] font-medium tracking-[-0.02em] text-foreground/92 shadow-none placeholder:text-muted-foreground/40 focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent sm:text-[3.15rem]",
                  titleUsesRtlFont && "rtl-vazir",
                )}
              />
            </div>
            <div className="mt-5 h-px w-full bg-border/80" />
          </div>

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

        {!isFocus && showPanel && (
          <aside className="hidden h-full w-80 shrink-0 border-l sm:block">
            <MetadataPanel
              note={note}
              metadata={metadata}
              onChange={onMetadataChange}
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
  onDelete: () => void;
  allTags: Tag[];
  noteTagIds: string[];
  parentCandidates: Pick<Note, "id" | "title" | "type">[];
  backlinks: { id: string; title: string }[];
}) {
  const showProjectLink = metadata.type === "project";
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-4 pb-24">
        <div className="rounded-2xl border border-border/70 bg-muted/20 p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Properties
              </h3>
            </div>
            {showProjectLink && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-full px-3 text-xs"
                nativeButton={false}
                render={<Link href={`/projects/${note.id}`} />}
              >
                <FolderKanban className="size-3.5" />
                Project view
              </Button>
            )}
          </div>

          <div className="grid gap-3">
            <CompactField label="Type">
              <ChoiceGroup
                value={metadata.type}
                onChange={(v) => onChange("type", v)}
                columns={2}
                options={[
                  { value: "note", label: "Note" },
                  { value: "project", label: "Project" },
                  { value: "daily", label: "Daily" },
                ]}
              />
            </CompactField>

            <CompactField label="Direction">
              <ChoiceGroup
                value={metadata.direction}
                onChange={(v) => onChange("direction", v)}
                columns={3}
                options={[
                  { value: "auto", label: "Auto" },
                  { value: "ltr", label: "LTR" },
                  { value: "rtl", label: "RTL" },
                ]}
              />
            </CompactField>

            <CompactField label="Status">
              <Select
                value={metadata.status}
                onValueChange={(v) => v && onChange("status", v)}
              >
                <SelectTrigger className="h-9 w-full rounded-xl border-border/70 bg-background text-sm">
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
            </CompactField>

            <DueDatePicker
              value={metadata.dueDate}
              onChange={(d) => onChange("dueDate", d)}
            />

            <ParentPicker
              noteId={note.id}
              value={metadata.parentId}
              candidates={parentCandidates}
              onChange={(v) => onChange("parentId", v)}
            />
          </div>
        </div>

        <TagSelector
          noteId={note.id}
          allTags={allTags}
          selectedTagIds={noteTagIds}
        />

        {backlinks.length > 0 && (
          <div className="rounded-2xl border border-border/70 p-3">
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
        )}

        <div className="rounded-2xl border border-border/70 p-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Dates
          </h3>
          <div className="grid gap-1 text-xs text-muted-foreground">
            <span>Created: {formatDate(note.createdAt)}</span>
            <span>Updated: {formatDate(note.updatedAt)}</span>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 mt-auto border-t bg-background/95 p-4 backdrop-blur supports-backdrop-filter:bg-background/80">
        <div className="flex items-center justify-center gap-2">
          <ArchiveToggleButton
            noteId={note.id}
            archived={note.archived}
            variant="outline"
            size="icon-sm"
            className="rounded-full"
          />
          <Button
            variant="outline"
            size="icon-sm"
            className="rounded-full text-destructive hover:text-destructive"
            onClick={onDelete}
            aria-label="Delete note"
            title="Delete"
          >
            <Trash2 className="size-4" />
          </Button>
          <VersionHistoryButton noteId={note.id} iconOnly />
        </div>
      </div>
    </div>
  );
}

function CompactField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[11px] font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ChoiceGroup({
  value,
  onChange,
  options,
  columns = 1,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; hint?: string }[];
  columns?: 1 | 2 | 3 | 4;
}) {
  return (
    <div
      role="radiogroup"
      className={cn(
        "grid gap-2",
        columns === 2 && "grid-cols-2",
        columns === 3 && "grid-cols-3",
        columns === 4 && "grid-cols-4",
      )}
    >
      {options.map((option) => {
        const checked = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex min-w-0 items-center gap-2 rounded-xl border px-3 py-2 text-left transition",
              checked
                ? "border-foreground/20 bg-foreground/[0.045] shadow-sm"
                : "border-border/70 bg-background hover:border-foreground/15 hover:bg-muted/30",
            )}
          >
            {checked ? (
              <CircleDot className="size-4 shrink-0 text-foreground" />
            ) : (
              <Circle className="size-4 shrink-0 text-muted-foreground" />
            )}
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-medium text-foreground">
                {option.label}
              </span>
              {option.hint && (
                <span className="block text-xs text-muted-foreground">
                  {option.hint}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
