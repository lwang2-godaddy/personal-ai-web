import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';

/**
 * GET /api/admin/notifications
 * List notifications for a specific user
 *
 * Query params:
 * - userId: string (required)
 * - type: string (optional, filter by notification type)
 * - readStatus: 'read' | 'unread' | 'all' (optional, default 'all')
 * - startDate: string (optional, ISO date string)
 * - limit: number (optional, default 20)
 * - startAfter: string (optional, document ID for cursor-based pagination)
 *
 * Returns:
 * - notifications: Notification[]
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
    const type = searchParams.get('type');
    const readStatus = searchParams.get('readStatus') || 'all';
    const startDate = searchParams.get('startDate');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const startAfter = searchParams.get('startAfter');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();

    // Build query - order by createdAt desc (actual field in Firestore)
    let query: FirebaseFirestore.Query = db
      .collection('notifications')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc');

    // Apply filters
    if (type) {
      query = query.where('type', '==', type);
    }

    if (readStatus === 'read') {
      query = query.where('read', '==', true);
    } else if (readStatus === 'unread') {
      query = query.where('read', '==', false);
    }

    if (startDate) {
      query = query.where('createdAt', '>=', new Date(startDate));
    }

    // Cursor-based pagination
    if (startAfter) {
      const startAfterDoc = await db.collection('notifications').doc(startAfter).get();
      if (startAfterDoc.exists) {
        query = query.startAfter(startAfterDoc);
      }
    }

    // Fetch one extra to determine if there are more results
    query = query.limit(limit + 1);

    const snapshot = await query.get();

    const hasMore = snapshot.docs.length > limit;
    const docs = hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs;

    // Convert documents to notification objects
    const notifications = docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        type: data.type || 'unknown',
        title: data.title || '',
        body: data.body || '',
        read: data.read ?? false,
        data: data.data || null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || null,
      };
    });

    // Get total count for user (approximate)
    const countQuery = db
      .collection('notifications')
      .where('userId', '==', userId);
    const countSnapshot = await countQuery.count().get();
    const totalCount = countSnapshot.data().count;

    return NextResponse.json({
      notifications,
      hasMore: hasMore && notifications.length > 0,
      totalCount,
    });
  } catch (error: unknown) {
    console.error('[Admin Notifications API] Error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to fetch notifications';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
