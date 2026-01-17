import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/users/[userId]
 * Get user profile data (own user only, unless admin)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Verify authentication
    const { user, response: authResponse } = await requireAuth(request);
    if (authResponse) return authResponse;

    const { userId } = await params;

    // Users can only access their own data
    if (user.uid !== userId && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: You can only access your own data' },
        { status: 403 }
      );
    }

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

    return NextResponse.json(userData);
  } catch (error: any) {
    console.error('[User API] GET Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch user data' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/users/[userId]
 * Update user profile (own user only, unless admin)
 *
 * Body:
 * - notificationPreferences?: NotificationPreferences
 * - quietHours?: QuietHours
 * - lifeFeedPreferences?: LifeFeedPreferences
 * - timezone?: string
 * - locale?: string
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Verify authentication
    const { user, response: authResponse } = await requireAuth(request);
    if (authResponse) return authResponse;

    const { userId } = await params;

    // Users can only update their own data
    if (user.uid !== userId && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: You can only update your own data' },
        { status: 403 }
      );
    }

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

    // Allow users to update their own preferences
    if (body.notificationPreferences !== undefined) {
      updates.notificationPreferences = body.notificationPreferences;
    }

    if (body.quietHours !== undefined) {
      updates.quietHours = body.quietHours;
    }

    if (body.timezone !== undefined) {
      updates.timezone = body.timezone;
    }

    if (body.locale !== undefined) {
      updates.locale = body.locale;
    }

    // Life Feed preferences
    if (body.lifeFeedPreferences !== undefined) {
      // Basic validation
      if (typeof body.lifeFeedPreferences.enabled !== 'boolean') {
        return NextResponse.json(
          { error: 'Invalid lifeFeedPreferences: enabled must be a boolean' },
          { status: 400 }
        );
      }
      if (body.lifeFeedPreferences.maxPostsPerDay !== undefined) {
        const maxPosts = body.lifeFeedPreferences.maxPostsPerDay;
        if (typeof maxPosts !== 'number' || maxPosts < 1 || maxPosts > 10) {
          return NextResponse.json(
            { error: 'Invalid lifeFeedPreferences: maxPostsPerDay must be 1-10' },
            { status: 400 }
          );
        }
      }
      if (body.lifeFeedPreferences.frequency !== undefined) {
        const validFrequencies = ['low', 'medium', 'high', 'smart'];
        if (!validFrequencies.includes(body.lifeFeedPreferences.frequency)) {
          return NextResponse.json(
            { error: 'Invalid lifeFeedPreferences: frequency must be low, medium, high, or smart' },
            { status: 400 }
          );
        }
      }
      updates.lifeFeedPreferences = body.lifeFeedPreferences;
    }

    // Only admins can update role and status
    if (user.role === 'admin') {
      if (body.accountStatus !== undefined) {
        if (!['active', 'suspended'].includes(body.accountStatus)) {
          return NextResponse.json(
            { error: 'Invalid accountStatus. Must be "active" or "suspended"' },
            { status: 400 }
          );
        }
        updates.accountStatus = body.accountStatus;
      }

      if (body.role !== undefined) {
        if (!['admin', 'user'].includes(body.role)) {
          return NextResponse.json(
            { error: 'Invalid role. Must be "admin" or "user"' },
            { status: 400 }
          );
        }
        updates.role = body.role;
      }

      if (body.customLimits !== undefined) {
        updates.customLimits = body.customLimits;
      }
    }

    // Update user document
    await db.collection('users').doc(userId).update(updates);

    // Fetch updated user data
    const updatedDoc = await db.collection('users').doc(userId).get();
    const updatedUser = { id: updatedDoc.id, ...updatedDoc.data() };

    console.log(`[User API] User ${userId} updated:`, Object.keys(updates));

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('[User API] PATCH Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update user' },
      { status: 500 }
    );
  }
}
