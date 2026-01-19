import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';
import { Friendship, FriendWithProfile } from '@/lib/models/Friend';

/**
 * GET /api/friends
 * Get all friends for the authenticated user
 *
 * Returns:
 * - friends: FriendWithProfile[] - List of friends with profile information
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const { user, response: authResponse } = await requireAuth(request);
    if (authResponse) return authResponse;

    const userId = user.uid;
    const db = getAdminFirestore();

    console.log('[Friends API] Fetching friends for user:', userId);

    // Query friendships where user is the initiator (userId field)
    const initiatedQuery = db
      .collection('friends')
      .where('userId', '==', userId);

    // Query friendships where user is the friend (friendUid field)
    const receivedQuery = db
      .collection('friends')
      .where('friendUid', '==', userId);

    // Execute both queries in parallel
    const [initiatedSnapshot, receivedSnapshot] = await Promise.all([
      initiatedQuery.get(),
      receivedQuery.get(),
    ]);

    // Collect all friend user IDs
    const friendUserIds: Set<string> = new Set();
    const friendshipMap: Map<string, { friendshipId: string; createdAt: string }> = new Map();

    // Process initiated friendships (user is userId, friend is friendUid)
    initiatedSnapshot.docs.forEach((doc) => {
      const data = doc.data() as Friendship;
      friendUserIds.add(data.friendUid);
      friendshipMap.set(data.friendUid, {
        friendshipId: doc.id,
        createdAt: data.createdAt || new Date().toISOString(),
      });
    });

    // Process received friendships (user is friendUid, friend is userId)
    receivedSnapshot.docs.forEach((doc) => {
      const data = doc.data() as Friendship;
      // Only add if not already in the set (avoid duplicates)
      if (!friendUserIds.has(data.userId)) {
        friendUserIds.add(data.userId);
        friendshipMap.set(data.userId, {
          friendshipId: doc.id,
          createdAt: data.createdAt || new Date().toISOString(),
        });
      }
    });

    console.log('[Friends API] Found', friendUserIds.size, 'friends');

    // If no friends, return empty array
    if (friendUserIds.size === 0) {
      return NextResponse.json({ friends: [] }, { status: 200 });
    }

    // Fetch user profiles for all friends
    const friendIdsArray = Array.from(friendUserIds);
    const userProfiles: FriendWithProfile[] = [];

    // Firestore 'in' queries are limited to 30 items, so batch if needed
    const batchSize = 30;
    for (let i = 0; i < friendIdsArray.length; i += batchSize) {
      const batch = friendIdsArray.slice(i, i + batchSize);

      // Get user documents directly by ID
      const userDocs = await Promise.all(
        batch.map((friendId) => db.collection('users').doc(friendId).get())
      );

      userDocs.forEach((userDoc) => {
        if (userDoc.exists) {
          const userData = userDoc.data();
          const friendshipInfo = friendshipMap.get(userDoc.id);

          userProfiles.push({
            friendshipId: friendshipInfo?.friendshipId || '',
            friendUserId: userDoc.id,
            displayName: userData?.displayName || null,
            email: userData?.email || null,
            photoURL: userData?.photoURL || null,
            createdAt: friendshipInfo?.createdAt || new Date().toISOString(),
          });
        }
      });
    }

    // Sort by display name (nulls last)
    userProfiles.sort((a, b) => {
      const nameA = a.displayName || a.email || '';
      const nameB = b.displayName || b.email || '';
      return nameA.localeCompare(nameB);
    });

    console.log('[Friends API] Returning', userProfiles.length, 'friends with profiles');

    return NextResponse.json({ friends: userProfiles }, { status: 200 });
  } catch (error: any) {
    console.error('[Friends API] Error fetching friends:', error);

    return NextResponse.json(
      { error: `Failed to fetch friends: ${error.message}` },
      { status: 500 }
    );
  }
}
