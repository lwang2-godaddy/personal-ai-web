import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/vocabulary
 *
 * Get vocabulary items for admin management
 * Optionally filter by userId
 */
export async function GET(request: NextRequest) {
  // Require admin access
  const { user, response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    const db = getAdminFirestore();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    let vocabulary: any[] = [];
    let users: { uid: string; email: string }[] = [];

    // Get list of users for the filter dropdown
    const usersSnapshot = await db.collection('users').limit(100).get();
    users = usersSnapshot.docs.map((doc) => ({
      uid: doc.id,
      email: doc.data().email || doc.id,
    }));

    if (userId && userId !== 'all') {
      // Get vocabulary for specific user
      const vocabSnapshot = await db
        .collection('users')
        .doc(userId)
        .collection('learnedVocabulary')
        .orderBy('updatedAt', 'desc')
        .limit(500)
        .get();

      vocabulary = vocabSnapshot.docs.map((doc) => ({
        id: doc.id,
        userId,
        ...doc.data(),
      }));
    } else {
      // Get vocabulary across all users (sample from first few users)
      for (const userDoc of usersSnapshot.docs.slice(0, 10)) {
        const vocabSnapshot = await db
          .collection('users')
          .doc(userDoc.id)
          .collection('learnedVocabulary')
          .orderBy('updatedAt', 'desc')
          .limit(100)
          .get();

        const userVocab = vocabSnapshot.docs.map((doc) => ({
          id: doc.id,
          userId: userDoc.id,
          ...doc.data(),
        }));

        vocabulary.push(...userVocab);
      }
    }

    // Calculate stats
    const stats = {
      totalCount: vocabulary.length,
      bySource: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      recentlyLearned: 0,
    };

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    vocabulary.forEach((v) => {
      // Count by source
      const source = v.source || 'manual_edit';
      stats.bySource[source] = (stats.bySource[source] || 0) + 1;

      // Count by category
      stats.byCategory[v.category] = (stats.byCategory[v.category] || 0) + 1;

      // Count recently learned
      const createdAt = new Date(v.createdAt);
      if (createdAt > oneWeekAgo) {
        stats.recentlyLearned++;
      }
    });

    return NextResponse.json({
      vocabulary,
      stats,
      users,
    });
  } catch (error: any) {
    console.error('Error fetching vocabulary:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch vocabulary' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/vocabulary
 *
 * Delete a vocabulary item
 */
export async function DELETE(request: NextRequest) {
  // Require admin access
  const { user, response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    const db = getAdminFirestore();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const vocabId = searchParams.get('vocabId');

    if (!userId || !vocabId) {
      return NextResponse.json(
        { error: 'userId and vocabId are required' },
        { status: 400 }
      );
    }

    // Delete the vocabulary item
    await db
      .collection('users')
      .doc(userId)
      .collection('learnedVocabulary')
      .doc(vocabId)
      .delete();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting vocabulary:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete vocabulary' },
      { status: 500 }
    );
  }
}
