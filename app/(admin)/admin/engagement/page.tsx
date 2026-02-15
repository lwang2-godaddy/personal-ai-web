'use client';

import { Fragment, useEffect, useState, useCallback } from 'react';
import { apiGet, apiPut } from '@/lib/api/client';
import { useAppSelector } from '@/lib/store/hooks';

// ===== Default Values (matches mobile app's Achievement.ts) =====

const DEFAULT_XP_VALUES: Record<string, number> = {
  diary_entry: 15,
  voice_note: 20,
  photo_added: 10,
  check_in: 10,
  chat_message: 5,
  streak_day: 25,
  achievement_unlocked: 50,
  daily_prompt_answered: 20,
  first_of_type: 30,
};

const XP_ACTION_LABELS: Record<string, string> = {
  diary_entry: 'Diary Entry',
  voice_note: 'Voice Note',
  photo_added: 'Photo Added',
  check_in: 'Check-In',
  chat_message: 'Chat Message',
  streak_day: 'Streak Day Bonus',
  achievement_unlocked: 'Achievement Unlocked',
  daily_prompt_answered: 'Daily Prompt Answered',
  first_of_type: 'First of Type Bonus',
};

const DEFAULT_LEVEL_THRESHOLDS = [0, 100, 250, 500, 850, 1300, 1900, 2700, 3800, 5200];
const DEFAULT_LEVEL_TITLES = [
  'Newcomer', 'Explorer', 'Chronicler', 'Storyteller', 'Curator',
  'Historian', 'Archivist', 'Sage', 'Oracle', 'Memory Master',
];

const TIER_COLORS: Record<string, string> = {
  bronze: 'bg-orange-100 text-orange-800',
  silver: 'bg-gray-100 text-gray-800',
  gold: 'bg-yellow-100 text-yellow-800',
};

const CATEGORY_COLORS: Record<string, string> = {
  content: 'bg-blue-100 text-blue-800',
  streak: 'bg-red-100 text-red-800',
  exploration: 'bg-green-100 text-green-800',
  social: 'bg-purple-100 text-purple-800',
  milestone: 'bg-indigo-100 text-indigo-800',
};

interface EngagementConfig {
  xpValues: Record<string, number>;
  levelThresholds: number[];
  levelTitles: string[];
  streakBonusXP: number;
  dailyPromptBonusXP: number;
  firstOfTypeBonusXP: number;
  achievements: any[];
  displaySettings?: DisplaySettings;
  updatedAt?: string;
  updatedBy?: string;
}

interface JourneyPrompt {
  day: number;
  text: string;
  category: 'reflection' | 'memory' | 'gratitude' | 'discovery' | 'fun';
  suggestedType: 'diary' | 'voice' | 'photo' | 'any';
  xpBonus: number;
}

interface RotatingPrompt {
  id: string;
  text: string;
  category: 'reflection' | 'memory' | 'gratitude' | 'discovery' | 'fun';
  suggestedType: 'diary' | 'voice' | 'photo' | 'any';
  xpBonus: number;
}

interface DisplaySettings {
  dailyPromptsEnabled: boolean;
  dailyPromptsAvailableToFreeTier: boolean;
  showProgressPill: boolean;
  showLevelBadgeOnProfileTab: boolean;
  showFriendLevelBadges: boolean;
  journeyLength: number;
  defaultPromptXPBonus: number;
}

const CATEGORIES = [
  { value: 'reflection', label: 'Reflection', icon: '\u{1FA9E}' },
  { value: 'memory', label: 'Memory', icon: '\u{1F9E0}' },
  { value: 'gratitude', label: 'Gratitude', icon: '\u{1F64F}' },
  { value: 'discovery', label: 'Discovery', icon: '\u{1F50D}' },
  { value: 'fun', label: 'Fun', icon: '\u{1F389}' },
] as const;

const SUGGESTED_TYPES = [
  { value: 'diary', label: 'Diary', icon: '\u270D\uFE0F' },
  { value: 'voice', label: 'Voice', icon: '\u{1F3A4}' },
  { value: 'photo', label: 'Photo', icon: '\u{1F4F7}' },
  { value: 'any', label: 'Any', icon: '\u2728' },
] as const;

const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  dailyPromptsEnabled: true,
  dailyPromptsAvailableToFreeTier: true,
  showProgressPill: true,
  showLevelBadgeOnProfileTab: true,
  showFriendLevelBadges: true,
  journeyLength: 30,
  defaultPromptXPBonus: 10,
};

const DEFAULT_JOURNEY_PROMPTS: JourneyPrompt[] = [
  { day: 1, text: 'What are 3 things you want to remember about today?', category: 'reflection', suggestedType: 'diary', xpBonus: 10 },
  { day: 2, text: 'Record a quick voice note about your morning routine.', category: 'memory', suggestedType: 'voice', xpBonus: 10 },
  { day: 3, text: 'Take a photo of something that made you smile today.', category: 'discovery', suggestedType: 'photo', xpBonus: 10 },
  { day: 4, text: 'What was the best part of your day so far?', category: 'gratitude', suggestedType: 'diary', xpBonus: 10 },
  { day: 5, text: 'Describe a place you visited today in your own words.', category: 'memory', suggestedType: 'voice', xpBonus: 10 },
  { day: 6, text: 'Capture your favorite meal or snack today.', category: 'fun', suggestedType: 'photo', xpBonus: 10 },
  { day: 7, text: 'Write about one thing you learned this week.', category: 'reflection', suggestedType: 'diary', xpBonus: 15 },
  { day: 8, text: 'What are you grateful for today?', category: 'gratitude', suggestedType: 'diary', xpBonus: 10 },
  { day: 9, text: 'Record a voice memo about your current mood.', category: 'reflection', suggestedType: 'voice', xpBonus: 10 },
  { day: 10, text: 'Photo challenge: capture something blue around you.', category: 'fun', suggestedType: 'photo', xpBonus: 10 },
  { day: 11, text: 'What is a small win you had today?', category: 'gratitude', suggestedType: 'diary', xpBonus: 10 },
  { day: 12, text: 'Describe your ideal weekend in a voice note.', category: 'discovery', suggestedType: 'voice', xpBonus: 10 },
  { day: 13, text: 'Take a photo of your workspace or study area.', category: 'memory', suggestedType: 'photo', xpBonus: 10 },
  { day: 14, text: 'Reflect on your past two weeks. What stood out?', category: 'reflection', suggestedType: 'diary', xpBonus: 15 },
  { day: 15, text: 'What is something you want to try this month?', category: 'discovery', suggestedType: 'diary', xpBonus: 10 },
  { day: 16, text: 'Leave a voice note for your future self.', category: 'memory', suggestedType: 'voice', xpBonus: 15 },
  { day: 17, text: 'Photograph something you see every day but never notice.', category: 'discovery', suggestedType: 'photo', xpBonus: 10 },
  { day: 18, text: 'Who made your day better today and why?', category: 'gratitude', suggestedType: 'diary', xpBonus: 10 },
  { day: 19, text: 'Record a voice note about your favorite hobby.', category: 'fun', suggestedType: 'voice', xpBonus: 10 },
  { day: 20, text: 'Capture the view from your window right now.', category: 'memory', suggestedType: 'photo', xpBonus: 10 },
  { day: 21, text: 'Three weeks in! What habit are you most proud of?', category: 'reflection', suggestedType: 'diary', xpBonus: 15 },
  { day: 22, text: 'What song matches your mood today?', category: 'fun', suggestedType: 'diary', xpBonus: 10 },
  { day: 23, text: 'Describe your favorite place in town with a voice note.', category: 'memory', suggestedType: 'voice', xpBonus: 10 },
  { day: 24, text: 'Photo challenge: capture something that inspires you.', category: 'discovery', suggestedType: 'photo', xpBonus: 10 },
  { day: 25, text: 'Write a letter to yourself one year from now.', category: 'reflection', suggestedType: 'diary', xpBonus: 15 },
  { day: 26, text: 'Record your thoughts on a recent experience.', category: 'memory', suggestedType: 'voice', xpBonus: 10 },
  { day: 27, text: 'Take a photo of someone or something you love.', category: 'gratitude', suggestedType: 'photo', xpBonus: 10 },
  { day: 28, text: 'What are your top 3 goals for next month?', category: 'reflection', suggestedType: 'diary', xpBonus: 15 },
  { day: 29, text: 'Tell a funny story from this week in a voice note.', category: 'fun', suggestedType: 'voice', xpBonus: 10 },
  { day: 30, text: 'You made it 30 days! What has changed since you started?', category: 'reflection', suggestedType: 'diary', xpBonus: 20 },
];

const DEFAULT_ROTATING_PROMPTS: RotatingPrompt[] = [
  { id: 'rotating_1', text: 'What was the highlight of your week?', category: 'reflection', suggestedType: 'diary', xpBonus: 10 },
  { id: 'rotating_2', text: 'Record something you overheard today that was interesting.', category: 'fun', suggestedType: 'voice', xpBonus: 10 },
  { id: 'rotating_3', text: 'Take a photo of your current read or watch.', category: 'discovery', suggestedType: 'photo', xpBonus: 10 },
  { id: 'rotating_4', text: 'What made you laugh today?', category: 'fun', suggestedType: 'diary', xpBonus: 10 },
  { id: 'rotating_5', text: 'Describe the weather and how it made you feel.', category: 'memory', suggestedType: 'voice', xpBonus: 10 },
  { id: 'rotating_6', text: 'What is something you are looking forward to?', category: 'gratitude', suggestedType: 'diary', xpBonus: 10 },
  { id: 'rotating_7', text: 'Capture the sky right now.', category: 'discovery', suggestedType: 'photo', xpBonus: 10 },
  { id: 'rotating_8', text: 'What advice would you give yourself last year?', category: 'reflection', suggestedType: 'diary', xpBonus: 10 },
  { id: 'rotating_9', text: 'Record a short voice note about your commute today.', category: 'memory', suggestedType: 'voice', xpBonus: 10 },
  { id: 'rotating_10', text: 'What is one thing you would change about today?', category: 'reflection', suggestedType: 'diary', xpBonus: 10 },
  { id: 'rotating_11', text: 'Photograph your pet, plant, or favorite object.', category: 'fun', suggestedType: 'photo', xpBonus: 10 },
  { id: 'rotating_12', text: 'Name 3 people who positively impacted your week.', category: 'gratitude', suggestedType: 'diary', xpBonus: 10 },
  { id: 'rotating_13', text: 'What was the most interesting thing you ate this week?', category: 'fun', suggestedType: 'voice', xpBonus: 10 },
  { id: 'rotating_14', text: 'Describe a memory from your childhood.', category: 'memory', suggestedType: 'diary', xpBonus: 10 },
  { id: 'rotating_15', text: 'Take a selfie and describe how you feel.', category: 'reflection', suggestedType: 'photo', xpBonus: 10 },
  { id: 'rotating_16', text: 'What new skill would you like to learn?', category: 'discovery', suggestedType: 'diary', xpBonus: 10 },
  { id: 'rotating_17', text: 'Record your thoughts about a book, show, or movie.', category: 'fun', suggestedType: 'voice', xpBonus: 10 },
  { id: 'rotating_18', text: 'What is the most beautiful thing you saw today?', category: 'gratitude', suggestedType: 'photo', xpBonus: 10 },
  { id: 'rotating_19', text: 'If today had a theme song, what would it be?', category: 'fun', suggestedType: 'diary', xpBonus: 10 },
  { id: 'rotating_20', text: 'Leave a voice note summarizing your day in 30 seconds.', category: 'memory', suggestedType: 'voice', xpBonus: 10 },
];

export default function AdminEngagementPage() {
  const { isAuthenticated, isLoading: authLoading } = useAppSelector((state) => state.auth);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasConfig, setHasConfig] = useState(false);

  // Config state
  const [xpValues, setXpValues] = useState<Record<string, number>>({ ...DEFAULT_XP_VALUES });
  const [levelThresholds, setLevelThresholds] = useState<number[]>([...DEFAULT_LEVEL_THRESHOLDS]);
  const [levelTitles, setLevelTitles] = useState<string[]>([...DEFAULT_LEVEL_TITLES]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [bonusConfig, setBonusConfig] = useState({
    streakBonusXP: 25,
    dailyPromptBonusXP: 20,
    firstOfTypeBonusXP: 30,
  });
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Daily prompts state
  const [journeyPrompts, setJourneyPrompts] = useState<JourneyPrompt[]>([...DEFAULT_JOURNEY_PROMPTS]);
  const [rotatingPrompts, setRotatingPrompts] = useState<RotatingPrompt[]>([...DEFAULT_ROTATING_PROMPTS]);
  const [hasDailyPrompts, setHasDailyPrompts] = useState(false);

  // Display settings state
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>({ ...DEFAULT_DISPLAY_SETTINGS });

  // Active tab
  const [activeTab, setActiveTab] = useState<'xp' | 'levels' | 'achievements' | 'prompts' | 'display'>('xp');

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiGet('/api/admin/engagement');

      if (data.engagement) {
        setHasConfig(true);
        if (data.engagement.xpValues) setXpValues(data.engagement.xpValues);
        if (data.engagement.levelThresholds) setLevelThresholds(data.engagement.levelThresholds);
        if (data.engagement.levelTitles) setLevelTitles(data.engagement.levelTitles);
        if (data.engagement.achievements) setAchievements(data.engagement.achievements);
        if (data.engagement.streakBonusXP != null) {
          setBonusConfig({
            streakBonusXP: data.engagement.streakBonusXP,
            dailyPromptBonusXP: data.engagement.dailyPromptBonusXP,
            firstOfTypeBonusXP: data.engagement.firstOfTypeBonusXP,
          });
        }
        setLastUpdated(data.engagement.updatedAt || null);
        if (data.engagement.displaySettings) {
          setDisplaySettings({ ...DEFAULT_DISPLAY_SETTINGS, ...data.engagement.displaySettings });
        }
      } else {
        setHasConfig(false);
      }

      // Load daily prompts
      if (data.hasDailyPrompts && data.dailyPrompts) {
        setHasDailyPrompts(true);
        if (data.dailyPrompts.prompts) {
          const loaded: JourneyPrompt[] = [];
          for (let d = 1; d <= 30; d++) {
            const p = data.dailyPrompts.prompts[String(d)];
            if (p) {
              loaded.push({ day: d, text: p.text, category: p.category, suggestedType: p.suggestedType, xpBonus: p.xpBonus });
            } else {
              const fallback = DEFAULT_JOURNEY_PROMPTS.find(jp => jp.day === d);
              if (fallback) loaded.push({ ...fallback });
            }
          }
          setJourneyPrompts(loaded);
        }
        if (data.dailyPrompts.rotatingPrompts) {
          setRotatingPrompts(data.dailyPrompts.rotatingPrompts.map((p: any) => ({
            id: p.id,
            text: p.text,
            category: p.category,
            suggestedType: p.suggestedType,
            xpBonus: p.xpBonus,
          })));
        }
      } else {
        setHasDailyPrompts(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load engagement config');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      fetchConfig();
    }
  }, [isAuthenticated, authLoading, fetchConfig]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // Validate
      for (let i = 1; i < levelThresholds.length; i++) {
        if (levelThresholds[i] <= levelThresholds[i - 1]) {
          setError(`Level thresholds must be ascending: Level ${i + 1} (${levelThresholds[i]}) must be greater than Level ${i} (${levelThresholds[i - 1]})`);
          setSaving(false);
          return;
        }
      }

      const invalidXP = Object.entries(xpValues).find(([, val]) => val <= 0);
      if (invalidXP) {
        setError(`XP value for "${XP_ACTION_LABELS[invalidXP[0]] || invalidXP[0]}" must be positive`);
        setSaving(false);
        return;
      }

      // Build daily prompts payload
      const promptsMap: Record<string, any> = {};
      journeyPrompts.forEach((p) => {
        promptsMap[String(p.day)] = { text: p.text, category: p.category, suggestedType: p.suggestedType, xpBonus: p.xpBonus };
      });

      await apiPut('/api/admin/engagement', {
        engagement: {
          xpValues,
          levelThresholds,
          levelTitles,
          achievements,
          ...bonusConfig,
          displaySettings,
        },
        dailyPrompts: {
          prompts: promptsMap,
          rotatingPrompts: rotatingPrompts.map((p) => ({
            id: p.id,
            text: p.text,
            category: p.category,
            suggestedType: p.suggestedType,
            xpBonus: p.xpBonus,
          })),
        },
      });

      setSuccess('Engagement config saved successfully! Changes will take effect within 5 minutes.');
      setHasConfig(true);
      setHasDailyPrompts(true);
      setLastUpdated(new Date().toISOString());

      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = () => {
    if (!confirm('Reset all values to hardcoded defaults? This will discard any unsaved changes.')) return;
    setXpValues({ ...DEFAULT_XP_VALUES });
    setLevelThresholds([...DEFAULT_LEVEL_THRESHOLDS]);
    setLevelTitles([...DEFAULT_LEVEL_TITLES]);
    setBonusConfig({ streakBonusXP: 25, dailyPromptBonusXP: 20, firstOfTypeBonusXP: 30 });
    setJourneyPrompts([...DEFAULT_JOURNEY_PROMPTS]);
    setRotatingPrompts([...DEFAULT_ROTATING_PROMPTS]);
    setDisplaySettings({ ...DEFAULT_DISPLAY_SETTINGS });
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
      </div>
    );
  }

  const TABS = [
    { id: 'xp' as const, label: 'XP Values', icon: '⚡' },
    { id: 'levels' as const, label: 'Levels & Titles', icon: '📊' },
    { id: 'achievements' as const, label: 'Achievements', icon: '🏅' },
    { id: 'prompts' as const, label: 'Daily Prompts', icon: '💬' },
    { id: 'display' as const, label: 'Display Settings', icon: '🎨' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Engagement Config
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Configure XP values, level thresholds, and achievements. Changes apply to mobile app within 5 minutes.
          </p>
          {lastUpdated && (
            <p className="mt-1 text-xs text-gray-400">
              Last updated: {new Date(lastUpdated).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleResetToDefaults}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600"
          >
            Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Config'}
          </button>
        </div>
      </div>

      {/* Status banners */}
      {!hasConfig && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200">
          No config found in Firestore. The mobile app is using hardcoded defaults. Click &quot;Save Config&quot; to create the Firestore config.
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200">
          {success}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'xp' && (
        <div className="space-y-6">
          {/* XP per Action */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">XP per Action</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(xpValues).map(([key, value]) => (
                <div key={key} className="flex items-center gap-3">
                  <label className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                    {XP_ACTION_LABELS[key] || key}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={value}
                    onChange={(e) => setXpValues({ ...xpValues, [key]: parseInt(e.target.value) || 1 })}
                    className="w-20 px-3 py-1.5 text-sm border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-white"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Bonus Config */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Bonus XP</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <label className="flex-1 text-sm text-gray-700 dark:text-gray-300">Streak Day Bonus</label>
                <input
                  type="number"
                  min="0"
                  value={bonusConfig.streakBonusXP}
                  onChange={(e) => setBonusConfig({ ...bonusConfig, streakBonusXP: parseInt(e.target.value) || 0 })}
                  className="w-20 px-3 py-1.5 text-sm border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex-1 text-sm text-gray-700 dark:text-gray-300">Daily Prompt Bonus</label>
                <input
                  type="number"
                  min="0"
                  value={bonusConfig.dailyPromptBonusXP}
                  onChange={(e) => setBonusConfig({ ...bonusConfig, dailyPromptBonusXP: parseInt(e.target.value) || 0 })}
                  className="w-20 px-3 py-1.5 text-sm border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex-1 text-sm text-gray-700 dark:text-gray-300">First of Type Bonus</label>
                <input
                  type="number"
                  min="0"
                  value={bonusConfig.firstOfTypeBonusXP}
                  onChange={(e) => setBonusConfig({ ...bonusConfig, firstOfTypeBonusXP: parseInt(e.target.value) || 0 })}
                  className="w-20 px-3 py-1.5 text-sm border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'levels' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Level Thresholds & Titles</h2>
          <div className="space-y-3">
            {levelThresholds.map((threshold, index) => (
              <div key={index} className="flex items-center gap-4">
                <span className="w-20 text-sm font-medium text-gray-500 dark:text-gray-400">
                  Level {index + 1}
                </span>
                <input
                  type="number"
                  min="0"
                  value={threshold}
                  onChange={(e) => {
                    const newThresholds = [...levelThresholds];
                    newThresholds[index] = parseInt(e.target.value) || 0;
                    setLevelThresholds(newThresholds);
                  }}
                  className="w-28 px-3 py-1.5 text-sm border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-white"
                />
                <span className="text-xs text-gray-400">XP</span>
                <input
                  type="text"
                  value={levelTitles[index] || ''}
                  onChange={(e) => {
                    const newTitles = [...levelTitles];
                    newTitles[index] = e.target.value;
                    setLevelTitles(newTitles);
                  }}
                  className="flex-1 px-3 py-1.5 text-sm border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-white"
                  placeholder="Level title"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'achievements' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Achievements ({achievements.length})
          </h2>
          {achievements.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No achievements in Firestore config. The mobile app is using hardcoded defaults (~30 achievements).
              Save the config to populate from defaults.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Icon</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500">ID</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Category</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Tier</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Condition</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-500">XP</th>
                  </tr>
                </thead>
                <tbody>
                  {achievements.map((achievement: any) => (
                    <tr
                      key={achievement.id}
                      className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                    >
                      <td className="py-2 px-3 text-xl">{achievement.icon}</td>
                      <td className="py-2 px-3 font-mono text-xs text-gray-700 dark:text-gray-300">
                        {achievement.id}
                      </td>
                      <td className="py-2 px-3">
                        <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${CATEGORY_COLORS[achievement.category] || 'bg-gray-100 text-gray-800'}`}>
                          {achievement.category}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${TIER_COLORS[achievement.tier] || 'bg-gray-100'}`}>
                          {achievement.tier}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-xs text-gray-500 dark:text-gray-400">
                        {achievement.condition?.type === 'count'
                          ? `${achievement.condition.dataType} >= ${achievement.condition.threshold}`
                          : achievement.condition?.type === 'streak'
                          ? `${achievement.condition.days} days`
                          : achievement.condition?.type === 'level'
                          ? `Level ${achievement.condition.level}`
                          : achievement.condition?.type === 'variety'
                          ? `${achievement.condition.uniqueTypes} types`
                          : achievement.condition?.type || 'custom'}
                      </td>
                      <td className="py-2 px-3 text-right font-medium text-gray-700 dark:text-gray-300">
                        {achievement.xpReward}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'prompts' && (
        <div className="space-y-6">
          {/* Info banner */}
          {!hasDailyPrompts && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200">
              Using hardcoded defaults. Save to push to Firestore.
            </div>
          )}

          {/* Actions bar */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {journeyPrompts.length} journey + {rotatingPrompts.length} rotating prompts
            </p>
            <button
              onClick={() => {
                if (!confirm('Load default prompts? This will overwrite your current prompts (unsaved).')) return;
                setJourneyPrompts([...DEFAULT_JOURNEY_PROMPTS]);
                setRotatingPrompts([...DEFAULT_ROTATING_PROMPTS]);
              }}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600"
            >
              Load Defaults
            </button>
          </div>

          {/* Journey Prompts */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Journey Prompts (Days 1-30)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 px-2 font-medium text-gray-500 w-14">Day</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-500">Text</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-500 w-40">Category</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-500 w-32">Type</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-500 w-20">XP</th>
                  </tr>
                </thead>
                <tbody>
                  {journeyPrompts.map((prompt, index) => {
                    const weekNum = Math.ceil(prompt.day / 7);
                    const isWeekStart = prompt.day % 7 === 1 || prompt.day === 1;
                    return (
                      <Fragment key={prompt.day}>
                        {isWeekStart && (
                          <tr>
                            <td colSpan={5} className="pt-4 pb-1 px-2">
                              <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                                Week {weekNum}
                              </span>
                            </td>
                          </tr>
                        )}
                        <tr className="border-b border-gray-100 dark:border-gray-700/50">
                          <td className="py-2 px-2 text-center font-mono text-xs text-gray-500">{prompt.day}</td>
                          <td className="py-2 px-2">
                            <textarea
                              value={prompt.text}
                              onChange={(e) => {
                                const updated = [...journeyPrompts];
                                updated[index] = { ...updated[index], text: e.target.value };
                                setJourneyPrompts(updated);
                              }}
                              rows={2}
                              className="w-full px-2 py-1 text-sm border rounded bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-white resize-none"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <select
                              value={prompt.category}
                              onChange={(e) => {
                                const updated = [...journeyPrompts];
                                updated[index] = { ...updated[index], category: e.target.value as any };
                                setJourneyPrompts(updated);
                              }}
                              className="w-full px-2 py-1 text-sm border rounded bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-white"
                            >
                              {CATEGORIES.map((c) => (
                                <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 px-2">
                            <select
                              value={prompt.suggestedType}
                              onChange={(e) => {
                                const updated = [...journeyPrompts];
                                updated[index] = { ...updated[index], suggestedType: e.target.value as any };
                                setJourneyPrompts(updated);
                              }}
                              className="w-full px-2 py-1 text-sm border rounded bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-white"
                            >
                              {SUGGESTED_TYPES.map((t) => (
                                <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              min="1"
                              value={prompt.xpBonus}
                              onChange={(e) => {
                                const updated = [...journeyPrompts];
                                updated[index] = { ...updated[index], xpBonus: parseInt(e.target.value) || 1 };
                                setJourneyPrompts(updated);
                              }}
                              className="w-full px-2 py-1 text-sm border rounded bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-white text-right"
                            />
                          </td>
                        </tr>
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Rotating Prompts */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Rotating Prompts ({rotatingPrompts.length})
              </h2>
              <button
                onClick={() => {
                  const nextId = `rotating_${rotatingPrompts.length + 1}`;
                  setRotatingPrompts([...rotatingPrompts, {
                    id: nextId,
                    text: '',
                    category: 'reflection',
                    suggestedType: 'diary',
                    xpBonus: displaySettings.defaultPromptXPBonus,
                  }]);
                }}
                className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                + Add Prompt
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 px-2 font-medium text-gray-500 w-24">ID</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-500">Text</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-500 w-40">Category</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-500 w-32">Type</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-500 w-20">XP</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-500 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {rotatingPrompts.map((prompt, index) => (
                    <tr key={prompt.id} className="border-b border-gray-100 dark:border-gray-700/50">
                      <td className="py-2 px-2 font-mono text-xs text-gray-400">{prompt.id}</td>
                      <td className="py-2 px-2">
                        <textarea
                          value={prompt.text}
                          onChange={(e) => {
                            const updated = [...rotatingPrompts];
                            updated[index] = { ...updated[index], text: e.target.value };
                            setRotatingPrompts(updated);
                          }}
                          rows={2}
                          className="w-full px-2 py-1 text-sm border rounded bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-white resize-none"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <select
                          value={prompt.category}
                          onChange={(e) => {
                            const updated = [...rotatingPrompts];
                            updated[index] = { ...updated[index], category: e.target.value as any };
                            setRotatingPrompts(updated);
                          }}
                          className="w-full px-2 py-1 text-sm border rounded bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-white"
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-2">
                        <select
                          value={prompt.suggestedType}
                          onChange={(e) => {
                            const updated = [...rotatingPrompts];
                            updated[index] = { ...updated[index], suggestedType: e.target.value as any };
                            setRotatingPrompts(updated);
                          }}
                          className="w-full px-2 py-1 text-sm border rounded bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-white"
                        >
                          {SUGGESTED_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          min="1"
                          value={prompt.xpBonus}
                          onChange={(e) => {
                            const updated = [...rotatingPrompts];
                            updated[index] = { ...updated[index], xpBonus: parseInt(e.target.value) || 1 };
                            setRotatingPrompts(updated);
                          }}
                          className="w-full px-2 py-1 text-sm border rounded bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-white text-right"
                        />
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          onClick={() => {
                            if (!confirm(`Delete rotating prompt "${prompt.id}"?`)) return;
                            setRotatingPrompts(rotatingPrompts.filter((_, i) => i !== index));
                          }}
                          className="text-red-500 hover:text-red-700 text-lg"
                          title="Delete prompt"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'display' && (
        <div className="space-y-6">
          {/* Feature Toggles */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Feature Toggles</h2>
            <div className="space-y-4">
              {[
                { key: 'dailyPromptsEnabled' as const, label: 'Daily Prompts Enabled', desc: 'Show daily prompt card on home feed' },
                { key: 'dailyPromptsAvailableToFreeTier' as const, label: 'Available to Free Tier', desc: 'Whether free-tier users see daily prompts' },
                { key: 'showProgressPill' as const, label: 'Show Progress Pill', desc: 'Show level/streak pill in header bar' },
                { key: 'showLevelBadgeOnProfileTab' as const, label: 'Show Level Badge on Profile Tab', desc: 'Show progress ring + level on profile tab icon' },
                { key: 'showFriendLevelBadges' as const, label: 'Show Friend Level Badges', desc: 'Show level badges on friend story bubbles' },
              ].map((setting) => (
                <div key={setting.key} className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{setting.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{setting.desc}</p>
                  </div>
                  <button
                    onClick={() => setDisplaySettings({ ...displaySettings, [setting.key]: !displaySettings[setting.key] })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      displaySettings[setting.key] ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        displaySettings[setting.key] ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Prompt Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Prompt Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700/50">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Journey Length (days)</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Days in the kickstart journey before rotating</p>
                </div>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={displaySettings.journeyLength}
                  onChange={(e) => setDisplaySettings({ ...displaySettings, journeyLength: parseInt(e.target.value) || 30 })}
                  className="w-20 px-3 py-1.5 text-sm border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-white text-right"
                />
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Default Prompt XP Bonus</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Default XP reward for new prompts</p>
                </div>
                <input
                  type="number"
                  min="1"
                  value={displaySettings.defaultPromptXPBonus}
                  onChange={(e) => setDisplaySettings({ ...displaySettings, defaultPromptXPBonus: parseInt(e.target.value) || 10 })}
                  className="w-20 px-3 py-1.5 text-sm border rounded-lg bg-white dark:bg-gray-900 dark:border-gray-600 dark:text-white text-right"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
