import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';

interface RouteParams {
  params: Promise<{ postId: string }>;
}

/**
 * GET /api/admin/insights/posts/{postId}
 * Get a single life feed post with its linked prompt execution
 *
 * Returns:
 * - post: LifeFeedPost (full document)
 * - execution?: PromptExecution (if provenance.promptExecutionId exists)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Verify admin role
    const { response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const { postId } = await params;

    const db = getAdminFirestore();

    // Fetch the post
    const postDoc = await db.collection('lifeFeedPosts').doc(postId).get();

    if (!postDoc.exists) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    const postData = postDoc.data()!;
    const post = {
      id: postDoc.id,
      ...postData,
    };

    // If provenance has a promptExecutionId, fetch the execution record
    let execution = null;
    const executionId = postData.provenance?.promptExecutionId;

    if (executionId) {
      const executionDoc = await db
        .collection('promptExecutions')
        .doc(executionId)
        .get();

      if (executionDoc.exists) {
        const execData = executionDoc.data()!;
        execution = {
          id: executionDoc.id,
          userId: execData.userId,
          service: execData.service,
          promptId: execData.promptId,
          language: execData.language,
          promptVersion: execData.promptVersion,
          promptSource: execData.promptSource,
          model: execData.model,
          temperature: execData.temperature,
          maxTokens: execData.maxTokens,
          inputSummary: execData.inputSummary,
          inputTokens: execData.inputTokens,
          outputSummary: execData.outputSummary,
          outputTokens: execData.outputTokens,
          totalTokens: execData.totalTokens,
          estimatedCostUSD: execData.estimatedCostUSD,
          latencyMs: execData.latencyMs,
          success: execData.success,
          errorMessage: execData.errorMessage,
          executedAt: execData.executedAt,
          sourceType: execData.sourceType,
          sourceId: execData.sourceId,
        };
      }
    }

    return NextResponse.json({ post, execution });
  } catch (error: unknown) {
    console.error('[Admin Insights Post Detail API] Error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to fetch post';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
