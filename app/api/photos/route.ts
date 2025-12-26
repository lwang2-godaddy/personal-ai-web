import { NextRequest, NextResponse } from 'next/server';
import { FirestoreService } from '@/lib/api/firebase/firestore';

const firestoreService = FirestoreService.getInstance();

/**
 * POST /api/photos
 * Create a new photo memory in Firestore
 *
 * Body:
 * - photoId: string - Unique ID for the photo
 * - photoMemory: PhotoMemory - Photo memory data
 *
 * Returns:
 * - success: boolean
 * - photoId: string
 */
export async function POST(request: NextRequest) {
  try {
    const { photoId, photoMemory } = await request.json();

    // Validate required fields
    if (!photoId || typeof photoId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid photoId' },
        { status: 400 }
      );
    }

    if (!photoMemory || typeof photoMemory !== 'object') {
      return NextResponse.json(
        { error: 'Missing or invalid photoMemory' },
        { status: 400 }
      );
    }

    // Validate photo memory fields
    const requiredFields = [
      'userId',
      'imageUrl',
      'mediumUrl',
      'thumbnailUrl',
      'takenAt',
    ];

    for (const field of requiredFields) {
      if (!(field in photoMemory)) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    if (typeof photoMemory.userId !== 'string' || photoMemory.userId.trim().length === 0) {
      return NextResponse.json(
        { error: 'Invalid userId' },
        { status: 400 }
      );
    }

    if (
      typeof photoMemory.imageUrl !== 'string' ||
      typeof photoMemory.mediumUrl !== 'string' ||
      typeof photoMemory.thumbnailUrl !== 'string'
    ) {
      return NextResponse.json(
        { error: 'Invalid image URLs' },
        { status: 400 }
      );
    }

    // Validate optional fields
    if (photoMemory.autoDescription !== undefined && photoMemory.autoDescription !== null) {
      if (typeof photoMemory.autoDescription !== 'string') {
        return NextResponse.json(
          { error: 'autoDescription must be a string' },
          { status: 400 }
        );
      }
    }

    if (photoMemory.userDescription !== undefined && photoMemory.userDescription !== null) {
      if (typeof photoMemory.userDescription !== 'string') {
        return NextResponse.json(
          { error: 'userDescription must be a string' },
          { status: 400 }
        );
      }
    }

    if (photoMemory.tags !== undefined && photoMemory.tags !== null) {
      if (!Array.isArray(photoMemory.tags)) {
        return NextResponse.json(
          { error: 'tags must be an array' },
          { status: 400 }
        );
      }

      if (photoMemory.tags.length > 10) {
        return NextResponse.json(
          { error: 'Maximum 10 tags allowed' },
          { status: 400 }
        );
      }

      if (photoMemory.tags.some((tag: any) => typeof tag !== 'string' || tag.length > 30)) {
        return NextResponse.json(
          { error: 'Each tag must be a string with max 30 characters' },
          { status: 400 }
        );
      }
    }

    if (photoMemory.latitude !== undefined && photoMemory.latitude !== null) {
      if (
        typeof photoMemory.latitude !== 'number' ||
        photoMemory.latitude < -90 ||
        photoMemory.latitude > 90
      ) {
        return NextResponse.json(
          { error: 'Invalid latitude' },
          { status: 400 }
        );
      }
    }

    if (photoMemory.longitude !== undefined && photoMemory.longitude !== null) {
      if (
        typeof photoMemory.longitude !== 'number' ||
        photoMemory.longitude < -180 ||
        photoMemory.longitude > 180
      ) {
        return NextResponse.json(
          { error: 'Invalid longitude' },
          { status: 400 }
        );
      }
    }

    console.log('[Photos] Creating photo memory:', {
      photoId,
      userId: photoMemory.userId,
      hasAutoDescription: !!photoMemory.autoDescription,
      hasUserDescription: !!photoMemory.userDescription,
      tags: photoMemory.tags?.length || 0,
      hasLocation: !!(photoMemory.latitude && photoMemory.longitude),
    });

    // Store in Firestore (will trigger Cloud Function photoMemoryCreated for embeddings)
    await firestoreService.createPhotoMemory(photoId, photoMemory);

    console.log('[Photos] Photo memory created successfully:', photoId);

    return NextResponse.json(
      {
        success: true,
        photoId,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[Photos] Error creating photo memory:', error);

    return NextResponse.json(
      { error: `Failed to create photo memory: ${error.message}` },
      { status: 500 }
    );
  }
}

/**
 * GET /api/photos?userId={userId}&limit={limit}
 * Get photo memories for a user
 *
 * Query params:
 * - userId: string - User ID (required)
 * - limit: number - Max number of photos to return (default: 50)
 *
 * Returns:
 * - photos: PhotoMemory[]
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50', 10);

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid userId' },
        { status: 400 }
      );
    }

    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'limit must be between 1 and 100' },
        { status: 400 }
      );
    }

    console.log('[Photos] Getting photo memories for user:', userId, 'limit:', limit);

    const photos = await firestoreService.getPhotoMemories(userId, limit);

    console.log('[Photos] Retrieved', photos.length, 'photo memories');

    return NextResponse.json(
      {
        photos,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[Photos] Error getting photo memories:', error);

    return NextResponse.json(
      { error: `Failed to get photo memories: ${error.message}` },
      { status: 500 }
    );
  }
}
