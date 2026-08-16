/**
 * Core type definitions for the High-Performance Document Engine.
 */

export type BlockType =
  | "heading"
  | "paragraph"
  | "code"
  | "mermaid"
  | "table"
  | "blockquote"
  | "list"
  | "thematic-break"
  | "image"
  | "math"
  | "html"
  | "custom";

export interface SourceRange {
  start: number;
  end: number;
  startLine: number;
  endLine: number;
}

export interface BlockMetadata {
  level?: number; // 1-6 for headings
  headingAnchorId?: string; // id for TOC and deep linking
  language?: string; // for fenced code blocks
  isMermaid?: boolean; // true if language === "mermaid"
  checked?: boolean; // for task list items
  isTask?: boolean; // true if list item has checkbox
  isRtl?: boolean; // RTL text detection
  caption?: string; // for images
  alt?: string;
  src?: string;
  headers?: string[]; // for tables
  rows?: string[][]; // for tables
  wordCount?: number;
  charCount?: number;
  estimatedHeight?: number; // preliminary height estimate in px
}

export interface DocumentBlock {
  /** Stable block identifier that survives non-affecting edits */
  id: string;
  type: BlockType;
  sourceRange: SourceRange;
  /** Raw markdown content of the block */
  content: string;
  /** 32/64-bit content hash for fast change detection and memoization */
  hash: string;
  metadata: BlockMetadata;
}

export interface HeadingItem {
  id: string;
  title: string;
  level: number;
  blockId: string;
  line: number;
}

export interface DocumentStats {
  blockCount: number;
  lineCount: number;
  wordCount: number;
  charCount: number;
  readingTimeMinutes: number;
  mermaidDiagramCount: number;
  tableCount: number;
  codeBlockCount: number;
}

export interface DocumentModel {
  id: string;
  version: number;
  source: string;
  blocks: DocumentBlock[];
  blockIndex: Record<string, number>;
  headings: HeadingItem[];
  stats: DocumentStats;
  totalHeightEstimate: number;
}

export interface TextEdit {
  from: number;
  to: number;
  text: string;
}

export interface DocumentPatch {
  id: string;
  documentId: string;
  baseVersion: number;
  targetVersion: number;
  timestamp: number;
  edits: TextEdit[];
  changedBlockIds?: string[];
}

export interface IncrementalParseResult {
  model: DocumentModel;
  invalidatedBlockIds: string[];
  addedBlockIds: string[];
  removedBlockIds: string[];
  reusedBlockCount: number;
  reparsedBlockCount: number;
  parseDurationMs: number;
}

export interface ViewportRange {
  scrollTop: number;
  viewportHeight: number;
  overscan?: number; // number of pixels or block count above and below
}

export interface RenderPlan {
  documentId: string;
  version: number;
  startBlockIndex: number;
  endBlockIndex: number;
  blocksToRender: DocumentBlock[];
  totalBlocks: number;
  totalHeight: number;
  offsetBefore: number;
  offsetAfter: number;
}

export interface SearchMatch {
  blockId: string;
  blockIndex: number;
  line: number;
  previewText: string;
  ranges: Array<{ start: number; end: number }>;
}

export interface WorkerMessageRequest {
  id: string;
  type:
    | "INIT_DOCUMENT"
    | "APPLY_EDIT"
    | "GET_RENDER_PLAN"
    | "SEARCH"
    | "COMPACT_SNAPSHOT"
    | "EXPORT_AST";
  payload: Record<string, unknown>;
}

export interface WorkerMessageResponse {
  id: string;
  type: "SUCCESS" | "ERROR";
  payload?: unknown;
  error?: string;
  durationMs?: number;
}
