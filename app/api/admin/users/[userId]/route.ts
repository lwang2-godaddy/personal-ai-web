import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';

/**
 * GET /api/admin/users/[userId]
 * Get detailed user information with current usage stats
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Verify admin role
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const { userId } = params;
    const db = getAdminFirestore();

    // Get user data
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = { id: userDoc.id, ...userDoc.data() };

    // Get current month usage
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const usageMonthlyDoc = await db
      .collection('usageMonthly')
      .doc(`${userId}_${currentMonth}`)
      .get();

    const currentMonthUsage = usageMonthlyDoc.exists ? usageMonthlyDoc.data() : null;

    // Get current day usage
    const today = now.toISOString().split('T')[0];
    const usageDailyDoc = await db
      .collection('usageDaily')
      .doc(`${userId}_${today}`)
      .get();

    const todayUsage = usageDailyDoc.exists ? usageDailyDoc.data() : null;

    return NextResponse.json({
      user: userData,
      currentMonthUsage,
      todayUsage,
    });
  } catch (error: any) {
    console.error('[Admin User Detail API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch user details' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/users/[userId]
 * Update user information (role, status, limits, subscription)
 *
 * Body:
 * - accountStatus?: 'active' | 'suspended'
 * - subscription?: 'free' | 'premium' | 'pro'
 * - customLimits?: UserLimits
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Verify admin role
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const { userId } = params;
    const body = await request.json();
    const db = getAdminFirestore();

    // Validate user exists
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Build update object with only allowed fields
    const updates: any = {
      updatedAt: new Date().toISOString(),
    };

    if (body.accountStatus !== undefined) {
      if (!['active', 'suspended'].includes(body.accountStatus)) {
        return NextResponse.json(
          { error: 'Invalid accountStatus. Must be "active" or "suspended"' },
          { status: 400 }
        );
      }
      updates.accountStatus = body.accountStatus;
    }

    if (body.subscription !== undefined) {
      if (!['free', 'premium', 'pro'].includes(body.subscription)) {
        return NextResponse.json(
          { error: 'Invalid subscription. Must be "free", "premium", or "pro"' },
          { status: 400 }
        );
      }
      updates.subscription = body.subscription;
    }

    if (body.customLimits !== undefined) {
      // Validate customLimits structure
      if (typeof body.customLimits !== 'object' || body.customLimits === null) {
        return NextResponse.json(
          { error: 'customLimits must be an object' },
          { status: 400 }
        );
      }

      const limits = body.customLimits;

      // Validate numeric fields if provided
      if (limits.maxTokensPerDay !== undefined && (typeof limits.maxTokensPerDay !== 'number' || limits.maxTokensPerDay < 0)) {
        return NextResponse.json(
          { error: 'maxTokensPerDay must be a positive number' },
          { status: 400 }
        );
      }

      if (limits.maxApiCallsPerDay !== undefined && (typeof limits.maxApiCallsPerDay !== 'number' || limits.maxApiCallsPerDay < 0)) {
        return NextResponse.json(
          { error: 'maxApiCallsPerDay must be a positive number' },
          { status: 400 }
        );
      }

      if (limits.maxCostPerMonth !== undefined && (typeof limits.maxCostPerMonth !== 'number' || limits.maxCostPerMonth < 0)) {
        return NextResponse.json(
          { error: 'maxCostPerMonth must be a positive number' },
          { status: 400 }
        );
      }

      updates.customLimits = limits;
    }

    // Update user document
    await db.collection('users').doc(userId).update(updates);

    // Fetch updated user data
    const updatedDoc = await db.collection('users').doc(userId).get();
    const updatedUser = { id: updatedDoc.id, ...updatedDoc.data() };

    console.log(`[Admin] User ${userId} updated by admin ${user.uid}:`, updates);

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('[Admin User Update API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update user' },
      { status: 500 }
    );
  }
}
