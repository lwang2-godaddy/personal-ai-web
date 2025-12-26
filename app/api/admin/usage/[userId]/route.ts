import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';

/**
 * GET /api/admin/usage/[userId]
 * Get detailed usage statistics for a specific user
 *
 * Query params:
 * - period: 'day' | 'week' | 'month' (default: 'month')
 *
 * Returns:
 * - usage: UsageData[] (time-series usage data)
 * - totals: { totalCost, totalApiCalls, totalTokens }
 * - breakdown: { operationCounts, operationCosts }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Verify admin role
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const { userId } = await params;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';

    const db = getAdminFirestore();

    // Verify user exists
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const now = new Date();
    let startDate: Date;
    let collection: string;

    if (period === 'day') {
      // Last 7 days
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      collection = 'usageDaily';

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = now.toISOString().split('T')[0];

      // Query daily usage
      const usageSnapshot = await db
        .collection(collection)
        .where('userId', '==', userId)
        .where('date', '>=', startDateStr)
        .where('date', '<=', endDateStr)
        .orderBy('date', 'asc')
        .get();

      const usage = usageSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Calculate totals and breakdown
      const totals = usage.reduce(
        (acc, day: any) => ({
          totalCost: acc.totalCost + (day.totalCostUSD || 0),
          totalApiCalls: acc.totalApiCalls + (day.totalApiCalls || 0),
          totalTokens: acc.totalTokens + (day.totalTokens || 0),
        }),
        { totalCost: 0, totalApiCalls: 0, totalTokens: 0 }
      );

      const breakdown = calculateBreakdown(usage);

      return NextResponse.json({
        usage,
        totals: {
          ...totals,
          totalCost: Number(totals.totalCost.toFixed(2)),
        },
        breakdown,
        period: 'day',
        startDate: startDateStr,
        endDate: endDateStr,
      });
    } else if (period === 'week') {
      // Last 4 weeks
      startDate = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
      collection = 'usageDaily';

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = now.toISOString().split('T')[0];

      // Query daily usage and group by week
      const usageSnapshot = await db
        .collection(collection)
        .where('userId', '==', userId)
        .where('date', '>=', startDateStr)
        .where('date', '<=', endDateStr)
        .orderBy('date', 'asc')
        .get();

      // Group by week
      const usageByWeek = new Map<string, any>();

      usageSnapshot.forEach((doc) => {
        const data = doc.data();
        const date = new Date(data.date);
        const weekStart = getWeekStart(date);
        const weekKey = weekStart.toISOString().split('T')[0];

        if (!usageByWeek.has(weekKey)) {
          usageByWeek.set(weekKey, {
            week: weekKey,
            totalCostUSD: 0,
            totalApiCalls: 0,
            totalTokens: 0,
            operationCounts: {},
            operationCosts: {},
          });
        }

        const weekData = usageByWeek.get(weekKey)!;
        weekData.totalCostUSD += data.totalCostUSD || 0;
        weekData.totalApiCalls += data.totalApiCalls || 0;
        weekData.totalTokens += data.totalTokens || 0;

        // Aggregate operations
        aggregateOperations(weekData, data);
      });

      const usage = Array.from(usageByWeek.values()).map((week) => ({
        ...week,
        totalCostUSD: Number(week.totalCostUSD.toFixed(2)),
      }));

      const totals = usage.reduce(
        (acc, week: any) => ({
          totalCost: acc.totalCost + week.totalCostUSD,
          totalApiCalls: acc.totalApiCalls + week.totalApiCalls,
          totalTokens: acc.totalTokens + week.totalTokens,
        }),
        { totalCost: 0, totalApiCalls: 0, totalTokens: 0 }
      );

      const breakdown = calculateBreakdown(usage);

      return NextResponse.json({
        usage,
        totals: {
          ...totals,
          totalCost: Number(totals.totalCost.toFixed(2)),
        },
        breakdown,
        period: 'week',
        startDate: startDateStr,
        endDate: endDateStr,
      });
    } else {
      // Last 12 months
      collection = 'usageMonthly';
      const endMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const startMonthDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      const startMonth = `${startMonthDate.getFullYear()}-${String(startMonthDate.getMonth() + 1).padStart(2, '0')}`;

      // Query monthly usage
      const usageSnapshot = await db
        .collection(collection)
        .where('userId', '==', userId)
        .where('month', '>=', startMonth)
        .where('month', '<=', endMonth)
        .orderBy('month', 'asc')
        .get();

      const usage = usageSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const totals = usage.reduce(
        (acc, month: any) => ({
          totalCost: acc.totalCost + (month.totalCostUSD || 0),
          totalApiCalls: acc.totalApiCalls + (month.totalApiCalls || 0),
          totalTokens: acc.totalTokens + (month.totalTokens || 0),
        }),
        { totalCost: 0, totalApiCalls: 0, totalTokens: 0 }
      );

      const breakdown = calculateBreakdown(usage);

      return NextResponse.json({
        usage,
        totals: {
          ...totals,
          totalCost: Number(totals.totalCost.toFixed(2)),
        },
        breakdown,
        period: 'month',
        startMonth,
        endMonth,
      });
    }
  } catch (error: any) {
    console.error('[Admin User Usage API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch user usage' },
      { status: 500 }
    );
  }
}

// Helper: Get start of week (Monday)
function getWeekStart(date: Date): Date {
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // Adjust to Monday
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() + diff);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

// Helper: Aggregate operations
function aggregateOperations(target: any, source: any) {
  if (source.operationCounts) {
    Object.entries(source.operationCounts).forEach(([operation, count]) => {
      target.operationCounts[operation] = (target.operationCounts[operation] || 0) + (count as number);
    });
  }

  if (source.operationCosts) {
    Object.entries(source.operationCosts).forEach(([operation, cost]) => {
      target.operationCosts[operation] = (target.operationCosts[operation] || 0) + (cost as number);
    });
  }
}

// Helper: Calculate breakdown from usage array
function calculateBreakdown(usage: any[]): {
  operationCounts: Record<string, number>;
  operationCosts: Record<string, number>;
} {
  const operationCounts: Record<string, number> = {};
  const operationCosts: Record<string, number> = {};

  usage.forEach((item) => {
    if (item.operationCounts) {
      Object.entries(item.operationCounts).forEach(([operation, count]) => {
        operationCounts[operation] = (operationCounts[operation] || 0) + (count as number);
      });
    }

    if (item.operationCosts) {
      Object.entries(item.operationCosts).forEach(([operation, cost]) => {
        operationCosts[operation] = (operationCosts[operation] || 0) + (cost as number);
      });
    }
  });

  // Round costs to 2 decimal places
  Object.keys(operationCosts).forEach((key) => {
    operationCosts[key] = Number(operationCosts[key].toFixed(2));
  });

  return { operationCounts, operationCosts };
}
