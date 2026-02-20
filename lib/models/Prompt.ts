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
  LifeFeedGenerator: 'lifeFeed.yaml',
  DailySummaryService: 'dailySummary.yaml',
  DailyInsightService: 'dailyInsight.yaml',
  KeywordGenerator: 'lifeKeywords.yaml',
  LifeConnectionsService: 'lifeConnections.yaml',
  ContentSummaryService: 'contentSummary.yaml',
  // Mobile app / Server services
  OpenAIService: 'chat.yaml',
  RAGEngine: 'rag.yaml',
  QueryRAGServer: 'rag.yaml',
  CarouselInsights: 'carouselInsights.yaml',
  // Chat suggestions (Firestore only - no YAML)
  ChatSuggestions: 'chatSuggestions.yaml',
  // Mood Compass - AI-powered mood insights
  MoodInsightService: 'moodInsight.yaml',
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
 * Service categories by OUTPUT destination
 * Matches the structure shown in /admin/insights?tab=debug
 * This helps users understand where each service writes data TO
 */
export const SERVICE_OUTPUT_CATEGORIES = [
  {
    id: 'life_feed_writers',
    name: 'Life Feed Writers',
    icon: '📝',
    description: 'Services that write to lifeFeedPosts collection',
    outputCollection: 'lifeFeedPosts',
    services: ['LifeFeedGenerator'], // InsightsIntegrationService is not a prompt service
  },
  {
    id: 'chat_services',
    name: 'Chat & RAG Services',
    icon: '💬',
    description: 'Services that power chat and context retrieval',
    outputCollection: 'chatHistory (responses)',
    services: ['OpenAIService', 'RAGEngine', 'QueryRAGServer', 'ChatSuggestions'],
  },
  {
    id: 'mood_services',
    name: 'Mood & Sentiment Services',
    icon: '😊',
    description: 'Services that analyze and generate mood insights',
    outputCollection: 'moodEntries, moodInsights',
    services: ['SentimentAnalysisService', 'MoodInsightService'],
  },
  {
    id: 'analysis_services',
    name: 'Content Analysis Services',
    icon: '🔬',
    description: 'Services that analyze user content (triggered by data creation)',
    outputCollection: 'Various (moodEntries, events, memories)',
    services: ['SentimentAnalysisService', 'EntityExtractionService', 'EventExtractionService', 'MemoryGeneratorService', 'ContentSummaryService'],
  },
  {
    id: 'insights_services',
    name: 'Insights & Analytics Services',
    icon: '📊',
    description: 'Services that generate insights from aggregated data',
    outputCollection: 'Various (funFacts, lifeKeywords, lifeConnections)',
    services: ['CarouselInsights', 'KeywordGenerator', 'LifeConnectionsService'],
  },
  {
    id: 'summary_services',
    name: 'Summary & Memory Services',
    icon: '📅',
    description: 'Services that generate summaries and surface memories',
    outputCollection: 'Push notifications, thisDayMemories',
    services: ['DailySummaryService', 'DailyInsightService', 'ThisDayService'],
  },
  {
    id: 'other_services',
    name: 'Other AI Services',
    icon: '✨',
    description: 'Additional AI-powered services',
    outputCollection: 'funFacts',
    services: ['FunFactsService'],
  },
] as const;

export type ServiceOutputCategoryId = typeof SERVICE_OUTPUT_CATEGORIES[number]['id'];

/**
 * Context source - Firestore collection that provides data to a service
 */
export interface ContextSource {
  collection: string;
  description: string;
  trigger: string; // What conditions generate data in this collection
}

/**
 * Prompt selection logic types
 */
export type SelectionLogic =
  | 'always'           // Single prompt, always used
  | 'random'           // Random selection among variants
  | 'conditional'      // Selected based on conditions
  | 'personality'      // Selected based on user personality setting
  | 'context-based';   // Selected based on available context data

/**
 * Prompt usage information - how and when a prompt gets used
 */
/**
 * Data selection algorithm info for prompts
 * Explains how many items are selected and the scoring algorithm
 */
export interface DataSelectionInfo {
  maxItems: {                  // Max items selected per data type
    voiceNotes?: number;
    photos?: number;
    diaryEntries?: number;
  };
  strategy?: 'scored' | 'recent' | 'diverse';  // Selection strategy
  scoringFactors?: {           // If strategy is 'scored', these factors apply
    recency: { maxPoints: number; description: string };
    contentLength: { maxPoints: number; description: string };
    sentiment: { maxPoints: number; description: string };
    tags: { maxPoints: number; description: string };
  } | Array<{ name: string; weight: string; description: string }>;  // Or array of custom factors
  summarization?: {            // Content summarization settings
    wordThreshold: number;     // Words above which content gets summarized
    description: string;
  };
  summarizationThreshold?: number;  // Alternative: word count threshold
}

export interface PromptUsageInfo {
  dataTimeRange: string;       // e.g., "Last 7 days", "Last 24 hours", "Real-time"
  selectionLogic: SelectionLogic;
  variantGroup?: string;       // Group name if part of random selection
  variants?: string[];         // Other prompts in the same variant group
  cooldownDays?: number;       // Cooldown between generations (for LifeFeed)
  dataSelection?: DataSelectionInfo;  // How data is selected for this prompt
}

/**
 * Common context source definitions with triggers
 * Reusable across services to maintain consistency
 */
export const CONTEXT_SOURCES = {
  textNotes: {
    collection: 'textNotes',
    description: 'Diary entries and quick thoughts',
    trigger: 'User creates diary entry or quick thought in app',
  },
  voiceNotes: {
    collection: 'voiceNotes',
    description: 'Transcribed voice recordings',
    trigger: 'User records voice note → Whisper transcription',
  },
  photoMemories: {
    collection: 'photoMemories',
    description: 'Photos with AI descriptions',
    trigger: 'User uploads photo → GPT-4o vision generates description',
  },
  healthData: {
    collection: 'healthData',
    description: 'Steps, sleep, workouts from HealthKit',
    trigger: 'HealthKit sync (iOS) or Google Fit sync (Android)',
  },
  locationData: {
    collection: 'locationData',
    description: 'Places visited with activity tags',
    trigger: 'Background location tracking detects significant visit (5+ min dwell)',
  },
  events: {
    collection: 'events',
    description: 'Calendar events and extracted dates',
    trigger: 'EventExtractionService extracts dates from text/voice notes',
  },
  memories: {
    collection: 'memories',
    description: 'AI-enriched memory summaries',
    trigger: 'MemoryGeneratorService processes new text/voice/photo data',
  },
  chatHistory: {
    collection: 'chatHistory',
    description: 'Previous conversation context',
    trigger: 'User sends message in chat → stored for context',
  },
  moodEntries: {
    collection: 'moodEntries',
    description: 'Emotion tracking and sentiment',
    trigger: 'SentimentAnalysisService analyzes new text/voice notes',
  },
} as const;

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
    contextSources: [] as ContextSource[], // Direct user input, no collections
    usageInfo: { dataTimeRange: 'Real-time (user input)', selectionLogic: 'always' as SelectionLogic },
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
    contextSources: [
      CONTEXT_SOURCES.textNotes,
      CONTEXT_SOURCES.voiceNotes,
      CONTEXT_SOURCES.photoMemories,
      CONTEXT_SOURCES.healthData,
      CONTEXT_SOURCES.locationData,
      CONTEXT_SOURCES.events,
      CONTEXT_SOURCES.memories,
    ] as ContextSource[],
    usageInfo: { dataTimeRange: 'All time (semantic search)', selectionLogic: 'always' as SelectionLogic },
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
    contextSources: [
      CONTEXT_SOURCES.textNotes,
      CONTEXT_SOURCES.voiceNotes,
      CONTEXT_SOURCES.photoMemories,
      CONTEXT_SOURCES.healthData,
      CONTEXT_SOURCES.locationData,
      CONTEXT_SOURCES.events,
      CONTEXT_SOURCES.chatHistory,
    ] as ContextSource[],
    usageInfo: { dataTimeRange: 'All time (semantic search)', selectionLogic: 'personality' as SelectionLogic },
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
    contextSources: [
      CONTEXT_SOURCES.healthData,
      CONTEXT_SOURCES.locationData,
      CONTEXT_SOURCES.photoMemories,
      CONTEXT_SOURCES.voiceNotes,
      CONTEXT_SOURCES.textNotes,
      CONTEXT_SOURCES.moodEntries,
    ] as ContextSource[],
    usageInfo: { dataTimeRange: 'Last 7 days (per prompt varies)', selectionLogic: 'random' as SelectionLogic },
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
    contextSources: [
      CONTEXT_SOURCES.healthData,
      CONTEXT_SOURCES.locationData,
      CONTEXT_SOURCES.events,
      CONTEXT_SOURCES.moodEntries,
    ] as ContextSource[],
    usageInfo: { dataTimeRange: 'Last 24 hours (daily) or Last 7 days (weekly)', selectionLogic: 'conditional' as SelectionLogic },
  },
  {
    id: 'DailyInsightService',
    name: 'Daily Snapshots',
    category: 'life_feed' as PromptCategoryId,
    icon: '📷',
    description: 'Generates Today\'s Snapshot card - AI narrative of the day with mood and emoji',
    trigger: 'On app open or manual refresh',
    platform: 'server' as const,
    usedBy: ['mobile'] as const,
    example: 'Creating "🌿 Today was a well-deserved rest day. You practiced piano and planned a pasta recipe!"',
    contextSources: [
      CONTEXT_SOURCES.healthData,
      CONTEXT_SOURCES.locationData,
      CONTEXT_SOURCES.voiceNotes,
      CONTEXT_SOURCES.textNotes,
    ] as ContextSource[],
    usageInfo: { dataTimeRange: 'Last 24 hours', selectionLogic: 'conditional' as SelectionLogic },
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
    contextSources: [
      CONTEXT_SOURCES.textNotes,
      CONTEXT_SOURCES.voiceNotes,
      CONTEXT_SOURCES.locationData,
      CONTEXT_SOURCES.photoMemories,
    ] as ContextSource[], // Via Pinecone vectors
    usageInfo: { dataTimeRange: 'Configurable (7/30/90/365 days)', selectionLogic: 'conditional' as SelectionLogic },
  },
  {
    id: 'CarouselInsights',
    name: 'Carousel Fun Facts',
    category: 'fun_facts' as PromptCategoryId,
    icon: '🎠',
    description: 'AI-generated fun facts: 3 AI insights (all context) + 3 data-stat facts (domain-specific context only)',
    trigger: 'Scheduled (hourly check) or manual via manualGenerateFunFacts',
    platform: 'mobile' as const,
    usedBy: ['mobile'] as const,
    example: 'Generating "You walked 20% more this week than last!"',
    contextSources: [
      CONTEXT_SOURCES.healthData,
      CONTEXT_SOURCES.locationData,
      CONTEXT_SOURCES.photoMemories,
      CONTEXT_SOURCES.voiceNotes,
    ] as ContextSource[], // AI insights: all 4 sources + RAG. Data-stats: domain-specific only (no photos/voice/RAG)
    usageInfo: { dataTimeRange: 'Configurable lookback (health: 90d, activity: 90d, recent: 7d)', selectionLogic: 'always' as SelectionLogic },
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
    contextSources: [
      CONTEXT_SOURCES.memories,
    ] as ContextSource[],
    usageInfo: { dataTimeRange: 'Same day in previous years', selectionLogic: 'always' as SelectionLogic },
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
    contextSources: [
      CONTEXT_SOURCES.textNotes,
      CONTEXT_SOURCES.voiceNotes,
    ] as ContextSource[],
    usageInfo: { dataTimeRange: 'Real-time (single item)', selectionLogic: 'always' as SelectionLogic },
  },
  {
    id: 'MoodInsightService',
    name: 'Mood Daily Insights',
    category: 'mood_compass' as PromptCategoryId,
    icon: '💡',
    description: 'AI-generated personalized mood insights based on patterns and correlations',
    trigger: 'When user views Mood Compass screen',
    platform: 'server' as const,
    usedBy: ['mobile'] as const,
    example: 'Generating "Exercise boosts your mood by 30% - keep moving!"',
    contextSources: [
      CONTEXT_SOURCES.moodEntries,
    ] as ContextSource[],
    usageInfo: { dataTimeRange: 'Last 30 days', selectionLogic: 'always' as SelectionLogic },
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
    contextSources: [
      CONTEXT_SOURCES.textNotes,
      CONTEXT_SOURCES.voiceNotes,
      CONTEXT_SOURCES.photoMemories,
    ] as ContextSource[],
    usageInfo: { dataTimeRange: 'Real-time (single item)', selectionLogic: 'always' as SelectionLogic },
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
    contextSources: [
      CONTEXT_SOURCES.textNotes,
      CONTEXT_SOURCES.voiceNotes,
      CONTEXT_SOURCES.photoMemories,
    ] as ContextSource[],
    usageInfo: { dataTimeRange: 'Real-time (single item)', selectionLogic: 'always' as SelectionLogic },
  },
  // Content Summary - Summarizes long content for AI context
  {
    id: 'ContentSummaryService',
    name: 'Content Summary',
    category: 'memory_companion' as PromptCategoryId,
    icon: '📝',
    description: 'Summarizes long diary entries, voice notes, and photo descriptions for AI context in LifeFeed generation',
    trigger: 'When LifeFeedGenerator needs to summarize content >150 words',
    platform: 'server' as const,
    usedBy: ['mobile', 'web'] as const,
    example: 'Summarizing a 500-word diary entry to 75 words for AI context',
    contextSources: [
      CONTEXT_SOURCES.textNotes,
      CONTEXT_SOURCES.voiceNotes,
      CONTEXT_SOURCES.photoMemories,
    ] as ContextSource[],
    usageInfo: { dataTimeRange: 'Real-time (single item)', selectionLogic: 'always' as SelectionLogic },
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
    contextSources: [
      CONTEXT_SOURCES.textNotes,
      CONTEXT_SOURCES.voiceNotes,
    ] as ContextSource[],
    usageInfo: { dataTimeRange: 'Real-time (single item)', selectionLogic: 'always' as SelectionLogic },
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
    contextSources: [
      CONTEXT_SOURCES.healthData,
      CONTEXT_SOURCES.locationData,
      CONTEXT_SOURCES.moodEntries,
      CONTEXT_SOURCES.voiceNotes,
    ] as ContextSource[],
    usageInfo: { dataTimeRange: 'Last 30 days', selectionLogic: 'always' as SelectionLogic },
  },
  // Chat suggestions - Follow-up questions shown after AI responses
  {
    id: 'ChatSuggestions',
    name: 'Chat Suggestions',
    category: 'chat' as PromptCategoryId,
    icon: '💡',
    description: 'Follow-up question suggestions shown after AI responses in chat',
    trigger: 'After AI generates a response, shown as clickable chips',
    platform: 'mobile' as const,
    usedBy: ['mobile'] as const,
    example: 'Suggesting "What about yesterday?" or "Show me my photos"',
    contextSources: [
      CONTEXT_SOURCES.chatHistory,
    ] as ContextSource[],
    usageInfo: { dataTimeRange: 'Current conversation', selectionLogic: 'context-based' as SelectionLogic },
  },
  // Fun Facts Service - RAG-based AI fun facts (different from FunFactGenerator)
  {
    id: 'FunFactsService',
    name: 'Fun Facts (AI)',
    category: 'fun_facts' as PromptCategoryId,
    icon: '✨',
    description: 'RAG + GPT-4o-mini generates personalized fun facts with LLM intelligence',
    trigger: 'Daily scheduled or on-demand refresh',
    platform: 'server' as const,
    usedBy: ['mobile'] as const,
    example: 'Generating "You\'ve visited 15 unique coffee shops this month!"',
    contextSources: [] as ContextSource[], // Via Pinecone vectors (not direct collections)
    usageInfo: { dataTimeRange: 'All time (via Pinecone vectors)', selectionLogic: 'always' as SelectionLogic },
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
 * Life Feed prompt context sources by post type
 * Maps each post type to the Firestore collections it reads from
 */
export const LIFE_FEED_CONTEXT_BY_POST_TYPE: Record<string, string[]> = {
  life_summary: ['healthData', 'locationData', 'photoMemories', 'voiceNotes', 'textNotes'],
  milestone: ['healthData', 'locationData', 'photoMemories'],
  pattern_prediction: ['textNotes', 'voiceNotes', 'locationData', 'memories', 'moodEntries'],
  reflective_insight: ['moodEntries', 'healthData', 'locationData'],
  memory_highlight: ['photoMemories', 'voiceNotes', 'textNotes'],
  streak_achievement: ['healthData', 'textNotes', 'voiceNotes'],  // Now includes diary/voice streaks
  comparison: ['healthData', 'locationData'],
  seasonal_reflection: ['textNotes', 'voiceNotes', 'photoMemories', 'locationData'],  // Added text/voice/photos
  activity_pattern: ['locationData', 'textNotes', 'voiceNotes'],  // Now includes diary topic patterns
  health_alert: ['healthData'],
  category_insight: ['textNotes', 'voiceNotes', 'photoMemories'],  // Changed from locationData
};

/**
 * LifeFeedGenerator default data selection algorithm
 * Applies to prompts that use diary entries, voice notes, and photos
 */
export const LIFE_FEED_DATA_SELECTION: DataSelectionInfo = {
  maxItems: {
    voiceNotes: 5,
    photos: 5,
    diaryEntries: 5,
  },
  strategy: 'scored',
  scoringFactors: {
    recency: {
      maxPoints: 40,
      description: 'Newer items score higher (40pts - 5pts per day old)',
    },
    contentLength: {
      maxPoints: 30,
      description: 'Richer content scores higher (1pt per 10 chars, max 30)',
    },
    sentiment: {
      maxPoints: 20,
      description: 'Strong emotions (positive or negative) score higher',
    },
    tags: {
      maxPoints: 10,
      description: 'Well-tagged content scores higher (2pts per tag, max 5 tags)',
    },
  },
  summarization: {
    wordThreshold: 150,
    description: 'Content over 150 words is summarized via GPT to preserve key topics',
  },
};

/**
 * LifeFeedGenerator prompt-to-post-type mapping
 * Used in admin portal to show which post type each prompt generates
 *
 * Post types with multiple prompts randomly select one variant when generating
 * This provides variety in the feed (e.g., life_summary can be detailed or minimal)
 */
export interface LifeFeedPromptInfo {
  postType: string;
  isVariant: boolean;
  description: string;
  contextSources: string[];
  usageInfo: PromptUsageInfo;
}

export const LIFE_FEED_PROMPT_POST_TYPES: Record<string, LifeFeedPromptInfo> = {
  // System prompt (used by all post types)
  system: {
    postType: 'all',
    isVariant: false,
    description: 'System instruction for all post types',
    contextSources: [],
    usageInfo: {
      dataTimeRange: 'N/A (system)',
      selectionLogic: 'always',
      dataSelection: LIFE_FEED_DATA_SELECTION,
    },
  },

  // life_summary variants (1-day cooldown)
  life_summary: {
    postType: 'life_summary',
    isVariant: false,
    description: 'Weekly/daily summary - default',
    contextSources: LIFE_FEED_CONTEXT_BY_POST_TYPE.life_summary,
    usageInfo: {
      dataTimeRange: 'Last 7 days',
      selectionLogic: 'random',
      variantGroup: 'life_summary',
      variants: ['life_summary', 'life_summary_detailed', 'life_summary_minimal'],
      cooldownDays: 1,
      dataSelection: LIFE_FEED_DATA_SELECTION,
    },
  },
  life_summary_detailed: {
    postType: 'life_summary',
    isVariant: true,
    description: 'Weekly/daily summary - with specific stats',
    contextSources: LIFE_FEED_CONTEXT_BY_POST_TYPE.life_summary,
    usageInfo: {
      dataTimeRange: 'Last 7 days',
      selectionLogic: 'random',
      variantGroup: 'life_summary',
      variants: ['life_summary', 'life_summary_detailed', 'life_summary_minimal'],
      cooldownDays: 1,
      dataSelection: LIFE_FEED_DATA_SELECTION,
    },
  },
  life_summary_minimal: {
    postType: 'life_summary',
    isVariant: true,
    description: 'Weekly/daily summary - punchy one-liner',
    contextSources: LIFE_FEED_CONTEXT_BY_POST_TYPE.life_summary,
    usageInfo: {
      dataTimeRange: 'Last 7 days',
      selectionLogic: 'random',
      variantGroup: 'life_summary',
      variants: ['life_summary', 'life_summary_detailed', 'life_summary_minimal'],
      cooldownDays: 1,
      dataSelection: LIFE_FEED_DATA_SELECTION,
    },
  },

  // milestone (7-day cooldown)
  milestone: {
    postType: 'milestone',
    isVariant: false,
    description: 'Achievement celebration',
    contextSources: LIFE_FEED_CONTEXT_BY_POST_TYPE.milestone,
    usageInfo: { dataTimeRange: 'All time (count-based)', selectionLogic: 'always', cooldownDays: 7 },
  },

  // pattern_prediction variants (2-day cooldown) — only triggers when actual patterns detected
  pattern_prediction: {
    postType: 'pattern_prediction',
    isVariant: false,
    description: 'Multi-signal prediction — confident/forward-looking tone. Only triggers when generatePredictions() finds actual patterns.',
    contextSources: LIFE_FEED_CONTEXT_BY_POST_TYPE.pattern_prediction,
    usageInfo: {
      dataTimeRange: 'Last 14 days (+ 30-day lookback for seasonal)',
      selectionLogic: 'conditional',  // Only when generatePredictions() returns patterns
      variantGroup: 'pattern_prediction',
      variants: ['pattern_prediction', 'pattern_prediction_curious', 'pattern_prediction_playful'],
      cooldownDays: 2,
      dataSelection: {
        maxItems: { voiceNotes: 5, photos: 0, diaryEntries: 5 },
        scoringFactors: [
          { name: 'Activity Pattern', weight: 'strength 0.85', description: 'Tomorrow matches a recurring activity day-of-week' },
          { name: 'Routine Pattern', weight: 'strength 0.75', description: 'Diary/voice entries cluster on specific days' },
          { name: 'Mood Trend', weight: 'strength 0.70', description: '3+ entries show rising/falling sentiment' },
          { name: 'Social Pattern', weight: 'strength 0.65', description: 'Person mentioned 3+ times in memories/entries' },
          { name: 'Goal Progress', weight: 'strength 0.60', description: 'Goal keywords detected in recent entries' },
          { name: 'Seasonal Parallel', weight: 'strength 0.55', description: 'Similar entries from ~30 days ago' },
        ],
        summarizationThreshold: 150,
      },
    },
  },
  pattern_prediction_curious: {
    postType: 'pattern_prediction',
    isVariant: true,
    description: 'Multi-signal prediction — wondering/questioning tone',
    contextSources: LIFE_FEED_CONTEXT_BY_POST_TYPE.pattern_prediction,
    usageInfo: {
      dataTimeRange: 'Last 14 days (+ 30-day lookback for seasonal)',
      selectionLogic: 'context-based',
      variantGroup: 'pattern_prediction',
      variants: ['pattern_prediction', 'pattern_prediction_curious', 'pattern_prediction_playful'],
      cooldownDays: 2,
      dataSelection: {
        maxItems: { voiceNotes: 5, photos: 0, diaryEntries: 5 },
        scoringFactors: [
          { name: 'Activity Pattern', weight: 'strength 0.85', description: 'Tomorrow matches a recurring activity day-of-week' },
          { name: 'Routine Pattern', weight: 'strength 0.75', description: 'Diary/voice entries cluster on specific days' },
          { name: 'Mood Trend', weight: 'strength 0.70', description: '3+ entries show rising/falling sentiment' },
          { name: 'Social Pattern', weight: 'strength 0.65', description: 'Person mentioned 3+ times in memories/entries' },
          { name: 'Goal Progress', weight: 'strength 0.60', description: 'Goal keywords detected in recent entries' },
          { name: 'Seasonal Parallel', weight: 'strength 0.55', description: 'Similar entries from ~30 days ago' },
        ],
        summarizationThreshold: 150,
      },
    },
  },
  pattern_prediction_playful: {
    postType: 'pattern_prediction',
    isVariant: true,
    description: 'Multi-signal prediction — humorous/self-aware tone',
    contextSources: LIFE_FEED_CONTEXT_BY_POST_TYPE.pattern_prediction,
    usageInfo: {
      dataTimeRange: 'Last 14 days (+ 30-day lookback for seasonal)',
      selectionLogic: 'context-based',
      variantGroup: 'pattern_prediction',
      variants: ['pattern_prediction', 'pattern_prediction_curious', 'pattern_prediction_playful'],
      cooldownDays: 2,
      dataSelection: {
        maxItems: { voiceNotes: 5, photos: 0, diaryEntries: 5 },
        scoringFactors: [
          { name: 'Activity Pattern', weight: 'strength 0.85', description: 'Tomorrow matches a recurring activity day-of-week' },
          { name: 'Routine Pattern', weight: 'strength 0.75', description: 'Diary/voice entries cluster on specific days' },
          { name: 'Mood Trend', weight: 'strength 0.70', description: '3+ entries show rising/falling sentiment' },
          { name: 'Social Pattern', weight: 'strength 0.65', description: 'Person mentioned 3+ times in memories/entries' },
          { name: 'Goal Progress', weight: 'strength 0.60', description: 'Goal keywords detected in recent entries' },
          { name: 'Seasonal Parallel', weight: 'strength 0.55', description: 'Similar entries from ~30 days ago' },
        ],
        summarizationThreshold: 150,
      },
    },
  },

  // reflective_insight variants (3-day cooldown)
  reflective_insight: {
    postType: 'reflective_insight',
    isVariant: false,
    description: 'Behavioral insight - default',
    contextSources: LIFE_FEED_CONTEXT_BY_POST_TYPE.reflective_insight,
    usageInfo: {
      dataTimeRange: 'Last 7 days',
      selectionLogic: 'random',
      variantGroup: 'reflective_insight',
      variants: ['reflective_insight', 'reflective_insight_mood', 'reflective_insight_discovery'],
      cooldownDays: 3,
    },
  },
  reflective_insight_mood: {
    postType: 'reflective_insight',
    isVariant: true,
    description: 'Behavioral insight - mood focused',
    contextSources: LIFE_FEED_CONTEXT_BY_POST_TYPE.reflective_insight,
    usageInfo: {
      dataTimeRange: 'Last 7 days',
      selectionLogic: 'random',
      variantGroup: 'reflective_insight',
      variants: ['reflective_insight', 'reflective_insight_mood', 'reflective_insight_discovery'],
      cooldownDays: 3,
    },
  },
  reflective_insight_discovery: {
    postType: 'reflective_insight',
    isVariant: true,
    description: 'Behavioral insight - aha moment',
    contextSources: LIFE_FEED_CONTEXT_BY_POST_TYPE.reflective_insight,
    usageInfo: {
      dataTimeRange: 'Last 7 days',
      selectionLogic: 'random',
      variantGroup: 'reflective_insight',
      variants: ['reflective_insight', 'reflective_insight_mood', 'reflective_insight_discovery'],
      cooldownDays: 3,
    },
  },

  // memory_highlight variants (7-day cooldown)
  memory_highlight: {
    postType: 'memory_highlight',
    isVariant: false,
    description: 'Memory celebration - default',
    contextSources: LIFE_FEED_CONTEXT_BY_POST_TYPE.memory_highlight,
    usageInfo: {
      dataTimeRange: 'Last 7 days',
      selectionLogic: 'random',
      variantGroup: 'memory_highlight',
      variants: ['memory_highlight', 'memory_highlight_celebration', 'memory_highlight_story'],
      cooldownDays: 7,
      dataSelection: LIFE_FEED_DATA_SELECTION,
    },
  },
  memory_highlight_celebration: {
    postType: 'memory_highlight',
    isVariant: true,
    description: 'Memory celebration - enthusiastic',
    contextSources: LIFE_FEED_CONTEXT_BY_POST_TYPE.memory_highlight,
    usageInfo: {
      dataTimeRange: 'Last 7 days',
      selectionLogic: 'random',
      variantGroup: 'memory_highlight',
      variants: ['memory_highlight', 'memory_highlight_celebration', 'memory_highlight_story'],
      cooldownDays: 7,
      dataSelection: LIFE_FEED_DATA_SELECTION,
    },
  },
  memory_highlight_story: {
    postType: 'memory_highlight',
    isVariant: true,
    description: 'Memory celebration - narrative style',
    contextSources: LIFE_FEED_CONTEXT_BY_POST_TYPE.memory_highlight,
    usageInfo: {
      dataTimeRange: 'Last 7 days',
      selectionLogic: 'random',
      variantGroup: 'memory_highlight',
      variants: ['memory_highlight', 'memory_highlight_celebration', 'memory_highlight_story'],
      cooldownDays: 7,
      dataSelection: LIFE_FEED_DATA_SELECTION,
    },
  },

  // streak_achievement (3-day cooldown) — requires actual consecutive-day streaks
  streak_achievement: {
    postType: 'streak_achievement',
    isVariant: false,
    description: 'Streak/habit celebration — only triggers when detectStreaks() finds consecutive-day activity (not just 3+ entries)',
    contextSources: LIFE_FEED_CONTEXT_BY_POST_TYPE.streak_achievement,
    usageInfo: {
      dataTimeRange: 'Last 7 days',
      selectionLogic: 'conditional',  // Only when detectStreaks() finds consecutive-day streaks
      cooldownDays: 3,
      dataSelection: {
        maxItems: { voiceNotes: 5, photos: 0, diaryEntries: 5 },
        scoringFactors: [
          { name: 'Diary Streak', weight: 'days', description: 'Consecutive days with diary entries (3+ days, uses calculateConsecutiveDays)' },
          { name: 'Voice Streak', weight: 'days', description: 'Consecutive days with voice notes (3+ days, uses calculateConsecutiveDays)' },
          { name: 'Workout Streak', weight: 'days', description: 'Consecutive days with workouts' },
          { name: 'Activity Streak', weight: 'count', description: 'Same activity visited 3+ times in period' },
        ],
      },
    },
  },

  // comparison (14-day cooldown)
  comparison: {
    postType: 'comparison',
    isVariant: false,
    description: 'Time period comparison',
    contextSources: LIFE_FEED_CONTEXT_BY_POST_TYPE.comparison,
    usageInfo: { dataTimeRange: 'Last 14 days vs previous 14 days', selectionLogic: 'always', cooldownDays: 14 },
  },

  // seasonal_reflection variants (14-day cooldown) — bi-weekly reflections
  seasonal_reflection: {
    postType: 'seasonal_reflection',
    isVariant: false,
    description: 'Bi-weekly reflection — summarizes recent activities, journal themes, and photos',
    contextSources: LIFE_FEED_CONTEXT_BY_POST_TYPE.seasonal_reflection,
    usageInfo: {
      dataTimeRange: 'Last 14-30 days',
      selectionLogic: 'random',
      variantGroup: 'seasonal_reflection',
      variants: ['seasonal_reflection', 'seasonal_reflection_growth', 'seasonal_reflection_gratitude'],
      cooldownDays: 14, // Reduced from 30 for more frequent generation
    },
  },
  seasonal_reflection_growth: {
    postType: 'seasonal_reflection',
    isVariant: true,
    description: 'Bi-weekly reflection - growth focused',
    contextSources: LIFE_FEED_CONTEXT_BY_POST_TYPE.seasonal_reflection,
    usageInfo: {
      dataTimeRange: 'Last 14-30 days',
      selectionLogic: 'random',
      variantGroup: 'seasonal_reflection',
      variants: ['seasonal_reflection', 'seasonal_reflection_growth', 'seasonal_reflection_gratitude'],
      cooldownDays: 14,
    },
  },
  seasonal_reflection_gratitude: {
    postType: 'seasonal_reflection',
    isVariant: true,
    description: 'Bi-weekly reflection - gratitude focused',
    contextSources: LIFE_FEED_CONTEXT_BY_POST_TYPE.seasonal_reflection,
    usageInfo: {
      dataTimeRange: 'Last 14-30 days',
      selectionLogic: 'random',
      variantGroup: 'seasonal_reflection',
      variants: ['seasonal_reflection', 'seasonal_reflection_growth', 'seasonal_reflection_gratitude'],
      cooldownDays: 14,
    },
  },

  // activity_pattern (7-day cooldown) — location + diary topic patterns
  activity_pattern: {
    postType: 'activity_pattern',
    isVariant: false,
    description: 'Discovered activity pattern — detects location patterns AND diary topic keywords',
    contextSources: LIFE_FEED_CONTEXT_BY_POST_TYPE.activity_pattern,
    usageInfo: {
      dataTimeRange: 'Last 7 days',
      selectionLogic: 'conditional',  // detectDayPatterns() + detectDiaryTopicPatterns()
      cooldownDays: 7,
      dataSelection: {
        maxItems: { voiceNotes: 3, photos: 0, diaryEntries: 5 },
        scoringFactors: [
          { name: 'Location Pattern', weight: 'count', description: 'Same activity at location 2+ times on same day-of-week' },
          { name: 'Diary Topic', weight: 'count', description: 'Activity keyword (run, gym, yoga, etc.) mentioned 2+ times in entries' },
        ],
      },
    },
  },

  // health_alert (1-day cooldown) — anomaly detection
  health_alert: {
    postType: 'health_alert',
    isVariant: false,
    description: 'Health metric awareness — detects spikes, drops, and trends in health data',
    contextSources: LIFE_FEED_CONTEXT_BY_POST_TYPE.health_alert,
    usageInfo: {
      dataTimeRange: 'Last 7 days (compares latest vs 7-day average)',
      selectionLogic: 'conditional',  // detectHealthAnomalies()
      cooldownDays: 1,
      dataSelection: {
        maxItems: { voiceNotes: 0, photos: 0, diaryEntries: 0 },
        scoringFactors: [
          { name: 'Spike Detection', weight: 'severity', description: 'Latest value >50% above 7-day average (medium) or >100% (high)' },
          { name: 'Drop Detection', weight: 'severity', description: 'Latest value >40% below 7-day average (for steps, energy)' },
          { name: 'Trend Detection', weight: 'low', description: '3+ consecutive days trending up or down' },
        ],
      },
    },
  },

  // category_insight variants (3-day cooldown) — threshold lowered to 3 posts
  category_insight: {
    postType: 'category_insight',
    isVariant: false,
    description: 'Category distribution — analyzes 3+ diary/voice/photo posts (lowered from 5)',
    contextSources: LIFE_FEED_CONTEXT_BY_POST_TYPE.category_insight,
    usageInfo: {
      dataTimeRange: 'Last 7 days',
      selectionLogic: 'random',
      variantGroup: 'category_insight',
      variants: ['category_insight', 'category_trend', 'category_correlation'],
      cooldownDays: 3,
      dataSelection: {
        maxItems: { voiceNotes: 5, photos: 5, diaryEntries: 5 },
        scoringFactors: [
          { name: 'Post Count', weight: 'count', description: 'Requires 3+ posts (lowered from 5 for new users)' },
          { name: 'Category Tags', weight: 'distribution', description: 'Analyzes tag/topic distribution' },
        ],
      },
    },
  },
  category_trend: {
    postType: 'category_insight',
    isVariant: true,
    description: 'Category distribution - trend focused',
    contextSources: LIFE_FEED_CONTEXT_BY_POST_TYPE.category_insight,
    usageInfo: {
      dataTimeRange: 'Last 7 days',
      selectionLogic: 'random',
      variantGroup: 'category_insight',
      variants: ['category_insight', 'category_trend', 'category_correlation'],
      cooldownDays: 3,
    },
  },
  category_correlation: {
    postType: 'category_insight',
    isVariant: true,
    description: 'Category distribution - correlation focused',
    contextSources: LIFE_FEED_CONTEXT_BY_POST_TYPE.category_insight,
    usageInfo: {
      dataTimeRange: 'Last 7 days',
      selectionLogic: 'random',
      variantGroup: 'category_insight',
      variants: ['category_insight', 'category_trend', 'category_correlation'],
      cooldownDays: 3,
    },
  },
};

/**
 * Get the post type for a LifeFeedGenerator prompt ID
 */
export function getLifeFeedPromptPostType(promptId: string): LifeFeedPromptInfo | null {
  return LIFE_FEED_PROMPT_POST_TYPES[promptId] || null;
}

/**
 * CarouselInsights per-prompt context source mapping
 *
 * AI insights (patterns/surprising/recommendation): Full context (all 4 sources + RAG vectors)
 * Data-stat facts (health_stat/activity_stat/location_stat): Domain-specific Firestore data only (no RAG)
 */
export interface CarouselPromptInfo {
  insightCategory: 'ai_insight' | 'data_stat';
  description: string;
  contextSources: string[];
  usesRAG: boolean;
}

const AI_INSIGHT_CONTEXT = ['healthData', 'locationData', 'photoMemories', 'voiceNotes'];
const HEALTH_STAT_CONTEXT = ['healthData'];
const ACTIVITY_STAT_CONTEXT = ['locationData'];
const LOCATION_STAT_CONTEXT = ['locationData'];

function aiInsightPrompt(description: string): CarouselPromptInfo {
  return { insightCategory: 'ai_insight', description, contextSources: AI_INSIGHT_CONTEXT, usesRAG: true };
}

function dataStatPrompt(description: string, contextSources: string[]): CarouselPromptInfo {
  return { insightCategory: 'data_stat', description, contextSources, usesRAG: false };
}

export const CAROUSEL_PROMPT_INFO: Record<string, CarouselPromptInfo> = {
  // System prompt
  system: { insightCategory: 'ai_insight', description: 'System instruction for all insight types', contextSources: [], usesRAG: false },

  // AI insights - use all context + RAG vectors
  insight_patterns: aiInsightPrompt('Pattern detection - generic fallback'),
  insight_surprising: aiInsightPrompt('Surprising discovery - generic fallback'),
  insight_recommendation: aiInsightPrompt('Actionable recommendation - generic fallback'),
  weekly_patterns: aiInsightPrompt('Weekly pattern detection'),
  weekly_surprising: aiInsightPrompt('Weekly surprising discovery'),
  weekly_recommendation: aiInsightPrompt('Weekly actionable recommendation'),
  monthly_patterns: aiInsightPrompt('Monthly pattern detection'),
  monthly_surprising: aiInsightPrompt('Monthly surprising discovery'),
  monthly_recommendation: aiInsightPrompt('Monthly actionable recommendation'),
  quarterly_patterns: aiInsightPrompt('Quarterly pattern detection'),
  quarterly_surprising: aiInsightPrompt('Quarterly surprising discovery'),
  quarterly_recommendation: aiInsightPrompt('Quarterly actionable recommendation'),

  // Data-stat facts - domain-specific Firestore data only, NO RAG
  insight_health_stat: dataStatPrompt('Health metric insight - generic fallback', HEALTH_STAT_CONTEXT),
  insight_activity_stat: dataStatPrompt('Activity distribution insight - generic fallback', ACTIVITY_STAT_CONTEXT),
  insight_location_stat: dataStatPrompt('Location insight - generic fallback', LOCATION_STAT_CONTEXT),
  weekly_health_stat: dataStatPrompt('Weekly health metric (steps, streaks, records)', HEALTH_STAT_CONTEXT),
  weekly_activity_stat: dataStatPrompt('Weekly top activities and patterns', ACTIVITY_STAT_CONTEXT),
  weekly_location_stat: dataStatPrompt('Weekly most visited places', LOCATION_STAT_CONTEXT),
  monthly_health_stat: dataStatPrompt('Monthly health trends and comparisons', HEALTH_STAT_CONTEXT),
  monthly_activity_stat: dataStatPrompt('Monthly activity diversity and frequency', ACTIVITY_STAT_CONTEXT),
  monthly_location_stat: dataStatPrompt('Monthly location exploration radius', LOCATION_STAT_CONTEXT),
  quarterly_health_stat: dataStatPrompt('Quarterly health trajectory', HEALTH_STAT_CONTEXT),
  quarterly_activity_stat: dataStatPrompt('Quarterly activity evolution', ACTIVITY_STAT_CONTEXT),
  quarterly_location_stat: dataStatPrompt('Quarterly location patterns', LOCATION_STAT_CONTEXT),
};

export function getCarouselPromptInfo(promptId: string): CarouselPromptInfo | null {
  return CAROUSEL_PROMPT_INFO[promptId] || null;
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
