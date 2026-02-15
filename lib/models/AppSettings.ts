/**
 * AppSettings.ts
 *
 * TypeScript models for app-wide configurable settings.
 * Settings are managed via admin portal and fetched dynamically by mobile app.
 *
 * Firestore Location: config/appSettings
 * Version History: appSettingsVersions collection
 */

/**
 * Core app settings that can be configured via admin portal
 */
export interface AppSettings {
  // Email Configuration
  supportEmail: string;
  feedbackEmail?: string;
  bugReportEmail?: string;

  // Documentation URLs
  docsBaseUrl: string;
  gettingStartedUrl: string;
  featuresUrl: string;
  faqUrl: string;
  supportCenterUrl: string;

  // Legal URLs
  privacyPolicyUrl: string;
  termsOfServiceUrl: string;
  licensesUrl: string;

  // App Metadata
  appName: string;
  companyName: string;
  copyrightYear: number;

  // AI Features
  enableLearnedVocabulary?: boolean; // Enable/disable learned vocabulary in transcription cleanup

  // RAG Configuration
  ragMinScore?: number; // Minimum similarity score threshold for RAG queries (0.0-1.0, default 0.5)
  ragTopK?: number; // Number of results to retrieve from Pinecone (default 10)

  // Voice Conversation
  enableVoiceConversation?: boolean; // Enable/disable the voice conversation feature
  voiceConversationAutoLoopDelayMs?: number; // Delay in ms before auto-looping back to listening after TTS finishes (default 500)
  enableAutoLanguageMatch?: boolean; // AI responds in the same language the user speaks
  defaultTtsProvider?: 'openai' | 'native'; // Default TTS provider for new users (default 'openai')
}

/**
 * Full app settings configuration with metadata
 */
export interface AppSettingsConfig {
  version: number;
  lastUpdated: string; // ISO timestamp
  updatedBy: string; // Admin UID
  enableDynamicConfig: boolean; // Kill switch - if false, mobile uses hardcoded defaults
  changeNotes?: string; // Reason for last change
  settings: AppSettings;
}

/**
 * Version history entry for audit trail
 */
export interface AppSettingsVersion {
  id: string;
  version: number;
  config: AppSettingsConfig;
  changedBy: string;
  changedByEmail?: string;
  changedAt: string;
  changeNotes?: string;
  previousVersion?: number;
}

/**
 * Default app settings based on current hardcoded values
 */
export const DEFAULT_APP_SETTINGS: AppSettings = {
  // Email Configuration
  supportEmail: 'sircharge.ai@gmail.com',
  feedbackEmail: 'sircharge.ai@gmail.com',
  bugReportEmail: 'sircharge.ai@gmail.com',

  // Documentation URLs
  docsBaseUrl: 'https://www.sircharge.ai/docs',
  gettingStartedUrl: 'https://www.sircharge.ai/docs/getting-started',
  featuresUrl: 'https://www.sircharge.ai/docs/features',
  faqUrl: 'https://www.sircharge.ai/docs/faq',
  supportCenterUrl: 'https://www.sircharge.ai/support',

  // Legal URLs
  privacyPolicyUrl: 'https://www.sircharge.ai/privacy',
  termsOfServiceUrl: 'https://www.sircharge.ai/terms',
  licensesUrl: 'https://www.sircharge.ai/licenses',

  // App Metadata
  appName: 'SirCharge',
  companyName: 'SirCharge',
  copyrightYear: 2025,

  // AI Features
  enableLearnedVocabulary: true, // Enabled by default

  // RAG Configuration
  ragMinScore: 0.5, // 50% minimum similarity threshold
  ragTopK: 10, // Retrieve top 10 results from Pinecone

  // Voice Conversation
  enableVoiceConversation: true, // Enabled by default
  voiceConversationAutoLoopDelayMs: 500, // 500ms delay before auto-loop
  enableAutoLanguageMatch: true, // Match user's spoken language
  defaultTtsProvider: 'openai', // OpenAI TTS by default
};

/**
 * Get default app settings config (for initialization)
 */
export function getDefaultAppSettingsConfig(): AppSettingsConfig {
  return {
    version: 0,
    enableDynamicConfig: false,
    lastUpdated: new Date().toISOString(),
    updatedBy: 'system',
    settings: DEFAULT_APP_SETTINGS,
  };
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate app settings
 */
export function validateAppSettings(settings: Partial<AppSettings>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate emails
  if (settings.supportEmail && !isValidEmail(settings.supportEmail)) {
    errors.push('Invalid support email format');
  }
  if (settings.feedbackEmail && !isValidEmail(settings.feedbackEmail)) {
    errors.push('Invalid feedback email format');
  }
  if (settings.bugReportEmail && !isValidEmail(settings.bugReportEmail)) {
    errors.push('Invalid bug report email format');
  }

  // Validate URLs
  const urlFields: (keyof AppSettings)[] = [
    'docsBaseUrl',
    'gettingStartedUrl',
    'featuresUrl',
    'faqUrl',
    'supportCenterUrl',
    'privacyPolicyUrl',
    'termsOfServiceUrl',
    'licensesUrl',
  ];

  for (const field of urlFields) {
    const value = settings[field];
    if (value && typeof value === 'string' && !isValidUrl(value)) {
      errors.push(`Invalid URL format for ${field}`);
    }
  }

  // Validate metadata
  if (settings.appName && settings.appName.trim().length === 0) {
    errors.push('App name cannot be empty');
  }
  if (settings.companyName && settings.companyName.trim().length === 0) {
    errors.push('Company name cannot be empty');
  }
  if (
    settings.copyrightYear &&
    (settings.copyrightYear < 2000 || settings.copyrightYear > 2100)
  ) {
    errors.push('Copyright year must be between 2000 and 2100');
  }

  // Validate RAG configuration
  if (
    settings.ragMinScore !== undefined &&
    (settings.ragMinScore < 0 || settings.ragMinScore > 1)
  ) {
    errors.push('RAG minimum score must be between 0 and 1');
  }
  if (
    settings.ragTopK !== undefined &&
    (settings.ragTopK < 1 || settings.ragTopK > 100)
  ) {
    errors.push('RAG topK must be between 1 and 100');
  }

  // Validate Voice Conversation configuration
  if (
    settings.voiceConversationAutoLoopDelayMs !== undefined &&
    (settings.voiceConversationAutoLoopDelayMs < 0 || settings.voiceConversationAutoLoopDelayMs > 5000)
  ) {
    errors.push('Voice conversation auto-loop delay must be between 0 and 5000 ms');
  }
  if (
    settings.defaultTtsProvider !== undefined &&
    !['openai', 'native'].includes(settings.defaultTtsProvider)
  ) {
    errors.push('Default TTS provider must be "openai" or "native"');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
