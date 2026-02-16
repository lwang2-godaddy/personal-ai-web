import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';
import { SERVICE_OPERATIONS_MAP } from '@/lib/models/ServiceOperations';
import { SAMPLING_RATES, getSamplingRate } from '@/lib/config/samplingRates';

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
  circle_rag: 'chat_completion',
  direct: 'chat_completion',
  direct_stream: 'chat_completion',
  custom_prompt: 'chat_completion',
  pinecone_query: 'pinecone_query',
  // Cloud Functions sourceType values (short names)
  photo: 'vision',  // Photo description uses GPT-4 Vision
  voice: 'transcription',  // Voice note transcription
  health: 'embedding',  // Health data embedding
  location: 'embedding',  // Location data embedding
  text: 'embedding',  // Text note embedding
  // New embedding source types from Cloud Functions
  health_embedding: 'embedding',
  location_embedding: 'embedding',
  voice_embedding: 'embedding',
  photo_embedding: 'embedding',
  text_note_embedding: 'embedding',
  event_embedding: 'embedding',
  shared_activity_embedding: 'embedding',
  rag_query: 'embedding',
  circle_rag_query: 'embedding',
  group_rag_query: 'embedding',
};

/**
 * Map sourceType to user-friendly feature name for cost breakdown
 * Groups related operations into business-meaningful categories
 */
const SOURCE_TYPE_TO_FEATURE: Record<string, string> = {
  // Vision/Photo (EXPENSIVE - ~$0.01-0.03 per call)
  vision: 'Photo Description',
  image_description: 'Photo Description',
  photo: 'Photo Description',  // Cloud Functions use 'photo' sourceType
  photo_description: 'Photo Description',

  // Chat (RAG vs Direct)
  rag: 'AI Chat (RAG)',
  rag_stream: 'AI Chat (RAG)',
  circle_rag: 'AI Chat (RAG)',
  direct: 'AI Chat (Direct)',
  direct_stream: 'AI Chat (Direct)',
  custom_prompt: 'AI Chat (Custom)',

  // Audio
  transcription: 'Voice Transcription',
  voice: 'Voice Transcription',  // Cloud Functions use 'voice' sourceType
  voice_transcription: 'Voice Transcription',
  tts: 'Text-to-Speech',

  // Embeddings (group all into one)
  embedding: 'Search Indexing',
  health: 'Search Indexing',  // Cloud Functions use 'health' sourceType
  health_embedding: 'Search Indexing',
  location: 'Search Indexing',  // Cloud Functions use 'location' sourceType
  location_embedding: 'Search Indexing',
  voice_embedding: 'Search Indexing',
  photo_embedding: 'Search Indexing',
  text: 'Search Indexing',  // Cloud Functions use 'text' sourceType
  text_note_embedding: 'Search Indexing',
  event_embedding: 'Search Indexing',
  shared_activity_embedding: 'Search Indexing',
  rag_query: 'Search Indexing',
  circle_rag_query: 'Search Indexing',
  group_rag_query: 'Search Indexing',

  // AI Analysis Services
  sentiment: 'Sentiment Analysis',
  entity_extraction: 'Entity Extraction',
  event_extraction: 'Event Extraction',
  memory: 'Memory Generation',
  daily_summary: 'Daily Summary',
  life_feed: 'Life Feed',
  suggestion: 'Smart Suggestions',
};

/**
 * Feature icons for UI display
 */
const FEATURE_ICONS: Record<string, string> = {
  'Photo Description': '📷',
  'AI Chat (RAG)': '💬',
  'AI Chat (Direct)': '💬',
  'AI Chat (Custom)': '💬',
  'Voice Transcription': '🎤',
  'Text-to-Speech': '🔊',
  'Search Indexing': '🔍',
  'Sentiment Analysis': '😊',
  'Entity Extraction': '👤',
  'Event Extraction': '📅',
  'Memory Generation': '🧠',
  'Daily Summary': '📊',
  'Life Feed': '📰',
  'Smart Suggestions': '💡',
};

/**
 * Map sourceType to OpenAI API endpoint for endpoint-level aggregation
 */
const SOURCE_TYPE_TO_ENDPOINT: Record<string, string> = {
  // Embeddings endpoint
  embedding: 'embeddings',
  health: 'embeddings',  // Cloud Functions sourceType
  location: 'embeddings',  // Cloud Functions sourceType
  text: 'embeddings',  // Cloud Functions sourceType
  health_embedding: 'embeddings',
  location_embedding: 'embeddings',
  voice_embedding: 'embeddings',
  photo_embedding: 'embeddings',
  text_note_embedding: 'embeddings',
  event_embedding: 'embeddings',
  shared_activity_embedding: 'embeddings',
  rag_query: 'embeddings',
  circle_rag_query: 'embeddings',
  group_rag_query: 'embeddings',
  // Chat completions endpoint
  rag: 'chat/completions',
  rag_stream: 'chat/completions',
  circle_rag: 'chat/completions',
  direct: 'chat/completions',
  direct_stream: 'chat/completions',
  vision: 'chat/completions',
  photo: 'chat/completions',  // Cloud Functions sourceType - uses GPT-4 Vision
  custom_prompt: 'chat/completions',
  chat_completion: 'chat/completions',
  // Audio endpoints
  transcription: 'audio/transcriptions',
  voice: 'audio/transcriptions',  // Cloud Functions sourceType
  tts: 'audio/speech',
  // Photo description uses chat completions
  image_description: 'chat/completions',
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
    // Track by OpenAI model
    const modelStats = new Map<string, { cost: number; calls: number; tokens: number }>();
    // Track by OpenAI endpoint
    const endpointStats = new Map<string, { cost: number; calls: number; tokens: number }>();
    // Track by user-facing feature (for subscription quota planning)
    // Includes breakdown by source (mobile vs web)
    const featureStats = new Map<string, {
      cost: number;
      calls: number;
      tokens: number;
      mobileCost: number;
      mobileCalls: number;
      webCost: number;
      webCalls: number;
    }>();

    usageSnapshot.forEach((doc) => {
      const data = doc.data();
      const timestamp = data.executedAt as string;
      const userId = data.userId as string;
      const service = data.service as string;
      const sourceType = data.sourceType as string | undefined;
      const rawCost = (data.estimatedCostUSD as number) || 0;
      const rawTokens = (data.totalTokens as number) || 0;
      const docSamplingRate = data.samplingRate as number | undefined;

      // Get sampling rate: prefer document's stored rate, fallback to config
      const samplingRate = getSamplingRate(service, docSamplingRate);

      // Apply sampling multiplier to get actual estimated values
      // If samplingRate=100, this logged execution represents ~100 actual calls
      const cost = rawCost * samplingRate;
      const tokens = rawTokens * samplingRate;
      const callCount = samplingRate; // Each logged execution represents N actual calls

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
      periodData.totalApiCalls += callCount;
      periodData.totalTokens += tokens;
      periodData.userCount.add(userId);

      // Aggregate operation counts and costs
      periodData.operationCounts[operation] = (periodData.operationCounts[operation] || 0) + callCount;
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
        userStat.totalApiCalls += callCount;
        userStat.totalTokens += tokens;
      }

      // Aggregate by OpenAI model
      const model = data.model as string;
      if (model) {
        const existing = modelStats.get(model) || { cost: 0, calls: 0, tokens: 0 };
        existing.cost += cost;
        existing.calls += callCount;
        existing.tokens += tokens;
        modelStats.set(model, existing);
      }

      // Aggregate by OpenAI API endpoint
      const endpoint = sourceType ? SOURCE_TYPE_TO_ENDPOINT[sourceType] : undefined;
      if (endpoint) {
        const existing = endpointStats.get(endpoint) || { cost: 0, calls: 0, tokens: 0 };
        existing.cost += cost;
        existing.calls += callCount;
        existing.tokens += tokens;
        endpointStats.set(endpoint, existing);
      }

      // Aggregate by user-facing feature (for subscription quota planning)
      const feature = sourceType
        ? SOURCE_TYPE_TO_FEATURE[sourceType]
        : SERVICE_TO_OPERATION[service] || 'Other';
      if (feature) {
        const existing = featureStats.get(feature) || {
          cost: 0, calls: 0, tokens: 0,
          mobileCost: 0, mobileCalls: 0,
          webCost: 0, webCalls: 0,
        };
        existing.cost += cost;
        existing.calls += callCount;
        existing.tokens += tokens;

        // Track source: WebApp service = web, everything else = mobile/cloud functions
        const isWeb = service === 'WebApp';
        if (isWeb) {
          existing.webCost += cost;
          existing.webCalls += callCount;
        } else {
          existing.mobileCost += cost;
          existing.mobileCalls += callCount;
        }

        featureStats.set(feature, existing);
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

    // Build model breakdown with rounded costs
    const modelBreakdown = Object.fromEntries(
      Array.from(modelStats.entries()).map(([k, v]) => [
        k,
        { ...v, cost: Number(v.cost.toFixed(4)) },
      ])
    );

    // Build endpoint breakdown with rounded costs
    const endpointBreakdown = Object.fromEntries(
      Array.from(endpointStats.entries()).map(([k, v]) => [
        k,
        { ...v, cost: Number(v.cost.toFixed(4)) },
      ])
    );

    // Build feature breakdown with calculated metrics (sorted by cost descending)
    const totalCostForPercent = totals.totalCost || 1; // Avoid division by zero
    const featureBreakdown = Array.from(featureStats.entries())
      .map(([feature, stats]) => ({
        feature,
        icon: FEATURE_ICONS[feature] || '📦',
        cost: Number(stats.cost.toFixed(4)),
        calls: stats.calls,
        tokens: stats.tokens,
        avgCostPerCall: stats.calls > 0 ? Number((stats.cost / stats.calls).toFixed(6)) : 0,
        percentOfTotal: Number(((stats.cost / totalCostForPercent) * 100).toFixed(1)),
        // Source breakdown (mobile vs web)
        mobileCost: Number(stats.mobileCost.toFixed(4)),
        mobileCalls: stats.mobileCalls,
        webCost: Number(stats.webCost.toFixed(4)),
        webCalls: stats.webCalls,
      }))
      .sort((a, b) => b.cost - a.cost);

    // Build sampling info for UI display
    const samplingInfo = Object.entries(SAMPLING_RATES)
      .filter(([service, rate]) => service !== 'default' && rate > 1)
      .map(([service, rate]) => ({
        service,
        rate,
        description: `1 in ${rate} calls logged`,
      }));

    return NextResponse.json({
      usage,
      totals: {
        ...totals,
        totalCost: Number(totals.totalCost.toFixed(4)),
      },
      topUsers,
      modelBreakdown,
      endpointBreakdown,
      featureBreakdown,
      startDate: startDateStr,
      endDate: endDateStr,
      groupBy,
      serviceFilter: serviceFilter || undefined,
      // Include sampling info so UI can show it
      samplingInfo: samplingInfo.length > 0 ? samplingInfo : undefined,
    });
  } catch (error: any) {
    console.error('[Admin Usage API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch usage data' },
      { status: 500 }
    );
  }
}
