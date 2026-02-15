import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';

/**
 * GET /api/admin/insights/posts
 * List life feed posts with provenance data
 *
 * Query params:
 * - limit: number (optional, default 50)
 * - type: string (optional, filter by post type e.g. 'life_summary')
 * - service: string (optional, filter by provenance.service e.g. 'LifeFeedGenerator')
 * - userId: string (optional, filter by userId)
 * - startDate: string (optional, ISO date string for date range start)
 * - endDate: string (optional, ISO date string for date range end)
 * - startAfter: string (optional, document ID for cursor-based pagination)
 *
 * Returns:
 * - posts: LifeFeedPost[] (with provenance)
 * - hasMore: boolean
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin role
    const { response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const type = searchParams.get('type');
    const service = searchParams.get('service');
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const startAfter = searchParams.get('startAfter');

    const db = getAdminFirestore();

    // Build query - order by generatedAt desc
    let query: FirebaseFirestore.Query = db
      .collection('lifeFeedPosts')
      .orderBy('generatedAt', 'desc');

    // Apply filters
    if (type) {
      query = query.where('type', '==', type);
    }

    if (userId) {
      query = query.where('userId', '==', userId);
    }

    if (service) {
      query = query.where('provenance.service', '==', service);
    }

    if (startDate) {
      query = query.where('generatedAt', '>=', startDate);
    }

    if (endDate) {
      query = query.where('generatedAt', '<=', endDate);
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

    // Convert documents to post objects
    const posts = docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        content: data.content,
        contentWithEmoji: data.contentWithEmoji,
        type: data.type,
        category: data.category,
        emoji: data.emoji,
        hashtags: data.hashtags,
        confidence: data.confidence,
        sources: data.sources,
        dateRange: data.dateRange,
        generatedAt: data.generatedAt,
        publishedAt: data.publishedAt,
        flagged: data.flagged,
        provenance: data.provenance || null,
        engagement: data.engagement,
        likeCount: data.likeCount || 0,
        commentCount: data.commentCount || 0,
        viewCount: data.viewCount || 0,
      };
    });

    return NextResponse.json({ posts, hasMore });
  } catch (error: unknown) {
    console.error('[Admin Insights Posts API] Error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to fetch life feed posts';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
