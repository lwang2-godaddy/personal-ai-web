/**
 * ServiceOperations.ts
 *
 * Shared data model defining the bidirectional mapping between services and operations.
 *
 * Key Concepts:
 * - Services = Code that triggers AI operations (e.g., RAGEngine, SentimentAnalysisService)
 * - Operations = Type of AI action (e.g., embedding, chat_completion, transcription)
 * - One service can trigger multiple operations (e.g., RAGEngine -> embedding + pinecone_query + chat_completion)
 * - Multiple services can contribute to the same operation
 */

/**
 * All operation types tracked in the system
 */
export type OperationType =
  | 'embedding'
  | 'chat_completion'
  | 'transcription'
  | 'vision'
  | 'tts'
  | 'pinecone_query'
  | 'pinecone_upsert'
  | 'pinecone_delete'
  | 'sentiment_analysis'
  | 'entity_extraction'
  | 'event_extraction'
  | 'memory_generation'
  | 'suggestion'
  | 'life_feed';

/**
 * Service -> Operations mapping
 * Defines which operations each service can trigger
 */
export const SERVICE_OPERATIONS_MAP: Record<string, OperationType[]> = {
  OpenAIService: ['chat_completion', 'embedding', 'transcription', 'vision', 'tts'],
  RAGEngine: ['embedding', 'pinecone_query', 'chat_completion'],
  QueryRAGServer: ['embedding', 'pinecone_query', 'chat_completion'],
  SentimentAnalysisService: ['sentiment_analysis'],
  EntityExtractionService: ['entity_extraction'],
  EventExtractionService: ['event_extraction'],
  MemoryGeneratorService: ['memory_generation'],
  LifeFeedGenerator: ['life_feed'],
  DailySummaryService: ['chat_completion'],
  KeywordGenerator: ['chat_completion'],
  CarouselInsights: ['chat_completion'],
};

/**
 * Operation -> Services reverse mapping (auto-generated from SERVICE_OPERATIONS_MAP)
 * Defines which services contribute to each operation
 */
export const OPERATION_SERVICES_MAP: Record<OperationType, string[]> = (() => {
  const reverseMap: Record<string, string[]> = {};

  // Initialize all operation types with empty arrays
  const allOperations: OperationType[] = [
    'embedding', 'chat_completion', 'transcription', 'vision', 'tts',
    'pinecone_query', 'pinecone_upsert', 'pinecone_delete',
    'sentiment_analysis', 'entity_extraction', 'event_extraction',
    'memory_generation', 'suggestion', 'life_feed',
  ];
  allOperations.forEach((op) => {
    reverseMap[op] = [];
  });

  // Build reverse mapping
  Object.entries(SERVICE_OPERATIONS_MAP).forEach(([service, operations]) => {
    operations.forEach((operation) => {
      if (!reverseMap[operation]) {
        reverseMap[operation] = [];
      }
      reverseMap[operation].push(service);
    });
  });

  return reverseMap as Record<OperationType, string[]>;
})();

/**
 * User-friendly labels for operations
 */
export const OPERATION_LABELS: Record<OperationType, string> = {
  embedding: 'Search Indexing',
  chat_completion: 'AI Chat',
  transcription: 'Voice Transcription',
  vision: 'Photo Description',
  tts: 'Voice Synthesis',
  pinecone_query: 'Memory Search',
  pinecone_upsert: 'Memory Indexing',
  pinecone_delete: 'Memory Cleanup',
  sentiment_analysis: 'Mood Detection',
  entity_extraction: 'People & Places',
  event_extraction: 'Events & Dates',
  memory_generation: 'Memory Summaries',
  suggestion: 'Smart Suggestions',
  life_feed: 'Activity Posts',
};

/**
 * Icons for operations (emoji)
 */
export const OPERATION_ICONS: Record<OperationType, string> = {
  embedding: '📊',
  chat_completion: '💬',
  transcription: '🎤',
  vision: '📷',
  tts: '🔊',
  pinecone_query: '🔍',
  pinecone_upsert: '💾',
  pinecone_delete: '🗑️',
  sentiment_analysis: '😊',
  entity_extraction: '👥',
  event_extraction: '📅',
  memory_generation: '📝',
  suggestion: '💡',
  life_feed: '📰',
};

/**
 * User-friendly display names for services
 */
export const SERVICE_DISPLAY_NAMES: Record<string, string> = {
  OpenAIService: 'Chat Responses',
  RAGEngine: 'Context Search',
  QueryRAGServer: 'Server Chat',
  SentimentAnalysisService: 'Mood Detection',
  EntityExtractionService: 'People & Places',
  EventExtractionService: 'Events & Dates',
  MemoryGeneratorService: 'Memory Summaries',
  LifeFeedGenerator: 'Life Feed Posts',
  DailySummaryService: 'Daily Summaries',
  KeywordGenerator: 'Life Keywords',
  CarouselInsights: 'Carousel Fun Facts',
};

/**
 * Short display names for services (for badges/chips)
 */
export const SERVICE_SHORT_NAMES: Record<string, string> = {
  OpenAIService: 'Chat',
  RAGEngine: 'RAG',
  QueryRAGServer: 'Server',
  SentimentAnalysisService: 'Mood',
  EntityExtractionService: 'Entity',
  EventExtractionService: 'Events',
  MemoryGeneratorService: 'Memory',
  LifeFeedGenerator: 'Feed',
  DailySummaryService: 'Summary',
  KeywordGenerator: 'Keywords',
  CarouselInsights: 'Carousel',
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the user-friendly display name for a service
 */
export function getServiceDisplayName(serviceId: string): string {
  return SERVICE_DISPLAY_NAMES[serviceId] || serviceId;
}

/**
 * Get the short name for a service (for badges)
 */
export function getServiceShortName(serviceId: string): string {
  return SERVICE_SHORT_NAMES[serviceId] || serviceId.replace('Service', '');
}

/**
 * Get the list of operations that a service can trigger
 */
export function getServiceOperations(serviceId: string): OperationType[] {
  return SERVICE_OPERATIONS_MAP[serviceId] || [];
}

/**
 * Get the list of services that contribute to an operation
 */
export function getOperationServices(operation: OperationType): string[] {
  return OPERATION_SERVICES_MAP[operation] || [];
}

/**
 * Get label for an operation
 */
export function getOperationLabel(operation: string): string {
  return OPERATION_LABELS[operation as OperationType] || operation;
}

/**
 * Get icon for an operation
 */
export function getOperationIcon(operation: string): string {
  return OPERATION_ICONS[operation as OperationType] || '⚙️';
}

/**
 * Check if a given operation type is valid
 */
export function isValidOperationType(operation: string): operation is OperationType {
  return operation in OPERATION_LABELS;
}

/**
 * Get all services that use a specific operation
 * Returns an array of { serviceId, displayName } objects
 */
export function getServicesForOperation(operation: OperationType): Array<{ id: string; name: string; shortName: string }> {
  const services = OPERATION_SERVICES_MAP[operation] || [];
  return services.map((serviceId) => ({
    id: serviceId,
    name: getServiceDisplayName(serviceId),
    shortName: getServiceShortName(serviceId),
  }));
}

/**
 * Get all operations for a service with their labels and icons
 * Returns an array of { operation, label, icon } objects
 */
export function getOperationsForService(serviceId: string): Array<{ operation: OperationType; label: string; icon: string }> {
  const operations = SERVICE_OPERATIONS_MAP[serviceId] || [];
  return operations.map((operation) => ({
    operation,
    label: OPERATION_LABELS[operation],
    icon: OPERATION_ICONS[operation],
  }));
}
