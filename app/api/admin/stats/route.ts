import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';

/**
 * GET /api/admin/stats
 * Get dashboard overview statistics for admin panel
 *
 * Returns:
 * - totalUsers: number
 * - activeUsers: number (logged in within last 30 days)
 * - suspendedUsers: number
 * - currentMonthCost: number (USD)
 * - currentMonthApiCalls: number
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin role
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const db = getAdminFirestore();
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get total users count
    const usersSnapshot = await db.collection('users').get();
    const totalUsers = usersSnapshot.size;

    // Count suspended users
    const suspendedSnapshot = await db
      .collection('users')
      .where('accountStatus', '==', 'suspended')
      .get();
    const suspendedUsers = suspendedSnapshot.size;

    // Count active users (logged in within last 30 days)
    const activeSnapshot = await db
      .collection('users')
      .where('lastLoginAt', '>=', thirtyDaysAgo.toISOString())
      .get();
    const activeUsers = activeSnapshot.size;

    // Get current month usage stats
    const usageQuery = db
      .collection('usageMonthly')
      .where('month', '==', currentMonth);

    const usageSnapshot = await usageQuery.get();

    let currentMonthCost = 0;
    let currentMonthApiCalls = 0;

    usageSnapshot.forEach((doc) => {
      const data = doc.data();
      currentMonthCost += data.totalCostUSD || 0;
      currentMonthApiCalls += data.totalApiCalls || 0;
    });

    return NextResponse.json({
      totalUsers,
      activeUsers,
      suspendedUsers,
      currentMonthCost: Number(currentMonthCost.toFixed(2)),
      currentMonthApiCalls,
    });
  } catch (error: any) {
    console.error('[Admin Stats API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
