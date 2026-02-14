import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';

/**
 * GET /api/admin/events
 * List events with filtering and cursor-based pagination
 *
 * Query params:
 * - userId: string (required)
 * - type: string (optional, filter by event type)
 * - status: string (optional, filter by event status)
 * - sourceType: string (optional, filter by source type)
 * - limit: number (optional, default 20)
 * - startAfter: string (optional, document ID for cursor-based pagination)
 *
 * Returns:
 * - events: Event[]
 * - hasMore: boolean
 * - totalCount: number
 * - stats: { byType, byStatus }
 */
export async function GET(request: NextRequest) {
  try {
    const { response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const sourceType = searchParams.get('sourceType');
    const confirmationStatus = searchParams.get('confirmationStatus');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const startAfter = searchParams.get('startAfter');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();

    let query: FirebaseFirestore.Query = db
      .collection('events')
      .where('userId', '==', userId)
      .orderBy('datetime', 'desc');

    if (type) {
      query = query.where('type', '==', type);
    }

    if (status) {
      query = query.where('status', '==', status);
    }

    // Cursor-based pagination
    if (startAfter) {
      const startAfterDoc = await db.collection('events').doc(startAfter).get();
      if (startAfterDoc.exists) {
        query = query.startAfter(startAfterDoc);
      }
    }

    query = query.limit(limit + 1);

    const snapshot = await query.get();
    const hasMore = snapshot.docs.length > limit;
    const docs = hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs;

    let events = docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        title: data.title,
        description: data.description,
        datetime: data.datetime,
        endDatetime: data.endDatetime || null,
        isAllDay: data.isAllDay || false,
        type: data.type,
        sourceType: data.sourceType,
        sourceId: data.sourceId,
        sourceText: data.sourceText,
        location: data.location || null,
        locationId: data.locationId || null,
        participants: data.participants || [],
        recurrence: data.recurrence || null,
        recurrenceEndDate: data.recurrenceEndDate || null,
        status: data.status,
        confidence: data.confidence,
        reminders: data.reminders || [],
        userConfirmed: data.userConfirmed || false,
        userModified: data.userModified || false,
        completedAt: data.completedAt || null,
        embeddingId: data.embeddingId || null,
        embeddingCreatedAt: data.embeddingCreatedAt || null,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    });

    // Filter by sourceType in memory (avoids compound index)
    if (sourceType) {
      events = events.filter((e) => e.sourceType === sourceType);
    }

    // Filter by confirmation status in memory (avoids additional compound indexes)
    if (confirmationStatus === 'awaiting') {
      events = events.filter((e) => !e.userConfirmed && ['draft', 'pending'].includes(e.status));
    } else if (confirmationStatus === 'confirmed') {
      events = events.filter((e) => e.userConfirmed);
    } else if (confirmationStatus === 'cancelled') {
      events = events.filter((e) => e.status === 'cancelled');
    }

    // Get total count
    const countQuery = db
      .collection('events')
      .where('userId', '==', userId);
    const countSnapshot = await countQuery.count().get();
    const totalCount = countSnapshot.data().count;

    // Compute stats from current page data
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    events.forEach((e) => {
      byType[e.type] = (byType[e.type] || 0) + 1;
      byStatus[e.status] = (byStatus[e.status] || 0) + 1;
    });

    // Confirmation stats
    const awaitingCount = events.filter(
      (e) => !e.userConfirmed && ['draft', 'pending'].includes(e.status)
    ).length;
    const confirmedCount = events.filter((e) => e.userConfirmed).length;
    const cancelledCount = events.filter((e) => e.status === 'cancelled').length;
    const totalForRate = awaitingCount + confirmedCount + cancelledCount;
    const confirmationRate = totalForRate > 0
      ? Math.round((confirmedCount / totalForRate) * 100)
      : 0;

    return NextResponse.json({
      events,
      hasMore: hasMore && events.length > 0,
      totalCount,
      stats: { byType, byStatus },
      confirmationStats: {
        awaitingCount,
        confirmedCount,
        cancelledCount,
        confirmationRate,
      },
    });
  } catch (error: unknown) {
    console.error('[Admin Events API] Error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to fetch events';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
