import { describe, expect, it } from "bun:test";
import { computeTextEdit, applyTextEdits, computeContentHash } from "../diff-patch";
import type { TextEdit } from "../types";

describe("Document Engine - Diff & Patch", () => {
  it("computes null edit for identical strings", () => {
    expect(computeTextEdit("hello world", "hello world")).toBeNull();
    expect(computeTextEdit("", "")).toBeNull();
  });

  it("computes single insertion in middle", () => {
    const oldText = "Hello world!";
    const newText = "Hello beautiful world!";
    const edit = computeTextEdit(oldText, newText);

    expect(edit).not.toBeNull();
    expect(edit!).toEqual({
      from: 6,
      to: 6,
      text: "beautiful ",
    });

    const applied = applyTextEdits(oldText, [edit!]);
    expect(applied).toBe(newText);
  });

  it("computes single deletion in middle", () => {
    const oldText = "Hello beautiful world!";
    const newText = "Hello world!";
    const edit = computeTextEdit(oldText, newText);

    expect(edit).not.toBeNull();
    expect(edit!).toEqual({
      from: 6,
      to: 16,
      text: "",
    });

    const applied = applyTextEdits(oldText, [edit!]);
    expect(applied).toBe(newText);
  });

  it("computes append and prepend correctly", () => {
    // Prepend
    const oldPre = "world";
    const newPre = "Hello world";
    const editPre = computeTextEdit(oldPre, newPre);
    expect(editPre).toEqual({ from: 0, to: 0, text: "Hello " });
    expect(applyTextEdits(oldPre, [editPre!])).toBe(newPre);

    // Append
    const oldApp = "Hello";
    const newApp = "Hello world";
    const editApp = computeTextEdit(oldApp, newApp);
    expect(editApp).toEqual({ from: 5, to: 5, text: " world" });
    expect(applyTextEdits(oldApp, [editApp!])).toBe(newApp);
  });

  it("handles replacement of entire text and empty strings", () => {
    // From empty
    const editFromEmpty = computeTextEdit("", "# My Title");
    expect(editFromEmpty).toEqual({ from: 0, to: 0, text: "# My Title" });
    expect(applyTextEdits("", [editFromEmpty!])).toBe("# My Title");

    // To empty
    const editToEmpty = computeTextEdit("# My Title", "");
    expect(editToEmpty).toEqual({ from: 0, to: 10, text: "" });
    expect(applyTextEdits("# My Title", [editToEmpty!])).toBe("");

    // Complete replace (shares suffix 'a')
    const editFull = computeTextEdit("Alpha", "Omega");
    expect(editFull).toEqual({ from: 0, to: 4, text: "Omeg" });
    expect(applyTextEdits("Alpha", [editFull!])).toBe("Omega");

    // Complete replace with no shared prefix/suffix
    const editDisjoint = computeTextEdit("ABC", "XYZ");
    expect(editDisjoint).toEqual({ from: 0, to: 3, text: "XYZ" });
    expect(applyTextEdits("ABC", [editDisjoint!])).toBe("XYZ");
  });

  it("handles multi-byte and Persian/Arabic characters correctly", () => {
    const oldText = "سلام دنیا و روزگار";
    const newText = "سلام دنیای زیبای ما و روزگار";
    const edit = computeTextEdit(oldText, newText);

    expect(edit).not.toBeNull();
    const applied = applyTextEdits(oldText, [edit!]);
    expect(applied).toBe(newText);
  });

  it("applies multiple non-overlapping edits in descending order", () => {
    const base = "The quick brown fox jumps over the lazy dog";
    const edits: TextEdit[] = [
      { from: 4, to: 9, text: "slow" }, // replace 'quick' with 'slow'
      { from: 35, to: 39, text: "active" }, // replace 'lazy' with 'active'
    ];

    const result = applyTextEdits(base, edits);
    expect(result).toBe("The slow brown fox jumps over the active dog");
  });

  it("computes deterministic FNV-1a content hash", () => {
    const text = "Consistent note content #tag";
    const h1 = computeContentHash(text);
    const h2 = computeContentHash(text);
    expect(h1).toBe(h2);
    expect(h1.length).toBe(8);

    const hDiff = computeContentHash(text + "!");
    expect(h1 === hDiff).toBe(false);
  });
});
