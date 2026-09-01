/**
 * Rate Limiting Service for Inkest
 *
 * Provides sliding-window rate limiting backed by CacheService (Redis or In-Memory).
 */

import { cache } from "@/server/cache";

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

export async function checkRateLimit(
  identifier: string,
  limit = 60,
  windowSeconds = 60,
): Promise<RateLimitResult> {
  const windowKey = `ratelimit:${identifier}:${Math.floor(Date.now() / (windowSeconds * 1000))}`;

  const currentCount = await cache.incr(windowKey, windowSeconds);
  const remaining = Math.max(0, limit - currentCount);
  const success = currentCount <= limit;

  return {
    success,
    limit,
    remaining,
    resetSeconds: windowSeconds,
  };
}
