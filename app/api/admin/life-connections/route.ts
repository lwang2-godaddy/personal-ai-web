import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';
import { callCloudFunctionAsUser } from '@/lib/services/admin/cloudFunctionCaller';

export const maxDuration = 300;

/**
 * GET /api/admin/life-connections
 * List life connections with filtering and cursor-based pagination
 *
 * Query params:
 * - userId: string (required)
 * - category: string (optional, filter by connection category)
 * - strength: string (optional, filter by strength: weak|moderate|strong)
 * - direction: string (optional, filter by direction: positive|negative)
 * - dismissed: string (optional, 'true'|'false')
 * - limit: number (optional, default 20)
 * - startAfter: string (optional, document ID for cursor-based pagination)
 *
 * Returns:
 * - connections: LifeConnection[]
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
    const strength = searchParams.get('strength');
    const direction = searchParams.get('direction');
    const dismissed = searchParams.get('dismissed');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const startAfter = searchParams.get('startAfter');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    const collectionPath = `users/${userId}/lifeConnections`;

    let query: FirebaseFirestore.Query = db
      .collection(collectionPath)
      .orderBy('detectedAt', 'desc');

    if (category) {
      query = query.where('category', '==', category);
    }

    if (strength) {
      query = query.where('strength', '==', strength);
    }

    // Cursor-based pagination
    if (startAfter) {
      const startAfterDoc = await db.collection(collectionPath).doc(startAfter).get();
      if (startAfterDoc.exists) {
        query = query.startAfter(startAfterDoc);
      }
    }

    query = query.limit(limit + 1);

    const snapshot = await query.get();
    const hasMore = snapshot.docs.length > limit;
    const docs = hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs;

    let connections = docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        category: data.category,
        direction: data.direction,
        strength: data.strength,
        domainA: data.domainA,
        domainB: data.domainB,
        metrics: data.metrics,
        title: data.title,
        description: data.description,
        explanation: data.explanation,
        recommendation: data.recommendation || null,
        timeLag: data.timeLag || null,
        withWithout: data.withWithout || null,
        survivesConfounderControl: data.survivesConfounderControl ?? null,
        confounderPartialR: data.confounderPartialR ?? null,
        confounderNote: data.confounderNote || null,
        trendDirection: data.trendDirection || null,
        dataPoints: data.dataPoints || [],
        detectedAt: data.detectedAt,
        expiresAt: data.expiresAt,
        dismissed: data.dismissed || false,
        userRating: data.userRating || null,
        aiGenerated: data.aiGenerated ?? true,
      };
    });

    // Filter by direction and dismissed in memory (avoids compound index)
    if (direction) {
      connections = connections.filter((c) => c.direction === direction);
    }
    if (dismissed === 'true') {
      connections = connections.filter((c) => c.dismissed);
    } else if (dismissed === 'false') {
      connections = connections.filter((c) => !c.dismissed);
    }

    // Get total count
    const countSnapshot = await db.collection(collectionPath).count().get();
    const totalCount = countSnapshot.data().count;

    return NextResponse.json({
      connections,
      hasMore: hasMore && connections.length > 0,
      totalCount,
    });
  } catch (error: unknown) {
    console.error('[Admin Life Connections API] Error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to fetch life connections';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/admin/life-connections
 * Trigger connection analysis for a user via analyzeLifeConnections Cloud Function
 *
 * Body:
 * - userId: string (required)
 * - lookbackDays: number (optional, default 90)
 * - force: boolean (optional, default true)
 */
export async function POST(request: NextRequest) {
  try {
    const { response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const body = await request.json();
    const { userId, lookbackDays, force } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const result = await callCloudFunctionAsUser(userId, 'analyzeLifeConnections', {
      lookbackDays: lookbackDays || 90,
      force: force !== undefined ? force : true,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('[Admin Life Connections API] POST Error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to analyze connections';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
