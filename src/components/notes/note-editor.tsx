"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  Pin,
  PinOff,
  Trash2,
  ChevronLeft,
  Loader2,
  Check,
  Download,
  Copy,
  Undo2,
  Redo2,
  BookOpen,
  Headphones,
  Archive,
  ArchiveRestore,
  FileText,
  MoreHorizontal,
  History,
  Search,
  Link2,
  CloudOff,
  AlertCircle,
} from "lucide-react";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePageContext } from "@/components/providers/page-context-provider";
import { NoteDetailsPopover } from "@/components/notes/note-details-popover";
import type { Note, Tag } from "@/server/db/schema";
import {
  updateNoteAction,
  deleteNoteAction,
  togglePinnedAction,
  archiveNoteAction,
  unarchiveNoteAction,
} from "@/server/notes/actions";
import { FloatingMarkdownFormatToolbar } from "@/components/editor/markdown-format-toolbar";
import { AttachmentUploadButton } from "@/components/editor/image-upload-button";
import { SpeechToTextButton } from "@/components/editor/speech-to-text-button";
import { Skeleton } from "@/components/ui/skeleton";
import { VersionHistoryButton } from "@/components/notes/version-history-button";
import type { SuperFocusTrackingMode } from "@/components/notes/super-focus-reader";
import { updateUserSettingsAction } from "@/server/users/settings-actions";
import type { WikiLinkTarget } from "@/lib/markdown/wiki";
import type { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { cn } from "@/lib/utils";
import { containsArabicScript } from "@/lib/text/rtl";
import type { GoogleCalendarEvent } from "@/server/db/schema";
import {
  applyMarkdownFormat,
  openFindAndReplace,
  triggerOpenLinkDialog,
  type MarkdownFormat,
} from "@/components/editor/markdown-editor-utils";

import { DocumentPersistenceManager } from "@/lib/document-engine/storage/persistence-manager";
import { computeTextEdit, computeContentHash } from "@/lib/document-engine/diff-patch";
import { compressPayload } from "@/lib/document-engine/compression";

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
  projectTaskCount = 0,
}: {
  note: Note;
  allTags?: Tag[];
  noteTagIds?: string[];
  parentCandidates?: Pick<Note, "id" | "title" | "type">[];
  linkableNotes?: WikiLinkTarget[];
  backlinks?: { id: string; title: string; snippet?: string; type?: string }[];
  selectTitleOnMount?: boolean;
  superFocusPrefs?: { trackingMode: SuperFocusTrackingMode; radius: number };
  ttsPrefs?: { rate: number; voiceURI: string | undefined };
  editorPrefs?: {
    pasteToPreview: boolean;
    spellcheck: boolean;
    spellcheckLanguage: "auto" | "en" | "fa";
  };
  aiOnboardingDismissed?: boolean;
  projectTaskCount?: number;
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
  const [versionHistoryOpen, setVersionHistoryOpen] = React.useState(false);
  const [isArchiving, setIsArchiving] = React.useState(false);
  const [showSuperFocus, setShowSuperFocus] = React.useState(false);
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
  );  const [saveState, setSaveState] = React.useState<
    "idle" | "saving" | "saved" | "offline" | "error"
  >("idle");
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
  const maxWaitTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const lastSyncedSnapshotRef = React.useRef<{
    title: string;
    content: string;
    hash: string;
  }>({
    title: note.title,
    content: note.contentMd,
    hash: computeContentHash(note.contentMd),
  });

  const { setPageContext, clearPageContext } = usePageContext();

  React.useEffect(() => {
    setPageContext({
      noteId: note.id,
      pageTitle: title || "Untitled Note",
      pageContent: content,
      pageType: "note",
      editorRef,
    });
  }, [note.id, title, content, editorRef, setPageContext]);

  React.useEffect(() => {
    return () => {
      clearPageContext();
    };
  }, [clearPageContext]);

  const isSavingRef = React.useRef(false);
  const pendingSaveAfterInFlightRef = React.useRef(false);
  const localDraftTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const latestContentRef = React.useRef<NoteSnapshot>({ title: note.title, content: note.contentMd });
  const persistenceManagerRef = React.useRef<DocumentPersistenceManager | null>(null);

  const scheduleLocalDraftSave = React.useCallback(() => {
    if (localDraftTimerRef.current) clearTimeout(localDraftTimerRef.current);
    localDraftTimerRef.current = setTimeout(() => {
      try {
        if (!persistenceManagerRef.current) {
          persistenceManagerRef.current = new DocumentPersistenceManager(note.id);
        }
        const draft = latestContentRef.current;
        void persistenceManagerRef.current.recordLocalDraft(
          draft.title,
          draft.content,
        ).catch(() => {});
      } catch {
        // Ignore
      }
    }, 1000);
  }, [note.id]);

  // CodeMirror keeps the keystroke path local. Its debounced parent update still
  // drives autosave, history, preview, and metadata, but it must not make those
  // route-level renders compete with the next keystroke.
  const handleEditorChange = React.useCallback((nextContent: string) => {
    latestContentRef.current = {
      title: latestContentRef.current?.title ?? title,
      content: nextContent,
    };
    setContent(nextContent);
    scheduleLocalDraftSave();
  }, [scheduleLocalDraftSave, title]);

  const handleTitleChange = React.useCallback((nextTitle: string) => {
    latestContentRef.current = {
      title: nextTitle,
      content: latestContentRef.current?.content ?? content,
    };
    setTitle(nextTitle);
    scheduleLocalDraftSave();
  }, [content, scheduleLocalDraftSave]);

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
    latestContentRef.current = { title, content };
  }, [title, content]);

  const flushBeaconSave = React.useCallback(() => {
    if (typeof window === "undefined") return;
    const snapshot = latestContentRef.current;
    if (sameSnapshot(snapshot, lastSyncedSnapshotRef.current)) return;

    const payload = JSON.stringify({
      title: snapshot.title,
      contentMd: snapshot.content,
    });
    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon(`/api/notes/${note.id}/save`, blob);
    } else {
      void fetch(`/api/notes/${note.id}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      });
    }
  }, [note.id]);

  const performSave = React.useCallback(
    async (options?: { forceRevalidate?: boolean; forceFull?: boolean }) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (maxWaitTimer.current) {
        clearTimeout(maxWaitTimer.current);
        maxWaitTimer.current = null;
      }

      if (isSavingRef.current) {
        pendingSaveAfterInFlightRef.current = true;
        return;
      }

      const snapshot = { ...latestContentRef.current };
      const lastSynced = lastSyncedSnapshotRef.current;

      // No-op check: if unchanged from confirmed server snapshot, skip network call
      if (!options?.forceRevalidate && sameSnapshot(snapshot, lastSynced)) {
        if (typeof navigator !== "undefined" && navigator.onLine && saveState === "offline") {
          setSaveState("saved");
          setTimeout(() => setSaveState((prev) => (prev === "saved" ? "idle" : prev)), 2000);
        }
        return;
      }

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setSaveState("offline");
        return;
      }

      isSavingRef.current = true;
      setSaveState("saving");

      try {
        let forceFull = options?.forceFull ?? false;
        for (let attempt = 0; attempt < 2; attempt++) {
          const contentChanged = snapshot.content !== lastSynced.content;
          const titleChanged = snapshot.title !== lastSynced.title;

          let payload: Record<string, unknown>;
          const textDiff =
            !forceFull && contentChanged && lastSynced.hash
              ? computeTextEdit(lastSynced.content, snapshot.content)
              : null;

          // If diff is compact (< 60% of total length) and exists, send micro-patch
          if (textDiff && textDiff.text.length < snapshot.content.length * 0.6) {
            payload = {
              baseHash: lastSynced.hash,
              patches: [textDiff],
              ...(titleChanged ? { title: snapshot.title } : {}),
            };
          } else {
            // Full save
            payload = {
              title: snapshot.title,
              contentMd: snapshot.content,
            };
          }

          const jsonStr = JSON.stringify(payload);
          let res: Response;

          // Only compress when payload is genuinely large (> 32KB)
          if (jsonStr.length > 32768) {
            const compressed = await compressPayload(payload);
            res = await fetch(`/api/notes/${note.id}/save`, {
              method: "POST",
              headers: {
                "Content-Type": "application/octet-stream",
                "Content-Encoding": "deflate",
              },
              body: new Blob([compressed as unknown as ArrayBufferView<ArrayBuffer>]),
            });
          } else {
            res = await fetch(`/api/notes/${note.id}/save`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: jsonStr,
            });
          }

          if (res.status === 409 && attempt === 0) {
            // Base hash mismatch -> retry once with full payload
            forceFull = true;
            continue;
          }

          if (!res.ok) {
            throw new Error(`Save failed: ${res.statusText}`);
          }

          const data = await res.json();
          const newHash = data.contentHash ?? computeContentHash(snapshot.content);

          lastSyncedSnapshotRef.current = {
            title: snapshot.title,
            content: snapshot.content,
            hash: newHash,
          };

          // Mark local IndexedDB/localStorage as synced
          if (!persistenceManagerRef.current) {
            persistenceManagerRef.current = new DocumentPersistenceManager(note.id);
          }
          void persistenceManagerRef.current.markSynced(undefined, newHash, snapshot.title, snapshot.content);

          if (options?.forceRevalidate) {
            router.refresh();
          }

          const currentLatest = latestContentRef.current;
          const hasMoreEdits =
            currentLatest.title !== snapshot.title || currentLatest.content !== snapshot.content;

          if (!hasMoreEdits && !pendingSaveAfterInFlightRef.current) {
            setSaveState("saved");
            setTimeout(() => {
              setSaveState((prev) => (prev === "saved" ? "idle" : prev));
            }, 2000);
          } else {
            pendingSaveAfterInFlightRef.current = false;
          }

          break;
        }
      } catch {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          setSaveState("offline");
        } else {
          setSaveState("error");
        }
      } finally {
        isSavingRef.current = false;
      }
    },
    [note.id, router, saveState],
  );

  const hasCheckedRecoveryRef = React.useRef(false);

  // Mount recovery: check IndexedDB / local storage for unsaved drafts (runs once per note mount)
  React.useEffect(() => {
    hasCheckedRecoveryRef.current = false;
    void DocumentPersistenceManager.recoverDocument(note.id).then((recovered) => {
      if (!recovered || hasCheckedRecoveryRef.current) return;
      hasCheckedRecoveryRef.current = true;

      // If the user has already modified the note since mount, preserve active in-memory typing
      const currentInMemory = latestContentRef.current;
      if (
        currentInMemory.content !== note.contentMd ||
        currentInMemory.title !== note.title
      ) {
        return;
      }

      const noteUpdatedAtMs = note.updatedAt ? new Date(note.updatedAt).getTime() : 0;
      const isNewer = recovered.timestamp > noteUpdatedAtMs;
      const contentDiffers =
        recovered.content !== note.contentMd ||
        (recovered.title !== undefined && recovered.title !== note.title);

      if ((recovered.synced === false || isNewer) && contentDiffers) {
        if (recovered.title !== undefined) setTitle(recovered.title);
        setContent(recovered.content);
        latestContentRef.current = {
          title: recovered.title ?? note.title,
          content: recovered.content,
        };
        lastCheckpointRef.current = {
          title: recovered.title ?? note.title,
          content: recovered.content,
        };
        setLastCheckpointSnapshot({
          title: recovered.title ?? note.title,
          content: recovered.content,
        });
        // Silently sync recovered draft to server without noisy toast notifications
        void performSave({ forceRevalidate: false });
      }
    });
  }, [note.contentMd, note.id, note.title, note.updatedAt, performSave]);

  // Network online/offline event listeners and auto-sync
  React.useEffect(() => {
    const handleOnline = () => {
      if (!sameSnapshot(latestContentRef.current, lastSyncedSnapshotRef.current)) {
        void performSave({ forceRevalidate: false });
      } else if (saveState === "offline") {
        setSaveState("saved");
        setTimeout(() => setSaveState((prev) => (prev === "saved" ? "idle" : prev)), 2000);
      }
    };
    const handleOffline = () => {
      if (!sameSnapshot(latestContentRef.current, lastSyncedSnapshotRef.current)) {
        setSaveState("offline");
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [performSave, saveState]);

  // Periodic background retry for pending syncs
  React.useEffect(() => {
    const interval = setInterval(() => {
      if (
        typeof navigator !== "undefined" &&
        navigator.onLine &&
        !isSavingRef.current &&
        !sameSnapshot(latestContentRef.current, lastSyncedSnapshotRef.current)
      ) {
        void performSave({ forceRevalidate: false });
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [performSave]);

  // Adaptive debounce with max throttle interval
  React.useEffect(() => {
    if (skipNextPersist.current) {
      skipNextPersist.current = false;
      return;
    }
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }

    if (saveTimer.current) clearTimeout(saveTimer.current);

    saveTimer.current = setTimeout(() => {
      void performSave({ forceRevalidate: false });
    }, 1500);

    if (!maxWaitTimer.current) {
      maxWaitTimer.current = setTimeout(() => {
        maxWaitTimer.current = null;
        void performSave({ forceRevalidate: false });
      }, 5000);
    }

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [title, content, performSave]);

  React.useEffect(() => {
    const onVisibilityChange = () => {
      if (
        document.visibilityState === "hidden" &&
        !sameSnapshot(latestContentRef.current, lastSyncedSnapshotRef.current)
      ) {
        flushBeaconSave();
      }
    };
    const onBeforeUnload = () => {
      if (!sameSnapshot(latestContentRef.current, lastSyncedSnapshotRef.current)) {
        flushBeaconSave();
      }
    };

    window.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [flushBeaconSave]);

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
    await performSave({ forceRevalidate: true });
  }, [performSave]);

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

  const onToggleArchive = React.useCallback(async () => {
    if (isArchiving) return;
    setIsArchiving(true);
    try {
      if (metadata.archived) {
        await unarchiveNoteAction(note.id);
        setMetadata((m) => ({ ...m, archived: false }));
        toast.success("Note restored.");
        router.refresh();
      } else {
        await archiveNoteAction(note.id);
        setMetadata((m) => ({ ...m, archived: true }));
        toast.success("Note archived.");
        router.refresh();
      }
    } catch {
      toast.error(metadata.archived ? "Failed to restore note." : "Failed to archive note.");
    } finally {
      setIsArchiving(false);
    }
  }, [isArchiving, metadata.archived, note.id, router]);

  React.useEffect(() => {
    const onAskAi = (event: Event) => {
      const detail = (event as CustomEvent<{ noteId?: string }>).detail;
      if (detail?.noteId !== note.id) return;
      document.dispatchEvent(new CustomEvent("inkest:toggle-ai-sidebar"));
    };

    window.addEventListener("inkest:ask-ai", onAskAi);
    return () => window.removeEventListener("inkest:ask-ai", onAskAi);
  }, [note.id]);

  React.useEffect(() => {
    const onFormatMarkdown = (event: Event) => {
      const detail = (event as CustomEvent<{
        noteId?: string;
        format?: MarkdownFormat;
      }>).detail;
      if (detail?.noteId !== note.id || !detail.format) return;
      applyMarkdownFormat(editorRef, detail.format);
    };

    window.addEventListener("inkest:format-markdown", onFormatMarkdown);
    return () =>
      window.removeEventListener("inkest:format-markdown", onFormatMarkdown);
  }, [note.id]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/70 bg-background/80 px-3 backdrop-blur-md sm:px-4">
        {/* Left Section: Navigation, Reading Modes, Insert Tools, History */}
        <div className="flex min-w-0 items-center gap-1 sm:gap-1.5">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={goBack}
                  aria-label="Back to notes"
                  className="text-muted-foreground hover:text-foreground"
                />
              }
            >
              <ChevronLeft className="size-4" />
            </TooltipTrigger>
            <TooltipContent>Back to notes</TooltipContent>
          </Tooltip>

          <div className="h-4 w-px bg-border/60" />

          {/* Focus & Listen Segment */}
          <div className="flex items-center gap-0.5 rounded-lg bg-muted/40 p-0.5">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                    onClick={() => openReader()}
                    aria-label="Open focus reader"
                  />
                }
              >
                <BookOpen className="size-3.5" />
                <span className="hidden sm:inline">Focus</span>
              </TooltipTrigger>
              <TooltipContent>Focus reader (Ctrl+Shift+R)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="size-7 text-muted-foreground hover:text-foreground"
                    onClick={() => openReader(true)}
                    aria-label="Listen in focus reader"
                  />
                }
              >
                <Headphones className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent>Listen in focus reader</TooltipContent>
            </Tooltip>
          </div>

          <div className="h-4 w-px bg-border/60" />

          {/* Insert Tools */}
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => triggerOpenLinkDialog(editorRef)}
                    aria-label="Insert link"
                    className="text-muted-foreground hover:text-foreground"
                  />
                }
              >
                <Link2 className="size-4" />
              </TooltipTrigger>
              <TooltipContent>Insert link (⌘K / Ctrl+K)</TooltipContent>
            </Tooltip>
            <AttachmentUploadButton editorRef={editorRef} iconOnly />
            <SpeechToTextButton editorRef={editorRef} iconOnly />
          </div>


          <div className="hidden h-4 w-px bg-border/60 sm:block" />

          {/* History Controls */}
          <div className="hidden items-center gap-0.5 sm:flex">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={undo}
                    disabled={!canUndo}
                    aria-label="Undo"
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  />
                }
              >
                <Undo2 className="size-4" />
              </TooltipTrigger>
              <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={redo}
                    disabled={!canRedo}
                    aria-label="Redo"
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  />
                }
              >
                <Redo2 className="size-4" />
              </TooltipTrigger>
              <TooltipContent>Redo (Ctrl+Y)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => openFindAndReplace(editorRef)}
                    aria-label="Find and replace"
                    className="text-muted-foreground hover:text-foreground"
                  />
                }
              >
                <Search className="size-4" />
              </TooltipTrigger>
              <TooltipContent>Find & Replace (⌘F / Ctrl+F)</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Right Section: Save Status, Note Details, Pin, More Actions */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {saveState !== "idle" && (
            <span
              key={saveState}
              className={cn(
                "save-indicator flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                saveState === "offline"
                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                  : saveState === "error"
                    ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                    : "bg-muted/60 text-muted-foreground",
              )}
            >
              {saveState === "saving" ? (
                <Loader2 className="size-3 animate-spin text-primary" />
              ) : saveState === "saved" ? (
                <Check className="size-3 text-emerald-500" />
              ) : saveState === "offline" ? (
                <CloudOff className="size-3 text-amber-500" />
              ) : (
                <AlertCircle className="size-3 text-rose-500" />
              )}
              <span className="hidden sm:inline">
                {saveState === "saving"
                  ? "Saving…"
                  : saveState === "saved"
                    ? "Saved"
                    : saveState === "offline"
                      ? "Saved locally (offline)"
                      : "Saved locally · Syncing…"}
              </span>
            </span>
          )}

          <NoteDetailsPopover
            note={note}
            metadata={metadata}
            onChange={onMetadataChange}
            allTags={allTags}
            noteTagIds={noteTagIds}
            parentCandidates={parentCandidates}
            backlinks={backlinks}
            dailyAgenda={dailyAgenda}
            projectTaskCount={projectTaskCount}
          />

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant={metadata.pinned ? "secondary" : "ghost"}
                  size="icon-sm"
                  onClick={onTogglePin}
                  aria-label={metadata.pinned ? "Unpin note" : "Pin note"}
                  className={cn(
                    "text-muted-foreground hover:text-foreground",
                    metadata.pinned &&
                      "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400",
                  )}
                />
              }
            >
              {metadata.pinned ? (
                <PinOff className="size-4" />
              ) : (
                <Pin className="size-4" />
              )}
            </TooltipTrigger>
            <TooltipContent>
              {metadata.pinned ? "Unpin note" : "Pin note"}
            </TooltipContent>
          </Tooltip>

          <DropdownMenu onOpenChange={(open) => open && setCopyMenuTouched(true)}>
            <Tooltip>
              <TooltipTrigger
                render={
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="More actions"
                        className="text-muted-foreground hover:text-foreground"
                      />
                    }
                  >
                    <MoreHorizontal className="size-4" />
                  </DropdownMenuTrigger>
                }
              />
              <TooltipContent>More actions</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => void onCopyMarkdown()}>
                  <Copy className="size-4 text-muted-foreground" />
                  Copy Markdown
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void onCopyPreview()}>
                  <FileText className="size-4 text-muted-foreground" />
                  Copy preview
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  render={
                    <a
                      href={`/api/export/note/${note.id}`}
                      aria-label="Download this note as Markdown"
                      rel="noopener"
                      className="flex w-full items-center gap-2"
                    />
                  }
                >
                  <Download className="size-4 text-muted-foreground" />
                  Export Markdown
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setVersionHistoryOpen(true)}>
                  <History className="size-4 text-muted-foreground" />
                  Version history
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() => void onToggleArchive()}
                  disabled={isArchiving}
                >
                  {metadata.archived ? (
                    <>
                      <ArchiveRestore className="size-4 text-muted-foreground" />
                      Unarchive note
                    </>
                  ) : (
                    <>
                      <Archive className="size-4 text-muted-foreground" />
                      Archive note
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={onDelete}
                >
                  <Trash2 className="size-4" />
                  Delete note
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <VersionHistoryButton
            noteId={note.id}
            open={versionHistoryOpen}
            onOpenChange={setVersionHistoryOpen}
            hideTrigger
            draft={{ title, contentMd: content }}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undo}
            onRedo={redo}
            onRestoreVersion={applyRestoredVersion}
          />
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="px-6 pt-6 sm:px-10 sm:pt-8">
            <div className="w-full">
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
                onChange={(e) => handleTitleChange(e.target.value)}
                onBlur={() => {
                  void performSave({ forceRevalidate: true });
                }}
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
                  spellcheck={editorPrefs?.spellcheck ?? true}
                  spellcheckLanguage={editorPrefs?.spellcheckLanguage ?? "auto"}
                />
                <FloatingMarkdownFormatToolbar editorRef={editorRef} />
            </div>
          </div>
        </div>
      </div>
      <div
        ref={previewCopyRef}
        aria-hidden="true"
        className="pointer-events-none absolute -left-[9999px] top-0 w-full opacity-0"
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


