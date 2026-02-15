/**
 * EventExtractionConfig.ts
 *
 * TypeScript models for event extraction configurable settings.
 * Settings are managed via admin portal and fetched dynamically by
 * Cloud Functions (extraction) and mobile app (toast display).
 *
 * Firestore Location: config/eventExtraction
 * Version History: eventExtractionVersions collection
 */

/**
 * Event types that can be extracted from diary entries
 */
export const ALL_EVENT_TYPES = [
  'appointment',
  'meeting',
  'intention',
  'plan',
  'reminder',
  'todo',
] as const;

export type EventType = (typeof ALL_EVENT_TYPES)[number];

/**
 * Core event extraction settings
 */
export interface EventExtractionSettings {
  // OpenAI settings
  model: string; // 'gpt-4o-mini' | 'gpt-4o'
  temperature: number; // 0.0 - 1.0 (default: 0.3)
  maxTokens: number; // default: 800

  // Time handling
  timezone: string; // default: 'America/Los_Angeles'

  // Toast display (mobile)
  toastEnabled: boolean; // default: true
  toastLookbackHours: number; // default: 24
  toastDisplayLimit: number; // default: 1

  // Confidence filtering
  confidenceThreshold: number; // 0.0 - 1.0 (default: 0.0 = show all)

  // Event types enabled for extraction
  enabledEventTypes: string[]; // default: all 6 types
}

/**
 * Full event extraction configuration with metadata
 */
export interface EventExtractionConfig {
  version: number;
  lastUpdated: string; // ISO timestamp
  updatedBy: string; // Admin UID
  enableDynamicConfig: boolean; // Kill switch - if false, use hardcoded defaults
  changeNotes?: string; // Reason for last change
  settings: EventExtractionSettings;
}

/**
 * Version history entry for audit trail
 */
export interface EventExtractionVersion {
  id: string;
  version: number;
  config: EventExtractionConfig;
  changedBy: string;
  changedByEmail?: string;
  changedAt: string;
  changeNotes?: string;
  previousVersion?: number;
}

/**
 * Default event extraction settings based on current hardcoded values
 */
export const DEFAULT_EVENT_EXTRACTION_SETTINGS: EventExtractionSettings = {
  // OpenAI settings
  model: 'gpt-4o-mini',
  temperature: 0.3,
  maxTokens: 800,

  // Time handling
  timezone: 'America/Los_Angeles',

  // Toast display (mobile)
  toastEnabled: true,
  toastLookbackHours: 24,
  toastDisplayLimit: 1,

  // Confidence filtering
  confidenceThreshold: 0.0,

  // Event types enabled for extraction
  enabledEventTypes: [...ALL_EVENT_TYPES],
};

/**
 * Get default event extraction config (for initialization)
 */
export function getDefaultEventExtractionConfig(): EventExtractionConfig {
  return {
    version: 0,
    enableDynamicConfig: false,
    lastUpdated: new Date().toISOString(),
    updatedBy: 'system',
    settings: DEFAULT_EVENT_EXTRACTION_SETTINGS,
  };
}

/**
 * Common timezone options
 */
export const TIMEZONE_OPTIONS = [
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Australia/Sydney',
] as const;

/**
 * Validate event extraction settings
 */
export function validateEventExtractionSettings(
  settings: Partial<EventExtractionSettings>
): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate model
  if (settings.model !== undefined) {
    const validModels = ['gpt-4o-mini', 'gpt-4o', 'gpt-4o-2024-08-06'];
    if (!validModels.includes(settings.model)) {
      errors.push(`Invalid model: ${settings.model}. Must be one of: ${validModels.join(', ')}`);
    }
  }

  // Validate temperature
  if (settings.temperature !== undefined && (settings.temperature < 0 || settings.temperature > 1)) {
    errors.push('Temperature must be between 0 and 1');
  }

  // Validate maxTokens
  if (settings.maxTokens !== undefined && (settings.maxTokens < 100 || settings.maxTokens > 4000)) {
    errors.push('Max tokens must be between 100 and 4000');
  }

  // Validate toastLookbackHours
  if (
    settings.toastLookbackHours !== undefined &&
    (settings.toastLookbackHours < 1 || settings.toastLookbackHours > 168)
  ) {
    errors.push('Toast lookback hours must be between 1 and 168 (1 week)');
  }

  // Validate toastDisplayLimit
  if (
    settings.toastDisplayLimit !== undefined &&
    (settings.toastDisplayLimit < 1 || settings.toastDisplayLimit > 10)
  ) {
    errors.push('Toast display limit must be between 1 and 10');
  }

  // Validate confidenceThreshold
  if (
    settings.confidenceThreshold !== undefined &&
    (settings.confidenceThreshold < 0 || settings.confidenceThreshold > 1)
  ) {
    errors.push('Confidence threshold must be between 0 and 1');
  }

  // Validate enabledEventTypes
  if (settings.enabledEventTypes !== undefined) {
    if (!Array.isArray(settings.enabledEventTypes)) {
      errors.push('Enabled event types must be an array');
    } else {
      const invalid = settings.enabledEventTypes.filter(
        (t) => !(ALL_EVENT_TYPES as readonly string[]).includes(t)
      );
      if (invalid.length > 0) {
        errors.push(`Invalid event types: ${invalid.join(', ')}`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
