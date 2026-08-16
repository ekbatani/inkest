/**
 * IndexedDB storage engine for local offline documents, incremental patch logs, and snapshots.
 */

import type { DocumentPatch } from "../types";

const DB_NAME = "inkest-document-store";
const DB_VERSION = 1;

export interface StoredSnapshot {
  documentId: string;
  version: number;
  content: string;
  timestamp: number;
  compressed?: Uint8Array;
}

export class DocumentIndexedDBStore {
  private dbPromise: Promise<IDBDatabase | null> | null = null;

  constructor() {
    if (typeof window !== "undefined" && "indexedDB" in window) {
      this.initDB();
    }
  }

  private initDB(): Promise<IDBDatabase | null> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
          const db = (e.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains("document_snapshots")) {
            db.createObjectStore("document_snapshots", { keyPath: "documentId" });
          }
          if (!db.objectStoreNames.contains("document_patches")) {
            const patchStore = db.createObjectStore("document_patches", { keyPath: "id" });
            patchStore.createIndex("documentId", "documentId", { unique: false });
            patchStore.createIndex("documentId_version", ["documentId", "targetVersion"], {
              unique: false,
            });
          }
          if (!db.objectStoreNames.contains("mermaid_cache")) {
            db.createObjectStore("mermaid_cache", { keyPath: "hash" });
          }
        };

        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  /**
   * Saves a full document snapshot to IndexedDB.
   */
  public async saveSnapshot(
    documentId: string,
    version: number,
    content: string,
    compressed?: Uint8Array,
  ): Promise<boolean> {
    const db = await this.initDB();
    if (!db) return false;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction("document_snapshots", "readwrite");
        const store = tx.objectStore("document_snapshots");
        const snapshot: StoredSnapshot = {
          documentId,
          version,
          content,
          timestamp: Date.now(),
          compressed,
        };
        const req = store.put(snapshot);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  }

  /**
   * Retrieves the latest snapshot for a document.
   */
  public async getSnapshot(documentId: string): Promise<StoredSnapshot | null> {
    const db = await this.initDB();
    if (!db) return null;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction("document_snapshots", "readonly");
        const store = tx.objectStore("document_snapshots");
        const req = store.get(documentId);
        req.onsuccess = () => resolve((req.result as StoredSnapshot) || null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  /**
   * Appends an incremental patch to the patch log.
   */
  public async appendPatch(patch: DocumentPatch): Promise<boolean> {
    const db = await this.initDB();
    if (!db) return false;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction("document_patches", "readwrite");
        const store = tx.objectStore("document_patches");
        const req = store.put(patch);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  }

  /**
   * Retrieves all patches applied since a given base version.
   */
  public async getPatchesSince(
    documentId: string,
    baseVersion: number,
  ): Promise<DocumentPatch[]> {
    const db = await this.initDB();
    if (!db) return [];

    return new Promise((resolve) => {
      try {
        const tx = db.transaction("document_patches", "readonly");
        const store = tx.objectStore("document_patches");
        const index = store.index("documentId");
        const req = index.getAll(IDBKeyRange.only(documentId));

        req.onsuccess = () => {
          const allPatches = (req.result as DocumentPatch[]) || [];
          const filtered = allPatches
            .filter((p) => p.targetVersion > baseVersion)
            .sort((a, b) => a.targetVersion - b.targetVersion);
          resolve(filtered);
        };
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  }

  /**
   * Prunes patches up to a compacted snapshot version.
   */
  public async prunePatchesUpTo(documentId: string, version: number): Promise<void> {
    const db = await this.initDB();
    if (!db) return;

    try {
      const tx = db.transaction("document_patches", "readwrite");
      const store = tx.objectStore("document_patches");
      const index = store.index("documentId");
      const req = index.openCursor(IDBKeyRange.only(documentId));

      req.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const patch = cursor.value as DocumentPatch;
          if (patch.targetVersion <= version) {
            cursor.delete();
          }
          cursor.continue();
        }
      };
    } catch {
      // Ignore cleanup error
    }
  }
}

export const documentIndexedDBStore = new DocumentIndexedDBStore();
