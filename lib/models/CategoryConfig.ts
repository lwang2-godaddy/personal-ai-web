/**
 * CategoryConfig.ts
 *
 * TypeScript interfaces for Life Feed category configuration
 * Used by admin portal to manage categories
 */

// ============================================================================
// Category Types
// ============================================================================

/**
 * Unified category type - matches mobile app LifeKeyword.ts
 */
export type UnifiedCategory =
  | 'health'
  | 'activity'
  | 'social'
  | 'work'
  | 'travel'
  | 'learning'
  | 'creativity'
  | 'routine'
  | 'milestone'
  | 'memory'
  | 'location'
  | 'general';

/**
 * All unified categories in display order
 */
export const UNIFIED_CATEGORIES: UnifiedCategory[] = [
  'health',
  'activity',
  'social',
  'work',
  'travel',
  'learning',
  'creativity',
  'routine',
  'milestone',
  'memory',
  'location',
  'general',
];

// ============================================================================
// Configuration Interfaces
// ============================================================================

/**
 * Configuration for a single category
 */
export interface CategoryConfig {
  id: string;
  displayName: string;
  icon: string;           // Emoji
  color: string;          // Hex color
  enabled: boolean;
  isPreset: boolean;      // true for 12 default categories
  priority: number;       // Sort order (higher = first)
  matchPatterns: string[]; // Regex patterns for auto-detection
  relatedPostTypes: string[]; // Post types commonly in this category
  createdAt: string;
  updatedAt: string;
}

/**
 * Full categories configuration document
 * Stored in Firestore at config/lifeFeedCategories
 */
export interface LifeFeedCategoriesConfig {
  version: string;
  lastUpdatedAt: string;
  lastUpdatedBy: string;
  categories: Record<string, CategoryConfig>;
}

// ============================================================================
// Category Metadata (Static)
// ============================================================================

/**
 * Category metadata for display - synced with mobile app
 */
export const CATEGORY_METADATA: Record<UnifiedCategory, {
  icon: string;
  color: string;
  displayName: string;
}> = {
  health: { icon: '💪', color: '#4CAF50', displayName: 'Health & Wellness' },
  activity: { icon: '🏃', color: '#2196F3', displayName: 'Activities' },
  social: { icon: '👥', color: '#E91E63', displayName: 'Social' },
  work: { icon: '💼', color: '#607D8B', displayName: 'Work' },
  travel: { icon: '✈️', color: '#FF9800', displayName: 'Travel' },
  learning: { icon: '📚', color: '#9C27B0', displayName: 'Learning' },
  creativity: { icon: '🎨', color: '#F44336', displayName: 'Creativity' },
  routine: { icon: '📅', color: '#00BCD4', displayName: 'Routines' },
  milestone: { icon: '🏆', color: '#FFC107', displayName: 'Milestones' },
  memory: { icon: '📸', color: '#3F51B5', displayName: 'Memories' },
  location: { icon: '📍', color: '#8BC34A', displayName: 'Locations' },
  general: { icon: '✨', color: '#795548', displayName: 'General' },
};

// ============================================================================
// Default Configuration
// ============================================================================

/**
 * Default categories configuration
 * Used when Firestore config doesn't exist
 */
export const DEFAULT_CATEGORIES_CONFIG: LifeFeedCategoriesConfig = {
  version: '1.0.0',
  lastUpdatedAt: new Date().toISOString(),
  lastUpdatedBy: 'system',
  categories: {
    health: {
      id: 'health',
      displayName: 'Health & Wellness',
      icon: '💪',
      color: '#4CAF50',
      enabled: true,
      isPreset: true,
      priority: 100,
      matchPatterns: [
        'gym|workout|exercise|fitness|yoga|run|running|sleep|jogging|swimming|cycling|hiking|walking|cardio|weightlifting|stretching|meditation|wellness|diet|nutrition|health|doctor|hospital|clinic|pharmacy|medicine|vitamin|supplement',
      ],
      relatedPostTypes: ['health_alert', 'streak_achievement'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    activity: {
      id: 'activity',
      displayName: 'Activities',
      icon: '🏃',
      color: '#2196F3',
      enabled: true,
      isPreset: true,
      priority: 95,
      matchPatterns: [
        'badminton|tennis|basketball|soccer|football|volleyball|golf|bowling|skating|skiing|surfing|climbing|dancing|gaming|sports|hobby|recreation|play|game|match|tournament|competition',
      ],
      relatedPostTypes: ['activity_pattern', 'streak_achievement'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    social: {
      id: 'social',
      displayName: 'Social',
      icon: '👥',
      color: '#E91E63',
      enabled: true,
      isPreset: true,
      priority: 90,
      matchPatterns: [
        'restaurant|cafe|bar|party|dinner|lunch|friend|family|gathering|meetup|hangout|date|wedding|birthday|celebration|reunion|brunch|coffee|drinks|social|people|group|team|colleague|coworker',
      ],
      relatedPostTypes: ['life_summary', 'memory_highlight'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    work: {
      id: 'work',
      displayName: 'Work',
      icon: '💼',
      color: '#607D8B',
      enabled: true,
      isPreset: true,
      priority: 85,
      matchPatterns: [
        'office|work|meeting|conference|client|project|presentation|deadline|report|email|call|zoom|teams|slack|task|assignment|boss|manager|interview|job|career|business|professional|corporate|startup',
      ],
      relatedPostTypes: ['life_summary', 'pattern_prediction'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    travel: {
      id: 'travel',
      displayName: 'Travel',
      icon: '✈️',
      color: '#FF9800',
      enabled: true,
      isPreset: true,
      priority: 80,
      matchPatterns: [
        'airport|hotel|travel|vacation|trip|flight|train|bus|uber|lyft|taxi|drive|road\\s*trip|destination|sightseeing|tour|explore|adventure|beach|mountain|city|country|abroad|international|domestic',
      ],
      relatedPostTypes: ['life_summary', 'memory_highlight'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    learning: {
      id: 'learning',
      displayName: 'Learning',
      icon: '📚',
      color: '#9C27B0',
      enabled: true,
      isPreset: true,
      priority: 75,
      matchPatterns: [
        'class|course|study|learn|school|university|college|lecture|seminar|workshop|tutorial|book|read|reading|library|research|thesis|exam|test|quiz|homework|assignment|professor|teacher|student|education|knowledge|skill',
      ],
      relatedPostTypes: ['reflective_insight', 'milestone'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    creativity: {
      id: 'creativity',
      displayName: 'Creativity',
      icon: '🎨',
      color: '#F44336',
      enabled: true,
      isPreset: true,
      priority: 70,
      matchPatterns: [
        'art|music|paint|draw|write|create|design|photography|photo|video|film|movie|concert|gallery|museum|studio|instrument|guitar|piano|sing|song|dance|craft|diy|handmade|creative|artistic|compose|perform',
      ],
      relatedPostTypes: ['memory_highlight', 'reflective_insight'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    routine: {
      id: 'routine',
      displayName: 'Routines',
      icon: '📅',
      color: '#00BCD4',
      enabled: true,
      isPreset: true,
      priority: 65,
      matchPatterns: [
        'morning|evening|daily|routine|habit|regular|schedule|ritual|wake|sleep|breakfast|lunch|dinner|commute|everyday|usual|typical|normal|weekday|weekend|monday|tuesday|wednesday|thursday|friday|saturday|sunday',
      ],
      relatedPostTypes: ['activity_pattern', 'pattern_prediction'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    milestone: {
      id: 'milestone',
      displayName: 'Milestones',
      icon: '🏆',
      color: '#FFC107',
      enabled: true,
      isPreset: true,
      priority: 60,
      matchPatterns: [
        'milestone|achievement|accomplish|goal|target|record|best|first|100th|anniversary|celebrate|success|win|won|award|prize|medal|trophy|graduate|promotion|launch|release|complete|finish',
      ],
      relatedPostTypes: ['milestone', 'streak_achievement'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    memory: {
      id: 'memory',
      displayName: 'Memories',
      icon: '📸',
      color: '#3F51B5',
      enabled: true,
      isPreset: true,
      priority: 55,
      matchPatterns: [
        'photo|picture|image|video|memory|remember|nostalgia|throwback|flashback|moment|capture|snapshot|selfie|portrait|album|collection|archive|past|history|ago|years\\s*ago|months\\s*ago',
      ],
      relatedPostTypes: ['memory_highlight', 'comparison'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    location: {
      id: 'location',
      displayName: 'Locations',
      icon: '📍',
      color: '#8BC34A',
      enabled: true,
      isPreset: true,
      priority: 50,
      matchPatterns: [
        'visit|place|location|spot|venue|address|neighborhood|district|area|region|city|town|village|country|state|park|mall|store|shop|market|supermarket|grocery|bank|post\\s*office',
      ],
      relatedPostTypes: ['life_summary', 'pattern_prediction'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    general: {
      id: 'general',
      displayName: 'General',
      icon: '✨',
      color: '#795548',
      enabled: true,
      isPreset: true,
      priority: 0,
      matchPatterns: [],
      relatedPostTypes: ['life_summary', 'reflective_insight', 'comparison', 'seasonal_reflection'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get category metadata by ID
 */
export function getCategoryMetadata(categoryId: string): { icon: string; color: string; displayName: string } {
  return CATEGORY_METADATA[categoryId as UnifiedCategory] || CATEGORY_METADATA.general;
}

/**
 * Sort categories by priority (descending)
 */
export function sortCategoriesByPriority(categories: CategoryConfig[]): CategoryConfig[] {
  return [...categories].sort((a, b) => b.priority - a.priority);
}

/**
 * Get enabled categories from config
 */
export function getEnabledCategories(config: LifeFeedCategoriesConfig): CategoryConfig[] {
  return Object.values(config.categories)
    .filter((cat) => cat.enabled)
    .sort((a, b) => b.priority - a.priority);
}

/**
 * Validate a category config
 */
export function validateCategoryConfig(category: Partial<CategoryConfig>): string[] {
  const errors: string[] = [];

  if (!category.id || category.id.length === 0) {
    errors.push('Category ID is required');
  }
  if (!category.displayName || category.displayName.length === 0) {
    errors.push('Display name is required');
  }
  if (!category.icon || category.icon.length === 0) {
    errors.push('Icon (emoji) is required');
  }
  if (!category.color || !category.color.match(/^#[0-9A-Fa-f]{6}$/)) {
    errors.push('Color must be a valid hex color (e.g., #4CAF50)');
  }
  if (category.priority === undefined || category.priority < 0 || category.priority > 100) {
    errors.push('Priority must be between 0 and 100');
  }

  // Validate regex patterns
  if (category.matchPatterns) {
    for (const pattern of category.matchPatterns) {
      try {
        new RegExp(pattern, 'i');
      } catch {
        errors.push(`Invalid regex pattern: ${pattern}`);
      }
    }
  }

  return errors;
}

/**
 * Create a new category config with defaults
 */
export function createEmptyCategoryConfig(id: string): CategoryConfig {
  const now = new Date().toISOString();
  return {
    id,
    displayName: '',
    icon: '📌',
    color: '#9E9E9E',
    enabled: true,
    isPreset: false,
    priority: 40,
    matchPatterns: [],
    relatedPostTypes: [],
    createdAt: now,
    updatedAt: now,
  };
}
