export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: string;
  lastSync: string | null;
  lastActivityAt?: string | null; // Track last user activity
  preferences: UserPreferences;

  // Notification settings
  notificationPreferences?: NotificationPreferences; // Push notification settings
  quietHours?: QuietHours; // Do Not Disturb / Quiet Hours schedules
  fcmToken?: string; // Firebase Cloud Messaging token
  locale?: string; // User's preferred locale (e.g., 'en', 'es', 'fr', 'de', 'ja', 'zh')
  timezone?: string; // User's timezone (e.g., 'America/Los_Angeles', 'Europe/London', 'Asia/Tokyo')
  lastFunFactSent?: string; // ISO timestamp of last fun fact sent (prevents duplicate sends)

  // Role-based access control (web-specific)
  role: 'admin' | 'user';
  accountStatus: 'active' | 'suspended';
  customLimits?: UserLimits;
}

export interface NotificationPreferences {
  // Master controls
  enabled: boolean; // Global toggle (all notifications)

  // Scheduled notifications (with customizable times)
  dailySummary: {
    enabled: boolean;
    time: string; // "20:00" (24-hour format HH:MM)
    timezone?: string; // User's timezone for accurate delivery
  };
  weeklyInsights: {
    enabled: boolean;
    dayOfWeek: number; // 0-6 (Sunday-Saturday)
    time: string; // "09:00" (24-hour format HH:MM)
  };
  funFacts: {
    enabled: boolean;
    time: string; // "09:00" (24-hour format HH:MM)
    maxPerDay: number; // 1-3 (how many fun facts per day)
  };

  // Instant notifications (boolean toggles)
  achievements: boolean; // Achievement milestones (e.g., step goals)
  eventReminders: boolean; // Event reminder notifications
  escalations: boolean; // Escalated/urgent reminders
  locationAlerts: boolean; // Location-based activity notifications (mobile only)

  // Android channel overrides (mobile only, optional)
  channels?: {
    [channelId: string]: boolean; // Channel-specific enable/disable
  };
}

export interface QuietHours {
  enabled: boolean; // Master toggle for Do Not Disturb
  schedule: QuietHoursSchedule[]; // Multiple schedules (e.g., Sleep, Work, Focus)
}

export interface QuietHoursSchedule {
  id: string; // Unique identifier for this schedule
  name: string; // "Sleep", "Work", "Focus Time", "Custom"
  startTime: string; // "22:00" (24-hour format HH:MM)
  endTime: string; // "08:00" (24-hour format HH:MM, can be next day)
  daysOfWeek: number[]; // [0,1,2,3,4,5,6] for all days, [1,2,3,4,5] for weekdays
  timezone?: string; // User's timezone for accurate checking
  allowUrgent: boolean; // Allow escalated/urgent notifications through quiet hours
}

/**
 * Custom usage limits per user
 * Overrides default limits when set
 */
export interface UserLimits {
  maxTokensPerDay?: number;      // Override default token limit
  maxApiCallsPerDay?: number;    // Override default API call limit
  maxCostPerMonth?: number;      // Monthly spending cap in USD
}

export interface UserPreferences {
  dataCollection: {
    health: boolean;
    location: boolean;
    voice: boolean;
  };
  syncFrequency: 'realtime' | 'hourly' | 'daily' | 'manual';
  notifications: {
    activityTagging: boolean;
    syncComplete: boolean;
  };
  privacy: {
    encryptLocal: boolean;
    includeExactLocations: boolean;
  };
  language?: {
    appLanguage: string; // 'en' | 'es' | 'fr' | 'de' | 'ja' | 'zh'
    voiceLanguage?: string; // For voice transcription (Whisper supports 50+ languages)
    autoDetect?: boolean; // Auto-detect from device settings
  };
  savedSearches?: Array<{
    id: string;
    name: string;
    query: string;
    filters: any; // SearchFilters type (avoid circular dependency)
    createdAt: string;
    lastUsedAt: string;
  }>;
}
