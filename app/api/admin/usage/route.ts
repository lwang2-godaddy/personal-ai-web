import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';

/**
 * GET /api/admin/usage
 * Get aggregated usage statistics across all users
 *
 * Queries usageEvents collection directly and aggregates on-the-fly
 *
 * Query params:
 * - startDate: string (ISO date, default: 30 days ago)
 * - endDate: string (ISO date, default: today)
 * - groupBy: 'day' | 'month' (default: 'day')
 *
 * Returns:
 * - usage: UsageData[] (array of daily/monthly aggregated data)
 * - totals: { totalCost, totalApiCalls, totalTokens }
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin role
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const { searchParams } = new URL(request.url);
    const groupBy = searchParams.get('groupBy') || 'day';

    // Default date range: last 30 days
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const startDateStr = searchParams.get('startDate') || startDate.toISOString().split('T')[0];
    const endDateStr = searchParams.get('endDate') || endDate.toISOString().split('T')[0];

    // Create ISO timestamps for Firestore query
    const startTimestamp = new Date(startDateStr + 'T00:00:00.000Z').toISOString();
    const endTimestamp = new Date(endDateStr + 'T23:59:59.999Z').toISOString();

    const db = getAdminFirestore();

    console.log('[Admin Usage API] Querying usageEvents collection...');
    console.log('[Admin Usage API] Date range:', { startTimestamp, endTimestamp });

    // Query usageEvents collection directly
    const usageSnapshot = await db
      .collection('usageEvents')
      .where('timestamp', '>=', startTimestamp)
      .where('timestamp', '<=', endTimestamp)
      .orderBy('timestamp', 'asc')
      .get();

    console.log(`[Admin Usage API] Found ${usageSnapshot.size} usage events`);

    // Aggregate by date or month
    const usageByPeriod = new Map<string, any>();

    usageSnapshot.forEach((doc) => {
      const data = doc.data();
      const timestamp = data.timestamp;

      // Extract date or month from timestamp
      let period: string;
      if (groupBy === 'day') {
        period = timestamp.substring(0, 10); // YYYY-MM-DD
      } else {
        period = timestamp.substring(0, 7); // YYYY-MM
      }

      if (!usageByPeriod.has(period)) {
        usageByPeriod.set(period, {
          date: groupBy === 'day' ? period : undefined,
          month: groupBy === 'month' ? period : undefined,
          totalCostUSD: 0,
          totalApiCalls: 0,
          totalTokens: 0,
          operationCounts: {},
          operationCosts: {},
        });
      }

      const periodData = usageByPeriod.get(period)!;
      periodData.totalCostUSD += data.estimatedCostUSD || 0;
      periodData.totalApiCalls += 1;
      periodData.totalTokens += data.totalTokens || 0;

      // Aggregate operation counts and costs
      const operation = data.operation || 'unknown';
      periodData.operationCounts[operation] = (periodData.operationCounts[operation] || 0) + 1;
      periodData.operationCosts[operation] = (periodData.operationCosts[operation] || 0) + (data.estimatedCostUSD || 0);
    });

    const usage = Array.from(usageByPeriod.values())
      .map((period) => ({
        ...period,
        totalCostUSD: Number(period.totalCostUSD.toFixed(4)),
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

    return NextResponse.json({
      usage,
      totals: {
        ...totals,
        totalCost: Number(totals.totalCost.toFixed(4)),
      },
      startDate: startDateStr,
      endDate: endDateStr,
      groupBy,
    });
  } catch (error: any) {
    console.error('[Admin Usage API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch usage data' },
      { status: 500 }
    );
  }
}
