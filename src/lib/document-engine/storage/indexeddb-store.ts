/**
 * IndexedDB storage engine for local offline documents, incremental patch logs, and snapshots.
 */

import type { DocumentPatch } from "../types";

const DB_NAME = "inkest-document-store";
const DB_VERSION = 1;

export interface StoredSnapshot {
  documentId: string;
  version: number;
  title?: string;
  content: string;
  timestamp: number;
  synced?: boolean;
  contentHash?: string;
  compressed?: Uint8Array;
}

const LOCAL_STORAGE_PREFIX = "inkest_draft_";

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
   * Saves a full document snapshot to IndexedDB with localStorage fallback.
   */
  public async saveSnapshot(
    documentId: string,
    version: number,
    content: string,
    title?: string,
    synced = false,
    contentHash?: string,
    compressed?: Uint8Array,
  ): Promise<boolean> {
    const snapshot: StoredSnapshot = {
      documentId,
      version,
      title,
      content,
      timestamp: Date.now(),
      synced,
      contentHash,
      compressed,
    };

    // Always mirror to localStorage as an instant sync/fallback
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(
          `${LOCAL_STORAGE_PREFIX}${documentId}`,
          JSON.stringify({
            documentId,
            version,
            title,
            content,
            timestamp: snapshot.timestamp,
            synced,
            contentHash,
          }),
        );
      }
    } catch {
      // Ignore quota/access errors
    }

    const db = await this.initDB();
    if (!db) return false;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction("document_snapshots", "readwrite");
        const store = tx.objectStore("document_snapshots");
        const req = store.put(snapshot);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  }

  /**
   * Marks the current snapshot for a document as synced with the server.
   */
  public async markSnapshotSynced(
    documentId: string,
    version?: number,
    contentHash?: string,
    title?: string,
    content?: string,
  ): Promise<boolean> {
    if (content !== undefined) {
      // Safety check: if local storage already has a newer, unsaved draft with different content,
      // do not overwrite the user's active keystrokes with stale synced content!
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          const raw = window.localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${documentId}`);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.synced === false && parsed.content !== content) {
              return true;
            }
          }
        }
      } catch {
        // Ignore parsing errors
      }

      return this.saveSnapshot(
        documentId,
        version ?? 1,
        content,
        title,
        true,
        contentHash,
      );
    }
    const current = await this.getSnapshot(documentId);
    if (current) {
      return this.saveSnapshot(
        documentId,
        version ?? current.version,
        current.content,
        current.title,
        true,
        contentHash ?? current.contentHash,
        current.compressed,
      );
    }

    // Mirror to localStorage
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const key = `${LOCAL_STORAGE_PREFIX}${documentId}`;
        const raw = window.localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          parsed.synced = true;
          if (version !== undefined) parsed.version = version;
          if (contentHash !== undefined) parsed.contentHash = contentHash;
          parsed.timestamp = Date.now();
          window.localStorage.setItem(key, JSON.stringify(parsed));
        }
      }
    } catch {
      // Ignore
    }

    return true;
  }

  /**
   * Retrieves the latest snapshot for a document, consulting IndexedDB and localStorage,
   * prioritizing unsaved drafts or whichever record is newest.
   */
  public async getSnapshot(documentId: string): Promise<StoredSnapshot | null> {
    let localItem: StoredSnapshot | null = null;
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const raw = window.localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${documentId}`);
        if (raw) {
          localItem = JSON.parse(raw) as StoredSnapshot;
        }
      }
    } catch {
      // Ignore
    }

    const db = await this.initDB();
    if (db) {
      const fromDb = await new Promise<StoredSnapshot | null>((resolve) => {
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

      if (fromDb && localItem) {
        // If local storage has an unsaved draft while DB is marked synced,
        // prioritize the active local unsaved draft
        if (localItem.synced === false && fromDb.synced === true) {
          return localItem;
        }
        return localItem.timestamp > fromDb.timestamp ? localItem : fromDb;
      }
      if (fromDb) return fromDb;
    }

    return localItem;
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
