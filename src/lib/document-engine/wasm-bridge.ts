/**
 * High-performance Document Engine Bridge.
 * Interfaces with the Rust/WASM Rope & CRDT core (crates/inknest-core)
 * with universal TypeScript fallback for headless operations and SSR.
 */

import { computeTextEdit, computeContentHash } from "./diff-patch";
import type { TextEdit } from "./types";

export interface DocumentPoint {
  line: number;
  column: number;
}

export interface CrdtOpId {
  client_id: string;
  seq: number;
  lamport: number;
}

export type CrdtOperation =
  | { type: "insert"; id: CrdtOpId; pos: number; text: string }
  | { type: "delete"; id: CrdtOpId; from: number; to: number };

export interface IInknestDocumentEngine {
  getText(): string;
  lenChars(): number;
  lenLines(): number;
  insert(offset: number, text: string): CrdtOperation;
  delete(from: number, to: number): CrdtOperation;
  pointToOffset(line: number, column: number): number;
  offsetToPoint(offset: number): DocumentPoint;
  computePatch(targetText: string): TextEdit | null;
  computeHash(): string;
  compactSnapshot(): string;
}

/**
 * Universal In-Memory Document Engine implementing Zed's buffer and CRDT model.
 */
export class UniversalDocumentEngine implements IInknestDocumentEngine {
  private content: string;
  private clientId: string;
  private localSeq = 0;
  private lamportClock = 0;
  private operations: CrdtOperation[] = [];

  constructor(initialText = "", clientId = "local-session") {
    this.content = initialText;
    this.clientId = clientId;
  }

  public getText(): string {
    return this.content;
  }

  public lenChars(): number {
    return this.content.length;
  }

  public lenLines(): number {
    if (this.content.length === 0) return 1;
    let count = 1;
    for (let i = 0; i < this.content.length; i++) {
      if (this.content.charCodeAt(i) === 10) count++;
    }
    return count;
  }

  private nextOpId(): CrdtOpId {
    this.localSeq++;
    this.lamportClock++;
    return {
      client_id: this.clientId,
      seq: this.localSeq,
      lamport: this.lamportClock,
    };
  }

  public insert(offset: number, text: string): CrdtOperation {
    const clamped = Math.max(0, Math.min(offset, this.content.length));
    this.content = this.content.slice(0, clamped) + text + this.content.slice(clamped);
    const op: CrdtOperation = {
      type: "insert",
      id: this.nextOpId(),
      pos: clamped,
      text,
    };
    this.operations.push(op);
    return op;
  }

  public delete(from: number, to: number): CrdtOperation {
    const clampedFrom = Math.max(0, Math.min(from, this.content.length));
    const clampedTo = Math.max(clampedFrom, Math.min(to, this.content.length));
    this.content = this.content.slice(0, clampedFrom) + this.content.slice(clampedTo);
    const op: CrdtOperation = {
      type: "delete",
      id: this.nextOpId(),
      from: clampedFrom,
      to: clampedTo,
    };
    this.operations.push(op);
    return op;
  }

  public pointToOffset(line: number, column: number): number {
    const lines = this.content.split("\n");
    let offset = 0;
    for (let i = 0; i < Math.min(line, lines.length); i++) {
      offset += lines[i].length + 1; // +1 for \n
    }
    if (line < lines.length) {
      offset += Math.min(column, lines[line].length);
    }
    return Math.min(offset, this.content.length);
  }

  public offsetToPoint(offset: number): DocumentPoint {
    const clamped = Math.max(0, Math.min(offset, this.content.length));
    const prefix = this.content.slice(0, clamped);
    const lines = prefix.split("\n");
    const line = lines.length - 1;
    const column = lines[lines.length - 1].length;
    return { line, column };
  }

  public computePatch(targetText: string): TextEdit | null {
    return computeTextEdit(this.content, targetText);
  }

  public computeHash(): string {
    return computeContentHash(this.content);
  }

  public compactSnapshot(): string {
    this.operations = [];
    return this.content;
  }
}
