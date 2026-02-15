/**
 * MemoryBuilderConfig.ts
 *
 * Configuration interface for the Enhanced Memory System with Vocabulary Integration
 * Stored in Firestore at config/memoryBuilderSettings
 *
 * Features:
 * - Extended entity type toggles (9 types)
 * - Confidence thresholds per entity type
 * - Model selection for extraction
 * - Search weights for RAG relevance boosting
 * - Vocabulary integration settings
 */

// ============================================================================
// Entity Type Configuration
// ============================================================================

/**
 * All 9 entity types supported by the enhanced extraction system
 */
export type ExtractedEntityType =
  | 'person'
  | 'place'
  | 'topic'
  | 'event'
  | 'organization'
  | 'activity'
  | 'emotion'
  | 'time_reference'
  | 'custom_term';

export const ENTITY_TYPES: ExtractedEntityType[] = [
  'person',
  'place',
  'topic',
  'event',
  'organization',
  'activity',
  'emotion',
  'time_reference',
  'custom_term',
];

/**
 * Entity type metadata for display
 */
export const ENTITY_TYPE_METADATA: Record<ExtractedEntityType, {
  displayName: string;
  description: string;
  icon: string;
  color: string;
  examples: string[];
}> = {
  person: {
    displayName: 'Person',
    description: 'Names of people mentioned',
    icon: '👤',
    color: '#4F46E5',
    examples: ['John', 'Sarah', 'Mom', 'Dr. Smith'],
  },
  place: {
    displayName: 'Place',
    description: 'Locations and venues',
    icon: '📍',
    color: '#10B981',
    examples: ['SF Badminton Club', 'Home', 'Tokyo'],
  },
  topic: {
    displayName: 'Topic',
    description: 'Discussion topics',
    icon: '💬',
    color: '#3B82F6',
    examples: ['work', 'health', 'finances'],
  },
  event: {
    displayName: 'Event',
    description: 'Events and occasions',
    icon: '📅',
    color: '#F59E0B',
    examples: ['birthday', 'meeting', 'wedding'],
  },
  organization: {
    displayName: 'Organization',
    description: 'Companies and groups',
    icon: '🏢',
    color: '#6366F1',
    examples: ['Apple', 'gym name', 'school'],
  },
  activity: {
    displayName: 'Activity',
    description: 'Actions and activities',
    icon: '🏃',
    color: '#EC4899',
    examples: ['badminton', 'dinner', 'running'],
  },
  emotion: {
    displayName: 'Emotion',
    description: 'Feelings and emotions',
    icon: '😊',
    color: '#EF4444',
    examples: ['happy', 'stressed', 'excited'],
  },
  time_reference: {
    displayName: 'Time Reference',
    description: 'Time markers',
    icon: '⏰',
    color: '#8B5CF6',
    examples: ['morning', 'anniversary', 'weekend'],
  },
  custom_term: {
    displayName: 'Custom Term',
    description: 'User vocabulary matches',
    icon: '✨',
    color: '#14B8A6',
    examples: ['SF (San Francisco)', 'API'],
  },
};

/**
 * Configuration for a single entity type
 */
export interface EntityTypeConfig {
  enabled: boolean;
  confidenceThreshold: number;  // 0-1, minimum confidence to include
  searchWeight: number;         // Weight for RAG relevance (1.0 = normal)
  autoLearnVocabulary: boolean; // Add to vocabulary if confidence > threshold
}

// ============================================================================
// Extraction Configuration
// ============================================================================

/**
 * AI model options for entity extraction
 */
export type ExtractionModel = 'gpt-4o-mini' | 'gpt-4o' | 'claude-3-haiku';

/**
 * Extraction settings configuration
 */
export interface ExtractionConfig {
  model: ExtractionModel;
  temperature: number;        // 0-1
  maxTokens: number;
  enableSentiment: boolean;   // Include sentiment analysis
  enableBatchProcessing: boolean;
  batchSize: number;
  retryAttempts: number;
}

// ============================================================================
// Vocabulary Integration Configuration
// ============================================================================

/**
 * Vocabulary integration settings
 */
export interface VocabularyIntegrationConfig {
  // Auto-learning settings
  autoLearnEnabled: boolean;
  autoLearnConfidenceThreshold: number;  // Min confidence to auto-learn (default: 0.8)
  maxAutoLearnPerDay: number;            // Prevent spam

  // Cross-reference settings
  crossReferenceEnabled: boolean;        // Match entities against vocabulary
  boostMatchedEntities: boolean;         // Increase confidence for matches
  boostAmount: number;                   // How much to boost (0-0.5)

  // Category mapping (entity type -> vocabulary category)
  categoryMapping: Record<ExtractedEntityType, string>;

  // Suggestion settings
  suggestionsEnabled: boolean;
  maxSuggestionsPerMemory: number;
}

// ============================================================================
// Analytics Configuration
// ============================================================================

/**
 * Analytics tracking settings
 */
export interface AnalyticsConfig {
  trackExtractionMetrics: boolean;
  trackVocabularyUsage: boolean;
  trackSearchPerformance: boolean;
  retentionDays: number;
}

// ============================================================================
// Main Configuration Interface
// ============================================================================

/**
 * Complete Memory Builder configuration
 * Stored in Firestore at config/memoryBuilderSettings
 */
export interface MemoryBuilderConfig {
  version: string;
  lastUpdatedAt: string;
  lastUpdatedBy: string;

  // Global toggle
  enabled: boolean;

  // Entity type configurations
  entityTypes: Record<ExtractedEntityType, EntityTypeConfig>;

  // Extraction settings
  extraction: ExtractionConfig;

  // Vocabulary integration
  vocabularyIntegration: VocabularyIntegrationConfig;

  // Analytics
  analytics: AnalyticsConfig;

  // Language settings
  defaultLanguage: string;
  supportedLanguages: string[];
}

// ============================================================================
// Default Configuration
// ============================================================================

/**
 * Default entity type configuration
 */
export const DEFAULT_ENTITY_TYPE_CONFIG: EntityTypeConfig = {
  enabled: true,
  confidenceThreshold: 0.6,
  searchWeight: 1.0,
  autoLearnVocabulary: true,
};

/**
 * Default extraction configuration
 */
export const DEFAULT_EXTRACTION_CONFIG: ExtractionConfig = {
  model: 'gpt-4o-mini',
  temperature: 0.3,
  maxTokens: 800,
  enableSentiment: true,
  enableBatchProcessing: true,
  batchSize: 5,
  retryAttempts: 2,
};

/**
 * Default vocabulary integration configuration
 */
export const DEFAULT_VOCABULARY_INTEGRATION_CONFIG: VocabularyIntegrationConfig = {
  autoLearnEnabled: true,
  autoLearnConfidenceThreshold: 0.8,
  maxAutoLearnPerDay: 20,
  crossReferenceEnabled: true,
  boostMatchedEntities: true,
  boostAmount: 0.15,
  categoryMapping: {
    person: 'person_name',
    place: 'place_name',
    topic: 'custom',
    event: 'custom',
    organization: 'organization',
    activity: 'activity_type',
    emotion: 'custom',
    time_reference: 'custom',
    custom_term: 'domain_specific',
  },
  suggestionsEnabled: true,
  maxSuggestionsPerMemory: 5,
};

/**
 * Default analytics configuration
 */
export const DEFAULT_ANALYTICS_CONFIG: AnalyticsConfig = {
  trackExtractionMetrics: true,
  trackVocabularyUsage: true,
  trackSearchPerformance: true,
  retentionDays: 90,
};

/**
 * Complete default Memory Builder configuration
 */
export const DEFAULT_MEMORY_BUILDER_CONFIG: MemoryBuilderConfig = {
  version: '1.0.0',
  lastUpdatedAt: new Date().toISOString(),
  lastUpdatedBy: 'system',

  enabled: true,

  entityTypes: {
    person: { ...DEFAULT_ENTITY_TYPE_CONFIG, confidenceThreshold: 0.7, searchWeight: 1.2 },
    place: { ...DEFAULT_ENTITY_TYPE_CONFIG, confidenceThreshold: 0.7, searchWeight: 1.2 },
    topic: { ...DEFAULT_ENTITY_TYPE_CONFIG, confidenceThreshold: 0.6 },
    event: { ...DEFAULT_ENTITY_TYPE_CONFIG, confidenceThreshold: 0.7 },
    organization: { ...DEFAULT_ENTITY_TYPE_CONFIG, confidenceThreshold: 0.7 },
    activity: { ...DEFAULT_ENTITY_TYPE_CONFIG, confidenceThreshold: 0.7, searchWeight: 1.3 },
    emotion: { ...DEFAULT_ENTITY_TYPE_CONFIG, confidenceThreshold: 0.6, autoLearnVocabulary: false },
    time_reference: { ...DEFAULT_ENTITY_TYPE_CONFIG, confidenceThreshold: 0.5, autoLearnVocabulary: false },
    custom_term: { ...DEFAULT_ENTITY_TYPE_CONFIG, confidenceThreshold: 0.8 },
  },

  extraction: DEFAULT_EXTRACTION_CONFIG,
  vocabularyIntegration: DEFAULT_VOCABULARY_INTEGRATION_CONFIG,
  analytics: DEFAULT_ANALYTICS_CONFIG,

  defaultLanguage: 'en',
  supportedLanguages: ['en', 'zh', 'ja', 'ko', 'es', 'fr', 'de', 'it', 'pt'],
};

// ============================================================================
// Analytics Types
// ============================================================================

/**
 * Entity extraction analytics
 */
export interface ExtractionAnalytics {
  totalExtractions: number;
  successRate: number;
  avgEntitiesPerMemory: number;
  avgConfidence: number;
  byEntityType: Record<ExtractedEntityType, {
    count: number;
    avgConfidence: number;
  }>;
  byModel: Record<ExtractionModel, {
    count: number;
    avgLatencyMs: number;
    successRate: number;
  }>;
  last24h: {
    extractions: number;
    entities: number;
    vocabLearned: number;
  };
  last7d: {
    extractions: number;
    entities: number;
    vocabLearned: number;
  };
}

/**
 * Vocabulary integration analytics
 */
export interface VocabularyIntegrationAnalytics {
  totalAutoLearned: number;
  totalManual: number;
  matchRate: number;         // How often entities match vocabulary
  avgBoostApplied: number;
  byCategory: Record<string, number>;
  recentSuggestions: Array<{
    term: string;
    category: string;
    confidence: number;
    timestamp: string;
  }>;
}
