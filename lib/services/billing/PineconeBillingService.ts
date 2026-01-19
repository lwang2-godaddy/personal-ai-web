/**
 * Pinecone Billing Service
 * Fetches real usage data from Pinecone API
 *
 * Uses existing PINECONE_API_KEY from environment
 * API Documentation: https://docs.pinecone.io/reference/api/2024-07
 */

import {
  PineconeBillingData,
  createEmptyPineconeBilling,
} from '@/lib/models/BillingData';
import { getBillingCacheService } from './BillingCacheService';
import {
  PINECONE_PRICING,
  PINECONE_STORAGE_PRICING,
} from '@/lib/config/pricing';

/**
 * Pinecone index stats response
 */
interface PineconeIndexStats {
  dimension: number;
  indexFullness: number;
  totalVectorCount: number;
  namespaces?: Record<string, { vectorCount: number }>;
}

/**
 * Pinecone index description response
 */
interface PineconeIndexDescription {
  name: string;
  dimension: number;
  metric: string;
  host: string;
  spec: {
    serverless?: {
      cloud: string;
      region: string;
    };
    pod?: {
      environment: string;
      replicas: number;
      pods: number;
      podType: string;
    };
  };
  status: {
    ready: boolean;
    state: string;
  };
}

/**
 * PineconeBillingService Singleton
 */
class PineconeBillingService {
  private static instance: PineconeBillingService;
  private apiKey: string | null = null;

  private constructor() {
    if (typeof window !== 'undefined') {
      throw new Error('PineconeBillingService cannot be instantiated in the browser!');
    }
  }

  static getInstance(): PineconeBillingService {
    if (!PineconeBillingService.instance) {
      PineconeBillingService.instance = new PineconeBillingService();
    }
    return PineconeBillingService.instance;
  }

  /**
   * Get API key from environment
   */
  private getApiKey(): string | null {
    if (!this.apiKey) {
      this.apiKey = process.env.NEXT_PUBLIC_PINECONE_API_KEY ||
                    process.env.PINECONE_API_KEY || null;
    }
    return this.apiKey;
  }

  /**
   * Get index name from environment
   */
  private getIndexName(): string {
    return process.env.NEXT_PUBLIC_PINECONE_INDEX ||
           process.env.PINECONE_INDEX ||
           'personal-ai-data';
  }

  /**
   * Check if API key is configured
   */
  isConfigured(): boolean {
    return !!this.getApiKey();
  }

  /**
   * Fetch usage data from Pinecone
   * Note: Pinecone doesn't have a dedicated billing API, so we estimate
   * based on index stats and operations tracked in our system
   */
  async fetchUsage(
    startDate: string,
    endDate: string,
    useCache: boolean = true
  ): Promise<PineconeBillingData> {
    const cacheService = getBillingCacheService();

    // Check cache first
    if (useCache) {
      const cached = await cacheService.get<PineconeBillingData>('pinecone', startDate, endDate);
      if (cached) {
        return {
          ...cached.data,
          dataSource: 'cached',
        };
      }
    }

    // Check if API key is configured
    const apiKey = this.getApiKey();
    if (!apiKey) {
      console.log('[PineconeBilling] API key not configured');
      return {
        ...createEmptyPineconeBilling(),
        error: 'Pinecone API key not configured.',
      };
    }

    try {
      const indexName = this.getIndexName();
      console.log(`[PineconeBilling] Fetching usage for index: ${indexName}`);

      // Get index description to determine spec type
      const indexInfo = await this.describeIndex(apiKey, indexName);

      // Get index stats
      const stats = await this.getIndexStats(apiKey, indexInfo.host);

      // Calculate storage cost
      const dimension = stats.dimension || 1536;
      const vectorCount = stats.totalVectorCount || 0;
      const storageGB = (vectorCount * dimension * 4) / (1024 ** 3);

      // Calculate costs based on Pinecone pricing
      // Note: We only have storage info from the API; read/write units
      // are tracked separately in our usageEvents collection
      const storageMonthlyCost = storageGB * PINECONE_STORAGE_PRICING.perGBMonth;

      // For serverless, we need to look at our own tracking for read/write units
      const { readUnits, writeUnits, operationCost } = await this.getOperationStats(startDate, endDate);

      // Calculate days in range for prorated storage cost
      const start = new Date(startDate);
      const end = new Date(endDate);
      const daysInRange = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const proratedStorageCost = (storageMonthlyCost / 30) * daysInRange;

      const totalCost = proratedStorageCost + operationCost;

      const result: PineconeBillingData = {
        totalCostUSD: totalCost,
        readUnits,
        writeUnits,
        storageGB,
        byDate: [], // Pinecone doesn't provide daily breakdown
        dataSource: 'api',
        fetchedAt: new Date().toISOString(),
      };

      // Cache the result
      await cacheService.set('pinecone', startDate, endDate, result);

      console.log(`[PineconeBilling] Fetched: ${vectorCount} vectors, ${storageGB.toFixed(4)} GB, $${totalCost.toFixed(4)}`);

      return result;
    } catch (error) {
      console.error('[PineconeBilling] Error fetching usage:', error);
      return {
        ...createEmptyPineconeBilling(),
        error: error instanceof Error ? error.message : 'Failed to fetch Pinecone billing data',
      };
    }
  }

  /**
   * Describe index to get host URL
   */
  private async describeIndex(apiKey: string, indexName: string): Promise<PineconeIndexDescription> {
    const response = await fetch(`https://api.pinecone.io/indexes/${indexName}`, {
      method: 'GET',
      headers: {
        'Api-Key': apiKey,
        'X-Pinecone-API-Version': '2024-07',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to describe index: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  /**
   * Get index stats
   */
  private async getIndexStats(apiKey: string, host: string): Promise<PineconeIndexStats> {
    const response = await fetch(`https://${host}/describe_index_stats`, {
      method: 'POST',
      headers: {
        'Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get index stats: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  /**
   * Get operation stats from our usageEvents collection
   * This aggregates Pinecone operations we've tracked
   */
  private async getOperationStats(
    startDate: string,
    endDate: string
  ): Promise<{ readUnits: number; writeUnits: number; operationCost: number }> {
    try {
      const { getAdminFirestore } = await import('@/lib/api/firebase/admin');
      const db = getAdminFirestore();

      // Query usageEvents for Pinecone operations
      const startTimestamp = new Date(startDate + 'T00:00:00.000Z').toISOString();
      const endTimestamp = new Date(endDate + 'T23:59:59.999Z').toISOString();

      const snapshot = await db
        .collection('usageEvents')
        .where('timestamp', '>=', startTimestamp)
        .where('timestamp', '<=', endTimestamp)
        .where('endpoint', 'in', ['pinecone_query', 'pinecone_upsert', 'pinecone_delete'])
        .get();

      let readUnits = 0;
      let writeUnits = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        const endpoint = data.endpoint as string;

        if (endpoint === 'pinecone_query') {
          readUnits += 1;
        } else if (endpoint === 'pinecone_upsert') {
          writeUnits += data.vectorCount || 1;
        } else if (endpoint === 'pinecone_delete') {
          writeUnits += 1;
        }
      });

      // Calculate operation cost
      const readCost = (readUnits / 1_000_000) * PINECONE_PRICING.query.per1MOperations;
      const writeCost = (writeUnits / 1_000_000) * PINECONE_PRICING.upsert.per1MOperations;
      const operationCost = readCost + writeCost;

      return { readUnits, writeUnits, operationCost };
    } catch (error) {
      console.warn('[PineconeBilling] Error getting operation stats:', error);
      return { readUnits: 0, writeUnits: 0, operationCost: 0 };
    }
  }
}

// Export singleton getter
export function getPineconeBillingService(): PineconeBillingService {
  return PineconeBillingService.getInstance();
}

export { PineconeBillingService };
