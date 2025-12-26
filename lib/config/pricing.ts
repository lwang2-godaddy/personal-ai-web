/**
 * API Pricing Configuration
 * Pricing as of December 2024
 * Source: OpenAI and Pinecone official pricing pages
 */

/**
 * OpenAI API Pricing
 * All prices in USD
 */
export const OPENAI_PRICING = {
  /**
   * Text Embedding (text-embedding-3-small)
   * Dimensions: 1024 (our configuration)
   */
  'text-embedding-3-small': {
    inputTokensPer1M: 0.02,      // $0.02 per 1M tokens
  },

  /**
   * GPT-4o (Chat Completions, Vision)
   */
  'gpt-4o': {
    inputTokensPer1M: 5.00,      // $5.00 per 1M input tokens
    outputTokensPer1M: 15.00,    // $15.00 per 1M output tokens
    imageTokensBase: 85,         // Base tokens for image (low detail)
    imageTokensHigh: 170,        // Base tokens for high detail
  },

  /**
   * Whisper (Audio Transcription)
   */
  'whisper-1': {
    perMinute: 0.006,            // $0.006 per minute of audio
  },

  /**
   * Text-to-Speech (TTS)
   */
  'tts-1': {
    per1MChars: 15.00,           // $15.00 per 1M characters
  },
} as const;

/**
 * Pinecone Pricing (Serverless - Pay-as-you-go)
 * All prices in USD
 */
export const PINECONE_PRICING = {
  /**
   * Vector Queries (Read operations)
   */
  query: {
    per1MOperations: 0.40,       // $0.40 per 1M read units (queries)
  },

  /**
   * Vector Upserts (Write operations)
   */
  upsert: {
    per1MOperations: 2.00,       // $2.00 per 1M write units (upserts)
  },

  /**
   * Vector Deletes (Write operations)
   */
  delete: {
    per1MOperations: 2.00,       // $2.00 per 1M write units (deletes)
  },

  /**
   * Storage (not tracked in real-time)
   */
  storage: {
    perGBMonth: 0.25,            // $0.25 per GB-month
  },
} as const;

/**
 * Default usage limits per user
 * Applied to users without custom limits
 */
export const DEFAULT_LIMITS = {
  maxTokensPerDay: 100000,       // 100K tokens per day
  maxApiCallsPerDay: 1000,       // 1000 API calls per day
  maxCostPerMonth: 50.00,        // $50/month spending cap
} as const;

/**
 * Subscription tier limits
 * Different limits for different subscription tiers
 */
export const TIER_LIMITS = {
  free: {
    maxTokensPerDay: 10000,      // 10K tokens per day
    maxApiCallsPerDay: 100,      // 100 API calls per day
    maxCostPerMonth: 5.00,       // $5/month
  },
  premium: {
    maxTokensPerDay: 100000,     // 100K tokens per day
    maxApiCallsPerDay: 1000,     // 1000 API calls per day
    maxCostPerMonth: 50.00,      // $50/month
  },
  pro: {
    maxTokensPerDay: 500000,     // 500K tokens per day
    maxApiCallsPerDay: 5000,     // 5000 API calls per day
    maxCostPerMonth: 200.00,     // $200/month
  },
} as const;

/**
 * Helper function to calculate OpenAI embedding cost
 */
export function calculateEmbeddingCost(tokens: number): number {
  return (tokens / 1_000_000) * OPENAI_PRICING['text-embedding-3-small'].inputTokensPer1M;
}

/**
 * Helper function to calculate GPT-4o chat cost
 */
export function calculateChatCost(promptTokens: number, completionTokens: number): number {
  const inputCost = (promptTokens / 1_000_000) * OPENAI_PRICING['gpt-4o'].inputTokensPer1M;
  const outputCost = (completionTokens / 1_000_000) * OPENAI_PRICING['gpt-4o'].outputTokensPer1M;
  return inputCost + outputCost;
}

/**
 * Helper function to calculate Whisper transcription cost
 */
export function calculateTranscriptionCost(durationSeconds: number): number {
  const minutes = durationSeconds / 60;
  return minutes * OPENAI_PRICING['whisper-1'].perMinute;
}

/**
 * Helper function to calculate TTS cost
 */
export function calculateTTSCost(characters: number): number {
  return (characters / 1_000_000) * OPENAI_PRICING['tts-1'].per1MChars;
}

/**
 * Helper function to calculate Pinecone query cost
 */
export function calculatePineconeQueryCost(vectorCount: number): number {
  return (vectorCount / 1_000_000) * PINECONE_PRICING.query.per1MOperations;
}

/**
 * Helper function to calculate Pinecone upsert cost
 */
export function calculatePineconeUpsertCost(vectorCount: number): number {
  return (vectorCount / 1_000_000) * PINECONE_PRICING.upsert.per1MOperations;
}

/**
 * Helper function to calculate Pinecone delete cost
 */
export function calculatePineconeDeleteCost(vectorCount: number): number {
  return (vectorCount / 1_000_000) * PINECONE_PRICING.delete.per1MOperations;
}
