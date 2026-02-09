/**
 * Admin Vocabulary Suggestions API
 *
 * GET /api/admin/vocabulary/suggestions - Get vocabulary suggestions from memory extraction
 * POST /api/admin/vocabulary/suggestions - Approve/reject suggestions
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/vocabulary/suggestions
 * Returns vocabulary suggestions extracted from memories
 */
export async function GET(request: NextRequest) {
  const { user, response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    const db = getAdminFirestore();
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const status = url.searchParams.get('status') || 'pending';
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);

    // Query vocabulary suggestions
    let query = db.collectionGroup('learnedVocabulary')
      .where('source', '==', 'memory_extraction')
      .orderBy('createdAt', 'desc')
      .limit(limit);

    if (userId) {
      query = db.collection('users').doc(userId).collection('learnedVocabulary')
        .where('source', '==', 'memory_extraction')
        .orderBy('createdAt', 'desc')
        .limit(limit);
    }

    const snapshot = await query.get();
    const suggestions = snapshot.docs.map((doc) => {
      const data = doc.data() as Record<string, any>;
      return {
        id: doc.id,
        userId: doc.ref.parent.parent?.id,
        ...data,
      };
    });

    // Get summary stats
    const totalCount = snapshot.size;
    const byCategory: Record<string, number> = {};
    suggestions.forEach((s) => {
      const category = (s as any).category || 'unknown';
      byCategory[category] = (byCategory[category] || 0) + 1;
    });

    return NextResponse.json({
      suggestions,
      summary: {
        total: totalCount,
        byCategory,
      },
    });
  } catch (error: any) {
    console.error('[Admin Vocabulary Suggestions API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get vocabulary suggestions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/vocabulary/suggestions
 * Approve or reject vocabulary suggestions
 *
 * Body:
 * - { action: 'approve' | 'reject', suggestionId: string, userId: string }
 * - { action: 'bulk-approve', suggestionIds: string[], userId: string }
 * - { action: 'bulk-reject', suggestionIds: string[], userId: string }
 */
export async function POST(request: NextRequest) {
  const { user, response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    const body = await request.json();
    const db = getAdminFirestore();

    if (body.action === 'approve' && body.suggestionId && body.userId) {
      // Approve single suggestion (mark as verified)
      const docRef = db
        .collection('users')
        .doc(body.userId)
        .collection('learnedVocabulary')
        .doc(body.suggestionId);

      await docRef.update({
        verified: true,
        updatedAt: new Date().toISOString(),
      });

      return NextResponse.json({ success: true, action: 'approved', id: body.suggestionId });
    }

    if (body.action === 'reject' && body.suggestionId && body.userId) {
      // Reject suggestion (delete it)
      const docRef = db
        .collection('users')
        .doc(body.userId)
        .collection('learnedVocabulary')
        .doc(body.suggestionId);

      await docRef.delete();

      return NextResponse.json({ success: true, action: 'rejected', id: body.suggestionId });
    }

    if (body.action === 'bulk-approve' && Array.isArray(body.suggestionIds) && body.userId) {
      const batch = db.batch();
      body.suggestionIds.forEach((id: string) => {
        const docRef = db
          .collection('users')
          .doc(body.userId)
          .collection('learnedVocabulary')
          .doc(id);
        batch.update(docRef, {
          verified: true,
          updatedAt: new Date().toISOString(),
        });
      });
      await batch.commit();

      return NextResponse.json({
        success: true,
        action: 'bulk-approved',
        count: body.suggestionIds.length,
      });
    }

    if (body.action === 'bulk-reject' && Array.isArray(body.suggestionIds) && body.userId) {
      const batch = db.batch();
      body.suggestionIds.forEach((id: string) => {
        const docRef = db
          .collection('users')
          .doc(body.userId)
          .collection('learnedVocabulary')
          .doc(id);
        batch.delete(docRef);
      });
      await batch.commit();

      return NextResponse.json({
        success: true,
        action: 'bulk-rejected',
        count: body.suggestionIds.length,
      });
    }

    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[Admin Vocabulary Suggestions API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process vocabulary suggestion' },
      { status: 500 }
    );
  }
}
