import { describe, it, expect, beforeEach } from "bun:test";
import {
  getNoteScrollKey,
  getSavedNoteScroll,
  saveNoteScroll,
  clearNoteScroll,
  calculateScrollRatio,
  calculateTargetScrollTop,
} from "@/lib/notes/scroll-position";

describe("Note Scroll Position Utility", () => {
  const noteId = "test-note-123";

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

  it("generates the expected localStorage key", () => {
    expect(getNoteScrollKey(noteId)).toBe("inkest:note-scroll:test-note-123");
  });

  it("returns null when no scroll position is stored", () => {
    expect(getSavedNoteScroll(noteId)).toBeNull();
  });

  it("saves and retrieves scroll position with JSON metadata", () => {
    saveNoteScroll(noteId, {
      scrollTop: 350.6,
      scrollRatio: 0.42,
      viewMode: "live-preview",
    });

    const saved = getSavedNoteScroll(noteId);
    expect(saved).not.toBeNull();
    expect(saved?.scrollTop).toBe(351); // rounded
    expect(saved?.scrollRatio).toBe(0.42);
    expect(saved?.viewMode).toBe("live-preview");
    expect(typeof saved?.updatedAt).toBe("number");
  });

  it("parses legacy plain number strings gracefully", () => {
    window.localStorage.setItem(getNoteScrollKey(noteId), "420");
    const saved = getSavedNoteScroll(noteId);
    expect(saved).not.toBeNull();
    expect(saved?.scrollTop).toBe(420);
    expect(saved?.scrollRatio).toBe(undefined);
  });

  it("ignores corrupted data or invalid types in localStorage", () => {
    window.localStorage.setItem(getNoteScrollKey(noteId), "not-a-number-or-json");
    expect(getSavedNoteScroll(noteId)).toBeNull();

    window.localStorage.setItem(getNoteScrollKey(noteId), JSON.stringify({ scrollTop: "invalid" }));
    expect(getSavedNoteScroll(noteId)).toBeNull();
  });

  it("clears stored scroll position on note deletion", () => {
    saveNoteScroll(noteId, { scrollTop: 200 });
    expect(getSavedNoteScroll(noteId)).not.toBeNull();

    clearNoteScroll(noteId);
    expect(getSavedNoteScroll(noteId)).toBeNull();
  });

  it("calculates scroll ratio accurately and clamps to [0, 1]", () => {
    // Normal case
    expect(calculateScrollRatio(200, 1000, 500)).toBe(0.4); // 200 / 500 = 0.4

    // Top
    expect(calculateScrollRatio(0, 1000, 500)).toBe(0);

    // Beyond bottom
    expect(calculateScrollRatio(600, 1000, 500)).toBe(1);

    // Negative
    expect(calculateScrollRatio(-50, 1000, 500)).toBe(0);

    // No overflow possible
    expect(calculateScrollRatio(10, 400, 500)).toBe(0);
  });

  it("calculates target scroll top when switching view modes", () => {
    const saved = {
      scrollTop: 200,
      scrollRatio: 0.5,
      viewMode: "live-preview" as const,
    };

    // When staying in the same viewMode, uses exact pixel scrollTop clamped
    const sameModeTarget = calculateTargetScrollTop(
      saved,
      { scrollHeight: 2000, clientHeight: 500 },
      "live-preview",
    );
    expect(sameModeTarget).toBe(200);

    // When switching to reading mode, uses scrollRatio * maxScroll
    // maxScroll = 3000 - 500 = 2500 -> 0.5 * 2500 = 1250
    const switchedModeTarget = calculateTargetScrollTop(
      saved,
      { scrollHeight: 3000, clientHeight: 500 },
      "reading",
    );
    expect(switchedModeTarget).toBe(1250);

    // Clamps if target exceeds bounds
    const smallDocTarget = calculateTargetScrollTop(
      saved,
      { scrollHeight: 600, clientHeight: 500 },
      "live-preview",
    );
    expect(smallDocTarget).toBe(100); // maxScroll is 100
  });
});
