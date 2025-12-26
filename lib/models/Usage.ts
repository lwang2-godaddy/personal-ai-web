/**
 * Usage Tracking Models
 * Tracks API usage and costs for OpenAI and Pinecone operations
 */

/**
 * Types of operations that are tracked
 */
export type UsageOperation =
  | 'embedding'           // text-embedding-3-small
  | 'chat_completion'     // gpt-4o chat
  | 'transcription'       // whisper-1
  | 'image_description'   // gpt-4o vision
  | 'tts'                 // text-to-speech
  | 'pinecone_query'      // Vector query
  | 'pinecone_upsert'     // Vector upsert
  | 'pinecone_delete';    // Vector delete

/**
 * Individual usage event (raw data)
 * Stored in Firestore usageEvents collection
 */
export interface UsageEvent {
  id?: string;                    // Auto-generated ID
  userId: string;                 // User who made the request
  timestamp: string;              // ISO 8601 timestamp
  operation: UsageOperation;      // Type of operation
  provider: 'openai' | 'pinecone'; // Service provider

  // OpenAI specific
  model?: string;                 // e.g., 'gpt-4o', 'whisper-1'
  promptTokens?: number;          // Input tokens
  completionTokens?: number;      // Output tokens
  totalTokens?: number;           // Total tokens
  audioDurationSeconds?: number;  // For Whisper transcription

  // Pinecone specific
  vectorCount?: number;           // Number of vectors queried/upserted
  dimension?: number;             // Vector dimension (1024 or 512)

  // Cost calculation
  estimatedCostUSD: number;       // Calculated cost in USD

  // Context
  endpoint: string;               // e.g., '/api/chat', '/api/transcribe'
  metadata?: Record<string, any>; // Additional context
}

/**
 * Aggregated usage stats (per user, per day)
 * Stored in Firestore usageDaily collection
 * Document ID format: userId_YYYY-MM-DD
 */
export interface DailyUsageStats {
  id: string;                     // Format: userId_YYYY-MM-DD
  userId: string;
  date: string;                   // YYYY-MM-DD

  // Aggregated metrics
  totalApiCalls: number;
  totalTokens: number;
  totalCostUSD: number;

  // Breakdown by operation
  operations: {
    [K in UsageOperation]?: {
      count: number;
      tokens?: number;
      cost: number;
    }
  };

  // Provider breakdown
  openaiCost: number;
  pineconeCost: number;

  // Updated timestamp
  lastUpdated: string;            // ISO 8601 timestamp
}

/**
 * Monthly aggregation
 * Stored in Firestore usageMonthly collection
 * Document ID format: userId_YYYY-MM
 */
export interface MonthlyUsageStats {
  id: string;                     // Format: userId_YYYY-MM
  userId: string;
  month: string;                  // YYYY-MM

  totalApiCalls: number;
  totalTokens: number;
  totalCostUSD: number;

  // Daily breakdown
  dailyStats: Array<{
    date: string;                 // YYYY-MM-DD
    cost: number;
    apiCalls: number;
    tokens: number;
  }>;

  // Operation summary
  operationSummary: {
    [K in UsageOperation]?: {
      totalCount: number;
      totalCost: number;
      totalTokens?: number;
    }
  };

  // Provider summary
  openaiCost: number;
  pineconeCost: number;

  lastUpdated: string;            // ISO 8601 timestamp
}

/**
 * Usage statistics for admin dashboard
 * Aggregated across all users
 */
export interface SystemUsageStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  totalCostThisMonth: number;
  totalApiCallsThisMonth: number;
  totalTokensThisMonth: number;

  // Top users by cost
  topUsersByCost: Array<{
    userId: string;
    email: string | null;
    displayName: string | null;
    cost: number;
  }>;

  // Cost breakdown by operation
  operationBreakdown: {
    [K in UsageOperation]?: {
      count: number;
      cost: number;
    }
  };
}
