/**
 * Prompt.ts
 *
 * TypeScript interfaces for the dynamic prompt management system
 * Used by the admin panel to manage AI prompts stored in Firestore
 */

/**
 * Firestore-stored prompt configuration
 * Path: promptConfigs/{language}/services/{serviceName}
 */
export interface FirestorePromptConfig {
  // Core config (matches YAML structure)
  version: string;
  language: string;
  service: string;
  lastUpdated: string; // ISO 8601 timestamp

  // Firestore-specific audit fields
  updatedBy: string;        // Admin UID who made the change
  updateNotes?: string;     // Description of change
  createdAt: string;        // ISO 8601 timestamp
  createdBy: string;        // Admin UID who created

  // Publishing control
  status: 'draft' | 'published' | 'archived';
  publishedAt?: string;     // ISO 8601 timestamp when went live
  enabled: boolean;         // Kill switch - if false, falls back to YAML

  // Prompts map
  prompts: Record<string, PromptDefinition>;
}

/**
 * Individual prompt definition
 */
export interface PromptDefinition {
  id: string;
  service: string;
  type: 'system' | 'user' | 'function';
  content: string;
  description?: string;
  culturalNotes?: string;   // Language-specific considerations for translators
  variables?: PromptVariable[];
  variants?: PromptVariant[];
  metadata?: PromptMetadata;
}

/**
 * Prompt metadata for AI model configuration
 */
export interface PromptMetadata {
  model?: string;           // e.g., 'gpt-4o-mini', 'gpt-4o'
  temperature?: number;     // 0.0 - 2.0
  maxTokens?: number;       // Max response tokens
  responseFormat?: 'text' | 'json_object';
  languageHints?: string[]; // Language-specific generation hints
}

/**
 * Variable definition for Handlebars templates
 */
export interface PromptVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description: string;
  localized?: boolean;      // Whether this variable needs translation
  example?: unknown;
}

/**
 * Variant for conditional prompt content
 */
export interface PromptVariant {
  id: string;
  condition?: string;       // e.g., "sourceType === 'voice'"
  content: string;
  metadata?: Record<string, unknown>;
}

/**
 * Version history record for audit trail
 * Path: promptVersions/{versionId}
 */
export interface PromptVersion {
  id: string;
  language: string;
  service: string;
  promptId: string;         // The specific prompt that was changed
  previousContent: string;  // Content before change
  newContent: string;       // Content after change
  changedAt: string;        // ISO 8601 timestamp
  changedBy: string;        // Admin UID
  changeNotes?: string;     // Description of change
  changeType: 'create' | 'update' | 'delete' | 'publish' | 'unpublish';
}

/**
 * Service mapping for the prompt system
 */
export const SERVICE_FILE_MAP: Record<string, string> = {
  // Cloud Functions services
  SentimentAnalysisService: 'analysis.yaml',
  EntityExtractionService: 'analysis.yaml',
  EventExtractionService: 'events.yaml',
  MemoryGeneratorService: 'memory.yaml',
  SuggestionEngine: 'suggestions.yaml',
  LifeFeedGenerator: 'lifeFeed.yaml',
  // Mobile app / Server services
  OpenAIService: 'chat.yaml',
  RAGEngine: 'rag.yaml',
  QueryRAGServer: 'rag.yaml',
};

/**
 * Supported languages
 */
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', status: 'complete' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', status: 'complete' },
  { code: 'fr', name: 'French', nativeName: 'Français', status: 'pending' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', status: 'pending' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', status: 'pending' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', status: 'pending' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', status: 'pending' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', status: 'pending' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', status: 'pending' },
] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];

/**
 * Services that use the prompt system
 */
export const PROMPT_SERVICES = [
  // Cloud Function services (server-side)
  { id: 'SentimentAnalysisService', name: 'Sentiment Analysis', description: 'Analyzes emotional tone of user input' },
  { id: 'EntityExtractionService', name: 'Entity Extraction', description: 'Extracts entities from user input' },
  { id: 'EventExtractionService', name: 'Event Extraction', description: 'Extracts events and dates from text' },
  { id: 'MemoryGeneratorService', name: 'Memory Generator', description: 'Generates titles and summaries for memories' },
  { id: 'SuggestionEngine', name: 'Suggestion Engine', description: 'Generates proactive suggestions' },
  { id: 'LifeFeedGenerator', name: 'Life Feed', description: 'Generates social media style posts' },
  // Mobile app services (client-side)
  { id: 'OpenAIService', name: 'OpenAI Chat', description: 'General chat completion and image description' },
  { id: 'RAGEngine', name: 'RAG Engine', description: 'Context-aware query responses' },
  { id: 'QueryRAGServer', name: 'Server RAG', description: 'Server-side RAG query processing' },
] as const;

export type ServiceId = typeof PROMPT_SERVICES[number]['id'];

/**
 * API request/response types
 */
export interface ListPromptsRequest {
  language?: string;
  service?: string;
}

export interface ListPromptsResponse {
  configs: FirestorePromptConfig[];
  total: number;
}

export interface GetPromptRequest {
  language: string;
  service: string;
}

export interface UpdatePromptRequest {
  language: string;
  service: string;
  promptId: string;
  updates: Partial<PromptDefinition>;
  notes?: string;
}

export interface UpdatePromptResponse {
  success: boolean;
  config: FirestorePromptConfig;
  version?: PromptVersion;
}

export interface MigratePromptsRequest {
  languages?: string[];
  services?: string[];
  overwrite?: boolean;      // If true, overwrites existing Firestore configs
}

export interface MigratePromptsResponse {
  migrated: number;
  skipped: number;
  errors: string[];
}

/**
 * Validation helpers
 */
export function isValidPromptDefinition(def: unknown): def is PromptDefinition {
  if (!def || typeof def !== 'object') return false;
  const d = def as Record<string, unknown>;
  return (
    typeof d.id === 'string' &&
    typeof d.service === 'string' &&
    ['system', 'user', 'function'].includes(d.type as string) &&
    typeof d.content === 'string'
  );
}

export function isValidFirestorePromptConfig(config: unknown): config is FirestorePromptConfig {
  if (!config || typeof config !== 'object') return false;
  const c = config as Record<string, unknown>;
  return (
    typeof c.version === 'string' &&
    typeof c.language === 'string' &&
    typeof c.service === 'string' &&
    typeof c.lastUpdated === 'string' &&
    typeof c.prompts === 'object' &&
    ['draft', 'published', 'archived'].includes(c.status as string)
  );
}

/**
 * Prompt Execution log entry
 * Tracks when prompts are called, results, and usage
 * Path: promptExecutions/{executionId}
 */
export interface PromptExecution {
  id: string;
  userId: string;                       // Who triggered it
  service: string;                      // 'SentimentAnalysisService'
  promptId: string;                     // 'sentiment_analysis'
  language: string;                     // 'en'

  // Prompt metadata
  promptVersion: string;                // From promptConfig.version
  promptSource: 'firestore' | 'yaml' | 'mobile';   // Where prompt was loaded from
  model: string;                        // 'gpt-4o-mini'
  temperature: number;
  maxTokens: number;

  // Input/Output (truncated for privacy)
  inputSummary: string;                 // First 200 chars
  inputTokens: number;
  outputSummary: string;                // First 200 chars
  outputTokens: number;

  // Cost
  totalTokens: number;
  estimatedCostUSD: number;

  // Performance
  latencyMs: number;
  success: boolean;
  errorMessage?: string;

  // Timestamps
  executedAt: string;                   // ISO 8601

  // Optional context
  sourceType?: string;                  // 'voice', 'text', etc.
  sourceId?: string;                    // Document ID that triggered
}

/**
 * Execution statistics for a prompt
 */
export interface PromptExecutionStats {
  totalExecutions: number;
  avgLatencyMs: number;
  totalCostUSD: number;
  successRate: number;
  uniqueUsers: number;
}

/**
 * API request/response types for executions
 */
export interface GetExecutionsRequest {
  service: string;
  promptId?: string;
  language?: string;
  limit?: number;
}

export interface GetExecutionsResponse {
  executions: PromptExecution[];
  stats: PromptExecutionStats;
}
