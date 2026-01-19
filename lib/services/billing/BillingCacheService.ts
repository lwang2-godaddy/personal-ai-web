/**
 * Billing Cache Service
 * Firestore-based caching for billing data from external APIs
 *
 * Cache Collection: billingCache
 * Document ID format: {provider}_{startDate}_{endDate}
 *
 * TTL by provider:
 * - OpenAI: 6 hours (usage data updates periodically)
 * - Pinecone: 12 hours (less frequent updates)
 * - GCP: 24 hours (billing export has 24-48h delay)
 */

import {
  BillingCacheDocument,
  BILLING_CACHE_TTL,
  OpenAIBillingData,
  PineconeBillingData,
  GCPBillingData,
} from '@/lib/models/BillingData';
import { getAdminFirestore } from '@/lib/api/firebase/admin';

type BillingProvider = 'openai' | 'pinecone' | 'gcp';
type BillingData = OpenAIBillingData | PineconeBillingData | GCPBillingData;

const COLLECTION_NAME = 'billingCache';

/**
 * BillingCacheService Singleton
 * Handles caching of billing data in Firestore
 */
class BillingCacheService {
  private static instance: BillingCacheService;

  private constructor() {
    // Prevent direct construction
    if (typeof window !== 'undefined') {
      throw new Error('BillingCacheService cannot be instantiated in the browser!');
    }
  }

  /**
   * Get singleton instance
   */
  static getInstance(): BillingCacheService {
    if (!BillingCacheService.instance) {
      BillingCacheService.instance = new BillingCacheService();
    }
    return BillingCacheService.instance;
  }

  /**
   * Generate cache document ID
   */
  private getCacheId(provider: BillingProvider, startDate: string, endDate: string): string {
    return `${provider}_${startDate}_${endDate}`;
  }

  /**
   * Get TTL for provider in milliseconds
   */
  private getTTL(provider: BillingProvider): number {
    return BILLING_CACHE_TTL[provider];
  }

  /**
   * Check if cache entry is still valid (not expired)
   */
  private isValid(doc: BillingCacheDocument): boolean {
    const now = new Date().getTime();
    const expiresAt = new Date(doc.expiresAt).getTime();
    return now < expiresAt;
  }

  /**
   * Get cache age in milliseconds
   */
  private getCacheAge(doc: BillingCacheDocument): number {
    const now = new Date().getTime();
    const cachedAt = new Date(doc.cachedAt).getTime();
    return now - cachedAt;
  }

  /**
   * Get cached billing data for a provider
   * Returns null if not cached or expired
   */
  async get<T extends BillingData>(
    provider: BillingProvider,
    startDate: string,
    endDate: string
  ): Promise<{ data: T; cacheAge: number } | null> {
    try {
      const db = getAdminFirestore();
      const docId = this.getCacheId(provider, startDate, endDate);
      const docRef = db.collection(COLLECTION_NAME).doc(docId);
      const doc = await docRef.get();

      if (!doc.exists) {
        console.log(`[BillingCache] Cache miss: ${docId} (not found)`);
        return null;
      }

      const cacheDoc = doc.data() as BillingCacheDocument;

      if (!this.isValid(cacheDoc)) {
        console.log(`[BillingCache] Cache miss: ${docId} (expired)`);
        // Delete expired entry
        await docRef.delete().catch(() => {});
        return null;
      }

      const cacheAge = this.getCacheAge(cacheDoc);
      console.log(`[BillingCache] Cache hit: ${docId} (age: ${Math.round(cacheAge / 1000 / 60)}min)`);

      return {
        data: cacheDoc.data as T,
        cacheAge,
      };
    } catch (error) {
      console.error('[BillingCache] Error getting cache:', error);
      return null;
    }
  }

  /**
   * Set cached billing data for a provider
   */
  async set<T extends BillingData>(
    provider: BillingProvider,
    startDate: string,
    endDate: string,
    data: T
  ): Promise<void> {
    try {
      const db = getAdminFirestore();
      const docId = this.getCacheId(provider, startDate, endDate);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.getTTL(provider));

      const cacheDoc: Omit<BillingCacheDocument, 'id'> = {
        provider,
        startDate,
        endDate,
        data,
        cachedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      };

      await db.collection(COLLECTION_NAME).doc(docId).set(cacheDoc);

      console.log(`[BillingCache] Cached: ${docId} (expires: ${expiresAt.toISOString()})`);
    } catch (error) {
      console.error('[BillingCache] Error setting cache:', error);
      // Don't throw - caching failure shouldn't break the request
    }
  }

  /**
   * Invalidate cache for a provider
   * Call this when you want to force a fresh fetch
   */
  async invalidate(provider: BillingProvider, startDate: string, endDate: string): Promise<void> {
    try {
      const db = getAdminFirestore();
      const docId = this.getCacheId(provider, startDate, endDate);
      await db.collection(COLLECTION_NAME).doc(docId).delete();
      console.log(`[BillingCache] Invalidated: ${docId}`);
    } catch (error) {
      console.error('[BillingCache] Error invalidating cache:', error);
    }
  }

  /**
   * Invalidate all cache entries for a provider
   */
  async invalidateAll(provider: BillingProvider): Promise<void> {
    try {
      const db = getAdminFirestore();
      const snapshot = await db
        .collection(COLLECTION_NAME)
        .where('provider', '==', provider)
        .get();

      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      console.log(`[BillingCache] Invalidated all ${provider} cache entries (${snapshot.size})`);
    } catch (error) {
      console.error('[BillingCache] Error invalidating all cache:', error);
    }
  }

  /**
   * Clean up expired cache entries (can be called by a scheduled function)
   */
  async cleanup(): Promise<number> {
    try {
      const db = getAdminFirestore();
      const now = new Date().toISOString();

      const snapshot = await db
        .collection(COLLECTION_NAME)
        .where('expiresAt', '<', now)
        .get();

      if (snapshot.empty) {
        console.log('[BillingCache] No expired entries to clean up');
        return 0;
      }

      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      console.log(`[BillingCache] Cleaned up ${snapshot.size} expired entries`);
      return snapshot.size;
    } catch (error) {
      console.error('[BillingCache] Error cleaning up cache:', error);
      return 0;
    }
  }
}

// Export singleton getter
export function getBillingCacheService(): BillingCacheService {
  return BillingCacheService.getInstance();
}

export { BillingCacheService };
