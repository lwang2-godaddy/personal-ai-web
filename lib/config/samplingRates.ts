/**
 * Sampling rates per service - MUST match PromptExecutionTracker.ts in Cloud Functions
 *
 * These rates are used to calculate actual costs from sampled data:
 * actualCost = loggedCost * samplingRate
 *
 * Example: If EmbeddingService has samplingRate=100, and we logged $0.01,
 * the actual cost is $0.01 * 100 = $1.00
 *
 * Keep in sync with: PersonalAIApp/firebase/functions/src/services/tracking/PromptExecutionTracker.ts
 */
export const SAMPLING_RATES: Record<string, number> = {
  // EmbeddingService: sample 1 in 100 (low cost, high volume)
  EmbeddingService: 100,
  // All other services: log 100% of calls
  default: 1,
};

/**
 * Get the sampling rate for a service
 * Uses the rate stored in the document if available, otherwise falls back to config
 */
export function getSamplingRate(service: string, docSamplingRate?: number): number {
  // If the document has a samplingRate, use it (more accurate)
  if (docSamplingRate && docSamplingRate > 1) {
    return docSamplingRate;
  }
  // Otherwise use the configured rate
  return SAMPLING_RATES[service] || SAMPLING_RATES.default;
}
