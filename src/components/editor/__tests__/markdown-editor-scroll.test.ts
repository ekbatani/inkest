import { describe, it, expect, beforeEach } from "bun:test";
import {
  getSavedNoteScroll,
  saveNoteScroll,
  clearNoteScroll,
  calculateScrollRatio,
  calculateTargetScrollTop,
} from "@/lib/notes/scroll-position";

describe("Markdown Editor Scroll Persistence & Restoration", () => {
  const noteId = "note-doc-999";

  beforeEach(() => {
    const store = new Map<string, string>();
    globalThis.window = {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
        removeItem: (key: string) => store.delete(key),
        clear: () => store.clear(),
        length: 0,
        key: () => null,
      } as unknown as Storage,
    } as unknown as Window & typeof globalThis;
  });

  it("persists scroll position for a note with ratio and mode", () => {
    const scroller = {
      scrollTop: 450,
      scrollHeight: 2000,
      clientHeight: 500,
    };

    const ratio = calculateScrollRatio(
      scroller.scrollTop,
      scroller.scrollHeight,
      scroller.clientHeight,
    );
    expect(ratio).toBe(0.3); // 450 / 1500 = 0.3

    saveNoteScroll(noteId, {
      scrollTop: scroller.scrollTop,
      scrollRatio: ratio,
      viewMode: "live-preview",
    });

    const saved = getSavedNoteScroll(noteId);
    expect(saved).not.toBeNull();
    expect(saved?.scrollTop).toBe(450);
    expect(saved?.scrollRatio).toBe(0.3);
    expect(saved?.viewMode).toBe("live-preview");
  });

  it("restores exact scroll offset when in the same viewMode", () => {
    saveNoteScroll(noteId, {
      scrollTop: 600,
      scrollRatio: 0.4,
      viewMode: "live-preview",
    });

    const saved = getSavedNoteScroll(noteId)!;
    const target = calculateTargetScrollTop(
      saved,
      { scrollHeight: 2000, clientHeight: 500 },
      "live-preview",
    );

    expect(target).toBe(600);
  });

  it("translates scroll position proportionally when switching to reading mode", () => {
    // In live-preview, user was at 50% scroll (ratio = 0.5)
    saveNoteScroll(noteId, {
      scrollTop: 500,
      scrollRatio: 0.5,
      viewMode: "live-preview",
    });

    const saved = getSavedNoteScroll(noteId)!;
    // In reading mode, HTML rendered content has different height (e.g. scrollHeight = 3500)
    // maxScroll = 3500 - 500 = 3000
    // target = 0.5 * 3000 = 1500
    const readingTarget = calculateTargetScrollTop(
      saved,
      { scrollHeight: 3500, clientHeight: 500 },
      "reading",
    );

    expect(readingTarget).toBe(1500);
  });

  it("isolates scroll positions by note ID", () => {
    saveNoteScroll("note-A", { scrollTop: 100, viewMode: "live-preview" });
    saveNoteScroll("note-B", { scrollTop: 750, viewMode: "live-preview" });

    expect(getSavedNoteScroll("note-A")?.scrollTop).toBe(100);
    expect(getSavedNoteScroll("note-B")?.scrollTop).toBe(750);

    clearNoteScroll("note-A");
    expect(getSavedNoteScroll("note-A")).toBeNull();
    expect(getSavedNoteScroll("note-B")?.scrollTop).toBe(750);
  });

  it("handles empty note or zero-scroll gracefully", () => {
    saveNoteScroll(noteId, {
      scrollTop: 0,
      scrollRatio: 0,
      viewMode: "live-preview",
    });

    const saved = getSavedNoteScroll(noteId)!;
    const target = calculateTargetScrollTop(
      saved,
      { scrollHeight: 500, clientHeight: 500 }, // no overflow
      "live-preview",
    );

    expect(target).toBe(0);
  });
});
