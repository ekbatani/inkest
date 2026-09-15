export interface NoteScrollData {
  scrollTop: number;
  scrollRatio?: number;
  viewMode?: "live-preview" | "source" | "reading";
  updatedAt?: number;
}

const STORAGE_PREFIX = "inkest:note-scroll:";

export function getNoteScrollKey(noteId: string): string {
  return `${STORAGE_PREFIX}${noteId}`;
}

export function getSavedNoteScroll(noteId: string): NoteScrollData | null {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(getNoteScrollKey(noteId));
    if (!raw) return null;

    // Check if it was saved as JSON
    if (raw.startsWith("{")) {
      const parsed = JSON.parse(raw) as Partial<NoteScrollData>;
      if (typeof parsed?.scrollTop === "number" && !Number.isNaN(parsed.scrollTop)) {
        return {
          scrollTop: Math.max(0, parsed.scrollTop),
          scrollRatio:
            typeof parsed.scrollRatio === "number" && !Number.isNaN(parsed.scrollRatio)
              ? Math.max(0, Math.min(1, parsed.scrollRatio))
              : undefined,
          viewMode:
            parsed.viewMode === "live-preview" ||
            parsed.viewMode === "source" ||
            parsed.viewMode === "reading"
              ? parsed.viewMode
              : undefined,
          updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : undefined,
        };
      }
    }

    // Fallback: parse as a simple number
    const num = Number.parseFloat(raw);
    if (!Number.isNaN(num) && num >= 0) {
      return { scrollTop: num };
    }
  } catch {
    // Ignore storage and parse errors
  }

  return null;
}

export function saveNoteScroll(
  noteId: string,
  data: {
    scrollTop: number;
    scrollRatio?: number;
    viewMode?: "live-preview" | "source" | "reading";
  },
): void {
  if (typeof window === "undefined" || !window.localStorage || !noteId) {
    return;
  }

  try {
    const payload: NoteScrollData = {
      scrollTop: Math.max(0, Math.round(data.scrollTop)),
      scrollRatio:
        typeof data.scrollRatio === "number" && !Number.isNaN(data.scrollRatio)
          ? Math.max(0, Math.min(1, data.scrollRatio))
          : undefined,
      viewMode: data.viewMode,
      updatedAt: Date.now(),
    };

    window.localStorage.setItem(getNoteScrollKey(noteId), JSON.stringify(payload));
  } catch {
    // Ignore storage quota and security errors
  }
}

export function clearNoteScroll(noteId: string): void {
  if (typeof window === "undefined" || !window.localStorage || !noteId) {
    return;
  }

  try {
    window.localStorage.removeItem(getNoteScrollKey(noteId));
  } catch {
    // Ignore storage errors
  }
}

export function calculateScrollRatio(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number,
): number {
  const maxScroll = scrollHeight - clientHeight;
  if (maxScroll <= 0) return 0;
  return Math.max(0, Math.min(1, scrollTop / maxScroll));
}

export function calculateTargetScrollTop(
  saved: NoteScrollData,
  metrics: { scrollHeight: number; clientHeight: number },
  currentMode?: "live-preview" | "source" | "reading",
): number {
  const maxScroll = Math.max(0, metrics.scrollHeight - metrics.clientHeight);
  if (maxScroll <= 0) return 0;

  // If saved from a different view mode and ratio is available, use semantic ratio
  if (
    currentMode &&
    saved.viewMode &&
    currentMode !== saved.viewMode &&
    typeof saved.scrollRatio === "number" &&
    saved.scrollRatio > 0
  ) {
    return Math.max(0, Math.min(maxScroll, Math.round(saved.scrollRatio * maxScroll)));
  }

  // Otherwise, use direct pixel offset clamped to current maxScroll
  return Math.max(0, Math.min(maxScroll, Math.round(saved.scrollTop)));
}
