/**
 * Inverted Full-Text Search Index for large documents.
 * Allows instant, non-blocking full-text search across 50,000+ blocks.
 */

import type { DocumentBlock, DocumentModel, SearchMatch } from "./types";

export class DocumentSearchIndex {
  private documentId: string;
  // Inverted index: lowercase token -> Set of block indices
  private tokenIndex = new Map<string, Set<number>>();
  private blockTokens = new Map<string, Set<string>>();

  constructor(model?: DocumentModel) {
    this.documentId = model?.id ?? "";
    if (model) {
      this.build(model);
    }
  }

  /**
   * Builds full inverted index from document model.
   */
  public build(model: DocumentModel): void {
    this.documentId = model.id;
    this.tokenIndex.clear();
    this.blockTokens.clear();

    const blocks = model.blocks;
    for (let i = 0; i < blocks.length; i++) {
      this.indexBlock(blocks[i], i);
    }
  }

  /**
   * Incrementally updates index for dirty/invalidated blocks.
   */
  public updateBlocks(
    blocks: DocumentBlock[],
    invalidatedBlockIds: string[],
    removedBlockIds: string[],
  ): void {
    // Remove deleted blocks
    for (const removedId of removedBlockIds) {
      const tokens = this.blockTokens.get(removedId);
      if (tokens) {
        // We'll clean up empty token sets lazily during searches or re-indexes
        this.blockTokens.delete(removedId);
      }
    }

    const dirtySet = new Set(invalidatedBlockIds);
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      if (dirtySet.has(block.id)) {
        this.indexBlock(block, i);
      }
    }
  }

  private indexBlock(block: DocumentBlock, blockIndex: number): void {
    const tokens = this.tokenize(block.content);
    this.blockTokens.set(block.id, tokens);

    for (const token of tokens) {
      let set = this.tokenIndex.get(token);
      if (!set) {
        set = new Set<number>();
        this.tokenIndex.set(token, set);
      }
      set.add(blockIndex);
    }
  }

  private tokenize(text: string): Set<string> {
    const tokens = new Set<string>();
    const words = text.toLowerCase().match(/[\p{L}\p{N}_-]{2,}/gu) || [];
    for (const w of words) {
      tokens.add(w);
    }
    return tokens;
  }

  /**
   * Searches the document index for a query string.
   */
  public search(model: DocumentModel, query: string, limit = 100): SearchMatch[] {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return [];

    const queryTokens = Array.from(this.tokenize(trimmed));
    if (queryTokens.length === 0) {
      // Single character or symbol query: fallback to linear block scan
      return this.linearScan(model, query, limit);
    }

    // Intersect block candidate sets
    let candidateIndices: Set<number> | null = null;
    for (const token of queryTokens) {
      const matchingIndices = this.tokenIndex.get(token);
      if (!matchingIndices || matchingIndices.size === 0) {
        // Check prefix match
        const prefixMatches = new Set<number>();
        for (const [key, idxSet] of this.tokenIndex.entries()) {
          if (key.includes(token)) {
            for (const idx of idxSet) prefixMatches.add(idx);
          }
        }
        if (prefixMatches.size === 0) return [];
        candidateIndices = candidateIndices ? intersect(candidateIndices, prefixMatches) : prefixMatches;
      } else {
        candidateIndices = candidateIndices ? intersect(candidateIndices, matchingIndices) : new Set(matchingIndices);
      }
    }

    if (!candidateIndices || candidateIndices.size === 0) return [];

    const results: SearchMatch[] = [];
    const lowerQuery = query.toLowerCase();

    for (const idx of candidateIndices) {
      if (idx >= model.blocks.length) continue;
      const block = model.blocks[idx];
      const contentLower = block.content.toLowerCase();
      const matchPos = contentLower.indexOf(lowerQuery);

      if (matchPos !== -1) {
        const ranges: Array<{ start: number; end: number }> = [];
        let pos = 0;
        while ((pos = contentLower.indexOf(lowerQuery, pos)) !== -1) {
          ranges.push({ start: pos, end: pos + query.length });
          pos += query.length;
        }

        const previewStart = Math.max(0, matchPos - 30);
        const previewEnd = Math.min(block.content.length, matchPos + query.length + 50);
        const previewText =
          (previewStart > 0 ? "…" : "") +
          block.content.slice(previewStart, previewEnd) +
          (previewEnd < block.content.length ? "…" : "");

        results.push({
          blockId: block.id,
          blockIndex: idx,
          line: block.sourceRange.startLine,
          previewText,
          ranges,
        });

        if (results.length >= limit) break;
      }
    }

    return results;
  }

  private linearScan(model: DocumentModel, query: string, limit: number): SearchMatch[] {
    const results: SearchMatch[] = [];
    const lowerQuery = query.toLowerCase();

    for (let i = 0; i < model.blocks.length; i++) {
      const block = model.blocks[i];
      const pos = block.content.toLowerCase().indexOf(lowerQuery);
      if (pos !== -1) {
        results.push({
          blockId: block.id,
          blockIndex: i,
          line: block.sourceRange.startLine,
          previewText: block.content.slice(0, 80),
          ranges: [{ start: pos, end: pos + query.length }],
        });
        if (results.length >= limit) break;
      }
    }

    return results;
  }
}

function intersect<T>(a: Set<T>, b: Set<T>): Set<T> {
  const result = new Set<T>();
  for (const item of a) {
    if (b.has(item)) result.add(item);
  }
  return result;
}
