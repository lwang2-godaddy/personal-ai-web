/**
 * Storage Utility Functions
 *
 * Helper functions for calculating and formatting storage usage.
 */

import { PhotoMemory } from '@/lib/models/PhotoMemory';
import { VoiceNote } from '@/lib/models/VoiceNote';
import {
  VOICE_NOTE_BYTES_PER_SECOND,
  PHOTO_VARIANT_MULTIPLIER,
} from '@/lib/models/StorageUsage';

/**
 * Format bytes to human-readable string (KB, MB, GB)
 * @param bytes Number of bytes
 * @returns Formatted string like "500.0 MB"
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  // Ensure we don't exceed array bounds
  const unitIndex = Math.min(i, units.length - 1);

  const value = bytes / Math.pow(k, unitIndex);

  // Format with 1 decimal place for MB and above, 0 for smaller
  if (unitIndex >= 2) {
    return `${value.toFixed(1)} ${units[unitIndex]}`;
  }
  return `${Math.round(value)} ${units[unitIndex]}`;
}

/**
 * Calculate total storage used by photos
 * Uses fileSize * 1.3 to account for thumbnail and medium variants
 * @param photos Array of PhotoMemory objects
 * @returns Total bytes used by photos
 */
export function calculatePhotoStorage(photos: PhotoMemory[]): number {
  return photos.reduce((total, photo) => {
    // Use fileSize if available, multiply by variant multiplier
    const photoBytes = (photo.fileSize || 0) * PHOTO_VARIANT_MULTIPLIER;
    return total + photoBytes;
  }, 0);
}

/**
 * Calculate total storage used by voice notes
 * Estimates from duration at 128kbps (16KB/sec)
 * @param voiceNotes Array of VoiceNote objects
 * @returns Total bytes used by voice notes
 */
export function calculateVoiceStorage(voiceNotes: VoiceNote[]): number {
  return voiceNotes.reduce((total, note) => {
    // Estimate bytes from duration (128kbps = 16KB/sec)
    const noteBytes = (note.duration || 0) * VOICE_NOTE_BYTES_PER_SECOND;
    return total + noteBytes;
  }, 0);
}

/**
 * Calculate quota percentage
 * @param usedBytes Bytes used
 * @param quotaBytes Total quota in bytes
 * @returns Percentage (0-100+)
 */
export function calculateQuotaPercentage(usedBytes: number, quotaBytes: number): number {
  if (quotaBytes === 0) return 0;
  return (usedBytes / quotaBytes) * 100;
}

/**
 * Get color class for progress bar based on percentage
 * @param percentage Usage percentage (0-100+)
 * @returns Tailwind CSS class for background color
 */
export function getStorageColorClass(percentage: number): string {
  if (percentage >= 90) return 'bg-red-500';
  if (percentage >= 70) return 'bg-yellow-500';
  return 'bg-blue-500';
}

/**
 * Get text color class for percentage based on usage level
 * @param percentage Usage percentage (0-100+)
 * @returns Tailwind CSS class for text color
 */
export function getStorageTextColorClass(percentage: number): string {
  if (percentage >= 90) return 'text-red-600 dark:text-red-400';
  if (percentage >= 70) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-blue-600 dark:text-blue-400';
}
