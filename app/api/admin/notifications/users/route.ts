import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';

/**
 * GET /api/admin/notifications/users
 * Get list of users with notification counts
 *
 * Returns:
 * - users: [{ id, email, displayName, notificationCount, lastNotificationAt }]
 *
 * Sorted by most recent notification
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin role
    const { response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const db = getAdminFirestore();

    // Get all users
    const usersSnapshot = await db.collection('users').get();
    const usersMap = new Map<string, {
      id: string;
      email: string;
      displayName: string;
      notificationCount: number;
      lastNotificationAt: string | null;
    }>();

    // Initialize users map
    usersSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      usersMap.set(doc.id, {
        id: doc.id,
        email: data.email || '',
        displayName: data.displayName || data.email?.split('@')[0] || 'Unknown',
        notificationCount: 0,
        lastNotificationAt: null,
      });
    });

    // Get notification counts and last notification dates
    const notificationsSnapshot = await db
      .collection('notifications')
      .orderBy('createdAt', 'desc')
      .get();

    // Count notifications per user and track last notification
    const userNotifData = new Map<string, { count: number; lastNotificationAt: string }>();
    notificationsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const userId = data.userId;
      const createdAt = data.createdAt?.toDate?.()?.toISOString() || data.createdAt;

      if (!userNotifData.has(userId)) {
        userNotifData.set(userId, { count: 0, lastNotificationAt: createdAt });
      }

      const userData = userNotifData.get(userId)!;
      userData.count++;
      // Keep the most recent createdAt (first one encountered since ordered desc)
    });

    // Merge notification data into users
    userNotifData.forEach((notifData, userId) => {
      const user = usersMap.get(userId);
      if (user) {
        user.notificationCount = notifData.count;
        user.lastNotificationAt = notifData.lastNotificationAt;
      } else {
        // User might have been deleted but notifications remain
        usersMap.set(userId, {
          id: userId,
          email: '',
          displayName: `[Deleted User] ${userId.substring(0, 8)}...`,
          notificationCount: notifData.count,
          lastNotificationAt: notifData.lastNotificationAt,
        });
      }
    });

    // Convert to array and filter out users with no notifications
    const users = Array.from(usersMap.values())
      .filter((u) => u.notificationCount > 0)
      .sort((a, b) => {
        // Sort by lastNotificationAt descending
        if (!a.lastNotificationAt) return 1;
        if (!b.lastNotificationAt) return -1;
        return b.lastNotificationAt.localeCompare(a.lastNotificationAt);
      });

    return NextResponse.json({ users });
  } catch (error: unknown) {
    console.error('[Admin Notifications Users API] Error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to fetch users';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
