/**
 * High-performance full & line-based Markdown block parser.
 * Converts raw Markdown strings into an indexed DocumentModel with stable block IDs.
 */

import { getHeadingAnchorId } from "@/lib/markdown/wiki";
import { containsArabicScript } from "@/lib/text/rtl";
import { hashBlock } from "./hashing";
import type {
  BlockMetadata,
  BlockType,
  DocumentBlock,
  DocumentModel,
  DocumentStats,
  HeadingItem,
  SourceRange,
} from "./types";

const HEADING_RE = /^(#{1,6})\s+(.+)$/;
const FENCE_START_RE = /^(\s*)(`{3,}|~{3,})([a-zA-Z0-9_-]*)/;
const THEMATIC_BREAK_RE = /^(\s*[-*_]\s*){3,}$/;
const BLOCKQUOTE_RE = /^\s*>/;
const LIST_ITEM_RE = /^(\s*)([-*+]|\d+\.)\s+(\[([ xX])\]\s+)?(.*)$/;
const TABLE_ROW_RE = /^\s*\|(.+)\|\s*$/;
const TABLE_DELIMITER_RE = /^\s*\|(\s*[-:]+[-| :]*)\|\s*$/;

interface RawBlock {
  type: BlockType;
  lines: string[];
  startLine: number;
  endLine: number;
  startChar: number;
  endChar: number;
  metadata: BlockMetadata;
}

/**
 * Splits markdown source text into top-level raw block boundaries.
 */
export function scanRawBlocks(source: string): RawBlock[] {
  const rawBlocks: RawBlock[] = [];
  const lines = source.split(/\r?\n/);
  const lineCount = lines.length;

  let currentLine = 0;
  let charOffset = 0;

  // Precompute line starting character offsets for fast range calculation
  const lineStartOffsets = new Int32Array(lineCount + 1);
  for (let i = 0; i < lineCount; i++) {
    lineStartOffsets[i] = charOffset;
    charOffset += lines[i].length + 1; // +1 for the newline character
  }
  lineStartOffsets[lineCount] = charOffset;

  while (currentLine < lineCount) {
    const line = lines[currentLine];
    const trimmed = line.trim();

    // Skip empty lines between blocks
    if (!trimmed) {
      currentLine++;
      continue;
    }

    const startLine = currentLine;
    const startChar = lineStartOffsets[startLine];

    // 1. Fenced Code Block / Mermaid
    const fenceMatch = line.match(FENCE_START_RE);
    if (fenceMatch) {
      const fenceChar = fenceMatch[2][0];
      const fenceLen = fenceMatch[2].length;
      const lang = (fenceMatch[3] || "").toLowerCase().trim();
      const isMermaid = lang === "mermaid";
      const blockLines: string[] = [line];
      currentLine++;

      while (currentLine < lineCount) {
        const curLine = lines[currentLine];
        blockLines.push(curLine);
        const closeMatch = curLine.match(new RegExp(`^\\s*${fenceChar}{${fenceLen},}\\s*$`));
        if (closeMatch) {
          currentLine++;
          break;
        }
        currentLine++;
      }

      const endLine = currentLine - 1;
      const endChar = lineStartOffsets[endLine] + lines[endLine].length;
      const lineLen = blockLines.length;

      rawBlocks.push({
        type: isMermaid ? "mermaid" : "code",
        lines: blockLines,
        startLine,
        endLine,
        startChar,
        endChar,
        metadata: {
          language: lang || undefined,
          isMermaid,
          estimatedHeight: isMermaid ? 240 : Math.max(48, lineLen * 22 + 32),
        },
      });
      continue;
    }

    // 2. Headings
    const headingMatch = line.match(HEADING_RE);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const title = headingMatch[2].trim();
      const anchor = getHeadingAnchorId(title);
      const isRtl = containsArabicScript(title);

      rawBlocks.push({
        type: "heading",
        lines: [line],
        startLine,
        endLine: startLine,
        startChar,
        endChar: startChar + line.length,
        metadata: {
          level,
          headingAnchorId: anchor,
          isRtl,
          estimatedHeight: level === 1 ? 58 : level === 2 ? 46 : 38,
        },
      });
      currentLine++;
      continue;
    }

    // 3. Thematic Breaks (---, ***, ___)
    if (THEMATIC_BREAK_RE.test(line)) {
      rawBlocks.push({
        type: "thematic-break",
        lines: [line],
        startLine,
        endLine: startLine,
        startChar,
        endChar: startChar + line.length,
        metadata: {
          estimatedHeight: 24,
        },
      });
      currentLine++;
      continue;
    }

    // 4. Tables
    if (TABLE_ROW_RE.test(line) && currentLine + 1 < lineCount && TABLE_DELIMITER_RE.test(lines[currentLine + 1])) {
      const tableLines: string[] = [line, lines[currentLine + 1]];
      currentLine += 2;

      while (currentLine < lineCount && TABLE_ROW_RE.test(lines[currentLine])) {
        tableLines.push(lines[currentLine]);
        currentLine++;
      }

      const endLine = currentLine - 1;
      const endChar = lineStartOffsets[endLine] + lines[endLine].length;

      // Extract headers and rows
      const headerCells = line
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim());

      const dataRows = tableLines.slice(2).map((rowLine) =>
        rowLine
          .slice(1, -1)
          .split("|")
          .map((c) => c.trim()),
      );

      rawBlocks.push({
        type: "table",
        lines: tableLines,
        startLine,
        endLine,
        startChar,
        endChar,
        metadata: {
          headers: headerCells,
          rows: dataRows,
          estimatedHeight: Math.max(60, tableLines.length * 36 + 20),
        },
      });
      continue;
    }

    // 5. Blockquotes
    if (BLOCKQUOTE_RE.test(line)) {
      const quoteLines: string[] = [line];
      currentLine++;

      while (currentLine < lineCount) {
        const curLine = lines[currentLine];
        if (!curLine.trim()) break; // empty line terminates blockquote
        if (BLOCKQUOTE_RE.test(curLine) || (!curLine.startsWith("#") && !curLine.startsWith("```"))) {
          quoteLines.push(curLine);
          currentLine++;
        } else {
          break;
        }
      }

      const endLine = currentLine - 1;
      const endChar = lineStartOffsets[endLine] + lines[endLine].length;

      rawBlocks.push({
        type: "blockquote",
        lines: quoteLines,
        startLine,
        endLine,
        startChar,
        endChar,
        metadata: {
          isRtl: containsArabicScript(quoteLines.join(" ")),
          estimatedHeight: Math.max(40, quoteLines.length * 26 + 16),
        },
      });
      continue;
    }

    // 6. Lists (ordered, unordered, task lists)
    const listMatch = line.match(LIST_ITEM_RE);
    if (listMatch) {
      const listLines: string[] = [line];
      let hasTask = Boolean(listMatch[3]);
      const isChecked = listMatch[4]?.toLowerCase() === "x";
      currentLine++;

      while (currentLine < lineCount) {
        const curLine = lines[currentLine];
        if (!curLine.trim()) {
          // Check if subsequent line continues the list
          if (currentLine + 1 < lineCount && (LIST_ITEM_RE.test(lines[currentLine + 1]) || /^\s{2,}/.test(lines[currentLine + 1]))) {
            listLines.push(curLine);
            currentLine++;
            continue;
          }
          break;
        }

        const nextListMatch = curLine.match(LIST_ITEM_RE);
        if (nextListMatch || /^\s{2,}/.test(curLine)) {
          if (nextListMatch && nextListMatch[3]) {
            hasTask = true;
          }
          listLines.push(curLine);
          currentLine++;
        } else {
          break;
        }
      }

      const endLine = currentLine - 1;
      const endChar = lineStartOffsets[endLine] + lines[endLine].length;

      rawBlocks.push({
        type: "list",
        lines: listLines,
        startLine,
        endLine,
        startChar,
        endChar,
        metadata: {
          isTask: hasTask,
          checked: isChecked,
          isRtl: containsArabicScript(listLines.join(" ")),
          estimatedHeight: Math.max(32, listLines.length * 28 + 8),
        },
      });
      continue;
    }

    // 7. Standalone Images: ![alt](url)
    const imageMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (imageMatch) {
      rawBlocks.push({
        type: "image",
        lines: [line],
        startLine,
        endLine: startLine,
        startChar,
        endChar: startChar + line.length,
        metadata: {
          alt: imageMatch[1],
          src: imageMatch[2],
          estimatedHeight: 220,
        },
      });
      currentLine++;
      continue;
    }

    // 8. Paragraph (default fallback)
    const paraLines: string[] = [line];
    currentLine++;

    while (currentLine < lineCount) {
      const curLine = lines[currentLine];
      if (!curLine.trim()) break;

      // Stop if new line starts another structural block
      if (
        HEADING_RE.test(curLine) ||
        FENCE_START_RE.test(curLine) ||
        THEMATIC_BREAK_RE.test(curLine) ||
        BLOCKQUOTE_RE.test(curLine) ||
        LIST_ITEM_RE.test(curLine) ||
        (TABLE_ROW_RE.test(curLine) && currentLine + 1 < lineCount && TABLE_DELIMITER_RE.test(lines[currentLine + 1]))
      ) {
        break;
      }

      paraLines.push(curLine);
      currentLine++;
    }

    const endLine = currentLine - 1;
    const endChar = lineStartOffsets[endLine] + lines[endLine].length;
    const fullParaText = paraLines.join("\n");

    rawBlocks.push({
      type: "paragraph",
      lines: paraLines,
      startLine,
      endLine,
      startChar,
      endChar,
      metadata: {
        isRtl: containsArabicScript(fullParaText),
        wordCount: countWords(fullParaText),
        charCount: fullParaText.length,
        estimatedHeight: Math.max(28, Math.ceil(fullParaText.length / 75) * 26 + 12),
      },
    });
  }

  return rawBlocks;
}

function countWords(text: string): number {
  const match = text.trim().match(/\S+/g);
  return match ? match.length : 0;
}

/**
 * Parses full Markdown string into a complete DocumentModel.
 */
export function parseDocument(source: string, documentId = "doc", version = 1): DocumentModel {
  const rawBlocks = scanRawBlocks(source);
  const blocks: DocumentBlock[] = [];
  const blockIndex: Record<string, number> = {};
  const headings: HeadingItem[] = [];

  let totalWords = 0;
  let totalChars = 0;
  let totalHeight = 0;
  let mermaidCount = 0;
  let tableCount = 0;
  let codeCount = 0;

  const blockCount = rawBlocks.length;
  for (let i = 0; i < blockCount; i++) {
    const raw = rawBlocks[i];
    const content = raw.lines.join("\n");
    const hash = hashBlock(raw.type, content, String(raw.metadata.level ?? ""));

    // Stable block ID derived deterministically
    const id = `blk-${i}-${hash.slice(0, 8)}`;

    const sourceRange: SourceRange = {
      start: raw.startChar,
      end: raw.endChar,
      startLine: raw.startLine,
      endLine: raw.endLine,
    };

    const block: DocumentBlock = {
      id,
      type: raw.type,
      sourceRange,
      content,
      hash,
      metadata: raw.metadata,
    };

    blocks.push(block);
    blockIndex[id] = i;
    totalHeight += block.metadata.estimatedHeight ?? 32;

    if (raw.type === "heading" && raw.metadata.level) {
      headings.push({
        id: raw.metadata.headingAnchorId || getHeadingAnchorId(content.replace(/^#+\s*/, "")),
        title: content.replace(/^#+\s*/, "").trim(),
        level: raw.metadata.level,
        blockId: id,
        line: raw.startLine,
      });
    }

    if (raw.type === "mermaid") mermaidCount++;
    else if (raw.type === "code") codeCount++;
    else if (raw.type === "table") tableCount++;

    totalWords += raw.metadata.wordCount ?? countWords(content);
    totalChars += content.length;
  }

  const lines = source.split(/\r?\n/);
  const stats: DocumentStats = {
    blockCount: blocks.length,
    lineCount: lines.length,
    wordCount: totalWords,
    charCount: totalChars,
    readingTimeMinutes: Math.max(1, Math.ceil(totalWords / 200)),
    mermaidDiagramCount: mermaidCount,
    tableCount,
    codeBlockCount: codeCount,
  };

  return {
    id: documentId,
    version,
    source,
    blocks,
    blockIndex,
    headings,
    stats,
    totalHeightEstimate: Math.max(totalHeight, 100),
  };
}
