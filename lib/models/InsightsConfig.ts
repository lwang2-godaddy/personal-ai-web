/**
 * InsightsConfig.ts - TypeScript interfaces for Insights admin configuration
 *
 * These types define the structure of the admin-configurable Insights settings
 * stored in Firestore at config/insightsSettings
 */

// ============================================================================
// Category Types
// ============================================================================

/**
 * Insights category types - maps to LifeFeedCategory in mobile app
 * 12 categories that posts can be assigned to
 */
export type InsightsCategory =
  | 'health'
  | 'activity'
  | 'social'
  | 'work'
  | 'travel'
  | 'learning'
  | 'creativity'
  | 'routine'
  | 'milestone'
  | 'memory'
  | 'location'
  | 'general';

/**
 * All available categories (12 total)
 */
export const INSIGHTS_CATEGORIES: InsightsCategory[] = [
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

/**
 * Category metadata (display info) - 12 categories
 */
export const CATEGORY_METADATA: Record<InsightsCategory, { icon: string; color: string; displayName: string }> = {
  health: { icon: '❤️', color: '#FF5252', displayName: 'Health' },
  activity: { icon: '🏃', color: '#2196F3', displayName: 'Activity' },
  social: { icon: '👥', color: '#9C27B0', displayName: 'Social' },
  work: { icon: '💼', color: '#795548', displayName: 'Work' },
  travel: { icon: '✈️', color: '#00BCD4', displayName: 'Travel' },
  learning: { icon: '📚', color: '#673AB7', displayName: 'Learning' },
  creativity: { icon: '🎨', color: '#E91E63', displayName: 'Creativity' },
  routine: { icon: '🔄', color: '#607D8B', displayName: 'Routine' },
  milestone: { icon: '🏆', color: '#FFC107', displayName: 'Milestone' },
  memory: { icon: '💭', color: '#3F51B5', displayName: 'Memory' },
  location: { icon: '📍', color: '#4CAF50', displayName: 'Location' },
  general: { icon: '📝', color: '#9E9E9E', displayName: 'General' },
};

// ============================================================================
// Admin Config Types
// ============================================================================

/**
 * Schedule configuration for each category
 */
export interface InsightsCategorySchedule {
  frequency: 'realtime' | 'daily' | 'weekly' | 'smart';
  time: string; // "08:00" (24-hour format)
  dayOfWeek?: number; // 0-6 for weekly (0 = Sunday)
  timezone: string; // "UTC" or user's timezone
}

/**
 * Notification configuration for each category
 */
export interface InsightsCategoryNotifications {
  enabled: boolean;
  immediate: boolean;
  includeInSummary: boolean;
  priority: 'low' | 'normal' | 'high';
}

/**
 * Admin-configurable category settings
 */
export interface InsightsAdminCategoryConfig {
  // Basic settings
  enabled: boolean;
  displayName: string;
  icon: string;
  color: string;
  description: string;

  // Generation settings
  schedule: InsightsCategorySchedule;

  // Quality thresholds
  minConfidence: number; // 0-1
  maxPerDay: number;
  cooldownHours: number;

  // Notifications
  notifications: InsightsCategoryNotifications;
}

/**
 * Home feed configuration (admin-configurable)
 */
export interface InsightsHomeFeedConfig {
  enabled: boolean;
  maxItems: number;
  showCategories: InsightsCategory[];
  refreshInterval: number; // Hours between refresh
  cardStyle: 'compact' | 'expanded';
}

/**
 * Global admin configuration for Insights system
 * Stored in Firestore at config/insightsSettings
 */
export interface InsightsAdminConfig {
  // Global feature flags
  enabled: boolean;
  version: string;
  lastUpdatedAt: string;
  lastUpdatedBy: string;

  // Per-category configuration
  categories: Record<InsightsCategory, InsightsAdminCategoryConfig>;

  // Home feed configuration
  homeFeed: InsightsHomeFeedConfig;

  // Global rate limits
  maxPostsPerUserPerDay: number;
  globalCooldownHours: number;
}

// ============================================================================
// Default Values
// ============================================================================

/**
 * Default category configuration
 */
export const DEFAULT_CATEGORY_CONFIG: InsightsAdminCategoryConfig = {
  enabled: true,
  displayName: '',
  icon: '📝',
  color: '#607D8B',
  description: '',
  schedule: {
    frequency: 'daily',
    time: '09:00',
    timezone: 'UTC',
  },
  minConfidence: 0.7,
  maxPerDay: 3,
  cooldownHours: 6,
  notifications: {
    enabled: true,
    immediate: false,
    includeInSummary: true,
    priority: 'normal',
  },
};

/**
 * Default admin config values
 */
export const DEFAULT_INSIGHTS_ADMIN_CONFIG: InsightsAdminConfig = {
  enabled: true,
  version: '1.0.0',
  lastUpdatedAt: new Date().toISOString(),
  lastUpdatedBy: 'system',

  categories: {
    health: {
      enabled: true,
      displayName: 'Health Insights',
      icon: '❤️',
      color: '#FF5252',
      description: 'Health data, sleep, heart rate',
      schedule: { frequency: 'daily', time: '08:00', timezone: 'UTC' },
      minConfidence: 0.7,
      maxPerDay: 3,
      cooldownHours: 6,
      notifications: { enabled: true, immediate: true, includeInSummary: true, priority: 'high' },
    },
    activity: {
      enabled: true,
      displayName: 'Activity Insights',
      icon: '🏃',
      color: '#2196F3',
      description: 'Workouts, activities, streaks',
      schedule: { frequency: 'daily', time: '09:00', timezone: 'UTC' },
      minConfidence: 0.7,
      maxPerDay: 3,
      cooldownHours: 6,
      notifications: { enabled: true, immediate: false, includeInSummary: true, priority: 'normal' },
    },
    social: {
      enabled: true,
      displayName: 'Social Insights',
      icon: '👥',
      color: '#9C27B0',
      description: 'Social activities',
      schedule: { frequency: 'weekly', time: '10:00', dayOfWeek: 0, timezone: 'UTC' },
      minConfidence: 0.7,
      maxPerDay: 2,
      cooldownHours: 24,
      notifications: { enabled: true, immediate: false, includeInSummary: true, priority: 'low' },
    },
    work: {
      enabled: true,
      displayName: 'Work Insights',
      icon: '💼',
      color: '#795548',
      description: 'Productivity, career, projects',
      schedule: { frequency: 'daily', time: '18:00', timezone: 'UTC' },
      minConfidence: 0.7,
      maxPerDay: 2,
      cooldownHours: 12,
      notifications: { enabled: true, immediate: false, includeInSummary: true, priority: 'normal' },
    },
    travel: {
      enabled: true,
      displayName: 'Travel Insights',
      icon: '✈️',
      color: '#00BCD4',
      description: 'Places, trips, exploration',
      schedule: { frequency: 'smart', time: '', timezone: 'UTC' },
      minConfidence: 0.7,
      maxPerDay: 2,
      cooldownHours: 12,
      notifications: { enabled: true, immediate: true, includeInSummary: true, priority: 'normal' },
    },
    learning: {
      enabled: true,
      displayName: 'Learning Insights',
      icon: '📚',
      color: '#673AB7',
      description: 'Education, skills, growth',
      schedule: { frequency: 'weekly', time: '10:00', dayOfWeek: 0, timezone: 'UTC' },
      minConfidence: 0.7,
      maxPerDay: 2,
      cooldownHours: 24,
      notifications: { enabled: true, immediate: false, includeInSummary: true, priority: 'normal' },
    },
    creativity: {
      enabled: true,
      displayName: 'Creativity Insights',
      icon: '🎨',
      color: '#E91E63',
      description: 'Art, music, writing',
      schedule: { frequency: 'weekly', time: '10:00', dayOfWeek: 6, timezone: 'UTC' },
      minConfidence: 0.7,
      maxPerDay: 2,
      cooldownHours: 24,
      notifications: { enabled: true, immediate: false, includeInSummary: true, priority: 'normal' },
    },
    routine: {
      enabled: true,
      displayName: 'Routine Insights',
      icon: '🔄',
      color: '#607D8B',
      description: 'Daily habits, patterns',
      schedule: { frequency: 'daily', time: '20:00', timezone: 'UTC' },
      minConfidence: 0.6,
      maxPerDay: 2,
      cooldownHours: 12,
      notifications: { enabled: true, immediate: false, includeInSummary: true, priority: 'normal' },
    },
    milestone: {
      enabled: true,
      displayName: 'Milestone Insights',
      icon: '🏆',
      color: '#FFC107',
      description: 'Achievements, firsts, celebrations',
      schedule: { frequency: 'realtime', time: '', timezone: 'UTC' },
      minConfidence: 0.8,
      maxPerDay: 5,
      cooldownHours: 0,
      notifications: { enabled: true, immediate: true, includeInSummary: false, priority: 'high' },
    },
    memory: {
      enabled: true,
      displayName: 'Memory Insights',
      icon: '💭',
      color: '#3F51B5',
      description: 'Photos, voice notes, special moments',
      schedule: { frequency: 'weekly', time: '09:00', dayOfWeek: 6, timezone: 'UTC' },
      minConfidence: 0.7,
      maxPerDay: 2,
      cooldownHours: 24,
      notifications: { enabled: true, immediate: true, includeInSummary: false, priority: 'normal' },
    },
    location: {
      enabled: true,
      displayName: 'Location Insights',
      icon: '📍',
      color: '#4CAF50',
      description: 'Places visited, check-ins',
      schedule: { frequency: 'smart', time: '', timezone: 'UTC' },
      minConfidence: 0.7,
      maxPerDay: 3,
      cooldownHours: 6,
      notifications: { enabled: true, immediate: true, includeInSummary: false, priority: 'normal' },
    },
    general: {
      enabled: true,
      displayName: 'General Insights',
      icon: '📝',
      color: '#9E9E9E',
      description: 'General summaries, other themes',
      schedule: { frequency: 'daily', time: '20:00', timezone: 'UTC' },
      minConfidence: 0.6,
      maxPerDay: 3,
      cooldownHours: 6,
      notifications: { enabled: true, immediate: false, includeInSummary: true, priority: 'normal' },
    },
  },

  homeFeed: {
    enabled: true,
    maxItems: 3,
    showCategories: ['milestone', 'health', 'activity'],
    refreshInterval: 4,
    cardStyle: 'compact',
  },

  maxPostsPerUserPerDay: 10,
  globalCooldownHours: 2,
};

// ============================================================================
// Analytics Types
// ============================================================================

/**
 * Insights analytics data (for admin dashboard)
 */
export interface InsightsAnalytics {
  totalPostsGenerated: number;
  postsGeneratedToday: number;
  postsGeneratedThisWeek: number;
  postsByCategory: Record<InsightsCategory, number>;
  averageEngagementRate: number;
  notificationDeliveryRate: number;
  lastUpdated: string;
}
