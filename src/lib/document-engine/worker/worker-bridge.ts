/**
 * Client RPC bridge for the Document Engine Web Worker.
 * Dispatches CPU-heavy document parsing and search tasks to the background worker
 * with transparent fallback to in-thread execution when workers are unavailable.
 */

import { serializeAndCompressModel } from "../compression";
import { applyIncrementalEdit } from "../incremental-parser";
import { parseDocument } from "../parser";
import { DocumentSearchIndex } from "../search-index";
import type {
  DocumentModel,
  IncrementalParseResult,
  RenderPlan,
  SearchMatch,
  TextEdit,
  ViewportRange,
  WorkerMessageRequest,
  WorkerMessageResponse,
} from "../types";

let messageCounter = 0;

class DocumentEngineBridge {
  private worker: Worker | null = null;
  private pendingRequests = new Map<
    string,
    {
      resolve: (value: unknown) => void;
      reject: (reason?: unknown) => void;
    }
  >();

  // In-thread fallback state
  private fallbackDocs = new Map<string, DocumentModel>();
  private fallbackIndices = new Map<string, DocumentSearchIndex>();

  constructor() {
    this.initWorker();
  }

  private initWorker(): void {
    if (typeof window === "undefined" || typeof Worker === "undefined") {
      return;
    }

    try {
      // In Next.js App Router, workers can be loaded via Webpack/Turbopack worker URLs or Blob
      this.worker = new Worker(
        new URL("./document.worker.ts", import.meta.url),
        { type: "module" },
      );

      this.worker.onmessage = (e: MessageEvent<WorkerMessageResponse>) => {
        const { id, type, payload, error } = e.data;
        const pending = this.pendingRequests.get(id);
        if (!pending) return;

        this.pendingRequests.delete(id);
        if (type === "SUCCESS") {
          pending.resolve(payload);
        } else {
          pending.reject(new Error(error || "Worker operation failed"));
        }
      };

      this.worker.onerror = (err) => {
        // Fallback gracefully to in-thread parsing
        console.warn("Document engine worker encountered an error, using in-thread fallback:", err);
      };
    } catch {
      // Worker construction not available in current environment; use in-thread fallback
      this.worker = null;
    }
  }

  private sendRequest<T>(
    type: WorkerMessageRequest["type"],
    payload: Record<string, unknown>,
  ): Promise<T> {
    if (!this.worker) {
      return this.handleInThread<T>(type, payload);
    }

    const id = `req-${++messageCounter}-${Date.now()}`;
    return new Promise<T>((resolve, reject) => {
      this.pendingRequests.set(id, {
        resolve: resolve as (val: unknown) => void,
        reject,
      });

      const message: WorkerMessageRequest = { id, type, payload };
      this.worker!.postMessage(message);
    });
  }

  /**
   * In-thread fallback when Web Workers are unavailable or errored.
   */
  private async handleInThread<T>(
    type: WorkerMessageRequest["type"],
    payload: Record<string, unknown>,
  ): Promise<T> {
    switch (type) {
      case "INIT_DOCUMENT": {
        const { documentId, source, version } = payload as {
          documentId: string;
          source: string;
          version?: number;
        };
        const model = parseDocument(source, documentId, version ?? 1);
        this.fallbackDocs.set(documentId, model);
        const index = new DocumentSearchIndex(model);
        this.fallbackIndices.set(documentId, index);
        return { model } as T;
      }

      case "APPLY_EDIT": {
        const { documentId, edit } = payload as {
          documentId: string;
          edit: TextEdit;
        };
        let prevModel = this.fallbackDocs.get(documentId);
        if (!prevModel) {
          prevModel = parseDocument("", documentId, 1);
        }
        const result = applyIncrementalEdit(prevModel, edit);
        this.fallbackDocs.set(documentId, result.model);

        let index = this.fallbackIndices.get(documentId);
        if (!index) {
          index = new DocumentSearchIndex(result.model);
          this.fallbackIndices.set(documentId, index);
        } else {
          index.updateBlocks(
            result.model.blocks,
            result.invalidatedBlockIds,
            result.removedBlockIds,
          );
        }
        return result as T;
      }

      case "GET_RENDER_PLAN": {
        const { documentId, viewport } = payload as {
          documentId: string;
          viewport: ViewportRange;
        };
        const model = this.fallbackDocs.get(documentId);
        if (!model) {
          throw new Error(`Document not initialized: ${documentId}`);
        }
        return this.computeLocalRenderPlan(model, viewport) as T;
      }

      case "SEARCH": {
        const { documentId, query, limit } = payload as {
          documentId: string;
          query: string;
          limit?: number;
        };
        const model = this.fallbackDocs.get(documentId);
        if (!model) return { matches: [] } as T;

        let index = this.fallbackIndices.get(documentId);
        if (!index) {
          index = new DocumentSearchIndex(model);
          this.fallbackIndices.set(documentId, index);
        }
        const matches = index.search(model, query, limit ?? 100);
        return { matches } as T;
      }

      case "COMPACT_SNAPSHOT": {
        const { documentId } = payload as { documentId: string };
        const model = this.fallbackDocs.get(documentId);
        if (!model) throw new Error(`Document not found: ${documentId}`);
        const compressed = await serializeAndCompressModel(model);
        return { compressed, version: model.version } as T;
      }

      default:
        throw new Error(`Unsupported fallback type: ${type}`);
    }
  }

  private computeLocalRenderPlan(
    model: DocumentModel,
    viewport: ViewportRange,
  ): RenderPlan {
    const { scrollTop, viewportHeight, overscan = 600 } = viewport;
    const blocks = model.blocks;
    const totalBlocks = blocks.length;

    if (totalBlocks === 0) {
      return {
        documentId: model.id,
        version: model.version,
        startBlockIndex: 0,
        endBlockIndex: 0,
        blocksToRender: [],
        totalBlocks: 0,
        totalHeight: 0,
        offsetBefore: 0,
        offsetAfter: 0,
      };
    }

    const visibleTop = Math.max(0, scrollTop - overscan);
    const visibleBottom = scrollTop + viewportHeight + overscan;

    let currentY = 0;
    let startIdx = 0;
    let endIdx = totalBlocks - 1;
    let offsetBefore = 0;

    for (let i = 0; i < totalBlocks; i++) {
      const blockHeight = blocks[i].metadata.estimatedHeight ?? 32;
      const blockBottom = currentY + blockHeight;

      if (blockBottom < visibleTop) {
        startIdx = i + 1;
        offsetBefore = blockBottom;
      }

      if (currentY > visibleBottom) {
        endIdx = i;
        break;
      }

      currentY += blockHeight;
    }

    startIdx = Math.min(startIdx, totalBlocks - 1);
    endIdx = Math.min(Math.max(endIdx, startIdx), totalBlocks - 1);

    let offsetAfter = 0;
    for (let i = endIdx + 1; i < totalBlocks; i++) {
      offsetAfter += blocks[i].metadata.estimatedHeight ?? 32;
    }

    return {
      documentId: model.id,
      version: model.version,
      startBlockIndex: startIdx,
      endBlockIndex: endIdx,
      blocksToRender: blocks.slice(startIdx, endIdx + 1),
      totalBlocks,
      totalHeight: offsetBefore + (currentY - offsetBefore) + offsetAfter,
      offsetBefore,
      offsetAfter,
    };
  }

  public async initDocument(
    documentId: string,
    source: string,
    version = 1,
  ): Promise<{ model: DocumentModel }> {
    return this.sendRequest<{ model: DocumentModel }>("INIT_DOCUMENT", {
      documentId,
      source,
      version,
    });
  }

  public async applyEdit(
    documentId: string,
    edit: TextEdit,
  ): Promise<IncrementalParseResult> {
    return this.sendRequest<IncrementalParseResult>("APPLY_EDIT", {
      documentId,
      edit,
    });
  }

  public async getRenderPlan(
    documentId: string,
    viewport: ViewportRange,
  ): Promise<RenderPlan> {
    return this.sendRequest<RenderPlan>("GET_RENDER_PLAN", {
      documentId,
      viewport,
    });
  }

  public async search(
    documentId: string,
    query: string,
    limit = 100,
  ): Promise<{ matches: SearchMatch[] }> {
    return this.sendRequest<{ matches: SearchMatch[] }>("SEARCH", {
      documentId,
      query,
      limit,
    });
  }

  public async compactSnapshot(
    documentId: string,
  ): Promise<{ compressed: Uint8Array; version: number }> {
    return this.sendRequest<{ compressed: Uint8Array; version: number }>(
      "COMPACT_SNAPSHOT",
      { documentId },
    );
  }
}

export const documentEngineBridge = new DocumentEngineBridge();
