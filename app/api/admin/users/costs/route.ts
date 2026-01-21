import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';

/**
 * GET /api/admin/users/costs
 * Calculate current month costs for specific users
 *
 * Query params:
 * - userIds: comma-separated list of user IDs
 *
 * Returns:
 * - costs: Record<userId, costAmount>
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin role
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const { searchParams } = new URL(request.url);
    const userIdsParam = searchParams.get('userIds') || '';
    const userIds = userIdsParam.split(',').filter(id => id.trim().length > 0);

    if (userIds.length === 0) {
      return NextResponse.json({ costs: {} });
    }

    // Limit to prevent abuse
    if (userIds.length > 100) {
      return NextResponse.json(
        { error: 'Too many user IDs. Maximum 100 allowed.' },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();

    // Calculate current month date range
    const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
    const monthStart = new Date(currentMonth + '-01T00:00:00.000Z').toISOString();
    const nextMonth = new Date(new Date(currentMonth + '-01').getFullYear(), new Date(currentMonth + '-01').getMonth() + 1, 1);
    const monthEnd = new Date(nextMonth.getTime() - 1).toISOString();

    // Query promptExecutions for current month
    // Note: Firestore 'in' queries are limited to 30 items, so we query all and filter
    const promptsSnapshot = await db
      .collection('promptExecutions')
      .where('executedAt', '>=', monthStart)
      .where('executedAt', '<=', monthEnd)
      .get();

    // Aggregate costs per user
    const costs: Record<string, number> = {};
    userIds.forEach(id => { costs[id] = 0; }); // Initialize all to 0

    promptsSnapshot.forEach((doc) => {
      const data = doc.data();
      const userId = data.userId as string;
      const cost = (data.estimatedCostUSD as number) || 0;
      if (userId && userIds.includes(userId)) {
        costs[userId] = (costs[userId] || 0) + cost;
      }
    });

    return NextResponse.json({ costs });
  } catch (error: any) {
    console.error('[Admin Users Costs API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to calculate costs' },
      { status: 500 }
    );
  }
}
