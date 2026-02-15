import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';

/**
 * GET /api/admin/check-ins/users
 * Get list of users with check-in counts
 *
 * Returns:
 * - users: [{ id, email, displayName, checkInCount, lastCheckInAt }]
 *
 * Sorted by most recent activity
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
      checkInCount: number;
      lastCheckInAt: string | null;
    }>();

    // Initialize users map
    usersSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      usersMap.set(doc.id, {
        id: doc.id,
        email: data.email || '',
        displayName: data.displayName || data.email?.split('@')[0] || 'Unknown',
        checkInCount: 0,
        lastCheckInAt: null,
      });
    });

    // Get check-in counts and last check-in dates
    const locationSnapshot = await db
      .collection('locationData')
      .orderBy('timestamp', 'desc')
      .get();

    // Count check-ins per user and track last check-in
    const userCheckInData = new Map<string, { count: number; lastCheckInAt: string }>();
    locationSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const userId = data.userId;
      const timestamp = data.timestamp;

      if (!userCheckInData.has(userId)) {
        userCheckInData.set(userId, { count: 0, lastCheckInAt: timestamp });
      }

      const userData = userCheckInData.get(userId)!;
      userData.count++;
      // Keep the most recent timestamp (first one encountered since ordered desc)
    });

    // Merge check-in data into users
    userCheckInData.forEach((checkInData, userId) => {
      const user = usersMap.get(userId);
      if (user) {
        user.checkInCount = checkInData.count;
        user.lastCheckInAt = checkInData.lastCheckInAt;
      } else {
        // User might have been deleted but check-ins remain
        usersMap.set(userId, {
          id: userId,
          email: '',
          displayName: `[Deleted User] ${userId.substring(0, 8)}...`,
          checkInCount: checkInData.count,
          lastCheckInAt: checkInData.lastCheckInAt,
        });
      }
    });

    // Convert to array and filter out users with no check-ins
    const users = Array.from(usersMap.values())
      .filter((u) => u.checkInCount > 0)
      .sort((a, b) => {
        // Sort by lastCheckInAt descending
        if (!a.lastCheckInAt) return 1;
        if (!b.lastCheckInAt) return -1;
        return b.lastCheckInAt.localeCompare(a.lastCheckInAt);
      });

    return NextResponse.json({ users });
  } catch (error: unknown) {
    console.error('[Admin Check-Ins Users API] Error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to fetch users';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
