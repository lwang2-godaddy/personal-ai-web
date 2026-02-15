/**
 * AskQuestion.ts
 *
 * TypeScript interfaces for the Ask Questions admin system.
 * Questions are stored in Firestore and displayed on mobile app's Ask/Chat screen.
 *
 * Firestore Structure:
 * - exploreQuestions/{language}/config/settings
 * - exploreQuestions/{language}/questions/{questionId}
 */

/**
 * Categories for ask questions
 */
export type AskCategory =
  | 'activity'
  | 'health'
  | 'location'
  | 'voice'
  | 'photo'
  | 'notes'
  | 'general'
  | 'onboarding';

/**
 * User data states - must match mobile app
 */
export type UserDataState = 'NO_DATA' | 'MINIMAL_DATA' | 'PARTIAL_DATA' | 'RICH_DATA';

/**
 * Data requirements for showing a question
 */
export interface DataRequirements {
  /** User must have location data */
  hasLocationData?: boolean;
  /** User must have health data */
  hasHealthData?: boolean;
  /** User must have voice notes */
  hasVoiceNotes?: boolean;
  /** User must have photo memories */
  hasPhotoMemories?: boolean;
  /** Minimum number of activities */
  minActivityCount?: number;
  /** Required health data types (e.g., ["steps", "sleep"]) */
  healthTypes?: string[];
}

/**
 * Individual ask question stored in Firestore
 */
export interface AskQuestion {
  /** Unique identifier */
  id: string;

  /** Emoji icon for display */
  icon: string;

  /**
   * Label with template variables
   * Example: "My {{activity}}" or "My step counts"
   */
  labelKey: string;

  /**
   * Query template with variables
   * Example: "How many times did I do {{activity}}?"
   */
  queryTemplate: string;

  /** Category for grouping */
  category: AskCategory;

  /** Priority for sorting (0-100, higher = shown first) */
  priority: number;

  /** Whether this question is enabled */
  enabled: boolean;

  /** User data states where this question should appear */
  userDataStates: UserDataState[];

  /** Conditions for showing the question */
  requiresData?: DataRequirements;

  /** Template variables used (e.g., ["activity", "healthType"]) */
  variables?: string[];

  /** Manual sort order within category */
  order: number;

  /** ISO 8601 timestamp when created */
  createdAt?: string;

  /** User ID who created this question */
  createdBy?: string;

  /** ISO 8601 timestamp when last updated */
  updatedAt?: string;

  /** User ID who last updated this question */
  updatedBy?: string;
}

/**
 * Configuration for a language's ask questions
 */
export interface AskQuestionsConfig {
  /** Semantic version */
  version: string;

  /** Language code (e.g., "en", "es") */
  language: string;

  /** ISO 8601 timestamp of last update */
  lastUpdated: string;

  /** User ID who made the last update */
  updatedBy: string;

  /** Whether this language configuration is enabled */
  enabled: boolean;
}

/**
 * Supported languages for ask questions
 */
export const ASK_SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
] as const;

export type AskLanguageCode = (typeof ASK_SUPPORTED_LANGUAGES)[number]['code'];

/**
 * Category definitions with metadata
 */
export const ASK_CATEGORIES = [
  {
    id: 'onboarding' as AskCategory,
    name: 'Onboarding',
    icon: '👋',
    description: 'Questions for new users to get started',
    dataStates: ['NO_DATA'] as UserDataState[],
  },
  {
    id: 'activity' as AskCategory,
    name: 'Activities',
    icon: '🏃',
    description: 'Questions about user activities and visits',
    dataStates: ['MINIMAL_DATA', 'PARTIAL_DATA', 'RICH_DATA'] as UserDataState[],
  },
  {
    id: 'health' as AskCategory,
    name: 'Health',
    icon: '❤️',
    description: 'Questions about health data (steps, sleep, etc.)',
    dataStates: ['MINIMAL_DATA', 'PARTIAL_DATA', 'RICH_DATA'] as UserDataState[],
  },
  {
    id: 'location' as AskCategory,
    name: 'Location',
    icon: '📍',
    description: 'Questions about places and visits',
    dataStates: ['MINIMAL_DATA', 'PARTIAL_DATA', 'RICH_DATA'] as UserDataState[],
  },
  {
    id: 'voice' as AskCategory,
    name: 'Voice Notes',
    icon: '🎙️',
    description: 'Questions about voice note content',
    dataStates: ['MINIMAL_DATA', 'PARTIAL_DATA', 'RICH_DATA'] as UserDataState[],
  },
  {
    id: 'photo' as AskCategory,
    name: 'Photos',
    icon: '📸',
    description: 'Questions about photo memories',
    dataStates: ['MINIMAL_DATA', 'PARTIAL_DATA', 'RICH_DATA'] as UserDataState[],
  },
  {
    id: 'notes' as AskCategory,
    name: 'Notes & Thoughts',
    icon: '💭',
    description: 'Questions about thoughts, reflections, and experiences shared via notes or voice',
    dataStates: ['MINIMAL_DATA', 'PARTIAL_DATA', 'RICH_DATA'] as UserDataState[],
  },
  {
    id: 'general' as AskCategory,
    name: 'General',
    icon: '📊',
    description: 'General questions about all data',
    dataStates: ['MINIMAL_DATA', 'PARTIAL_DATA', 'RICH_DATA'] as UserDataState[],
  },
] as const;

/**
 * User data state descriptions
 */
export const USER_DATA_STATES = [
  {
    id: 'NO_DATA' as UserDataState,
    name: 'No Data',
    description: 'New user with no data collected yet',
  },
  {
    id: 'MINIMAL_DATA' as UserDataState,
    name: 'Minimal Data',
    description: 'User has some data but limited (< 3 data points)',
  },
  {
    id: 'PARTIAL_DATA' as UserDataState,
    name: 'Partial Data',
    description: 'User has data in some categories but not others',
  },
  {
    id: 'RICH_DATA' as UserDataState,
    name: 'Rich Data',
    description: 'User has substantial data across multiple categories',
  },
] as const;

/**
 * API request/response types
 */
export interface ListAskQuestionsRequest {
  language?: AskLanguageCode;
  category?: AskCategory;
  enabled?: boolean;
}

export interface ListAskQuestionsResponse {
  questions: AskQuestion[];
  config: AskQuestionsConfig | null;
  total: number;
  languages: typeof ASK_SUPPORTED_LANGUAGES;
  categories: typeof ASK_CATEGORIES;
}

export interface CreateAskQuestionRequest {
  language: AskLanguageCode;
  question: Omit<AskQuestion, 'id' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy'>;
}

export interface UpdateAskQuestionRequest {
  language: AskLanguageCode;
  updates: Partial<Omit<AskQuestion, 'id' | 'createdAt' | 'createdBy'>>;
}

export interface MigrateAskQuestionsRequest {
  language: AskLanguageCode;
  overwrite?: boolean;
}

export interface MigrateAskQuestionsResponse {
  success: boolean;
  migrated: number;
  skipped: number;
  errors: { id: string; error: string }[];
}

/**
 * Default questions for migration from JSON
 * These match the fallback templates in the mobile app
 */
export const DEFAULT_ASK_QUESTIONS: Record<
  AskLanguageCode,
  { labelKey: string; queryKey: string }
> = {
  en: {
    labelKey: 'My {{activity}}',
    queryKey: 'How many times did I do {{activity}}?',
  },
  es: {
    labelKey: 'Mi {{activity}}',
    queryKey: '¿Cuántas veces hice {{activity}}?',
  },
  fr: {
    labelKey: 'Mon {{activity}}',
    queryKey: 'Combien de fois ai-je fait {{activity}}?',
  },
  de: {
    labelKey: 'Mein {{activity}}',
    queryKey: 'Wie oft habe ich {{activity}} gemacht?',
  },
  ja: {
    labelKey: '私の{{activity}}',
    queryKey: '私は{{activity}}を何回しましたか？',
  },
  zh: {
    labelKey: '我的{{activity}}',
    queryKey: '我做了多少次{{activity}}？',
  },
};

/**
 * Validation helpers
 */
export function isValidAskCategory(category: string): category is AskCategory {
  return ASK_CATEGORIES.some((c) => c.id === category);
}

export function isValidUserDataState(state: string): state is UserDataState {
  return USER_DATA_STATES.some((s) => s.id === state);
}

export function isValidAskLanguage(code: string): code is AskLanguageCode {
  return ASK_SUPPORTED_LANGUAGES.some((l) => l.code === code);
}

export function validateAskQuestion(
  question: Partial<AskQuestion>
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!question.labelKey || question.labelKey.trim().length === 0) {
    errors.push('Label key is required');
  }

  if (!question.queryTemplate || question.queryTemplate.trim().length === 0) {
    errors.push('Query template is required');
  }

  if (!question.icon || question.icon.trim().length === 0) {
    errors.push('Icon is required');
  }

  if (!question.category || !isValidAskCategory(question.category)) {
    errors.push('Valid category is required');
  }

  if (question.priority !== undefined && (question.priority < 0 || question.priority > 100)) {
    errors.push('Priority must be between 0 and 100');
  }

  if (
    !question.userDataStates ||
    !Array.isArray(question.userDataStates) ||
    question.userDataStates.length === 0
  ) {
    errors.push('At least one user data state is required');
  } else if (!question.userDataStates.every(isValidUserDataState)) {
    errors.push('All user data states must be valid');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
