import type { Text } from "@codemirror/state";

export type FencedBlock = { from: number; to: number };

const FENCE_OPEN_RE = /^(\s*)(`{3,}|~{3,})/;

// Fence ranges only change when the document changes, and the decoration
// builders run on every selection move, so the scan is memoized per document.
const fencedBlocksCache = new WeakMap<Text, FencedBlock[]>();

/**
 * Finds fenced code block ranges by scanning the raw text. Fence detection
 * must not depend on the syntax tree: while typing in a large note the parser
 * regularly lags behind the document, and a missing FencedCode node let the
 * inline decorators (gray code chips, links, task widgets…) run on fenced
 * lines. Fences are line-based grammar, so a linear scan is exact. The
 * semantics mirror the preview parser in lib/document-engine: a fence opens
 * with a run of at least three backticks or tildes after leading whitespace,
 * and closes with a run of the same marker at least as long alone on a line.
 */
export function scanFencedBlocks(doc: Text): FencedBlock[] {
  const blocks: FencedBlock[] = [];
  let open: { char: string; len: number; from: number } | null = null;

  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i);
    if (open) {
      const closeRe = new RegExp(`^\\s*\\${open.char}{${open.len},}\\s*$`);
      if (closeRe.test(line.text)) {
        blocks.push({ from: open.from, to: line.to });
        open = null;
      }
      continue;
    }
    const openMatch = FENCE_OPEN_RE.exec(line.text);
    if (openMatch) {
      open = { char: openMatch[2][0], len: openMatch[2].length, from: line.from };
    }
  }

  // An unclosed fence extends to the end of the document.
  if (open) {
    blocks.push({ from: open.from, to: doc.length });
  }
  return blocks;
}

export function findFencedBlocks(doc: Text): FencedBlock[] {
  let blocks = fencedBlocksCache.get(doc);
  if (!blocks) {
    blocks = scanFencedBlocks(doc);
    fencedBlocksCache.set(doc, blocks);
  }
  return blocks;
}
