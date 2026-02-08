/**
 * SubscriptionConfigService.ts
 *
 * Service for fetching and caching subscription tier configuration from Firestore.
 * Works both client-side (with localStorage) and server-side (with memory cache).
 *
 * Caching Strategy:
 * - Client: localStorage with 24-hour TTL
 * - Server: Memory cache with 5-minute TTL
 * - Fallback to hardcoded defaults if unavailable
 */

import {
  SubscriptionTierConfig,
  TierQuotas,
  QuotaOverrides,
  SubscriptionTierKey,
  LegacyTierKey,
  normalizeTier,
  DEFAULT_BASIC_QUOTAS,
  DEFAULT_PREMIUM_QUOTAS,
  DEFAULT_PRO_QUOTAS,
} from '@/lib/models/Subscription';

const CACHE_KEY = 'subscription_config_cache';
const CLIENT_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const SERVER_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CachedConfig {
  config: SubscriptionTierConfig;
  fetchedAt: number;
}

// Server-side memory cache
let serverCache: CachedConfig | null = null;

/**
 * Check if running in browser
 */
const isBrowser = typeof window !== 'undefined';

/**
 * Get subscription config from Firestore (server-side via Admin SDK)
 */
async function fetchConfigFromFirestore(): Promise<SubscriptionTierConfig | null> {
  try {
    if (isBrowser) {
      // Client-side: fetch via API
      const response = await fetch('/api/admin/subscriptions');
      if (!response.ok) {
        console.warn('[SubscriptionConfigService] Failed to fetch config from API:', response.status);
        return null;
      }
      const data = await response.json();
      return data.config;
    } else {
      // Server-side: use Admin SDK directly
      const { getAdminFirestore } = await import('@/lib/api/firebase/admin');
      const db = getAdminFirestore();
      const configDoc = await db.doc('config/subscriptionTiers').get();

      if (!configDoc.exists) {
        return null;
      }

      return configDoc.data() as SubscriptionTierConfig;
    }
  } catch (error) {
    console.error('[SubscriptionConfigService] Error fetching config:', error);
    return null;
  }
}

/**
 * Get hardcoded defaults as SubscriptionTierConfig
 */
function getHardcodedDefaults(): SubscriptionTierConfig {
  return {
    version: 0,
    lastUpdated: new Date().toISOString(),
    updatedBy: 'system',
    enableDynamicConfig: false,
    tiers: {
      basic: DEFAULT_BASIC_QUOTAS,
      premium: DEFAULT_PREMIUM_QUOTAS,
      pro: DEFAULT_PRO_QUOTAS,
    },
  };
}

/**
 * Load config from localStorage (client-side only)
 */
function loadFromLocalStorage(): CachedConfig | null {
  if (!isBrowser) return null;

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      return JSON.parse(cached) as CachedConfig;
    }
  } catch (error) {
    console.warn('[SubscriptionConfigService] Error loading from localStorage:', error);
  }
  return null;
}

/**
 * Save config to localStorage (client-side only)
 */
function saveToLocalStorage(config: SubscriptionTierConfig): void {
  if (!isBrowser) return;

  try {
    const cacheData: CachedConfig = {
      config,
      fetchedAt: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.warn('[SubscriptionConfigService] Error saving to localStorage:', error);
  }
}

/**
 * Check if cache is stale
 */
function isCacheStale(fetchedAt: number): boolean {
  const ttl = isBrowser ? CLIENT_CACHE_TTL_MS : SERVER_CACHE_TTL_MS;
  return Date.now() - fetchedAt > ttl;
}

export class SubscriptionConfigService {
  private static instance: SubscriptionConfigService;
  private isInitialized: boolean = false;
  private initPromise: Promise<void> | null = null;
  private cachedConfig: SubscriptionTierConfig | null = null;
  private lastFetchTime: number = 0;

  private constructor() {}

  static getInstance(): SubscriptionConfigService {
    if (!SubscriptionConfigService.instance) {
      SubscriptionConfigService.instance = new SubscriptionConfigService();
    }
    return SubscriptionConfigService.instance;
  }

  /**
   * Initialize the service by loading cached config
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._doInitialize();
    await this.initPromise;
    this.isInitialized = true;
  }

  private async _doInitialize(): Promise<void> {
    // Try to load from cache first
    if (isBrowser) {
      const cached = loadFromLocalStorage();
      if (cached && !isCacheStale(cached.fetchedAt)) {
        this.cachedConfig = cached.config;
        this.lastFetchTime = cached.fetchedAt;
        console.log('[SubscriptionConfigService] Loaded config from localStorage (version:', cached.config.version, ')');
        return;
      }
    } else {
      // Server-side: check memory cache
      if (serverCache && !isCacheStale(serverCache.fetchedAt)) {
        this.cachedConfig = serverCache.config;
        this.lastFetchTime = serverCache.fetchedAt;
        return;
      }
    }

    // Fetch fresh config
    await this.refreshConfig();
  }

  /**
   * Get the current subscription config
   */
  async getConfig(): Promise<SubscriptionTierConfig> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // If cache is stale, refresh in background
    if (this.lastFetchTime === 0 || isCacheStale(this.lastFetchTime)) {
      this.refreshConfig().catch(err => {
        console.warn('[SubscriptionConfigService] Background refresh failed:', err);
      });
    }

    return this.cachedConfig || getHardcodedDefaults();
  }

  /**
   * Get cached config synchronously (may return defaults if not initialized)
   */
  getCachedConfig(): SubscriptionTierConfig {
    return this.cachedConfig || getHardcodedDefaults();
  }

  /**
   * Force refresh config from Firestore
   */
  async refreshConfig(): Promise<void> {
    try {
      console.log('[SubscriptionConfigService] Refreshing config from Firestore...');

      const config = await fetchConfigFromFirestore();

      if (config) {
        if (config.enableDynamicConfig) {
          this.cachedConfig = config;
          this.lastFetchTime = Date.now();

          // Update caches
          if (isBrowser) {
            saveToLocalStorage(config);
          } else {
            serverCache = { config, fetchedAt: Date.now() };
          }

          console.log('[SubscriptionConfigService] Config refreshed (version:', config.version, ')');
        } else {
          console.log('[SubscriptionConfigService] Dynamic config disabled, using hardcoded defaults');
          this.cachedConfig = getHardcodedDefaults();
          this.lastFetchTime = Date.now();
        }
      } else {
        console.log('[SubscriptionConfigService] No config in Firestore, using hardcoded defaults');
        this.cachedConfig = getHardcodedDefaults();
        this.lastFetchTime = Date.now();
      }
    } catch (error) {
      console.error('[SubscriptionConfigService] Error refreshing config:', error);
      if (!this.cachedConfig) {
        this.cachedConfig = getHardcodedDefaults();
      }
    }
  }

  /**
   * Get quotas for a specific tier
   */
  getTierQuotas(tier: SubscriptionTierKey | LegacyTierKey): TierQuotas {
    const config = this.cachedConfig || getHardcodedDefaults();
    const normalizedTier = normalizeTier(tier);
    return config.tiers[normalizedTier];
  }

  /**
   * Get effective limit for a user, considering per-user overrides
   */
  getEffectiveLimit(
    tier: SubscriptionTierKey | LegacyTierKey,
    limitType: 'messagesPerMonth' | 'photosPerMonth' | 'voiceMinutesPerMonth',
    userOverrides?: QuotaOverrides
  ): number {
    const normalizedTier = normalizeTier(tier);

    // 1. Check per-user override first (highest priority)
    if (userOverrides && userOverrides[limitType] !== undefined) {
      return userOverrides[limitType]!;
    }

    // 2. Check dynamic config
    const config = this.cachedConfig;
    if (config?.enableDynamicConfig && config.tiers[normalizedTier]) {
      return config.tiers[normalizedTier][limitType];
    }

    // 3. Fallback to hardcoded defaults
    const defaults = getHardcodedDefaults();
    return defaults.tiers[normalizedTier][limitType];
  }

  /**
   * Check if a limit value represents unlimited
   */
  isUnlimited(value: number): boolean {
    return value === -1;
  }

  /**
   * Clear cached config
   */
  clearCache(): void {
    this.cachedConfig = null;
    this.lastFetchTime = 0;
    this.isInitialized = false;
    this.initPromise = null;

    if (isBrowser) {
      try {
        localStorage.removeItem(CACHE_KEY);
      } catch (error) {
        console.warn('[SubscriptionConfigService] Error clearing localStorage:', error);
      }
    } else {
      serverCache = null;
    }
  }
}

export default SubscriptionConfigService;
