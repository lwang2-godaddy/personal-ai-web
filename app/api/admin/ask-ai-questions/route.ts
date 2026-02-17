import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';

export const maxDuration = 300;

/**
 * GET /api/admin/ask-ai-questions
 * List personalized Ask AI questions with filtering and stats
 *
 * Query params:
 * - userId: string (optional, filter by user)
 * - contextType: string (optional, filter by diary/voice/photo/location/health/lifefeed)
 * - questionType: 'heuristic' | 'ai_generated' (optional)
 * - signalType: string (optional, e.g. 'visit_frequency', 'streak')
 * - wasUsed: 'true' | 'false' (optional)
 * - dateRange: '1d' | '7d' | '30d' | 'all' (optional, default '7d')
 * - limit: number (optional, default 50)
 * - startAfter: string (optional, document ID for cursor-based pagination)
 *
 * Returns:
 * - questions: AskAiQuestion[]
 * - hasMore: boolean
 * - totalCount: number
 * - stats: { heuristicCount, aiGeneratedCount, usageRate, avgSignalStrength }
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin role
    const { response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const contextType = searchParams.get('contextType');
    const questionType = searchParams.get('questionType');
    const signalType = searchParams.get('signalType');
    const wasUsed = searchParams.get('wasUsed');
    const dateRange = searchParams.get('dateRange') || '7d';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const startAfter = searchParams.get('startAfter');

    const db = getAdminFirestore();

    // Calculate date filter
    let startDate: string | null = null;
    const now = new Date();
    if (dateRange === '1d') {
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    } else if (dateRange === '7d') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    } else if (dateRange === '30d') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    }
    // 'all' = no date filter

    // Build query
    let query: FirebaseFirestore.Query = db
      .collection('askAiQuestions')
      .orderBy('generatedAt', 'desc');

    // Apply filters
    if (userId) {
      query = query.where('userId', '==', userId);
    }

    if (contextType) {
      query = query.where('contextType', '==', contextType);
    }

    if (questionType) {
      query = query.where('questionType', '==', questionType);
    }

    if (signalType) {
      query = query.where('signalType', '==', signalType);
    }

    if (startDate) {
      query = query.where('generatedAt', '>=', startDate);
    }

    // Cursor-based pagination
    if (startAfter) {
      const startAfterDoc = await db.collection('askAiQuestions').doc(startAfter).get();
      if (startAfterDoc.exists) {
        query = query.startAfter(startAfterDoc);
      }
    }

    // Fetch one extra to determine if there are more results
    query = query.limit(limit + 1);

    const snapshot = await query.get();

    const hasMore = snapshot.docs.length > limit;
    const docs = hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs;

    // Convert documents to question objects
    let questions = docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        contextType: data.contextType,
        contextItemId: data.contextItemId,
        contextSnippet: data.contextSnippet || '',
        questionText: data.questionText,
        questionType: data.questionType,
        signalType: data.signalType,
        signalStrength: data.signalStrength,
        provenance: data.provenance || null,
        relatedItems: data.relatedItems || [],
        wasUsed: data.wasUsed || false,
        userFeedback: data.userFeedback,
        generatedAt: data.generatedAt,
        usedAt: data.usedAt,
      };
    });

    // Filter by wasUsed in memory (can't easily combine with other filters in Firestore)
    if (wasUsed === 'true') {
      questions = questions.filter((q) => q.wasUsed === true);
    } else if (wasUsed === 'false') {
      questions = questions.filter((q) => q.wasUsed === false);
    }

    // Calculate stats
    // Get all questions for stats (with same filters except pagination)
    let statsQuery: FirebaseFirestore.Query = db.collection('askAiQuestions');

    if (userId) {
      statsQuery = statsQuery.where('userId', '==', userId);
    }
    if (contextType) {
      statsQuery = statsQuery.where('contextType', '==', contextType);
    }
    if (questionType) {
      statsQuery = statsQuery.where('questionType', '==', questionType);
    }
    if (signalType) {
      statsQuery = statsQuery.where('signalType', '==', signalType);
    }
    if (startDate) {
      statsQuery = statsQuery.where('generatedAt', '>=', startDate);
    }

    const statsSnapshot = await statsQuery.get();
    const allQuestions = statsSnapshot.docs.map((doc) => doc.data());

    let heuristicCount = 0;
    let aiGeneratedCount = 0;
    let usedCount = 0;
    let totalSignalStrength = 0;
    let signalCount = 0;

    allQuestions.forEach((q) => {
      if (q.questionType === 'heuristic') {
        heuristicCount++;
      } else if (q.questionType === 'ai_generated') {
        aiGeneratedCount++;
      }

      if (q.wasUsed) {
        usedCount++;
      }

      if (typeof q.signalStrength === 'number') {
        totalSignalStrength += q.signalStrength;
        signalCount++;
      }
    });

    const totalCount = allQuestions.length;
    const usageRate = totalCount > 0 ? usedCount / totalCount : 0;
    const avgSignalStrength = signalCount > 0 ? totalSignalStrength / signalCount : 0;

    return NextResponse.json({
      questions,
      hasMore: hasMore && questions.length > 0,
      totalCount,
      stats: {
        heuristicCount,
        aiGeneratedCount,
        usageRate,
        avgSignalStrength,
      },
    });
  } catch (error: unknown) {
    console.error('[Admin Ask AI Questions API] Error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to fetch questions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
