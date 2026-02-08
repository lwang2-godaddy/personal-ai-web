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
  DailySummaryService: 'dailySummary.yaml',
  KeywordGenerator: 'lifeKeywords.yaml',
  LifeConnectionsService: 'lifeConnections.yaml',
  // Mobile app / Server services
  OpenAIService: 'chat.yaml',
  RAGEngine: 'rag.yaml',
  QueryRAGServer: 'rag.yaml',
  CarouselInsights: 'carouselInsights.yaml',
};

/**
 * Supported languages
 */
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', status: 'complete' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', status: 'complete' },
  { code: 'fr', name: 'French', nativeName: 'Français', status: 'complete' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', status: 'complete' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', status: 'complete' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', status: 'complete' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', status: 'complete' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', status: 'complete' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', status: 'complete' },
] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];

/**
 * AI Features for organizing prompt services
 * Maps to the "AI Features" section in mobile app Settings + Chat
 *
 * Mobile app location: ProfileScreen → "AI Features" section with toggles
 * See: PersonalAIApp/src/screens/profile/ProfileScreen.tsx
 */
export const PROMPT_CATEGORIES = [
  { id: 'chat', name: 'Chat', icon: '💬', description: 'Main chat interface & context search' },
  { id: 'life_feed', name: 'Life Feed', icon: '📰', description: 'AI-generated posts about your daily life' },
  { id: 'fun_facts', name: 'Fun Facts', icon: '✨', description: 'Daily trivia and milestones' },
  { id: 'mood_compass', name: 'Mood Compass', icon: '😊', description: 'Track emotional patterns and insights' },
  { id: 'memory_companion', name: 'Memory Companion', icon: '📸', description: 'GPT-4o-mini titles/summaries, entity extraction, embeddings for 5 trigger types' },
  { id: 'life_forecaster', name: 'Life Forecaster', icon: '🔮', description: 'Predictions and proactive suggestions' },
] as const;

export type PromptCategoryId = typeof PROMPT_CATEGORIES[number]['id'];

/**
 * Services that use the prompt system
 * Organized by AI Features (from mobile app Settings) with metadata for the admin UI
 *
 * usedBy field indicates which clients use this service:
 * - 'mobile' = Mobile app only (client-side)
 * - 'web' = Web app only
 * - 'both' = Both mobile and web apps (via Cloud Function)
 * - 'server' = Server-side only (scheduled jobs, background tasks)
 */
export const PROMPT_SERVICES = [
  // Chat - Main chat interface & context search
  {
    id: 'OpenAIService',
    name: 'Chat Responses',
    category: 'chat' as PromptCategoryId,
    icon: '💬',
    description: 'Direct OpenAI chat completion and image description (client-side)',
    trigger: 'When user sends a chat message without RAG context',
    platform: 'mobile' as const,
    usedBy: ['mobile'] as const,
    example: 'User asks "What did I do yesterday?"',
  },
  {
    id: 'RAGEngine',
    name: 'Client-Side RAG',
    category: 'chat' as PromptCategoryId,
    icon: '🔍',
    description: 'Client-side RAG for offline/local context retrieval',
    trigger: 'When mobile app processes RAG queries locally',
    platform: 'mobile' as const,
    usedBy: ['mobile'] as const,
    example: 'Finding relevant health/location data for query',
  },
  {
    id: 'QueryRAGServer',
    name: 'Server RAG + AI Personality',
    category: 'chat' as PromptCategoryId,
    icon: '🤖',
    description: 'Main chat service with AI personality selection (queryRAG Cloud Function)',
    trigger: 'When user sends chat messages in mobile or web app',
    platform: 'server' as const,
    usedBy: ['mobile', 'web'] as const,
    example: 'Chat with Friendly, Professional, Witty, Coach, or Chill personality',
  },
  // Life Feed - AI-generated social-style posts
  {
    id: 'LifeFeedGenerator',
    name: 'Life Feed Posts',
    category: 'life_feed' as PromptCategoryId,
    icon: '📰',
    description: 'Generates social-style life updates',
    trigger: 'Periodically from user activity',
    platform: 'server' as const,
    usedBy: ['mobile', 'web'] as const,
    example: 'Creating "You visited 3 new places this week!"',
  },
  {
    id: 'DailySummaryService',
    name: 'Daily Summaries',
    category: 'life_feed' as PromptCategoryId,
    icon: '📊',
    description: 'Generates daily and weekly activity summaries',
    trigger: 'Daily at user-preferred time or on-demand',
    platform: 'server' as const,
    usedBy: ['mobile', 'web'] as const,
    example: 'Creating "You walked 12,000 steps and completed 2 workouts today!"',
  },
  // Fun Facts - Daily insights & smart suggestions
  {
    id: 'SuggestionEngine',
    name: 'Smart Suggestions',
    category: 'fun_facts' as PromptCategoryId,
    icon: '💡',
    description: 'Generates proactive suggestions and daily insights',
    trigger: 'Based on user patterns and context',
    platform: 'server' as const,
    usedBy: ['mobile'] as const,
    example: 'Suggesting "Time for your daily walk?"',
  },
  {
    id: 'KeywordGenerator',
    name: 'Life Keywords',
    category: 'fun_facts' as PromptCategoryId,
    icon: '🔑',
    description: 'Generates meaningful keywords from user activity patterns',
    trigger: 'Periodically or on-demand (weekly, monthly, quarterly, yearly)',
    platform: 'server' as const,
    usedBy: ['mobile', 'web'] as const,
    example: 'Generating "Badminton Renaissance" from weekly badminton activity',
  },
  {
    id: 'CarouselInsights',
    name: 'Carousel Fun Facts',
    category: 'fun_facts' as PromptCategoryId,
    icon: '🎠',
    description: 'AI-generated insights shown in home screen carousel',
    trigger: 'On pull-to-refresh or carousel refresh button',
    platform: 'mobile' as const,
    usedBy: ['mobile'] as const,
    example: 'Generating "You walked 20% more this week than last!"',
  },
  {
    id: 'ThisDayService',
    name: 'On This Day',
    category: 'fun_facts' as PromptCategoryId,
    icon: '📅',
    description: 'Shows memories from this day in previous years',
    trigger: 'Daily, when user has historical data',
    platform: 'mobile' as const,
    usedBy: ['mobile'] as const,
    example: 'Showing "1 year ago: You played badminton at SF Club"',
  },
  // Mood Compass - Mood detection & sentiment analysis
  {
    id: 'SentimentAnalysisService',
    name: 'Mood Detection',
    category: 'mood_compass' as PromptCategoryId,
    icon: '😊',
    description: 'Analyzes emotional tone of content',
    trigger: 'When processing user-created content',
    platform: 'server' as const,
    usedBy: ['mobile', 'web'] as const,
    example: 'Detecting positive mood in diary entry',
  },
  // Memory Companion - Memory summaries & entity extraction (event-driven, not scheduled)
  {
    id: 'MemoryGeneratorService',
    name: 'Memory Titles & Summaries',
    category: 'memory_companion' as PromptCategoryId,
    icon: '📝',
    description: 'GPT-4o-mini generates titles (50 chars) and summaries (150 chars) for memories',
    trigger: 'Event-driven: when photo, voice, text, or location data is created',
    platform: 'server' as const,
    usedBy: ['mobile', 'web'] as const,
    example: '"Dinner at Nopa with Sarah" - voice note about restaurant visit',
  },
  {
    id: 'EntityExtractionService',
    name: 'Entity Extraction (NER)',
    category: 'memory_companion' as PromptCategoryId,
    icon: '👥',
    description: 'Extracts people, places, events, organizations, topics from content',
    trigger: 'When processing any user-created content for memory triggers',
    platform: 'server' as const,
    usedBy: ['mobile', 'web'] as const,
    example: 'Extracting "Sarah", "Nopa restaurant", "dinner" from text',
  },
  // Life Forecaster - Pattern predictions & event extraction
  {
    id: 'EventExtractionService',
    name: 'Events & Dates',
    category: 'life_forecaster' as PromptCategoryId,
    icon: '📅',
    description: 'Extracts events and dates from text for predictions',
    trigger: 'When processing text content',
    platform: 'server' as const,
    usedBy: ['mobile', 'web'] as const,
    example: 'Finding "meeting tomorrow at 3pm"',
  },
  {
    id: 'LifeConnectionsService',
    name: 'Life Connections',
    category: 'life_forecaster' as PromptCategoryId,
    icon: '🔗',
    description: 'Cross-domain correlation insights and AI explanations',
    trigger: 'Periodically or on-demand when analyzing user data patterns',
    platform: 'server' as const,
    usedBy: ['mobile', 'web'] as const,
    example: 'Discovering "You sleep 23% better on days when you play badminton"',
  },
] as const;

export type ServiceId = typeof PROMPT_SERVICES[number]['id'];

/**
 * Type for a prompt service definition
 */
export type PromptService = typeof PROMPT_SERVICES[number];

/**
 * Helper type for usedBy field values
 */
export type UsedByPlatform = 'mobile' | 'web';

/**
 * LifeFeedGenerator prompt-to-post-type mapping
 * Used in admin portal to show which post type each prompt generates
 *
 * Post types with multiple prompts randomly select one variant when generating
 * This provides variety in the feed (e.g., life_summary can be detailed or minimal)
 */
export const LIFE_FEED_PROMPT_POST_TYPES: Record<string, { postType: string; isVariant: boolean; description: string }> = {
  // System prompt (used by all post types)
  system: { postType: 'all', isVariant: false, description: 'System instruction for all post types' },

  // life_summary variants (1-day cooldown)
  life_summary: { postType: 'life_summary', isVariant: false, description: 'Weekly/daily summary - default' },
  life_summary_detailed: { postType: 'life_summary', isVariant: true, description: 'Weekly/daily summary - with specific stats' },
  life_summary_minimal: { postType: 'life_summary', isVariant: true, description: 'Weekly/daily summary - punchy one-liner' },

  // milestone (7-day cooldown)
  milestone: { postType: 'milestone', isVariant: false, description: 'Achievement celebration' },

  // pattern_prediction variants (1-day cooldown)
  pattern_prediction: { postType: 'pattern_prediction', isVariant: false, description: 'Activity prediction - default' },
  pattern_prediction_curious: { postType: 'pattern_prediction', isVariant: true, description: 'Activity prediction - questioning tone' },
  pattern_prediction_playful: { postType: 'pattern_prediction', isVariant: true, description: 'Activity prediction - humorous tone' },

  // reflective_insight variants (3-day cooldown)
  reflective_insight: { postType: 'reflective_insight', isVariant: false, description: 'Behavioral insight - default' },
  reflective_insight_mood: { postType: 'reflective_insight', isVariant: true, description: 'Behavioral insight - mood focused' },
  reflective_insight_discovery: { postType: 'reflective_insight', isVariant: true, description: 'Behavioral insight - aha moment' },

  // memory_highlight variants (7-day cooldown)
  memory_highlight: { postType: 'memory_highlight', isVariant: false, description: 'Memory celebration - default' },
  memory_highlight_celebration: { postType: 'memory_highlight', isVariant: true, description: 'Memory celebration - enthusiastic' },
  memory_highlight_story: { postType: 'memory_highlight', isVariant: true, description: 'Memory celebration - narrative style' },

  // streak_achievement (3-day cooldown)
  streak_achievement: { postType: 'streak_achievement', isVariant: false, description: 'Streak/habit celebration' },

  // comparison (14-day cooldown)
  comparison: { postType: 'comparison', isVariant: false, description: 'Time period comparison' },

  // seasonal_reflection variants (30-day cooldown)
  seasonal_reflection: { postType: 'seasonal_reflection', isVariant: false, description: 'Seasonal summary - default' },
  seasonal_reflection_growth: { postType: 'seasonal_reflection', isVariant: true, description: 'Seasonal summary - growth focused' },
  seasonal_reflection_gratitude: { postType: 'seasonal_reflection', isVariant: true, description: 'Seasonal summary - gratitude focused' },

  // activity_pattern (7-day cooldown)
  activity_pattern: { postType: 'activity_pattern', isVariant: false, description: 'Discovered activity pattern' },

  // health_alert (1-day cooldown)
  health_alert: { postType: 'health_alert', isVariant: false, description: 'Health metric awareness' },

  // category_insight variants (3-day cooldown)
  category_insight: { postType: 'category_insight', isVariant: false, description: 'Category distribution - default' },
  category_trend: { postType: 'category_insight', isVariant: true, description: 'Category distribution - trend focused' },
  category_correlation: { postType: 'category_insight', isVariant: true, description: 'Category distribution - correlation focused' },
};

/**
 * Get the post type for a LifeFeedGenerator prompt ID
 */
export function getLifeFeedPromptPostType(promptId: string): { postType: string; isVariant: boolean; description: string } | null {
  return LIFE_FEED_PROMPT_POST_TYPES[promptId] || null;
}

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
