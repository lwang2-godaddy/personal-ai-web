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
  supportEmail: 'fitness.w@gmail.com',
  feedbackEmail: 'fitness.w@gmail.com',
  bugReportEmail: 'fitness.w@gmail.com',

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

  return {
    isValid: errors.length === 0,
    errors,
  };
}
