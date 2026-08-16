/**
 * Two-tier Mermaid diagram cache (Memory LRU + IndexedDB persistent cache).
 * Guarantees zero re-rendering of unchanged diagrams across renders, note switches, and reloads.
 */

import { hashMermaid } from "./hashing";

const MEMORY_CACHE_MAX_ENTRIES = 200;
const DB_NAME = "inkest-document-store";
const DB_VERSION = 1;
const STORE_MERMAID = "mermaid_cache";

interface MermaidCacheEntry {
  hash: string;
  svg: string;
  timestamp: number;
}

class MermaidCacheManager {
  // Tier 1: In-memory LRU cache
  private memoryCache = new Map<string, string>();
  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private pendingRenderPromises = new Map<string, Promise<string>>();

  constructor() {
    if (typeof window !== "undefined" && "indexedDB" in window) {
      this.initIndexedDB();
    }
  }

  private initIndexedDB(): Promise<IDBDatabase | null> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
          const db = (e.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_MERMAID)) {
            db.createObjectStore(STORE_MERMAID, { keyPath: "hash" });
          }
          if (!db.objectStoreNames.contains("document_snapshots")) {
            db.createObjectStore("document_snapshots", { keyPath: "documentId" });
          }
          if (!db.objectStoreNames.contains("document_patches")) {
            const patchStore = db.createObjectStore("document_patches", { keyPath: "id" });
            patchStore.createIndex("documentId", "documentId", { unique: false });
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
   * Synchronous check in Tier 1 memory cache.
   */
  public getSynchronous(code: string, theme = "default"): string | null {
    const key = hashMermaid(code, theme);
    const cached = this.memoryCache.get(key);
    if (cached) {
      // Refresh LRU position
      this.memoryCache.delete(key);
      this.memoryCache.set(key, cached);
      return cached;
    }
    return null;
  }

  /**
   * Asynchronous check in Tier 1 and Tier 2 (IndexedDB).
   */
  public async get(code: string, theme = "default"): Promise<string | null> {
    const key = hashMermaid(code, theme);

    // Check memory first
    const mem = this.getSynchronous(code, theme);
    if (mem) return mem;

    // Check IndexedDB
    const db = await this.initIndexedDB();
    if (!db) return null;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_MERMAID, "readonly");
        const store = tx.objectStore(STORE_MERMAID);
        const req = store.get(key);
        req.onsuccess = () => {
          const entry = req.result as MermaidCacheEntry | undefined;
          if (entry?.svg) {
            // Populate Tier 1 memory cache
            this.setMemory(key, entry.svg);
            resolve(entry.svg);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  /**
   * Stores rendered SVG into Tier 1 and Tier 2 caches.
   */
  public async set(code: string, svg: string, theme = "default"): Promise<void> {
    const key = hashMermaid(code, theme);
    this.setMemory(key, svg);

    const db = await this.initIndexedDB();
    if (!db) return;

    try {
      const tx = db.transaction(STORE_MERMAID, "readwrite");
      const store = tx.objectStore(STORE_MERMAID);
      const entry: MermaidCacheEntry = {
        hash: key,
        svg,
        timestamp: Date.now(),
      };
      store.put(entry);
    } catch {
      // Ignore storage write errors (e.g. quota/incognito)
    }
  }

  private setMemory(key: string, svg: string): void {
    if (this.memoryCache.size >= MEMORY_CACHE_MAX_ENTRIES) {
      const firstKey = this.memoryCache.keys().next().value;
      if (firstKey) this.memoryCache.delete(firstKey);
    }
    this.memoryCache.set(key, svg);
  }

  /**
   * Renders Mermaid diagram with deduplication and caching.
   */
  public async renderWithCache(
    code: string,
    theme = "default",
    renderFn: (id: string, code: string) => Promise<string>,
  ): Promise<string> {
    const key = hashMermaid(code, theme);

    // 1. Check Tier 1 & 2
    const cached = await this.get(code, theme);
    if (cached) return cached;

    // 2. Deduplicate in-flight render promises for the same diagram
    let pending = this.pendingRenderPromises.get(key);
    if (!pending) {
      const renderId = `mermaid-dyn-${key.slice(0, 10)}`;
      pending = renderFn(renderId, code).then(async (svg) => {
        await this.set(code, svg, theme);
        this.pendingRenderPromises.delete(key);
        return svg;
      }).catch((err) => {
        this.pendingRenderPromises.delete(key);
        throw err;
      });
      this.pendingRenderPromises.set(key, pending);
    }

    return pending;
  }
}

export const mermaidCache = new MermaidCacheManager();
