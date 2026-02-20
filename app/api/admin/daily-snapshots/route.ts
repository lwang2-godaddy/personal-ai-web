import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';
import { callCloudFunctionAsUser } from '@/lib/services/admin/cloudFunctionCaller';

export const maxDuration = 300;

/**
 * GET /api/admin/daily-snapshots
 * List daily snapshots with filtering and cursor-based pagination
 *
 * Query params:
 * - userId: string (required)
 * - mood: string (optional, filter by mood)
 * - limit: number (optional, default 20)
 * - startAfter: string (optional, document ID for cursor-based pagination)
 *
 * Returns:
 * - snapshots: DailySnapshot[]
 * - hasMore: boolean
 * - totalCount: number
 */
export async function GET(request: NextRequest) {
  try {
    const { response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const mood = searchParams.get('mood');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const startAfter = searchParams.get('startAfter');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const db = getAdminFirestore();

    let query: FirebaseFirestore.Query = db
      .collection('users')
      .doc(userId)
      .collection('dailyInsights')
      .orderBy('date', 'desc');

    if (startAfter) {
      const startAfterDoc = await db
        .collection('users')
        .doc(userId)
        .collection('dailyInsights')
        .doc(startAfter)
        .get();
      if (startAfterDoc.exists) {
        query = query.startAfter(startAfterDoc);
      }
    }

    query = query.limit(limit + 1);

    const snapshot = await query.get();
    const hasMore = snapshot.docs.length > limit;
    const docs = hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs;

    let snapshots = docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId,
        date: data.date,
        summary: data.summary,
        emoji: data.emoji,
        mood: data.mood,
        language: data.language,
        metrics: data.metrics || { steps: 0, calories: 0, workoutCount: 0, locationCount: 0 },
        generatedAt: data.generatedAt,
        cachedAt: data.cachedAt?.toDate?.() ? data.cachedAt.toDate().toISOString() : data.cachedAt,
        fromCache: data.fromCache || false,
        isViewingFriend: data.isViewingFriend || false,
      };
    });

    // Filter by mood in memory
    if (mood) {
      snapshots = snapshots.filter((s) => s.mood === mood);
    }

    // Get total count
    const countSnapshot = await db
      .collection('users')
      .doc(userId)
      .collection('dailyInsights')
      .count()
      .get();
    const totalCount = countSnapshot.data().count;

    return NextResponse.json({
      snapshots,
      hasMore: hasMore && snapshots.length > 0,
      totalCount,
    });
  } catch (error: unknown) {
    console.error('[Admin Daily Snapshots API] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch daily snapshots';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/admin/daily-snapshots
 * Trigger daily snapshot generation for a user via generateDailyInsight Cloud Function
 *
 * Body:
 * - userId: string (required)
 * - date: string (optional, default today's date)
 */
export async function POST(request: NextRequest) {
  try {
    const { response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const body = await request.json();
    const { userId, date } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const result = await callCloudFunctionAsUser(userId, 'generateDailyInsight', {
      date: date || new Date().toISOString().split('T')[0],
      forceRefresh: true,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('[Admin Daily Snapshots API] POST Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate daily snapshot';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
