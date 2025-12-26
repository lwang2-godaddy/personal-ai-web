export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: string;
  lastSync: string | null;
  preferences: UserPreferences;

  // Role-based access control
  role: 'admin' | 'user';
  accountStatus: 'active' | 'suspended';
  customLimits?: UserLimits;
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
