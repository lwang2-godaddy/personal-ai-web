import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';
import {
  PromptExecution,
  PromptExecutionStats,
  GetExecutionsResponse,
} from '@/lib/models/Prompt';

interface RouteParams {
  params: Promise<{ service: string }>;
}

/**
 * GET /api/admin/prompts/[service]/executions
 * Get execution history for a specific service's prompts
 *
 * Query params:
 * - promptId: string (optional, filter by specific prompt)
 * - language: string (optional, default 'en')
 * - limit: number (optional, default 50)
 *
 * Returns:
 * - executions: PromptExecution[]
 * - stats: PromptExecutionStats
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Verify admin role
    const { response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const { service } = await params;
    const { searchParams } = new URL(request.url);
    const promptId = searchParams.get('promptId');
    const language = searchParams.get('language') || 'en';
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const db = getAdminFirestore();

    // Build query
    let query = db
      .collection('promptExecutions')
      .where('service', '==', service)
      .orderBy('executedAt', 'desc')
      .limit(limit);

    // Add optional filters
    if (promptId) {
      query = db
        .collection('promptExecutions')
        .where('service', '==', service)
        .where('promptId', '==', promptId)
        .where('language', '==', language)
        .orderBy('executedAt', 'desc')
        .limit(limit);
    }

    const snapshot = await query.get();

    // Convert documents to PromptExecution objects
    const executions: PromptExecution[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        service: data.service,
        promptId: data.promptId,
        language: data.language,
        promptVersion: data.promptVersion,
        promptSource: data.promptSource,
        model: data.model,
        temperature: data.temperature,
        maxTokens: data.maxTokens,
        inputSummary: data.inputSummary,
        inputTokens: data.inputTokens,
        outputSummary: data.outputSummary,
        outputTokens: data.outputTokens,
        totalTokens: data.totalTokens,
        estimatedCostUSD: data.estimatedCostUSD,
        latencyMs: data.latencyMs,
        success: data.success,
        errorMessage: data.errorMessage,
        executedAt: data.executedAt,
        sourceType: data.sourceType,
        sourceId: data.sourceId,
      };
    });

    // Calculate stats
    const stats = calculateStats(executions);

    const response: GetExecutionsResponse = {
      executions,
      stats,
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error('[Admin Prompts Executions API] Error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to fetch executions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Calculate statistics from execution data
 */
function calculateStats(executions: PromptExecution[]): PromptExecutionStats {
  if (executions.length === 0) {
    return {
      totalExecutions: 0,
      avgLatencyMs: 0,
      totalCostUSD: 0,
      successRate: 0,
      uniqueUsers: 0,
    };
  }

  const totalLatency = executions.reduce((sum, e) => sum + e.latencyMs, 0);
  const totalCost = executions.reduce((sum, e) => sum + e.estimatedCostUSD, 0);
  const successCount = executions.filter((e) => e.success).length;
  const uniqueUserIds = new Set(executions.map((e) => e.userId));

  return {
    totalExecutions: executions.length,
    avgLatencyMs: Math.round(totalLatency / executions.length),
    totalCostUSD: parseFloat(totalCost.toFixed(6)),
    successRate: parseFloat((successCount / executions.length).toFixed(4)),
    uniqueUsers: uniqueUserIds.size,
  };
}
