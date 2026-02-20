import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';

export const maxDuration = 60;

/**
 * GET /api/admin/chat-history/users
 * List all users with their chat conversation counts
 *
 * Data structure in Firestore:
 * - Conversations: users/{userId}/conversations/{conversationId}
 * - Messages: chat_messages collection (root) with userId and conversationId fields
 *
 * Returns:
 * - users: UserWithChats[]
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin role
    const { response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const db = getAdminFirestore();

    // Get all users
    const usersSnapshot = await db.collection('users').get();

    // For each user, count their conversations from the subcollection
    const usersWithChats = await Promise.all(
      usersSnapshot.docs.map(async (userDoc) => {
        const userData = userDoc.data();

        // Count conversations from users/{userId}/conversations
        const conversationsSnapshot = await db
          .collection('users')
          .doc(userDoc.id)
          .collection('conversations')
          .get();

        const conversationCount = conversationsSnapshot.size;

        // Get the most recent conversation and total message count
        let lastChatAt: string | null = null;
        let totalMessages = 0;

        if (conversationCount > 0) {
          // Get most recent conversation
          const recentConvSnapshot = await db
            .collection('users')
            .doc(userDoc.id)
            .collection('conversations')
            .orderBy('updatedAt', 'desc')
            .limit(1)
            .get();

          if (!recentConvSnapshot.empty) {
            const lastConv = recentConvSnapshot.docs[0].data();
            const updatedAt = lastConv.updatedAt;
            lastChatAt = updatedAt?.toDate?.()
              ? updatedAt.toDate().toISOString()
              : updatedAt || null;
          }

          // Count total messages for this user from chat_messages collection
          const messagesCountSnapshot = await db
            .collection('chat_messages')
            .where('userId', '==', userDoc.id)
            .count()
            .get();

          totalMessages = messagesCountSnapshot.data().count;
        }

        return {
          id: userDoc.id,
          email: userData.email || 'No email',
          displayName: userData.displayName || 'Unknown',
          chatCount: conversationCount,
          totalMessages,
          lastChatAt,
        };
      })
    );

    // Sort by chat count (descending), then by last activity
    const sortedUsers = usersWithChats
      .filter((u) => u.chatCount > 0) // Only show users with chats
      .sort((a, b) => {
        if (b.chatCount !== a.chatCount) {
          return b.chatCount - a.chatCount;
        }
        if (!a.lastChatAt) return 1;
        if (!b.lastChatAt) return -1;
        return new Date(b.lastChatAt).getTime() - new Date(a.lastChatAt).getTime();
      });

    return NextResponse.json({ users: sortedUsers });
  } catch (error: unknown) {
    console.error('[Admin Chat History Users API] Error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to fetch users';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
