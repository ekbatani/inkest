import { describe, expect, it } from "bun:test";
import { parseDocument } from "../parser";
import { applyIncrementalEdit } from "../incremental-parser";
import { hashBlock, hashFnv1a32, hashFnv1a64, hashMermaid } from "../hashing";
import { DocumentSearchIndex } from "../search-index";
import { compressText, decompressText, serializeAndCompressModel, decompressAndDeserializeModel } from "../compression";
import { mermaidCache } from "../mermaid-cache";
import type { TextEdit } from "../types";

describe("Document Engine - Hashing", () => {
  it("computes deterministic FNV-1a hashes", () => {
    const text = "Hello, high performance document engine!";
    const h32_1 = hashFnv1a32(text);
    const h32_2 = hashFnv1a32(text);
    expect(h32_1).toBe(h32_2);
    expect(h32_1.length).toBe(8);

    const h64_1 = hashFnv1a64(text);
    const h64_2 = hashFnv1a64(text);
    expect(h64_1).toBe(h64_2);
    expect(h64_1.length).toBe(16);
  });

  it("produces distinct hashes for different contents or block types", () => {
    const h1 = hashBlock("paragraph", "Sample text");
    const h2 = hashBlock("heading", "Sample text");
    const h3 = hashBlock("paragraph", "Different text");

    expect(h1 === h2).toBe(false);
    expect(h1 === h3).toBe(false);
  });

  it("produces distinct Mermaid hashes across themes", () => {
    const code = "graph TD\nA --> B";
    const hDark = hashMermaid(code, "dark");
    const hDefault = hashMermaid(code, "default");
    expect(hDark === hDefault).toBe(false);
  });
});

describe("Document Engine - Parser", () => {
  const sampleMarkdown = `# Document Title

This is an introductory paragraph with **bold** and *italic* text.

## Section 1: Code and Diagrams

\`\`\`typescript
const a = 1;
const b = 2;
console.log(a + b);
\`\`\`

\`\`\`mermaid
graph TD
  Start --> Stop
\`\`\`

## Section 2: Tables & Lists

| Header 1 | Header 2 |
| -------- | -------- |
| Value A  | Value B  |
| Value C  | Value D  |

- [ ] Task 1
- [x] Task 2 (completed)
- Simple bullet

> This is a blockquote.

---
`;

  it("parses all structural blocks correctly", () => {
    const model = parseDocument(sampleMarkdown, "doc-1");

    expect(model.id).toBe("doc-1");
    expect(model.blocks.length >= 8).toBe(true);

    // Block types
    const types = model.blocks.map((b) => b.type);
    expect(types.includes("heading")).toBe(true);
    expect(types.includes("paragraph")).toBe(true);
    expect(types.includes("code")).toBe(true);
    expect(types.includes("mermaid")).toBe(true);
    expect(types.includes("table")).toBe(true);
    expect(types.includes("list")).toBe(true);
    expect(types.includes("blockquote")).toBe(true);
    expect(types.includes("thematic-break")).toBe(true);

    // Headings
    expect(model.headings.length).toBe(3);
    expect(model.headings[0].title).toBe("Document Title");
    expect(model.headings[0].level).toBe(1);
    expect(model.headings[1].title).toBe("Section 1: Code and Diagrams");
    expect(model.headings[1].level).toBe(2);

    // Stats
    expect(model.stats.mermaidDiagramCount).toBe(1);
    expect(model.stats.codeBlockCount).toBe(1);
    expect(model.stats.tableCount).toBe(1);
    expect(model.stats.wordCount > 20).toBe(true);
  });

  it("generates stable block IDs and valid source ranges", () => {
    const model = parseDocument(sampleMarkdown);
    for (const block of model.blocks) {
      expect(/^blk-\d+-[a-f0-9]{8}$/.test(block.id)).toBe(true);
      expect(block.sourceRange.start < block.sourceRange.end).toBe(true);
      expect(block.sourceRange.startLine <= block.sourceRange.endLine).toBe(true);

      // Verify that source slice matches block content
      const slice = model.source.slice(block.sourceRange.start, block.sourceRange.end);
      expect(slice).toBe(block.content);
    }
  });
});

describe("Document Engine - Incremental Parser", () => {
  const baseMarkdown = `# Heading 1

First paragraph with some text.

Second paragraph that will remain unchanged.

Third paragraph at the end.`;

  it("re-parses only affected blocks and preserves unchanged block IDs", () => {
    const initialModel = parseDocument(baseMarkdown, "doc-inc");
    expect(initialModel.blocks.length).toBe(4);

    const secondBlockIdBefore = initialModel.blocks[2].id;
    const secondBlockHashBefore = initialModel.blocks[2].hash;

    // Edit inside first paragraph: "First paragraph with some text." -> "First paragraph with MODIFIED text."
    const editStart = baseMarkdown.indexOf("some");
    const editEnd = editStart + "some".length;
    const edit: TextEdit = {
      from: editStart,
      to: editEnd,
      text: "MODIFIED",
    };

    const result = applyIncrementalEdit(initialModel, edit);

    expect(result.model.blocks.length).toBe(4);
    expect(result.model.source.includes("First paragraph with MODIFIED text.")).toBe(true);

    // The second paragraph should be completely reused with identical ID and Hash
    const secondBlockAfter = result.model.blocks[2];
    expect(secondBlockAfter.id).toBe(secondBlockIdBefore);
    expect(secondBlockAfter.hash).toBe(secondBlockHashBefore);
    expect(secondBlockAfter.content).toBe("Second paragraph that will remain unchanged.");

    // Reused count should be >= 2
    expect(result.reusedBlockCount >= 2).toBe(true);
  });

  it("yields identical content to a fresh full parse", () => {
    const initialModel = parseDocument(baseMarkdown, "doc-inc");
    const editStart = baseMarkdown.indexOf("Third paragraph");
    const edit: TextEdit = {
      from: editStart,
      to: editStart + "Third".length,
      text: "NEW Third",
    };

    const incResult = applyIncrementalEdit(initialModel, edit);
    const fullModel = parseDocument(incResult.model.source, "doc-inc", initialModel.version + 1);

    expect(incResult.model.blocks.length).toBe(fullModel.blocks.length);
    for (let i = 0; i < fullModel.blocks.length; i++) {
      expect(incResult.model.blocks[i].content).toBe(fullModel.blocks[i].content);
      expect(incResult.model.blocks[i].type).toBe(fullModel.blocks[i].type);
      expect(incResult.model.blocks[i].hash).toBe(fullModel.blocks[i].hash);
    }
  });
});

describe("Document Engine - Inverted Search Index", () => {
  const doc = `# Guide to TypeScript

TypeScript is a typed superset of JavaScript that compiles to plain JavaScript.

## Fast Compilation

Bun provides an ultra-fast JavaScript and TypeScript runtime.

## Mermaid Support

Create flowcharts and sequence diagrams effortlessly.`;

  it("finds matching blocks and generates snippets", () => {
    const model = parseDocument(doc);
    const searchIndex = new DocumentSearchIndex(model);

    const matches = searchIndex.search(model, "JavaScript");
    expect(matches.length >= 1).toBe(true);
    expect(matches[0].blockId).toBe(model.blocks[1].id);
    expect(matches[0].previewText.toLowerCase().includes("javascript")).toBe(true);

    const bunMatches = searchIndex.search(model, "runtime");
    expect(bunMatches.length).toBe(1);

    const nonMatches = searchIndex.search(model, "nonexistentwordxyz");
    expect(nonMatches.length).toBe(0);
  });
});

describe("Document Engine - Compression & Serialization", () => {
  it("compresses and decompresses text losslessly", async () => {
    const sample = "High performance compression test string repeated! ".repeat(50);
    const compressed = await compressText(sample);
    expect(compressed.byteLength < sample.length).toBe(true);

    const restored = await decompressText(compressed);
    expect(restored).toBe(sample);
  });

  it("serializes and deserializes DocumentModel", async () => {
    const model = parseDocument("# My Note\n\nSome body text.");
    const compressed = await serializeAndCompressModel(model);
    expect(compressed instanceof Uint8Array).toBe(true);

    const restored = await decompressAndDeserializeModel(compressed, parseDocument);
    expect(restored.source).toBe(model.source);
    expect(restored.blocks.length).toBe(model.blocks.length);
  });
});

describe("Document Engine - Mermaid Cache", () => {
  it("caches and retrieves rendered SVGs", async () => {
    const code = "graph LR\n  A --> B";
    const fakeSvg = "<svg>Fake Rendered Diagram</svg>";

    // Set in cache
    await mermaidCache.set(code, fakeSvg, "default");

    // Immediate synchronous check
    const sync = mermaidCache.getSynchronous(code, "default");
    expect(sync).toBe(fakeSvg);

    // Asynchronous check
    const asyncSvg = await mermaidCache.get(code, "default");
    expect(asyncSvg).toBe(fakeSvg);
  });
});
