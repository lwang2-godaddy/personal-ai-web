/**
 * Billing Data Models
 * TypeScript interfaces for real billing data from external APIs
 * (OpenAI, Pinecone, GCP)
 */

/**
 * Data source type for billing data
 * - 'api': Fresh data fetched from the API
 * - 'cached': Data loaded from Firestore cache
 * - 'unavailable': API not configured or failed
 */
export type BillingDataSource = 'api' | 'cached' | 'unavailable';

/**
 * OpenAI billing data
 * Fetched from OpenAI Usage API (requires organization API key)
 */
export interface OpenAIBillingData {
  totalCostUSD: number;
  byModel: Record<string, {
    costUSD: number;
    tokens: number;
    requests: number;
  }>;
  byDate: {
    date: string;
    costUSD: number;
  }[];
  dataSource: BillingDataSource;
  fetchedAt: string;
  error?: string;
}

/**
 * Pinecone billing data
 * Fetched from Pinecone Usage API
 */
export interface PineconeBillingData {
  totalCostUSD: number;
  readUnits: number;
  writeUnits: number;
  storageGB: number;
  byDate: {
    date: string;
    costUSD: number;
  }[];
  dataSource: BillingDataSource;
  fetchedAt: string;
  error?: string;
}

/**
 * GCP billing data
 * Fetched from BigQuery billing export (requires setup)
 */
export interface GCPBillingData {
  totalCostUSD: number;
  byService: {
    firestore: number;
    storage: number;
    functions: number;
    hosting: number;
    other: number;
  };
  byDate: {
    date: string;
    costUSD: number;
  }[];
  dataSource: BillingDataSource;
  fetchedAt: string;
  billingExportEnabled: boolean;
  error?: string;
}

/**
 * Cost variance between estimated and actual
 * Positive = over estimate, negative = under estimate
 */
export interface CostVariance {
  openai: number;
  pinecone: number;
  infrastructure: number;
  grandTotal: number;
  // Percentage variance
  openaiPercent: number | null;
  pineconePercent: number | null;
  infrastructurePercent: number | null;
  grandTotalPercent: number | null;
}

/**
 * Combined billing data from all providers
 */
export interface CombinedBillingData {
  openai: OpenAIBillingData;
  pinecone: PineconeBillingData;
  gcp: GCPBillingData;
  totals: {
    actual: {
      openai: number;
      pinecone: number;
      gcp: number;
      grandTotal: number;
    };
    estimated: {
      openai: number;
      pinecone: number;
      infrastructure: number;
      grandTotal: number;
    };
    variance: CostVariance;
  };
  startDate: string;
  endDate: string;
}

/**
 * Billing cache document stored in Firestore
 */
export interface BillingCacheDocument {
  id: string;
  provider: 'openai' | 'pinecone' | 'gcp';
  startDate: string;
  endDate: string;
  data: OpenAIBillingData | PineconeBillingData | GCPBillingData;
  cachedAt: string;
  expiresAt: string;
}

/**
 * Cache TTL configuration (in milliseconds)
 */
export const BILLING_CACHE_TTL = {
  openai: 6 * 60 * 60 * 1000,     // 6 hours
  pinecone: 12 * 60 * 60 * 1000,  // 12 hours
  gcp: 24 * 60 * 60 * 1000,       // 24 hours
} as const;

/**
 * API response for billing endpoints
 */
export interface BillingResponse<T> {
  data: T;
  cached: boolean;
  cacheAge?: number; // Age in milliseconds
  error?: string;
}

/**
 * Combined billing API response
 */
export interface CombinedBillingResponse {
  data: CombinedBillingData;
  startDate: string;
  endDate: string;
  cacheStatus: {
    openai: { cached: boolean; cacheAge?: number };
    pinecone: { cached: boolean; cacheAge?: number };
    gcp: { cached: boolean; cacheAge?: number };
  };
}

/**
 * Helper function to create empty billing data
 */
export function createEmptyOpenAIBilling(): OpenAIBillingData {
  return {
    totalCostUSD: 0,
    byModel: {},
    byDate: [],
    dataSource: 'unavailable',
    fetchedAt: new Date().toISOString(),
  };
}

export function createEmptyPineconeBilling(): PineconeBillingData {
  return {
    totalCostUSD: 0,
    readUnits: 0,
    writeUnits: 0,
    storageGB: 0,
    byDate: [],
    dataSource: 'unavailable',
    fetchedAt: new Date().toISOString(),
  };
}

export function createEmptyGCPBilling(): GCPBillingData {
  return {
    totalCostUSD: 0,
    byService: {
      firestore: 0,
      storage: 0,
      functions: 0,
      hosting: 0,
      other: 0,
    },
    byDate: [],
    dataSource: 'unavailable',
    fetchedAt: new Date().toISOString(),
    billingExportEnabled: false,
  };
}

/**
 * Calculate percentage variance
 */
export function calculateVariancePercent(estimated: number, actual: number): number | null {
  if (estimated === 0 && actual === 0) return null;
  if (estimated === 0) return actual > 0 ? 100 : -100;
  return ((actual - estimated) / estimated) * 100;
}
