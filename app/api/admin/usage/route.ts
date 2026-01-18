import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';
import { SERVICE_OPERATIONS_MAP } from '@/lib/models/ServiceOperations';

/**
 * Map service names to user-friendly operation labels
 * Note: sourceType field takes precedence when available (e.g., 'embedding', 'vision')
 */
const SERVICE_TO_OPERATION: Record<string, string> = {
  OpenAIService: 'chat_completion',
  RAGEngine: 'chat_completion',
  QueryRAGServer: 'chat_completion',
  SentimentAnalysisService: 'sentiment_analysis',
  EntityExtractionService: 'entity_extraction',
  EventExtractionService: 'event_extraction',
  MemoryGeneratorService: 'memory_generation',
  SuggestionEngine: 'suggestion',
  LifeFeedGenerator: 'life_feed',
};

/**
 * Map sourceType field to operation labels (takes precedence over service mapping)
 * These are set directly in the tracking calls (e.g., sourceType: 'embedding')
 */
const SOURCE_TYPE_TO_OPERATION: Record<string, string> = {
  embedding: 'embedding',
  vision: 'vision',
  transcription: 'transcription', // Whisper audio transcription
  tts: 'tts', // OpenAI Text-to-Speech
  rag: 'chat_completion',
  rag_stream: 'chat_completion',
  direct: 'chat_completion',
  direct_stream: 'chat_completion',
  custom_prompt: 'chat_completion',
  pinecone_query: 'pinecone_query',
};

interface TopUser {
  userId: string;
  email?: string;
  displayName?: string;
  totalCost: number;
  totalApiCalls: number;
  totalTokens: number;
}

/**
 * GET /api/admin/usage
 * Get aggregated usage statistics across all users
 *
 * Queries promptExecutions collection and aggregates on-the-fly
 *
 * Query params:
 * - startDate: string (ISO date, default: 30 days ago)
 * - endDate: string (ISO date, default: today)
 * - groupBy: 'day' | 'month' (default: 'day')
 *
 * Returns:
 * - usage: UsageData[] (array of daily/monthly aggregated data)
 * - totals: { totalCost, totalApiCalls, totalTokens }
 * - topUsers: TopUser[] (top 10 users by cost)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin role
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const { searchParams } = new URL(request.url);
    const groupBy = searchParams.get('groupBy') || 'day';
    const serviceFilter = searchParams.get('service') || null;

    // Default date range: last 30 days
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const startDateStr = searchParams.get('startDate') || startDate.toISOString().split('T')[0];
    const endDateStr = searchParams.get('endDate') || endDate.toISOString().split('T')[0];

    // Get allowed operations for the service filter (if provided)
    const allowedOperations: Set<string> | null = serviceFilter
      ? new Set([
          ...(SERVICE_OPERATIONS_MAP[serviceFilter] || []),
          // Also include the service name itself as an operation (for direct service matches)
        ])
      : null;

    // Create ISO timestamps for Firestore query
    const startTimestamp = new Date(startDateStr + 'T00:00:00.000Z').toISOString();
    const endTimestamp = new Date(endDateStr + 'T23:59:59.999Z').toISOString();

    const db = getAdminFirestore();

    console.log('[Admin Usage API] Querying promptExecutions collection...');
    console.log('[Admin Usage API] Date range:', { startTimestamp, endTimestamp });

    // Query promptExecutions collection (same as prompts stats API)
    const usageSnapshot = await db
      .collection('promptExecutions')
      .where('executedAt', '>=', startTimestamp)
      .where('executedAt', '<=', endTimestamp)
      .orderBy('executedAt', 'asc')
      .get();

    console.log(`[Admin Usage API] Found ${usageSnapshot.size} prompt executions`);

    // Aggregate by date or month
    const usageByPeriod = new Map<string, any>();
    // Track per-user stats
    const userStats = new Map<string, TopUser>();

    usageSnapshot.forEach((doc) => {
      const data = doc.data();
      const timestamp = data.executedAt as string;
      const userId = data.userId as string;
      const service = data.service as string;
      const sourceType = data.sourceType as string | undefined;
      const cost = (data.estimatedCostUSD as number) || 0;
      const tokens = (data.totalTokens as number) || 0;

      // Map to operation: sourceType takes precedence over service mapping
      // This allows embeddings (sourceType='embedding') to be tracked separately from chat
      const operation = sourceType && SOURCE_TYPE_TO_OPERATION[sourceType]
        ? SOURCE_TYPE_TO_OPERATION[sourceType]
        : SERVICE_TO_OPERATION[service] || service;

      // Apply service filter if provided
      // Include execution if: service matches filter OR operation is one that the filter service can trigger
      if (serviceFilter && allowedOperations) {
        const matchesService = service === serviceFilter;
        const matchesOperation = allowedOperations.has(operation);
        if (!matchesService && !matchesOperation) {
          return; // Skip this execution
        }
      }

      // Extract date or month from timestamp
      let period: string;
      if (groupBy === 'day') {
        period = timestamp.substring(0, 10); // YYYY-MM-DD
      } else {
        period = timestamp.substring(0, 7); // YYYY-MM
      }

      // Initialize period data
      if (!usageByPeriod.has(period)) {
        usageByPeriod.set(period, {
          date: groupBy === 'day' ? period : undefined,
          month: groupBy === 'month' ? period : undefined,
          totalCostUSD: 0,
          totalApiCalls: 0,
          totalTokens: 0,
          operationCounts: {},
          operationCosts: {},
          userCount: new Set(),
        });
      }

      const periodData = usageByPeriod.get(period)!;
      periodData.totalCostUSD += cost;
      periodData.totalApiCalls += 1;
      periodData.totalTokens += tokens;
      periodData.userCount.add(userId);

      // Aggregate operation counts and costs
      periodData.operationCounts[operation] = (periodData.operationCounts[operation] || 0) + 1;
      periodData.operationCosts[operation] = (periodData.operationCosts[operation] || 0) + cost;

      // Aggregate per-user stats
      if (userId) {
        if (!userStats.has(userId)) {
          userStats.set(userId, {
            userId,
            totalCost: 0,
            totalApiCalls: 0,
            totalTokens: 0,
          });
        }
        const userStat = userStats.get(userId)!;
        userStat.totalCost += cost;
        userStat.totalApiCalls += 1;
        userStat.totalTokens += tokens;
      }
    });

    const usage = Array.from(usageByPeriod.values())
      .map((period) => ({
        ...period,
        totalCostUSD: Number(period.totalCostUSD.toFixed(4)),
        userCount: period.userCount.size,
        operationCosts: Object.fromEntries(
          Object.entries(period.operationCosts).map(([k, v]) => [k, Number((v as number).toFixed(4))])
        ),
      }))
      .sort((a, b) => {
        const aKey = a.date || a.month || '';
        const bKey = b.date || b.month || '';
        return aKey.localeCompare(bKey);
      });

    // Calculate totals
    const totals = usage.reduce(
      (acc, period) => ({
        totalCost: acc.totalCost + period.totalCostUSD,
        totalApiCalls: acc.totalApiCalls + period.totalApiCalls,
        totalTokens: acc.totalTokens + period.totalTokens,
      }),
      { totalCost: 0, totalApiCalls: 0, totalTokens: 0 }
    );

    // Get top 10 users by cost
    const topUsersList = Array.from(userStats.values())
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 10);

    // Fetch user details (displayName, email) for top users
    const topUsers: TopUser[] = await Promise.all(
      topUsersList.map(async (user) => {
        try {
          const userDoc = await db.collection('users').doc(user.userId).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            return {
              ...user,
              totalCost: Number(user.totalCost.toFixed(4)),
              displayName: userData?.displayName || userData?.name || undefined,
              email: userData?.email || undefined,
            };
          }
        } catch (err) {
          console.warn(`[Admin Usage API] Failed to fetch user ${user.userId}:`, err);
        }
        return {
          ...user,
          totalCost: Number(user.totalCost.toFixed(4)),
        };
      })
    );

    return NextResponse.json({
      usage,
      totals: {
        ...totals,
        totalCost: Number(totals.totalCost.toFixed(4)),
      },
      topUsers,
      startDate: startDateStr,
      endDate: endDateStr,
      groupBy,
      serviceFilter: serviceFilter || undefined,
    });
  } catch (error: any) {
    console.error('[Admin Usage API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch usage data' },
      { status: 500 }
    );
  }
}
