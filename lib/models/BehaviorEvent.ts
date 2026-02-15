/**
 * BehaviorEvent.ts
 *
 * Data models for user behavior tracking
 * Tracks screen views, feature usage, and session analytics
 */

// ============================================================================
// Event Types and Categories
// ============================================================================

export type BehaviorEventType =
  | 'screen_view'
  | 'feature_use'
  | 'session_start'
  | 'session_end';

export type BehaviorCategory =
  | 'navigation'
  | 'data_input'
  | 'ai_interaction'
  | 'settings'
  | 'social'
  | 'system';

export type BehaviorTargetType =
  | 'screen'
  | 'button'
  | 'input'
  | 'modal'
  | 'toggle'
  | 'menu'
  | 'link';

export type BehaviorPlatform = 'mobile' | 'web';

// ============================================================================
// Core Models
// ============================================================================

/**
 * Individual behavior event
 * Stored in: behaviorEvents/{eventId}
 */
export interface BehaviorEvent {
  id: string;
  userId: string;
  timestamp: string; // ISO 8601

  // Event classification
  eventType: BehaviorEventType;
  category: BehaviorCategory;

  // What was interacted with
  action: string; // e.g., 'view', 'click', 'submit', 'toggle'
  target: string; // e.g., 'home', 'send_chat_message', 'enable_dark_mode'
  targetType: BehaviorTargetType;

  // Context
  platform: BehaviorPlatform;
  sessionId: string;
  previousScreen?: string;

  // Optional metadata
  metadata?: Record<string, any>;

  // Indexing fields
  createdAt: string; // ISO 8601, same as timestamp
}

/**
 * User session
 * Stored in: behaviorSessions/{sessionId}
 */
export interface BehaviorSession {
  id: string;
  userId: string;
  platform: BehaviorPlatform;

  // Timing
  startedAt: string; // ISO 8601
  endedAt?: string; // ISO 8601
  durationMs?: number;

  // Activity summary
  screenViewCount: number;
  featureUseCount: number;
  screensVisited: string[]; // Unique screen names
  featuresUsed: string[]; // Unique feature names

  // Device info (optional)
  userAgent?: string;
  deviceType?: 'desktop' | 'tablet' | 'mobile';
  browser?: string;
  os?: string;

  // Status
  isActive: boolean;
  lastActivityAt: string; // ISO 8601
}

/**
 * Daily aggregated statistics per user
 * Stored in: behaviorDaily/{userId}_{date}
 */
export interface BehaviorDailyStats {
  id: string; // userId_date (e.g., "user123_2025-01-19")
  userId: string;
  date: string; // YYYY-MM-DD

  // Session metrics
  sessionCount: number;
  totalDurationMs: number;
  avgSessionDurationMs: number;

  // Event counts
  screenViewCount: number;
  featureUseCount: number;

  // Breakdown by screen
  screenBreakdown: Record<string, number>; // { "home": 5, "chat": 3 }

  // Breakdown by feature
  featureBreakdown: Record<string, number>; // { "send_chat_message": 10, "record_voice": 2 }

  // Platform breakdown
  platformBreakdown: Record<BehaviorPlatform, number>;

  // Aggregation timestamps
  createdAt: string;
  updatedAt: string;
}

/**
 * Monthly aggregated statistics per user
 * Stored in: behaviorMonthly/{userId}_{month}
 */
export interface BehaviorMonthlyStats {
  id: string; // userId_month (e.g., "user123_2025-01")
  userId: string;
  month: string; // YYYY-MM

  // Session metrics
  sessionCount: number;
  totalDurationMs: number;
  avgSessionDurationMs: number;
  activeDays: number; // Days with at least one session

  // Event counts
  screenViewCount: number;
  featureUseCount: number;

  // Top screens (top 10)
  topScreens: Array<{ screen: string; count: number }>;

  // Top features (top 10)
  topFeatures: Array<{ feature: string; count: number }>;

  // Platform breakdown
  platformBreakdown: Record<BehaviorPlatform, number>;

  // Aggregation timestamps
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Admin Dashboard Types
// ============================================================================

/**
 * System-wide behavior overview for admin dashboard
 */
export interface BehaviorOverview {
  // Time range
  startDate: string;
  endDate: string;

  // User metrics
  activeUsers: number; // Users with at least one session
  newUsers: number; // Users with first session in this period

  // Session metrics
  totalSessions: number;
  avgSessionsPerUser: number;
  avgSessionDurationMs: number;

  // Event metrics
  totalScreenViews: number;
  totalFeatureUses: number;

  // Platform breakdown
  platformBreakdown: Record<BehaviorPlatform, {
    users: number;
    sessions: number;
  }>;

  // Top screens (top 10)
  topScreens: Array<{ screen: string; count: number; uniqueUsers: number }>;

  // Top features (top 10)
  topFeatures: Array<{ feature: string; count: number; uniqueUsers: number }>;

  // Daily trend
  dailyTrend: Array<{
    date: string;
    activeUsers: number;
    sessions: number;
    screenViews: number;
    featureUses: number;
  }>;
}

/**
 * User-specific behavior summary for admin
 */
export interface UserBehaviorSummary {
  userId: string;
  displayName?: string;
  email?: string;

  // Lifetime metrics
  firstSessionAt: string;
  lastSessionAt: string;
  totalSessions: number;
  totalDurationMs: number;

  // Recent activity
  recentSessions: BehaviorSession[];
  recentEvents: BehaviorEvent[];

  // Patterns
  topScreens: Array<{ screen: string; count: number }>;
  topFeatures: Array<{ feature: string; count: number }>;
  preferredPlatform: BehaviorPlatform;

  // Engagement score (0-100)
  engagementScore: number;
}

/**
 * PostHog analytics overview from PostHog API
 */
export interface PostHogOverview {
  totalEvents: number;
  uniqueUsers: number;
  topEvents: Array<{ event: string; count: number; uniqueUsers: number }>;
  dailyTrend: Array<{ date: string; events: number; uniqueUsers: number }>;
  configured: boolean; // false if API key not set
  setupGuide?: string; // instructions if not configured
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Batch events request from client
 */
export interface TrackEventsRequest {
  events: Omit<BehaviorEvent, 'id' | 'createdAt'>[];
  sessionId: string;
}

/**
 * Session start request
 */
export interface StartSessionRequest {
  platform: BehaviorPlatform;
  userAgent?: string;
  deviceType?: 'desktop' | 'tablet' | 'mobile';
  browser?: string;
  os?: string;
}

/**
 * Session end request
 */
export interface EndSessionRequest {
  sessionId: string;
}

/**
 * API response types
 */
export interface TrackEventsResponse {
  success: boolean;
  eventsTracked: number;
}

export interface StartSessionResponse {
  sessionId: string;
  startedAt: string;
}

export interface EndSessionResponse {
  success: boolean;
  durationMs: number;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Predefined screens for consistent tracking
 */
export const TRACKED_SCREENS = {
  // Auth
  login: 'login',

  // Dashboard
  dashboard: 'dashboard',
  chat: 'chat',
  create: 'create',
  search: 'search',

  // Events
  events: 'events',
  eventsSearch: 'events_search',

  // Circles
  circles: 'circles',
  circlesCreate: 'circles_create',
  circlesInvites: 'circles_invites',
  circleDetail: 'circle_detail',
  circleChat: 'circle_chat',
  circleMembers: 'circle_members',
  circleChallenges: 'circle_challenges',
  circleAnalytics: 'circle_analytics',

  // Notifications
  notificationsHistory: 'notifications_history',

  // Settings
  settings: 'settings',
  settingsNotifications: 'settings_notifications',
  settingsQuietHours: 'settings_quiet_hours',
  settingsLifeFeed: 'settings_life_feed',

  // Admin (16 screens)
  adminOverview: 'admin_overview',
  adminUsers: 'admin_users',
  adminUserDetail: 'admin_user_detail',
  adminUsage: 'admin_usage',
  adminUsageTest: 'admin_usage_test',
  adminBehavior: 'admin_behavior',
  adminSubscriptions: 'admin_subscriptions',
  adminPricing: 'admin_pricing',
  adminAiModels: 'admin_ai_models',
  adminPrompts: 'admin_prompts',
  adminPromptDetail: 'admin_prompt_detail',
  adminVoiceCategories: 'admin_voice_categories',
  adminAppSettings: 'admin_app_settings',
  adminMigrations: 'admin_migrations',
  adminMigrationDetail: 'admin_migration_detail',
  adminExploreQuestions: 'admin_explore_questions',
  adminDocs: 'admin_docs',
  adminDemoData: 'admin_demo_data',
  adminTesting: 'admin_testing',

  // Mobile (for cross-platform compatibility)
  home: 'home',
  diary: 'diary',
  diaryEditor: 'diary_editor',
  profile: 'profile',
} as const;

/**
 * Predefined features for consistent tracking
 */
export const TRACKED_FEATURES = {
  // Chat
  sendChatMessage: 'send_chat_message',
  clearChatHistory: 'clear_chat_history',
  startVoiceChat: 'start_voice_chat',
  stopVoiceChat: 'stop_voice_chat',

  // Voice
  startVoiceRecording: 'start_voice_recording',
  stopVoiceRecording: 'stop_voice_recording',

  // Dashboard
  submitQuickThought: 'submit_quick_thought',
  clickStatCard: 'click_stat_card',
  clickQuickAction: 'click_quick_action',

  // Content creation
  createNote: 'create_note',
  editNote: 'edit_note',
  deleteNote: 'delete_note',
  uploadPhoto: 'upload_photo',
  recordVoice: 'record_voice',

  // Events
  createEvent: 'create_event',
  editEvent: 'edit_event',
  deleteEvent: 'delete_event',
  changeCalendarView: 'change_calendar_view',
  switchEventsTab: 'switch_events_tab',
  changeEventFilter: 'change_event_filter',

  // Circles
  createCircle: 'create_circle',
  joinCircle: 'join_circle',
  leaveCircle: 'leave_circle',
  sendCircleMessage: 'send_circle_message',
  startChallenge: 'start_challenge',
  completeChallenge: 'complete_challenge',
  acceptInvite: 'accept_invite',
  declineInvite: 'decline_invite',

  // Settings
  toggleSetting: 'toggle_setting',
  refreshStorageUsage: 'refresh_storage_usage',
  changeTtsProvider: 'change_tts_provider',
  changeLanguage: 'change_language',
  updateQuietHours: 'update_quiet_hours',
  updateNotificationPreferences: 'update_notification_preferences',

  // Navigation
  search: 'search',
  filterResults: 'filter_results',
  clickNavItem: 'click_nav_item',

  // Auth
  signIn: 'sign_in',
  signOut: 'sign_out',

  // Admin
  loadAnalyticsData: 'load_analytics_data',
  exportData: 'export_data',
  changeDateRange: 'change_date_range',
  suspendUser: 'suspend_user',
  changeUserTier: 'change_user_tier',
  updateAppSetting: 'update_app_setting',
  runMigration: 'run_migration',
  updatePrompt: 'update_prompt',
  updatePricing: 'update_pricing',
  updateAiModel: 'update_ai_model',

  // Analytics (legacy)
  viewAnalytics: 'view_analytics',

  // Social
  shareContent: 'share_content',
  inviteFriend: 'invite_friend',
} as const;

/**
 * Batch configuration
 */
export const BEHAVIOR_TRACKING_CONFIG = {
  // Mobile: batch every 30 seconds
  mobileBatchIntervalMs: 30000,
  mobileMaxBatchSize: 20,

  // Web: batch every 15 seconds (more frequent due to reliable connection)
  webBatchIntervalMs: 15000,
  webMaxBatchSize: 10,

  // Session timeout: 30 minutes of inactivity
  sessionTimeoutMs: 30 * 60 * 1000,

  // Storage key for offline queue
  offlineQueueKey: 'behavior_tracking_queue',
} as const;
