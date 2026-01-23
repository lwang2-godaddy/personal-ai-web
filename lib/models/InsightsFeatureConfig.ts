/**
 * InsightsFeatureConfig.ts - TypeScript interfaces for AI Feature configurations
 *
 * These types define the structure of admin-configurable AI feature settings
 * stored in Firestore at various config/ documents:
 * - config/insightsPostTypes - Post type configuration
 * - config/funFactsSettings - Fun Facts feature settings
 * - config/moodCompassSettings - Mood Compass feature settings
 * - config/memoryCompanionSettings - Memory Companion feature settings
 * - config/lifeForecasterSettings - Life Forecaster feature settings
 */

// ============================================================================
// Post Type Types
// ============================================================================

/**
 * Post types - maps to LifeFeedPostType in mobile app
 */
export type InsightsPostType =
  | 'life_summary'
  | 'milestone'
  | 'pattern_prediction'
  | 'reflective_insight'
  | 'memory_highlight'
  | 'streak_achievement'
  | 'comparison'
  | 'seasonal_reflection';

/**
 * All available post types
 */
export const INSIGHTS_POST_TYPES: InsightsPostType[] = [
  'life_summary',
  'milestone',
  'pattern_prediction',
  'reflective_insight',
  'memory_highlight',
  'streak_achievement',
  'comparison',
  'seasonal_reflection',
];

/**
 * Post type metadata (display info)
 */
export interface PostTypeMetadata {
  icon: string;
  color: string;
  displayName: string;
  description: string;
  prompts: {
    id: string;
    name: string;
    description: string;
  }[];
  /** Data requirements for this post type to be eligible for generation */
  requirements: string;
}

export const POST_TYPE_METADATA: Record<InsightsPostType, PostTypeMetadata> = {
  life_summary: {
    icon: '📋',
    color: '#607D8B',
    displayName: 'Life Update',
    description: 'Weekly/daily summaries',
    prompts: [
      { id: 'life_summary', name: 'life_summary', description: 'Casual weekly life update posts' },
      { id: 'life_summary_detailed', name: 'life_summary_detailed', description: 'Comprehensive update with specific stats and achievements' },
      { id: 'life_summary_minimal', name: 'life_summary_minimal', description: 'Brief, punchy update focusing on one standout moment' },
    ],
    requirements: 'Always eligible - no specific data requirements',
  },
  milestone: {
    icon: '🏆',
    color: '#FFC107',
    displayName: 'Milestone',
    description: 'Achievement announcements',
    prompts: [{ id: 'milestone', name: 'milestone', description: 'Personal milestone celebrations' }],
    requirements: 'Requires detected milestones (activity counts reaching thresholds like 10th, 25th, 50th visit)',
  },
  pattern_prediction: {
    icon: '🔮',
    color: '#9C27B0',
    displayName: 'Prediction',
    description: 'Future activity predictions',
    prompts: [
      { id: 'pattern_prediction', name: 'pattern_prediction', description: 'Excited prediction about upcoming habits' },
      { id: 'pattern_prediction_curious', name: 'pattern_prediction_curious', description: 'Curious, wondering tweet about pattern continuation' },
      { id: 'pattern_prediction_playful', name: 'pattern_prediction_playful', description: 'Playful, self-aware tweet about predictability' },
    ],
    requirements: 'Requires detected patterns (recurring activities, consistent schedules)',
  },
  reflective_insight: {
    icon: '💡',
    color: '#03A9F4',
    displayName: 'Insight',
    description: 'Behavioral insights',
    prompts: [
      { id: 'reflective_insight', name: 'reflective_insight', description: 'Thoughtful observations about habits' },
      { id: 'reflective_insight_mood', name: 'reflective_insight_mood', description: 'Insight connecting activity patterns to feelings' },
      { id: 'reflective_insight_discovery', name: 'reflective_insight_discovery', description: 'Tweet about a surprising self-discovery' },
    ],
    requirements: 'Requires steps > 0 OR activities > 0 OR locations > 0',
  },
  memory_highlight: {
    icon: '📸',
    color: '#E91E63',
    displayName: 'Memory',
    description: 'Anniversary highlights',
    prompts: [
      { id: 'memory_highlight', name: 'memory_highlight', description: 'Nostalgic recent memory celebration' },
      { id: 'memory_highlight_celebration', name: 'memory_highlight_celebration', description: 'Upbeat, celebratory tweet about a moment' },
      { id: 'memory_highlight_story', name: 'memory_highlight_story', description: 'Mini-story tweet with beginning, middle, and end' },
    ],
    requirements: 'Requires photos > 0 OR voice notes > 0 OR text notes > 0',
  },
  streak_achievement: {
    icon: '🔥',
    color: '#FF5722',
    displayName: 'Streak',
    description: 'Streak achievements',
    prompts: [{ id: 'streak_achievement', name: 'streak_achievement', description: 'Consistent habit celebrations' }],
    requirements: 'Requires detected streaks (consecutive days of activity)',
  },
  comparison: {
    icon: '📊',
    color: '#00BCD4',
    displayName: 'Comparison',
    description: 'Time period comparisons',
    prompts: [{ id: 'comparison', name: 'comparison', description: 'Activity period comparisons' }],
    requirements: 'Requires steps > 0 OR activities > 0 OR locations > 0',
  },
  seasonal_reflection: {
    icon: '🌟',
    color: '#8BC34A',
    displayName: 'Reflection',
    description: 'Seasonal summaries',
    prompts: [
      { id: 'seasonal_reflection', name: 'seasonal_reflection', description: 'Thoughtful review of season activities' },
      { id: 'seasonal_reflection_growth', name: 'seasonal_reflection_growth', description: 'Focus on personal growth and change' },
      { id: 'seasonal_reflection_gratitude', name: 'seasonal_reflection_gratitude', description: 'Gratitude-focused seasonal experiences' },
    ],
    requirements: 'Requires activities >= 2 OR patterns >= 2 OR events >= 1',
  },
};

// ============================================================================
// Life Keywords Prompts Metadata
// ============================================================================

/**
 * Prompt metadata for Life Keywords feature
 * Maps to prompts in lifeKeywords.yaml
 */
export const LIFE_KEYWORDS_PROMPTS = [
  { id: 'system', name: 'System Prompt', description: 'AI persona and guidelines for keyword generation' },
  { id: 'weekly_keyword', name: 'Weekly Keyword', description: 'Generate keywords from weekly data clusters' },
  { id: 'monthly_keyword', name: 'Monthly Keyword', description: 'Generate keywords from monthly data clusters' },
  { id: 'quarterly_keyword', name: 'Quarterly Keyword', description: 'Generate keywords from quarterly data clusters' },
  { id: 'yearly_keyword', name: 'Yearly Keyword', description: 'Generate keywords from yearly data clusters' },
  { id: 'enhance_keyword', name: 'Enhance Keyword', description: 'Improve low-confidence keywords' },
  { id: 'compare_keywords', name: 'Compare Keywords', description: 'Compare two time periods' },
] as const;

// ============================================================================
// Post Type Configuration
// ============================================================================

/**
 * Configuration for a single post type
 */
export interface PostTypeConfig {
  // Basic settings
  enabled: boolean;
  displayName: string;
  icon: string;
  description: string;

  // Generation settings
  cooldownDays: number;       // Min days between posts of this type
  priority: number;           // 1-10, higher = generated more often
  defaultCategory: string;    // Default category if not determined

  // Quality thresholds
  minConfidence: number;      // 0-1, minimum confidence to publish
  maxPerDay: number;          // Max posts of this type per day
}

/**
 * Admin configuration for all post types
 * Stored in Firestore at config/insightsPostTypes
 */
export interface InsightsPostTypesConfig {
  version: string;
  lastUpdatedAt: string;
  lastUpdatedBy: string;

  postTypes: Record<InsightsPostType, PostTypeConfig>;
}

// ============================================================================
// Fun Facts Configuration
// ============================================================================

/**
 * Fun Facts feature configuration
 * Stored in Firestore at config/funFactsSettings
 */
export interface FunFactsConfig {
  version: string;
  lastUpdatedAt: string;
  lastUpdatedBy: string;

  // Global settings
  enabled: boolean;
  maxFactsPerDay: number;
  cooldownHours: number;

  // Lookback periods (days) - how far back to analyze data
  lookbackDays: {
    healthData: number;      // Default: 90 - steps, sleep, heart rate
    activityData: number;    // Default: 90 - location with activities
    recentWindow: number;    // Default: 7 - for "this week" comparisons
  };

  // Cache settings (for carousel fun facts on mobile)
  cache: {
    carouselTTLHours: number;    // Default: 4 - how long to cache carousel facts
    promptTTLMinutes: number;    // Default: 60 - how long to cache prompts from API
  };

  // Milestone thresholds
  stepMilestones: number[];         // e.g., [100000, 500000, 1000000, ...]
  locationMilestones: number[];     // e.g., [10, 25, 50, 100, ...]
  activityMilestones: number[];     // e.g., [10, 25, 50, 100, ...]

  // Template toggles
  enabledTemplates: {
    stepMilestones: boolean;
    locationMilestones: boolean;
    activityMilestones: boolean;
    sleepFacts: boolean;
    workoutFacts: boolean;
    comparisonFacts: boolean;
  };

  // Notifications
  notifyOnFact: boolean;
}

// ============================================================================
// Mood Compass Configuration
// ============================================================================

/**
 * Mood Compass feature configuration
 * Maps to user toggle in ProfileScreen: preferences.aiFeatures.moodCompass
 * Stored in Firestore at config/moodCompassSettings
 */
export interface MoodCompassConfig {
  version: string;
  lastUpdatedAt: string;
  lastUpdatedBy: string;

  // Global settings
  enabled: boolean;

  // Analysis settings
  minCorrelation: number;           // Default: 0.5
  minDataPoints: number;            // Default: 14 (2 weeks)
  lookbackDays: number;             // Default: 30

  // Enabled factors for correlation
  enabledFactors: {
    steps: boolean;
    sleep: boolean;
    workouts: boolean;
    location: boolean;
    weather: boolean;
    socialActivity: boolean;
  };

  // Display settings
  showCorrelationScore: boolean;
  showTrendChart: boolean;

  // Anomaly detection
  anomalyDetection: {
    enabled: boolean;
    zScoreThreshold: number;        // Default: 2.0
    notifyOnAnomaly: boolean;
  };
}

// ============================================================================
// Memory Companion Configuration
// ============================================================================

/**
 * Memory Companion feature configuration
 * Maps to user toggle in ProfileScreen: preferences.aiFeatures.memoryCompanion
 * Stored in Firestore at config/memoryCompanionSettings
 */
export interface MemoryCompanionConfig {
  version: string;
  lastUpdatedAt: string;
  lastUpdatedBy: string;

  // Global settings
  enabled: boolean;

  // Memory surfacing settings
  lookbackDays: number;             // Default: 365 (1 year)
  surfacingFrequency: 'daily' | 'weekly' | 'smart';
  maxMemoriesPerSurface: number;    // Default: 3

  // Enabled triggers
  enabledTriggers: {
    anniversaries: boolean;         // "1 year ago today..."
    locationRevisits: boolean;      // "You're back at..."
    activityMilestones: boolean;    // "Your 100th visit to..."
    seasonalMemories: boolean;      // "This time last year..."
  };

  // Quality settings
  minRelevanceScore: number;        // Default: 0.7
  minMemoryAge: number;             // Minimum days old to surface (default: 7)

  // Notifications
  notifyOnMemory: boolean;
  notificationTime: string;         // "09:00" (24-hour format)
}

// ============================================================================
// Life Forecaster Configuration
// ============================================================================

/**
 * Life Forecaster feature configuration
 * Maps to user toggle in ProfileScreen: preferences.aiFeatures.lifeForecaster
 * Stored in Firestore at config/lifeForecasterSettings
 */
export interface LifeForecasterConfig {
  version: string;
  lastUpdatedAt: string;
  lastUpdatedBy: string;

  // Global settings
  enabled: boolean;

  // Pattern detection settings
  minOccurrences: number;           // Default: 3 (to detect pattern)
  minConfidence: number;            // Default: 0.7
  lookbackDays: number;             // Default: 30

  // Enabled categories for prediction
  enabledCategories: string[];      // e.g., ['activity', 'location', 'health']

  // Prediction settings
  maxPredictionsPerDay: number;     // Default: 3
  predictionHorizonDays: number;    // How far ahead to predict (default: 7)

  // Display settings
  showConfidenceScore: boolean;
  showPatternExplanation: boolean;

  // Notifications
  notifyOnPrediction: boolean;
  notificationTime: string;         // "08:00" (24-hour format)
}

// ============================================================================
// Default Values
// ============================================================================

/**
 * Default post type configuration
 */
export const DEFAULT_POST_TYPE_CONFIG: PostTypeConfig = {
  enabled: true,
  displayName: '',
  icon: '📝',
  description: '',
  cooldownDays: 1,
  priority: 5,
  defaultCategory: 'general',
  minConfidence: 0.7,
  maxPerDay: 3,
};

/**
 * Default post types admin config
 */
export const DEFAULT_POST_TYPES_CONFIG: InsightsPostTypesConfig = {
  version: '1.0.0',
  lastUpdatedAt: new Date().toISOString(),
  lastUpdatedBy: 'system',

  postTypes: {
    life_summary: {
      enabled: true,
      displayName: 'Life Update',
      icon: '📋',
      description: 'Weekly/daily summaries',
      cooldownDays: 1,
      priority: 8,
      defaultCategory: 'general',
      minConfidence: 0.6,
      maxPerDay: 2,
    },
    milestone: {
      enabled: true,
      displayName: 'Milestone',
      icon: '🏆',
      description: 'Achievement announcements',
      cooldownDays: 7,
      priority: 10,
      defaultCategory: 'achievement',
      minConfidence: 0.8,
      maxPerDay: 3,
    },
    pattern_prediction: {
      enabled: true,
      displayName: 'Prediction',
      icon: '🔮',
      description: 'Future activity predictions',
      cooldownDays: 1,
      priority: 7,
      defaultCategory: 'activity',
      minConfidence: 0.7,
      maxPerDay: 2,
    },
    reflective_insight: {
      enabled: true,
      displayName: 'Insight',
      icon: '💡',
      description: 'Behavioral insights',
      cooldownDays: 3,
      priority: 6,
      defaultCategory: 'general',
      minConfidence: 0.7,
      maxPerDay: 2,
    },
    memory_highlight: {
      enabled: true,
      displayName: 'Memory',
      icon: '📸',
      description: 'Anniversary highlights',
      cooldownDays: 7,
      priority: 5,
      defaultCategory: 'memory',
      minConfidence: 0.7,
      maxPerDay: 2,
    },
    streak_achievement: {
      enabled: true,
      displayName: 'Streak',
      icon: '🔥',
      description: 'Streak achievements',
      cooldownDays: 3,
      priority: 9,
      defaultCategory: 'achievement',
      minConfidence: 0.8,
      maxPerDay: 2,
    },
    comparison: {
      enabled: true,
      displayName: 'Comparison',
      icon: '📊',
      description: 'Time period comparisons',
      cooldownDays: 14,
      priority: 4,
      defaultCategory: 'general',
      minConfidence: 0.6,
      maxPerDay: 1,
    },
    seasonal_reflection: {
      enabled: true,
      displayName: 'Reflection',
      icon: '🌟',
      description: 'Seasonal summaries',
      cooldownDays: 30,
      priority: 3,
      defaultCategory: 'general',
      minConfidence: 0.6,
      maxPerDay: 1,
    },
  },
};

/**
 * Default Fun Facts configuration
 */
export const DEFAULT_FUN_FACTS_CONFIG: FunFactsConfig = {
  version: '1.0.0',
  lastUpdatedAt: new Date().toISOString(),
  lastUpdatedBy: 'system',

  enabled: true,
  maxFactsPerDay: 3,
  cooldownHours: 6,

  // Lookback periods (days)
  lookbackDays: {
    healthData: 90,      // Steps, sleep, heart rate analysis
    activityData: 90,    // Location with activities
    recentWindow: 7,     // "This week" comparisons
  },

  // Cache settings (for carousel fun facts on mobile)
  cache: {
    carouselTTLHours: 4,    // How long to cache carousel facts before regenerating
    promptTTLMinutes: 60,   // How long to cache prompts from API
  },

  stepMilestones: [50000, 100000, 250000, 500000, 1000000, 2500000, 5000000, 10000000],
  locationMilestones: [10, 25, 50, 100, 250, 500, 1000],
  activityMilestones: [10, 25, 50, 100, 250, 500, 1000],

  enabledTemplates: {
    stepMilestones: true,
    locationMilestones: true,
    activityMilestones: true,
    sleepFacts: true,
    workoutFacts: true,
    comparisonFacts: true,
  },

  notifyOnFact: true,
};

/**
 * Default Mood Compass configuration
 */
export const DEFAULT_MOOD_COMPASS_CONFIG: MoodCompassConfig = {
  version: '1.0.0',
  lastUpdatedAt: new Date().toISOString(),
  lastUpdatedBy: 'system',

  enabled: true,

  minCorrelation: 0.5,
  minDataPoints: 14,
  lookbackDays: 30,

  enabledFactors: {
    steps: true,
    sleep: true,
    workouts: true,
    location: true,
    weather: false,
    socialActivity: true,
  },

  showCorrelationScore: true,
  showTrendChart: true,

  anomalyDetection: {
    enabled: true,
    zScoreThreshold: 2.0,
    notifyOnAnomaly: true,
  },
};

/**
 * Default Memory Companion configuration
 */
export const DEFAULT_MEMORY_COMPANION_CONFIG: MemoryCompanionConfig = {
  version: '1.0.0',
  lastUpdatedAt: new Date().toISOString(),
  lastUpdatedBy: 'system',

  enabled: true,

  lookbackDays: 365,
  surfacingFrequency: 'smart',
  maxMemoriesPerSurface: 3,

  enabledTriggers: {
    anniversaries: true,
    locationRevisits: true,
    activityMilestones: true,
    seasonalMemories: true,
  },

  minRelevanceScore: 0.7,
  minMemoryAge: 7,

  notifyOnMemory: true,
  notificationTime: '09:00',
};

/**
 * Default Life Forecaster configuration
 */
export const DEFAULT_LIFE_FORECASTER_CONFIG: LifeForecasterConfig = {
  version: '1.0.0',
  lastUpdatedAt: new Date().toISOString(),
  lastUpdatedBy: 'system',

  enabled: true,

  minOccurrences: 3,
  minConfidence: 0.7,
  lookbackDays: 30,

  enabledCategories: ['activity', 'location', 'health'],

  maxPredictionsPerDay: 3,
  predictionHorizonDays: 7,

  showConfidenceScore: true,
  showPatternExplanation: true,

  notifyOnPrediction: true,
  notificationTime: '08:00',
};

/**
 * Default Life Keywords configuration
 */
export const DEFAULT_LIFE_KEYWORDS_CONFIG: LifeKeywordsConfig = {
  version: '1.0.0',
  lastUpdatedAt: new Date().toISOString(),
  lastUpdatedBy: 'system',

  enabled: true,

  keywordsPerWeek: 3,
  keywordsPerMonth: 5,
  keywordsPerQuarter: 3,
  keywordsPerYear: 10,

  enabledPeriods: {
    weekly: true,
    monthly: true,
    quarterly: true,
    yearly: true,
  },

  minDataPointsWeekly: 10,
  minDataPointsMonthly: 30,
  minConfidence: 0.6,

  maxLookbackMonths: 12,

  weeklyGenerationDay: 1,
  monthlyGenerationDay: 1,
  generationHourUTC: 8,

  enabledCategories: {
    health: true,
    activity: true,
    social: true,
    work: true,
    travel: true,
    learning: true,
    creativity: true,
    routine: true,
    milestone: true,
    memory: true,
    location: true,
    general: true,
  },
};

// ============================================================================
// Life Keywords Configuration
// ============================================================================

/**
 * Life Keywords feature configuration
 * Maps to user toggle in ProfileScreen: preferences.aiFeatures.lifeKeywords
 * Stored in Firestore at config/lifeKeywordsSettings
 */
export interface LifeKeywordsConfig {
  version: string;
  lastUpdatedAt: string;
  lastUpdatedBy: string;

  // Global toggle
  enabled: boolean;

  // Generation settings per period type
  keywordsPerWeek: number;      // Default: 3
  keywordsPerMonth: number;     // Default: 5
  keywordsPerQuarter: number;   // Default: 3
  keywordsPerYear: number;      // Default: 10

  // Period settings
  enabledPeriods: {
    weekly: boolean;            // Default: true
    monthly: boolean;           // Default: true
    quarterly: boolean;         // Default: true
    yearly: boolean;            // Default: true
  };

  // Data requirements
  minDataPointsWeekly: number;  // Default: 10
  minDataPointsMonthly: number; // Default: 30
  minConfidence: number;        // Default: 0.6

  // Lookback
  maxLookbackMonths: number;    // Default: 12 (show up to 1 year)

  // Generation schedule
  weeklyGenerationDay: number;  // 0=Sunday, 1=Monday, etc. Default: 1 (Monday)
  monthlyGenerationDay: number; // Day of month. Default: 1
  generationHourUTC: number;    // Hour to run. Default: 8

  // Categories (uses unified 12-category system)
  enabledCategories: Record<UnifiedCategory, boolean>;
}

/**
 * Unified category type for Life Feed posts and Life Keywords
 * This is the single source of truth for all category types.
 */
export type UnifiedCategory =
  | 'health'      // Fitness, sleep, wellness
  | 'activity'    // Hobbies, sports, recreation
  | 'social'      // People, relationships, gatherings
  | 'work'        // Productivity, career, projects
  | 'travel'      // Places, trips, exploration
  | 'learning'    // Education, skills, growth
  | 'creativity'  // Art, music, writing
  | 'routine'     // Daily habits, patterns
  | 'milestone'   // Achievements, firsts, celebrations
  | 'memory'      // Photos, voice notes, special moments
  | 'location'    // Places visited, check-ins
  | 'general';    // Other themes

// Alias for backward compatibility
export type LifeKeywordCategory = UnifiedCategory;

/**
 * All unified categories in display order
 */
export const UNIFIED_CATEGORIES: UnifiedCategory[] = [
  'health',
  'activity',
  'social',
  'work',
  'travel',
  'learning',
  'creativity',
  'routine',
  'milestone',
  'memory',
  'location',
  'general',
];

// Alias for backward compatibility
export const LIFE_KEYWORD_CATEGORIES = UNIFIED_CATEGORIES;

/**
 * Category metadata for display (unified for all features)
 */
export const KEYWORD_CATEGORY_METADATA: Record<UnifiedCategory, {
  icon: string;
  color: string;
  displayName: string;
}> = {
  health: { icon: '💪', color: '#4CAF50', displayName: 'Health & Wellness' },
  activity: { icon: '🏃', color: '#2196F3', displayName: 'Activities' },
  social: { icon: '👥', color: '#E91E63', displayName: 'Social' },
  work: { icon: '💼', color: '#607D8B', displayName: 'Work' },
  travel: { icon: '✈️', color: '#FF9800', displayName: 'Travel' },
  learning: { icon: '📚', color: '#9C27B0', displayName: 'Learning' },
  creativity: { icon: '🎨', color: '#F44336', displayName: 'Creativity' },
  routine: { icon: '📅', color: '#00BCD4', displayName: 'Routines' },
  milestone: { icon: '🏆', color: '#FFC107', displayName: 'Milestones' },
  memory: { icon: '📸', color: '#3F51B5', displayName: 'Memories' },
  location: { icon: '📍', color: '#8BC34A', displayName: 'Locations' },
  general: { icon: '✨', color: '#795548', displayName: 'General' },
};

// ============================================================================
// Analytics Types
// ============================================================================

/**
 * Post type analytics data
 */
export interface PostTypeAnalytics {
  totalByType: Record<InsightsPostType, number>;
  last24hByType: Record<InsightsPostType, number>;
  last7dByType: Record<InsightsPostType, number>;
}

/**
 * Feature-level analytics
 */
export interface FeatureAnalytics {
  funFacts: {
    totalGenerated: number;
    last24h: number;
    last7d: number;
    byTemplate: Record<string, number>;
  };
  moodCompass: {
    totalAnalyses: number;
    anomaliesDetected: number;
    avgCorrelation: number;
  };
  memoryCompanion: {
    memoriesSurfaced: number;
    engagementRate: number;
  };
  lifeForecaster: {
    predictionsGenerated: number;
    accuracyRate: number;
  };
  lifeKeywords: {
    totalGenerated: number;
    last24h: number;
    last7d: number;
    byPeriodType: Record<string, number>;
    byCategory: Record<string, number>;
    avgConfidence: number;
    viewRate: number;
    expandRate: number;
  };
}

// ============================================================================
// Scheduler Configuration
// ============================================================================

/**
 * Insights Scheduler Configuration
 * Controls when insights are generated. Note: Schedule changes require
 * redeploying Firebase Cloud Functions to take effect.
 * Stored in Firestore at config/insightsSchedulerSettings
 */
export interface InsightsSchedulerConfig {
  version: string;
  lastUpdatedAt: string;
  lastUpdatedBy: string;

  // Schedule times (24-hour format, UTC)
  morningHour: number;    // Default: 8
  afternoonHour: number;  // Default: 14
  eveningHour: number;    // Default: 20

  // Timezone (fixed to UTC for Firebase scheduler)
  timezone: 'UTC';

  // Generated cron expression (derived from hours)
  cronExpression: string; // Generated: '0 8,14,20 * * *'
}

/**
 * Default scheduler configuration
 */
export const DEFAULT_SCHEDULER_CONFIG: InsightsSchedulerConfig = {
  version: '1.0.0',
  lastUpdatedAt: new Date().toISOString(),
  lastUpdatedBy: 'system',
  morningHour: 8,
  afternoonHour: 14,
  eveningHour: 20,
  timezone: 'UTC',
  cronExpression: '0 8,14,20 * * *',
};
