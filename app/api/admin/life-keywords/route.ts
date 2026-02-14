import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';

/**
 * GET /api/admin/life-keywords
 * List life keywords with filtering and cursor-based pagination
 *
 * Query params:
 * - userId: string (required)
 * - category: string (optional, filter by keyword category)
 * - periodType: string (optional, filter by period type)
 * - visibility: 'all' | 'viewed' | 'hidden' (optional)
 * - limit: number (optional, default 20)
 * - startAfter: string (optional, document ID for cursor-based pagination)
 *
 * Returns:
 * - keywords: LifeKeyword[]
 * - hasMore: boolean
 * - totalCount: number
 */
export async function GET(request: NextRequest) {
  try {
    const { response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const category = searchParams.get('category');
    const periodType = searchParams.get('periodType');
    const visibility = searchParams.get('visibility');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const startAfter = searchParams.get('startAfter');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();

    let query: FirebaseFirestore.Query = db
      .collection('lifeKeywords')
      .where('userId', '==', userId)
      .orderBy('generatedAt', 'desc');

    if (category) {
      query = query.where('category', '==', category);
    }

    if (periodType) {
      query = query.where('periodType', '==', periodType);
    }

    // Cursor-based pagination
    if (startAfter) {
      const startAfterDoc = await db.collection('lifeKeywords').doc(startAfter).get();
      if (startAfterDoc.exists) {
        query = query.startAfter(startAfterDoc);
      }
    }

    query = query.limit(limit + 1);

    const snapshot = await query.get();
    const hasMore = snapshot.docs.length > limit;
    const docs = hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs;

    let keywords = docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        keyword: data.keyword,
        description: data.description,
        emoji: data.emoji,
        category: data.category,
        periodType: data.periodType,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        confidence: data.confidence,
        dominanceScore: data.dominanceScore,
        dataPointCount: data.dataPointCount,
        sampleDataPoints: data.sampleDataPoints || [],
        relatedDataTypes: data.relatedDataTypes || [],
        viewed: data.viewed || false,
        expanded: data.expanded || false,
        hidden: data.hidden || false,
        generatedAt: data.generatedAt,
      };
    });

    // Filter by visibility in memory (simpler than compound index)
    if (visibility === 'viewed') {
      keywords = keywords.filter((k) => k.viewed);
    } else if (visibility === 'hidden') {
      keywords = keywords.filter((k) => k.hidden);
    }

    // Get total count
    const countQuery = db
      .collection('lifeKeywords')
      .where('userId', '==', userId);
    const countSnapshot = await countQuery.count().get();
    const totalCount = countSnapshot.data().count;

    return NextResponse.json({
      keywords,
      hasMore: hasMore && keywords.length > 0,
      totalCount,
    });
  } catch (error: unknown) {
    console.error('[Admin Life Keywords API] Error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to fetch life keywords';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
