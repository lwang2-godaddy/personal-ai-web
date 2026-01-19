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

/**
 * Get estimated costs from our tracking (usageEvents + infrastructureCosts)
 */
async function getEstimatedCosts(
  startDate: string,
  endDate: string
): Promise<{ openai: number; pinecone: number; infrastructure: number; grandTotal: number }> {
  try {
    const db = getAdminFirestore();

    const startTimestamp = new Date(startDate + 'T00:00:00.000Z').toISOString();
    const endTimestamp = new Date(endDate + 'T23:59:59.999Z').toISOString();

    // Get OpenAI estimated costs from usageEvents
    const usageSnapshot = await db
      .collection('usageEvents')
      .where('timestamp', '>=', startTimestamp)
      .where('timestamp', '<=', endTimestamp)
      .get();

    let openaiEstimated = 0;
    let pineconeEstimated = 0;

    usageSnapshot.forEach((doc) => {
      const data = doc.data();
      const cost = (data.estimatedCostUSD as number) || (data.cost as number) || 0;
      const endpoint = data.endpoint as string;

      if (endpoint?.startsWith('pinecone')) {
        pineconeEstimated += cost;
      } else {
        openaiEstimated += cost;
      }
    });

    // Get infrastructure estimated costs
    const infraSnapshot = await db
      .collection('infrastructureCosts')
      .where('timestamp', '>=', startTimestamp)
      .where('timestamp', '<=', endTimestamp)
      .get();

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
