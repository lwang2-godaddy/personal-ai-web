import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';

/**
 * GET /api/admin/life-feed/users
 * Get list of users with life feed post counts
 *
 * Returns:
 * - users: [{ id, email, displayName, postCount, lastPostAt }]
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
      postCount: number;
      lastPostAt: string | null;
    }>();

    // Initialize users map
    usersSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      usersMap.set(doc.id, {
        id: doc.id,
        email: data.email || '',
        displayName: data.displayName || data.email?.split('@')[0] || 'Unknown',
        postCount: 0,
        lastPostAt: null,
      });
    });

    // Get post counts and last post dates using aggregation
    // For better performance, we'll query the lifeFeedPosts collection grouped by userId
    const postsSnapshot = await db
      .collection('lifeFeedPosts')
      .orderBy('publishedAt', 'desc')
      .get();

    // Count posts per user and track last post
    const userPostData = new Map<string, { count: number; lastPostAt: string }>();
    postsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const userId = data.userId;
      const publishedAt = data.publishedAt || data.generatedAt;

      if (!userPostData.has(userId)) {
        userPostData.set(userId, { count: 0, lastPostAt: publishedAt });
      }

      const userData = userPostData.get(userId)!;
      userData.count++;
      // Keep the most recent publishedAt (first one encountered since ordered desc)
    });

    // Merge post data into users
    userPostData.forEach((postData, userId) => {
      const user = usersMap.get(userId);
      if (user) {
        user.postCount = postData.count;
        user.lastPostAt = postData.lastPostAt;
      } else {
        // User might have been deleted but posts remain
        usersMap.set(userId, {
          id: userId,
          email: '',
          displayName: `[Deleted User] ${userId.substring(0, 8)}...`,
          postCount: postData.count,
          lastPostAt: postData.lastPostAt,
        });
      }
    });

    // Convert to array and filter out users with no posts
    const users = Array.from(usersMap.values())
      .filter((u) => u.postCount > 0)
      .sort((a, b) => {
        // Sort by lastPostAt descending
        if (!a.lastPostAt) return 1;
        if (!b.lastPostAt) return -1;
        return b.lastPostAt.localeCompare(a.lastPostAt);
      });

    return NextResponse.json({ users });
  } catch (error: unknown) {
    console.error('[Admin Life Feed Users API] Error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to fetch users';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
