/**
 * Usage Tracker Service
 * Tracks API usage and costs for OpenAI and Pinecone operations
 *
 * IMPORTANT: This service should only be used server-side (API routes, Cloud Functions)
 */

import {
  calculateEmbeddingCost,
  calculateChatCost,
  calculateTranscriptionCost,
  calculatePineconeQueryCost,
  calculatePineconeUpsertCost,
  calculatePineconeDeleteCost,
  DEFAULT_LIMITS,
} from '@/lib/config/pricing';
import type { UsageEvent, UsageOperation } from '@/lib/models/Usage';

/**
 * UsageTracker Singleton Service
 * Logs usage events to Firestore and checks usage limits
 */
class UsageTracker {
  private static instance: UsageTracker;

  private constructor() {
    // Prevent direct construction
    if (typeof window !== 'undefined') {
      throw new Error('UsageTracker cannot be instantiated in the browser!');
    }
  }

  /**
   * Get singleton instance
   */
  static getInstance(): UsageTracker {
    if (!UsageTracker.instance) {
      UsageTracker.instance = new UsageTracker();
    }
    return UsageTracker.instance;
  }

  /**
   * Track OpenAI embedding generation
   */
  async trackEmbedding(
    userId: string,
    tokens: number,
    endpoint: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const cost = calculateEmbeddingCost(tokens);

    await this.logUsageEvent({
      userId,
      operation: 'embedding',
      provider: 'openai',
      model: 'text-embedding-3-small',
      totalTokens: tokens,
      estimatedCostUSD: cost,
      endpoint,
      metadata,
    });

    console.log(`[UsageTracker] Embedding: ${tokens} tokens, $${cost.toFixed(6)} for user ${userId}`);
  }

  /**
   * Track OpenAI chat completion (GPT-4o)
   */
  async trackChatCompletion(
    userId: string,
    promptTokens: number,
    completionTokens: number,
    endpoint: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const cost = calculateChatCost(promptTokens, completionTokens);
    const totalTokens = promptTokens + completionTokens;

    await this.logUsageEvent({
      userId,
      operation: 'chat_completion',
      provider: 'openai',
      model: 'gpt-4o',
      promptTokens,
      completionTokens,
      totalTokens,
      estimatedCostUSD: cost,
      endpoint,
      metadata,
    });

    console.log(
      `[UsageTracker] Chat: ${promptTokens}+${completionTokens} tokens, $${cost.toFixed(6)} for user ${userId}`
    );
  }

  /**
   * Track Whisper audio transcription
   */
  async trackTranscription(
    userId: string,
    durationSeconds: number,
    endpoint: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const cost = calculateTranscriptionCost(durationSeconds);

    await this.logUsageEvent({
      userId,
      operation: 'transcription',
      provider: 'openai',
      model: 'whisper-1',
      audioDurationSeconds: durationSeconds,
      estimatedCostUSD: cost,
      endpoint,
      metadata,
    });

    console.log(
      `[UsageTracker] Transcription: ${durationSeconds}s, $${cost.toFixed(6)} for user ${userId}`
    );
  }

  /**
   * Track GPT-4 Vision image description
   */
  async trackImageDescription(
    userId: string,
    promptTokens: number,
    completionTokens: number,
    endpoint: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const cost = calculateChatCost(promptTokens, completionTokens);
    const totalTokens = promptTokens + completionTokens;

    await this.logUsageEvent({
      userId,
      operation: 'image_description',
      provider: 'openai',
      model: 'gpt-4o',
      promptTokens,
      completionTokens,
      totalTokens,
      estimatedCostUSD: cost,
      endpoint,
      metadata,
    });

    console.log(
      `[UsageTracker] Vision: ${promptTokens}+${completionTokens} tokens, $${cost.toFixed(6)} for user ${userId}`
    );
  }

  /**
   * Track Pinecone vector query
   */
  async trackPineconeQuery(
    userId: string,
    vectorCount: number,
    endpoint: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const cost = calculatePineconeQueryCost(vectorCount);

    await this.logUsageEvent({
      userId,
      operation: 'pinecone_query',
      provider: 'pinecone',
      vectorCount,
      estimatedCostUSD: cost,
      endpoint,
      metadata,
    });

    console.log(
      `[UsageTracker] Pinecone Query: ${vectorCount} vectors, $${cost.toFixed(6)} for user ${userId}`
    );
  }

  /**
   * Track Pinecone vector upsert
   */
  async trackPineconeUpsert(
    userId: string,
    vectorCount: number,
    endpoint: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const cost = calculatePineconeUpsertCost(vectorCount);

    await this.logUsageEvent({
      userId,
      operation: 'pinecone_upsert',
      provider: 'pinecone',
      vectorCount,
      estimatedCostUSD: cost,
      endpoint,
      metadata,
    });

    console.log(
      `[UsageTracker] Pinecone Upsert: ${vectorCount} vectors, $${cost.toFixed(6)} for user ${userId}`
    );
  }

  /**
   * Track Pinecone vector delete
   */
  async trackPineconeDelete(
    userId: string,
    vectorCount: number,
    endpoint: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const cost = calculatePineconeDeleteCost(vectorCount);

    await this.logUsageEvent({
      userId,
      operation: 'pinecone_delete',
      provider: 'pinecone',
      vectorCount,
      estimatedCostUSD: cost,
      endpoint,
      metadata,
    });

    console.log(
      `[UsageTracker] Pinecone Delete: ${vectorCount} vectors, $${cost.toFixed(6)} for user ${userId}`
    );
  }

  /**
   * Check if user can proceed with API call based on usage limits
   * Returns true if user is within limits, false if exceeded
   */
  async checkLimits(userId: string): Promise<boolean> {
    try {
      // Get user's custom limits or use defaults
      const limits = await this.getUserLimits(userId);

      // Get today's usage
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const todayUsage = await this.getDailyUsage(userId, today);

      // Check daily token limit
      if (limits.maxTokensPerDay && todayUsage.totalTokens >= limits.maxTokensPerDay) {
        console.warn(`[UsageTracker] User ${userId} exceeded daily token limit`);
        return false;
      }

      // Check daily API call limit
      if (limits.maxApiCallsPerDay && todayUsage.totalApiCalls >= limits.maxApiCallsPerDay) {
        console.warn(`[UsageTracker] User ${userId} exceeded daily API call limit`);
        return false;
      }

      // Check monthly cost limit
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      const monthlyUsage = await this.getMonthlyUsage(userId, currentMonth);

      if (limits.maxCostPerMonth && monthlyUsage.totalCostUSD >= limits.maxCostPerMonth) {
        console.warn(`[UsageTracker] User ${userId} exceeded monthly cost limit`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[UsageTracker] Error checking limits:', error);
      // On error, allow the request to proceed (fail open)
      return true;
    }
  }

  /**
   * Log usage event to Firestore
   * This is the core method that writes to the database
   */
  private async logUsageEvent(
    event: Omit<UsageEvent, 'id' | 'timestamp'>
  ): Promise<void> {
    try {
      // Import Firebase Admin helper dynamically (only on server)
      const { getAdminFirestore } = await import('@/lib/api/firebase/admin');

      // Get Firestore instance using the admin helper (ensures proper initialization)
      const db = getAdminFirestore();

      // Create usage event document, filtering out undefined values
      // Firestore doesn't accept undefined values
      const usageEvent: Record<string, any> = {
        timestamp: new Date().toISOString(),
      };

      // Only add defined values to the document
      for (const [key, value] of Object.entries(event)) {
        if (value !== undefined) {
          usageEvent[key] = value;
        }
      }

      // Write to usageEvents collection
      await db.collection('usageEvents').add(usageEvent);

      console.log(`[UsageTracker] ✓ Logged usage event: ${event.operation} for user ${event.userId}`);

      // Note: Daily and monthly aggregations will be handled by a Cloud Function
      // that runs periodically (every hour) to aggregate events
      // This keeps the API response fast and avoids transaction overhead
    } catch (error) {
      console.error('[UsageTracker] Error logging usage event:', error);
      // Don't throw error - we don't want usage tracking failures to break API calls
    }
  }

  /**
   * Get user's usage limits (custom or default)
   */
  private async getUserLimits(userId: string): Promise<{
    maxTokensPerDay: number;
    maxApiCallsPerDay: number;
    maxCostPerMonth: number;
  }> {
    try {
      const { getAdminFirestore } = await import('@/lib/api/firebase/admin');
      const db = getAdminFirestore();

      const userDoc = await db.collection('users').doc(userId).get();
      const userData = userDoc.data();

      // Return custom limits if set, otherwise defaults
      return {
        maxTokensPerDay: userData?.customLimits?.maxTokensPerDay || DEFAULT_LIMITS.maxTokensPerDay,
        maxApiCallsPerDay: userData?.customLimits?.maxApiCallsPerDay || DEFAULT_LIMITS.maxApiCallsPerDay,
        maxCostPerMonth: userData?.customLimits?.maxCostPerMonth || DEFAULT_LIMITS.maxCostPerMonth,
      };
    } catch (error) {
      console.error('[UsageTracker] Error getting user limits:', error);
      return DEFAULT_LIMITS;
    }
  }

  /**
   * Get daily usage for a specific date
   */
  private async getDailyUsage(
    userId: string,
    date: string
  ): Promise<{ totalTokens: number; totalApiCalls: number; totalCostUSD: number }> {
    try {
      const { getAdminFirestore } = await import('@/lib/api/firebase/admin');
      const db = getAdminFirestore();

      const docId = `${userId}_${date}`;
      const dailyDoc = await db.collection('usageDaily').doc(docId).get();

      if (dailyDoc.exists) {
        const data = dailyDoc.data();
        return {
          totalTokens: data?.totalTokens || 0,
          totalApiCalls: data?.totalApiCalls || 0,
          totalCostUSD: data?.totalCostUSD || 0,
        };
      }

      return { totalTokens: 0, totalApiCalls: 0, totalCostUSD: 0 };
    } catch (error) {
      console.error('[UsageTracker] Error getting daily usage:', error);
      return { totalTokens: 0, totalApiCalls: 0, totalCostUSD: 0 };
    }
  }

  /**
   * Get monthly usage for a specific month
   */
  private async getMonthlyUsage(
    userId: string,
    month: string
  ): Promise<{ totalTokens: number; totalApiCalls: number; totalCostUSD: number }> {
    try {
      const { getAdminFirestore } = await import('@/lib/api/firebase/admin');
      const db = getAdminFirestore();

      const docId = `${userId}_${month}`;
      const monthlyDoc = await db.collection('usageMonthly').doc(docId).get();

      if (monthlyDoc.exists) {
        const data = monthlyDoc.data();
        return {
          totalTokens: data?.totalTokens || 0,
          totalApiCalls: data?.totalApiCalls || 0,
          totalCostUSD: data?.totalCostUSD || 0,
        };
      }

      return { totalTokens: 0, totalApiCalls: 0, totalCostUSD: 0 };
    } catch (error) {
      console.error('[UsageTracker] Error getting monthly usage:', error);
      return { totalTokens: 0, totalApiCalls: 0, totalCostUSD: 0 };
    }
  }
}

// Export singleton instance
export default UsageTracker.getInstance();
