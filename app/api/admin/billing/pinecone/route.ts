import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getPineconeBillingService } from '@/lib/services/billing';
import type { BillingResponse, PineconeBillingData } from '@/lib/models/BillingData';

/**
 * GET /api/admin/billing/pinecone
 * Fetch Pinecone billing data (usage metrics + storage)
 *
 * Query params:
 * - startDate: string (ISO date, default: 30 days ago)
 * - endDate: string (ISO date, default: today)
 * - refresh: boolean (force refresh, bypass cache)
 *
 * Uses existing PINECONE_API_KEY environment variable
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

    console.log('[Admin Billing API] Pinecone request:', { startDateStr, endDateStr, refresh });

    const billingService = getPineconeBillingService();

    // Check if service is configured
    if (!billingService.isConfigured()) {
      const response: BillingResponse<PineconeBillingData> = {
        data: {
          totalCostUSD: 0,
          storageCostUSD: 0,
          operationsCostUSD: 0,
          readUnits: 0,
          writeUnits: 0,
          storageGB: 0,
          byDate: [],
          dataSource: 'unavailable',
          fetchedAt: new Date().toISOString(),
          error: 'Pinecone API key not configured.',
        },
        cached: false,
        error: 'API key not configured',
      };
      return NextResponse.json(response);
    }

    // Fetch billing data
    const data = await billingService.fetchUsage(startDateStr, endDateStr, !refresh);

    const response: BillingResponse<PineconeBillingData> = {
      data,
      cached: data.dataSource === 'cached',
    };

    if (data.error) {
      response.error = data.error;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Admin Billing API] Pinecone error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch Pinecone billing data' },
      { status: 500 }
    );
  }
}
