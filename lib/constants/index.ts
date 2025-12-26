export const APP_CONSTANTS = {
  // Data Collection Intervals
  HEALTH_DATA_SYNC_INTERVAL: 3600000, // 1 hour in milliseconds
  LOCATION_UPDATE_INTERVAL: 300000, // 5 minutes

  // Location Tracking
  LOCATION_DISTANCE_FILTER: 50, // meters
  SIGNIFICANT_LOCATION_TIME: 300000, // 5 minutes

  // Data Retention
  MAX_CHAT_HISTORY_DAYS: 90,
  MAX_HEALTH_DATA_DAYS: 365,
  MAX_LOCATION_DATA_DAYS: 180,
  MAX_VOICE_NOTES_DAYS: 365,

  // RAG Configuration
  RAG_TOP_K_RESULTS: 10,
  RAG_CONTEXT_MAX_LENGTH: 2000,

  // Embedding Cache
  EMBEDDING_CACHE_SIZE: 1000,

  // Sync Configuration
  SYNC_RETRY_MAX: 5,
  SYNC_RETRY_DELAY: 5000, // 5 seconds

  // Battery Thresholds
  BATTERY_LOW_THRESHOLD: 20,
  BATTERY_MEDIUM_THRESHOLD: 50,

  // Text Note (Diary/Journal) Validation
  TEXT_NOTE_MAX_TITLE_LENGTH: 200,
  TEXT_NOTE_MIN_CONTENT_LENGTH: 10,
  TEXT_NOTE_MAX_CONTENT_LENGTH: 10000,
  TEXT_NOTE_MAX_TAGS: 10,
  TEXT_NOTE_MAX_TAG_LENGTH: 30,

  // Voice Note Validation
  VOICE_NOTE_MAX_DURATION: 300, // 5 minutes in seconds

  // Photo Validation
  PHOTO_MAX_SIZE: 10 * 1024 * 1024, // 10MB in bytes
  PHOTO_MIN_DIMENSION: 100, // pixels
  PHOTO_MAX_DIMENSION: 4096, // pixels

  // Auto-save Interval
  AUTO_SAVE_INTERVAL: 30000, // 30 seconds
};

export const ACTIVITY_TYPES = [
  'Badminton',
  'Gym',
  'Restaurant',
  'Work',
  'Home',
  'Running',
  'Cycling',
  'Swimming',
  'Yoga',
  'Shopping',
  'Other',
];
