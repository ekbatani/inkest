"use client";

import * as React from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  Pin,
  PinOff,
  Trash2,
  ChevronLeft,
  Loader2,
  Check,
  PanelRightOpen,
  PanelRightClose,
  Download,
  Copy,
  Circle,
  CircleDot,
  FolderKanban,
  Undo2,
  Redo2,
  BookOpen,
  Headphones,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { FloatingMarkdownFormatToolbar } from "@/components/editor/markdown-format-toolbar";
import { AttachmentUploadButton } from "@/components/editor/image-upload-button";
import { SpeechToTextButton } from "@/components/editor/speech-to-text-button";
import { Skeleton } from "@/components/ui/skeleton";
import { TagSelector } from "@/components/notes/tag-selector";
import { ParentPicker } from "@/components/notes/parent-picker";
import { DueDatePicker } from "@/components/notes/due-date-picker";
import { VersionHistoryButton } from "@/components/notes/version-history-button";
import { DailyNoteCalendarPanel } from "@/components/calendar/daily-note-calendar-panel";
import type { SuperFocusTrackingMode } from "@/components/notes/super-focus-reader";
import { updateUserSettingsAction } from "@/server/users/settings-actions";
import type { WikiLinkTarget } from "@/lib/markdown/wiki";
import type { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { cn } from "@/lib/utils";
import { containsArabicScript } from "@/lib/text/rtl";
import type { GoogleCalendarEvent } from "@/server/db/schema";

// Dynamically imported so CodeMirror and the react-markdown preview
// stack (read mode, copy-preview) split into separate chunks instead of always loading
// together — see docs/plan.md Phase 9.
const MarkdownEditor = dynamic(
  () => import("@/components/editor/markdown-editor").then((m) => m.MarkdownEditor),
  { ssr: false, loading: () => <Skeleton className="h-full w-full" /> },
);
const MarkdownPreview = dynamic(
  () => import("@/components/markdown/markdown-preview").then((m) => m.MarkdownPreview),
  { ssr: false, loading: () => <Skeleton className="h-full w-full" /> },
);
// Super focus is an optional reading mode entered rarely; lazy-load it (and its own
// markdown preview + TTS deps) instead of bundling with the always-on editor toolbar.
const SuperFocusReader = dynamic(
  () => import("@/components/notes/super-focus-reader").then((m) => m.SuperFocusReader),
  { ssr: false },
);
// AI is useful but not needed to begin writing. Keep its action menus, dialogs, and
// result preview out of the editor route until the user explicitly opens AI (or invokes
// the command-menu shortcut).
const AiPanel = dynamic(
  () => import("@/components/ai/ai-panel").then((m) => m.AiPanel),
  {
    ssr: false,
    loading: () => (
      <Button variant="ghost" size="sm" className="gap-1.5" disabled>
        <Loader2 className="size-4 animate-spin text-violet-400" />
        <span className="hidden sm:inline text-violet-400">AI</span>
      </Button>
    ),
  },
);

type NoteSnapshot = {
  title: string;
  content: string;
};

function sameSnapshot(a: NoteSnapshot, b: NoteSnapshot) {
  return a.title === b.title && a.content === b.content;
}

export function NoteEditor({
  note,
  allTags = [],
  noteTagIds = [],
  parentCandidates = [],
  linkableNotes = [],
  backlinks = [],
  selectTitleOnMount = false,
  dailyAgenda,
  superFocusPrefs,
  ttsPrefs,
  editorPrefs,
}: {
  note: Note;
  allTags?: Tag[];
  noteTagIds?: string[];
  parentCandidates?: Pick<Note, "id" | "title" | "type">[];
  linkableNotes?: WikiLinkTarget[];
  backlinks?: { id: string; title: string }[];
  selectTitleOnMount?: boolean;
  superFocusPrefs?: { trackingMode: SuperFocusTrackingMode; radius: number };
  ttsPrefs?: { rate: number; voiceURI: string | undefined };
  editorPrefs?: { pasteToPreview: boolean };
  dailyAgenda?: {
    dateKey: string;
    events: GoogleCalendarEvent[];
    status: {
      configured: boolean;
      connected: boolean;
      googleEmail: string | null;
      lastSyncedAt: Date | null;
    };
  };
}) {
  const router = useRouter();
  const [title, setTitle] = React.useState(note.title);
  const [content, setContent] = React.useState(note.contentMd);
  const [showPanel, setShowPanel] = React.useState(true);
  const [showSuperFocus, setShowSuperFocus] = React.useState(false);
  const [aiPanelRequested, setAiPanelRequested] = React.useState(false);
  const [aiPanelOpen, setAiPanelOpen] = React.useState(false);
  const [aiInitialAction, setAiInitialAction] = React.useState<"summarize" | null>(
    null,
  );
  const [trackingMode, setTrackingMode] = React.useState<SuperFocusTrackingMode>(
    superFocusPrefs?.trackingMode ?? "pointer",
  );
  const [radius, setRadius] = React.useState(superFocusPrefs?.radius ?? 1);
  const [ttsRate, setTtsRate] = React.useState(ttsPrefs?.rate ?? 1);
  const [ttsVoiceURI, setTtsVoiceURI] = React.useState(ttsPrefs?.voiceURI);
  const [superFocusAutoPlay, setSuperFocusAutoPlay] = React.useState(false);
  const [pasteToPreview, setPasteToPreview] = React.useState(
    editorPrefs?.pasteToPreview ?? true,
  );
  const [largePastePreviewContent, setLargePastePreviewContent] =
    React.useState<string | null>(null);
  const superFocusPrefsTimer = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
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
  const undoCheckpointTimer = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const skipNextSave = React.useRef(true);
  const skipNextHistoryCheckpoint = React.useRef(false);
  const skipNextPersist = React.useRef(false);
  const editorRef = React.useRef<ReactCodeMirrorRef>(null);
  const titleInputRef = React.useRef<HTMLInputElement>(null);
  const previewCopyRef = React.useRef<HTMLDivElement>(null);
  const [copyMenuTouched, setCopyMenuTouched] = React.useState(false);
  const initialCheckpoint = React.useMemo<NoteSnapshot>(() => ({
    title: note.title,
    content: note.contentMd,
  }), [note.contentMd, note.title]);
  const [lastCheckpointSnapshot, setLastCheckpointSnapshot] =
    React.useState<NoteSnapshot>(initialCheckpoint);
  const lastCheckpointRef = React.useRef<NoteSnapshot>(initialCheckpoint);

  // CodeMirror keeps the keystroke path local. Its debounced parent update still
  // drives autosave, history, preview, and metadata, but it must not make those
  // route-level renders compete with the next keystroke.
  const handleEditorChange = React.useCallback((nextContent: string) => {
    React.startTransition(() => setContent(nextContent));
  }, []);
  const [historyState, setHistoryState] = React.useState<{
    past: NoteSnapshot[];
    future: NoteSnapshot[];
  }>({
    past: [],
    future: [],
  });

  React.useEffect(() => {
    if (!selectTitleOnMount) return;

    const input = titleInputRef.current;
    if (!input) return;

    input.focus();
    input.select();
  }, [selectTitleOnMount]);

  const skipNextSuperFocusPersist = React.useRef(true);
  React.useEffect(() => {
    if (skipNextSuperFocusPersist.current) {
      skipNextSuperFocusPersist.current = false;
      return;
    }
    if (superFocusPrefsTimer.current) clearTimeout(superFocusPrefsTimer.current);
    superFocusPrefsTimer.current = setTimeout(() => {
      void updateUserSettingsAction({
        superFocus: { trackingMode, radius },
        tts: { rate: ttsRate, voiceURI: ttsVoiceURI },
      });
    }, 600);
    return () => {
      if (superFocusPrefsTimer.current) clearTimeout(superFocusPrefsTimer.current);
    };
  }, [trackingMode, radius, ttsRate, ttsVoiceURI]);

  React.useEffect(() => {
    if (skipNextPersist.current) {
      skipNextPersist.current = false;
      return;
    }
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

  React.useEffect(() => {
    if (skipNextHistoryCheckpoint.current) {
      skipNextHistoryCheckpoint.current = false;
      const nextCheckpoint = { title, content };
      lastCheckpointRef.current = nextCheckpoint;
      setLastCheckpointSnapshot(nextCheckpoint);
      return;
    }

    if (undoCheckpointTimer.current) clearTimeout(undoCheckpointTimer.current);

    undoCheckpointTimer.current = setTimeout(() => {
      const nextSnapshot = { title, content };
      const lastCheckpoint = lastCheckpointRef.current;
      if (sameSnapshot(nextSnapshot, lastCheckpoint)) return;

      setHistoryState((currentHistory) => ({
        past: [...currentHistory.past, lastCheckpoint],
        future: [],
      }));
      lastCheckpointRef.current = nextSnapshot;
      setLastCheckpointSnapshot(nextSnapshot);
    }, 700);

    return () => {
      if (undoCheckpointTimer.current) clearTimeout(undoCheckpointTimer.current);
    };
  }, [title, content]);

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

  const currentSnapshot = React.useMemo(
    () => ({ title, content }),
    [title, content],
  );
  const canUndo =
    historyState.past.length > 0 ||
    !sameSnapshot(currentSnapshot, lastCheckpointSnapshot);
  const canRedo = historyState.future.length > 0;

  const applySnapshot = React.useCallback(
    (
      snapshot: NoteSnapshot,
      options?: {
        skipPersist?: boolean;
        nextHistory?: { past: NoteSnapshot[]; future: NoteSnapshot[] };
      },
    ) => {
      skipNextHistoryCheckpoint.current = true;
      if (options?.skipPersist) {
        skipNextPersist.current = true;
      }
      lastCheckpointRef.current = snapshot;
      setLastCheckpointSnapshot(snapshot);
      setTitle(snapshot.title);
      setContent(snapshot.content);
      if (options?.nextHistory) {
        setHistoryState(options.nextHistory);
      }
    },
    [],
  );

  const undo = React.useCallback(() => {
    const current = { title, content };
    const lastCheckpoint = lastCheckpointRef.current;

    if (!sameSnapshot(current, lastCheckpoint)) {
      applySnapshot(lastCheckpoint, {
        nextHistory: {
          past: historyState.past,
          future: [current, ...historyState.future],
        },
      });
      return;
    }

    const previous = historyState.past[historyState.past.length - 1];
    if (!previous) return;

    applySnapshot(previous, {
      nextHistory: {
        past: historyState.past.slice(0, -1),
        future: [current, ...historyState.future],
      },
    });
  }, [applySnapshot, content, historyState, title]);

  const redo = React.useCallback(() => {
    const next = historyState.future[0];
    if (!next) return;

    applySnapshot(next, {
      nextHistory: {
        past: [...historyState.past, { title, content }],
        future: historyState.future.slice(1),
      },
    });
  }, [applySnapshot, content, historyState, title]);

  const applyRestoredVersion = React.useCallback(
    (snapshot: { title: string; contentMd: string }) => {
      const current = { title, content };
      const nextSnapshot = {
        title: snapshot.title,
        content: snapshot.contentMd,
      };
      if (sameSnapshot(current, nextSnapshot)) return;

      applySnapshot(nextSnapshot, {
        skipPersist: true,
        nextHistory: {
          past: [...historyState.past, current],
          future: [],
        },
      });
    },
    [applySnapshot, content, historyState.past, title],
  );

  const focusEditorStart = React.useCallback(() => {
    const view = editorRef.current?.view;
    if (!view) return;

    view.dispatch({
      selection: { anchor: 0 },
    });
    view.focus();
  }, []);

  const openReader = React.useCallback((autoPlay = false) => {
    setSuperFocusAutoPlay(autoPlay);
    setShowSuperFocus(true);
  }, []);

  const closeReader = React.useCallback(() => {
    setShowSuperFocus(false);
    setLargePastePreviewContent(null);
    window.setTimeout(() => editorRef.current?.view?.focus(), 0);
  }, []);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();

      if (key === "r" && e.shiftKey) {
        e.preventDefault();
        openReader();
        return;
      }

      if (key === "s") {
        e.preventDefault();
        forceSave();
        return;
      }

      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      if (key === "y" || (key === "z" && e.shiftKey)) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [forceSave, openReader, redo, undo]);

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

  const titleUsesRtlFont =
    metadata.direction === "rtl" ||
    (metadata.direction === "auto" && containsArabicScript(title));

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

  const onCopyMarkdown = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Markdown copied to clipboard.");
    } catch {
      toast.error("Failed to copy Markdown.");
    }
  }, [content]);

  const onCopyPreview = React.useCallback(async () => {
    const preview = previewCopyRef.current;
    if (!preview) {
      toast.error("Preview is not ready yet.");
      return;
    }

    const plainText = preview.innerText.trim() || preview.textContent?.trim() || "";
    const html = preview.innerHTML.trim();

    try {
      if (
        typeof ClipboardItem !== "undefined" &&
        html.length > 0
      ) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/plain": new Blob([plainText], { type: "text/plain" }),
            "text/html": new Blob([html], { type: "text/html" }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(plainText);
      }

      toast.success("Preview copied to clipboard.");
    } catch {
      toast.error("Failed to copy preview.");
    }
  }, []);

  const onLargeMarkdownPaste = React.useCallback((pastedContent: string) => {
    if (!pasteToPreview) return;
    setLargePastePreviewContent(pastedContent);
    toast("Large Markdown pasted. Your source stays intact.", {
      action: { label: "Preview", onClick: () => openReader() },
      cancel: {
        label: "Keep editing",
        onClick: () => {
          setPasteToPreview(false);
          void updateUserSettingsAction({ editor: { pasteToPreview: false } });
        },
      },
    });
  }, [openReader, pasteToPreview]);

  const requestAiPanel = React.useCallback((initialAction?: "summarize") => {
    setAiInitialAction(initialAction ?? null);
    setAiPanelRequested(true);
    setAiPanelOpen(true);
  }, []);

  React.useEffect(() => {
    const onAskAi = (event: Event) => {
      const detail = (event as CustomEvent<{ noteId?: string }>).detail;
      if (detail?.noteId !== note.id) return;
      requestAiPanel("summarize");
    };

    window.addEventListener("inkest:ask-ai", onAskAi);
    return () => window.removeEventListener("inkest:ask-ai", onAskAi);
  }, [note.id, requestAiPanel]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b px-3 sm:px-4">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={goBack}
            aria-label="Back to notes"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <div className="ml-1 flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={() => openReader()}
              aria-label="Open focus reader"
              title="Open focus reader (Ctrl+Shift+R)"
            >
              <BookOpen className="size-3.5" />
              <span className="ml-1 hidden sm:inline">Focus</span>
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => openReader(true)}
            aria-label="Listen in the focus reader"
            title="Listen in focus reader"
          >
            <Headphones className="size-4 text-muted-foreground" />
          </Button>

          <AttachmentUploadButton editorRef={editorRef} />
          <SpeechToTextButton editorRef={editorRef} />
          {
            (aiPanelRequested ? (
              <AiPanel
                noteId={note.id}
                editorRef={editorRef}
                open={aiPanelOpen}
                onOpenChange={setAiPanelOpen}
                initialAction={aiInitialAction ?? undefined}
              />
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-foreground/80 hover:text-foreground"
                onClick={() => requestAiPanel()}
              >
                <Sparkles className="size-4 text-violet-400" />
                <span className="hidden sm:inline text-violet-400">AI</span>
              </Button>
            ))}
          <>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={undo}
                disabled={!canUndo}
                aria-label="Undo"
                title="Undo"
              >
                <Undo2 className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={redo}
                disabled={!canRedo}
                aria-label="Redo"
                title="Redo"
              >
                <Redo2 className="size-4" />
              </Button>
            </>
          <DropdownMenu onOpenChange={(open) => open && setCopyMenuTouched(true)}>
              <DropdownMenuTrigger
                render={<Button variant="ghost" size="sm" className="gap-1.5" />}
              >
                <Copy className="size-4 text-muted-foreground" />
                <span className="hidden sm:inline">Copy</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => void onCopyMarkdown()}>
                  Copy Markdown
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void onCopyPreview()}>
                  Copy preview
                </DropdownMenuItem>
              </DropdownMenuContent>
          </DropdownMenu>
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

          <div className="ml-auto flex items-center gap-1">
            {saveState !== "idle" && (
              <span
                key={saveState}
                className="save-indicator flex items-center gap-1 text-xs text-muted-foreground"
              >
                {saveState === "saving" ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Check className="size-3" />
                )}
                {saveState === "saving" ? "Saving…" : "Saved"}
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

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="px-6 pt-6 sm:px-10 sm:pt-8">
            <div className="mx-auto w-full max-w-3xl">
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
                  "h-auto border-0 bg-transparent px-1 py-0 font-sans text-4xl leading-[1.08] font-medium tracking-[-0.02em] text-foreground/92 shadow-none placeholder:text-muted-foreground/40 focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent sm:text-[3.15rem]",
                  titleUsesRtlFont && "rtl-vazir",
                )}
              />
            </div>
            <div className="mt-5 h-px w-full bg-border/80" />
          </div>

          <div
            className="flex min-h-0 flex-1 gap-0 px-6 sm:px-10"
            dir={metadata.direction}
          >
            <div className="flex min-h-0 flex-1 flex-col py-6">
                <MarkdownEditor
                  value={content}
                  onChange={handleEditorChange}
                  direction={metadata.direction}
                  className="flex-1"
                  editorRef={editorRef}
                  linkableNotes={linkableNotes}
                  onOpenLink={(href) => router.push(href)}
                  onLargeMarkdownPaste={onLargeMarkdownPaste}
                />
                <FloatingMarkdownFormatToolbar editorRef={editorRef} />
            </div>
          </div>
        </div>

        {showPanel && (
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
              dailyAgenda={dailyAgenda}
              draft={{ title, contentMd: content }}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={undo}
              onRedo={redo}
              onRestoreVersion={applyRestoredVersion}
            />
          </aside>
        )}
      </div>
      <div
        ref={previewCopyRef}
        aria-hidden="true"
        className="pointer-events-none absolute -left-[9999px] top-0 w-[48rem] opacity-0"
      >
        {copyMenuTouched && (
          <MarkdownPreview content={content} direction={metadata.direction} />
        )}
      </div>
      {showSuperFocus && (
        <SuperFocusReader
          content={largePastePreviewContent ?? content}
          direction={metadata.direction}
          linkableNotes={linkableNotes}
          trackingMode={trackingMode}
          radius={radius}
          onTrackingModeChange={setTrackingMode}
          onRadiusChange={setRadius}
          ttsRate={ttsRate}
          ttsVoiceURI={ttsVoiceURI}
          onTtsRateChange={setTtsRate}
          onTtsVoiceChange={setTtsVoiceURI}
          autoPlayTts={superFocusAutoPlay}
          onExit={closeReader}
        />
      )}
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
  dailyAgenda,
  draft,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onRestoreVersion,
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
  dailyAgenda?: {
    dateKey: string;
    events: GoogleCalendarEvent[];
    status: {
      configured: boolean;
      connected: boolean;
      googleEmail: string | null;
      lastSyncedAt: Date | null;
    };
  };
  draft: { title: string; contentMd: string };
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onRestoreVersion: (snapshot: { title: string; contentMd: string }) => void;
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

        {metadata.type === "daily" && dailyAgenda && (
          <DailyNoteCalendarPanel
            dateKey={dailyAgenda.dateKey}
            events={dailyAgenda.events}
            status={dailyAgenda.status}
          />
        )}

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
          <VersionHistoryButton
            noteId={note.id}
            iconOnly
            draft={draft}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={onUndo}
            onRedo={onRedo}
            onRestoreVersion={onRestoreVersion}
          />
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
