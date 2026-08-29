/**
 * High-performance text diff and patch utilities for differential note persistence.
 * Uses an optimal single-pass prefix/suffix scan to compute minimal range replacements in O(N) time.
 */

import { hashFnv1a32 } from "./hashing";
import type { TextEdit } from "./types";

/**
 * Computes the optimal minimal TextEdit between oldText and newText.
 * Returns null if the texts are identical.
 */
export function computeTextEdit(oldText: string, newText: string): TextEdit | null {
  if (oldText === newText) return null;

  const oldLen = oldText.length;
  const newLen = newText.length;

  // Find common prefix length
  let prefix = 0;
  while (prefix < oldLen && prefix < newLen && oldText.charCodeAt(prefix) === newText.charCodeAt(prefix)) {
    prefix++;
  }

  // Find common suffix length (ensuring suffix does not overlap prefix)
  let oldSuffix = oldLen;
  let newSuffix = newLen;
  while (
    oldSuffix > prefix &&
    newSuffix > prefix &&
    oldText.charCodeAt(oldSuffix - 1) === newText.charCodeAt(newSuffix - 1)
  ) {
    oldSuffix--;
    newSuffix--;
  }

  return {
    from: prefix,
    to: oldSuffix,
    text: newText.slice(prefix, newSuffix),
  };
}

/**
 * Applies a list of text edits onto a base string.
 * Edits are applied in reverse offset order (from highest index to lowest)
 * so preceding positions remain stable without coordinate shifting.
 */
export function applyTextEdits(base: string, edits: TextEdit[]): string {
  if (!edits || edits.length === 0) return base;

  // Sort descending by starting offset
  const sorted = [...edits].sort((a, b) => b.from - a.from || b.to - a.to);
  let result = base;

  for (const edit of sorted) {
    if (edit.from < 0 || edit.to > result.length || edit.from > edit.to) {
      throw new Error(
        `Invalid text edit range [${edit.from}, ${edit.to}] on text of length ${result.length}`,
      );
    }
    result = result.slice(0, edit.from) + edit.text + result.slice(edit.to);
  }

  return result;
}

/**
 * Computes a fast deterministic 32-bit FNV-1a hash of note content for base validation.
 */
export function computeContentHash(content: string): string {
  return hashFnv1a32(content ?? "");
}
