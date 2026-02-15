/**
 * Pre-built question templates for the admin portal
 * Makes it easy to create common question patterns
 */

import { AskCategory, UserDataState, DataRequirements } from '@/lib/models/AskQuestion';

export interface QuestionTemplate {
  id: string;
  name: string;
  description: string;
  category: AskCategory;
  data: {
    icon: string;
    labelKey: string;
    queryTemplate: string;
    category: AskCategory;
    priority: number;
    userDataStates: UserDataState[];
    requiresData?: DataRequirements;
    variables?: string[];
  };
}

export interface TemplateCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    id: 'activity',
    name: 'Activity',
    icon: '🏃',
    description: 'Questions about user activities and visits',
  },
  {
    id: 'health',
    name: 'Health',
    icon: '❤️',
    description: 'Questions about health metrics and wellness',
  },
  {
    id: 'location',
    name: 'Location',
    icon: '📍',
    description: 'Questions about places and visits',
  },
  {
    id: 'general',
    name: 'General',
    icon: '📊',
    description: 'Summary and overview questions',
  },
  {
    id: 'voice',
    name: 'Voice',
    icon: '🎙️',
    description: 'Questions about voice notes',
  },
  {
    id: 'photo',
    name: 'Photo',
    icon: '📸',
    description: 'Questions about photos and memories',
  },
];

export const QUESTION_TEMPLATES: QuestionTemplate[] = [
  // Activity Templates
  {
    id: 'activity-count',
    name: 'Activity Count',
    description: 'How many times did I do X?',
    category: 'activity',
    data: {
      icon: '📍',
      labelKey: 'My {{activity}}',
      queryTemplate: 'How many times did I do {{activity}}?',
      category: 'activity',
      priority: 75,
      userDataStates: ['PARTIAL_DATA', 'RICH_DATA'],
      requiresData: { hasLocationData: true },
      variables: ['activity'],
    },
  },
  {
    id: 'activity-last-time',
    name: 'Last Activity',
    description: 'When did I last do X?',
    category: 'activity',
    data: {
      icon: '🕐',
      labelKey: 'Last {{activity}}',
      queryTemplate: 'When was the last time I did {{activity}}?',
      category: 'activity',
      priority: 70,
      userDataStates: ['PARTIAL_DATA', 'RICH_DATA'],
      requiresData: { hasLocationData: true },
      variables: ['activity'],
    },
  },
  {
    id: 'activity-yearly-stats',
    name: 'Yearly Activity Stats',
    description: 'How many times this year?',
    category: 'activity',
    data: {
      icon: '📅',
      labelKey: '{{activity}} this year',
      queryTemplate: 'How many times did I do {{activity}} this year?',
      category: 'activity',
      priority: 68,
      userDataStates: ['RICH_DATA'],
      requiresData: { hasLocationData: true },
      variables: ['activity'],
    },
  },
  {
    id: 'activity-streak',
    name: 'Activity Streak',
    description: 'Longest streak of consecutive activity',
    category: 'activity',
    data: {
      icon: '🔥',
      labelKey: 'My activity streak',
      queryTemplate: 'What is my longest activity streak?',
      category: 'activity',
      priority: 65,
      userDataStates: ['RICH_DATA'],
      requiresData: { hasLocationData: true },
    },
  },
  {
    id: 'activity-best-time',
    name: 'Best Time for Activity',
    description: 'When do I usually do X?',
    category: 'activity',
    data: {
      icon: '⏰',
      labelKey: 'Best time for {{activity}}',
      queryTemplate: 'What time of day do I usually do {{activity}}?',
      category: 'activity',
      priority: 62,
      userDataStates: ['PARTIAL_DATA', 'RICH_DATA'],
      requiresData: { hasLocationData: true },
      variables: ['activity'],
    },
  },
  {
    id: 'activity-locations',
    name: 'Activity Locations',
    description: 'Where do I do X?',
    category: 'activity',
    data: {
      icon: '🗺️',
      labelKey: 'Where I {{activity}}',
      queryTemplate: 'Where do I usually do {{activity}}?',
      category: 'activity',
      priority: 60,
      userDataStates: ['PARTIAL_DATA', 'RICH_DATA'],
      requiresData: { hasLocationData: true },
      variables: ['activity'],
    },
  },

  // Health Templates
  {
    id: 'health-weekly',
    name: 'Weekly Health Summary',
    description: 'Summary of health this week',
    category: 'health',
    data: {
      icon: '❤️',
      labelKey: 'My health this week',
      queryTemplate: 'How was my health this week? Summarize steps, sleep, and workouts.',
      category: 'health',
      priority: 70,
      userDataStates: ['PARTIAL_DATA', 'RICH_DATA'],
      requiresData: { hasHealthData: true },
    },
  },
  {
    id: 'health-steps',
    name: 'Step Count',
    description: 'Weekly step count summary',
    category: 'health',
    data: {
      icon: '👟',
      labelKey: 'My step count',
      queryTemplate: 'What was my step count this week?',
      category: 'health',
      priority: 72,
      userDataStates: ['MINIMAL_DATA', 'PARTIAL_DATA', 'RICH_DATA'],
      requiresData: { hasHealthData: true },
    },
  },
  {
    id: 'health-type-trend',
    name: 'Health Type Trend',
    description: 'Trend for specific health metric',
    category: 'health',
    data: {
      icon: '📈',
      labelKey: '{{healthType}} trends',
      queryTemplate: 'Show me my {{healthType}} trends over the past month.',
      category: 'health',
      priority: 65,
      userDataStates: ['RICH_DATA'],
      requiresData: { hasHealthData: true },
      variables: ['healthType'],
    },
  },
  {
    id: 'health-sleep',
    name: 'Sleep Summary',
    description: 'Sleep patterns and average',
    category: 'health',
    data: {
      icon: '😴',
      labelKey: 'My sleep summary',
      queryTemplate: 'What was my average sleep this week?',
      category: 'health',
      priority: 68,
      userDataStates: ['PARTIAL_DATA', 'RICH_DATA'],
      requiresData: { hasHealthData: true },
    },
  },
  {
    id: 'health-active-days',
    name: 'Most Active Days',
    description: 'Which days am I most active?',
    category: 'health',
    data: {
      icon: '🏃',
      labelKey: 'My active days',
      queryTemplate: 'What are my most active days this month?',
      category: 'health',
      priority: 63,
      userDataStates: ['RICH_DATA'],
      requiresData: { hasHealthData: true },
    },
  },
  {
    id: 'health-workout-summary',
    name: 'Workout Summary',
    description: 'Recent workout overview',
    category: 'health',
    data: {
      icon: '💪',
      labelKey: 'My workouts',
      queryTemplate: 'Summarize my workouts this week.',
      category: 'health',
      priority: 66,
      userDataStates: ['PARTIAL_DATA', 'RICH_DATA'],
      requiresData: { hasHealthData: true },
    },
  },
  {
    id: 'health-best-day',
    name: 'Best Health Day',
    description: 'Healthiest day of the week',
    category: 'health',
    data: {
      icon: '🏆',
      labelKey: 'My best health day',
      queryTemplate: 'What was my healthiest day this week?',
      category: 'health',
      priority: 60,
      userDataStates: ['RICH_DATA'],
      requiresData: { hasHealthData: true },
    },
  },

  // Location Templates
  {
    id: 'location-visited',
    name: 'Places Visited',
    description: 'Most visited places',
    category: 'location',
    data: {
      icon: '📍',
      labelKey: 'Places I visited',
      queryTemplate: 'What are my most visited places?',
      category: 'location',
      priority: 70,
      userDataStates: ['PARTIAL_DATA', 'RICH_DATA'],
      requiresData: { hasLocationData: true },
    },
  },
  {
    id: 'location-recent',
    name: 'Recent Locations',
    description: 'Where have I been recently?',
    category: 'location',
    data: {
      icon: '🗺️',
      labelKey: 'Recent locations',
      queryTemplate: 'Where have I been recently?',
      category: 'location',
      priority: 68,
      userDataStates: ['MINIMAL_DATA', 'PARTIAL_DATA', 'RICH_DATA'],
      requiresData: { hasLocationData: true },
    },
  },
  {
    id: 'location-new-places',
    name: 'New Places',
    description: 'New places visited this month',
    category: 'location',
    data: {
      icon: '🆕',
      labelKey: 'New places',
      queryTemplate: 'What new places did I visit this month?',
      category: 'location',
      priority: 65,
      userDataStates: ['PARTIAL_DATA', 'RICH_DATA'],
      requiresData: { hasLocationData: true },
    },
  },
  {
    id: 'location-time-at-place',
    name: 'Time at Place',
    description: 'Total time spent at a location',
    category: 'location',
    data: {
      icon: '⏱️',
      labelKey: 'Time at {{activity}}',
      queryTemplate: 'How much total time did I spend at {{activity}}?',
      category: 'location',
      priority: 62,
      userDataStates: ['PARTIAL_DATA', 'RICH_DATA'],
      requiresData: { hasLocationData: true },
      variables: ['activity'],
    },
  },
  {
    id: 'location-favorites',
    name: 'Favorite Places',
    description: 'Most frequently visited places',
    category: 'location',
    data: {
      icon: '❤️',
      labelKey: 'My favorite places',
      queryTemplate: 'What are my favorite places based on visit frequency?',
      category: 'location',
      priority: 63,
      userDataStates: ['RICH_DATA'],
      requiresData: { hasLocationData: true },
    },
  },

  // General Templates
  {
    id: 'summary-today',
    name: 'Today Summary',
    description: 'What did I do today?',
    category: 'general',
    data: {
      icon: '📅',
      labelKey: 'What did I do today?',
      queryTemplate: 'Summarize everything I did today.',
      category: 'general',
      priority: 80,
      userDataStates: ['MINIMAL_DATA', 'PARTIAL_DATA', 'RICH_DATA'],
    },
  },
  {
    id: 'summary-week',
    name: 'Week Summary',
    description: 'Weekly activity recap',
    category: 'general',
    data: {
      icon: '📆',
      labelKey: 'My week recap',
      queryTemplate: 'What did I do this week? Give me a summary.',
      category: 'general',
      priority: 78,
      userDataStates: ['PARTIAL_DATA', 'RICH_DATA'],
    },
  },
  {
    id: 'summary-month',
    name: 'Month Summary',
    description: 'Monthly highlights',
    category: 'general',
    data: {
      icon: '🗓️',
      labelKey: 'Monthly highlights',
      queryTemplate: 'What are the highlights of this month?',
      category: 'general',
      priority: 75,
      userDataStates: ['RICH_DATA'],
    },
  },
  {
    id: 'patterns',
    name: 'My Patterns',
    description: 'Find patterns in activities',
    category: 'general',
    data: {
      icon: '🔄',
      labelKey: 'My patterns',
      queryTemplate: 'What patterns do you notice in my activities?',
      category: 'general',
      priority: 65,
      userDataStates: ['RICH_DATA'],
    },
  },
  {
    id: 'compare-weeks',
    name: 'Compare Weeks',
    description: 'Compare this week to last week',
    category: 'general',
    data: {
      icon: '📊',
      labelKey: 'Week comparison',
      queryTemplate: 'How does this week compare to last week?',
      category: 'general',
      priority: 63,
      userDataStates: ['RICH_DATA'],
    },
  },
  {
    id: 'busiest-day',
    name: 'Busiest Day',
    description: 'Most active day of the month',
    category: 'general',
    data: {
      icon: '⭐',
      labelKey: 'My busiest day',
      queryTemplate: 'What was my busiest day this month?',
      category: 'general',
      priority: 60,
      userDataStates: ['RICH_DATA'],
    },
  },
  {
    id: 'recommendations',
    name: 'Recommendations',
    description: 'AI suggestions based on data',
    category: 'general',
    data: {
      icon: '💡',
      labelKey: 'Recommendations for me',
      queryTemplate: 'Based on my data, what do you recommend I do?',
      category: 'general',
      priority: 58,
      userDataStates: ['RICH_DATA'],
    },
  },
  {
    id: 'data-overview',
    name: 'Data Overview',
    description: 'Overview of collected data',
    category: 'general',
    data: {
      icon: '📊',
      labelKey: 'My data overview',
      queryTemplate: 'What data have I collected?',
      category: 'general',
      priority: 85,
      userDataStates: ['MINIMAL_DATA', 'PARTIAL_DATA', 'RICH_DATA'],
    },
  },

  // Voice Templates
  {
    id: 'voice-recent',
    name: 'Recent Voice Notes',
    description: 'What did I say recently?',
    category: 'voice',
    data: {
      icon: '🎙️',
      labelKey: 'My voice notes',
      queryTemplate: 'What did I say in my recent voice notes?',
      category: 'voice',
      priority: 70,
      userDataStates: ['MINIMAL_DATA', 'PARTIAL_DATA', 'RICH_DATA'],
      requiresData: { hasVoiceNotes: true },
    },
  },
  {
    id: 'voice-summary',
    name: 'Voice Note Summary',
    description: 'Summarize voice notes from this week',
    category: 'voice',
    data: {
      icon: '📝',
      labelKey: 'Voice highlights',
      queryTemplate: 'Summarize my voice notes from this week.',
      category: 'voice',
      priority: 65,
      userDataStates: ['RICH_DATA'],
      requiresData: { hasVoiceNotes: true },
    },
  },

  // Photo Templates
  {
    id: 'photo-recent',
    name: 'Recent Photos',
    description: 'Show recent photos',
    category: 'photo',
    data: {
      icon: '📸',
      labelKey: 'My photos',
      queryTemplate: 'Show me my recent photos.',
      category: 'photo',
      priority: 65,
      userDataStates: ['MINIMAL_DATA', 'PARTIAL_DATA', 'RICH_DATA'],
      requiresData: { hasPhotoMemories: true },
    },
  },
  {
    id: 'photo-activities',
    name: 'Photo Activities',
    description: 'Activities with photos',
    category: 'photo',
    data: {
      icon: '🖼️',
      labelKey: 'Photo memories',
      queryTemplate: 'Which activities have photos?',
      category: 'photo',
      priority: 60,
      userDataStates: ['RICH_DATA'],
      requiresData: { hasPhotoMemories: true },
    },
  },
];

/**
 * Get templates by category
 * @param categoryId Category ID
 * @returns Question templates in that category
 */
export function getTemplatesByCategory(categoryId: string): QuestionTemplate[] {
  return QUESTION_TEMPLATES.filter((t) => t.category === categoryId);
}

/**
 * Get a single template by ID
 * @param templateId Template ID
 * @returns The template or undefined
 */
export function getTemplateById(templateId: string): QuestionTemplate | undefined {
  return QUESTION_TEMPLATES.find((t) => t.id === templateId);
}
