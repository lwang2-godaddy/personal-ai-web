import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';

/**
 * GET /api/admin/life-feed/[postId]
 * Get a single life feed post with full details including prompt execution
 *
 * Returns:
 * - post: LifeFeedPost (full document)
 * - execution: PromptExecution | null (if AI-generated)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    // Verify admin role
    const { response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const { postId } = await params;

    if (!postId) {
      return NextResponse.json({ error: 'postId is required' }, { status: 400 });
    }

    const db = getAdminFirestore();

    // Get the post
    const postDoc = await db.collection('lifeFeedPosts').doc(postId).get();

    if (!postDoc.exists) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const postData = postDoc.data()!;
    const post = {
      id: postDoc.id,
      ...postData,
    };

    // If the post has a promptExecutionId, fetch the execution details
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
    console.error('[Admin Life Feed Post Detail API] Error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to fetch post';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
