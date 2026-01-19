/**
 * Subscription.ts
 *
 * Data models for subscription tier configuration
 * Used by admin portal to configure quotas across mobile and web apps
 */

/**
 * Tier quotas stored in Firestore
 * Uses -1 to represent unlimited (easier to store than 'unlimited' string)
 */
export interface TierQuotas {
  messagesPerDay: number; // -1 = unlimited
  photosPerMonth: number; // -1 = unlimited
  voiceMinutesPerMonth: number; // -1 = unlimited
  customActivityTypes: number; // -1 = unlimited
  insightsEnabled: boolean;
  prioritySupport: boolean;
  advancedAnalytics: boolean;
  dataExport: boolean;
  offlineMode: boolean;
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
    free: TierQuotas;
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
  messagesPerDay?: number; // -1 = unlimited, undefined = use tier default
  photosPerMonth?: number;
  voiceMinutesPerMonth?: number;
  customActivityTypes?: number;
}

/**
 * Extended user subscription with admin override support
 */
export interface UserSubscription {
  tier: 'free' | 'premium' | 'pro';
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
// DEFAULT VALUES
// ============================================================================

export const DEFAULT_FREE_QUOTAS: TierQuotas = {
  messagesPerDay: 15,
  photosPerMonth: 5,
  voiceMinutesPerMonth: 5,
  customActivityTypes: 11,
  insightsEnabled: false,
  prioritySupport: false,
  advancedAnalytics: false,
  dataExport: false,
  offlineMode: true,
};

export const DEFAULT_PREMIUM_QUOTAS: TierQuotas = {
  messagesPerDay: -1, // unlimited
  photosPerMonth: -1,
  voiceMinutesPerMonth: -1,
  customActivityTypes: -1,
  insightsEnabled: true,
  prioritySupport: false,
  advancedAnalytics: false,
  dataExport: false,
  offlineMode: true,
};

export const DEFAULT_PRO_QUOTAS: TierQuotas = {
  messagesPerDay: -1, // unlimited
  photosPerMonth: -1,
  voiceMinutesPerMonth: -1,
  customActivityTypes: -1,
  insightsEnabled: true,
  prioritySupport: true,
  advancedAnalytics: true,
  dataExport: true,
  offlineMode: true,
};

/**
 * Get default subscription tier config from hardcoded values
 * Used to initialize Firestore config or as fallback
 */
export function getDefaultSubscriptionTierConfig(): Omit<SubscriptionTierConfig, 'version' | 'lastUpdated' | 'updatedBy'> {
  return {
    enableDynamicConfig: true,
    tiers: {
      free: DEFAULT_FREE_QUOTAS,
      premium: DEFAULT_PREMIUM_QUOTAS,
      pro: DEFAULT_PRO_QUOTAS,
    },
  };
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
