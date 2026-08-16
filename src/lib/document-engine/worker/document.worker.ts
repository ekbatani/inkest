/**
 * Dedicated Web Worker for CPU-intensive document processing.
 * Runs parsing, incremental updates, search indexing, and snapshot compression off the main thread.
 */

import { serializeAndCompressModel } from "../compression";
import { applyIncrementalEdit } from "../incremental-parser";
import { parseDocument } from "../parser";
import { DocumentSearchIndex } from "../search-index";
import type {
  DocumentModel,
  RenderPlan,
  TextEdit,
  ViewportRange,
  WorkerMessageRequest,
  WorkerMessageResponse,
} from "../types";

const documents = new Map<string, DocumentModel>();
const searchIndices = new Map<string, DocumentSearchIndex>();

function getOrCreateIndex(model: DocumentModel): DocumentSearchIndex {
  let index = searchIndices.get(model.id);
  if (!index) {
    index = new DocumentSearchIndex(model);
    searchIndices.set(model.id, index);
  }
  return index;
}

function calculateRenderPlan(
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

  // Calculate cumulative block heights and find visible window
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

  // Bound indices
  startIdx = Math.min(startIdx, totalBlocks - 1);
  endIdx = Math.min(Math.max(endIdx, startIdx), totalBlocks - 1);

  // Calculate remaining height after endIdx
  let offsetAfter = 0;
  for (let i = endIdx + 1; i < totalBlocks; i++) {
    offsetAfter += blocks[i].metadata.estimatedHeight ?? 32;
  }

  const totalHeight = offsetBefore + (currentY - offsetBefore) + offsetAfter;
  const blocksToRender = blocks.slice(startIdx, endIdx + 1);

  return {
    documentId: model.id,
    version: model.version,
    startBlockIndex: startIdx,
    endBlockIndex: endIdx,
    blocksToRender,
    totalBlocks,
    totalHeight,
    offsetBefore,
    offsetAfter,
  };
}

if (typeof self !== "undefined") {
  self.onmessage = async (e: MessageEvent<WorkerMessageRequest>) => {
    const { id, type, payload } = e.data;
    const startTime = typeof performance !== "undefined" ? performance.now() : Date.now();

    try {
      switch (type) {
        case "INIT_DOCUMENT": {
          const { documentId, source, version } = payload as {
            documentId: string;
            source: string;
            version?: number;
          };
          const model = parseDocument(source, documentId, version ?? 1);
          documents.set(documentId, model);
          const index = new DocumentSearchIndex(model);
          searchIndices.set(documentId, index);

          const durationMs =
            (typeof performance !== "undefined" ? performance.now() : Date.now()) - startTime;

          const response: WorkerMessageResponse = {
            id,
            type: "SUCCESS",
            payload: { model },
            durationMs,
          };
          self.postMessage(response);
          break;
        }

        case "APPLY_EDIT": {
          const { documentId, edit } = payload as {
            documentId: string;
            edit: TextEdit;
          };
          const prevModel = documents.get(documentId);
          if (!prevModel) {
            throw new Error(`Document not found in worker: ${documentId}`);
          }

          const result = applyIncrementalEdit(prevModel, edit);
          documents.set(documentId, result.model);

          const index = getOrCreateIndex(result.model);
          index.updateBlocks(
            result.model.blocks,
            result.invalidatedBlockIds,
            result.removedBlockIds,
          );

          const durationMs =
            (typeof performance !== "undefined" ? performance.now() : Date.now()) - startTime;

          const response: WorkerMessageResponse = {
            id,
            type: "SUCCESS",
            payload: result,
            durationMs,
          };
          self.postMessage(response);
          break;
        }

        case "GET_RENDER_PLAN": {
          const { documentId, viewport } = payload as {
            documentId: string;
            viewport: ViewportRange;
          };
          const model = documents.get(documentId);
          if (!model) {
            throw new Error(`Document not found: ${documentId}`);
          }

          const plan = calculateRenderPlan(model, viewport);
          const durationMs =
            (typeof performance !== "undefined" ? performance.now() : Date.now()) - startTime;

          const response: WorkerMessageResponse = {
            id,
            type: "SUCCESS",
            payload: plan,
            durationMs,
          };
          self.postMessage(response);
          break;
        }

        case "SEARCH": {
          const { documentId, query, limit } = payload as {
            documentId: string;
            query: string;
            limit?: number;
          };
          const model = documents.get(documentId);
          if (!model) {
            throw new Error(`Document not found: ${documentId}`);
          }
          const index = getOrCreateIndex(model);
          const matches = index.search(model, query, limit ?? 100);

          const durationMs =
            (typeof performance !== "undefined" ? performance.now() : Date.now()) - startTime;

          const response: WorkerMessageResponse = {
            id,
            type: "SUCCESS",
            payload: { matches },
            durationMs,
          };
          self.postMessage(response);
          break;
        }

        case "COMPACT_SNAPSHOT": {
          const { documentId } = payload as { documentId: string };
          const model = documents.get(documentId);
          if (!model) {
            throw new Error(`Document not found: ${documentId}`);
          }
          const compressed = await serializeAndCompressModel(model);

          const durationMs =
            (typeof performance !== "undefined" ? performance.now() : Date.now()) - startTime;

          const response: WorkerMessageResponse = {
            id,
            type: "SUCCESS",
            payload: { compressed, version: model.version },
            durationMs,
          };
          (self as unknown as { postMessage: (msg: unknown, transfer?: Transferable[]) => void }).postMessage(
            response,
            [compressed.buffer as ArrayBuffer],
          );
          break;
        }

        default:
          throw new Error(`Unknown worker message type: ${type}`);
      }
    } catch (err) {
      const response: WorkerMessageResponse = {
        id,
        type: "ERROR",
        error: err instanceof Error ? err.message : String(err),
      };
      self.postMessage(response);
    }
  };
}
