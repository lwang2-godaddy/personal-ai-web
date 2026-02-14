import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';

/**
 * GET /api/admin/fun-facts
 * List fun facts from `funFacts` collection (unified AI+data hybrid system)
 *
 * Query params:
 * - userId: string (required)
 * - category: string (optional)
 * - limit: number (optional, default 20)
 * - startAfter: string (optional, cursor doc ID)
 *
 * Returns:
 * - facts: FunFact[]
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
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const startAfter = searchParams.get('startAfter');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();

    // Query funFacts collection (unified hybrid AI+data facts)
    let funFactsQuery: FirebaseFirestore.Query = db
      .collection('funFacts')
      .where('userId', '==', userId)
      .orderBy('generatedAt', 'desc');

    if (category) {
      funFactsQuery = funFactsQuery.where('category', '==', category);
    }

    // Apply cursor for pagination
    if (startAfter) {
      const startAfterDoc = await db.collection('funFacts').doc(startAfter).get();
      if (startAfterDoc.exists) {
        funFactsQuery = funFactsQuery.startAfter(startAfterDoc);
      }
    }

    funFactsQuery = funFactsQuery.limit(limit + 1);
    const snapshot = await funFactsQuery.get();

    const results = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        source: 'funFacts' as const,
        text: data.text,
        category: data.category,
        type: data.insightType,
        confidence: data.confidence,
        emoji: data.emoji,
        insightType: data.insightType,
        periodType: data.periodType,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        dataPointCount: data.dataPointCount || 0,
        periodLabel: data.periodLabel,
        generatedAt: data.generatedAt,
        viewed: data.viewed ?? false,
        hidden: data.hidden ?? false,
      };
    });

    // Apply pagination
    const hasMore = results.length > limit;
    const facts = hasMore ? results.slice(0, limit) : results;

    // Get total count
    const countSnapshot = await db
      .collection('funFacts')
      .where('userId', '==', userId)
      .count()
      .get();
    const totalCount = countSnapshot.data().count;

    return NextResponse.json({
      facts,
      hasMore: hasMore && facts.length > 0,
      totalCount,
    });
  } catch (error: unknown) {
    console.error('[Admin Fun Facts API] Error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to fetch fun facts';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
