import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';

/**
 * GET /api/admin/fun-facts
 * List fun facts from both `fun_facts` and `funFacts` collections
 *
 * Query params:
 * - userId: string (required)
 * - category: string (optional)
 * - type: string (optional, for fun_facts collection)
 * - source: 'fun_facts' | 'funFacts' | 'all' (optional, default 'all')
 * - limit: number (optional, default 20)
 * - startAfter: string (optional, cursor doc ID — prefixed with collection name)
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
    const type = searchParams.get('type');
    const source = searchParams.get('source') || 'all';
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const startAfter = searchParams.get('startAfter');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();

    interface FunFactResult {
      id: string;
      userId: string;
      source: 'fun_facts' | 'funFacts';
      text?: string;
      category?: string;
      type?: string;
      templateKey?: string;
      templateValues?: Record<string, string | number>;
      confidence?: number;
      emoji?: string;
      dataPoints?: Array<{ type: string; id: string; snippet?: string }>;
      dataPointCount?: number;
      insightType?: string;
      periodType?: string;
      periodStart?: string;
      periodEnd?: string;
      generatedAt?: string;
      expiresAt?: string;
    }

    const results: FunFactResult[] = [];

    // Query fun_facts collection (template-based)
    if (source === 'all' || source === 'fun_facts') {
      let funFactsQuery: FirebaseFirestore.Query = db
        .collection('fun_facts')
        .where('userId', '==', userId)
        .orderBy('generatedAt', 'desc');

      if (category) {
        funFactsQuery = funFactsQuery.where('category', '==', category);
      }
      if (type) {
        funFactsQuery = funFactsQuery.where('type', '==', type);
      }

      // Apply cursor if it's from this collection
      if (startAfter && startAfter.startsWith('fun_facts:')) {
        const docId = startAfter.replace('fun_facts:', '');
        const startAfterDoc = await db.collection('fun_facts').doc(docId).get();
        if (startAfterDoc.exists) {
          funFactsQuery = funFactsQuery.startAfter(startAfterDoc);
        }
      }

      funFactsQuery = funFactsQuery.limit(limit + 1);
      const snapshot = await funFactsQuery.get();

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        results.push({
          id: `fun_facts:${doc.id}`,
          userId: data.userId,
          source: 'fun_facts',
          text: data.text || renderTemplate(data.templateKey, data.templateValues),
          category: data.category,
          type: data.type,
          templateKey: data.templateKey,
          templateValues: data.templateValues,
          confidence: data.confidence,
          emoji: data.emoji,
          dataPoints: data.dataPoints || [],
          dataPointCount: data.dataPoints?.length || 0,
          generatedAt: data.generatedAt,
          expiresAt: data.expiresAt,
        });
      });
    }

    // Query funFacts collection (legacy AI-generated)
    if (source === 'all' || source === 'funFacts') {
      let funFactsLegacyQuery: FirebaseFirestore.Query = db
        .collection('funFacts')
        .where('userId', '==', userId)
        .orderBy('generatedAt', 'desc');

      if (category) {
        funFactsLegacyQuery = funFactsLegacyQuery.where('category', '==', category);
      }

      // Apply cursor if it's from this collection
      if (startAfter && startAfter.startsWith('funFacts:')) {
        const docId = startAfter.replace('funFacts:', '');
        const startAfterDoc = await db.collection('funFacts').doc(docId).get();
        if (startAfterDoc.exists) {
          funFactsLegacyQuery = funFactsLegacyQuery.startAfter(startAfterDoc);
        }
      }

      funFactsLegacyQuery = funFactsLegacyQuery.limit(limit + 1);
      const snapshot = await funFactsLegacyQuery.get();

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        results.push({
          id: `funFacts:${doc.id}`,
          userId: data.userId,
          source: 'funFacts',
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
          generatedAt: data.generatedAt,
        });
      });
    }

    // Sort merged results by generatedAt descending
    results.sort((a, b) => {
      const aDate = a.generatedAt || '';
      const bDate = b.generatedAt || '';
      return bDate.localeCompare(aDate);
    });

    // Apply pagination to merged results
    const hasMore = results.length > limit;
    const facts = hasMore ? results.slice(0, limit) : results;

    // Get total counts
    let totalCount = 0;
    if (source === 'all' || source === 'fun_facts') {
      const countSnapshot = await db
        .collection('fun_facts')
        .where('userId', '==', userId)
        .count()
        .get();
      totalCount += countSnapshot.data().count;
    }
    if (source === 'all' || source === 'funFacts') {
      const countSnapshot = await db
        .collection('funFacts')
        .where('userId', '==', userId)
        .count()
        .get();
      totalCount += countSnapshot.data().count;
    }

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

/** Simple template renderer for fun facts */
function renderTemplate(
  templateKey?: string,
  templateValues?: Record<string, string | number>
): string {
  if (!templateKey || !templateValues) return '';
  let result = templateKey;
  Object.entries(templateValues).forEach(([key, value]) => {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
  });
  return result;
}
