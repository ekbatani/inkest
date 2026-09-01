/**
 * Cloud Tier Limits and Quota Enforcement
 *
 * Implements resource boundaries for Cloud SaaS Free Tier users:
 * - 500 MB storage cap
 * - 10 MB per-file upload cap
 * - 7-day version history retention
 * - 1 workspace cap
 * - 60 API requests/minute rate limit
 */

import { db, schema } from "@/server/db/client";
import { eq, sum } from "drizzle-orm";

export const CLOUD_FREE_TIER_LIMITS = {
  MAX_STORAGE_BYTES: 500 * 1024 * 1024, // 500 MB
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10 MB
  MAX_VERSION_HISTORY_DAYS: 7,
  MAX_WORKSPACES: 1,
  API_RATE_LIMIT_PER_MINUTE: 60,
} as const;

export function isCloudDeployment(): boolean {
  return (process.env.INKEST_DEPLOYMENT_ENV ?? "").toLowerCase() === "cloud";
}

/**
 * Returns total attachment bytes used by a user in the cloud database.
 */
export async function getUserStorageUsageBytes(userId: string): Promise<number> {
  try {
    const result = await db
      .select({ total: sum(schema.attachments.sizeBytes) })
      .from(schema.attachments)
      .where(eq(schema.attachments.userId, userId));

    const total = result[0]?.total;
    return total ? Number(total) : 0;
  } catch {
    return 0;
  }
}

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  currentUsageBytes: number;
  maxStorageBytes: number;
  availableBytes: number;
}

/**
 * Checks whether an incoming file upload is within the user's storage tier.
 */
export async function checkUploadQuota(
  userId: string,
  incomingFileSizeBytes: number,
): Promise<QuotaCheckResult> {
  // If self-hosted, do not enforce cloud SaaS quotas
  if (!isCloudDeployment()) {
    return {
      allowed: true,
      currentUsageBytes: 0,
      maxStorageBytes: Infinity,
      availableBytes: Infinity,
    };
  }

  // Validate per-file limit
  if (incomingFileSizeBytes > CLOUD_FREE_TIER_LIMITS.MAX_FILE_SIZE_BYTES) {
    return {
      allowed: false,
      reason: `File size exceeds the 10 MB limit for free tier accounts (${(incomingFileSizeBytes / (1024 * 1024)).toFixed(1)} MB).`,
      currentUsageBytes: 0,
      maxStorageBytes: CLOUD_FREE_TIER_LIMITS.MAX_STORAGE_BYTES,
      availableBytes: 0,
    };
  }

  const currentUsage = await getUserStorageUsageBytes(userId);
  const maxStorage = CLOUD_FREE_TIER_LIMITS.MAX_STORAGE_BYTES;
  const available = Math.max(0, maxStorage - currentUsage);

  if (currentUsage + incomingFileSizeBytes > maxStorage) {
    return {
      allowed: false,
      reason: `Storage quota exceeded. Used ${(currentUsage / (1024 * 1024)).toFixed(1)} MB of 500 MB.`,
      currentUsageBytes: currentUsage,
      maxStorageBytes: maxStorage,
      availableBytes: available,
    };
  }

  return {
    allowed: true,
    currentUsageBytes: currentUsage,
    maxStorageBytes: maxStorage,
    availableBytes: available,
  };
}
