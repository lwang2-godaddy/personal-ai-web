import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';
import {
  QuotaOverrides,
  UserSubscription,
  SubscriptionTierConfig,
  TierQuotas,
  SubscriptionTierKey,
  LegacyTierKey,
  normalizeTier,
  DEFAULT_BASIC_QUOTAS,
  DEFAULT_PREMIUM_QUOTAS,
  DEFAULT_PRO_QUOTAS,
} from '@/lib/models/Subscription';

const CONFIG_DOC_PATH = 'config/subscriptionTiers';

/**
 * GET /api/admin/users/[userId]/subscription
 * Get user's subscription details with effective limits
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Verify admin role
    const { user: adminUser, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const { userId } = await params;
    const db = getAdminFirestore();

    // Get user data
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data()!;
    const subscription = userData.subscription as UserSubscription | undefined;
    const usage = userData.usage as Record<string, any> | undefined;

    // Get tier config to calculate effective limits
    const tierConfig = await getTierConfig(db);
    const tier = normalizeTier(subscription?.tier as LegacyTierKey);
    const tierQuotas = tierConfig?.tiers[tier] || getDefaultQuotas(tier);

    // Calculate effective limits (override > tier default)
    const effectiveLimits = {
      messagesPerMonth: subscription?.quotaOverrides?.messagesPerMonth ?? tierQuotas.messagesPerMonth,
      photosPerMonth: subscription?.quotaOverrides?.photosPerMonth ?? tierQuotas.photosPerMonth,
      voiceMinutesPerMonth: subscription?.quotaOverrides?.voiceMinutesPerMonth ?? tierQuotas.voiceMinutesPerMonth,
    };

    return NextResponse.json({
      userId,
      subscription: subscription || { tier: 'basic', status: 'active' },
      usage: usage || {
        messagesThisMonth: 0,
        messagesToday: 0,
        photosThisMonth: 0,
        voiceMinutesThisMonth: 0,
        dailyResetAt: null,
      },
      tierDefaults: tierQuotas,
      effectiveLimits,
    });
  } catch (error: any) {
    console.error('[Admin User Subscription API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch subscription details' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/users/[userId]/subscription
 * Update user's subscription tier, overrides, or reset usage
 *
 * Body:
 * - tier?: 'free' | 'premium' | 'pro' - Change subscription tier
 * - quotaOverrides?: QuotaOverrides - Set custom limits (null to clear)
 * - resetUsage?: boolean - Reset usage counters to 0
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Verify admin role
    const { user: adminUser, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const { userId } = await params;
    const body = await request.json();
    const { tier, quotaOverrides, resetUsage } = body;

    const db = getAdminFirestore();

    // Get user data
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data()!;
    const now = new Date().toISOString();
    const updates: Record<string, any> = {};

    // Update tier if provided
    if (tier !== undefined) {
      if (!['basic', 'free', 'premium', 'pro'].includes(tier)) {
        return NextResponse.json(
          { error: 'Invalid tier. Must be "basic", "premium", or "pro"' },
          { status: 400 }
        );
      }
      // Normalize 'free' to 'basic'
      const normalizedTier = tier === 'free' ? 'basic' : tier;

      const currentSubscription = userData.subscription || {};
      updates.subscription = {
        ...currentSubscription,
        tier: normalizedTier,
        status: 'active',
        source: 'admin_override',
        manualOverride: true, // Prevents RevenueCat from overwriting this subscription
        overrideBy: adminUser.uid,
        overrideAt: now,
      };
    }

    // Update quota overrides if provided
    if (quotaOverrides !== undefined) {
      const currentSubscription = userData.subscription || updates.subscription || {};

      if (quotaOverrides === null) {
        // Clear overrides
        updates.subscription = {
          ...currentSubscription,
          ...updates.subscription,
          quotaOverrides: null,
        };
      } else {
        // Validate override values
        const validOverrides: QuotaOverrides = {};

        if (quotaOverrides.messagesPerMonth !== undefined) {
          if (typeof quotaOverrides.messagesPerMonth !== 'number' || quotaOverrides.messagesPerMonth < -1) {
            return NextResponse.json(
              { error: 'messagesPerMonth must be -1 (unlimited) or >= 0' },
              { status: 400 }
            );
          }
          validOverrides.messagesPerMonth = quotaOverrides.messagesPerMonth;
        }

        if (quotaOverrides.photosPerMonth !== undefined) {
          if (typeof quotaOverrides.photosPerMonth !== 'number' || quotaOverrides.photosPerMonth < -1) {
            return NextResponse.json(
              { error: 'photosPerMonth must be -1 (unlimited) or >= 0' },
              { status: 400 }
            );
          }
          validOverrides.photosPerMonth = quotaOverrides.photosPerMonth;
        }

        if (quotaOverrides.voiceMinutesPerMonth !== undefined) {
          if (typeof quotaOverrides.voiceMinutesPerMonth !== 'number' || quotaOverrides.voiceMinutesPerMonth < -1) {
            return NextResponse.json(
              { error: 'voiceMinutesPerMonth must be -1 (unlimited) or >= 0' },
              { status: 400 }
            );
          }
          validOverrides.voiceMinutesPerMonth = quotaOverrides.voiceMinutesPerMonth;
        }

        updates.subscription = {
          ...currentSubscription,
          ...updates.subscription,
          quotaOverrides: validOverrides,
          overrideBy: adminUser.uid,
          overrideAt: now,
        };
      }
    }

    // Reset usage counters if requested
    if (resetUsage === true) {
      updates.usage = {
        messagesThisMonth: 0,
        messagesToday: 0,
        photosThisMonth: 0,
        voiceMinutesThisMonth: 0,
        lastMessageAt: null,
        monthlyResetAt: now,
        dailyResetAt: now,
      };
    }

    // Apply updates
    if (Object.keys(updates).length > 0) {
      updates.updatedAt = now;
      await userRef.update(updates);
    }

    // Fetch and return updated data
    const updatedDoc = await userRef.get();
    const updatedData = updatedDoc.data()!;

    console.log(`[Admin] User ${userId} subscription updated by admin ${adminUser.uid}:`, {
      tier: tier || 'unchanged',
      quotaOverrides: quotaOverrides !== undefined ? 'updated' : 'unchanged',
      resetUsage: resetUsage || false,
    });

    return NextResponse.json({
      success: true,
      subscription: updatedData.subscription,
      usage: updatedData.usage,
    });
  } catch (error: any) {
    console.error('[Admin User Subscription API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update subscription' },
      { status: 500 }
    );
  }
}

// Helper: Get tier config from Firestore
async function getTierConfig(db: FirebaseFirestore.Firestore): Promise<SubscriptionTierConfig | null> {
  const configDoc = await db.doc(CONFIG_DOC_PATH).get();
  if (!configDoc.exists) return null;
  const config = configDoc.data() as SubscriptionTierConfig;
  return config.enableDynamicConfig ? config : null;
}

// Helper: Get default quotas for a tier
function getDefaultQuotas(tier: SubscriptionTierKey): TierQuotas {
  switch (tier) {
    case 'premium':
      return DEFAULT_PREMIUM_QUOTAS;
    case 'pro':
      return DEFAULT_PRO_QUOTAS;
    case 'basic':
    default:
      return DEFAULT_BASIC_QUOTAS;
  }
}
