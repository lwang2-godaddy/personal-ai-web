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
  messagesPerDay: 50,
  photosPerMonth: 15,
  voiceMinutesPerMonth: 30,
  customActivityTypes: 11,
  insightsEnabled: false,
  prioritySupport: false,
  advancedAnalytics: false,
  dataExport: false,
  offlineMode: true,
  // API cost limits for free tier
  maxTokensPerDay: 10000, // 10K tokens/day
  maxApiCallsPerDay: 100, // 100 API calls/day
  maxCostPerMonth: 5.0, // $5/month
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
  // API cost limits for premium tier
  maxTokensPerDay: 100000, // 100K tokens/day
  maxApiCallsPerDay: 1000, // 1000 API calls/day
  maxCostPerMonth: 50.0, // $50/month
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
  // API cost limits for pro tier
  maxTokensPerDay: 500000, // 500K tokens/day
  maxApiCallsPerDay: 5000, // 5000 API calls/day
  maxCostPerMonth: 200.0, // $200/month
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
