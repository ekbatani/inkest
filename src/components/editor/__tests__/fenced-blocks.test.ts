import { describe, it, expect } from "bun:test";
import { EditorState } from "@codemirror/state";
import { scanFencedBlocks, findFencedBlocks } from "../fenced-blocks";

function blocksFor(doc: string) {
  return scanFencedBlocks(EditorState.create({ doc }).doc);
}

describe("scanFencedBlocks", () => {
  it("finds a simple closed fence including the fence lines", () => {
    const doc = "Intro\n\n```\nconst a = 1;\n```\n\nOutro";
    expect(blocksFor(doc)).toEqual([{ from: 7, to: 27 }]);
  });

  it("covers inline code inside fences and not outside", () => {
    const doc = "A `chip` line\n\n```\nconst a = `x`;\n```\n\nB `tail`";
    const blocks = blocksFor(doc);
    expect(blocks).toEqual([
      { from: doc.indexOf("```"), to: doc.lastIndexOf("```") + 3 },
    ]);
    const fencedCode = doc.indexOf("const a = `x`;");
    const outsideChip = doc.indexOf("A `chip`");
    expect(fencedCode > blocks[0].from && fencedCode < blocks[0].to).toBe(true);
    expect(outsideChip < blocks[0].from).toBe(true);
  });

  it("treats an unclosed fence as extending to the end of the document", () => {
    const doc = "Intro\n\n```\nconst a = 1;\nstill fenced";
    const blocks = blocksFor(doc);
    expect(blocks).toEqual([{ from: 7, to: doc.length }]);
  });

  it("matches closing fences of the same marker with at least the opening length", () => {
    const doc = "````\n```inner\n````\nafter";
    expect(blocksFor(doc)).toEqual([{ from: 0, to: 18 }]);
  });

  it("handles tilde fences and keeps backtick content inside them fenced", () => {
    const doc = "~~~\nconst a = `x`;\n~~~\n`chip`";
    const blocks = blocksFor(doc);
    expect(blocks).toEqual([{ from: 0, to: 22 }]);
    expect(doc.indexOf("`chip`") > blocks[0].to).toBe(true);
  });

  it("supports consecutive fenced blocks and ignores content between them", () => {
    const doc = "```\nA\n```\n\nmiddle\n\n```\nB\n```";
    expect(blocksFor(doc).length).toBe(2);
  });

  it("treats fences with an info string and indented fences as fenced", () => {
    const doc = "text\n\n```js\nconst a = 1;\n```\n\n  ```\n  indented\n  ```";
    expect(blocksFor(doc).length).toBe(2);
  });

  it("returns no blocks for plain prose", () => {
    expect(blocksFor("just text\n# heading\n- item")).toEqual([]);
  });

  it("handles empty documents", () => {
    expect(blocksFor("")).toEqual([]);
  });

  it("memoizes results per document version", () => {
    const state = EditorState.create({ doc: "```\nA\n```" });
    const first = findFencedBlocks(state.doc);
    const second = findFencedBlocks(state.doc);
    expect(second).toBe(first);
  });
});
