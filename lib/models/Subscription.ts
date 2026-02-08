/**
 * Subscription.ts
 *
 * Data models for subscription tier configuration
 * Used by admin portal to configure quotas across mobile and web apps
 */

/**
 * Tier quotas stored in Firestore
 * Uses -1 to represent unlimited (easier to store than 'unlimited' string)
 *
 * IMPORTANT: These quotas should match the mobile app's Subscription.ts
 * Mobile app location: PersonalAIApp/src/models/Subscription.ts
 */
export interface TierQuotas {
  messagesPerMonth: number; // -1 = unlimited (changed from messagesPerDay to match mobile)
  photosPerMonth: number; // -1 = unlimited
  voiceMinutesPerMonth: number; // -1 = unlimited
  maxVoiceRecordingSeconds: number; // Max seconds per recording (30/120/300)
  customActivityTypes: number; // -1 = unlimited
  offlineMode: boolean;
  webAccess: boolean; // Only Pro tier has web access
  // API cost limits (optional for backward compatibility)
  maxTokensPerDay?: number; // -1 = unlimited
  maxApiCallsPerDay?: number; // -1 = unlimited
  maxCostPerMonth?: number; // In USD, -1 = unlimited
}

/**
 * Main subscription config document stored at /config/subscriptionTiers
 */
export interface SubscriptionTierConfig {
  version: number;
  lastUpdated: string; // ISO timestamp
  updatedBy: string; // Admin UID
  enableDynamicConfig: boolean; // Kill switch to revert to hardcoded

  tiers: {
    basic: TierQuotas; // Was 'free', renamed to match mobile app
    premium: TierQuotas;
    pro: TierQuotas;
  };
}

/**
 * Version history document stored at /subscriptionTierVersions/{versionId}
 */
export interface SubscriptionConfigVersion {
  id: string;
  version: number;
  config: SubscriptionTierConfig;
  changedBy: string; // Admin UID
  changedByEmail?: string;
  changedAt: string; // ISO timestamp
  changeNotes?: string;
  previousVersion?: number;
}

/**
 * Per-user quota overrides (stored in user.subscription.quotaOverrides)
 * Takes precedence over tier defaults
 */
export interface QuotaOverrides {
  messagesPerMonth?: number; // -1 = unlimited, undefined = use tier default
  photosPerMonth?: number;
  voiceMinutesPerMonth?: number;
  maxVoiceRecordingSeconds?: number;
  customActivityTypes?: number;
}

/**
 * Subscription tier key type (matches mobile app)
 */
export type SubscriptionTierKey = 'basic' | 'premium' | 'pro';

/**
 * Legacy tier key type (for backward compatibility with old Firestore data)
 */
export type LegacyTierKey = SubscriptionTierKey | 'free';

/**
 * Normalize tier key - converts legacy 'free' to 'basic'
 */
export function normalizeTier(tier: LegacyTierKey | undefined | null): SubscriptionTierKey {
  if (!tier || tier === 'free') {
    return 'basic';
  }
  return tier;
}

/**
 * Extended user subscription with admin override support
 */
export interface UserSubscription {
  tier: SubscriptionTierKey | LegacyTierKey; // Accept both for compatibility
  status: 'active' | 'canceled' | 'expired' | 'trial' | 'past_due';
  source?: 'revenuecat' | 'admin_override';
  quotaOverrides?: QuotaOverrides;
  overrideBy?: string; // Admin UID who set the override
  overrideAt?: string; // When override was set
  startDate?: string;
  expiresAt?: string;
  autoRenew?: boolean;
}

/**
 * User usage tracking
 */
export interface UserUsage {
  messagesThisMonth: number;
  messagesToday: number; // Daily message counter for free tier limit
  photosThisMonth: number;
  voiceMinutesThisMonth: number;
  lastMessageAt?: string;
  monthlyResetAt: string;
  dailyResetAt: string; // When the daily message counter resets
}

// ============================================================================
// DEFAULT VALUES (Matching mobile app: PersonalAIApp/src/models/Subscription.ts)
// ============================================================================

/**
 * Basic (Free) tier quotas - NO web access
 */
export const DEFAULT_BASIC_QUOTAS: TierQuotas = {
  messagesPerMonth: 50,
  photosPerMonth: 10,
  voiceMinutesPerMonth: 30,
  maxVoiceRecordingSeconds: 30, // 30 seconds max per recording
  customActivityTypes: 11, // Preset activities only
  offlineMode: true,
  webAccess: false, // Basic tier cannot use web app
  // API cost limits for basic tier
  maxTokensPerDay: 10000,
  maxApiCallsPerDay: 100,
  maxCostPerMonth: 5.0,
};

/**
 * Premium tier quotas ($2.99/mo) - NO web access
 */
export const DEFAULT_PREMIUM_QUOTAS: TierQuotas = {
  messagesPerMonth: 250,
  photosPerMonth: 100,
  voiceMinutesPerMonth: 250,
  maxVoiceRecordingSeconds: 120, // 2 minutes max per recording
  customActivityTypes: -1, // unlimited
  offlineMode: true,
  webAccess: false, // Premium tier cannot use web app
  // API cost limits for premium tier
  maxTokensPerDay: 100000,
  maxApiCallsPerDay: 1000,
  maxCostPerMonth: 50.0,
};

/**
 * Pro tier quotas ($5.99/mo) - HAS web access
 */
export const DEFAULT_PRO_QUOTAS: TierQuotas = {
  messagesPerMonth: 1000,
  photosPerMonth: 200,
  voiceMinutesPerMonth: 1000,
  maxVoiceRecordingSeconds: 300, // 5 minutes max per recording
  customActivityTypes: -1, // unlimited
  offlineMode: true,
  webAccess: true, // Only Pro tier has web access
  // API cost limits for pro tier
  maxTokensPerDay: 500000,
  maxApiCallsPerDay: 5000,
  maxCostPerMonth: 200.0,
};

// Legacy alias for backward compatibility
export const DEFAULT_FREE_QUOTAS = DEFAULT_BASIC_QUOTAS;

/**
 * Get default subscription tier config from hardcoded values
 * Used to initialize Firestore config or as fallback
 */
export function getDefaultSubscriptionTierConfig(): Omit<SubscriptionTierConfig, 'version' | 'lastUpdated' | 'updatedBy'> {
  return {
    enableDynamicConfig: true,
    tiers: {
      basic: DEFAULT_BASIC_QUOTAS,
      premium: DEFAULT_PREMIUM_QUOTAS,
      pro: DEFAULT_PRO_QUOTAS,
    },
  };
}

/**
 * Check if a user's tier has web access
 */
export function hasWebAccess(tier: SubscriptionTierKey | LegacyTierKey | undefined | null): boolean {
  const normalizedTier = normalizeTier(tier);
  switch (normalizedTier) {
    case 'pro':
      return true;
    case 'premium':
    case 'basic':
    default:
      return false;
  }
}

/**
 * Get quotas for a tier
 */
export function getQuotasForTier(tier: SubscriptionTierKey | LegacyTierKey | undefined | null): TierQuotas {
  const normalizedTier = normalizeTier(tier);
  switch (normalizedTier) {
    case 'pro':
      return DEFAULT_PRO_QUOTAS;
    case 'premium':
      return DEFAULT_PREMIUM_QUOTAS;
    case 'basic':
    default:
      return DEFAULT_BASIC_QUOTAS;
  }
}

/**
 * Check if a quota value represents unlimited
 */
export function isUnlimited(value: number): boolean {
  return value === -1;
}

/**
 * Format quota value for display
 */
export function formatQuotaValue(value: number): string {
  return value === -1 ? 'Unlimited' : value.toString();
}
