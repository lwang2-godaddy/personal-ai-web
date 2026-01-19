import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getOpenAIBillingService } from '@/lib/services/billing';
import type { BillingResponse, OpenAIBillingData } from '@/lib/models/BillingData';

/**
 * GET /api/admin/billing/openai
 * Fetch OpenAI billing data (actual costs from OpenAI Usage API)
 *
 * Query params:
 * - startDate: string (ISO date, default: 30 days ago)
 * - endDate: string (ISO date, default: today)
 * - refresh: boolean (force refresh, bypass cache)
 *
 * Requires: OPENAI_ORG_API_KEY environment variable
 * Get from: https://platform.openai.com/organization/api-keys
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

    console.log('[Admin Billing API] OpenAI request:', { startDateStr, endDateStr, refresh });

    const billingService = getOpenAIBillingService();

    // Check if service is configured
    if (!billingService.isConfigured()) {
      const response: BillingResponse<OpenAIBillingData> = {
        data: {
          totalCostUSD: 0,
          byModel: {},
          byDate: [],
          dataSource: 'unavailable',
          fetchedAt: new Date().toISOString(),
          error: 'OpenAI Organization API key not configured. Set OPENAI_ORG_API_KEY in environment.',
        },
        cached: false,
        error: 'API key not configured',
      };
      return NextResponse.json(response);
    }

    // Fetch billing data
    const data = await billingService.fetchUsage(startDateStr, endDateStr, !refresh);

    const response: BillingResponse<OpenAIBillingData> = {
      data,
      cached: data.dataSource === 'cached',
    };

    if (data.error) {
      response.error = data.error;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Admin Billing API] OpenAI error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch OpenAI billing data' },
      { status: 500 }
    );
  }
}
