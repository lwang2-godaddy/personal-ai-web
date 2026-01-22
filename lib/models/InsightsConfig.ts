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
 */
export type InsightsCategory =
  | 'health'
  | 'activity'
  | 'location'
  | 'social'
  | 'productivity'
  | 'memory'
  | 'achievement'
  | 'general';

/**
 * All available categories
 */
export const INSIGHTS_CATEGORIES: InsightsCategory[] = [
  'health',
  'activity',
  'location',
  'social',
  'productivity',
  'memory',
  'achievement',
  'general',
];

/**
 * Category metadata (display info)
 */
export const CATEGORY_METADATA: Record<InsightsCategory, { icon: string; color: string; displayName: string }> = {
  health: { icon: '❤️', color: '#FF5252', displayName: 'Health Insights' },
  activity: { icon: '🏃', color: '#2196F3', displayName: 'Activity Insights' },
  location: { icon: '📍', color: '#4CAF50', displayName: 'Location Insights' },
  social: { icon: '👥', color: '#9C27B0', displayName: 'Social Insights' },
  productivity: { icon: '⚡', color: '#FF9800', displayName: 'Productivity Insights' },
  memory: { icon: '💭', color: '#3F51B5', displayName: 'Memory Highlights' },
  achievement: { icon: '🏆', color: '#FFC107', displayName: 'Achievements' },
  general: { icon: '📝', color: '#607D8B', displayName: 'General Insights' },
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
    location: {
      enabled: true,
      displayName: 'Location Insights',
      icon: '📍',
      color: '#4CAF50',
      description: 'Places, visits, patterns',
      schedule: { frequency: 'smart', time: '', timezone: 'UTC' },
      minConfidence: 0.7,
      maxPerDay: 3,
      cooldownHours: 6,
      notifications: { enabled: true, immediate: true, includeInSummary: false, priority: 'normal' },
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
    productivity: {
      enabled: true,
      displayName: 'Productivity Insights',
      icon: '⚡',
      color: '#FF9800',
      description: 'Productivity insights',
      schedule: { frequency: 'daily', time: '18:00', timezone: 'UTC' },
      minConfidence: 0.7,
      maxPerDay: 2,
      cooldownHours: 12,
      notifications: { enabled: true, immediate: false, includeInSummary: true, priority: 'normal' },
    },
    memory: {
      enabled: true,
      displayName: 'Memory Highlights',
      icon: '💭',
      color: '#3F51B5',
      description: 'Memory highlights, anniversaries',
      schedule: { frequency: 'weekly', time: '09:00', dayOfWeek: 6, timezone: 'UTC' },
      minConfidence: 0.7,
      maxPerDay: 2,
      cooldownHours: 24,
      notifications: { enabled: true, immediate: true, includeInSummary: false, priority: 'normal' },
    },
    achievement: {
      enabled: true,
      displayName: 'Achievements',
      icon: '🏆',
      color: '#FFC107',
      description: 'Milestones, achievements',
      schedule: { frequency: 'realtime', time: '', timezone: 'UTC' },
      minConfidence: 0.8,
      maxPerDay: 5,
      cooldownHours: 0,
      notifications: { enabled: true, immediate: true, includeInSummary: false, priority: 'high' },
    },
    general: {
      enabled: true,
      displayName: 'General Insights',
      icon: '📝',
      color: '#607D8B',
      description: 'General summaries, comparisons',
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
    showCategories: ['achievement', 'health', 'activity'],
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
