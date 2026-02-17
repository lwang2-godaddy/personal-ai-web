import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';

/**
 * GET /api/admin/ask-ai-questions/users
 * Get list of users with Ask AI question counts
 *
 * Returns:
 * - users: [{ id, email, displayName, questionCount, lastQuestionAt }]
 *
 * Sorted by most recent question activity
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin role
    const { response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const db = getAdminFirestore();

    // Get all users
    const usersSnapshot = await db.collection('users').get();
    const usersMap = new Map<
      string,
      {
        id: string;
        email: string;
        displayName: string;
        questionCount: number;
        lastQuestionAt: string | null;
      }
    >();

    // Initialize users map
    usersSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      usersMap.set(doc.id, {
        id: doc.id,
        email: data.email || '',
        displayName: data.displayName || data.email?.split('@')[0] || 'Unknown',
        questionCount: 0,
        lastQuestionAt: null,
      });
    });

    // Get question counts and last question dates
    const questionsSnapshot = await db
      .collection('askAiQuestions')
      .orderBy('generatedAt', 'desc')
      .get();

    // Count questions per user and track last question
    const userQuestionData = new Map<string, { count: number; lastQuestionAt: string }>();
    questionsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const userId = data.userId;
      const generatedAt = data.generatedAt;

      if (!userQuestionData.has(userId)) {
        userQuestionData.set(userId, { count: 0, lastQuestionAt: generatedAt });
      }

      const userData = userQuestionData.get(userId)!;
      userData.count++;
      // Keep the most recent generatedAt (first one encountered since ordered desc)
    });

    // Merge question data into users
    userQuestionData.forEach((questionData, userId) => {
      const user = usersMap.get(userId);
      if (user) {
        user.questionCount = questionData.count;
        user.lastQuestionAt = questionData.lastQuestionAt;
      } else {
        // User might have been deleted but questions remain
        usersMap.set(userId, {
          id: userId,
          email: '',
          displayName: `[Deleted User] ${userId.substring(0, 8)}...`,
          questionCount: questionData.count,
          lastQuestionAt: questionData.lastQuestionAt,
        });
      }
    });

    // Convert to array and filter out users with no questions
    const users = Array.from(usersMap.values())
      .filter((u) => u.questionCount > 0)
      .sort((a, b) => {
        // Sort by lastQuestionAt descending
        if (!a.lastQuestionAt) return 1;
        if (!b.lastQuestionAt) return -1;
        return b.lastQuestionAt.localeCompare(a.lastQuestionAt);
      });

    return NextResponse.json({ users });
  } catch (error: unknown) {
    console.error('[Admin Ask AI Questions Users API] Error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to fetch users';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
