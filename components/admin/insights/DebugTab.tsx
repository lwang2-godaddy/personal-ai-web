'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api/client';

interface DebugTabProps {
  onSaving?: (saving: boolean) => void;
}

interface ServiceRequirement {
  name: string;
  description: string;
  collection: string;
  requiredFields: string[];
  minimumRecords: number;
  additionalRequirements: string[];
  outputType: string;
  postType: string;
  cooldownDays: number;
  knownIssues?: string[];
}

interface UserDataStats {
  userId: string;
  locationData: {
    total: number;
    withActivity: number;
    withVisitCount5Plus: number;
    sampleActivities: string[];
  };
  healthData: {
    total: number;
    dateFormat: 'timestamp' | 'string' | 'unknown';
    sampleTypes: string[];
  };
  moodEntries: {
    total: number;
  };
}

// FunFactGenerator service info (separate from InsightsOrchestrator)
const FUN_FACT_SERVICE: ServiceRequirement = {
  name: 'FunFactGenerator',
  description: 'Generates personalized fun facts like milestones, streaks, comparisons, and statistics',
  collection: 'healthData, locationData, photoMemories, voiceNotes',
  requiredFields: ['userId'],
  minimumRecords: 0,
  additionalRequirements: [
    'Health Facts: Needs steps data (90 days lookback)',
    'Activity Facts: Needs 3+ locations with activity tags',
    'Location Facts: Any location data (milestone at 10, 25, 50, 100 locations)',
    'Memory Facts: 10+ photos for milestone, any voice notes',
    'Avoids recently sent facts (30 day deduplication)',
  ],
  outputType: 'FunFact[]',
  postType: 'milestone, comparison, streak_achievement, pattern_prediction, reflective_insight',
  cooldownDays: 7,
};

// InsightsOrchestrator sub-services
const ORCHESTRATOR_SERVICES: ServiceRequirement[] = [
  {
    name: 'PatternDetectionService',
    description: 'Detects recurring activity patterns (e.g., "You usually play badminton on Tuesdays at 7 PM")',
    collection: 'locationData',
    requiredFields: ['userId', 'activity', 'visitCount', 'timestamp'],
    minimumRecords: 5,
    additionalRequirements: [
      'Needs 5+ tagged locations total',
      'Needs 5+ visits to the SAME activity type',
      'Confidence score must be >= 0.7',
      'Analyzes past 90 days of data',
    ],
    outputType: 'PatternInsight[]',
    postType: 'pattern_prediction',
    cooldownDays: 1,
  },
  {
    name: 'AnomalyDetectionService (Health)',
    description: 'Detects unusual health metrics (e.g., "Your heart rate is 10% higher than usual")',
    collection: 'healthData',
    requiredFields: ['userId', 'startDate', 'type', 'value'],
    minimumRecords: 10,
    additionalRequirements: [
      'Needs 10+ health records per metric type',
      'Needs 5+ baseline records + 3+ recent records',
      'z-score must be >= 1.5 (anomaly threshold)',
      'Anomaly must persist for 3+ consecutive days',
      'Analyzes past 30 days',
      '✅ Handles both Timestamp and ISO string date formats',
    ],
    outputType: 'AnomalyInsight[]',
    postType: 'reflective_insight',
    cooldownDays: 3,
  },
  {
    name: 'AnomalyDetectionService (Activity)',
    description: 'Detects missed activity patterns (e.g., "You haven\'t visited your gym in 2 weeks")',
    collection: 'locationData',
    requiredFields: ['userId', 'activity', 'visitCount', 'timestamp', 'address'],
    minimumRecords: 3,
    additionalRequirements: [
      'Needs visitCount >= 5 (favorite places only)',
      '3+ locations with same activity',
      'Absence must be > 2x average visit frequency',
      'Analyzes past 90 days',
    ],
    outputType: 'AnomalyInsight[]',
    postType: 'reflective_insight',
    cooldownDays: 3,
  },
  {
    name: 'MoodCorrelationService',
    description: 'Correlates mood with activities, sleep, weather',
    collection: 'moodEntries',
    requiredFields: ['userId', 'primaryEmotion', 'sentimentScore', 'createdAt (Timestamp)'],
    minimumRecords: 7,
    additionalRequirements: [
      '7+ mood entries required',
      'moodEntries auto-created from voiceNotes & textNotes via Cloud Function triggers',
      '  → onVoiceNoteCreated runs SentimentAnalysisService → creates moodEntry',
      '  → onTextNoteCreated runs SentimentAnalysisService → creates moodEntry',
      'createdAt stored as serverTimestamp() = Firestore Timestamp (not number!)',
      'Also reads healthData for sleep/steps correlation',
      'Also reads locationData for activity correlation',
    ],
    outputType: 'MoodCorrelation[]',
    postType: 'reflective_insight',
    cooldownDays: 3,
    knownIssues: [
      '✅ FIXED (Feb 2026): generateMoodPatterns was querying with getTime() but moodEntries.createdAt is Timestamp',
    ],
  },
  {
    name: 'PredictionService',
    description: 'Predicts future activities and mood trends',
    collection: 'N/A (depends on other services)',
    requiredFields: [],
    minimumRecords: 0,
    additionalRequirements: [
      'Depends on PatternDetectionService results',
      'If patterns return 0, predictions return 0',
      'Generates activity and mood predictions',
    ],
    outputType: 'Prediction[]',
    postType: 'pattern_prediction',
    cooldownDays: 1,
  },
];

// Combined list for display
const SERVICES: ServiceRequirement[] = [FUN_FACT_SERVICE, ...ORCHESTRATOR_SERVICES];

const POST_TYPE_MAPPINGS = [
  // FunFactGenerator outputs
  { service: 'FunFact (milestone)', postType: 'milestone', cooldown: '7 days', emoji: '🎉', source: 'FunFactGenerator' },
  { service: 'FunFact (comparison)', postType: 'comparison', cooldown: '14 days', emoji: '📊', source: 'FunFactGenerator' },
  { service: 'FunFact (streak)', postType: 'streak_achievement', cooldown: '3 days', emoji: '🔥', source: 'FunFactGenerator' },
  { service: 'FunFact (pattern)', postType: 'pattern_prediction', cooldown: '1 day', emoji: '🔍', source: 'FunFactGenerator' },
  { service: 'FunFact (statistic)', postType: 'reflective_insight', cooldown: '3 days', emoji: '📈', source: 'FunFactGenerator' },
  // InsightsOrchestrator outputs
  { service: 'PatternInsight', postType: 'pattern_prediction', cooldown: '1 day', emoji: '🔍', source: 'InsightsOrchestrator' },
  { service: 'HealthAnomaly', postType: 'reflective_insight', cooldown: '3 days', emoji: '❤️', source: 'InsightsOrchestrator' },
  { service: 'ActivityAnomaly', postType: 'reflective_insight', cooldown: '3 days', emoji: '📍', source: 'InsightsOrchestrator' },
  { service: 'MoodCorrelation', postType: 'reflective_insight', cooldown: '3 days', emoji: '🧭', source: 'InsightsOrchestrator' },
  { service: 'Prediction', postType: 'pattern_prediction', cooldown: '1 day', emoji: '🔮', source: 'InsightsOrchestrator' },
];

// Other AI Analysis Services (write to different collections)
const OTHER_AI_SERVICES = {
  // FunFactsService (AI-based) - NOT the same as FunFactGenerator
  funFactsService: {
    name: 'FunFactsService',
    type: 'AI-Based',
    description: 'Uses RAG + GPT-4o-mini to generate personalized fun facts with LLM intelligence',
    outputCollection: 'funFacts',
    functions: [
      {
        name: 'generateFunFacts',
        type: 'scheduled',
        schedule: 'Daily at 6 AM UTC',
        description: 'Generates fun facts for all active users',
      },
      {
        name: 'generateFunFactsNow',
        type: 'onCall',
        trigger: 'User taps "Refresh" in Fun Facts carousel',
        description: 'Generates up to 3 fun facts on-demand',
      },
    ],
    factTypes: ['patterns', 'surprising', 'recommendation'],
    periodTypes: ['weekly', 'monthly', 'quarterly'],
    dataUsed: ['Pinecone vectors (via RAG)', 'User preferences', 'Historical data'],
    howItWorks: [
      '1. Loops through ALL period types: weekly, monthly, quarterly (generates 9 facts total)',
      '2. For each period, calculates date range (e.g., weekly = Mon-Sun of current week)',
      '3. Queries Pinecone for vectors within that date range',
      '4. Uses CarouselInsights prompts: {periodType}_{factType} (e.g., weekly_patterns)',
      '5. Calls GPT-4o-mini 3x per period (patterns, surprising, recommendation)',
      '6. Saves all facts to funFacts collection with viewed/hidden flags',
    ],
    periodScheduling: {
      title: 'How Period Selection Works',
      explanation: 'FunFactsService does NOT choose between weekly OR monthly. It generates for ALL periods every time.',
      details: [
        'Default periodTypes: [\'weekly\', \'monthly\', \'quarterly\'] (line 321 in FunFactsService.ts)',
        'Each period generates 3 facts (patterns, surprising, recommendation)',
        'Weekly: Current week (Monday to Sunday)',
        'Monthly: Current month (1st to last day)',
        'Quarterly: Current quarter (Jan-Mar, Apr-Jun, Jul-Sep, Oct-Dec)',
        'Date ranges calculated by getPeriodDates() function (lines 364-451)',
        'RAG context filtered by period date range for relevant data',
      ],
    },
    displayLocation: 'Fun Facts carousel on Home screen (mobile app)',
  },

  // DailySummaryService - Generates daily/weekly summaries
  dailySummaryService: {
    name: 'DailySummaryService',
    type: 'AI-Powered',
    description: 'Generates personalized daily and weekly summary notifications',
    outputCollection: 'N/A (sends push notifications)',
    functions: [
      {
        name: 'sendDailySummary',
        type: 'scheduled',
        schedule: 'Daily at 8 PM UTC (0 20 * * *)',
        description: 'Sends daily summary notifications to users with enabled preferences',
      },
      {
        name: 'generateSummary',
        type: 'onCall',
        trigger: 'Called by sendDailySummary or direct invocation',
        description: 'Generates summary text using DailySummaryService prompts',
      },
    ],
    summaryTypes: ['daily_summary', 'weekly_summary'],
    dataUsed: ['healthData (steps, workouts)', 'locationData (visits)', 'events', 'moodEntries'],
    howItWorks: [
      '1. sendDailySummary scheduled function runs at 8 PM UTC daily',
      '2. Queries users with dailySummary.enabled = true',
      '3. Fetches user\'s health, location, events data for the day/week',
      '4. Loads DailySummaryService prompts (dailySummary.yaml)',
      '5. Uses GPT-4o-mini to generate personalized summary text',
      '6. Sends push notification via Firebase Cloud Messaging (FCM)',
      '7. Records notification in notificationHistory collection',
    ],
    promptFile: 'firebase/functions/src/config/prompts/locales/en/dailySummary.yaml',
    promptServiceId: 'DailySummaryService',
    displayLocation: 'Push notification (not in app UI)',
  },

  // ThisDayService - "On This Day" memories
  thisDayService: {
    name: 'ThisDayService',
    type: 'AI-Powered',
    description: 'Generates "On This Day" memories from past years (e.g., "1 year ago today...")',
    outputCollection: 'users/{userId}/thisDayMemories',
    functions: [
      {
        name: 'generateThisDayMemories',
        type: 'onCall',
        trigger: 'User opens "This Day" section on Home screen',
        description: 'Generates memories for the current date from past years',
      },
    ],
    memoryTypes: ['this_day_memory', 'this_day_comparison'],
    dataUsed: ['memories collection ✅ (all source types: voice, text, photo, location, health)'],
    dataNotUsed: ['Original collections directly (queries memories instead)'],
    architectureFix: {
      title: '✅ Architecture Fixed (Feb 2025)',
      description: 'ThisDayService now queries the memories collection by sourceDate instead of original data',
      improvements: [
        'Uses pre-generated AI titles/summaries from memories (no redundant OpenAI calls)',
        'Includes ALL source types: voice, text, photo, location, health',
        'Respects memory relevanceScore for prioritization',
        'Updates memory surfacedCount when surfaced',
        'Handles both ISO string and timestamp sourceDate formats',
      ],
      testFile: 'personal-ai-web/scripts/integration-tests/tests/this-day-memories.test.ts',
    },
    howItWorks: [
      '1. User opens "This Day" section → triggers generateThisDayMemories',
      '2. Checks cache: users/{userId}/thisDayMemories/{MM-DD}',
      '3. If cached (24h TTL, same language), returns cached data',
      '4. Queries MEMORIES collection by sourceDate (ISO string, fallback to timestamp)',
      '5. Groups memories by year (1 year ago, 2 years ago, etc.)',
      '6. Sorts by relevanceScore to get most important memory per year',
      '7. Uses pre-generated memory.summary as narrative (NO redundant AI call!)',
      '8. Caches results in Firestore for fast subsequent loads',
    ],
    promptFile: 'firebase/functions/src/config/prompts/locales/en/thisDayMemories.yaml',
    promptServiceId: 'ThisDayService',
    displayLocation: '"This Day" section on Home screen (mobile app)',
    caching: {
      location: 'users/{userId}/thisDayMemories',
      keyFormat: '{MM-DD} (e.g., "02-08" for Feb 8)',
      expiry: '24 hours',
    },
  },

  // KeywordGenerator service
  keywordGenerator: {
    name: 'KeywordGenerator',
    type: 'AI-Powered',
    description: 'Analyzes Pinecone vectors to generate thematic life keywords',
    outputCollection: 'lifeKeywords',
    functions: [
      {
        name: 'generateWeeklyKeywords',
        type: 'scheduled',
        schedule: 'Every Monday at 8 AM UTC',
        description: 'Generates weekly keywords for active users',
      },
      {
        name: 'generateMonthlyKeywords',
        type: 'scheduled',
        schedule: '1st of month at 8 AM UTC',
        description: 'Generates monthly keywords for active users',
      },
      {
        name: 'generateKeywordsNow',
        type: 'onCall',
        trigger: 'User requests keyword refresh',
        description: 'Generates keywords on-demand',
      },
    ],
    howItWorks: [
      '1. Queries Pinecone for user\'s vectors in time range',
      '2. Groups vectors by semantic similarity (clustering)',
      '3. Identifies dominant themes/topics',
      '4. Uses OpenAI to generate descriptive keywords',
      '5. Saves keywords with relevance scores to lifeKeywords',
    ],
    displayLocation: 'Keywords section on Insights screen (mobile app)',
  },

  // LifeConnectionsAnalyzer service
  lifeConnectionsAnalyzer: {
    name: 'LifeConnectionsAnalyzer',
    type: 'Statistical + AI',
    description: 'Analyzes cross-domain correlations (e.g., sleep → mood, exercise → productivity)',
    outputCollection: 'users/{userId}/lifeConnections',
    functions: [
      {
        name: 'analyzeLifeConnectionsScheduled',
        type: 'scheduled',
        schedule: 'Daily at 4 AM UTC',
        description: 'Runs correlation analysis for active users',
      },
      {
        name: 'analyzeLifeConnections',
        type: 'onCall',
        trigger: 'User views Life Connections screen',
        description: 'Analyzes connections on-demand',
      },
    ],
    correlationTypes: [
      'sleep_duration → mood',
      'exercise_frequency → energy_level',
      'location_visits → social_activity',
      'voice_notes → emotional_state',
    ],
    howItWorks: [
      '1. Fetches health, location, mood data from Firestore',
      '2. Calculates Pearson correlation coefficients',
      '3. Identifies statistically significant correlations (p < 0.05)',
      '4. Uses OpenAI to generate human-readable explanations',
      '5. Saves to users/{userId}/lifeConnections subcollection',
    ],
    displayLocation: 'Life Connections tab on Insights screen (mobile app)',
  },

  // MemoryGeneratorService - Creates structured memories from data sources
  memoryGeneratorService: {
    name: 'MemoryGeneratorService',
    type: 'AI-Powered',
    description: 'Creates structured memories from voice notes, text notes, and photos with AI-generated titles, summaries, entity extraction, and triggers for proactive surfacing',
    outputCollection: 'memories',
    triggerCollection: 'memoryTriggers',
    functions: [
      {
        name: 'onVoiceNoteCreated',
        type: 'trigger',
        trigger: 'Firestore onCreate: voiceNotes/{noteId}',
        description: 'Automatically creates memory when voice note is created',
      },
      {
        name: 'onTextNoteCreated',
        type: 'trigger',
        trigger: 'Firestore onCreate: textNotes/{noteId}',
        description: 'Automatically creates memory when text note is created',
      },
      {
        name: 'onPhotoMemoryCreated',
        type: 'trigger',
        trigger: 'Firestore onCreate: photoMemories/{photoId}',
        description: 'Automatically creates memory when photo is uploaded',
      },
    ],
    memoryVsOriginal: {
      title: 'Memory vs Original Content Comparison',
      explanation: 'Memories are an AI-enriched layer on top of original content',
      comparison: [
        { field: 'Title', memory: 'AI-generated (e.g., "A Warm Hello on a Chilly Day")', original: 'None - original has no title' },
        { field: 'Summary', memory: 'AI-cleaned/polished version (max 150 chars)', original: 'Raw transcription/content' },
        { field: 'Entities', memory: 'Extracted people, places, topics, events', original: 'None - no entity extraction' },
        { field: 'Triggers', memory: 'location, anniversary, entity, context, time', original: 'None - no trigger system' },
        { field: 'Relevance', memory: 'Score 0-1 based on entities and content length', original: 'None' },
        { field: 'Embedding', memory: 'Stored with type: "memory" in Pinecone', original: 'Stored with type: "voice"/"text"/"photo"' },
      ],
    },
    triggerTypes: {
      title: 'Memory Trigger Types',
      types: [
        { type: 'location', description: 'Surface when user returns to location (500m radius, 5min dwell)', condition: 'Memory has coordinates' },
        { type: 'anniversary', description: 'Surface on yearly anniversary of sourceDate (±4 hours)', condition: 'Always added' },
        { type: 'entity', description: 'Surface when user mentions extracted entities', condition: 'Has entities with confidence > 0.7' },
        { type: 'context', description: 'Surface when semantically similar content is created', condition: 'Voice/text with > 50 chars' },
        { type: 'time', description: 'Surface on recurring time patterns (weekly)', condition: 'Content contains: weekly, daily, routine, etc.' },
      ],
    },
    howItWorks: [
      '1. Cloud Function triggered when user creates voice note, text note, or photo',
      '2. Get user\'s preferred language from Firestore',
      '3. Extract entities (people, places, topics) via EntityExtractionService',
      '4. Generate title + summary using GPT-4o-mini (memory.yaml prompts)',
      '5. Determine triggerTypes based on content and entities',
      '6. Generate embedding for the summary',
      '7. Calculate relevance score (entity count, content length, people bonus)',
      '8. Store embedding in Pinecone with type: "memory"',
      '9. Save memory to Firestore "memories" collection',
      '10. Create trigger records in "memoryTriggers" collection',
    ],
    usedBy: [
      { feature: 'On This Day Cards', usage: 'Displays memories with nice titles on anniversary dates' },
      { feature: 'Related Memories', usage: 'Shows semantically similar past content when new content created' },
      { feature: 'Location Reminders', usage: 'Triggers push notifications when returning to memorable places' },
      { feature: 'Entity Triggers', usage: 'Surfaces memories when user mentions extracted people/places in chat' },
    ],
    notUsedBy: [
      { feature: 'RAG Chat', reason: 'Chat queries ORIGINAL embeddings (voice/text/photo), not memory embeddings' },
      { feature: 'Random Memory', reason: 'Uses original FeedItems directly, not memory collection' },
    ],
    recentlyFixed: [
      { feature: 'ThisDayService ✅', when: 'Feb 2025', description: 'Now queries memories collection by sourceDate (was querying original data)' },
    ],
    promptFile: 'firebase/functions/src/config/prompts/locales/en/memory.yaml',
    promptServiceId: 'MemoryGeneratorService',
    serviceFile: 'firebase/functions/src/services/memory/MemoryGeneratorService.ts',
    displayLocation: 'On This Day section, Related Memories bottom sheet, Location-triggered notifications',
  },
};

// All Cloud Functions that write to lifeFeedPosts collection
const ALL_LIFE_FEED_SOURCES = {
  // Source 1: LifeFeedGenerator (AI-powered Twitter-style posts)
  lifeFeedGenerator: {
    name: 'LifeFeedGenerator',
    description: 'AI-powered, first-person Twitter-style posts from user data',
    functions: [
      {
        name: 'generateLifeFeedPosts',
        type: 'scheduled',
        schedule: '8 AM, 2 PM, 8 PM UTC daily',
        description: 'Runs 3x daily for all active users',
      },
      {
        name: 'generateLifeFeedNow',
        type: 'onCall',
        trigger: 'User taps "Refresh" in Life Feed',
        description: 'Generates up to 3 posts on-demand',
      },
    ],
    postTypes: ['life_summary', 'milestone', 'pattern_prediction', 'reflective_insight', 'memory_highlight', 'streak_achievement', 'comparison', 'seasonal_reflection', 'activity_pattern', 'health_alert', 'category_insight'],
    dataUsed: ['healthData', 'locationData', 'photoMemories', 'voiceNotes', 'textNotes', 'events'],
  },
  // Source 2: InsightsIntegrationService (FunFacts + InsightsOrchestrator)
  insightsIntegration: {
    name: 'InsightsIntegrationService',
    description: 'Converts FunFacts and analytical insights to LifeFeedPost format',
    functions: [
      {
        name: 'generateUnifiedInsightsScheduled',
        type: 'scheduled',
        schedule: '7:30 AM UTC daily',
        description: 'Runs daily for all active users',
      },
      {
        name: 'generateUnifiedInsightsNow',
        type: 'onCall',
        trigger: 'User taps "Refresh" in Insights screen',
        description: 'Generates insights on-demand (10 posts/day limit)',
      },
    ],
    subServices: ['FunFactGenerator', 'InsightsOrchestrator (5 sub-services)'],
    postTypes: ['milestone', 'comparison', 'streak_achievement', 'pattern_prediction', 'reflective_insight'],
    dataUsed: ['healthData', 'locationData', 'photoMemories', 'voiceNotes', 'moodEntries'],
  },
};

/**
 * Debug Tab - InsightsIntegrationService Architecture & Data Dependencies
 * Shows service requirements, data flow, and helps diagnose why 0 insights are generated
 *
 * The unified insights system consists of:
 * 1. FunFactGenerator - Generates fun facts from user data (milestones, streaks, etc.)
 * 2. InsightsOrchestrator - Coordinates 5 sub-services for analytical insights
 *
 * Both are called by InsightsIntegrationService.generateUnifiedInsights()
 */
export default function DebugTab({ onSaving }: DebugTabProps) {
  const [loading, setLoading] = useState(false);
  const [userStats, setUserStats] = useState<UserDataStats | null>(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [expandedService, setExpandedService] = useState<string | null>(null);

  // Analyze user data
  const analyzeUserData = useCallback(async (userId: string) => {
    if (!userId.trim()) {
      setError('Please enter a user ID');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const stats = await apiGet<UserDataStats>(`/api/admin/insights/debug?userId=${encodeURIComponent(userId)}`);
      setUserStats(stats);
    } catch (err: any) {
      console.error('Failed to analyze user data:', err);
      setError(err.message || 'Failed to analyze user data');
      setUserStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const getStatusBadge = (meetsRequirement: boolean) => (
    <span className={`px-2 py-1 rounded text-xs font-medium ${
      meetsRequirement ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
    }`}>
      {meetsRequirement ? 'Meets Requirements' : 'Insufficient Data'}
    </span>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <span>🔧</span> InsightsOrchestrator Debug Console
        </h2>
        <p className="mt-2 text-purple-100">
          Understand why insights are or aren&apos;t being generated. View service data dependencies and diagnose issues.
        </p>
      </div>

      {/* All Life Feed Sources */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span>📝</span> All Sources That Write to lifeFeedPosts Collection
        </h3>
        <p className="text-gray-600 mb-6">
          There are <strong>2 independent systems</strong> that generate Life Feed posts. They both write to the same <code className="bg-indigo-100 text-indigo-800 px-1 rounded font-medium">lifeFeedPosts</code> collection.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Source 1: LifeFeedGenerator */}
          <div className="border-2 border-cyan-300 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-lg p-5">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🐦</span>
              <div>
                <h4 className="font-bold text-cyan-900 text-lg">{ALL_LIFE_FEED_SOURCES.lifeFeedGenerator.name}</h4>
                <p className="text-sm text-cyan-700">{ALL_LIFE_FEED_SOURCES.lifeFeedGenerator.description}</p>
              </div>
            </div>

            {/* Functions */}
            <div className="mb-4">
              <h5 className="font-semibold text-cyan-800 mb-2 text-sm">Cloud Functions:</h5>
              <div className="space-y-2">
                {ALL_LIFE_FEED_SOURCES.lifeFeedGenerator.functions.map((fn) => (
                  <div key={fn.name} className="bg-white/70 rounded p-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span>{fn.type === 'scheduled' ? '⏰' : '👆'}</span>
                      <code className="font-medium text-cyan-800">{fn.name}</code>
                      <span className={`px-2 py-0.5 rounded text-xs ${fn.type === 'scheduled' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                        {fn.type}
                      </span>
                    </div>
                    <p className="text-gray-600 text-xs mt-1 ml-6">
                      {fn.type === 'scheduled' ? fn.schedule : fn.trigger}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Post Types */}
            <div className="mb-4">
              <h5 className="font-semibold text-cyan-800 mb-2 text-sm">Post Types Generated ({ALL_LIFE_FEED_SOURCES.lifeFeedGenerator.postTypes.length}):</h5>
              <div className="flex flex-wrap gap-1">
                {ALL_LIFE_FEED_SOURCES.lifeFeedGenerator.postTypes.map((pt) => (
                  <span key={pt} className="px-2 py-0.5 bg-cyan-100 text-cyan-800 rounded text-xs">{pt}</span>
                ))}
              </div>
            </div>

            {/* Data Sources */}
            <div>
              <h5 className="font-semibold text-cyan-800 mb-2 text-sm">Data Sources:</h5>
              <div className="flex flex-wrap gap-1">
                {ALL_LIFE_FEED_SOURCES.lifeFeedGenerator.dataUsed.map((d) => (
                  <code key={d} className="px-2 py-0.5 bg-white text-gray-700 rounded text-xs">{d}</code>
                ))}
              </div>
            </div>
          </div>

          {/* Source 2: InsightsIntegrationService */}
          <div className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-5">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🔮</span>
              <div>
                <h4 className="font-bold text-purple-900 text-lg">{ALL_LIFE_FEED_SOURCES.insightsIntegration.name}</h4>
                <p className="text-sm text-purple-700">{ALL_LIFE_FEED_SOURCES.insightsIntegration.description}</p>
              </div>
            </div>

            {/* Functions */}
            <div className="mb-4">
              <h5 className="font-semibold text-purple-800 mb-2 text-sm">Cloud Functions:</h5>
              <div className="space-y-2">
                {ALL_LIFE_FEED_SOURCES.insightsIntegration.functions.map((fn) => (
                  <div key={fn.name} className="bg-white/70 rounded p-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span>{fn.type === 'scheduled' ? '⏰' : '👆'}</span>
                      <code className="font-medium text-purple-800">{fn.name}</code>
                      <span className={`px-2 py-0.5 rounded text-xs ${fn.type === 'scheduled' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                        {fn.type}
                      </span>
                    </div>
                    <p className="text-gray-600 text-xs mt-1 ml-6">
                      {fn.type === 'scheduled' ? fn.schedule : fn.trigger}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Sub-Services */}
            <div className="mb-4">
              <h5 className="font-semibold text-purple-800 mb-2 text-sm">Sub-Services:</h5>
              <div className="space-y-1">
                {ALL_LIFE_FEED_SOURCES.insightsIntegration.subServices.map((s) => (
                  <div key={s} className="flex items-center gap-2 text-sm">
                    <span className="text-purple-500">→</span>
                    <span className="text-purple-700">{s}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Post Types */}
            <div className="mb-4">
              <h5 className="font-semibold text-purple-800 mb-2 text-sm">Post Types Generated ({ALL_LIFE_FEED_SOURCES.insightsIntegration.postTypes.length}):</h5>
              <div className="flex flex-wrap gap-1">
                {ALL_LIFE_FEED_SOURCES.insightsIntegration.postTypes.map((pt) => (
                  <span key={pt} className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs">{pt}</span>
                ))}
              </div>
            </div>

            {/* Data Sources */}
            <div>
              <h5 className="font-semibold text-purple-800 mb-2 text-sm">Data Sources:</h5>
              <div className="flex flex-wrap gap-1">
                {ALL_LIFE_FEED_SOURCES.insightsIntegration.dataUsed.map((d) => (
                  <code key={d} className="px-2 py-0.5 bg-white text-gray-700 rounded text-xs">{d}</code>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Note about overlap */}
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h5 className="font-medium text-yellow-800 flex items-center gap-2 mb-2">
            <span>⚠️</span> Post Type Overlap
          </h5>
          <p className="text-sm text-yellow-700">
            Both systems can generate some of the same post types (e.g., <code className="bg-yellow-100 text-yellow-800 px-1 rounded">milestone</code>, <code className="bg-yellow-100 text-yellow-800 px-1 rounded">pattern_prediction</code>).
            The <strong>cooldown system</strong> prevents duplicates by checking when the last post of each type was generated.
          </p>
        </div>
      </div>

      {/* Other AI Analysis Services */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span>🧠</span> Other AI Analysis Services
        </h3>
        <p className="text-gray-600 mb-6">
          These services write to <strong>different collections</strong> (not lifeFeedPosts). They provide specialized analytics features.
        </p>

        <div className="space-y-6">
          {/* FunFactsService (AI-based) */}
          <div className="border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg p-5">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">✨</span>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-amber-900 text-lg">{OTHER_AI_SERVICES.funFactsService.name}</h4>
                  <span className="px-2 py-0.5 bg-amber-200 text-amber-800 text-xs rounded-full font-medium">
                    {OTHER_AI_SERVICES.funFactsService.type}
                  </span>
                </div>
                <p className="text-sm text-amber-700">{OTHER_AI_SERVICES.funFactsService.description}</p>
              </div>
            </div>

            {/* Output Collection */}
            <div className="mb-4 p-3 bg-white/70 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-amber-800">Output Collection:</span>
                <code className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-mono">{OTHER_AI_SERVICES.funFactsService.outputCollection}</code>
              </div>
            </div>

            {/* How It Works */}
            <div className="mb-4">
              <h5 className="font-semibold text-amber-800 mb-2 text-sm">How It Works:</h5>
              <ol className="space-y-1 text-sm text-amber-700">
                {OTHER_AI_SERVICES.funFactsService.howItWorks.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">→</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Cloud Functions */}
            <div className="mb-4">
              <h5 className="font-semibold text-amber-800 mb-2 text-sm">Cloud Functions:</h5>
              <div className="space-y-2">
                {OTHER_AI_SERVICES.funFactsService.functions.map((fn) => (
                  <div key={fn.name} className="bg-white/70 rounded p-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span>{fn.type === 'scheduled' ? '⏰' : '👆'}</span>
                      <code className="font-medium text-amber-800">{fn.name}</code>
                      <span className={`px-2 py-0.5 rounded text-xs ${fn.type === 'scheduled' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                        {fn.type}
                      </span>
                    </div>
                    <p className="text-gray-600 text-xs mt-1 ml-6">
                      {fn.type === 'scheduled' ? fn.schedule : fn.trigger}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Fact Types */}
            <div className="mb-4">
              <h5 className="font-semibold text-amber-800 mb-2 text-sm">Fact Types Generated:</h5>
              <div className="flex flex-wrap gap-2">
                {OTHER_AI_SERVICES.funFactsService.factTypes.map((ft) => (
                  <span key={ft} className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">{ft}</span>
                ))}
              </div>
            </div>

            {/* Period Scheduling Explanation */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <h5 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
                <span>🗓️</span> {OTHER_AI_SERVICES.funFactsService.periodScheduling.title}
              </h5>
              <p className="text-amber-800 font-medium mb-3 text-sm">{OTHER_AI_SERVICES.funFactsService.periodScheduling.explanation}</p>
              <div className="space-y-1.5">
                {OTHER_AI_SERVICES.funFactsService.periodScheduling.details.map((detail, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-amber-700">
                    <span className="text-amber-500 mt-0.5">•</span>
                    <span>{detail}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-amber-200">
                <p className="text-xs text-amber-600">
                  <strong>Period Types:</strong> {OTHER_AI_SERVICES.funFactsService.periodTypes.join(', ')} (generates 3 facts × 3 periods = 9 facts total per run)
                </p>
              </div>
            </div>

            {/* Note about difference from FunFactGenerator */}
            <div className="bg-amber-100 border border-amber-300 rounded p-3 text-sm">
              <span className="font-medium text-amber-900">⚠️ Not the same as FunFactGenerator!</span>
              <p className="text-amber-800 mt-1">
                <strong>FunFactsService</strong> uses AI (RAG + GPT) and saves to <code className="bg-amber-200 text-amber-900 px-1 rounded">funFacts</code> collection.
                <strong> FunFactGenerator</strong> is rule-based and outputs to <code className="bg-amber-200 text-amber-900 px-1 rounded">lifeFeedPosts</code> via InsightsIntegrationService.
              </p>
            </div>
          </div>

          {/* KeywordGenerator */}
          <div className="border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-5">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🏷️</span>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-emerald-900 text-lg">{OTHER_AI_SERVICES.keywordGenerator.name}</h4>
                  <span className="px-2 py-0.5 bg-emerald-200 text-emerald-800 text-xs rounded-full font-medium">
                    {OTHER_AI_SERVICES.keywordGenerator.type}
                  </span>
                </div>
                <p className="text-sm text-emerald-700">{OTHER_AI_SERVICES.keywordGenerator.description}</p>
              </div>
            </div>

            {/* Output Collection */}
            <div className="mb-4 p-3 bg-white/70 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-emerald-800">Output Collection:</span>
                <code className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-mono">{OTHER_AI_SERVICES.keywordGenerator.outputCollection}</code>
              </div>
            </div>

            {/* How It Works */}
            <div className="mb-4">
              <h5 className="font-semibold text-emerald-800 mb-2 text-sm">How It Works:</h5>
              <ol className="space-y-1 text-sm text-emerald-700">
                {OTHER_AI_SERVICES.keywordGenerator.howItWorks.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5">→</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Cloud Functions */}
            <div className="mb-4">
              <h5 className="font-semibold text-emerald-800 mb-2 text-sm">Cloud Functions:</h5>
              <div className="space-y-2">
                {OTHER_AI_SERVICES.keywordGenerator.functions.map((fn) => (
                  <div key={fn.name} className="bg-white/70 rounded p-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span>{fn.type === 'scheduled' ? '⏰' : '👆'}</span>
                      <code className="font-medium text-emerald-800">{fn.name}</code>
                      <span className={`px-2 py-0.5 rounded text-xs ${fn.type === 'scheduled' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                        {fn.type}
                      </span>
                    </div>
                    <p className="text-gray-600 text-xs mt-1 ml-6">
                      {fn.type === 'scheduled' ? fn.schedule : fn.trigger}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* LifeConnectionsAnalyzer */}
          <div className="border-2 border-rose-300 bg-gradient-to-br from-rose-50 to-pink-50 rounded-lg p-5">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🔗</span>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-rose-900 text-lg">{OTHER_AI_SERVICES.lifeConnectionsAnalyzer.name}</h4>
                  <span className="px-2 py-0.5 bg-rose-200 text-rose-800 text-xs rounded-full font-medium">
                    {OTHER_AI_SERVICES.lifeConnectionsAnalyzer.type}
                  </span>
                </div>
                <p className="text-sm text-rose-700">{OTHER_AI_SERVICES.lifeConnectionsAnalyzer.description}</p>
              </div>
            </div>

            {/* Output Collection */}
            <div className="mb-4 p-3 bg-white/70 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-rose-800">Output Collection:</span>
                <code className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-mono">{OTHER_AI_SERVICES.lifeConnectionsAnalyzer.outputCollection}</code>
              </div>
            </div>

            {/* How It Works */}
            <div className="mb-4">
              <h5 className="font-semibold text-rose-800 mb-2 text-sm">How It Works:</h5>
              <ol className="space-y-1 text-sm text-rose-700">
                {OTHER_AI_SERVICES.lifeConnectionsAnalyzer.howItWorks.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-rose-500 mt-0.5">→</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Cloud Functions */}
            <div className="mb-4">
              <h5 className="font-semibold text-rose-800 mb-2 text-sm">Cloud Functions:</h5>
              <div className="space-y-2">
                {OTHER_AI_SERVICES.lifeConnectionsAnalyzer.functions.map((fn) => (
                  <div key={fn.name} className="bg-white/70 rounded p-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span>{fn.type === 'scheduled' ? '⏰' : '👆'}</span>
                      <code className="font-medium text-rose-800">{fn.name}</code>
                      <span className={`px-2 py-0.5 rounded text-xs ${fn.type === 'scheduled' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                        {fn.type}
                      </span>
                    </div>
                    <p className="text-gray-600 text-xs mt-1 ml-6">
                      {fn.type === 'scheduled' ? fn.schedule : fn.trigger}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Correlation Types */}
            <div className="mb-4">
              <h5 className="font-semibold text-rose-800 mb-2 text-sm">Example Correlations Detected:</h5>
              <div className="grid grid-cols-2 gap-2">
                {OTHER_AI_SERVICES.lifeConnectionsAnalyzer.correlationTypes.map((ct) => (
                  <div key={ct} className="px-3 py-2 bg-white/70 rounded text-xs text-rose-700 font-mono">{ct}</div>
                ))}
              </div>
            </div>
          </div>

          {/* DailySummaryService Card */}
          <div className="border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-5">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">📅</span>
              <div>
                <h4 className="font-bold text-blue-900 text-lg">{OTHER_AI_SERVICES.dailySummaryService.name}</h4>
                <span className="inline-block px-2 py-0.5 text-xs bg-blue-200 text-blue-800 rounded-full font-medium">
                  {OTHER_AI_SERVICES.dailySummaryService.type}
                </span>
              </div>
            </div>
            <p className="text-sm text-blue-700">{OTHER_AI_SERVICES.dailySummaryService.description}</p>

            {/* Output Collection */}
            <div className="mt-4 mb-4">
              <h5 className="font-semibold text-blue-800 mb-1 text-sm">Output:</h5>
              <code className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-mono">{OTHER_AI_SERVICES.dailySummaryService.outputCollection}</code>
            </div>

            {/* How It Works */}
            <div className="mb-4">
              <h5 className="font-semibold text-blue-800 mb-2 text-sm">How It Works:</h5>
              <ul className="space-y-1 text-xs text-blue-800">
                {OTHER_AI_SERVICES.dailySummaryService.howItWorks.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-blue-500">•</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Functions */}
            <div className="mb-4">
              <h5 className="font-semibold text-blue-800 mb-2 text-sm">Cloud Functions:</h5>
              <div className="space-y-2">
                {OTHER_AI_SERVICES.dailySummaryService.functions.map((fn) => (
                  <div key={fn.name} className="bg-white/70 rounded p-2 text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-blue-700 font-semibold">{fn.name}</code>
                      <span className={`px-1.5 py-0.5 text-xs rounded ${fn.type === 'scheduled' ? 'bg-blue-200 text-blue-800' : 'bg-indigo-200 text-indigo-800'}`}>
                        {fn.type}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">{fn.description}</p>
                    {fn.schedule && <p className="text-xs text-blue-600 mt-1">Schedule: {fn.schedule}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* Summary Types */}
            <div className="mb-4">
              <h5 className="font-semibold text-blue-800 mb-2 text-sm">Summary Types:</h5>
              <div className="flex flex-wrap gap-2">
                {OTHER_AI_SERVICES.dailySummaryService.summaryTypes.map((st) => (
                  <span key={st} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">{st}</span>
                ))}
              </div>
            </div>

            {/* Prompt File */}
            <div className="mt-2 text-xs text-blue-600">
              <span className="font-medium">Prompt File:</span>{' '}
              <Link
                href={`/admin/prompts?service=${OTHER_AI_SERVICES.dailySummaryService.promptServiceId}`}
                className="underline hover:text-blue-800"
              >
                {OTHER_AI_SERVICES.dailySummaryService.promptFile}
              </Link>
            </div>
          </div>

          {/* ThisDayService Card */}
          <div className="border-2 border-pink-300 bg-gradient-to-br from-pink-50 to-rose-50 rounded-lg p-5">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">📆</span>
              <div>
                <h4 className="font-bold text-pink-900 text-lg">{OTHER_AI_SERVICES.thisDayService.name}</h4>
                <span className="inline-block px-2 py-0.5 text-xs bg-pink-200 text-pink-800 rounded-full font-medium">
                  {OTHER_AI_SERVICES.thisDayService.type}
                </span>
              </div>
            </div>
            <p className="text-sm text-pink-700">{OTHER_AI_SERVICES.thisDayService.description}</p>

            {/* Output Collection */}
            <div className="mt-4 mb-4">
              <h5 className="font-semibold text-pink-800 mb-1 text-sm">Output Collection:</h5>
              <code className="px-2 py-0.5 bg-pink-100 text-pink-800 rounded font-mono">{OTHER_AI_SERVICES.thisDayService.outputCollection}</code>
            </div>

            {/* How It Works */}
            <div className="mb-4">
              <h5 className="font-semibold text-pink-800 mb-2 text-sm">How It Works:</h5>
              <ul className="space-y-1 text-xs text-pink-800">
                {OTHER_AI_SERVICES.thisDayService.howItWorks.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-pink-500">•</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Functions */}
            <div className="mb-4">
              <h5 className="font-semibold text-pink-800 mb-2 text-sm">Cloud Functions:</h5>
              <div className="space-y-2">
                {OTHER_AI_SERVICES.thisDayService.functions.map((fn) => (
                  <div key={fn.name} className="bg-white/70 rounded p-2 text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-pink-700 font-semibold">{fn.name}</code>
                      <span className="px-1.5 py-0.5 text-xs rounded bg-pink-200 text-pink-800">
                        {fn.type}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">{fn.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Memory Types */}
            <div className="mb-4">
              <h5 className="font-semibold text-pink-800 mb-2 text-sm">Memory Types:</h5>
              <div className="flex flex-wrap gap-2">
                {OTHER_AI_SERVICES.thisDayService.memoryTypes.map((mt) => (
                  <span key={mt} className="px-2 py-1 bg-pink-100 text-pink-800 text-xs rounded-full font-medium">{mt}</span>
                ))}
              </div>
            </div>

            {/* Caching Info */}
            <div className="mb-4 bg-white/50 rounded p-3">
              <h5 className="font-semibold text-pink-800 mb-2 text-sm">Caching:</h5>
              <div className="text-xs text-pink-700 space-y-1">
                <p><span className="font-medium">Location:</span> {OTHER_AI_SERVICES.thisDayService.caching.location}</p>
                <p><span className="font-medium">Key Format:</span> {OTHER_AI_SERVICES.thisDayService.caching.keyFormat}</p>
                <p><span className="font-medium">Expiry:</span> {OTHER_AI_SERVICES.thisDayService.caching.expiry}</p>
              </div>
            </div>

            {/* Architecture Fix Banner */}
            <div className="mb-4 bg-green-50 border border-green-300 rounded p-3">
              <h5 className="font-semibold text-green-800 mb-2 text-sm flex items-center gap-2">
                <span>✅</span> {OTHER_AI_SERVICES.thisDayService.architectureFix.title}
              </h5>
              <p className="text-xs text-green-700 mb-2">{OTHER_AI_SERVICES.thisDayService.architectureFix.description}</p>
              <ul className="text-xs text-green-600 space-y-1 list-disc list-inside">
                {OTHER_AI_SERVICES.thisDayService.architectureFix.improvements.map((improvement, idx) => (
                  <li key={idx}>{improvement}</li>
                ))}
              </ul>
              <p className="text-xs text-green-800 font-medium mt-2 border-t border-green-200 pt-2">
                🧪 Test: <code className="bg-green-100 px-1 rounded">{OTHER_AI_SERVICES.thisDayService.architectureFix.testFile}</code>
              </p>
            </div>

            {/* Data Used vs Not Used */}
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div className="bg-green-50 rounded p-2">
                <h5 className="font-semibold text-green-800 mb-1 text-xs">✅ Data Used:</h5>
                <div className="flex flex-wrap gap-1">
                  {OTHER_AI_SERVICES.thisDayService.dataUsed.map((d) => (
                    <span key={d} className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">{d}</span>
                  ))}
                </div>
              </div>
              <div className="bg-gray-50 rounded p-2">
                <h5 className="font-semibold text-gray-800 mb-1 text-xs">ℹ️ Note:</h5>
                <div className="flex flex-wrap gap-1">
                  {OTHER_AI_SERVICES.thisDayService.dataNotUsed.map((d) => (
                    <span key={d} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">{d}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Prompt File */}
            <div className="mt-2 text-xs text-pink-600">
              <span className="font-medium">Prompt File:</span>{' '}
              <Link
                href={`/admin/prompts?service=${OTHER_AI_SERVICES.thisDayService.promptServiceId}`}
                className="underline hover:text-pink-800"
              >
                {OTHER_AI_SERVICES.thisDayService.promptFile}
              </Link>
            </div>
          </div>
        </div>

        {/* Memory Generator Service - Full Width */}
        <div className="border-2 border-violet-300 bg-gradient-to-br from-violet-50 to-purple-50 rounded-lg p-5">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">🧠</span>
            <div>
              <h4 className="font-bold text-violet-900 text-lg">{OTHER_AI_SERVICES.memoryGeneratorService.name}</h4>
              <span className="px-2 py-0.5 bg-violet-200 text-violet-800 rounded text-xs font-medium ml-2">
                {OTHER_AI_SERVICES.memoryGeneratorService.type}
              </span>
            </div>
          </div>
          <p className="text-sm text-violet-700">{OTHER_AI_SERVICES.memoryGeneratorService.description}</p>

          {/* Output Collections */}
          <div className="mt-4 flex gap-4">
            <div>
              <h5 className="font-semibold text-violet-800 text-sm">Output Collection:</h5>
              <code className="px-2 py-0.5 bg-violet-100 text-violet-800 rounded font-mono">{OTHER_AI_SERVICES.memoryGeneratorService.outputCollection}</code>
            </div>
            <div>
              <h5 className="font-semibold text-violet-800 text-sm">Trigger Collection:</h5>
              <code className="px-2 py-0.5 bg-violet-100 text-violet-800 rounded font-mono">{OTHER_AI_SERVICES.memoryGeneratorService.triggerCollection}</code>
            </div>
          </div>

          {/* Memory vs Original Comparison */}
          <div className="mt-4 bg-white/70 rounded-lg p-4">
            <h5 className="font-semibold text-violet-900 mb-2 flex items-center gap-2">
              <span>⚖️</span> {OTHER_AI_SERVICES.memoryGeneratorService.memoryVsOriginal.title}
            </h5>
            <p className="text-violet-700 text-sm mb-3">{OTHER_AI_SERVICES.memoryGeneratorService.memoryVsOriginal.explanation}</p>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-violet-100">
                    <th className="text-left py-2 px-3 font-bold text-violet-900">Field</th>
                    <th className="text-left py-2 px-3 font-bold text-violet-900">Memory (AI-Processed)</th>
                    <th className="text-left py-2 px-3 font-bold text-violet-900">Original Content</th>
                  </tr>
                </thead>
                <tbody>
                  {OTHER_AI_SERVICES.memoryGeneratorService.memoryVsOriginal.comparison.map((row, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-violet-50'}>
                      <td className="py-2 px-3 font-medium text-violet-800">{row.field}</td>
                      <td className="py-2 px-3 text-green-700">{row.memory}</td>
                      <td className="py-2 px-3 text-gray-600">{row.original}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Trigger Types */}
          <div className="mt-4 bg-white/70 rounded-lg p-4">
            <h5 className="font-semibold text-violet-900 mb-2 flex items-center gap-2">
              <span>🎯</span> {OTHER_AI_SERVICES.memoryGeneratorService.triggerTypes.title}
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {OTHER_AI_SERVICES.memoryGeneratorService.triggerTypes.types.map((t, idx) => (
                <div key={idx} className="bg-violet-50 rounded p-2">
                  <div className="flex items-center gap-2">
                    <code className="px-2 py-0.5 bg-violet-200 text-violet-800 rounded text-xs font-bold">{t.type}</code>
                  </div>
                  <p className="text-xs text-violet-700 mt-1">{t.description}</p>
                  <p className="text-xs text-gray-500 mt-1 italic">When: {t.condition}</p>
                </div>
              ))}
            </div>
          </div>

          {/* How It Works */}
          <div className="mt-4 bg-white/70 rounded-lg p-4">
            <h5 className="font-semibold text-violet-800 mb-2 flex items-center gap-2">
              <span>⚙️</span> How It Works
            </h5>
            <ol className="text-xs text-gray-700 space-y-1 list-decimal list-inside">
              {OTHER_AI_SERVICES.memoryGeneratorService.howItWorks.map((step, idx) => (
                <li key={idx}>{step.replace(/^\d+\.\s*/, '')}</li>
              ))}
            </ol>
          </div>

          {/* Cloud Functions */}
          <div className="mt-4">
            <h5 className="font-semibold text-violet-800 mb-2 text-sm">Cloud Function Triggers:</h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {OTHER_AI_SERVICES.memoryGeneratorService.functions.map((fn) => (
                <div key={fn.name} className="bg-white/70 rounded p-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span>🔔</span>
                    <code className="font-medium text-violet-800">{fn.name}</code>
                    <span className="px-2 py-0.5 rounded text-xs bg-orange-100 text-orange-700">
                      {fn.type}
                    </span>
                  </div>
                  <p className="text-gray-600 text-xs mt-1 ml-6">{fn.trigger}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Used By / Not Used By */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-50 rounded-lg p-3">
              <h5 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                <span>✅</span> Used By
              </h5>
              <ul className="text-xs space-y-1">
                {OTHER_AI_SERVICES.memoryGeneratorService.usedBy.map((item, idx) => (
                  <li key={idx} className="text-green-700">
                    <strong>{item.feature}:</strong> {item.usage}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <h5 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                <span>❌</span> NOT Used By
              </h5>
              <ul className="text-xs space-y-1">
                {OTHER_AI_SERVICES.memoryGeneratorService.notUsedBy.map((item, idx) => (
                  <li key={idx} className="text-red-700">
                    <strong>{item.feature}:</strong> {item.reason}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* File References */}
          <div className="mt-4 text-xs text-violet-600 space-y-1">
            <p>
              <span className="font-medium">Prompt File:</span>{' '}
              <Link
                href={`/admin/prompts?service=${OTHER_AI_SERVICES.memoryGeneratorService.promptServiceId}`}
                className="underline hover:text-violet-800"
              >
                {OTHER_AI_SERVICES.memoryGeneratorService.promptFile}
              </Link>
            </p>
            <p><span className="font-medium">Service File:</span> {OTHER_AI_SERVICES.memoryGeneratorService.serviceFile}</p>
          </div>
        </div>

        {/* Summary of all collections */}
        <div className="mt-6 bg-white border border-gray-200 rounded-lg p-4">
          <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <span>📦</span> Summary: All Output Collections
          </h5>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-gray-300">
                  <th className="text-left py-3 px-4 font-bold text-gray-900">Service</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-900">Collection</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-900">Type</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white border-b border-gray-200 border-l-4 border-l-cyan-500">
                  <td className="py-3 px-4 font-semibold text-gray-900">LifeFeedGenerator</td>
                  <td className="py-3 px-4"><code className="bg-cyan-600 text-white px-2 py-1 rounded text-xs font-bold">lifeFeedPosts</code></td>
                  <td className="py-3 px-4 text-gray-700">AI-Powered (GPT)</td>
                </tr>
                <tr className="bg-white border-b border-gray-200 border-l-4 border-l-purple-500">
                  <td className="py-3 px-4 font-semibold text-gray-900">InsightsIntegrationService</td>
                  <td className="py-3 px-4"><code className="bg-purple-600 text-white px-2 py-1 rounded text-xs font-bold">lifeFeedPosts</code></td>
                  <td className="py-3 px-4 text-gray-700">Rule-Based + Analytical</td>
                </tr>
                <tr className="bg-white border-b border-gray-200 border-l-4 border-l-amber-500">
                  <td className="py-3 px-4 font-semibold text-gray-900">FunFactsService</td>
                  <td className="py-3 px-4"><code className="bg-amber-600 text-white px-2 py-1 rounded text-xs font-bold">funFacts</code></td>
                  <td className="py-3 px-4 text-gray-700">AI-Based (RAG + GPT)</td>
                </tr>
                <tr className="bg-white border-b border-gray-200 border-l-4 border-l-emerald-500">
                  <td className="py-3 px-4 font-semibold text-gray-900">KeywordGenerator</td>
                  <td className="py-3 px-4"><code className="bg-emerald-600 text-white px-2 py-1 rounded text-xs font-bold">lifeKeywords</code></td>
                  <td className="py-3 px-4 text-gray-700">AI-Powered (Clustering + GPT)</td>
                </tr>
                <tr className="bg-white border-b border-gray-200 border-l-4 border-l-rose-500">
                  <td className="py-3 px-4 font-semibold text-gray-900">LifeConnectionsAnalyzer</td>
                  <td className="py-3 px-4"><code className="bg-rose-600 text-white px-2 py-1 rounded text-xs font-bold">users/{'{userId}'}/lifeConnections</code></td>
                  <td className="py-3 px-4 text-gray-700">Statistical + AI</td>
                </tr>
                <tr className="bg-white border-b border-gray-200 border-l-4 border-l-blue-500">
                  <td className="py-3 px-4 font-semibold text-gray-900">DailySummaryService</td>
                  <td className="py-3 px-4"><code className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold">N/A (Push Notifications)</code></td>
                  <td className="py-3 px-4 text-gray-700">AI-Powered (GPT)</td>
                </tr>
                <tr className="bg-white border-b border-gray-200 border-l-4 border-l-pink-500">
                  <td className="py-3 px-4 font-semibold text-gray-900">ThisDayService</td>
                  <td className="py-3 px-4"><code className="bg-pink-600 text-white px-2 py-1 rounded text-xs font-bold">users/{'{userId}'}/thisDayMemories</code></td>
                  <td className="py-3 px-4 text-gray-700">AI-Powered (GPT)</td>
                </tr>
                <tr className="bg-white border-l-4 border-l-violet-500">
                  <td className="py-3 px-4 font-semibold text-gray-900">MemoryGeneratorService</td>
                  <td className="py-3 px-4">
                    <code className="bg-violet-600 text-white px-2 py-1 rounded text-xs font-bold">memories</code>
                    {' + '}
                    <code className="bg-violet-400 text-white px-2 py-1 rounded text-xs font-bold">memoryTriggers</code>
                  </td>
                  <td className="py-3 px-4 text-gray-700">AI-Powered (GPT + Entity Extraction)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Architecture Overview */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span>📊</span> Complete Architecture Overview
        </h3>

        <div className="bg-gray-900 rounded-lg p-6 text-sm font-mono text-gray-300 overflow-x-auto">
          <pre className="whitespace-pre">{`
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                              CLOUD FUNCTIONS (All Services)                                           │
├─────────────────────────────────────────┬─────────────────────────────────────────┬────────────────────────────────┤
│   🐦 LifeFeedGenerator Functions        │   🔮 InsightsIntegration Functions       │   🧠 Other Analysis Services   │
│  • generateLifeFeedPosts (8AM,2PM,8PM)  │  • generateUnifiedInsightsScheduled      │                                │
│  • generateLifeFeedNow (onCall)         │    (7:30AM) → lifeFeedPosts             │  ✨ FunFactsService:           │
│    → lifeFeedPosts                      │  • generateUnifiedInsightsNow (onCall)   │    • generateFunFacts (6AM)    │
│                                         │                                          │    • generateFunFactsNow       │
│                                         │  🧭 MoodPatterns Scheduler (SEPARATE):   │                                │
│                                         │  • generateMoodPatterns (6:30AM)         │  🏷️ KeywordGenerator:          │
│                                         │    → moodCorrelations, moodPatterns      │    • generateWeeklyKeywords    │
│                                         │    (NOT lifeFeedPosts!)                  │    • generateMonthlyKeywords   │
│                                         │                                          │    • generateKeywordsNow       │
│                                         │                                          │                                │
│                                         │                                          │  🔗 LifeConnectionsAnalyzer:   │
│                                         │                                          │    • analyzeLifeConnections    │
│                                         │                                          │    • analyzeLifeConnectionsSch │
│                                         │                                          │                                │
│                                         │                                          │  📅 DailySummaryService:       │
│                                         │                                          │    • sendDailySummary (8PM)    │
│                                         │                                          │                                │
│                                         │                                          │  📆 ThisDayService:            │
│                                         │                                          │    • generateThisDayMemories   │
└──────────────┬──────────────────────────┴────────────────────┬─────────────────────┴───────────────┬────────────────┘
               │                                               │                                     │
               ▼                                               ▼                                     ▼
┌──────────────────────────────────┐    ┌──────────────────────────────────────────┐    ┌──────────────────────────────┐
│   🐦 LifeFeedGenerator           │    │      🔮 InsightsIntegrationService       │    │   🧠 Independent Services    │
│  (AI-powered, GPT-4o)            │    │    generateUnifiedInsights(userId)       │    │                              │
│                                  │    └────────────────┬─────────────────────────┘    │  ✨ FunFactsService          │
│  Post Types (11):                │                     │                              │     • RAG + GPT-4o-mini      │
│  • life_summary                  │    ┌────────────────┴─────────────────┐            │     • 3 fact types           │
│  • milestone                     │    │                                  │            │     → funFacts collection    │
│  • pattern_prediction            │    ▼                                  ▼            │                              │
│  • reflective_insight            │  ┌─────────────────┐    ┌──────────────────────┐  │  🏷️ KeywordGenerator         │
│  • memory_highlight              │  │ FunFactGenerator│    │ InsightsOrchestrator │  │     • Pinecone clustering    │
│  • streak_achievement            │  │ (RULE-BASED)    │    │ (ANALYTICAL)         │  │     • Weekly/Monthly         │
│  • comparison                    │  │                 │    │                      │  │     → lifeKeywords           │
│  • seasonal_reflection           │  │ NOT AI-BASED!   │    │ 5 Sub-Services:      │  │                              │
│  • activity_pattern              │  │ Direct Firestore│    │ • PatternDetection   │  │  🔗 LifeConnectionsAnalyzer  │
│  • health_alert                  │  │ queries +       │    │ • AnomalyDetection   │  │     • Statistical analysis   │
│  • category_insight              │  │ templates       │    │ • MoodCorrelation    │  │     • Pearson correlation    │
│                                  │  │                 │    │ • Prediction         │  │     → lifeConnections        │
│                                  │  │ Generates:      │    │ • SuggestionEngine   │  │       (user subcollection)   │
│                                  │  │ milestones,     │    │                      │  │                              │
│                                  │  │ comparisons,    │    └──────────────────────┘  │                              │
│                                  │  │ streaks         │              │               │                              │
└────────────────┬─────────────────┘  └────────┬────────┘              │               └──────────────┬───────────────┘
                 │                             │                       │                              │
                 │                             └───────────┬───────────┘                              │
                 │                                         │                                          │
                 ▼                                         ▼                                          ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                              OUTPUT COLLECTIONS                                                        │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                                        │
│  lifeFeedPosts ──────────► [LifeFeedGenerator + InsightsIntegrationService] Unified Life Feed UI                     │
│                                                                                                                        │
│  moodCorrelations ───────► [generateMoodPatterns scheduler] Raw mood correlation data (NOT in Life Feed!)            │
│  moodPatterns ───────────► [generateMoodPatterns scheduler] Time-based mood patterns (NOT in Life Feed!)             │
│                                                                                                                        │
│  funFacts ───────────────► [FunFactsService only] AI-generated carousel facts (NOT FunFactGenerator!)                │
│                                                                                                                        │
│  lifeKeywords ───────────► [KeywordGenerator only] Weekly/Monthly keyword themes                                      │
│                                                                                                                        │
│  users/{userId}/lifeConnections ─► [LifeConnectionsAnalyzer only] Cross-domain correlations                          │
│                                                                                                                        │
│  users/{userId}/thisDayMemories ─► [ThisDayService only] "On This Day" memories from past years                       │
│                                                                                                                        │
│  N/A (Push Notifications) ─────► [DailySummaryService only] Daily recap notifications at 8 PM                         │
│                                                                                                                        │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

                              ⚠️ IMPORTANT: FunFactsService ≠ FunFactGenerator
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  FunFactsService (AI-based):                          │  FunFactGenerator (Rule-based):                              │
│    • Uses RAG + GPT-4o-mini                           │    • Uses direct Firestore queries + templates               │
│    • Generates: patterns, surprising, recommendation  │    • Generates: milestones, comparisons, streaks, statistics │
│    • Output: funFacts collection                      │    • Output: lifeFeedPosts (via InsightsIntegrationService)  │
│    • Display: Fun Facts carousel (mobile app)         │    • Display: Life Feed UI (mobile app)                      │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

                                      🧭 MoodCorrelationService: TWO PATHS
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  Path 1: generateMoodPatterns scheduler (6:30 AM)    │  Path 2: generateUnifiedInsightsScheduled (7:30 AM)          │
│    • Calls MoodCorrelationService directly           │    • InsightsIntegrationService → InsightsOrchestrator       │
│    • Writes to: moodCorrelations, moodPatterns       │      → MoodCorrelationService                                │
│    • ❌ NOT connected to lifeFeedPosts               │    • Converts moodInsights → reflective_insight posts        │
│                                                       │    • ✅ Writes to lifeFeedPosts                              │
│  FIX (Feb 2026): Query used getTime() but            │                                                               │
│  moodEntries.createdAt is Timestamp → 0 users found  │  This is why reflective_insight posts exist in Life Feed     │
│  Fixed to use Timestamp.fromDate()                   │  even though moodCorrelations collection is empty            │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
          `}</pre>
        </div>
      </div>

      {/* Recent Fixes & Known Issues */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span>🔧</span> Recent Fixes & Known Issues
        </h3>

        <div className="space-y-4">
          {/* Fixed Issues */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-800 mb-2">✅ Fixed (Feb 2026)</h4>
            <ul className="text-sm text-green-700 space-y-2">
              <li>
                <strong>generateMoodPatterns Type Mismatch:</strong> Scheduler was querying
                <code className="mx-1 px-1 bg-green-100 rounded">moodEntries.createdAt &gt;= thirtyDaysAgo.getTime()</code>
                but <code className="mx-1 px-1 bg-green-100 rounded">createdAt</code> is stored as Firestore Timestamp (object),
                not a number. Fixed to use <code className="mx-1 px-1 bg-green-100 rounded">Timestamp.fromDate()</code>.
              </li>
            </ul>
          </div>

          {/* Architecture Notes */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-2">📝 Architecture Notes</h4>
            <ul className="text-sm text-blue-700 space-y-2">
              <li>
                <strong>How moodEntries are created:</strong>
                <ol className="list-decimal ml-5 mt-1">
                  <li>User creates voiceNote or textNote</li>
                  <li>Cloud Function trigger (<code className="px-1 bg-blue-100 rounded">onVoiceNoteCreated</code>/<code className="px-1 bg-blue-100 rounded">onTextNoteCreated</code>)</li>
                  <li>SentimentAnalysisService analyzes content for emotion</li>
                  <li>If primaryEmotion found → creates moodEntry with <code className="px-1 bg-blue-100 rounded">serverTimestamp()</code></li>
                </ol>
              </li>
              <li>
                <strong>reflective_insight posts come from TWO sources:</strong>
                <ol className="list-decimal ml-5 mt-1">
                  <li>LifeFeedGenerator (needs steps/activities/locations)</li>
                  <li>InsightsIntegrationService (anomalies + moodInsights → reflective_insight)</li>
                </ol>
              </li>
              <li>
                <strong>InsightsOrchestrator has NO scheduler:</strong> Called only by InsightsIntegrationService
                via <code className="mx-1 px-1 bg-blue-100 rounded">generateUnifiedInsightsScheduled</code> (7:30 AM).
              </li>
              <li>
                <strong>generateMoodPatterns writes to separate collections:</strong>
                <code className="mx-1 px-1 bg-blue-100 rounded">moodCorrelations</code> and
                <code className="mx-1 px-1 bg-blue-100 rounded">moodPatterns</code> - NOT lifeFeedPosts!
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Complete Scheduler Overview */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span>⏰</span> Complete Scheduler Overview (21 Schedulers)
        </h3>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-200 px-2 py-2 text-left font-semibold text-gray-900">Time</th>
                <th className="border border-gray-200 px-2 py-2 text-left font-semibold text-gray-900">Function</th>
                <th className="border border-gray-200 px-2 py-2 text-left font-semibold text-gray-900">Service</th>
                <th className="border border-gray-200 px-2 py-2 text-left font-semibold text-gray-900">Output</th>
                <th className="border border-gray-200 px-2 py-2 text-left font-semibold text-gray-900">📱 Mobile Screen</th>
                <th className="border border-gray-200 px-2 py-2 text-center font-semibold text-gray-900">AI</th>
                <th className="border border-gray-200 px-2 py-2 text-left font-semibold text-gray-900">Prompts</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-purple-50">
                <td className="border border-gray-200 px-2 py-2 font-mono text-xs">00:00</td>
                <td className="border border-gray-200 px-2 py-2 text-xs">generateCircleAnalytics</td>
                <td className="border border-gray-200 px-2 py-2 text-xs text-gray-600">Inline</td>
                <td className="border border-gray-200 px-2 py-2 text-xs">circles/{`{id}`}/analytics</td>
                <td className="border border-gray-200 px-2 py-2 text-xs text-purple-600">CircleAnalyticsScreen</td>
                <td className="border border-gray-200 px-2 py-2 text-center text-gray-400">—</td>
                <td className="border border-gray-200 px-2 py-2 text-xs text-gray-400">—</td>
              </tr>
              <tr>
                <td className="border border-gray-200 px-2 py-2 font-mono text-xs">02:00</td>
                <td className="border border-gray-200 px-2 py-2 text-xs">trackPineconeStorage</td>
                <td className="border border-gray-200 px-2 py-2 text-xs text-gray-600">Inline</td>
                <td className="border border-gray-200 px-2 py-2 text-xs">infraMetrics</td>
                <td className="border border-gray-200 px-2 py-2 text-xs text-gray-400 italic">Admin only</td>
                <td className="border border-gray-200 px-2 py-2 text-center text-gray-400">—</td>
                <td className="border border-gray-200 px-2 py-2 text-xs text-gray-400">—</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-200 px-2 py-2 font-mono text-xs">03:00</td>
                <td className="border border-gray-200 px-2 py-2 text-xs">cleanupNotificationHistory</td>
                <td className="border border-gray-200 px-2 py-2 text-xs text-gray-600">NotificationHistoryService</td>
                <td className="border border-gray-200 px-2 py-2 text-xs">notificationHistory</td>
                <td className="border border-gray-200 px-2 py-2 text-xs text-purple-600">NotificationHistoryScreen</td>
                <td className="border border-gray-200 px-2 py-2 text-center text-gray-400">—</td>
                <td className="border border-gray-200 px-2 py-2 text-xs text-gray-400">—</td>
              </tr>
              <tr className="bg-green-50">
                <td className="border border-gray-200 px-2 py-2 font-mono text-xs">04:00</td>
                <td className="border border-gray-200 px-2 py-2 text-xs">analyzeLifeConnectionsScheduled</td>
                <td className="border border-gray-200 px-2 py-2 text-xs text-blue-600 font-medium">LifeConnectionsAnalyzer</td>
                <td className="border border-gray-200 px-2 py-2 text-xs">users/{`{id}`}/lifeConnections</td>
                <td className="border border-gray-200 px-2 py-2 text-xs text-purple-600">LifeConnectionsScreen<br/><span className="text-gray-400">InsightsScreen (tab)</span></td>
                <td className="border border-gray-200 px-2 py-2 text-center">🤖</td>
                <td className="border border-gray-200 px-2 py-2 text-xs">
                  <a href="/admin/prompts?service=LifeConnectionsService" className="text-blue-600 hover:underline">LifeConnectionsService</a>
                </td>
              </tr>
              <tr className="bg-green-50">
                <td className="border border-gray-200 px-2 py-2 font-mono text-xs">05:00</td>
                <td className="border border-gray-200 px-2 py-2 text-xs">generateDailySnapshotsScheduled</td>
                <td className="border border-gray-200 px-2 py-2 text-xs text-blue-600 font-medium">Inline + PromptLoader</td>
                <td className="border border-gray-200 px-2 py-2 text-xs">dailySnapshots</td>
                <td className="border border-gray-200 px-2 py-2 text-xs text-gray-400 italic">Not yet integrated</td>
                <td className="border border-gray-200 px-2 py-2 text-center">🤖</td>
                <td className="border border-gray-200 px-2 py-2 text-xs">
                  <a href="/admin/prompts?service=DailyInsightService" className="text-blue-600 hover:underline">DailyInsightService</a>
                </td>
              </tr>
              <tr className="bg-blue-50">
                <td className="border border-gray-200 px-2 py-2 font-mono text-xs">06:00</td>
                <td className="border border-gray-200 px-2 py-2 text-xs">generateCircleInsights</td>
                <td className="border border-gray-200 px-2 py-2 text-xs text-gray-600">Inline</td>
                <td className="border border-gray-200 px-2 py-2 text-xs">circles/{`{id}`}/insights</td>
                <td className="border border-gray-200 px-2 py-2 text-xs text-purple-600">CircleAnalyticsScreen</td>
                <td className="border border-gray-200 px-2 py-2 text-center text-gray-400">—</td>
                <td className="border border-gray-200 px-2 py-2 text-xs text-gray-400">—</td>
              </tr>
              <tr className="bg-blue-50">
                <td className="border border-gray-200 px-2 py-2 font-mono text-xs">06:00</td>
                <td className="border border-gray-200 px-2 py-2 text-xs">generateDailyInsights</td>
                <td className="border border-gray-200 px-2 py-2 text-xs text-gray-600">InsightsOrchestrator</td>
                <td className="border border-gray-200 px-2 py-2 text-xs">insights</td>
                <td className="border border-gray-200 px-2 py-2 text-xs text-purple-600">InsightsScreen<br/><span className="text-gray-400">(Patterns/Anomalies)</span></td>
                <td className="border border-gray-200 px-2 py-2 text-center text-gray-400">—</td>
                <td className="border border-gray-200 px-2 py-2 text-xs text-gray-400">Orchestrates only</td>
              </tr>
              <tr className="bg-blue-50">
                <td className="border border-gray-200 px-2 py-2 font-mono text-xs">06:00</td>
                <td className="border border-gray-200 px-2 py-2 text-xs">schedulePatternNotifications</td>
                <td className="border border-gray-200 px-2 py-2 text-xs text-gray-600">PatternNotificationScheduler</td>
                <td className="border border-gray-200 px-2 py-2 text-xs">Push notifications</td>
                <td className="border border-gray-200 px-2 py-2 text-xs text-gray-400 italic">Device Push</td>
                <td className="border border-gray-200 px-2 py-2 text-center text-gray-400">—</td>
                <td className="border border-gray-200 px-2 py-2 text-xs text-gray-400">—</td>
              </tr>
              <tr className="bg-yellow-50">
                <td className="border border-gray-200 px-2 py-2 font-mono text-xs">06:30</td>
                <td className="border border-gray-200 px-2 py-2 text-xs">generateMoodPatterns</td>
                <td className="border border-gray-200 px-2 py-2 text-xs text-gray-600">MoodCorrelationService</td>
                <td className="border border-gray-200 px-2 py-2 text-xs">moodCorrelations, moodPatterns</td>
                <td className="border border-gray-200 px-2 py-2 text-xs text-purple-600">MoodScreen<br/><span className="text-gray-400">(partially)</span></td>
                <td className="border border-gray-200 px-2 py-2 text-center text-gray-400">—</td>
                <td className="border border-gray-200 px-2 py-2 text-xs text-green-600">✅ Fixed query bug</td>
              </tr>
              <tr>
                <td className="border border-gray-200 px-2 py-2 font-mono text-xs">07:00</td>
                <td className="border border-gray-200 px-2 py-2 text-xs">generateDailyAnniversaries</td>
                <td className="border border-gray-200 px-2 py-2 text-xs text-gray-600">Inline</td>
                <td className="border border-gray-200 px-2 py-2 text-xs">users/{`{id}`}/thisDayMemories</td>
                <td className="border border-gray-200 px-2 py-2 text-xs text-purple-600">LifeFeedScreen<br/><span className="text-gray-400">(ThisDayCard)</span></td>
                <td className="border border-gray-200 px-2 py-2 text-center text-gray-400">—</td>
                <td className="border border-gray-200 px-2 py-2 text-xs text-gray-400">Date matching only</td>
              </tr>
              <tr>
                <td className="border border-gray-200 px-2 py-2 font-mono text-xs">07:00</td>
                <td className="border border-gray-200 px-2 py-2 text-xs">generateDailyPredictions</td>
                <td className="border border-gray-200 px-2 py-2 text-xs text-gray-600">PredictionService</td>
                <td className="border border-gray-200 px-2 py-2 text-xs">predictions</td>
                <td className="border border-gray-200 px-2 py-2 text-xs text-purple-600">LifeFeedScreen<br/><span className="text-gray-400">(prediction posts)</span></td>
                <td className="border border-gray-200 px-2 py-2 text-center text-gray-400">—</td>
                <td className="border border-gray-200 px-2 py-2 text-xs text-gray-400">Statistical only</td>
              </tr>
              <tr className="bg-green-100">
                <td className="border border-gray-200 px-2 py-2 font-mono text-xs font-bold">07:30</td>
                <td className="border border-gray-200 px-2 py-2 text-xs font-bold">generateUnifiedInsightsScheduled</td>
                <td className="border border-gray-200 px-2 py-2 text-xs text-blue-600 font-bold">InsightsIntegrationService</td>
                <td className="border border-gray-200 px-2 py-2 text-xs font-bold">lifeFeedPosts</td>
                <td className="border border-gray-200 px-2 py-2 text-xs text-purple-600 font-bold">LifeFeedScreen</td>
                <td className="border border-gray-200 px-2 py-2 text-center">🤖</td>
                <td className="border border-gray-200 px-2 py-2 text-xs">
                  <a href="/admin/prompts?service=FunFactsService" className="text-blue-600 hover:underline">Multiple services</a>
                </td>
              </tr>
              <tr className="bg-orange-100">
                <td className="border border-gray-200 px-2 py-2 font-mono text-xs font-bold">08:00, 14:00, 20:00</td>
                <td className="border border-gray-200 px-2 py-2 text-xs font-bold">generateLifeFeedPosts</td>
                <td className="border border-gray-200 px-2 py-2 text-xs text-blue-600 font-bold">LifeFeedGenerator</td>
                <td className="border border-gray-200 px-2 py-2 text-xs font-bold">lifeFeedPosts</td>
                <td className="border border-gray-200 px-2 py-2 text-xs text-purple-600 font-bold">LifeFeedScreen</td>
                <td className="border border-gray-200 px-2 py-2 text-center">🤖</td>
                <td className="border border-gray-200 px-2 py-2 text-xs">
                  <a href="/admin/prompts?service=LifeFeedGenerator" className="text-blue-600 hover:underline">LifeFeedGenerator</a>
                </td>
              </tr>
              <tr className="bg-green-50">
                <td className="border border-gray-200 px-2 py-2 font-mono text-xs">08:00 Mon</td>
                <td className="border border-gray-200 px-2 py-2 text-xs">generateWeeklyKeywords</td>
                <td className="border border-gray-200 px-2 py-2 text-xs text-blue-600 font-medium">KeywordGenerator</td>
                <td className="border border-gray-200 px-2 py-2 text-xs">lifeKeywords</td>
                <td className="border border-gray-200 px-2 py-2 text-xs text-purple-600">LifeKeywordsScreen<br/><span className="text-gray-400">LifeFeed (card)</span></td>
                <td className="border border-gray-200 px-2 py-2 text-center">🤖</td>
                <td className="border border-gray-200 px-2 py-2 text-xs">
                  <a href="/admin/prompts?service=KeywordGenerator" className="text-blue-600 hover:underline">KeywordGenerator</a>
                </td>
              </tr>
              <tr className="bg-green-50">
                <td className="border border-gray-200 px-2 py-2 font-mono text-xs">08:00 1st</td>
                <td className="border border-gray-200 px-2 py-2 text-xs">generateMonthlyKeywords</td>
                <td className="border border-gray-200 px-2 py-2 text-xs text-blue-600 font-medium">KeywordGenerator</td>
                <td className="border border-gray-200 px-2 py-2 text-xs">lifeKeywords</td>
                <td className="border border-gray-200 px-2 py-2 text-xs text-purple-600">LifeKeywordsScreen<br/><span className="text-gray-400">LifeFeed (card)</span></td>
                <td className="border border-gray-200 px-2 py-2 text-center">🤖</td>
                <td className="border border-gray-200 px-2 py-2 text-xs">
                  <a href="/admin/prompts?service=KeywordGenerator" className="text-blue-600 hover:underline">KeywordGenerator</a>
                </td>
              </tr>
              <tr>
                <td className="border border-gray-200 px-2 py-2 font-mono text-xs">23:00</td>
                <td className="border border-gray-200 px-2 py-2 text-xs">validatePredictions</td>
                <td className="border border-gray-200 px-2 py-2 text-xs text-gray-600">Inline</td>
                <td className="border border-gray-200 px-2 py-2 text-xs">predictions (updates)</td>
                <td className="border border-gray-200 px-2 py-2 text-xs text-gray-400 italic">Background</td>
                <td className="border border-gray-200 px-2 py-2 text-center text-gray-400">—</td>
                <td className="border border-gray-200 px-2 py-2 text-xs text-gray-400">Accuracy check</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h4 className="font-semibold text-gray-800 mt-6 mb-3">Hourly Schedulers (5)</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-200 px-2 py-2 text-left font-semibold text-gray-900">Schedule</th>
                <th className="border border-gray-200 px-2 py-2 text-left font-semibold text-gray-900">Function</th>
                <th className="border border-gray-200 px-2 py-2 text-left font-semibold text-gray-900">Service</th>
                <th className="border border-gray-200 px-2 py-2 text-left font-semibold text-gray-900">📱 Mobile</th>
                <th className="border border-gray-200 px-2 py-2 text-center font-semibold text-gray-900">AI</th>
                <th className="border border-gray-200 px-2 py-2 text-left font-semibold text-gray-900">Purpose / Prompts</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-200 px-2 py-2 font-mono text-xs">Every hour :00</td>
                <td className="border border-gray-200 px-2 py-2 text-xs">checkChallengeEvents</td>
                <td className="border border-gray-200 px-2 py-2 text-xs text-gray-600">Inline</td>
                <td className="border border-gray-200 px-2 py-2 text-xs text-purple-600">ChallengesScreen</td>
                <td className="border border-gray-200 px-2 py-2 text-center text-gray-400">—</td>
                <td className="border border-gray-200 px-2 py-2 text-xs">Challenge starting/ending</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-200 px-2 py-2 font-mono text-xs">Every hour :05</td>
                <td className="border border-gray-200 px-2 py-2 text-xs">announceChallengeWinner</td>
                <td className="border border-gray-200 px-2 py-2 text-xs text-gray-600">Inline</td>
                <td className="border border-gray-200 px-2 py-2 text-xs text-purple-600">ChallengesScreen</td>
                <td className="border border-gray-200 px-2 py-2 text-center text-gray-400">—</td>
                <td className="border border-gray-200 px-2 py-2 text-xs">Announce winners</td>
              </tr>
              <tr>
                <td className="border border-gray-200 px-2 py-2 font-mono text-xs">Every hour :00</td>
                <td className="border border-gray-200 px-2 py-2 text-xs">eventNotificationScheduler</td>
                <td className="border border-gray-200 px-2 py-2 text-xs text-gray-600">EventNotificationScheduler</td>
                <td className="border border-gray-200 px-2 py-2 text-xs text-gray-400 italic">Device Push</td>
                <td className="border border-gray-200 px-2 py-2 text-center text-gray-400">—</td>
                <td className="border border-gray-200 px-2 py-2 text-xs">Event reminders</td>
              </tr>
              <tr className="bg-green-50">
                <td className="border border-gray-200 px-2 py-2 font-mono text-xs">Every 60 min</td>
                <td className="border border-gray-200 px-2 py-2 text-xs">deliverProactiveSuggestions</td>
                <td className="border border-gray-200 px-2 py-2 text-xs text-blue-600 font-medium">SuggestionEngine</td>
                <td className="border border-gray-200 px-2 py-2 text-xs text-purple-600">HomeFeedScreen<br/><span className="text-gray-400">(suggestion card)</span></td>
                <td className="border border-gray-200 px-2 py-2 text-center">🤖</td>
                <td className="border border-gray-200 px-2 py-2 text-xs">
                  <a href="/admin/prompts?service=SuggestionEngine" className="text-blue-600 hover:underline">SuggestionEngine</a>
                </td>
              </tr>
              <tr>
                <td className="border border-gray-200 px-2 py-2 font-mono text-xs">Every 1 hour</td>
                <td className="border border-gray-200 px-2 py-2 text-xs">expireCircleInvites</td>
                <td className="border border-gray-200 px-2 py-2 text-xs text-gray-600">Inline</td>
                <td className="border border-gray-200 px-2 py-2 text-xs text-gray-400 italic">Background</td>
                <td className="border border-gray-200 px-2 py-2 text-center text-gray-400">—</td>
                <td className="border border-gray-200 px-2 py-2 text-xs">Expire old invites</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-4 bg-gray-100 rounded p-3 text-xs text-gray-600">
          <strong>Log Commands:</strong>
          <div className="font-mono mt-1 space-y-1">
            <div>firebase functions:log --only generateLifeFeedPosts</div>
            <div>firebase functions:log --only generateUnifiedInsightsScheduled</div>
            <div>firebase functions:log --only generateMoodPatterns</div>
          </div>
        </div>

        {/* Scheduler Summary by Category */}
        <h4 className="font-semibold text-gray-800 mt-6 mb-3">Summary by Category</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h5 className="font-semibold text-green-800 mb-2">🎯 Life Feed (Main Output)</h5>
            <ul className="text-xs text-green-700 space-y-1">
              <li>• <strong>generateLifeFeedPosts</strong> (3x/day) → lifeFeedPosts</li>
              <li>• <strong>generateUnifiedInsightsScheduled</strong> (7:30) → lifeFeedPosts</li>
            </ul>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h5 className="font-semibold text-yellow-800 mb-2">🧠 Insights & Analysis</h5>
            <ul className="text-xs text-yellow-700 space-y-1">
              <li>• <strong>generateDailyInsights</strong> (6:00) → insights</li>
              <li>• <strong>generateMoodPatterns</strong> (6:30) → moodCorrelations, moodPatterns</li>
              <li>• <strong>analyzeLifeConnectionsScheduled</strong> (4:00) → lifeConnections</li>
              <li>• <strong>generateDailySnapshotsScheduled</strong> (5:00) → dailySnapshots</li>
            </ul>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h5 className="font-semibold text-blue-800 mb-2">🔮 Predictions & Memory</h5>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• <strong>generateDailyPredictions</strong> (7:00) → predictions</li>
              <li>• <strong>validatePredictions</strong> (23:00) → predictions (updates)</li>
              <li>• <strong>generateDailyAnniversaries</strong> (7:00) → thisDayMemories</li>
            </ul>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h5 className="font-semibold text-purple-800 mb-2">🏷️ Keywords & Social</h5>
            <ul className="text-xs text-purple-700 space-y-1">
              <li>• <strong>generateWeeklyKeywords</strong> (Mon 8:00) → lifeKeywords</li>
              <li>• <strong>generateMonthlyKeywords</strong> (1st 8:00) → lifeKeywords</li>
              <li>• <strong>generateCircleInsights</strong> (6:00) → circles/insights</li>
              <li>• <strong>generateCircleAnalytics</strong> (0:00) → circles/analytics</li>
            </ul>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h5 className="font-semibold text-orange-800 mb-2">🔔 Notifications</h5>
            <ul className="text-xs text-orange-700 space-y-1">
              <li>• <strong>schedulePatternNotifications</strong> (6:00) → Push</li>
              <li>• <strong>eventNotificationScheduler</strong> (hourly) → Push</li>
              <li>• <strong>deliverProactiveSuggestions</strong> (hourly) → Push</li>
              <li>• <strong>cleanupNotificationHistory</strong> (3:00) → Cleanup</li>
            </ul>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h5 className="font-semibold text-gray-800 mb-2">⚙️ Infrastructure & Challenges</h5>
            <ul className="text-xs text-gray-700 space-y-1">
              <li>• <strong>trackPineconeStorage</strong> (2:00) → infraMetrics</li>
              <li>• <strong>checkChallengeEvents</strong> (hourly) → challenges</li>
              <li>• <strong>announceChallengeWinner</strong> (hourly) → challenges</li>
              <li>• <strong>expireCircleInvites</strong> (hourly) → invites</li>
            </ul>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-4 flex flex-wrap gap-3">
          <span className="px-3 py-1 bg-green-100 text-green-800 text-xs rounded-full">
            ✓ 16 Daily Schedulers
          </span>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
            ✓ 5 Hourly Schedulers
          </span>
          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
            🤖 8 Use AI (OpenAI)
          </span>
          <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
            📱 12 Mobile Screens
          </span>
          <span className="px-3 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
            ⚙️ 6 Prompt Services
          </span>
        </div>

        {/* AI Prompt Services Legend */}
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h5 className="font-semibold text-blue-800 mb-2">🤖 AI Prompt Services (Configurable at <a href="/admin/prompts" className="underline">/admin/prompts</a>)</h5>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            <a href="/admin/prompts?service=LifeFeedGenerator" className="text-blue-600 hover:underline">• LifeFeedGenerator</a>
            <a href="/admin/prompts?service=SuggestionEngine" className="text-blue-600 hover:underline">• SuggestionEngine</a>
            <a href="/admin/prompts?service=KeywordGenerator" className="text-blue-600 hover:underline">• KeywordGenerator</a>
            <a href="/admin/prompts?service=DailyInsightService" className="text-blue-600 hover:underline">• DailyInsightService</a>
            <a href="/admin/prompts?service=LifeConnectionsService" className="text-blue-600 hover:underline">• LifeConnectionsService</a>
            <a href="/admin/prompts?service=FunFactsService" className="text-blue-600 hover:underline">• FunFactsService</a>
          </div>
        </div>
      </div>

      {/* Architecture Analysis & Proposed Consolidation */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span>🔬</span> Architecture Analysis & Proposed Consolidation
        </h3>

        {/* Current State Analysis */}
        <div className="mb-6">
          <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span className="text-red-500">⚠️</span> Current State: Multiple Collections
          </h4>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800 mb-3">
              Currently using <strong>5 separate collections</strong> for AI-generated insights, causing:
            </p>
            <ul className="text-sm text-red-700 space-y-1 mb-4">
              <li>• Duplicate cooldown logic across services</li>
              <li>• Multiple queries needed to show &quot;all insights&quot;</li>
              <li>• Inconsistent schema definitions</li>
              <li>• Harder to maintain unified configuration</li>
            </ul>
            <div className="bg-white rounded p-3 font-mono text-xs text-gray-700">
              <div>├── lifeFeedPosts <span className="text-gray-400">(11 types)</span></div>
              <div>├── funFacts <span className="text-gray-400">(FunFactsService)</span></div>
              <div>├── lifeKeywords <span className="text-gray-400">(KeywordGenerator)</span></div>
              <div>├── users/&#123;userId&#125;/lifeConnections <span className="text-gray-400">(LifeConnectionsAnalyzer)</span></div>
              <div>└── users/&#123;userId&#125;/thisDayMemories <span className="text-gray-400">(ThisDayService)</span></div>
            </div>
          </div>
        </div>

        {/* Technical Differences Table */}
        <div className="mb-6">
          <h4 className="font-semibold text-gray-800 mb-3">Technical Differences Between Services</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-900">Service</th>
                  <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-900">Data Pipeline</th>
                  <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-900">Algorithm</th>
                  <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-900">Keep Separate?</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-200 px-3 py-2 font-medium text-gray-900">LifeFeedGenerator</td>
                  <td className="border border-gray-200 px-3 py-2 text-gray-700">Firestore → GPT</td>
                  <td className="border border-gray-200 px-3 py-2 text-gray-700">Direct query + templates</td>
                  <td className="border border-gray-200 px-3 py-2"><span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">Keep (base service)</span></td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-200 px-3 py-2 font-medium text-gray-900">FunFactsService</td>
                  <td className="border border-gray-200 px-3 py-2 text-gray-700">Pinecone RAG → GPT</td>
                  <td className="border border-gray-200 px-3 py-2 text-gray-700">Semantic vector search</td>
                  <td className="border border-gray-200 px-3 py-2"><span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">Keep service, unify output</span></td>
                </tr>
                <tr>
                  <td className="border border-gray-200 px-3 py-2 font-medium text-gray-900">KeywordGenerator</td>
                  <td className="border border-gray-200 px-3 py-2 text-gray-700">Pinecone → Clustering → GPT</td>
                  <td className="border border-gray-200 px-3 py-2 text-gray-700">Vector clustering</td>
                  <td className="border border-gray-200 px-3 py-2"><span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">Keep service, unify output</span></td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-200 px-3 py-2 font-medium text-gray-900">LifeConnectionsAnalyzer</td>
                  <td className="border border-gray-200 px-3 py-2 text-gray-700">Firestore → Statistics → GPT</td>
                  <td className="border border-gray-200 px-3 py-2 text-gray-700">Pearson correlation</td>
                  <td className="border border-gray-200 px-3 py-2"><span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">Keep service, unify output</span></td>
                </tr>
                <tr>
                  <td className="border border-gray-200 px-3 py-2 font-medium text-gray-900">ThisDayService</td>
                  <td className="border border-gray-200 px-3 py-2 text-gray-700">Historical query → GPT</td>
                  <td className="border border-gray-200 px-3 py-2 text-gray-700">Date-based lookup</td>
                  <td className="border border-gray-200 px-3 py-2"><span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">Keep service, unify output</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Proposed Consolidation */}
        <div className="mb-6">
          <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span className="text-green-500">✅</span> Proposed: Unified lifeFeedPosts Collection
          </h4>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800 mb-3">
              <strong>Keep services separate</strong> (different algorithms), but <strong>unify output</strong> to single collection with extended types:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded p-3">
                <h5 className="font-medium text-gray-900 mb-2 text-sm">Existing Types (11)</h5>
                <div className="font-mono text-xs text-gray-600 space-y-0.5">
                  <div>• life_summary</div>
                  <div>• milestone</div>
                  <div>• pattern_prediction</div>
                  <div>• reflective_insight</div>
                  <div>• memory_highlight</div>
                  <div>• streak_achievement</div>
                  <div>• comparison</div>
                  <div>• seasonal_reflection</div>
                  <div>• activity_pattern</div>
                  <div>• health_alert</div>
                  <div>• category_insight</div>
                </div>
              </div>
              <div className="bg-white rounded p-3">
                <h5 className="font-medium text-gray-900 mb-2 text-sm">New Types (+3)</h5>
                <div className="font-mono text-xs space-y-0.5">
                  <div className="text-green-700">• fun_fact <span className="text-gray-400">(from FunFactsService)</span></div>
                  <div className="text-green-700">• life_keyword <span className="text-gray-400">(from KeywordGenerator)</span></div>
                  <div className="text-green-700">• life_connection <span className="text-gray-400">(from LifeConnectionsAnalyzer)</span></div>
                </div>
                <div className="mt-3 pt-2 border-t border-gray-200">
                  <h5 className="font-medium text-gray-900 mb-1 text-sm">Reuse Existing</h5>
                  <div className="font-mono text-xs text-blue-700">
                    • memory_highlight <span className="text-gray-400">(for ThisDayService)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="mb-6">
          <h4 className="font-semibold text-gray-800 mb-3">Benefits of Consolidation</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <div className="flex items-center gap-2 mb-1">
                <span>🔍</span>
                <span className="font-medium text-blue-900 text-sm">Single Query</span>
              </div>
              <p className="text-xs text-blue-700">Query all insights with one Firestore call, filter by type in UI</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <div className="flex items-center gap-2 mb-1">
                <span>⏱️</span>
                <span className="font-medium text-blue-900 text-sm">Unified Cooldowns</span>
              </div>
              <p className="text-xs text-blue-700">Share cooldown logic via InsightsConfigLoader for all types</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <div className="flex items-center gap-2 mb-1">
                <span>⚙️</span>
                <span className="font-medium text-blue-900 text-sm">Single Config</span>
              </div>
              <p className="text-xs text-blue-700">Manage all types in config/insightsPostTypes document</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <div className="flex items-center gap-2 mb-1">
                <span>📱</span>
                <span className="font-medium text-blue-900 text-sm">Flexible UI</span>
              </div>
              <p className="text-xs text-blue-700">UI can still show different sections by filtering type field</p>
            </div>
          </div>
        </div>

        {/* UI Filtering Example */}
        <div className="mb-6">
          <h4 className="font-semibold text-gray-800 mb-3">UI Filtering Examples</h4>
          <div className="bg-gray-900 rounded-lg p-4 text-sm font-mono text-gray-300 overflow-x-auto">
            <pre className="whitespace-pre">{`// Fun Facts Carousel - filter by type
db.collection('lifeFeedPosts')
  .where('userId', '==', userId)
  .where('type', '==', 'fun_fact')
  .limit(5)

// Keywords Section - filter by type
db.collection('lifeFeedPosts')
  .where('userId', '==', userId)
  .where('type', '==', 'life_keyword')

// Life Feed - show all except keywords
db.collection('lifeFeedPosts')
  .where('userId', '==', userId)
  .where('type', 'not-in', ['life_keyword'])
  .orderBy('publishedAt', 'desc')`}</pre>
          </div>
        </div>

        {/* Schema Extension */}
        <div>
          <h4 className="font-semibold text-gray-800 mb-3">Schema Extension (Optional Fields)</h4>
          <div className="bg-gray-900 rounded-lg p-4 text-sm font-mono text-gray-300 overflow-x-auto">
            <pre className="whitespace-pre">{`interface LifeFeedPost {
  // Existing fields
  id: string;
  userId: string;
  type: LifeFeedPostType;  // Extended with new types
  content: string;
  category: string;
  publishedAt: number;

  // NEW: Optional fields for specific types
  periodType?: 'weekly' | 'monthly' | 'quarterly';  // fun_fact
  periodStart?: string;                              // fun_fact
  periodEnd?: string;                                // fun_fact
  correlationScore?: number;                         // life_connection
  correlationFactor?: string;                        // life_connection
  pValue?: number;                                   // life_connection
  keywordRelevance?: number;                         // life_keyword
  yearsAgo?: number;                                 // memory_highlight (ThisDay)
}`}</pre>
          </div>
        </div>
      </div>

      {/* Service Requirements */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span>📋</span> Service Data Requirements
        </h3>

        {/* FunFactGenerator Section */}
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-orange-800 mb-3 flex items-center gap-2 border-b border-orange-200 pb-2">
            <span>🎉</span> FunFactGenerator (Independent Service)
          </h4>
          <p className="text-sm text-gray-600 mb-4">
            Generates personalized fun facts from user data. Runs separately from InsightsOrchestrator.
          </p>
        </div>

        {/* First show FunFactGenerator */}
        <div className="space-y-4 mb-8">
          {[FUN_FACT_SERVICE].map((service) => (
            <div
              key={service.name}
              className="border border-orange-200 rounded-lg overflow-hidden bg-orange-50"
            >
              {/* Service Header */}
              <button
                onClick={() => setExpandedService(expandedService === service.name ? null : service.name)}
                className="w-full px-4 py-3 bg-orange-100 hover:bg-orange-200 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🎉</span>
                  <div className="text-left">
                    <h4 className="font-semibold text-gray-900">{service.name}</h4>
                    <p className="text-sm text-gray-600">{service.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2 py-1 bg-orange-200 text-orange-800 text-xs rounded font-medium">
                    Multiple post types
                  </span>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${expandedService === service.name ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Expanded Details */}
              {expandedService === service.name && (
                <div className="p-4 border-t border-orange-200 space-y-4 bg-white">
                  {/* Collections */}
                  <div>
                    <h5 className="font-medium text-gray-700 mb-2">Firestore Collections</h5>
                    <div className="flex flex-wrap gap-2">
                      {service.collection.split(', ').map((col) => (
                        <code key={col} className="px-2 py-1 bg-orange-100 rounded text-sm text-orange-800">{col}</code>
                      ))}
                    </div>
                  </div>

                  {/* Requirements */}
                  <div>
                    <h5 className="font-medium text-gray-700 mb-2">Data Requirements</h5>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                      {service.additionalRequirements.map((req, idx) => (
                        <li key={idx}>{req}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Output Post Types */}
                  <div>
                    <h5 className="font-medium text-gray-700 mb-2">Output Post Types</h5>
                    <div className="flex flex-wrap gap-2">
                      {service.postType.split(', ').map((pt) => (
                        <span key={pt} className={`px-2 py-1 rounded text-xs font-medium ${
                          pt === 'milestone' ? 'bg-yellow-100 text-yellow-800' :
                          pt === 'comparison' ? 'bg-blue-100 text-blue-800' :
                          pt === 'streak_achievement' ? 'bg-red-100 text-red-800' :
                          pt === 'pattern_prediction' ? 'bg-green-100 text-green-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {pt}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* InsightsOrchestrator Section */}
        <div className="mb-4">
          <h4 className="text-lg font-semibold text-indigo-800 mb-3 flex items-center gap-2 border-b border-indigo-200 pb-2">
            <span>🔮</span> InsightsOrchestrator (5 Sub-Services)
          </h4>
          <p className="text-sm text-gray-600 mb-4">
            Coordinates pattern detection, anomaly analysis, mood correlation, and predictions.
          </p>
        </div>

        <div className="space-y-4">
          {ORCHESTRATOR_SERVICES.map((service) => (
            <div
              key={service.name}
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              {/* Service Header */}
              <button
                onClick={() => setExpandedService(expandedService === service.name ? null : service.name)}
                className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {service.name.includes('Pattern') ? '🔍' :
                     service.name.includes('Health') ? '❤️' :
                     service.name.includes('Activity') ? '📍' :
                     service.name.includes('Mood') ? '🧭' : '🔮'}
                  </span>
                  <div className="text-left">
                    <h4 className="font-semibold text-gray-900">{service.name}</h4>
                    <p className="text-sm text-gray-600">{service.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {service.knownIssues && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded font-medium">
                      ⚠️ Known Bug
                    </span>
                  )}
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    service.postType === 'pattern_prediction'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-purple-100 text-purple-800'
                  }`}>
                    {service.postType}
                  </span>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${expandedService === service.name ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Expanded Details */}
              {expandedService === service.name && (
                <div className="p-4 border-t border-gray-200 space-y-4">
                  {/* Collection & Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium text-gray-700 mb-2">Firestore Collection</h5>
                      <code className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-sm font-medium">{service.collection}</code>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-700 mb-2">Minimum Records</h5>
                      <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-sm font-medium">
                        {service.minimumRecords}+ records required
                      </span>
                    </div>
                  </div>

                  {/* Required Fields */}
                  {service.requiredFields.length > 0 && (
                    <div>
                      <h5 className="font-medium text-gray-700 mb-2">Required Fields</h5>
                      <div className="flex flex-wrap gap-2">
                        {service.requiredFields.map((field) => (
                          <code key={field} className="px-2 py-1 bg-blue-50 text-blue-800 rounded text-sm">
                            {field}
                          </code>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Additional Requirements */}
                  <div>
                    <h5 className="font-medium text-gray-700 mb-2">Additional Requirements</h5>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                      {service.additionalRequirements.map((req, idx) => (
                        <li key={idx}>{req}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Known Issues */}
                  {service.knownIssues && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h5 className="font-medium text-yellow-800 mb-2 flex items-center gap-2">
                        <span>⚠️</span> Known Issues
                      </h5>
                      <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700">
                        {service.knownIssues.map((issue, idx) => (
                          <li key={idx}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Output */}
                  <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
                    <div>
                      <span className="text-sm text-gray-500">Output Type:</span>
                      <code className="ml-2 px-2 py-1 bg-green-50 text-green-800 rounded text-sm">
                        {service.outputType}
                      </code>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Post Type:</span>
                      <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm font-medium">
                        {service.postType}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Cooldown:</span>
                      <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">
                        {service.cooldownDays} day{service.cooldownDays > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Post Type Mappings */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span>🏷️</span> Post Type Mappings
        </h3>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service Output</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Life Feed Post Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cooldown</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Emoji</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {POST_TYPE_MAPPINGS.map((mapping, idx) => (
                <tr key={`${mapping.service}-${idx}`} className={mapping.source === 'FunFactGenerator' ? 'bg-orange-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      mapping.source === 'FunFactGenerator'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-indigo-100 text-indigo-800'
                    }`}>
                      {mapping.source}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <code className="text-sm bg-gray-100 text-gray-800 px-2 py-1 rounded font-medium">{mapping.service}</code>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      mapping.postType === 'milestone' ? 'bg-yellow-100 text-yellow-800' :
                      mapping.postType === 'comparison' ? 'bg-cyan-100 text-cyan-800' :
                      mapping.postType === 'streak_achievement' ? 'bg-red-100 text-red-800' :
                      mapping.postType === 'pattern_prediction' ? 'bg-blue-100 text-blue-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {mapping.postType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {mapping.cooldown}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-2xl">
                    {mapping.emoji}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Data Analyzer */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span>🔍</span> User Data Analyzer
        </h3>
        <p className="text-gray-600 mb-4">
          Enter a user ID to analyze their data and understand why insights may not be generating.
        </p>

        <div className="flex gap-4 mb-6">
          <input
            type="text"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            placeholder="Enter User ID (e.g., abc123xyz)"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <button
            onClick={() => analyzeUserData(selectedUserId)}
            disabled={loading}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Analyzing...
              </>
            ) : (
              <>
                <span>🔍</span>
                Analyze
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {userStats && (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Analysis Results for: {userStats.userId}</h4>

              {/* Location Data */}
              <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium text-gray-700 flex items-center gap-2">
                    <span>📍</span> Location Data (locationData)
                  </h5>
                  {getStatusBadge(userStats.locationData.withActivity >= 5)}
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Total Records:</span>
                    <span className="ml-2 font-medium">{userStats.locationData.total}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">With Activity Tag:</span>
                    <span className={`ml-2 font-medium ${userStats.locationData.withActivity >= 5 ? 'text-green-600' : 'text-red-600'}`}>
                      {userStats.locationData.withActivity} {userStats.locationData.withActivity < 5 && '(need 5+)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">visitCount &gt;= 5:</span>
                    <span className={`ml-2 font-medium ${userStats.locationData.withVisitCount5Plus > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {userStats.locationData.withVisitCount5Plus}
                    </span>
                  </div>
                </div>
                {userStats.locationData.sampleActivities.length > 0 && (
                  <div className="mt-2">
                    <span className="text-gray-500 text-sm">Sample Activities:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {userStats.locationData.sampleActivities.map((activity, idx) => (
                        <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                          {activity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Health Data */}
              <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium text-gray-700 flex items-center gap-2">
                    <span>❤️</span> Health Data (healthData)
                  </h5>
                  {getStatusBadge(userStats.healthData.total >= 10)}
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Total Records:</span>
                    <span className={`ml-2 font-medium ${userStats.healthData.total >= 10 ? 'text-green-600' : 'text-red-600'}`}>
                      {userStats.healthData.total} {userStats.healthData.total < 10 && '(need 10+)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Date Format:</span>
                    <span className={`ml-2 font-medium ${userStats.healthData.dateFormat === 'timestamp' ? 'text-green-600' : 'text-yellow-600'}`}>
                      {userStats.healthData.dateFormat}
                      {userStats.healthData.dateFormat === 'string' && ' ⚠️'}
                    </span>
                  </div>
                </div>
                {userStats.healthData.dateFormat === 'string' && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                    <strong>Warning:</strong> startDate is stored as ISO string but AnomalyDetectionService queries using Firestore Timestamp.
                    This type mismatch will cause 0 health anomalies to be detected.
                  </div>
                )}
                {userStats.healthData.sampleTypes.length > 0 && (
                  <div className="mt-2">
                    <span className="text-gray-500 text-sm">Health Types:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {userStats.healthData.sampleTypes.map((type, idx) => (
                        <span key={idx} className="px-2 py-1 bg-red-50 text-red-700 rounded text-xs">
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Mood Entries */}
              <div className="p-4 bg-white rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium text-gray-700 flex items-center gap-2">
                    <span>🧭</span> Mood Entries (moodEntries)
                  </h5>
                  {getStatusBadge(userStats.moodEntries.total >= 7)}
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">Total Records:</span>
                  <span className={`ml-2 font-medium ${userStats.moodEntries.total >= 7 ? 'text-green-600' : 'text-red-600'}`}>
                    {userStats.moodEntries.total} {userStats.moodEntries.total < 7 && '(need 7+)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Diagnosis */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h5 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                <span>💡</span> Diagnosis
              </h5>
              <ul className="space-y-2 text-sm text-blue-800">
                {/* FunFactGenerator Diagnosis */}
                <li className="flex items-start gap-2 pb-2 border-b border-blue-200">
                  <span className="text-orange-500">🎉</span>
                  <span>
                    <strong>FunFactGenerator:</strong>
                    {userStats.healthData.total > 0 ? ' ✅ Has health data for step facts.' : ' ❌ No health data.'}
                    {userStats.locationData.withActivity >= 3 ? ' ✅ Has 3+ activity-tagged locations.' : ' ⚠️ Only ' + userStats.locationData.withActivity + ' locations with activities (need 3+).'}
                  </span>
                </li>

                {/* InsightsOrchestrator Diagnosis */}
                {userStats.locationData.withActivity < 5 && (
                  <li className="flex items-start gap-2">
                    <span className="text-red-500">❌</span>
                    <span><strong>PatternDetectionService:</strong> Only {userStats.locationData.withActivity} locations have activity tags. Need 5+ to detect patterns.</span>
                  </li>
                )}
                {userStats.locationData.withVisitCount5Plus === 0 && (
                  <li className="flex items-start gap-2">
                    <span className="text-red-500">❌</span>
                    <span><strong>AnomalyDetectionService (Activity):</strong> No locations have visitCount &gt;= 5. Need favorite places to detect missed visits.</span>
                  </li>
                )}
                {userStats.healthData.dateFormat === 'string' && (
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✅</span>
                    <span><strong>AnomalyDetectionService (Health):</strong> Date format is string - this is now handled correctly by the toDate() helper (bug fixed).</span>
                  </li>
                )}
                {userStats.healthData.total < 10 && (
                  <li className="flex items-start gap-2">
                    <span className="text-red-500">❌</span>
                    <span><strong>AnomalyDetectionService (Health):</strong> Only {userStats.healthData.total} health records. Need 10+ per metric type for anomaly detection.</span>
                  </li>
                )}
                {userStats.moodEntries.total < 7 && (
                  <li className="flex items-start gap-2">
                    <span className="text-red-500">❌</span>
                    <span><strong>MoodCorrelationService:</strong> Only {userStats.moodEntries.total} mood entries. Need 7+ for mood correlations.</span>
                  </li>
                )}
                {userStats.locationData.withActivity >= 5 && userStats.healthData.total >= 10 && userStats.moodEntries.total >= 7 && (
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✅</span>
                    <span>All InsightsOrchestrator data requirements met! If still getting 0 insights, check Cloud Function logs for cooldown status or errors.</span>
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Common Issues */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span>🐛</span> Common Issues & Fixes
        </h3>

        <div className="space-y-4">
          <div className="border-l-4 border-green-500 pl-4">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              <span className="text-green-600">✅</span> Health Anomaly Timestamp Bug (FIXED)
            </h4>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Issue:</strong> AnomalyDetectionService was querying healthData with Firestore Timestamp
              but the actual data stored startDate as an ISO string.
            </p>
            <p className="text-sm text-green-700 mt-1">
              <strong>Fix Applied:</strong> Added <code className="bg-green-100 text-green-800 px-1 rounded">toDate()</code> helper that handles both
              Timestamp, ISO string, Date, and number formats. Query now fetches without date constraints and filters in memory.
            </p>
          </div>

          <div className="border-l-4 border-yellow-500 pl-4">
            <h4 className="font-semibold text-gray-900">Insufficient Location Data</h4>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Issue:</strong> PatternDetectionService needs 5+ visits to the SAME activity type (e.g., 5 visits tagged as &quot;Gym&quot;).
            </p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Solution:</strong> Users need to tag more locations with activities, and revisit the same places multiple times.
            </p>
          </div>

          <div className="border-l-4 border-blue-500 pl-4">
            <h4 className="font-semibold text-gray-900">Cascade Effect</h4>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Issue:</strong> PredictionService depends on PatternDetectionService. If patterns return 0, predictions return 0.
            </p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Solution:</strong> Fix upstream data issues first (location tagging).
            </p>
          </div>

          <div className="border-l-4 border-orange-500 pl-4">
            <h4 className="font-semibold text-gray-900">FunFacts vs InsightsOrchestrator Confusion</h4>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Issue:</strong> FunFactGenerator runs separately from InsightsOrchestrator. Both are called by InsightsIntegrationService.
            </p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Note:</strong> If FunFacts work but patterns don&apos;t, check InsightsOrchestrator sub-services (PatternDetection, etc.).
              If both fail, check InsightsIntegrationService or the Cloud Functions.
            </p>
          </div>

          <div className="border-l-4 border-purple-500 pl-4">
            <h4 className="font-semibold text-gray-900">Post Type Cooldowns</h4>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Issue:</strong> No new insights generated even when data requirements are met.
            </p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Cause:</strong> Post types have cooldown periods (1-14 days). Check if the post type is in cooldown.
              Cloud Functions log which post types are blocked by cooldown.
            </p>
          </div>
        </div>
      </div>

      {/* Debug Commands */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span>🔧</span> Debug Commands
        </h3>

        <div className="space-y-6">
          {/* Life Feed Posts */}
          <div>
            <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="text-cyan-500">🐦</span> LifeFeedGenerator & InsightsIntegration (lifeFeedPosts)
            </h4>
            <div className="space-y-3">
              <div className="bg-gray-900 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-2"># View LifeFeedGenerator logs</p>
                <code className="text-green-400 text-sm">firebase functions:log --only generateLifeFeedPosts</code>
              </div>
              <div className="bg-gray-900 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-2"># View InsightsIntegration logs</p>
                <code className="text-green-400 text-sm">firebase functions:log --only generateUnifiedInsightsScheduled</code>
              </div>
              <div className="bg-gray-900 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-2"># Check recent lifeFeedPosts for a user</p>
                <code className="text-green-400 text-sm">
                  {`firebase firestore:get lifeFeedPosts --where "userId=USER_ID" --limit 10`}
                </code>
              </div>
            </div>
          </div>

          {/* Fun Facts Service */}
          <div>
            <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="text-amber-500">✨</span> FunFactsService (funFacts collection)
            </h4>
            <div className="space-y-3">
              <div className="bg-gray-900 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-2"># View FunFactsService logs</p>
                <code className="text-green-400 text-sm">firebase functions:log --only generateFunFacts</code>
              </div>
              <div className="bg-gray-900 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-2"># Check funFacts for a user</p>
                <code className="text-green-400 text-sm">
                  {`firebase firestore:get funFacts --where "userId=USER_ID" --limit 10`}
                </code>
              </div>
            </div>
          </div>

          {/* Keyword Generator */}
          <div>
            <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="text-emerald-500">🏷️</span> KeywordGenerator (lifeKeywords collection)
            </h4>
            <div className="space-y-3">
              <div className="bg-gray-900 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-2"># View KeywordGenerator logs (weekly)</p>
                <code className="text-green-400 text-sm">firebase functions:log --only generateWeeklyKeywords</code>
              </div>
              <div className="bg-gray-900 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-2"># Check lifeKeywords for a user</p>
                <code className="text-green-400 text-sm">
                  {`firebase firestore:get lifeKeywords --where "userId=USER_ID" --limit 10`}
                </code>
              </div>
            </div>
          </div>

          {/* Life Connections */}
          <div>
            <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="text-rose-500">🔗</span> LifeConnectionsAnalyzer (lifeConnections subcollection)
            </h4>
            <div className="space-y-3">
              <div className="bg-gray-900 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-2"># View LifeConnectionsAnalyzer logs</p>
                <code className="text-green-400 text-sm">firebase functions:log --only analyzeLifeConnectionsScheduled</code>
              </div>
              <div className="bg-gray-900 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-2"># Check lifeConnections for a user (subcollection)</p>
                <code className="text-green-400 text-sm">
                  {`firebase firestore:get users/USER_ID/lifeConnections --limit 10`}
                </code>
              </div>
            </div>
          </div>

          {/* General */}
          <div>
            <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="text-gray-500">📋</span> General Debug Commands
            </h4>
            <div className="space-y-3">
              <div className="bg-gray-900 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-2"># View all Cloud Function logs (recent)</p>
                <code className="text-green-400 text-sm">firebase functions:log --limit 50</code>
              </div>
              <div className="bg-gray-900 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-2"># Check Firestore for a specific document</p>
                <code className="text-green-400 text-sm">npm run check:firestore -- doc lifeFeedPosts/DOCUMENT_ID</code>
              </div>
              <div className="bg-gray-900 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-2"># Count documents in a collection</p>
                <code className="text-green-400 text-sm">npm run check:firestore -- count lifeFeedPosts</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
