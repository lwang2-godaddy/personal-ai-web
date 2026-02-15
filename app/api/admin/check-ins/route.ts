import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';

/**
 * GET /api/admin/check-ins
 * List check-ins (location data) with full details
 *
 * Query params:
 * - userId: string (required)
 * - activity: string (optional, filter by activity)
 * - startDate: string (optional, ISO date string for date range start)
 * - endDate: string (optional, ISO date string for date range end)
 * - limit: number (optional, default 20)
 * - startAfter: string (optional, document ID for cursor-based pagination)
 *
 * Returns:
 * - checkIns: LocationData[]
 * - hasMore: boolean
 * - totalCount: number (approximate)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin role
    const { response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const activity = searchParams.get('activity');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const startAfter = searchParams.get('startAfter');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();

    // Build query - order by timestamp desc
    let query: FirebaseFirestore.Query = db
      .collection('locationData')
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc');

    // Apply filters
    if (activity) {
      query = query.where('activity', '==', activity);
    }

    if (startDate) {
      query = query.where('timestamp', '>=', startDate);
    }

    if (endDate) {
      query = query.where('timestamp', '<=', endDate);
    }

    // Cursor-based pagination
    if (startAfter) {
      const startAfterDoc = await db.collection('locationData').doc(startAfter).get();
      if (startAfterDoc.exists) {
        query = query.startAfter(startAfterDoc);
      }
    }

    // Fetch one extra to determine if there are more results
    query = query.limit(limit + 1);

    const snapshot = await query.get();

    const hasMore = snapshot.docs.length > limit;
    const docs = hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs;

    // Convert documents to check-in objects
    const checkIns = docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: data.accuracy || null,
        timestamp: data.timestamp,
        activity: data.activity || null,
        activityTaggedAt: data.activityTaggedAt || null,
        address: data.address || '',
        placeName: data.placeName || null,
        duration: data.duration || 0,
        visitCount: data.visitCount || 0,
        embeddingId: data.embeddingId || null,
        isManualCheckIn: data.isManualCheckIn || false,
        savedPlaceId: data.savedPlaceId || null,
        note: data.note || null,
        createdAt: data.createdAt || null,
        updatedAt: data.updatedAt || null,
      };
    });

    // Get total count for user (approximate)
    const countQuery = db
      .collection('locationData')
      .where('userId', '==', userId);
    const countSnapshot = await countQuery.count().get();
    const totalCount = countSnapshot.data().count;

    return NextResponse.json({
      checkIns,
      hasMore: hasMore && checkIns.length > 0,
      totalCount,
    });
  } catch (error: unknown) {
    console.error('[Admin Check-Ins API] Error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to fetch check-ins';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
