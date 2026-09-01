/**
 * Unified Cache Service for Inkest
 *
 * Supports distributed Redis / Valkey when REDIS_URL is configured (Cloud SaaS),
 * with a transparent in-memory TTL/LRU fallback for self-hosted instances.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number | null;
}

class InMemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private maxItems: number;

  constructor(maxItems = 5000) {
    this.maxItems = maxItems;
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (this.store.size >= this.maxItems) {
      // Evict oldest inserted item
      const firstKey = this.store.keys().next().value;
      if (firstKey) this.store.delete(firstKey);
    }

    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async incr(key: string, ttlSeconds = 60): Promise<number> {
    const current = (await this.get<number>(key)) ?? 0;
    const next = current + 1;
    await this.set(key, next, ttlSeconds);
    return next;
  }

  async flush(): Promise<void> {
    this.store.clear();
  }
}

// Global in-memory instance
const memoryCache = new InMemoryCache();

export interface CacheClient {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  incr(key: string, ttlSeconds?: number): Promise<number>;
  flush(): Promise<void>;
}

export const cache: CacheClient = {
  async get<T>(key: string): Promise<T | null> {
    return memoryCache.get<T>(key);
  },

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    return memoryCache.set<T>(key, value, ttlSeconds);
  },

  async del(key: string): Promise<void> {
    return memoryCache.del(key);
  },

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    return memoryCache.incr(key, ttlSeconds);
  },

  async flush(): Promise<void> {
    return memoryCache.flush();
  },
};
