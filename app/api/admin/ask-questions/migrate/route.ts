import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';
import {
  AskQuestion,
  AskQuestionsConfig,
  isValidAskLanguage,
  AskLanguageCode,
  AskCategory,
  UserDataState,
} from '@/lib/models/AskQuestion';

/**
 * Default question templates for migration
 * These match the fallback templates in the mobile app
 */
interface QuestionTemplate {
  id: string;
  icon: string;
  labelKeyTemplate: string;
  queryKeyTemplate: string;
  category: AskCategory;
  priority: number;
  userDataStates: UserDataState[];
  requiresData?: {
    hasLocationData?: boolean;
    hasHealthData?: boolean;
    hasVoiceNotes?: boolean;
    hasPhotoMemories?: boolean;
  };
  variables?: string[];
  order: number;
}

const QUESTION_TEMPLATES: QuestionTemplate[] = [
  // Onboarding questions
  {
    id: 'onboard-health',
    icon: '❤️',
    labelKeyTemplate: 'onboarding_connect_health',
    queryKeyTemplate: 'ONBOARD_HEALTH',
    category: 'onboarding',
    priority: 100,
    userDataStates: ['NO_DATA'],
    order: 0,
  },
  {
    id: 'onboard-location',
    icon: '📍',
    labelKeyTemplate: 'onboarding_enable_location',
    queryKeyTemplate: 'ONBOARD_LOCATION',
    category: 'onboarding',
    priority: 90,
    userDataStates: ['NO_DATA'],
    order: 1,
  },
  {
    id: 'onboard-voice',
    icon: '🎙️',
    labelKeyTemplate: 'onboarding_record_voice',
    queryKeyTemplate: 'ONBOARD_VOICE',
    category: 'onboarding',
    priority: 80,
    userDataStates: ['NO_DATA'],
    order: 2,
  },
  {
    id: 'onboard-photo',
    icon: '📸',
    labelKeyTemplate: 'onboarding_upload_photos',
    queryKeyTemplate: 'ONBOARD_PHOTO',
    category: 'onboarding',
    priority: 70,
    userDataStates: ['NO_DATA'],
    order: 3,
  },

  // General
  {
    id: 'data-overview',
    icon: '📊',
    labelKeyTemplate: 'data_overview_label',
    queryKeyTemplate: 'data_overview_query',
    category: 'general',
    priority: 95,
    userDataStates: ['MINIMAL_DATA', 'PARTIAL_DATA', 'RICH_DATA'],
    order: 4,
  },

  // Activity questions
  {
    id: 'activity-count',
    icon: '📍',
    labelKeyTemplate: 'activity_label',
    queryKeyTemplate: 'activity_count_query',
    category: 'activity',
    priority: 90,
    userDataStates: ['MINIMAL_DATA', 'PARTIAL_DATA', 'RICH_DATA'],
    requiresData: { hasLocationData: true },
    variables: ['activity'],
    order: 5,
  },
  {
    id: 'activity-count-year',
    icon: '📍',
    labelKeyTemplate: 'activity_stats_label',
    queryKeyTemplate: 'activity_count_year_query',
    category: 'activity',
    priority: 85,
    userDataStates: ['RICH_DATA'],
    requiresData: { hasLocationData: true },
    variables: ['activity'],
    order: 6,
  },
  {
    id: 'activity-last-time',
    icon: '📍',
    labelKeyTemplate: 'activity_history_label',
    queryKeyTemplate: 'activity_last_visit_query',
    category: 'activity',
    priority: 80,
    userDataStates: ['PARTIAL_DATA', 'RICH_DATA'],
    requiresData: { hasLocationData: true },
    variables: ['activity'],
    order: 7,
  },

  // Health questions
  {
    id: 'health-steps',
    icon: '👟',
    labelKeyTemplate: 'health_steps_label',
    queryKeyTemplate: 'health_steps_query',
    category: 'health',
    priority: 85,
    userDataStates: ['MINIMAL_DATA', 'PARTIAL_DATA', 'RICH_DATA'],
    requiresData: { hasHealthData: true },
    order: 8,
  },
  {
    id: 'health-type',
    icon: '❤️',
    labelKeyTemplate: 'health_type_label',
    queryKeyTemplate: 'health_type_query',
    category: 'health',
    priority: 80,
    userDataStates: ['MINIMAL_DATA', 'PARTIAL_DATA', 'RICH_DATA'],
    requiresData: { hasHealthData: true },
    variables: ['healthType'],
    order: 9,
  },
  {
    id: 'health-type-trends',
    icon: '📈',
    labelKeyTemplate: 'health_trends_label',
    queryKeyTemplate: 'health_trends_query',
    category: 'health',
    priority: 75,
    userDataStates: ['RICH_DATA'],
    requiresData: { hasHealthData: true },
    variables: ['healthType'],
    order: 10,
  },
  {
    id: 'health-active-days',
    icon: '🏃',
    labelKeyTemplate: 'health_activity_trends_label',
    queryKeyTemplate: 'health_active_days_query',
    category: 'health',
    priority: 70,
    userDataStates: ['RICH_DATA'],
    requiresData: { hasHealthData: true },
    order: 11,
  },
  {
    id: 'health-sleep',
    icon: '😴',
    labelKeyTemplate: 'health_sleep_summary_label',
    queryKeyTemplate: 'health_sleep_average_query',
    category: 'health',
    priority: 65,
    userDataStates: ['RICH_DATA'],
    requiresData: { hasHealthData: true },
    order: 12,
  },

  // Location questions
  {
    id: 'location-most-visited',
    icon: '📍',
    labelKeyTemplate: 'location_visited_label',
    queryKeyTemplate: 'location_most_visited_query',
    category: 'location',
    priority: 75,
    userDataStates: ['PARTIAL_DATA', 'RICH_DATA'],
    requiresData: { hasLocationData: true },
    order: 13,
  },
  {
    id: 'location-recent',
    icon: '🗺️',
    labelKeyTemplate: 'location_recent_label',
    queryKeyTemplate: 'location_recent_query',
    category: 'location',
    priority: 70,
    userDataStates: ['MINIMAL_DATA', 'PARTIAL_DATA', 'RICH_DATA'],
    requiresData: { hasLocationData: true },
    order: 14,
  },

  // Voice questions
  {
    id: 'voice-recent',
    icon: '🎙️',
    labelKeyTemplate: 'voice_notes_label',
    queryKeyTemplate: 'voice_recent_query',
    category: 'voice',
    priority: 70,
    userDataStates: ['MINIMAL_DATA', 'PARTIAL_DATA', 'RICH_DATA'],
    requiresData: { hasVoiceNotes: true },
    order: 15,
  },
  {
    id: 'voice-summarize',
    icon: '📝',
    labelKeyTemplate: 'voice_highlights_label',
    queryKeyTemplate: 'voice_summarize_query',
    category: 'voice',
    priority: 65,
    userDataStates: ['RICH_DATA'],
    requiresData: { hasVoiceNotes: true },
    order: 16,
  },

  // Photo questions
  {
    id: 'photo-recent',
    icon: '📸',
    labelKeyTemplate: 'photo_label',
    queryKeyTemplate: 'photo_recent_query',
    category: 'photo',
    priority: 65,
    userDataStates: ['MINIMAL_DATA', 'PARTIAL_DATA', 'RICH_DATA'],
    requiresData: { hasPhotoMemories: true },
    order: 17,
  },
  {
    id: 'photo-activities',
    icon: '🖼️',
    labelKeyTemplate: 'photo_memories_label',
    queryKeyTemplate: 'photo_activities_query',
    category: 'photo',
    priority: 60,
    userDataStates: ['RICH_DATA'],
    requiresData: { hasPhotoMemories: true },
    order: 18,
  },

  // Fallback health question
  {
    id: 'fallback-health',
    icon: '❤️',
    labelKeyTemplate: 'fallback_health_label',
    queryKeyTemplate: 'fallback_health_query',
    category: 'health',
    priority: 50,
    userDataStates: ['MINIMAL_DATA', 'PARTIAL_DATA'],
    requiresData: { hasHealthData: true },
    order: 19,
  },

  // Time-based questions
  {
    id: 'summary-today',
    icon: '📅',
    labelKeyTemplate: 'summary_today_label',
    queryKeyTemplate: 'summary_today_query',
    category: 'general',
    priority: 93,
    userDataStates: ['MINIMAL_DATA', 'PARTIAL_DATA', 'RICH_DATA'],
    order: 20,
  },
  {
    id: 'summary-week',
    icon: '📆',
    labelKeyTemplate: 'summary_week_label',
    queryKeyTemplate: 'summary_week_query',
    category: 'general',
    priority: 91,
    userDataStates: ['PARTIAL_DATA', 'RICH_DATA'],
    order: 21,
  },
  {
    id: 'summary-month',
    icon: '🗓️',
    labelKeyTemplate: 'summary_month_label',
    queryKeyTemplate: 'summary_month_query',
    category: 'general',
    priority: 88,
    userDataStates: ['RICH_DATA'],
    order: 22,
  },
  {
    id: 'activity-streak',
    icon: '🔥',
    labelKeyTemplate: 'activity_streak_label',
    queryKeyTemplate: 'activity_streak_query',
    category: 'activity',
    priority: 78,
    userDataStates: ['RICH_DATA'],
    requiresData: { hasLocationData: true },
    order: 23,
  },
  {
    id: 'busiest-day',
    icon: '⭐',
    labelKeyTemplate: 'busiest_day_label',
    queryKeyTemplate: 'busiest_day_query',
    category: 'general',
    priority: 76,
    userDataStates: ['RICH_DATA'],
    order: 24,
  },

  // Comparison & Insights questions
  {
    id: 'compare-weeks',
    icon: '📊',
    labelKeyTemplate: 'compare_weeks_label',
    queryKeyTemplate: 'compare_weeks_query',
    category: 'general',
    priority: 74,
    userDataStates: ['RICH_DATA'],
    order: 25,
  },
  {
    id: 'patterns',
    icon: '🔄',
    labelKeyTemplate: 'patterns_label',
    queryKeyTemplate: 'patterns_query',
    category: 'general',
    priority: 72,
    userDataStates: ['RICH_DATA'],
    order: 26,
  },
  {
    id: 'time-of-day',
    icon: '⏰',
    labelKeyTemplate: 'time_of_day_label',
    queryKeyTemplate: 'time_of_day_query',
    category: 'activity',
    priority: 77,
    userDataStates: ['PARTIAL_DATA', 'RICH_DATA'],
    requiresData: { hasLocationData: true },
    variables: ['activity'],
    order: 27,
  },
  {
    id: 'recommendations',
    icon: '💡',
    labelKeyTemplate: 'recommendations_label',
    queryKeyTemplate: 'recommendations_query',
    category: 'general',
    priority: 68,
    userDataStates: ['RICH_DATA'],
    order: 28,
  },

  // Location & Activity questions
  {
    id: 'new-places',
    icon: '🆕',
    labelKeyTemplate: 'new_places_label',
    queryKeyTemplate: 'new_places_query',
    category: 'location',
    priority: 73,
    userDataStates: ['PARTIAL_DATA', 'RICH_DATA'],
    requiresData: { hasLocationData: true },
    order: 29,
  },
  {
    id: 'time-at-place',
    icon: '⏱️',
    labelKeyTemplate: 'time_at_place_label',
    queryKeyTemplate: 'time_at_place_query',
    category: 'activity',
    priority: 75,
    userDataStates: ['PARTIAL_DATA', 'RICH_DATA'],
    requiresData: { hasLocationData: true },
    variables: ['activity'],
    order: 30,
  },
  {
    id: 'favorite-places',
    icon: '❤️',
    labelKeyTemplate: 'favorite_places_label',
    queryKeyTemplate: 'favorite_places_query',
    category: 'location',
    priority: 71,
    userDataStates: ['RICH_DATA'],
    requiresData: { hasLocationData: true },
    order: 31,
  },
  {
    id: 'activity-locations',
    icon: '🗺️',
    labelKeyTemplate: 'activity_locations_label',
    queryKeyTemplate: 'activity_locations_query',
    category: 'activity',
    priority: 76,
    userDataStates: ['PARTIAL_DATA', 'RICH_DATA'],
    requiresData: { hasLocationData: true },
    variables: ['activity'],
    order: 32,
  },

  // Health & Wellness questions
  {
    id: 'health-best-day',
    icon: '🏆',
    labelKeyTemplate: 'health_best_day_label',
    queryKeyTemplate: 'health_best_day_query',
    category: 'health',
    priority: 73,
    userDataStates: ['PARTIAL_DATA', 'RICH_DATA'],
    requiresData: { hasHealthData: true },
    order: 33,
  },
  {
    id: 'workout-summary',
    icon: '💪',
    labelKeyTemplate: 'workout_summary_label',
    queryKeyTemplate: 'workout_summary_query',
    category: 'health',
    priority: 72,
    userDataStates: ['PARTIAL_DATA', 'RICH_DATA'],
    requiresData: { hasHealthData: true },
    order: 34,
  },
];

/**
 * Translation maps for each language
 * These map the template keys to actual translations
 */
const TRANSLATIONS: Record<AskLanguageCode, Record<string, string>> = {
  en: {
    onboarding_connect_health: 'Connect Health Data',
    onboarding_enable_location: 'Enable Location Tracking',
    onboarding_record_voice: 'Record a Voice Note',
    onboarding_upload_photos: 'Upload Photos',
    data_overview_label: 'My data overview',
    data_overview_query: 'What data have I collected so far?',
    activity_label: 'My {{activity}}',
    activity_count_query: 'How many times did I do {{activity}}?',
    activity_stats_label: 'My {{activity}} stats',
    activity_count_year_query: 'How many times did I do {{activity}} this year?',
    activity_history_label: '{{activity}} history',
    activity_last_visit_query: 'When was the last time I went to {{activity}}?',
    health_steps_label: 'My step counts',
    health_steps_query: 'What were my step counts this week?',
    health_type_label: 'My {{healthType}}',
    health_type_query: 'What were my {{healthType}} recently?',
    health_trends_label: '{{healthType}} trends',
    health_trends_query: 'Show me my {{healthType}} trends',
    health_activity_trends_label: 'My activity trends',
    health_active_days_query: 'What were my most active days this month?',
    health_sleep_summary_label: 'Sleep summary',
    health_sleep_average_query: 'What was my average sleep this week?',
    location_visited_label: 'Places I visited',
    location_most_visited_query: 'What are my most visited places?',
    location_recent_label: 'Recent locations',
    location_recent_query: 'Where did I go recently?',
    voice_notes_label: 'My voice notes',
    voice_recent_query: 'What did I talk about in my recent voice notes?',
    voice_highlights_label: 'Voice highlights',
    voice_summarize_query: 'Summarize my voice notes from this week',
    photo_label: 'My photos',
    photo_recent_query: 'Show me my recent photos',
    photo_memories_label: 'Photo memories',
    photo_activities_query: 'What activities have photos?',
    fallback_health_label: 'Health summary',
    fallback_health_query: 'Show me my health data',
    summary_today_label: 'What did I do today?',
    summary_today_query: 'Summarize everything I did today',
    summary_week_label: 'My week in review',
    summary_week_query: 'What did I do this week? Give me a summary',
    summary_month_label: 'Monthly highlights',
    summary_month_query: 'What were the highlights of this month?',
    activity_streak_label: 'My activity streaks',
    activity_streak_query: 'What are my longest activity streaks?',
    busiest_day_label: 'My busiest days',
    busiest_day_query: 'What were my busiest days this month?',
    compare_weeks_label: 'Week comparison',
    compare_weeks_query: 'How does this week compare to last week?',
    patterns_label: 'My patterns',
    patterns_query: 'What patterns do you notice in my activities?',
    time_of_day_label: 'Best time for {{activity}}',
    time_of_day_query: 'What time do I usually do {{activity}}?',
    recommendations_label: 'Suggestions for me',
    recommendations_query: 'Based on my data, what do you suggest I do?',
    new_places_label: 'New places this month',
    new_places_query: 'What new places did I visit this month?',
    time_at_place_label: 'Time at {{activity}}',
    time_at_place_query: 'How much time have I spent at {{activity}} total?',
    favorite_places_label: 'My favorite places',
    favorite_places_query: 'What are my favorite places based on visit frequency?',
    activity_locations_label: 'Where I do {{activity}}',
    activity_locations_query: 'Where do I usually do {{activity}}?',
    health_best_day_label: 'Best health day',
    health_best_day_query: 'What was my best health day this week?',
    workout_summary_label: 'Workout summary',
    workout_summary_query: 'Summarize my workouts this week',
  },
  es: {
    onboarding_connect_health: 'Conectar datos de salud',
    onboarding_enable_location: 'Activar seguimiento de ubicación',
    onboarding_record_voice: 'Grabar una nota de voz',
    onboarding_upload_photos: 'Subir fotos',
    data_overview_label: 'Resumen de mis datos',
    data_overview_query: '¿Qué datos he recopilado hasta ahora?',
    activity_label: 'Mi {{activity}}',
    activity_count_query: '¿Cuántas veces hice {{activity}}?',
    activity_stats_label: 'Estadísticas de {{activity}}',
    activity_count_year_query: '¿Cuántas veces hice {{activity}} este año?',
    activity_history_label: 'Historial de {{activity}}',
    activity_last_visit_query: '¿Cuándo fue la última vez que fui a {{activity}}?',
    health_steps_label: 'Mis pasos',
    health_steps_query: '¿Cuántos pasos di esta semana?',
    health_type_label: 'Mi {{healthType}}',
    health_type_query: '¿Cómo estuvo mi {{healthType}} recientemente?',
    health_trends_label: 'Tendencias de {{healthType}}',
    health_trends_query: 'Muéstrame las tendencias de {{healthType}}',
    health_activity_trends_label: 'Tendencias de actividad',
    health_active_days_query: '¿Cuáles fueron mis días más activos este mes?',
    health_sleep_summary_label: 'Resumen del sueño',
    health_sleep_average_query: '¿Cuál fue mi promedio de sueño esta semana?',
    location_visited_label: 'Lugares visitados',
    location_most_visited_query: '¿Cuáles son mis lugares más visitados?',
    location_recent_label: 'Ubicaciones recientes',
    location_recent_query: '¿A dónde fui recientemente?',
    voice_notes_label: 'Mis notas de voz',
    voice_recent_query: '¿De qué hablé en mis notas de voz recientes?',
    voice_highlights_label: 'Destacados de voz',
    voice_summarize_query: 'Resume mis notas de voz de esta semana',
    photo_label: 'Mis fotos',
    photo_recent_query: 'Muéstrame mis fotos recientes',
    photo_memories_label: 'Recuerdos fotográficos',
    photo_activities_query: '¿Qué actividades tienen fotos?',
    fallback_health_label: 'Resumen de salud',
    fallback_health_query: 'Muéstrame mis datos de salud',
    summary_today_label: '¿Qué hice hoy?',
    summary_today_query: 'Resume todo lo que hice hoy',
    summary_week_label: 'Mi semana en resumen',
    summary_week_query: '¿Qué hice esta semana? Dame un resumen',
    summary_month_label: 'Momentos destacados del mes',
    summary_month_query: '¿Cuáles fueron los momentos destacados de este mes?',
    activity_streak_label: 'Mis rachas de actividad',
    activity_streak_query: '¿Cuáles son mis rachas de actividad más largas?',
    busiest_day_label: 'Mis días más ocupados',
    busiest_day_query: '¿Cuáles fueron mis días más ocupados este mes?',
    compare_weeks_label: 'Comparación semanal',
    compare_weeks_query: '¿Cómo se compara esta semana con la anterior?',
    patterns_label: 'Mis patrones',
    patterns_query: '¿Qué patrones notas en mis actividades?',
    time_of_day_label: 'Mejor momento para {{activity}}',
    time_of_day_query: '¿A qué hora suelo hacer {{activity}}?',
    recommendations_label: 'Sugerencias para mí',
    recommendations_query: 'Según mis datos, ¿qué me sugieres hacer?',
    new_places_label: 'Nuevos lugares este mes',
    new_places_query: '¿Qué lugares nuevos visité este mes?',
    time_at_place_label: 'Tiempo en {{activity}}',
    time_at_place_query: '¿Cuánto tiempo he pasado en {{activity}} en total?',
    favorite_places_label: 'Mis lugares favoritos',
    favorite_places_query: '¿Cuáles son mis lugares favoritos según la frecuencia de visitas?',
    activity_locations_label: 'Dónde hago {{activity}}',
    activity_locations_query: '¿Dónde suelo hacer {{activity}}?',
    health_best_day_label: 'Mejor día de salud',
    health_best_day_query: '¿Cuál fue mi mejor día de salud esta semana?',
    workout_summary_label: 'Resumen de ejercicios',
    workout_summary_query: 'Resume mis ejercicios de esta semana',
  },
  fr: {
    onboarding_connect_health: 'Connecter les données de santé',
    onboarding_enable_location: 'Activer le suivi de localisation',
    onboarding_record_voice: 'Enregistrer une note vocale',
    onboarding_upload_photos: 'Télécharger des photos',
    data_overview_label: 'Aperçu de mes données',
    data_overview_query: 'Quelles données ai-je collectées jusqu\'à présent?',
    activity_label: 'Mon {{activity}}',
    activity_count_query: 'Combien de fois ai-je fait {{activity}}?',
    activity_stats_label: 'Statistiques {{activity}}',
    activity_count_year_query: 'Combien de fois ai-je fait {{activity}} cette année?',
    activity_history_label: 'Historique {{activity}}',
    activity_last_visit_query: 'Quand suis-je allé à {{activity}} pour la dernière fois?',
    health_steps_label: 'Mes pas',
    health_steps_query: 'Combien de pas ai-je fait cette semaine?',
    health_type_label: 'Mon {{healthType}}',
    health_type_query: 'Comment était mon {{healthType}} récemment?',
    health_trends_label: 'Tendances {{healthType}}',
    health_trends_query: 'Montre-moi les tendances de {{healthType}}',
    health_activity_trends_label: 'Tendances d\'activité',
    health_active_days_query: 'Quels ont été mes jours les plus actifs ce mois-ci?',
    health_sleep_summary_label: 'Résumé du sommeil',
    health_sleep_average_query: 'Quelle était ma moyenne de sommeil cette semaine?',
    location_visited_label: 'Lieux visités',
    location_most_visited_query: 'Quels sont mes lieux les plus visités?',
    location_recent_label: 'Emplacements récents',
    location_recent_query: 'Où suis-je allé récemment?',
    voice_notes_label: 'Mes notes vocales',
    voice_recent_query: 'De quoi ai-je parlé dans mes notes vocales récentes?',
    voice_highlights_label: 'Points forts vocaux',
    voice_summarize_query: 'Résume mes notes vocales de cette semaine',
    photo_label: 'Mes photos',
    photo_recent_query: 'Montre-moi mes photos récentes',
    photo_memories_label: 'Souvenirs photo',
    photo_activities_query: 'Quelles activités ont des photos?',
    fallback_health_label: 'Résumé de santé',
    fallback_health_query: 'Montrez-moi mes données de santé',
    summary_today_label: 'Qu\'ai-je fait aujourd\'hui ?',
    summary_today_query: 'Résumez tout ce que j\'ai fait aujourd\'hui',
    summary_week_label: 'Ma semaine en revue',
    summary_week_query: 'Qu\'ai-je fait cette semaine ? Donnez-moi un résumé',
    summary_month_label: 'Points forts du mois',
    summary_month_query: 'Quels ont été les moments forts de ce mois ?',
    activity_streak_label: 'Mes séries d\'activités',
    activity_streak_query: 'Quelles sont mes plus longues séries d\'activités ?',
    busiest_day_label: 'Mes jours les plus chargés',
    busiest_day_query: 'Quels ont été mes jours les plus chargés ce mois-ci ?',
    compare_weeks_label: 'Comparaison des semaines',
    compare_weeks_query: 'Comment cette semaine se compare-t-elle à la précédente ?',
    patterns_label: 'Mes habitudes',
    patterns_query: 'Quelles habitudes remarquez-vous dans mes activités ?',
    time_of_day_label: 'Meilleur moment pour {{activity}}',
    time_of_day_query: 'À quelle heure est-ce que je fais habituellement {{activity}} ?',
    recommendations_label: 'Suggestions pour moi',
    recommendations_query: 'D\'après mes données, que me suggérez-vous de faire ?',
    new_places_label: 'Nouveaux endroits ce mois',
    new_places_query: 'Quels nouveaux endroits ai-je visités ce mois-ci ?',
    time_at_place_label: 'Temps passé à {{activity}}',
    time_at_place_query: 'Combien de temps ai-je passé à {{activity}} au total ?',
    favorite_places_label: 'Mes endroits préférés',
    favorite_places_query: 'Quels sont mes endroits préférés selon la fréquence des visites ?',
    activity_locations_label: 'Où je fais {{activity}}',
    activity_locations_query: 'Où est-ce que je fais habituellement {{activity}} ?',
    health_best_day_label: 'Meilleur jour santé',
    health_best_day_query: 'Quel a été mon meilleur jour de santé cette semaine ?',
    workout_summary_label: 'Résumé des entraînements',
    workout_summary_query: 'Résumez mes entraînements de cette semaine',
  },
  de: {
    onboarding_connect_health: 'Gesundheitsdaten verbinden',
    onboarding_enable_location: 'Standortverfolgung aktivieren',
    onboarding_record_voice: 'Sprachnotiz aufnehmen',
    onboarding_upload_photos: 'Fotos hochladen',
    data_overview_label: 'Meine Datenübersicht',
    data_overview_query: 'Welche Daten habe ich bisher gesammelt?',
    activity_label: 'Mein {{activity}}',
    activity_count_query: 'Wie oft habe ich {{activity}} gemacht?',
    activity_stats_label: '{{activity}} Statistiken',
    activity_count_year_query: 'Wie oft habe ich {{activity}} dieses Jahr gemacht?',
    activity_history_label: '{{activity}} Verlauf',
    activity_last_visit_query: 'Wann war ich zuletzt bei {{activity}}?',
    health_steps_label: 'Meine Schritte',
    health_steps_query: 'Wie viele Schritte bin ich diese Woche gegangen?',
    health_type_label: 'Mein {{healthType}}',
    health_type_query: 'Wie war mein {{healthType}} in letzter Zeit?',
    health_trends_label: '{{healthType}} Trends',
    health_trends_query: 'Zeige mir meine {{healthType}} Trends',
    health_activity_trends_label: 'Aktivitätstrends',
    health_active_days_query: 'Was waren meine aktivsten Tage diesen Monat?',
    health_sleep_summary_label: 'Schlafzusammenfassung',
    health_sleep_average_query: 'Wie war mein durchschnittlicher Schlaf diese Woche?',
    location_visited_label: 'Besuchte Orte',
    location_most_visited_query: 'Was sind meine meistbesuchten Orte?',
    location_recent_label: 'Kürzliche Standorte',
    location_recent_query: 'Wo war ich kürzlich?',
    voice_notes_label: 'Meine Sprachnotizen',
    voice_recent_query: 'Worüber habe ich in meinen letzten Sprachnotizen gesprochen?',
    voice_highlights_label: 'Sprach-Highlights',
    voice_summarize_query: 'Fasse meine Sprachnotizen dieser Woche zusammen',
    photo_label: 'Meine Fotos',
    photo_recent_query: 'Zeige mir meine neuesten Fotos',
    photo_memories_label: 'Foto-Erinnerungen',
    photo_activities_query: 'Welche Aktivitäten haben Fotos?',
    fallback_health_label: 'Gesundheitszusammenfassung',
    fallback_health_query: 'Zeigen Sie mir meine Gesundheitsdaten',
    summary_today_label: 'Was habe ich heute gemacht?',
    summary_today_query: 'Fassen Sie alles zusammen, was ich heute gemacht habe',
    summary_week_label: 'Meine Woche im Rückblick',
    summary_week_query: 'Was habe ich diese Woche gemacht? Geben Sie mir eine Zusammenfassung',
    summary_month_label: 'Monats-Highlights',
    summary_month_query: 'Was waren die Highlights dieses Monats?',
    activity_streak_label: 'Meine Aktivitätsserien',
    activity_streak_query: 'Was sind meine längsten Aktivitätsserien?',
    busiest_day_label: 'Meine geschäftigsten Tage',
    busiest_day_query: 'Was waren meine geschäftigsten Tage diesen Monat?',
    compare_weeks_label: 'Wochenvergleich',
    compare_weeks_query: 'Wie vergleicht sich diese Woche mit der letzten?',
    patterns_label: 'Meine Muster',
    patterns_query: 'Welche Muster bemerken Sie in meinen Aktivitäten?',
    time_of_day_label: 'Beste Zeit für {{activity}}',
    time_of_day_query: 'Zu welcher Zeit mache ich normalerweise {{activity}}?',
    recommendations_label: 'Vorschläge für mich',
    recommendations_query: 'Was schlagen Sie mir basierend auf meinen Daten vor?',
    new_places_label: 'Neue Orte diesen Monat',
    new_places_query: 'Welche neuen Orte habe ich diesen Monat besucht?',
    time_at_place_label: 'Zeit bei {{activity}}',
    time_at_place_query: 'Wie viel Zeit habe ich insgesamt bei {{activity}} verbracht?',
    favorite_places_label: 'Meine Lieblingsorte',
    favorite_places_query: 'Was sind meine Lieblingsorte nach Besuchshäufigkeit?',
    activity_locations_label: 'Wo ich {{activity}} mache',
    activity_locations_query: 'Wo mache ich normalerweise {{activity}}?',
    health_best_day_label: 'Bester Gesundheitstag',
    health_best_day_query: 'Was war mein bester Gesundheitstag diese Woche?',
    workout_summary_label: 'Trainings-Zusammenfassung',
    workout_summary_query: 'Fassen Sie meine Trainingseinheiten dieser Woche zusammen',
  },
  ja: {
    onboarding_connect_health: 'ヘルスデータを接続',
    onboarding_enable_location: '位置情報追跡を有効化',
    onboarding_record_voice: 'ボイスメモを録音',
    onboarding_upload_photos: '写真をアップロード',
    data_overview_label: 'データ概要',
    data_overview_query: 'これまでに収集したデータは何ですか？',
    activity_label: '私の{{activity}}',
    activity_count_query: '私は{{activity}}を何回しましたか？',
    activity_stats_label: '{{activity}}の統計',
    activity_count_year_query: '今年{{activity}}を何回しましたか？',
    activity_history_label: '{{activity}}の履歴',
    activity_last_visit_query: '最後に{{activity}}に行ったのはいつですか？',
    health_steps_label: '歩数',
    health_steps_query: '今週の歩数はどうでしたか？',
    health_type_label: '私の{{healthType}}',
    health_type_query: '最近の{{healthType}}はどうでしたか？',
    health_trends_label: '{{healthType}}の傾向',
    health_trends_query: '{{healthType}}の傾向を表示',
    health_activity_trends_label: 'アクティビティの傾向',
    health_active_days_query: '今月最もアクティブだった日はいつですか？',
    health_sleep_summary_label: '睡眠サマリー',
    health_sleep_average_query: '今週の平均睡眠時間は？',
    location_visited_label: '訪問した場所',
    location_most_visited_query: '最もよく訪れる場所はどこですか？',
    location_recent_label: '最近の場所',
    location_recent_query: '最近どこに行きましたか？',
    voice_notes_label: 'ボイスメモ',
    voice_recent_query: '最近のボイスメモで何を話しましたか？',
    voice_highlights_label: 'ボイスハイライト',
    voice_summarize_query: '今週のボイスメモをまとめて',
    photo_label: '写真',
    photo_recent_query: '最近の写真を見せて',
    photo_memories_label: '写真の思い出',
    photo_activities_query: '写真のあるアクティビティは？',
    fallback_health_label: '健康サマリー',
    fallback_health_query: '私の健康データを見せてください',
    summary_today_label: '今日は何をしましたか？',
    summary_today_query: '今日したことをすべてまとめてください',
    summary_week_label: '今週の振り返り',
    summary_week_query: '今週何をしましたか？まとめてください',
    summary_month_label: '今月のハイライト',
    summary_month_query: '今月のハイライトは何でしたか？',
    activity_streak_label: '私の活動連続記録',
    activity_streak_query: '私の最長の活動連続記録は何ですか？',
    busiest_day_label: '最も忙しかった日',
    busiest_day_query: '今月最も忙しかった日はいつですか？',
    compare_weeks_label: '週の比較',
    compare_weeks_query: '今週は先週と比べてどうですか？',
    patterns_label: '私のパターン',
    patterns_query: '私の活動にどんなパターンが見られますか？',
    time_of_day_label: '{{activity}}に最適な時間',
    time_of_day_query: '普段{{activity}}をする時間は何時ですか？',
    recommendations_label: '私へのおすすめ',
    recommendations_query: '私のデータに基づいて、何をすることをお勧めしますか？',
    new_places_label: '今月の新しい場所',
    new_places_query: '今月訪れた新しい場所はどこですか？',
    time_at_place_label: '{{activity}}での時間',
    time_at_place_query: '{{activity}}に合計どれくらいの時間を費やしましたか？',
    favorite_places_label: 'お気に入りの場所',
    favorite_places_query: '訪問頻度に基づくお気に入りの場所はどこですか？',
    activity_locations_label: '{{activity}}をする場所',
    activity_locations_query: '普段{{activity}}をする場所はどこですか？',
    health_best_day_label: '最高の健康日',
    health_best_day_query: '今週最も健康的だった日はいつですか？',
    workout_summary_label: 'ワークアウトまとめ',
    workout_summary_query: '今週のワークアウトをまとめてください',
  },
  zh: {
    onboarding_connect_health: '连接健康数据',
    onboarding_enable_location: '启用位置追踪',
    onboarding_record_voice: '录制语音笔记',
    onboarding_upload_photos: '上传照片',
    data_overview_label: '我的数据概览',
    data_overview_query: '我到目前为止收集了什么数据？',
    activity_label: '我的{{activity}}',
    activity_count_query: '我做了多少次{{activity}}？',
    activity_stats_label: '{{activity}}统计',
    activity_count_year_query: '今年我做了多少次{{activity}}？',
    activity_history_label: '{{activity}}历史',
    activity_last_visit_query: '我最后一次去{{activity}}是什么时候？',
    health_steps_label: '我的步数',
    health_steps_query: '这周我走了多少步？',
    health_type_label: '我的{{healthType}}',
    health_type_query: '我最近的{{healthType}}怎么样？',
    health_trends_label: '{{healthType}}趋势',
    health_trends_query: '显示我的{{healthType}}趋势',
    health_activity_trends_label: '活动趋势',
    health_active_days_query: '这个月我最活跃的日子是哪几天？',
    health_sleep_summary_label: '睡眠总结',
    health_sleep_average_query: '这周我的平均睡眠时间是多少？',
    location_visited_label: '访问过的地方',
    location_most_visited_query: '我最常去的地方是哪里？',
    location_recent_label: '最近的位置',
    location_recent_query: '我最近去了哪里？',
    voice_notes_label: '我的语音笔记',
    voice_recent_query: '我在最近的语音笔记中说了什么？',
    voice_highlights_label: '语音亮点',
    voice_summarize_query: '总结我这周的语音笔记',
    photo_label: '我的照片',
    photo_recent_query: '显示我最近的照片',
    photo_memories_label: '照片回忆',
    photo_activities_query: '哪些活动有照片？',
    fallback_health_label: '健康总结',
    fallback_health_query: '显示我的健康数据',
    summary_today_label: '今天我做了什么？',
    summary_today_query: '总结我今天做的所有事情',
    summary_week_label: '我的一周回顾',
    summary_week_query: '这周我做了什么？给我一个总结',
    summary_month_label: '本月亮点',
    summary_month_query: '这个月的亮点是什么？',
    activity_streak_label: '我的活动连续记录',
    activity_streak_query: '我最长的活动连续记录是什么？',
    busiest_day_label: '我最忙的日子',
    busiest_day_query: '这个月我最忙的日子是哪几天？',
    compare_weeks_label: '周比较',
    compare_weeks_query: '这周和上周相比怎么样？',
    patterns_label: '我的模式',
    patterns_query: '你在我的活动中注意到什么模式？',
    time_of_day_label: '{{activity}}的最佳时间',
    time_of_day_query: '我通常什么时候做{{activity}}？',
    recommendations_label: '给我的建议',
    recommendations_query: '根据我的数据，你建议我做什么？',
    new_places_label: '本月新地点',
    new_places_query: '这个月我去了哪些新地方？',
    time_at_place_label: '在{{activity}}的时间',
    time_at_place_query: '我总共在{{activity}}花了多少时间？',
    favorite_places_label: '我最喜欢的地方',
    favorite_places_query: '根据访问频率，我最喜欢的地方是哪里？',
    activity_locations_label: '我做{{activity}}的地方',
    activity_locations_query: '我通常在哪里做{{activity}}？',
    health_best_day_label: '最佳健康日',
    health_best_day_query: '这周我最健康的一天是哪天？',
    workout_summary_label: '锻炼总结',
    workout_summary_query: '总结我这周的锻炼',
  },
};

/**
 * POST /api/admin/ask-questions/migrate
 * Migrate default questions to Firestore for a language
 *
 * Body:
 * - language: string (required)
 * - overwrite: boolean (optional, default: false)
 *
 * Returns:
 * - success: boolean
 * - migrated: number
 * - skipped: number
 * - errors: array
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin role
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const body = await request.json();
    const { language, overwrite = false } = body;

    // Validate language
    if (!language || !isValidAskLanguage(language)) {
      return NextResponse.json(
        { error: 'Valid language is required' },
        { status: 400 }
      );
    }

    const translations = TRANSLATIONS[language as AskLanguageCode];
    if (!translations) {
      return NextResponse.json(
        { error: `No translations available for language: ${language}` },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    const now = new Date().toISOString();

    let migrated = 0;
    let skipped = 0;
    const errors: { id: string; error: string }[] = [];

    // Ensure config exists
    const configRef = db
      .collection('exploreQuestions')
      .doc(language)
      .collection('config')
      .doc('settings');

    await configRef.set(
      {
        version: '1.0.0',
        language,
        lastUpdated: now,
        updatedBy: user.uid,
        enabled: true,
      },
      { merge: true }
    );

    // Migrate each question template
    for (const template of QUESTION_TEMPLATES) {
      const questionRef = db
        .collection('exploreQuestions')
        .doc(language)
        .collection('questions')
        .doc(template.id);

      try {
        const existingDoc = await questionRef.get();

        if (existingDoc.exists && !overwrite) {
          skipped++;
          continue;
        }

        // Get translations for this template
        const labelKey = translations[template.labelKeyTemplate] || template.labelKeyTemplate;
        const queryTemplate = translations[template.queryKeyTemplate] || template.queryKeyTemplate;

        // Build question object, excluding undefined fields
        // Firestore doesn't accept undefined values
        const question: Record<string, unknown> = {
          id: template.id,
          icon: template.icon,
          labelKey,
          queryTemplate,
          category: template.category,
          priority: template.priority,
          enabled: true,
          userDataStates: template.userDataStates,
          order: template.order,
          createdAt: now,
          createdBy: user.uid,
          updatedAt: now,
          updatedBy: user.uid,
        };

        // Only add optional fields if they have values
        if (template.requiresData) {
          question.requiresData = template.requiresData;
        }
        if (template.variables && template.variables.length > 0) {
          question.variables = template.variables;
        }

        await questionRef.set(question);
        migrated++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push({ id: template.id, error: errorMessage });
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      migrated,
      skipped,
      errors,
    });
  } catch (error: unknown) {
    console.error('[Admin Ask Questions Migrate API] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to migrate questions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
