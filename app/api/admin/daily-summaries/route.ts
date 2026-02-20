import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';
import { callCloudFunctionAsUser } from '@/lib/services/admin/cloudFunctionCaller';

export const maxDuration = 300;

/**
 * GET /api/admin/daily-summaries
 * List daily summaries with filtering and cursor-based pagination
 *
 * Query params:
 * - userId: string (required)
 * - period: string (optional, filter by period: daily/weekly/monthly)
 * - limit: number (optional, default 20)
 * - startAfter: string (optional, document ID for cursor-based pagination)
 *
 * Returns:
 * - summaries: DailySummary[]
 * - hasMore: boolean
 * - totalCount: number
 */
export async function GET(request: NextRequest) {
  try {
    const { response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const period = searchParams.get('period');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const startAfter = searchParams.get('startAfter');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const db = getAdminFirestore();

    // Top-level summaries collection, filtered by userId
    let query: FirebaseFirestore.Query = db
      .collection('summaries')
      .where('userId', '==', userId)
      .orderBy('date', 'desc');

    // Apply period filter in Firestore query
    if (period) {
      query = query.where('period', '==', period);
    }

    if (startAfter) {
      const startAfterDoc = await db
        .collection('summaries')
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

    const summaries = docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        period: data.period,
        date: data.date,
        startDate: data.startDate,
        endDate: data.endDate,
        textSummary: data.textSummary || '',
        generationMethod: data.generationMethod || 'ai',
        notificationSent: data.notificationSent || false,
        metrics: data.metrics || {},
        highlights: data.highlights || [],
        comparison: data.comparison || null,
        generatedAt: data.generatedAt?.toDate?.() ? data.generatedAt.toDate().toISOString() : data.generatedAt,
        viewedAt: data.viewedAt?.toDate?.() ? data.viewedAt.toDate().toISOString() : data.viewedAt,
        createdAt: data.createdAt?.toDate?.() ? data.createdAt.toDate().toISOString() : data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() ? data.updatedAt.toDate().toISOString() : data.updatedAt,
      };
    });

    // Get total count (filtered by userId, optionally by period)
    let countQuery: FirebaseFirestore.Query = db
      .collection('summaries')
      .where('userId', '==', userId);
    if (period) {
      countQuery = countQuery.where('period', '==', period);
    }
    const countSnapshot = await countQuery.count().get();
    const totalCount = countSnapshot.data().count;

    return NextResponse.json({
      summaries,
      hasMore: hasMore && summaries.length > 0,
      totalCount,
    });
  } catch (error: unknown) {
    console.error('[Admin Daily Summaries API] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch daily summaries';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/admin/daily-summaries
 * Trigger daily summary generation for a user via generateAISummary Cloud Function
 *
 * Body:
 * - userId: string (required)
 * - period: string (optional, default 'daily')
 * - date: string (optional, default yesterday's date)
 */
export async function POST(request: NextRequest) {
  try {
    const { response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const body = await request.json();
    const { userId, period, date } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const result = await callCloudFunctionAsUser(userId, 'generateAISummary', {
      period: period || 'daily',
      date: date || undefined,
      forceRefresh: true,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('[Admin Daily Summaries API] POST Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate daily summary';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
