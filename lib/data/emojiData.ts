/**
 * Emoji data with categories and search keywords
 * Used by the EmojiPicker component in admin portal
 */

export interface EmojiCategory {
  id: string;
  name: string;
  icon: string;
}

export interface EmojiItem {
  emoji: string;
  name: string;
  keywords: string[];
  category: string;
}

export const EMOJI_CATEGORIES: EmojiCategory[] = [
  { id: 'recent', name: 'Recent', icon: '🕐' },
  { id: 'activity', name: 'Activity', icon: '⚽' },
  { id: 'health', name: 'Health', icon: '❤️' },
  { id: 'places', name: 'Places', icon: '🏠' },
  { id: 'objects', name: 'Objects', icon: '📱' },
  { id: 'symbols', name: 'Symbols', icon: '💡' },
  { id: 'nature', name: 'Nature', icon: '🌿' },
  { id: 'food', name: 'Food', icon: '🍕' },
];

export const EMOJIS: EmojiItem[] = [
  // Activity
  { emoji: '🏃', name: 'running', keywords: ['run', 'jog', 'exercise', 'fitness'], category: 'activity' },
  { emoji: '🏊', name: 'swimming', keywords: ['swim', 'pool', 'water', 'exercise'], category: 'activity' },
  { emoji: '🚴', name: 'cycling', keywords: ['bike', 'bicycle', 'cycle', 'exercise'], category: 'activity' },
  { emoji: '⚽', name: 'soccer', keywords: ['football', 'sport', 'ball', 'game'], category: 'activity' },
  { emoji: '🏸', name: 'badminton', keywords: ['sport', 'racket', 'shuttlecock'], category: 'activity' },
  { emoji: '🎾', name: 'tennis', keywords: ['sport', 'racket', 'ball'], category: 'activity' },
  { emoji: '🏀', name: 'basketball', keywords: ['sport', 'ball', 'hoop'], category: 'activity' },
  { emoji: '🏋️', name: 'weight lifting', keywords: ['gym', 'workout', 'exercise', 'strength'], category: 'activity' },
  { emoji: '🧘', name: 'yoga', keywords: ['meditation', 'stretch', 'exercise', 'zen'], category: 'activity' },
  { emoji: '🚶', name: 'walking', keywords: ['walk', 'stroll', 'steps'], category: 'activity' },
  { emoji: '🧗', name: 'climbing', keywords: ['rock', 'climb', 'boulder', 'sport'], category: 'activity' },
  { emoji: '⛷️', name: 'skiing', keywords: ['snow', 'winter', 'sport', 'mountain'], category: 'activity' },
  { emoji: '🏌️', name: 'golf', keywords: ['sport', 'club', 'ball'], category: 'activity' },
  { emoji: '🎯', name: 'darts', keywords: ['target', 'game', 'aim'], category: 'activity' },
  { emoji: '🎳', name: 'bowling', keywords: ['sport', 'pins', 'ball'], category: 'activity' },
  { emoji: '🛹', name: 'skateboard', keywords: ['skate', 'sport', 'board'], category: 'activity' },
  { emoji: '🏄', name: 'surfing', keywords: ['surf', 'wave', 'beach', 'water'], category: 'activity' },
  { emoji: '🎮', name: 'gaming', keywords: ['game', 'video', 'play', 'controller'], category: 'activity' },
  { emoji: '📚', name: 'reading', keywords: ['book', 'study', 'learn'], category: 'activity' },
  { emoji: '✈️', name: 'travel', keywords: ['flight', 'airplane', 'trip', 'vacation'], category: 'activity' },

  // Health
  { emoji: '❤️', name: 'heart', keywords: ['love', 'health', 'cardio', 'rate'], category: 'health' },
  { emoji: '💪', name: 'muscle', keywords: ['strength', 'workout', 'strong', 'arm'], category: 'health' },
  { emoji: '😴', name: 'sleep', keywords: ['sleeping', 'rest', 'tired', 'zzz'], category: 'health' },
  { emoji: '👟', name: 'sneaker', keywords: ['steps', 'walking', 'shoe', 'run'], category: 'health' },
  { emoji: '🧠', name: 'brain', keywords: ['mind', 'think', 'mental', 'health'], category: 'health' },
  { emoji: '🩺', name: 'stethoscope', keywords: ['doctor', 'medical', 'health', 'checkup'], category: 'health' },
  { emoji: '💊', name: 'pill', keywords: ['medicine', 'medication', 'health', 'vitamin'], category: 'health' },
  { emoji: '🏥', name: 'hospital', keywords: ['medical', 'health', 'doctor', 'clinic'], category: 'health' },
  { emoji: '🩸', name: 'blood', keywords: ['donation', 'test', 'health'], category: 'health' },
  { emoji: '🦷', name: 'tooth', keywords: ['dental', 'dentist', 'teeth'], category: 'health' },
  { emoji: '👁️', name: 'eye', keywords: ['vision', 'sight', 'see'], category: 'health' },
  { emoji: '🧘‍♀️', name: 'meditation', keywords: ['zen', 'calm', 'mindfulness', 'relax'], category: 'health' },
  { emoji: '🚰', name: 'water', keywords: ['hydration', 'drink', 'health'], category: 'health' },
  { emoji: '⚖️', name: 'scale', keywords: ['weight', 'balance', 'measure'], category: 'health' },
  { emoji: '🌡️', name: 'thermometer', keywords: ['temperature', 'fever', 'sick'], category: 'health' },

  // Places
  { emoji: '🏠', name: 'home', keywords: ['house', 'residence', 'dwelling'], category: 'places' },
  { emoji: '🏢', name: 'office', keywords: ['work', 'building', 'business', 'company'], category: 'places' },
  { emoji: '🍽️', name: 'restaurant', keywords: ['food', 'dining', 'eat', 'meal'], category: 'places' },
  { emoji: '☕', name: 'coffee', keywords: ['cafe', 'drink', 'shop'], category: 'places' },
  { emoji: '🏫', name: 'school', keywords: ['education', 'learn', 'study', 'university'], category: 'places' },
  { emoji: '🏪', name: 'store', keywords: ['shop', 'convenience', 'buy', 'retail'], category: 'places' },
  { emoji: '🏋️‍♂️', name: 'gym', keywords: ['fitness', 'workout', 'exercise', 'health'], category: 'places' },
  { emoji: '🏨', name: 'hotel', keywords: ['stay', 'travel', 'accommodation', 'room'], category: 'places' },
  { emoji: '✈️', name: 'airport', keywords: ['travel', 'flight', 'plane'], category: 'places' },
  { emoji: '🚉', name: 'station', keywords: ['train', 'transit', 'commute'], category: 'places' },
  { emoji: '🏦', name: 'bank', keywords: ['money', 'finance', 'atm'], category: 'places' },
  { emoji: '⛪', name: 'church', keywords: ['religion', 'worship', 'temple'], category: 'places' },
  { emoji: '🏖️', name: 'beach', keywords: ['vacation', 'sand', 'ocean', 'sea'], category: 'places' },
  { emoji: '🏔️', name: 'mountain', keywords: ['hike', 'nature', 'climb', 'outdoor'], category: 'places' },
  { emoji: '🏕️', name: 'camping', keywords: ['tent', 'outdoor', 'nature', 'camp'], category: 'places' },
  { emoji: '🎭', name: 'theater', keywords: ['show', 'performance', 'entertainment'], category: 'places' },
  { emoji: '🎬', name: 'cinema', keywords: ['movie', 'film', 'theater'], category: 'places' },
  { emoji: '🎡', name: 'park', keywords: ['amusement', 'fun', 'outdoor'], category: 'places' },
  { emoji: '🏟️', name: 'stadium', keywords: ['sports', 'event', 'arena'], category: 'places' },
  { emoji: '🗺️', name: 'map', keywords: ['location', 'navigation', 'travel'], category: 'places' },

  // Objects
  { emoji: '📱', name: 'phone', keywords: ['mobile', 'device', 'call', 'smartphone'], category: 'objects' },
  { emoji: '📸', name: 'camera', keywords: ['photo', 'picture', 'image', 'photography'], category: 'objects' },
  { emoji: '🎙️', name: 'microphone', keywords: ['voice', 'audio', 'record', 'speak'], category: 'objects' },
  { emoji: '💻', name: 'laptop', keywords: ['computer', 'work', 'device'], category: 'objects' },
  { emoji: '⌚', name: 'watch', keywords: ['time', 'clock', 'wearable'], category: 'objects' },
  { emoji: '🎧', name: 'headphones', keywords: ['music', 'audio', 'listen'], category: 'objects' },
  { emoji: '📝', name: 'note', keywords: ['write', 'memo', 'paper'], category: 'objects' },
  { emoji: '📖', name: 'book', keywords: ['read', 'study', 'learn'], category: 'objects' },
  { emoji: '🔑', name: 'key', keywords: ['lock', 'access', 'security'], category: 'objects' },
  { emoji: '💡', name: 'bulb', keywords: ['idea', 'light', 'tip', 'bright'], category: 'objects' },
  { emoji: '🔔', name: 'bell', keywords: ['notification', 'alert', 'ring'], category: 'objects' },
  { emoji: '📧', name: 'email', keywords: ['mail', 'message', 'inbox'], category: 'objects' },
  { emoji: '🎁', name: 'gift', keywords: ['present', 'surprise', 'birthday'], category: 'objects' },
  { emoji: '🛒', name: 'cart', keywords: ['shopping', 'buy', 'store'], category: 'objects' },
  { emoji: '💳', name: 'card', keywords: ['credit', 'payment', 'money'], category: 'objects' },

  // Symbols
  { emoji: '📅', name: 'calendar', keywords: ['date', 'schedule', 'event', 'plan'], category: 'symbols' },
  { emoji: '📆', name: 'week', keywords: ['calendar', 'schedule', 'days'], category: 'symbols' },
  { emoji: '🗓️', name: 'month', keywords: ['calendar', 'schedule', 'days'], category: 'symbols' },
  { emoji: '📊', name: 'chart', keywords: ['stats', 'graph', 'data', 'analytics'], category: 'symbols' },
  { emoji: '📈', name: 'trend up', keywords: ['growth', 'increase', 'positive'], category: 'symbols' },
  { emoji: '📉', name: 'trend down', keywords: ['decrease', 'decline', 'negative'], category: 'symbols' },
  { emoji: '🔥', name: 'fire', keywords: ['hot', 'streak', 'trending', 'popular'], category: 'symbols' },
  { emoji: '⭐', name: 'star', keywords: ['favorite', 'best', 'rating', 'top'], category: 'symbols' },
  { emoji: '✨', name: 'sparkles', keywords: ['magic', 'new', 'special', 'shine'], category: 'symbols' },
  { emoji: '💯', name: 'hundred', keywords: ['perfect', 'score', 'complete'], category: 'symbols' },
  { emoji: '✅', name: 'check', keywords: ['done', 'complete', 'success', 'yes'], category: 'symbols' },
  { emoji: '❌', name: 'cross', keywords: ['no', 'wrong', 'error', 'cancel'], category: 'symbols' },
  { emoji: '⚠️', name: 'warning', keywords: ['alert', 'caution', 'danger'], category: 'symbols' },
  { emoji: '❓', name: 'question', keywords: ['ask', 'help', 'what', 'why'], category: 'symbols' },
  { emoji: '💬', name: 'speech', keywords: ['chat', 'message', 'talk', 'comment'], category: 'symbols' },
  { emoji: '🔄', name: 'refresh', keywords: ['sync', 'reload', 'update', 'cycle'], category: 'symbols' },
  { emoji: '⏰', name: 'clock', keywords: ['time', 'alarm', 'schedule', 'hour'], category: 'symbols' },
  { emoji: '⏱️', name: 'stopwatch', keywords: ['timer', 'time', 'duration'], category: 'symbols' },
  { emoji: '🆕', name: 'new', keywords: ['recent', 'fresh', 'latest'], category: 'symbols' },
  { emoji: '🏆', name: 'trophy', keywords: ['winner', 'champion', 'award', 'best'], category: 'symbols' },
  { emoji: '🎯', name: 'target', keywords: ['goal', 'aim', 'focus'], category: 'symbols' },
  { emoji: '📍', name: 'pin', keywords: ['location', 'place', 'marker', 'map'], category: 'symbols' },

  // Nature
  { emoji: '🌞', name: 'sun', keywords: ['sunny', 'day', 'weather', 'bright'], category: 'nature' },
  { emoji: '🌙', name: 'moon', keywords: ['night', 'sleep', 'dark'], category: 'nature' },
  { emoji: '🌧️', name: 'rain', keywords: ['weather', 'wet', 'water'], category: 'nature' },
  { emoji: '❄️', name: 'snow', keywords: ['cold', 'winter', 'weather'], category: 'nature' },
  { emoji: '🌿', name: 'herb', keywords: ['plant', 'nature', 'green'], category: 'nature' },
  { emoji: '🌸', name: 'blossom', keywords: ['flower', 'spring', 'pink'], category: 'nature' },
  { emoji: '🌳', name: 'tree', keywords: ['nature', 'forest', 'plant'], category: 'nature' },
  { emoji: '🌊', name: 'wave', keywords: ['ocean', 'sea', 'water', 'beach'], category: 'nature' },
  { emoji: '🐕', name: 'dog', keywords: ['pet', 'animal', 'walk', 'puppy'], category: 'nature' },
  { emoji: '🐈', name: 'cat', keywords: ['pet', 'animal', 'kitten'], category: 'nature' },

  // Food
  { emoji: '🍕', name: 'pizza', keywords: ['food', 'italian', 'meal'], category: 'food' },
  { emoji: '🍔', name: 'burger', keywords: ['food', 'fast', 'meal', 'hamburger'], category: 'food' },
  { emoji: '🍜', name: 'noodles', keywords: ['food', 'asian', 'ramen', 'soup'], category: 'food' },
  { emoji: '🍣', name: 'sushi', keywords: ['food', 'japanese', 'fish'], category: 'food' },
  { emoji: '🥗', name: 'salad', keywords: ['food', 'healthy', 'vegetable'], category: 'food' },
  { emoji: '🍎', name: 'apple', keywords: ['fruit', 'healthy', 'food'], category: 'food' },
  { emoji: '🥤', name: 'drink', keywords: ['beverage', 'soda', 'cup'], category: 'food' },
  { emoji: '🍺', name: 'beer', keywords: ['drink', 'alcohol', 'bar'], category: 'food' },
  { emoji: '🍷', name: 'wine', keywords: ['drink', 'alcohol', 'dinner'], category: 'food' },
  { emoji: '🍵', name: 'tea', keywords: ['drink', 'hot', 'beverage'], category: 'food' },
];

/**
 * Search emojis by query
 * @param query Search query
 * @returns Filtered emoji items
 */
export function searchEmojis(query: string): EmojiItem[] {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return [];

  return EMOJIS.filter(
    (emoji) =>
      emoji.name.includes(normalizedQuery) ||
      emoji.keywords.some((keyword) => keyword.includes(normalizedQuery))
  );
}

/**
 * Get emojis by category
 * @param categoryId Category ID
 * @returns Emoji items in that category
 */
export function getEmojisByCategory(categoryId: string): EmojiItem[] {
  if (categoryId === 'recent') return []; // Recent is handled separately
  return EMOJIS.filter((emoji) => emoji.category === categoryId);
}
