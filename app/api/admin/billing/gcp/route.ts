import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getGCPBillingService } from '@/lib/services/billing';
import type { BillingResponse, GCPBillingData } from '@/lib/models/BillingData';

/**
 * GET /api/admin/billing/gcp
 * Fetch GCP billing data (Firebase costs via BigQuery billing export)
 *
 * Query params:
 * - startDate: string (ISO date, default: 30 days ago)
 * - endDate: string (ISO date, default: today)
 * - refresh: boolean (force refresh, bypass cache)
 *
 * Requires BigQuery billing export setup:
 * 1. Enable billing export to BigQuery in GCP Console
 * 2. Set GOOGLE_CLOUD_BILLING_PROJECT_ID and GOOGLE_CLOUD_BILLING_DATASET
 *
 * Falls back to estimation from infrastructure tracking if not configured.
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

    console.log('[Admin Billing API] GCP request:', { startDateStr, endDateStr, refresh });

    const billingService = getGCPBillingService();

    // Fetch billing data
    const data = await billingService.fetchBilling(startDateStr, endDateStr, !refresh);

    const response: BillingResponse<GCPBillingData> = {
      data,
      cached: data.dataSource === 'cached',
    };

    if (data.error) {
      response.error = data.error;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Admin Billing API] GCP error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch GCP billing data' },
      { status: 500 }
    );
  }
}
