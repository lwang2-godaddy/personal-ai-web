import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';
import {
  SubscriptionTierConfig,
  SubscriptionConfigVersion,
  TierQuotas,
  getDefaultSubscriptionTierConfig,
} from '@/lib/models/Subscription';

const CONFIG_DOC_PATH = 'config/subscriptionTiers';
const VERSIONS_COLLECTION = 'subscriptionTierVersions';

/**
 * GET /api/admin/subscriptions
 * Get current subscription tier configuration
 *
 * Returns:
 * - config: SubscriptionTierConfig (or default if not initialized)
 * - isDefault: boolean (true if returning hardcoded defaults)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin role
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const db = getAdminFirestore();
    const configDoc = await db.doc(CONFIG_DOC_PATH).get();

    if (!configDoc.exists) {
      // Return default config if not initialized
      const defaultConfig = getDefaultSubscriptionTierConfig();
      return NextResponse.json({
        config: {
          ...defaultConfig,
          version: 0,
          lastUpdated: new Date().toISOString(),
          updatedBy: 'system',
        },
        isDefault: true,
      });
    }

    const config = configDoc.data() as SubscriptionTierConfig;
    return NextResponse.json({
      config,
      isDefault: false,
    });
  } catch (error: unknown) {
    console.error('[Admin Subscriptions API] Error fetching config:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch subscription config';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/subscriptions
 * Initialize subscription configuration with defaults
 * Only works if config doesn't exist yet
 *
 * Returns:
 * - config: SubscriptionTierConfig
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin role
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const db = getAdminFirestore();
    const configRef = db.doc(CONFIG_DOC_PATH);
    const configDoc = await configRef.get();

    if (configDoc.exists) {
      return NextResponse.json(
        { error: 'Subscription config already exists. Use PATCH to update.' },
        { status: 409 }
      );
    }

    // Initialize with defaults
    const defaultConfig = getDefaultSubscriptionTierConfig();
    const now = new Date().toISOString();
    const config: SubscriptionTierConfig = {
      ...defaultConfig,
      version: 1,
      lastUpdated: now,
      updatedBy: user.uid,
    };

    await configRef.set(config);

    // Create initial version record
    const versionDoc: SubscriptionConfigVersion = {
      id: 'v1',
      version: 1,
      config,
      changedBy: user.uid,
      changedByEmail: user.email || undefined,
      changedAt: now,
      changeNotes: 'Initial configuration',
    };

    await db.collection(VERSIONS_COLLECTION).doc('v1').set(versionDoc);

    return NextResponse.json({ config }, { status: 201 });
  } catch (error: unknown) {
    console.error('[Admin Subscriptions API] Error initializing config:', error);
    const message = error instanceof Error ? error.message : 'Failed to initialize subscription config';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/subscriptions
 * Update subscription tier configuration
 *
 * Body:
 * - tiers?: { basic?, premium?, pro? } - Partial tier updates
 * - enableDynamicConfig?: boolean - Kill switch
 * - changeNotes?: string - Description of changes
 *
 * Returns:
 * - config: SubscriptionTierConfig (updated)
 */
export async function PATCH(request: NextRequest) {
  try {
    // Verify admin role
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const body = await request.json();
    const { tiers, enableDynamicConfig, changeNotes } = body;

    const db = getAdminFirestore();
    const configRef = db.doc(CONFIG_DOC_PATH);
    const configDoc = await configRef.get();

    if (!configDoc.exists) {
      return NextResponse.json(
        { error: 'Subscription config not initialized. Use POST to initialize first.' },
        { status: 404 }
      );
    }

    const currentConfig = configDoc.data() as SubscriptionTierConfig;
    const now = new Date().toISOString();
    const newVersion = currentConfig.version + 1;

    // Build updated config
    const updatedConfig: SubscriptionTierConfig = {
      ...currentConfig,
      version: newVersion,
      lastUpdated: now,
      updatedBy: user.uid,
    };

    // Update kill switch if provided
    if (typeof enableDynamicConfig === 'boolean') {
      updatedConfig.enableDynamicConfig = enableDynamicConfig;
    }

    // Update tiers if provided
    if (tiers) {
      if (tiers.basic) {
        updatedConfig.tiers.basic = validateAndMergeTierQuotas(
          currentConfig.tiers.basic,
          tiers.basic
        );
      }
      if (tiers.premium) {
        updatedConfig.tiers.premium = validateAndMergeTierQuotas(
          currentConfig.tiers.premium,
          tiers.premium
        );
      }
      if (tiers.pro) {
        updatedConfig.tiers.pro = validateAndMergeTierQuotas(
          currentConfig.tiers.pro,
          tiers.pro
        );
      }
    }

    // Save updated config
    await configRef.set(updatedConfig);

    // Create version record for audit trail
    const versionDoc: SubscriptionConfigVersion = {
      id: `v${newVersion}`,
      version: newVersion,
      config: updatedConfig,
      changedBy: user.uid,
      changedByEmail: user.email || undefined,
      changedAt: now,
      changeNotes: changeNotes || undefined,
      previousVersion: currentConfig.version,
    };

    await db.collection(VERSIONS_COLLECTION).doc(`v${newVersion}`).set(versionDoc);

    return NextResponse.json({ config: updatedConfig });
  } catch (error: unknown) {
    console.error('[Admin Subscriptions API] Error updating config:', error);
    const message = error instanceof Error ? error.message : 'Failed to update subscription config';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * Validate and merge tier quota updates
 */
function validateAndMergeTierQuotas(
  current: TierQuotas,
  updates: Partial<TierQuotas>
): TierQuotas {
  const merged = { ...current };

  // Validate and apply numeric quotas
  if (typeof updates.messagesPerMonth === 'number') {
    if (updates.messagesPerMonth < -1) {
      throw new Error('messagesPerMonth must be -1 (unlimited) or >= 0');
    }
    merged.messagesPerMonth = updates.messagesPerMonth;
  }

  if (typeof updates.photosPerMonth === 'number') {
    if (updates.photosPerMonth < -1) {
      throw new Error('photosPerMonth must be -1 (unlimited) or >= 0');
    }
    merged.photosPerMonth = updates.photosPerMonth;
  }

  if (typeof updates.voiceMinutesPerMonth === 'number') {
    if (updates.voiceMinutesPerMonth < -1) {
      throw new Error('voiceMinutesPerMonth must be -1 (unlimited) or >= 0');
    }
    merged.voiceMinutesPerMonth = updates.voiceMinutesPerMonth;
  }

  if (typeof updates.maxVoiceRecordingSeconds === 'number') {
    if (updates.maxVoiceRecordingSeconds < 1) {
      throw new Error('maxVoiceRecordingSeconds must be >= 1');
    }
    merged.maxVoiceRecordingSeconds = updates.maxVoiceRecordingSeconds;
  }

  if (typeof updates.customActivityTypes === 'number') {
    if (updates.customActivityTypes < -1) {
      throw new Error('customActivityTypes must be -1 (unlimited) or >= 0');
    }
    merged.customActivityTypes = updates.customActivityTypes;
  }

  // Validate and apply boolean features
  if (typeof updates.offlineMode === 'boolean') {
    merged.offlineMode = updates.offlineMode;
  }

  if (typeof updates.webAccess === 'boolean') {
    merged.webAccess = updates.webAccess;
  }

  // Validate and apply API cost limits (optional)
  if (typeof updates.maxTokensPerDay === 'number') {
    if (updates.maxTokensPerDay < -1) {
      throw new Error('maxTokensPerDay must be -1 (unlimited) or >= 0');
    }
    merged.maxTokensPerDay = updates.maxTokensPerDay;
  }

  if (typeof updates.maxApiCallsPerDay === 'number') {
    if (updates.maxApiCallsPerDay < -1) {
      throw new Error('maxApiCallsPerDay must be -1 (unlimited) or >= 0');
    }
    merged.maxApiCallsPerDay = updates.maxApiCallsPerDay;
  }

  if (typeof updates.maxCostPerMonth === 'number') {
    if (updates.maxCostPerMonth < -1) {
      throw new Error('maxCostPerMonth must be -1 (unlimited) or >= 0');
    }
    merged.maxCostPerMonth = updates.maxCostPerMonth;
  }

  return merged;
}
