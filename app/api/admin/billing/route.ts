import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';
import {
  getOpenAIBillingService,
  getPineconeBillingService,
  getGCPBillingService,
} from '@/lib/services/billing';
import type {
  CombinedBillingData,
  CombinedBillingResponse,
  CostVariance,
} from '@/lib/models/BillingData';

/**
 * GET /api/admin/billing
 * Fetch combined billing data from all providers (OpenAI, Pinecone, GCP)
 * Also calculates variance between estimated and actual costs
 *
 * Query params:
 * - startDate: string (ISO date, default: 30 days ago)
 * - endDate: string (ISO date, default: today)
 * - refresh: boolean (force refresh, bypass cache)
 *
 * Returns:
 * - Combined billing from all providers
 * - Estimated costs from our tracking
 * - Variance calculations
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin role
    const { response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const { searchParams } = new URL(request.url);

    // Default date range: last 30 days
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const startDateStr = searchParams.get('startDate') || startDate.toISOString().split('T')[0];
    const endDateStr = searchParams.get('endDate') || endDate.toISOString().split('T')[0];
    const refresh = searchParams.get('refresh') === 'true';

    console.log('[Admin Billing API] Combined request:', { startDateStr, endDateStr, refresh });

    // Fetch from all providers in parallel
    const [openaiData, pineconeData, gcpData, estimatedData] = await Promise.all([
      getOpenAIBillingService().fetchUsage(startDateStr, endDateStr, !refresh),
      getPineconeBillingService().fetchUsage(startDateStr, endDateStr, !refresh),
      getGCPBillingService().fetchBilling(startDateStr, endDateStr, !refresh),
      getEstimatedCosts(startDateStr, endDateStr),
    ]);

    // Calculate totals
    const actualTotals = {
      openai: openaiData.totalCostUSD,
      pinecone: pineconeData.totalCostUSD,
      gcp: gcpData.totalCostUSD,
      grandTotal: openaiData.totalCostUSD + pineconeData.totalCostUSD + gcpData.totalCostUSD,
    };

    // Calculate variance
    const variance: CostVariance = {
      openai: actualTotals.openai - estimatedData.openai,
      pinecone: actualTotals.pinecone - estimatedData.pinecone,
      infrastructure: actualTotals.gcp - estimatedData.infrastructure,
      grandTotal: actualTotals.grandTotal - estimatedData.grandTotal,
      openaiPercent: calcVariancePercent(estimatedData.openai, actualTotals.openai),
      pineconePercent: calcVariancePercent(estimatedData.pinecone, actualTotals.pinecone),
      infrastructurePercent: calcVariancePercent(estimatedData.infrastructure, actualTotals.gcp),
      grandTotalPercent: calcVariancePercent(estimatedData.grandTotal, actualTotals.grandTotal),
    };

    const combinedData: CombinedBillingData = {
      openai: openaiData,
      pinecone: pineconeData,
      gcp: gcpData,
      totals: {
        actual: actualTotals,
        estimated: estimatedData,
        variance,
      },
      startDate: startDateStr,
      endDate: endDateStr,
    };

    const response: CombinedBillingResponse = {
      data: combinedData,
      startDate: startDateStr,
      endDate: endDateStr,
      cacheStatus: {
        openai: {
          cached: openaiData.dataSource === 'cached',
        },
        pinecone: {
          cached: pineconeData.dataSource === 'cached',
        },
        gcp: {
          cached: gcpData.dataSource === 'cached',
        },
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Admin Billing API] Combined error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch billing data' },
      { status: 500 }
    );
  }
}

/**
 * Calculate variance percentage
 */
function calcVariancePercent(estimated: number, actual: number): number | null {
  if (estimated === 0 && actual === 0) return null;
  if (estimated === 0) return actual > 0 ? 100 : -100;
  return ((actual - estimated) / estimated) * 100;
}

// Sampling config must stay in sync with PromptExecutionTracker.ts
const SAMPLING_CONFIG: Record<string, number> = {
  EmbeddingService: 100,
  default: 1,
};

function getSamplingRate(service: string, docSamplingRate?: number): number {
  if (docSamplingRate && docSamplingRate > 1) {
    return docSamplingRate;
  }
  return SAMPLING_CONFIG[service] || SAMPLING_CONFIG.default;
}

/**
 * Current OpenAI pricing per 1M tokens (Feb 2025)
 * Used to recalculate costs from token counts at query time,
 * avoiding reliance on pre-computed estimatedCostUSD which may use outdated rates.
 * Must stay in sync with PromptExecutionTracker.ts DEFAULT_PRICING.
 */
const CURRENT_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4o-2024-11-20': { input: 2.50, output: 10.00 },
  'gpt-4o-2024-08-06': { input: 2.50, output: 10.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4o-mini-2024-07-18': { input: 0.15, output: 0.60 },
  'gpt-4-turbo': { input: 10.00, output: 30.00 },
  'gpt-4': { input: 30.00, output: 60.00 },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  'text-embedding-3-small': { input: 0.02, output: 0 },
  'text-embedding-3-large': { input: 0.13, output: 0 },
  'text-embedding-ada-002': { input: 0.10, output: 0 },
  'whisper-1': { input: 6.00, output: 0 }, // Per 1000 minutes (inputTokens used as minute proxy)
  'tts-1': { input: 15.00, output: 0 },    // Per 1M characters
  'tts-1-hd': { input: 30.00, output: 0 },
};

/**
 * Minimum per-call cost estimates for models that don't track tokens.
 * Used when both inputTokens and estimatedCostUSD are 0.
 * whisper-1: average voice note ~30s = $0.003
 * Streaming GPT-4o calls (historical data with 0 tokens): estimate ~500 input + 200 output tokens
 */
const MIN_CALL_COST: Record<string, number> = {
  'whisper-1': 0.003, // ~30 seconds average
};

/**
 * Recalculate cost from token counts using current pricing.
 * Falls back to the pre-computed estimatedCostUSD if token data isn't available.
 * Uses minimum per-call estimates for models like whisper-1 that don't use tokens.
 */
function recalculateCost(
  model: string,
  inputTokens: number | undefined,
  outputTokens: number | undefined,
  fallbackCost: number,
  sourceType?: string
): number {
  // If we have token data, recalculate with current pricing
  if (inputTokens !== undefined && inputTokens > 0) {
    const pricing = CURRENT_PRICING[model];
    if (pricing) {
      const inputCost = (inputTokens / 1_000_000) * pricing.input;
      const outputCost = ((outputTokens || 0) / 1_000_000) * pricing.output;
      return inputCost + outputCost;
    }
  }

  // If pre-computed cost exists, use it
  if (fallbackCost > 0) {
    return fallbackCost;
  }

  // For models that don't use tokens (whisper, streaming with 0 tokens),
  // apply minimum per-call cost estimate
  if (MIN_CALL_COST[model]) {
    return MIN_CALL_COST[model];
  }

  // Historical streaming calls with 0 tokens: estimate ~700 total tokens for gpt-4o
  if ((inputTokens === 0 || inputTokens === undefined) &&
      (sourceType === 'rag_stream' || sourceType === 'direct_stream')) {
    const pricing = CURRENT_PRICING[model];
    if (pricing) {
      // Conservative estimate: 500 input + 200 output tokens
      return (500 / 1_000_000) * pricing.input + (200 / 1_000_000) * pricing.output;
    }
  }

  return 0;
}

/**
 * Get estimated costs from our tracking:
 * - usageEvents: Legacy web dashboard API calls
 * - promptExecutions: Cloud Function + Web API calls (unified collection)
 * - infrastructureCosts: GCP/Pinecone storage costs
 *
 * Costs are recalculated from token counts using current pricing to avoid
 * inaccurate pre-computed estimatedCostUSD from outdated pricing rates.
 */
async function getEstimatedCosts(
  startDate: string,
  endDate: string
): Promise<{ openai: number; pinecone: number; infrastructure: number; grandTotal: number }> {
  try {
    const db = getAdminFirestore();

    const startTimestamp = new Date(startDate + 'T00:00:00.000Z').toISOString();
    const endTimestamp = new Date(endDate + 'T23:59:59.999Z').toISOString();

    // Fetch all three sources in parallel
    const [usageSnapshot, promptSnapshot, infraSnapshot] = await Promise.all([
      // Legacy web dashboard API calls
      db.collection('usageEvents')
        .where('timestamp', '>=', startTimestamp)
        .where('timestamp', '<=', endTimestamp)
        .get(),
      // Cloud Function + Web API calls (unified collection)
      db.collection('promptExecutions')
        .where('executedAt', '>=', startTimestamp)
        .where('executedAt', '<=', endTimestamp)
        .get(),
      // Infrastructure costs
      db.collection('infrastructureCosts')
        .where('timestamp', '>=', startTimestamp)
        .where('timestamp', '<=', endTimestamp)
        .get(),
    ]);

    let openaiEstimated = 0;
    let pineconeEstimated = 0;

    // Diagnostic: track per-model and per-service cost breakdown
    const byModelEstimated: Record<string, { cost: number; count: number }> = {};
    const byServiceEstimated: Record<string, { cost: number; count: number }> = {};

    // 1. Legacy web dashboard usage events (recalculate from tokens)
    usageSnapshot.forEach((doc) => {
      const data = doc.data();
      const fallbackCost = (data.estimatedCostUSD as number) || (data.cost as number) || 0;
      const endpoint = data.endpoint as string;
      const model = (data.model as string) || 'unknown';
      const inputTokens = data.promptTokens as number | undefined ?? data.totalTokens as number | undefined;
      const outputTokens = data.completionTokens as number | undefined;
      const sourceType = data.sourceType as string | undefined;

      const cost = recalculateCost(model, inputTokens, outputTokens, fallbackCost, sourceType);

      if (endpoint?.startsWith('pinecone')) {
        pineconeEstimated += cost;
      } else {
        openaiEstimated += cost;
        if (!byModelEstimated[model]) byModelEstimated[model] = { cost: 0, count: 0 };
        byModelEstimated[model].cost += cost;
        byModelEstimated[model].count += 1;
      }
    });

    // 2. Cloud Function + Web prompt executions (recalculate + sampling rate)
    promptSnapshot.forEach((doc) => {
      const data = doc.data();
      const fallbackCost = (data.estimatedCostUSD as number) || 0;
      const service = (data.service as string) || 'unknown';
      const model = (data.model as string) || 'unknown';
      const inputTokens = data.inputTokens as number | undefined;
      const outputTokens = data.outputTokens as number | undefined;
      const sourceType = data.sourceType as string | undefined;

      const cost = recalculateCost(model, inputTokens, outputTokens, fallbackCost, sourceType);
      const rate = getSamplingRate(service, data.samplingRate as number | undefined);
      const adjustedCost = cost * rate;

      if (model.startsWith('pinecone')) {
        pineconeEstimated += adjustedCost;
      } else {
        openaiEstimated += adjustedCost;
        if (!byModelEstimated[model]) byModelEstimated[model] = { cost: 0, count: 0 };
        byModelEstimated[model].cost += adjustedCost;
        byModelEstimated[model].count += (rate > 1 ? rate : 1); // Extrapolated count
      }

      if (!byServiceEstimated[service]) byServiceEstimated[service] = { cost: 0, count: 0 };
      byServiceEstimated[service].cost += adjustedCost;
      byServiceEstimated[service].count += 1;
    });

    // 3. Infrastructure costs
    let infrastructureEstimated = 0;

    infraSnapshot.forEach((doc) => {
      const data = doc.data();
      const cost = (data.estimatedCostUSD as number) || 0;
      const service = data.service as string;

      // Pinecone storage is tracked separately
      if (service === 'pinecone_storage') {
        pineconeEstimated += cost;
      } else {
        infrastructureEstimated += cost;
      }
    });

    // Diagnostic: log per-model and per-service breakdown
    const modelBreakdown = Object.entries(byModelEstimated)
      .sort((a, b) => b[1].cost - a[1].cost)
      .map(([m, v]) => `${m}: $${v.cost.toFixed(4)} (${v.count} calls)`)
      .join(', ');
    const serviceBreakdown = Object.entries(byServiceEstimated)
      .sort((a, b) => b[1].cost - a[1].cost)
      .map(([s, v]) => `${s}: $${v.cost.toFixed(4)} (${v.count} docs)`)
      .join(', ');

    console.log('[Admin Billing API] Estimated costs breakdown:', {
      usageEvents: usageSnapshot.size,
      promptExecutions: promptSnapshot.size,
      infrastructureCosts: infraSnapshot.size,
      openai: openaiEstimated.toFixed(4),
      pinecone: pineconeEstimated.toFixed(4),
      infrastructure: infrastructureEstimated.toFixed(4),
      byModel: modelBreakdown,
      byService: serviceBreakdown,
    });

    return {
      openai: openaiEstimated,
      pinecone: pineconeEstimated,
      infrastructure: infrastructureEstimated,
      grandTotal: openaiEstimated + pineconeEstimated + infrastructureEstimated,
    };
  } catch (error) {
    console.error('[Admin Billing API] Error getting estimated costs:', error);
    return { openai: 0, pinecone: 0, infrastructure: 0, grandTotal: 0 };
  }
}
