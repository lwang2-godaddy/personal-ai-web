/**
 * AI Provider Configuration Models
 *
 * TypeScript interfaces for the multi-provider AI architecture.
 * Used by both the web admin portal and the mobile app.
 *
 * @module models/AIProviderConfig
 */

// =============================================================================
// Service & Provider Types
// =============================================================================

/**
 * Types of AI services available
 */
export type ServiceType = 'chat' | 'embedding' | 'tts' | 'stt' | 'vision';

/**
 * Types of AI providers
 */
export type ProviderType = 'cloud' | 'local' | 'custom';

/**
 * All service types for iteration
 */
export const ALL_SERVICE_TYPES: ServiceType[] = ['chat', 'embedding', 'tts', 'stt', 'vision'];

// =============================================================================
// Provider Models
// =============================================================================

/**
 * Registered provider configuration
 */
export interface RegisteredProvider {
  /** Provider identifier */
  id: string;
  /** Provider type */
  type: ProviderType;
  /** Display name */
  name: string;
  /** Whether provider is enabled */
  enabled: boolean;
  /** Base URL for local/custom providers */
  baseUrl?: string;
  /** Environment variable name for API key */
  apiKeyEnvVar?: string;
  /** Services this provider supports */
  supportedServices: ServiceType[];
}

/**
 * Service configuration (which provider to use for each service)
 */
export interface ServiceConfig {
  /** Primary provider ID */
  providerId: string;
  /** Model to use */
  model: string;
  /** Fallback provider ID (used if primary unavailable) */
  fallbackProviderId?: string;
  /** Fallback model */
  fallbackModel?: string;
  /** Custom options for this service */
  options?: Record<string, unknown>;
}

/**
 * Complete AI provider configuration
 * Stored in Firestore at /config/aiProviders
 */
export interface AIProviderConfig {
  /** Config version for migrations */
  version: number;
  /** Last update timestamp (ISO 8601) */
  lastUpdated: string;
  /** UID of user who last updated */
  updatedBy: string;
  /** Registered providers */
  registeredProviders: RegisteredProvider[];
  /** Service configurations */
  services: Record<ServiceType, ServiceConfig>;
}

// =============================================================================
// Provider Status
// =============================================================================

/**
 * Provider availability status
 */
export interface ProviderStatus {
  id: string;
  name: string;
  type: ProviderType;
  enabled: boolean;
  available: boolean;
  services: ServiceType[];
  lastChecked?: string;
}

// =============================================================================
// Pricing Models
// =============================================================================

/**
 * Model pricing information
 */
export interface ModelPricing {
  /** Input price per 1M tokens */
  inputPer1M: number;
  /** Output price per 1M tokens */
  outputPer1M: number;
  /** Whether model is enabled */
  enabled: boolean;
}

/**
 * Free tier limits for a provider
 */
export interface FreeTierLimits {
  tts?: { chars: number; resetsAt: 'monthly' | 'daily' };
  stt?: { minutes: number; resetsAt: 'monthly' | 'daily' };
  chat?: { tokens: number; resetsAt: 'monthly' | 'daily' };
  embedding?: { chars: number; resetsAt: 'monthly' | 'daily' };
}

/**
 * Provider pricing configuration
 */
export interface ProviderPricing {
  /** Model-specific pricing */
  models: Record<string, ModelPricing>;
  /** Free tier limits (if any) */
  freeTier?: FreeTierLimits;
}

/**
 * Complete pricing configuration
 * Stored in Firestore at /config/pricing
 */
export interface PricingConfig {
  version: number;
  enableDynamicConfig: boolean;
  lastUpdated: string;
  providers: Record<string, ProviderPricing>;
}

// =============================================================================
// Usage Tracking Extensions
// =============================================================================

/**
 * Extended prompt execution params with provider info
 */
export interface PromptExecutionWithProvider {
  // Existing fields
  service: string;
  promptId: string;
  model: string;
  language?: string;
  promptVersion?: string;
  temperature?: number;
  maxTokens?: number;
  inputText?: string;
  outputText?: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUSD: number;
  latencyMs: number;
  success: boolean;
  errorMessage?: string;
  sourceType?: string;
  executedAt: string;
  userId?: string;

  // New provider fields
  providerId: string;
  providerType: ProviderType;
}

// =============================================================================
// Admin UI Types
// =============================================================================

/**
 * Provider breakdown for usage analytics
 */
export interface ProviderBreakdown {
  providerId: string;
  providerName: string;
  calls: number;
  cost: number;
  tokens: number;
  avgLatencyMs: number;
}

/**
 * Service breakdown with provider info
 */
export interface ServiceBreakdownWithProvider {
  service: ServiceType;
  byProvider: ProviderBreakdown[];
  totalCalls: number;
  totalCost: number;
}

// =============================================================================
// Default Configuration
// =============================================================================

/**
 * Default AI provider configuration
 */
export const DEFAULT_AI_PROVIDER_CONFIG: AIProviderConfig = {
  version: 1,
  lastUpdated: new Date().toISOString(),
  updatedBy: 'system',
  registeredProviders: [
    {
      id: 'openai',
      type: 'cloud',
      name: 'OpenAI',
      enabled: true,
      apiKeyEnvVar: 'OPENAI_API_KEY',
      supportedServices: ['chat', 'embedding', 'tts', 'stt', 'vision'],
    },
    {
      id: 'google',
      type: 'cloud',
      name: 'Google Cloud',
      enabled: true,
      apiKeyEnvVar: 'GOOGLE_CLOUD_API_KEY',
      supportedServices: ['chat', 'embedding', 'tts', 'stt', 'vision'],
    },
    {
      id: 'anthropic',
      type: 'cloud',
      name: 'Anthropic',
      enabled: false,
      apiKeyEnvVar: 'ANTHROPIC_API_KEY',
      supportedServices: ['chat', 'vision'],
    },
    {
      id: 'ollama',
      type: 'local',
      name: 'Ollama (Local)',
      enabled: false,
      baseUrl: 'http://localhost:11434',
      supportedServices: ['chat', 'embedding', 'vision'],
    },
    {
      id: 'custom',
      type: 'custom',
      name: 'Custom Endpoint',
      enabled: false,
      baseUrl: '',
      supportedServices: ['chat'],
    },
  ],
  services: {
    chat: {
      providerId: 'openai',
      model: 'gpt-4o',
      fallbackProviderId: 'google',
      fallbackModel: 'gemini-2.5-flash',
    },
    embedding: {
      providerId: 'openai',
      model: 'text-embedding-3-small',
    },
    tts: {
      providerId: 'openai',
      model: 'tts-1',
      fallbackProviderId: 'google',
      fallbackModel: 'en-US-Neural2-C',
    },
    stt: {
      providerId: 'openai',
      model: 'whisper-1',
      fallbackProviderId: 'google',
      fallbackModel: 'chirp_2',
    },
    vision: {
      providerId: 'openai',
      model: 'gpt-4o',
      fallbackProviderId: 'google',
      fallbackModel: 'gemini-2.5-flash',
    },
  },
};

/**
 * Default pricing configuration
 */
export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  version: 1,
  enableDynamicConfig: true,
  lastUpdated: new Date().toISOString(),
  providers: {
    openai: {
      models: {
        'gpt-4o': { inputPer1M: 2.50, outputPer1M: 10.00, enabled: true },
        'gpt-4o-mini': { inputPer1M: 0.15, outputPer1M: 0.60, enabled: true },
        'text-embedding-3-small': { inputPer1M: 0.02, outputPer1M: 0, enabled: true },
        'whisper-1': { inputPer1M: 6.00, outputPer1M: 0, enabled: true },
        'tts-1': { inputPer1M: 15.00, outputPer1M: 0, enabled: true },
      },
    },
    google: {
      models: {
        'gemini-2.5-flash': { inputPer1M: 0.075, outputPer1M: 0.30, enabled: true },
        'gemini-2.5-pro': { inputPer1M: 1.25, outputPer1M: 5.00, enabled: true },
        'text-embedding-004': { inputPer1M: 0.00025, outputPer1M: 0, enabled: true },
        'chirp_2': { inputPer1M: 0.016, outputPer1M: 0, enabled: true },
        'neural2': { inputPer1M: 16.00, outputPer1M: 0, enabled: true },
      },
      freeTier: {
        tts: { chars: 1000000, resetsAt: 'monthly' },
        stt: { minutes: 60, resetsAt: 'monthly' },
      },
    },
    anthropic: {
      models: {
        'claude-3.5-sonnet': { inputPer1M: 3.00, outputPer1M: 15.00, enabled: true },
        'claude-3-haiku': { inputPer1M: 0.25, outputPer1M: 1.25, enabled: true },
      },
    },
    ollama: {
      models: {
        '*': { inputPer1M: 0, outputPer1M: 0, enabled: true },
      },
    },
  },
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get display name for a service type
 */
export function getAIServiceDisplayName(service: ServiceType): string {
  const names: Record<ServiceType, string> = {
    chat: 'Chat Completion',
    embedding: 'Embeddings',
    tts: 'Text-to-Speech',
    stt: 'Speech-to-Text',
    vision: 'Vision/Image',
  };
  return names[service] || service;
}

/**
 * Get icon for a service type
 */
export function getServiceIcon(service: ServiceType): string {
  const icons: Record<ServiceType, string> = {
    chat: '💬',
    embedding: '📊',
    tts: '🔊',
    stt: '🎤',
    vision: '👁️',
  };
  return icons[service] || '🤖';
}

/**
 * Get provider type label
 */
export function getProviderTypeLabel(type: ProviderType): string {
  const labels: Record<ProviderType, string> = {
    cloud: 'Cloud',
    local: 'Local',
    custom: 'Custom',
  };
  return labels[type] || type;
}

/**
 * Get provider type color (Tailwind class)
 */
export function getProviderTypeColor(type: ProviderType): string {
  const colors: Record<ProviderType, string> = {
    cloud: 'text-blue-600 bg-blue-100',
    local: 'text-green-600 bg-green-100',
    custom: 'text-purple-600 bg-purple-100',
  };
  return colors[type] || 'text-gray-600 bg-gray-100';
}
