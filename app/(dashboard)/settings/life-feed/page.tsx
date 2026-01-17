'use client';

import { useState, useEffect } from 'react';
import { useAppSelector } from '@/lib/store/hooks';
import { LifeFeedPreferences, DEFAULT_LIFE_FEED_PREFERENCES } from '@/lib/models/User';

const POST_TYPE_INFO: Record<string, { label: string; description: string; emoji: string }> = {
  life_summary: {
    label: 'Life Summary',
    description: 'Weekly recap of your activities and data',
    emoji: '📊',
  },
  milestone: {
    label: 'Milestones',
    description: 'Celebrate achievements (10th, 50th, 100th activity)',
    emoji: '🏆',
  },
  streak_achievement: {
    label: 'Streaks',
    description: 'Celebrate consistency (5+ workouts/week)',
    emoji: '🔥',
  },
  pattern_prediction: {
    label: 'Predictions',
    description: 'What you might do tomorrow based on patterns',
    emoji: '🔮',
  },
  reflective_insight: {
    label: 'Insights',
    description: 'Self-discovery observations about your habits',
    emoji: '💡',
  },
  memory_highlight: {
    label: 'Memory Highlights',
    description: 'Celebrate photos and voice note memories',
    emoji: '📸',
  },
  comparison: {
    label: 'Comparisons',
    description: 'Progress vs previous periods',
    emoji: '📈',
  },
  seasonal_reflection: {
    label: 'Seasonal Reflections',
    description: 'Monthly and quarterly summaries',
    emoji: '🗓️',
  },
};

const FREQUENCY_OPTIONS = [
  { value: 'low', label: 'Low', description: '1 post per generation' },
  { value: 'medium', label: 'Medium', description: '50% of max posts' },
  { value: 'high', label: 'High', description: 'Max posts allowed' },
  { value: 'smart', label: 'Smart (Recommended)', description: 'Adjusts based on your activity' },
];

const VOICE_STYLE_OPTIONS = [
  { value: 'casual', label: 'Casual', description: 'Friendly and relaxed' },
  { value: 'professional', label: 'Professional', description: 'Formal and polished' },
  { value: 'enthusiastic', label: 'Enthusiastic', description: 'Upbeat and excited' },
  { value: 'minimal', label: 'Minimal', description: 'Brief and concise' },
];

export default function LifeFeedSettingsPage() {
  const { user } = useAppSelector((state) => state.auth);
  const [preferences, setPreferences] = useState<LifeFeedPreferences>(DEFAULT_LIFE_FEED_PREFERENCES);
  const [originalPreferences, setOriginalPreferences] = useState<LifeFeedPreferences>(DEFAULT_LIFE_FEED_PREFERENCES);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (user) {
      loadPreferences();
    }
  }, [user]);

  const loadPreferences = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/users/${user?.uid}`);
      if (!response.ok) throw new Error('Failed to fetch user data');

      const userData = await response.json();
      const userPrefs = userData.lifeFeedPreferences
        ? {
            ...DEFAULT_LIFE_FEED_PREFERENCES,
            ...userData.lifeFeedPreferences,
            cooldowns: {
              ...DEFAULT_LIFE_FEED_PREFERENCES.cooldowns,
              ...(userData.lifeFeedPreferences.cooldowns || {}),
            },
            enabledTypes: {
              ...DEFAULT_LIFE_FEED_PREFERENCES.enabledTypes,
              ...(userData.lifeFeedPreferences.enabledTypes || {}),
            },
            smartFrequency: {
              ...DEFAULT_LIFE_FEED_PREFERENCES.smartFrequency,
              ...(userData.lifeFeedPreferences.smartFrequency || {}),
            },
          }
        : DEFAULT_LIFE_FEED_PREFERENCES;

      setPreferences(userPrefs);
      setOriginalPreferences(userPrefs);
    } catch (error) {
      console.error('Error loading preferences:', error);
      setSaveMessage({ type: 'error', text: 'Failed to load preferences' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setIsSaving(true);
      setSaveMessage(null);

      const response = await fetch(`/api/users/${user.uid}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lifeFeedPreferences: preferences,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save preferences');
      }

      setOriginalPreferences(preferences);
      setSaveMessage({ type: 'success', text: 'Preferences saved successfully!' });

      // Clear success message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error: any) {
      console.error('Error saving preferences:', error);
      setSaveMessage({ type: 'error', text: error.message || 'Failed to save preferences. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setPreferences(originalPreferences);
    setSaveMessage(null);
  };

  const handleReset = () => {
    setPreferences(DEFAULT_LIFE_FEED_PREFERENCES);
  };

  const hasChanges = JSON.stringify(preferences) !== JSON.stringify(originalPreferences);

  const updateCooldown = (type: keyof typeof preferences.cooldowns, value: number) => {
    setPreferences({
      ...preferences,
      cooldowns: {
        ...preferences.cooldowns,
        [type]: value,
      },
    });
  };

  const updateEnabledType = (type: keyof typeof preferences.enabledTypes, value: boolean) => {
    setPreferences({
      ...preferences,
      enabledTypes: {
        ...preferences.enabledTypes,
        [type]: value,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Life Feed Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Customize how AI-generated posts are created from your personal data
        </p>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            saveMessage.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
          }`}
        >
          {saveMessage.text}
        </div>
      )}

      {/* Master Toggle */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
              Enable Life Feed
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Generate AI-powered posts from your activities
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.enabled}
              onChange={(e) => setPreferences({ ...preferences, enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {/* Generation Frequency */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Generation Frequency
        </h2>

        {/* Frequency Mode */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Frequency Mode
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FREQUENCY_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`relative flex cursor-pointer rounded-lg border p-4 focus:outline-none ${
                  preferences.frequency === option.value
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                } ${!preferences.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input
                  type="radio"
                  name="frequency"
                  value={option.value}
                  checked={preferences.frequency === option.value}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      frequency: e.target.value as LifeFeedPreferences['frequency'],
                    })
                  }
                  disabled={!preferences.enabled}
                  className="sr-only"
                />
                <span className="flex flex-1">
                  <span className="flex flex-col">
                    <span className="block text-sm font-medium text-gray-900 dark:text-white">
                      {option.label}
                    </span>
                    <span className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-400">
                      {option.description}
                    </span>
                  </span>
                </span>
                {preferences.frequency === option.value && (
                  <span className="text-blue-600">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Max Posts Per Day */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Max Posts Per Day: <span className="font-bold text-blue-600">{preferences.maxPostsPerDay}</span>
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={preferences.maxPostsPerDay}
            onChange={(e) =>
              setPreferences({ ...preferences, maxPostsPerDay: parseInt(e.target.value) })
            }
            disabled={!preferences.enabled}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 disabled:opacity-50"
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>1 (Minimal)</span>
            <span>10 (Maximum)</span>
          </div>
        </div>
      </div>

      {/* Post Types */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Post Types
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Enable or disable specific types of posts. Adjust cooldowns to control how often each type can regenerate.
        </p>

        <div className="space-y-4">
          {(Object.keys(POST_TYPE_INFO) as Array<keyof typeof preferences.enabledTypes>).map((type) => {
            const info = POST_TYPE_INFO[type];
            const isEnabled = preferences.enabledTypes[type];
            const cooldown = preferences.cooldowns[type];

            return (
              <div
                key={type}
                className={`border rounded-lg p-4 ${
                  isEnabled
                    ? 'border-gray-200 dark:border-gray-700'
                    : 'border-gray-100 dark:border-gray-800 opacity-60'
                } ${!preferences.enabled ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{info.emoji}</span>
                    <div>
                      <h3 className="text-base font-medium text-gray-900 dark:text-white">
                        {info.label}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{info.description}</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={(e) => updateEnabledType(type, e.target.checked)}
                      disabled={!preferences.enabled}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
                  </label>
                </div>
                {isEnabled && (
                  <div className="mt-3 pl-11">
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Cooldown: <span className="font-medium text-gray-900 dark:text-white">{cooldown} day{cooldown !== 1 ? 's' : ''}</span>
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="30"
                      value={cooldown}
                      onChange={(e) => updateCooldown(type, parseInt(e.target.value))}
                      disabled={!preferences.enabled}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 disabled:opacity-50"
                    />
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span>1 day</span>
                      <span>30 days</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Content Style */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Content Style
        </h2>

        {/* Voice Style */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Writing Style
          </label>
          <select
            value={preferences.voiceStyle}
            onChange={(e) =>
              setPreferences({
                ...preferences,
                voiceStyle: e.target.value as LifeFeedPreferences['voiceStyle'],
              })
            }
            disabled={!preferences.enabled}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
          >
            {VOICE_STYLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} - {option.description}
              </option>
            ))}
          </select>
        </div>

        {/* Include Options */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-medium text-gray-900 dark:text-white">Include Emojis</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Add emojis to posts</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.includeEmojis}
                onChange={(e) => setPreferences({ ...preferences, includeEmojis: e.target.checked })}
                disabled={!preferences.enabled}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-medium text-gray-900 dark:text-white">Include Hashtags</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Add hashtags to posts</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.includeHashtags}
                onChange={(e) => setPreferences({ ...preferences, includeHashtags: e.target.checked })}
                disabled={!preferences.enabled}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-medium text-gray-900 dark:text-white">Notify on New Posts</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Get notified when new posts are generated</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.notifyOnNewPost}
                onChange={(e) => setPreferences({ ...preferences, notifyOnNewPost: e.target.checked })}
                disabled={!preferences.enabled}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Advanced Settings (Collapsible) */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full p-6 flex items-center justify-between text-left"
        >
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Advanced Settings
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Fine-tune the smart frequency algorithm
            </p>
          </div>
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showAdvanced && (
          <div className="px-6 pb-6 border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-medium text-gray-900 dark:text-white">
                    Enable Smart Frequency
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Automatically adjust post frequency based on your activity
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.smartFrequency.enabled}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        smartFrequency: {
                          ...preferences.smartFrequency,
                          enabled: e.target.checked,
                        },
                      })
                    }
                    disabled={!preferences.enabled}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
                </label>
              </div>

              {preferences.smartFrequency.enabled && (
                <div className="space-y-4 pl-4 border-l-2 border-blue-200 dark:border-blue-800">
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Data Volume Weight: <span className="font-medium">{(preferences.smartFrequency.dataVolumeWeight * 100).toFixed(0)}%</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={preferences.smartFrequency.dataVolumeWeight * 100}
                      onChange={(e) =>
                        setPreferences({
                          ...preferences,
                          smartFrequency: {
                            ...preferences.smartFrequency,
                            dataVolumeWeight: parseInt(e.target.value) / 100,
                          },
                        })
                      }
                      disabled={!preferences.enabled}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Data Freshness Weight: <span className="font-medium">{(preferences.smartFrequency.dataFreshnessWeight * 100).toFixed(0)}%</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={preferences.smartFrequency.dataFreshnessWeight * 100}
                      onChange={(e) =>
                        setPreferences({
                          ...preferences,
                          smartFrequency: {
                            ...preferences.smartFrequency,
                            dataFreshnessWeight: parseInt(e.target.value) / 100,
                          },
                        })
                      }
                      disabled={!preferences.enabled}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Activity Diversity Weight: <span className="font-medium">{(preferences.smartFrequency.activityDiversityWeight * 100).toFixed(0)}%</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={preferences.smartFrequency.activityDiversityWeight * 100}
                      onChange={(e) =>
                        setPreferences({
                          ...preferences,
                          smartFrequency: {
                            ...preferences.smartFrequency,
                            activityDiversityWeight: parseInt(e.target.value) / 100,
                          },
                        })
                      }
                      disabled={!preferences.enabled}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Significant Data Threshold: <span className="font-medium">{preferences.smartFrequency.significantDataThreshold} hours</span>
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="72"
                      value={preferences.smartFrequency.significantDataThreshold}
                      onChange={(e) =>
                        setPreferences({
                          ...preferences,
                          smartFrequency: {
                            ...preferences.smartFrequency,
                            significantDataThreshold: parseInt(e.target.value),
                          },
                        })
                      }
                      disabled={!preferences.enabled}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 disabled:opacity-50"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
          How Smart Frequency Works
        </h3>
        <ul className="text-blue-800 dark:text-blue-200 text-sm space-y-2">
          <li><strong>Data Volume (40%)</strong> - More data = higher score. Steps, workouts, locations, voice notes, and photos all contribute.</li>
          <li><strong>Data Freshness (30%)</strong> - Recent data within the threshold window boosts the score.</li>
          <li><strong>Activity Diversity (30%)</strong> - Varied activities (gym, badminton, running) increase the score.</li>
        </ul>
        <p className="text-blue-700 dark:text-blue-300 text-sm mt-3">
          High activity users (score {'>'}= 0.8) get max posts. Low activity users (score {'<'} 0.2) get no posts.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <button
          onClick={handleReset}
          disabled={isSaving}
          className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 disabled:opacity-50"
        >
          Reset to Defaults
        </button>
        <div className="flex gap-3">
          <button
            onClick={handleCancel}
            disabled={!hasChanges || isSaving}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
