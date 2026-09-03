/**
 * High-performance persistence manager.
 * Coordinates in-memory state, non-blocking IndexedDB patch journals, compressed snapshots, and background server sync.
 */

import { documentIndexedDBStore } from "./indexeddb-store";
import { compressText, decompressText } from "../compression";
import type { DocumentPatch, TextEdit } from "../types";

const COMPACT_THRESHOLD_PATCHES = 30;
const COMPACT_IDLE_TIMEOUT_MS = 4000;

export class DocumentPersistenceManager {
  public readonly documentId: string;
  private currentVersion = 1;
  private patchCountSinceSnapshot = 0;
  private compactTimer: ReturnType<typeof setTimeout> | null = null;
  private onServerSyncNeeded?: (content: string, version: number) => void;

  constructor(
    documentId: string,
    initialVersion = 1,
    onServerSyncNeeded?: (content: string, version: number) => void,
  ) {
    this.documentId = documentId;
    this.currentVersion = initialVersion;
    this.onServerSyncNeeded = onServerSyncNeeded;
  }

  /**
   * Records a text edit as a fast local patch without blocking typing.
   */
  public async recordEdit(
    edit: TextEdit,
    newContent: string,
    changedBlockIds?: string[],
  ): Promise<number> {
    const nextVersion = ++this.currentVersion;
    const patchId = `patch-${this.documentId}-${nextVersion}-${Date.now()}`;

    const patch: DocumentPatch = {
      id: patchId,
      documentId: this.documentId,
      baseVersion: nextVersion - 1,
      targetVersion: nextVersion,
      timestamp: Date.now(),
      edits: [edit],
      changedBlockIds,
    };

    // 1. Asynchronously persist patch to IndexedDB (microsecond latency)
    void documentIndexedDBStore.appendPatch(patch);
    this.patchCountSinceSnapshot++;

    // 2. Schedule snapshot compaction
    if (this.patchCountSinceSnapshot >= COMPACT_THRESHOLD_PATCHES) {
      void this.compactSnapshot(newContent, nextVersion);
    } else {
      if (this.compactTimer) clearTimeout(this.compactTimer);
      this.compactTimer = setTimeout(() => {
        void this.compactSnapshot(newContent, this.currentVersion);
      }, COMPACT_IDLE_TIMEOUT_MS);
    }

    // 3. Notify background server sync
    if (this.onServerSyncNeeded) {
      this.onServerSyncNeeded(newContent, nextVersion);
    }

    return nextVersion;
  }

  /**
   * Records a local draft snapshot (including title and content) and marks it unsaved.
   */
  public async recordLocalDraft(
    title: string,
    content: string,
    contentHash?: string,
  ): Promise<void> {
    const nextVersion = ++this.currentVersion;
    await documentIndexedDBStore.saveSnapshot(
      this.documentId,
      nextVersion,
      content,
      title,
      false,
      contentHash,
    );
  }

  /**
   * Marks the current document snapshot as synced with the server.
   */
  public async markSynced(
    version?: number,
    contentHash?: string,
    title?: string,
    content?: string,
  ): Promise<void> {
    await documentIndexedDBStore.markSnapshotSynced(
      this.documentId,
      version ?? this.currentVersion,
      contentHash,
      title,
      content,
    );
  }

  /**
   * Compacts patch journal into a clean full snapshot.
   */
  public async compactSnapshot(
    content: string,
    version: number,
    title?: string,
    synced = false,
  ): Promise<void> {
    if (this.compactTimer) clearTimeout(this.compactTimer);
    this.patchCountSinceSnapshot = 0;

    let compressed: Uint8Array | undefined;
    try {
      compressed = await compressText(content);
    } catch {
      // Best effort compression
    }

    await documentIndexedDBStore.saveSnapshot(
      this.documentId,
      version,
      content,
      title,
      synced,
      undefined,
      compressed,
    );
    await documentIndexedDBStore.prunePatchesUpTo(this.documentId, version);
  }

  /**
   * Recovers document from local IndexedDB storage (snapshot + replayed patches).
   */
  public static async recoverDocument(
    documentId: string,
  ): Promise<{
    title?: string;
    content: string;
    version: number;
    timestamp: number;
    synced?: boolean;
    contentHash?: string;
  } | null> {
    const snapshot = await documentIndexedDBStore.getSnapshot(documentId);
    if (!snapshot) return null;

    let content = snapshot.content;
    if (snapshot.compressed && snapshot.compressed.length > 0) {
      try {
        const decompressed = await decompressText(snapshot.compressed);
        if (decompressed && decompressed.length > 0) {
          content = decompressed;
        }
      } catch {
        content = snapshot.content;
      }
    }

    let version = snapshot.version;
    const title = snapshot.title;
    const timestamp = snapshot.timestamp;
    const synced = snapshot.synced;
    const contentHash = snapshot.contentHash;

    const patches = await documentIndexedDBStore.getPatchesSince(documentId, version);
    for (const patch of patches) {
      for (const edit of patch.edits) {
        content = content.slice(0, edit.from) + edit.text + content.slice(edit.to);
      }
      version = patch.targetVersion;
    }

    return {
      title,
      content,
      version,
      timestamp,
      synced,
      contentHash,
    };
  }
}
