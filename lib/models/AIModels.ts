/**
 * AIModels.ts
 *
 * Data models for AI model configuration
 * Used by admin portal to configure which OpenAI models are used for different services
 */

/**
 * Available OpenAI model IDs
 */
export type OpenAIModelId =
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'gpt-4'
  | 'gpt-4-turbo'
  | 'gpt-3.5-turbo';

/**
 * Model configuration for display in admin UI
 */
export interface ModelInfo {
  enabled: boolean;
  displayName: string;
  costPer1MInput?: number;  // Cost per 1M input tokens in USD
  costPer1MOutput?: number; // Cost per 1M output tokens in USD
}

/**
 * Service model configuration
 */
export interface ServiceModelConfig {
  default: OpenAIModelId;
  tierOverrides?: {
    free?: OpenAIModelId;
    premium?: OpenAIModelId;
    pro?: OpenAIModelId;
  };
}

/**
 * Main AI models config document stored at /config/aiModels
 */
export interface AIModelsConfig {
  version: number;
  lastUpdated: string; // ISO timestamp
  updatedBy: string; // Admin UID
  enableDynamicConfig: boolean; // Kill switch to revert to hardcoded defaults
  changeNotes?: string;

  services: {
    queryRAG: ServiceModelConfig;
    queryRAGSimple: ServiceModelConfig;
    queryCircleRAG: ServiceModelConfig;
    photoDescription: ServiceModelConfig;
    dailySummary: ServiceModelConfig;
    sentimentAnalysis: ServiceModelConfig;
    entityExtraction: ServiceModelConfig;
    eventExtraction: ServiceModelConfig;
    memoryGeneration: ServiceModelConfig;
    lifeFeed: ServiceModelConfig;
  };

  availableModels: {
    [modelId: string]: ModelInfo;
  };
}

/**
 * Version history document stored at /aiModelsVersions/{versionId}
 */
export interface AIModelsConfigVersion {
  id: string;
  version: number;
  config: AIModelsConfig;
  changedBy: string; // Admin UID
  changedByEmail?: string;
  changedAt: string; // ISO timestamp
  changeNotes?: string;
  previousVersion?: number;
}

// ============================================================================
// SERVICE METADATA
// ============================================================================

/**
 * Service names and their descriptions for display in the admin UI
 */
export const SERVICE_METADATA: Record<keyof AIModelsConfig['services'], { name: string; description: string; note?: string }> = {
  queryRAG: {
    name: 'Chat (RAG Query)',
    description: 'Main chat queries that use RAG context (complex questions)',
  },
  queryRAGSimple: {
    name: 'Simple Chat',
    description: 'Simple follow-up questions without full RAG search',
  },
  queryCircleRAG: {
    name: 'Circle Chat',
    description: 'Circle/group chat queries with shared data',
  },
  photoDescription: {
    name: 'Photo Description',
    description: 'Generates descriptions for uploaded photos (Vision API)',
    note: 'Configured via Prompts page - runs on mobile app',
  },
  dailySummary: {
    name: 'Daily Summary',
    description: 'Generates daily and weekly activity summaries',
  },
  sentimentAnalysis: {
    name: 'Sentiment Analysis',
    description: 'Analyzes mood and sentiment in user content',
  },
  entityExtraction: {
    name: 'Entity Extraction',
    description: 'Extracts people, places, and things from content',
  },
  eventExtraction: {
    name: 'Event Extraction',
    description: 'Extracts dates and events from content',
  },
  memoryGeneration: {
    name: 'Memory Generation',
    description: 'Generates memory titles and summaries',
  },
  lifeFeed: {
    name: 'Life Feed',
    description: 'Generates life feed posts and updates',
  },
};

// ============================================================================
// DEFAULT VALUES
// ============================================================================

/**
 * Default available models with pricing info (as of Jan 2025)
 */
export const DEFAULT_AVAILABLE_MODELS: AIModelsConfig['availableModels'] = {
  'gpt-4o': {
    enabled: true,
    displayName: 'GPT-4o (Recommended)',
    costPer1MInput: 2.5,
    costPer1MOutput: 10,
  },
  'gpt-4o-mini': {
    enabled: true,
    displayName: 'GPT-4o Mini (Cost-effective)',
    costPer1MInput: 0.15,
    costPer1MOutput: 0.6,
  },
  'gpt-4': {
    enabled: true,
    displayName: 'GPT-4 (Legacy - Expensive)',
    costPer1MInput: 30,
    costPer1MOutput: 60,
  },
  'gpt-4-turbo': {
    enabled: true,
    displayName: 'GPT-4 Turbo',
    costPer1MInput: 10,
    costPer1MOutput: 30,
  },
  'gpt-3.5-turbo': {
    enabled: false, // Disabled by default - too low quality
    displayName: 'GPT-3.5 Turbo (Not Recommended)',
    costPer1MInput: 0.5,
    costPer1MOutput: 1.5,
  },
};

/**
 * Default service model assignments
 * Uses gpt-4o as the default for most services (12x cheaper than gpt-4)
 */
export const DEFAULT_SERVICE_MODELS: AIModelsConfig['services'] = {
  queryRAG: { default: 'gpt-4o' },
  queryRAGSimple: { default: 'gpt-4o-mini' },
  queryCircleRAG: { default: 'gpt-4o' },
  photoDescription: { default: 'gpt-4o' }, // Vision API - configured via Prompts
  dailySummary: { default: 'gpt-4o-mini' },
  sentimentAnalysis: { default: 'gpt-4o-mini' },
  entityExtraction: { default: 'gpt-4o-mini' },
  eventExtraction: { default: 'gpt-4o-mini' },
  memoryGeneration: { default: 'gpt-4o-mini' },
  lifeFeed: { default: 'gpt-4o-mini' },
};

/**
 * Get default AI models config from hardcoded values
 * Used to initialize Firestore config or as fallback
 */
export function getDefaultAIModelsConfig(): Omit<AIModelsConfig, 'version' | 'lastUpdated' | 'updatedBy'> {
  return {
    enableDynamicConfig: true,
    services: DEFAULT_SERVICE_MODELS,
    availableModels: DEFAULT_AVAILABLE_MODELS,
  };
}

/**
 * Get list of enabled model IDs
 */
export function getEnabledModelIds(config: AIModelsConfig): OpenAIModelId[] {
  return Object.entries(config.availableModels)
    .filter(([_, info]) => info.enabled)
    .map(([id]) => id as OpenAIModelId);
}

/**
 * Format cost for display (e.g., "$2.50 / $10.00")
 */
export function formatModelCost(model: ModelInfo): string {
  if (model.costPer1MInput === undefined || model.costPer1MOutput === undefined) {
    return 'N/A';
  }
  return `$${model.costPer1MInput.toFixed(2)} / $${model.costPer1MOutput.toFixed(2)}`;
}
