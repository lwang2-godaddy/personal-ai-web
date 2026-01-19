/**
 * OpenAI Billing Service
 * Fetches real billing data from OpenAI Usage API
 *
 * IMPORTANT: Requires OPENAI_ORG_API_KEY (Organization API key)
 * This is different from the project API key used for completions.
 * Get it from: https://platform.openai.com/organization/api-keys
 *
 * API Documentation: https://platform.openai.com/docs/api-reference/usage
 */

import {
  OpenAIBillingData,
  createEmptyOpenAIBilling,
} from '@/lib/models/BillingData';
import { getBillingCacheService } from './BillingCacheService';

/**
 * OpenAI Usage API response types
 */
interface OpenAIUsageDataPoint {
  aggregation_timestamp: number;
  n_requests: number;
  operation: string;
  snapshot_id: string;
  n_context_tokens_total: number;
  n_generated_tokens_total: number;
  project_id?: string;
  user_id?: string;
  api_key_id?: string;
  model?: string;
}

interface OpenAIUsageResponse {
  object: string;
  data: OpenAIUsageDataPoint[];
  has_more: boolean;
  next_page?: string;
}

interface OpenAICostsDataPoint {
  object: string;
  amount: {
    value: number;
    currency: string;
  };
  line_item?: string;
  project_id?: string;
}

interface OpenAICostsResponse {
  object: string;
  data: OpenAICostsDataPoint[];
  has_more: boolean;
  next_page?: string;
}

/**
 * OpenAI model pricing (per 1M tokens)
 * Updated Jan 2025
 */
const OPENAI_MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4o-2024-11-20': { input: 2.50, output: 10.00 },
  'gpt-4o-2024-08-06': { input: 2.50, output: 10.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4o-mini-2024-07-18': { input: 0.15, output: 0.60 },
  'gpt-4-turbo': { input: 10.00, output: 30.00 },
  'gpt-4': { input: 30.00, output: 60.00 },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  'text-embedding-3-small': { input: 0.02, output: 0 },
  'text-embedding-3-large': { input: 0.13, output: 0 },
  'text-embedding-ada-002': { input: 0.10, output: 0 },
  'whisper-1': { input: 0.006, output: 0 }, // Per minute, not tokens
  'tts-1': { input: 15.00, output: 0 }, // Per 1M characters
  'tts-1-hd': { input: 30.00, output: 0 }, // Per 1M characters
  'dall-e-3': { input: 0.04, output: 0 }, // Per image (standard)
};

/**
 * OpenAIBillingService Singleton
 */
class OpenAIBillingService {
  private static instance: OpenAIBillingService;
  private apiKey: string | null = null;

  private constructor() {
    if (typeof window !== 'undefined') {
      throw new Error('OpenAIBillingService cannot be instantiated in the browser!');
    }
  }

  static getInstance(): OpenAIBillingService {
    if (!OpenAIBillingService.instance) {
      OpenAIBillingService.instance = new OpenAIBillingService();
    }
    return OpenAIBillingService.instance;
  }

  /**
   * Initialize with API key
   */
  private getApiKey(): string | null {
    if (!this.apiKey) {
      // Try organization key first, fall back to regular key
      this.apiKey = process.env.OPENAI_ORG_API_KEY || process.env.OPENAI_ADMIN_API_KEY || null;
    }
    return this.apiKey;
  }

  /**
   * Check if API key is configured
   */
  isConfigured(): boolean {
    return !!this.getApiKey();
  }

  /**
   * Fetch usage data from OpenAI API
   */
  async fetchUsage(
    startDate: string,
    endDate: string,
    useCache: boolean = true
  ): Promise<OpenAIBillingData> {
    const cacheService = getBillingCacheService();

    // Check cache first
    if (useCache) {
      const cached = await cacheService.get<OpenAIBillingData>('openai', startDate, endDate);
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
      console.log('[OpenAIBilling] API key not configured');
      return {
        ...createEmptyOpenAIBilling(),
        error: 'OpenAI Organization API key not configured. Set OPENAI_ORG_API_KEY in environment.',
      };
    }

    try {
      // Convert dates to Unix timestamps (start of day / end of day)
      const startTimestamp = Math.floor(new Date(startDate + 'T00:00:00Z').getTime() / 1000);
      const endTimestamp = Math.floor(new Date(endDate + 'T23:59:59Z').getTime() / 1000);

      console.log(`[OpenAIBilling] Fetching usage: ${startDate} to ${endDate}`);

      // Fetch costs data from OpenAI Costs API
      const costsUrl = new URL('https://api.openai.com/v1/organization/costs');
      costsUrl.searchParams.set('start_time', startTimestamp.toString());
      costsUrl.searchParams.set('end_time', endTimestamp.toString());
      costsUrl.searchParams.set('bucket_width', '1d');
      costsUrl.searchParams.set('group_by', 'line_item');

      const costsResponse = await fetch(costsUrl.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!costsResponse.ok) {
        const errorText = await costsResponse.text();
        console.error('[OpenAIBilling] Costs API error:', costsResponse.status, errorText);

        // If costs API fails, try usage API as fallback
        return await this.fetchUsageFallback(startDate, endDate, startTimestamp, endTimestamp, apiKey);
      }

      const costsData: OpenAICostsResponse = await costsResponse.json();

      // Process costs data
      const result = this.processCostsData(costsData, startDate, endDate);

      // Cache the result
      await cacheService.set('openai', startDate, endDate, result);

      return result;
    } catch (error) {
      console.error('[OpenAIBilling] Error fetching usage:', error);
      return {
        ...createEmptyOpenAIBilling(),
        error: error instanceof Error ? error.message : 'Failed to fetch OpenAI billing data',
      };
    }
  }

  /**
   * Fallback to usage API if costs API is not available
   */
  private async fetchUsageFallback(
    startDate: string,
    endDate: string,
    startTimestamp: number,
    endTimestamp: number,
    apiKey: string
  ): Promise<OpenAIBillingData> {
    try {
      // Try the completions usage endpoint
      const usageUrl = new URL('https://api.openai.com/v1/organization/usage/completions');
      usageUrl.searchParams.set('start_time', startTimestamp.toString());
      usageUrl.searchParams.set('end_time', endTimestamp.toString());
      usageUrl.searchParams.set('bucket_width', '1d');
      usageUrl.searchParams.set('group_by', 'model');

      const usageResponse = await fetch(usageUrl.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!usageResponse.ok) {
        const errorText = await usageResponse.text();
        console.error('[OpenAIBilling] Usage API error:', usageResponse.status, errorText);
        return {
          ...createEmptyOpenAIBilling(),
          error: `OpenAI API error: ${usageResponse.status}. Ensure OPENAI_ORG_API_KEY has org:usage:read permission.`,
        };
      }

      const usageData: OpenAIUsageResponse = await usageResponse.json();

      // Process usage data (estimate costs from tokens)
      return this.processUsageData(usageData, startDate, endDate);
    } catch (error) {
      console.error('[OpenAIBilling] Fallback error:', error);
      return {
        ...createEmptyOpenAIBilling(),
        error: error instanceof Error ? error.message : 'Failed to fetch OpenAI usage data',
      };
    }
  }

  /**
   * Process costs API response
   */
  private processCostsData(
    costsData: OpenAICostsResponse,
    startDate: string,
    endDate: string
  ): OpenAIBillingData {
    let totalCost = 0;
    const byModel: Record<string, { costUSD: number; tokens: number; requests: number }> = {};
    const byDateMap: Map<string, number> = new Map();

    for (const item of costsData.data) {
      if (!item.amount?.value) continue;

      const cost = item.amount.value / 100; // Convert cents to dollars if needed
      totalCost += cost;

      // Aggregate by line item (model/service)
      const lineItem = item.line_item || 'other';
      if (!byModel[lineItem]) {
        byModel[lineItem] = { costUSD: 0, tokens: 0, requests: 0 };
      }
      byModel[lineItem].costUSD += cost;
    }

    // Generate date range for byDate
    const start = new Date(startDate);
    const end = new Date(endDate);
    const byDate: { date: string; costUSD: number }[] = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      byDate.push({
        date: dateStr,
        costUSD: byDateMap.get(dateStr) || 0,
      });
    }

    return {
      totalCostUSD: totalCost,
      byModel,
      byDate,
      dataSource: 'api',
      fetchedAt: new Date().toISOString(),
    };
  }

  /**
   * Process usage API response (estimate costs from tokens)
   */
  private processUsageData(
    usageData: OpenAIUsageResponse,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _startDate: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _endDate: string
  ): OpenAIBillingData {
    let totalCost = 0;
    const byModel: Record<string, { costUSD: number; tokens: number; requests: number }> = {};
    const byDateMap: Map<string, number> = new Map();

    for (const item of usageData.data) {
      const model = item.model || 'unknown';
      const inputTokens = item.n_context_tokens_total || 0;
      const outputTokens = item.n_generated_tokens_total || 0;
      const requests = item.n_requests || 0;

      // Calculate cost based on pricing
      const pricing = OPENAI_MODEL_PRICING[model] || { input: 0.01, output: 0.03 };
      const cost = (inputTokens / 1_000_000) * pricing.input +
                   (outputTokens / 1_000_000) * pricing.output;

      totalCost += cost;

      // Aggregate by model
      if (!byModel[model]) {
        byModel[model] = { costUSD: 0, tokens: 0, requests: 0 };
      }
      byModel[model].costUSD += cost;
      byModel[model].tokens += inputTokens + outputTokens;
      byModel[model].requests += requests;

      // Aggregate by date
      const date = new Date(item.aggregation_timestamp * 1000).toISOString().split('T')[0];
      byDateMap.set(date, (byDateMap.get(date) || 0) + cost);
    }

    // Convert byDateMap to array
    const byDate = Array.from(byDateMap.entries())
      .map(([date, costUSD]) => ({ date, costUSD }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalCostUSD: totalCost,
      byModel,
      byDate,
      dataSource: 'api',
      fetchedAt: new Date().toISOString(),
    };
  }
}

// Export singleton getter
export function getOpenAIBillingService(): OpenAIBillingService {
  return OpenAIBillingService.getInstance();
}

export { OpenAIBillingService };
