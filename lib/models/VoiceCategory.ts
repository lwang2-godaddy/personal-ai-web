/**
 * VoiceCategory Model
 *
 * Configurable categories for voice note topic classification.
 * Categories are managed via the admin portal and used by Cloud Functions
 * to automatically classify voice notes based on transcription content.
 */

export interface VoiceCategory {
  id: string;
  key: string;           // Unique identifier e.g., 'work', 'health'
  iconName: string;      // Ionicons name, e.g., 'briefcase-outline'
  color: string;         // Hex color for badge background
  displayOrder: number;  // Order in UI and classification
  enabled: boolean;      // Whether to use in classification
  keywords: string[];    // Keywords for classification hint
  createdAt: string;     // ISO 8601 timestamp
  updatedAt: string;     // ISO 8601 timestamp
}

// Default categories with icons, colors, and keywords
export const DEFAULT_VOICE_CATEGORIES: Omit<VoiceCategory, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    key: 'work',
    iconName: 'briefcase-outline',
    color: '#3B82F6', // blue
    displayOrder: 1,
    enabled: true,
    keywords: ['meeting', 'project', 'deadline', 'work', 'office', 'boss', 'colleague', 'email', 'presentation', 'client'],
  },
  {
    key: 'health',
    iconName: 'fitness-outline',
    color: '#10B981', // green
    displayOrder: 2,
    enabled: true,
    keywords: ['workout', 'exercise', 'gym', 'run', 'health', 'doctor', 'medicine', 'sick', 'appointment', 'yoga'],
  },
  {
    key: 'food',
    iconName: 'restaurant-outline',
    color: '#F59E0B', // amber
    displayOrder: 3,
    enabled: true,
    keywords: ['lunch', 'dinner', 'breakfast', 'cook', 'eat', 'recipe', 'restaurant', 'food', 'meal', 'hungry'],
  },
  {
    key: 'travel',
    iconName: 'airplane-outline',
    color: '#8B5CF6', // purple
    displayOrder: 4,
    enabled: true,
    keywords: ['trip', 'flight', 'travel', 'vacation', 'hotel', 'airport', 'booking', 'destination', 'pack'],
  },
  {
    key: 'shopping',
    iconName: 'cart-outline',
    color: '#EC4899', // pink
    displayOrder: 5,
    enabled: true,
    keywords: ['buy', 'shop', 'order', 'purchase', 'store', 'amazon', 'delivery', 'price', 'sale'],
  },
  {
    key: 'family',
    iconName: 'people-outline',
    color: '#F97316', // orange
    displayOrder: 6,
    enabled: true,
    keywords: ['family', 'mom', 'dad', 'kids', 'children', 'parents', 'brother', 'sister', 'grandma', 'grandpa'],
  },
  {
    key: 'friends',
    iconName: 'chatbubbles-outline',
    color: '#06B6D4', // cyan
    displayOrder: 7,
    enabled: true,
    keywords: ['friend', 'hangout', 'party', 'meet', 'catch up', 'birthday', 'invite', 'plans'],
  },
  {
    key: 'ideas',
    iconName: 'bulb-outline',
    color: '#EAB308', // yellow
    displayOrder: 8,
    enabled: true,
    keywords: ['idea', 'think', 'plan', 'want to', 'should', 'maybe', 'thought', 'inspiration', 'brainstorm'],
  },
  {
    key: 'reminder',
    iconName: 'alarm-outline',
    color: '#EF4444', // red
    displayOrder: 9,
    enabled: true,
    keywords: ['remember', "don't forget", 'remind', 'todo', 'task', 'need to', 'must', 'deadline'],
  },
  {
    key: 'money',
    iconName: 'cash-outline',
    color: '#22C55E', // emerald
    displayOrder: 10,
    enabled: true,
    keywords: ['pay', 'money', 'budget', 'expense', 'cost', 'bank', 'bill', 'payment', 'invoice', 'salary'],
  },
  {
    key: 'home',
    iconName: 'home-outline',
    color: '#6366F1', // indigo
    displayOrder: 11,
    enabled: true,
    keywords: ['house', 'home', 'clean', 'fix', 'repair', 'furniture', 'room', 'apartment', 'rent'],
  },
  {
    key: 'music',
    iconName: 'musical-notes-outline',
    color: '#A855F7', // purple
    displayOrder: 12,
    enabled: true,
    keywords: ['music', 'song', 'concert', 'listen', 'playlist', 'album', 'band', 'singer', 'spotify'],
  },
  {
    key: 'learning',
    iconName: 'book-outline',
    color: '#0EA5E9', // sky
    displayOrder: 13,
    enabled: true,
    keywords: ['learn', 'study', 'read', 'course', 'class', 'book', 'tutorial', 'school', 'education'],
  },
  {
    key: 'other',
    iconName: 'mic-outline',
    color: '#6B7280', // gray (default fallback)
    displayOrder: 99,
    enabled: true,
    keywords: [], // Catch-all category
  },
];

/**
 * Category color mapping for quick lookup
 */
export const CATEGORY_COLORS: Record<string, string> = {
  work: '#3B82F6',
  health: '#10B981',
  food: '#F59E0B',
  travel: '#8B5CF6',
  shopping: '#EC4899',
  family: '#F97316',
  friends: '#06B6D4',
  ideas: '#EAB308',
  reminder: '#EF4444',
  money: '#22C55E',
  home: '#6366F1',
  music: '#A855F7',
  learning: '#0EA5E9',
  other: '#6B7280',
};

/**
 * Category icon mapping for quick lookup
 */
export const CATEGORY_ICONS: Record<string, string> = {
  work: 'briefcase-outline',
  health: 'fitness-outline',
  food: 'restaurant-outline',
  travel: 'airplane-outline',
  shopping: 'cart-outline',
  family: 'people-outline',
  friends: 'chatbubbles-outline',
  ideas: 'bulb-outline',
  reminder: 'alarm-outline',
  money: 'cash-outline',
  home: 'home-outline',
  music: 'musical-notes-outline',
  learning: 'book-outline',
  other: 'mic-outline',
};

/**
 * Get color for a category key
 */
export function getCategoryColor(key: string): string {
  return CATEGORY_COLORS[key] || CATEGORY_COLORS.other;
}

/**
 * Get icon name for a category key
 */
export function getCategoryIcon(key: string): string {
  return CATEGORY_ICONS[key] || CATEGORY_ICONS.other;
}
