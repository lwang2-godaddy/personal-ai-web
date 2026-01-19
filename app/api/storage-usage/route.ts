import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';
import { PhotoMemory } from '@/lib/models/PhotoMemory';
import { VoiceNote } from '@/lib/models/VoiceNote';
import {
  StorageUsage,
  DEFAULT_STORAGE_QUOTA_BYTES,
} from '@/lib/models/StorageUsage';
import {
  formatBytes,
  calculatePhotoStorage,
  calculateVoiceStorage,
  calculateQuotaPercentage,
} from '@/lib/utils/storage';

// Large limit to get all items for accurate storage calculation
const MAX_ITEMS_LIMIT = 10000;

/**
 * GET /api/storage-usage
 * Calculate and return storage usage breakdown for the authenticated user
 *
 * Returns:
 * - StorageUsage object with total, photos, voiceNotes breakdown
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const { user, response: authResponse } = await requireAuth(request);
    if (authResponse) return authResponse;

    const userId = user.uid;
    const db = getAdminFirestore();

    console.log('[Storage Usage] Calculating storage for user:', userId);

    // Fetch all photos and voice notes for the user using Admin SDK
    const [photosSnapshot, voiceNotesSnapshot] = await Promise.all([
      db.collection('photoMemories')
        .where('userId', '==', userId)
        .limit(MAX_ITEMS_LIMIT)
        .get(),
      db.collection('voiceNotes')
        .where('userId', '==', userId)
        .limit(MAX_ITEMS_LIMIT)
        .get(),
    ]);

    const photos: PhotoMemory[] = photosSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as PhotoMemory));

    const voiceNotes: VoiceNote[] = voiceNotesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as VoiceNote));

    // Calculate storage sizes
    const photoBytes = calculatePhotoStorage(photos);
    const voiceBytes = calculateVoiceStorage(voiceNotes);
    const totalBytes = photoBytes + voiceBytes;

    // Calculate quota percentage
    const quotaPercentage = calculateQuotaPercentage(totalBytes, DEFAULT_STORAGE_QUOTA_BYTES);

    // Build response
    const storageUsage: StorageUsage = {
      total: {
        count: photos.length + voiceNotes.length,
        sizeBytes: Math.round(totalBytes),
        sizeFormatted: formatBytes(totalBytes),
      },
      photos: {
        count: photos.length,
        sizeBytes: Math.round(photoBytes),
        sizeFormatted: formatBytes(photoBytes),
      },
      voiceNotes: {
        count: voiceNotes.length,
        sizeBytes: Math.round(voiceBytes),
        sizeFormatted: formatBytes(voiceBytes),
      },
      calculatedAt: new Date().toISOString(),
      quotaBytes: DEFAULT_STORAGE_QUOTA_BYTES,
      quotaPercentage: Math.round(quotaPercentage * 10) / 10, // Round to 1 decimal
    };

    console.log('[Storage Usage] Calculated:', {
      userId,
      photoCount: photos.length,
      voiceCount: voiceNotes.length,
      totalBytes: storageUsage.total.sizeFormatted,
      quotaPercentage: `${storageUsage.quotaPercentage}%`,
    });

    return NextResponse.json(storageUsage, { status: 200 });
  } catch (error: any) {
    console.error('[Storage Usage] Error calculating storage:', error);

    return NextResponse.json(
      { error: `Failed to calculate storage usage: ${error.message}` },
      { status: 500 }
    );
  }
}
