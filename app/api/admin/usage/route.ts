import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';

/**
 * GET /api/admin/usage
 * Get aggregated usage statistics across all users
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

    const db = getAdminFirestore();

    if (groupBy === 'day') {
      // Fetch daily usage data
      const usageSnapshot = await db
        .collection('usageDaily')
        .where('date', '>=', startDateStr)
        .where('date', '<=', endDateStr)
        .orderBy('date', 'asc')
        .get();

      // Aggregate by date
      const usageByDate = new Map<string, any>();

      usageSnapshot.forEach((doc) => {
        const data = doc.data();
        const date = data.date;

        if (!usageByDate.has(date)) {
          usageByDate.set(date, {
            date,
            totalCostUSD: 0,
            totalApiCalls: 0,
            totalTokens: 0,
            operationCounts: {},
          });
        }

        const dayData = usageByDate.get(date)!;
        dayData.totalCostUSD += data.totalCostUSD || 0;
        dayData.totalApiCalls += data.totalApiCalls || 0;
        dayData.totalTokens += data.totalTokens || 0;

        // Aggregate operation counts
        if (data.operationCounts) {
          Object.entries(data.operationCounts).forEach(([operation, count]) => {
            dayData.operationCounts[operation] = (dayData.operationCounts[operation] || 0) + (count as number);
          });
        }
      });

      const usage = Array.from(usageByDate.values()).map((day) => ({
        ...day,
        totalCostUSD: Number(day.totalCostUSD.toFixed(2)),
      }));

      // Calculate totals
      const totals = usage.reduce(
        (acc, day) => ({
          totalCost: acc.totalCost + day.totalCostUSD,
          totalApiCalls: acc.totalApiCalls + day.totalApiCalls,
          totalTokens: acc.totalTokens + day.totalTokens,
        }),
        { totalCost: 0, totalApiCalls: 0, totalTokens: 0 }
      );

      return NextResponse.json({
        usage,
        totals: {
          ...totals,
          totalCost: Number(totals.totalCost.toFixed(2)),
        },
        startDate: startDateStr,
        endDate: endDateStr,
        groupBy: 'day',
      });
    } else {
      // Fetch monthly usage data
      const startMonth = startDateStr.substring(0, 7); // YYYY-MM
      const endMonth = endDateStr.substring(0, 7);

      const usageSnapshot = await db
        .collection('usageMonthly')
        .where('month', '>=', startMonth)
        .where('month', '<=', endMonth)
        .orderBy('month', 'asc')
        .get();

      // Aggregate by month
      const usageByMonth = new Map<string, any>();

      usageSnapshot.forEach((doc) => {
        const data = doc.data();
        const month = data.month;

        if (!usageByMonth.has(month)) {
          usageByMonth.set(month, {
            month,
            totalCostUSD: 0,
            totalApiCalls: 0,
            totalTokens: 0,
            operationCounts: {},
          });
        }

        const monthData = usageByMonth.get(month)!;
        monthData.totalCostUSD += data.totalCostUSD || 0;
        monthData.totalApiCalls += data.totalApiCalls || 0;
        monthData.totalTokens += data.totalTokens || 0;

        // Aggregate operation counts
        if (data.operationCounts) {
          Object.entries(data.operationCounts).forEach(([operation, count]) => {
            monthData.operationCounts[operation] = (monthData.operationCounts[operation] || 0) + (count as number);
          });
        }
      });

      const usage = Array.from(usageByMonth.values()).map((month) => ({
        ...month,
        totalCostUSD: Number(month.totalCostUSD.toFixed(2)),
      }));

      // Calculate totals
      const totals = usage.reduce(
        (acc, month) => ({
          totalCost: acc.totalCost + month.totalCostUSD,
          totalApiCalls: acc.totalApiCalls + month.totalApiCalls,
          totalTokens: acc.totalTokens + month.totalTokens,
        }),
        { totalCost: 0, totalApiCalls: 0, totalTokens: 0 }
      );

      return NextResponse.json({
        usage,
        totals: {
          ...totals,
          totalCost: Number(totals.totalCost.toFixed(2)),
        },
        startDate: startDateStr,
        endDate: endDateStr,
        groupBy: 'month',
      });
    }
  } catch (error: any) {
    console.error('[Admin Usage API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch usage data' },
      { status: 500 }
    );
  }
}
