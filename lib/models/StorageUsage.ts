/**
 * StorageUsage Model
 *
 * Represents storage usage breakdown for a user's data.
 * Includes total storage, per-category breakdown, and quota information.
 */

export interface StorageUsageCategory {
  count: number;
  sizeBytes: number;
  sizeFormatted: string;
}

export interface StorageUsage {
  total: StorageUsageCategory;
  photos: StorageUsageCategory;
  voiceNotes: StorageUsageCategory;
  calculatedAt: string; // ISO timestamp
  quotaBytes: number; // Soft quota limit in bytes
  quotaPercentage: number; // Usage as percentage of quota
}

/**
 * Default storage quota (1 GB)
 */
export const DEFAULT_STORAGE_QUOTA_BYTES = 1 * 1024 * 1024 * 1024; // 1 GB

/**
 * Voice note bytes per second estimate (128kbps audio = 16KB/sec)
 */
export const VOICE_NOTE_BYTES_PER_SECOND = 16 * 1024; // 16 KB/sec

/**
 * Photo variant multiplier (original + thumbnail + medium = ~1.3x)
 */
export const PHOTO_VARIANT_MULTIPLIER = 1.3;
