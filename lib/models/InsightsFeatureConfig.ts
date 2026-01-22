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
}

export const POST_TYPE_METADATA: Record<InsightsPostType, PostTypeMetadata> = {
  life_summary: {
    icon: '📋',
    color: '#607D8B',
    displayName: 'Life Update',
    description: 'Weekly/daily summaries',
    prompts: [{ id: 'life_summary', name: 'life-summary-post', description: 'Weekly life update posts' }],
  },
  milestone: {
    icon: '🏆',
    color: '#FFC107',
    displayName: 'Milestone',
    description: 'Achievement announcements',
    prompts: [{ id: 'milestone', name: 'milestone-post', description: 'Personal milestone celebrations' }],
  },
  pattern_prediction: {
    icon: '🔮',
    color: '#9C27B0',
    displayName: 'Prediction',
    description: 'Future activity predictions',
    prompts: [{ id: 'pattern_prediction', name: 'pattern-prediction-post', description: 'Behavior predictions based on patterns' }],
  },
  reflective_insight: {
    icon: '💡',
    color: '#03A9F4',
    displayName: 'Insight',
    description: 'Behavioral insights',
    prompts: [{ id: 'reflective_insight', name: 'reflective-insight-post', description: 'Thoughtful observations about habits' }],
  },
  memory_highlight: {
    icon: '📸',
    color: '#E91E63',
    displayName: 'Memory',
    description: 'Anniversary highlights',
    prompts: [{ id: 'memory_highlight', name: 'memory-highlight-post', description: 'Recent memory celebrations' }],
  },
  streak_achievement: {
    icon: '🔥',
    color: '#FF5722',
    displayName: 'Streak',
    description: 'Streak achievements',
    prompts: [{ id: 'streak_achievement', name: 'streak-achievement-post', description: 'Consistent habit celebrations' }],
  },
  comparison: {
    icon: '📊',
    color: '#00BCD4',
    displayName: 'Comparison',
    description: 'Time period comparisons',
    prompts: [{ id: 'comparison', name: 'comparison-post', description: 'Activity period comparisons' }],
  },
  seasonal_reflection: {
    icon: '🌟',
    color: '#8BC34A',
    displayName: 'Reflection',
    description: 'Seasonal summaries',
    prompts: [{ id: 'seasonal_reflection', name: 'seasonal-reflection-post', description: 'Long-term reflections' }],
  },
};

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
}
