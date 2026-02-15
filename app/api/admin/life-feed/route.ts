import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';
import { callCloudFunctionAsUser } from '@/lib/services/admin/cloudFunctionCaller';

export const maxDuration = 300;

/**
 * GET /api/admin/life-feed
 * List life feed posts with full source and provenance details
 *
 * Query params:
 * - userId: string (required for user-specific view)
 * - type: string (optional, filter by post type e.g. 'life_summary')
 * - generationType: 'ai' | 'template' | 'all' (optional, filter by AI vs template posts)
 * - startDate: string (optional, ISO date string for date range start)
 * - endDate: string (optional, ISO date string for date range end)
 * - limit: number (optional, default 20)
 * - startAfter: string (optional, document ID for cursor-based pagination)
 *
 * Returns:
 * - posts: LifeFeedPost[] (with full sources and provenance)
 * - hasMore: boolean
 * - totalCount: number (approximate)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin role
    const { response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type');
    const generationType = searchParams.get('generationType'); // 'ai' | 'template' | 'all'
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const startAfter = searchParams.get('startAfter');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();

    // Build query - order by publishedAt desc, fallback to generatedAt
    let query: FirebaseFirestore.Query = db
      .collection('lifeFeedPosts')
      .where('userId', '==', userId)
      .orderBy('publishedAt', 'desc');

    // Apply filters
    if (type) {
      query = query.where('type', '==', type);
    }

    if (startDate) {
      query = query.where('publishedAt', '>=', startDate);
    }

    if (endDate) {
      query = query.where('publishedAt', '<=', endDate);
    }

    // Cursor-based pagination
    if (startAfter) {
      const startAfterDoc = await db.collection('lifeFeedPosts').doc(startAfter).get();
      if (startAfterDoc.exists) {
        query = query.startAfter(startAfterDoc);
      }
    }

    // Fetch one extra to determine if there are more results
    query = query.limit(limit + 1);

    const snapshot = await query.get();

    const hasMore = snapshot.docs.length > limit;
    const docs = hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs;

    // Convert documents to post objects with full details
    let posts = docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        type: data.type,
        category: data.category,
        content: data.content,
        contentWithEmoji: data.contentWithEmoji,
        emoji: data.emoji,
        hashtags: data.hashtags || [],
        confidence: data.confidence,
        sources: data.sources || [], // Full sources array
        provenance: data.provenance || null, // Full provenance object
        engagement: data.engagement || {
          viewed: false,
          liked: false,
          shared: false,
          dismissed: false,
        },
        dateRange: data.dateRange,
        publishedAt: data.publishedAt,
        generatedAt: data.generatedAt,
        flagged: data.flagged || false,
        // Computed fields for filtering
        isAiGenerated: !!data.provenance?.promptExecutionId,
        isTemplate: !!data.provenance?.upstreamService,
      };
    });

    // Filter by generation type (AI vs template) - done in memory since Firestore
    // doesn't support querying on nested field existence easily
    if (generationType === 'ai') {
      posts = posts.filter((p) => p.isAiGenerated);
    } else if (generationType === 'template') {
      posts = posts.filter((p) => p.isTemplate && !p.isAiGenerated);
    }

    // Get total count for user (approximate)
    const countQuery = db
      .collection('lifeFeedPosts')
      .where('userId', '==', userId);
    const countSnapshot = await countQuery.count().get();
    const totalCount = countSnapshot.data().count;

    return NextResponse.json({
      posts,
      hasMore: hasMore && posts.length > 0,
      totalCount,
    });
  } catch (error: unknown) {
    console.error('[Admin Life Feed API] Error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to fetch life feed posts';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/admin/life-feed
 * Trigger life feed generation for a user via generateLifeFeedNow Cloud Function
 *
 * Body:
 * - userId: string (required)
 */
export async function POST(request: NextRequest) {
  try {
    const { response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const result = await callCloudFunctionAsUser(userId, 'generateLifeFeedNow', {});

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('[Admin Life Feed API] POST Error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to generate life feed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
