/**
 * AIProviderInfo - Tracks which AI provider and model generated a response
 *
 * This interface is used to capture provider metadata when making AI API calls
 * and is stored alongside chat messages for auditing and analytics purposes.
 */
export interface AIProviderInfo {
  /** Provider identifier: 'openai' | 'google' | 'anthropic' | 'ollama' */
  providerId: string;

  /** Provider type for categorization */
  providerType: 'cloud' | 'local' | 'custom';

  /** Model identifier (e.g., 'gpt-4o', 'gpt-4o-mini', 'gemini-2.5-flash') */
  model: string;

  /** Whether a fallback provider was used due to primary failure */
  usedFallback: boolean;

  /** Number of input tokens consumed */
  inputTokens: number;

  /** Number of output tokens generated */
  outputTokens: number;

  /** Response latency in milliseconds */
  latencyMs: number;

  /** Estimated cost in USD based on provider pricing */
  estimatedCostUSD: number;

  /** Optional link to promptExecutions collection for full audit trail */
  promptExecutionId?: string;
}

/**
 * Creates an AIProviderInfo object with default values
 */
export function createDefaultProviderInfo(
  providerId: string = 'openai',
  model: string = 'gpt-4o'
): AIProviderInfo {
  return {
    providerId,
    providerType: providerId === 'ollama' ? 'local' : 'cloud',
    model,
    usedFallback: false,
    inputTokens: 0,
    outputTokens: 0,
    latencyMs: 0,
    estimatedCostUSD: 0,
  };
}

/**
 * Estimates cost based on provider and model
 * Pricing as of 2025 (approximate):
 * - gpt-4o: $0.0025 input, $0.01 output per 1K tokens
 * - gpt-4o-mini: $0.00015 input, $0.0006 output per 1K tokens
 * - gemini-2.5-flash: $0.000075 input, $0.0003 output per 1K tokens (preview)
 */
export function estimateCost(
  providerId: string,
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-4o': { input: 0.0025, output: 0.01 },
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
    'gemini-2.5-flash': { input: 0.000075, output: 0.0003 },
    'gemini-2.5-pro': { input: 0.00125, output: 0.005 },
    'claude-3-5-sonnet': { input: 0.003, output: 0.015 },
    'claude-3-haiku': { input: 0.00025, output: 0.00125 },
  };

  const rates = pricing[model] || pricing['gpt-4o-mini']; // Default to cheapest
  return (inputTokens / 1000) * rates.input + (outputTokens / 1000) * rates.output;
}
