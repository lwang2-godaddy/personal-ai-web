export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: string;
  lastSync: string | null;
  preferences: UserPreferences;
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
