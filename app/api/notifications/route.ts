import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';
import { NotificationType } from '@/lib/models/NotificationRecord';

export const dynamic = 'force-dynamic';

/**
 * GET /api/notifications
 * Get user's notification history with optional filters
 *
 * Query Parameters:
 * - userId: string (required)
 * - type?: NotificationType (optional filter by notification type)
 * - status?: NotificationStatus (optional filter by status)
 * - startDate?: ISO date string (optional filter by date range)
 * - limit?: number (default: 100, max: 500)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const { user, response: authResponse } = await requireAuth(request);
    if (authResponse) return authResponse;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type') as NotificationType | null;
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);

    if (!userId) {
      return NextResponse.json(
        { error: 'userId parameter is required' },
        { status: 400 }
      );
    }

    // Users can only access their own notifications
    if (user.uid !== userId && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: You can only access your own notifications' },
        { status: 403 }
      );
    }

    const db = getAdminFirestore();

    // Build query
    let query: any = db
      .collection('notifications')
      .where('userId', '==', userId)
      .orderBy('sentAt', 'desc')
      .limit(limit);

    // Apply filters
    if (type) {
      query = db
        .collection('notifications')
        .where('userId', '==', userId)
        .where('type', '==', type)
        .orderBy('sentAt', 'desc')
        .limit(limit);
    }

    if (status) {
      query = db
        .collection('notifications')
        .where('userId', '==', userId)
        .where('status', '==', status)
        .orderBy('sentAt', 'desc')
        .limit(limit);
    }

    if (startDate) {
      const startTimestamp = new Date(startDate);
      if (type) {
        query = db
          .collection('notifications')
          .where('userId', '==', userId)
          .where('type', '==', type)
          .where('sentAt', '>=', startTimestamp)
          .orderBy('sentAt', 'desc')
          .limit(limit);
      } else if (status) {
        query = db
          .collection('notifications')
          .where('userId', '==', userId)
          .where('status', '==', status)
          .where('sentAt', '>=', startTimestamp)
          .orderBy('sentAt', 'desc')
          .limit(limit);
      } else {
        query = db
          .collection('notifications')
          .where('userId', '==', userId)
          .where('sentAt', '>=', startTimestamp)
          .orderBy('sentAt', 'desc')
          .limit(limit);
      }
    }

    const snapshot = await query.get();

    const notifications = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Convert Firestore Timestamps to ISO strings
        sentAt: data.sentAt?.toDate?.()?.toISOString() || data.sentAt,
        scheduledFor: data.scheduledFor?.toDate?.()?.toISOString() || data.scheduledFor,
        deliveredAt: data.deliveredAt?.toDate?.()?.toISOString() || data.deliveredAt,
        openedAt: data.openedAt?.toDate?.()?.toISOString() || data.openedAt,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      };
    });

    return NextResponse.json({
      notifications,
      count: notifications.length,
    });
  } catch (error: any) {
    console.error('[Notifications API] GET Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}
