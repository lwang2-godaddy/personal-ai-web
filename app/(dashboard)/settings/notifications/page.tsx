'use client';

import { useState, useEffect } from 'react';
import { useAppSelector } from '@/lib/store/hooks';
import { getAdminFirestore } from '@/lib/api/firebase/admin';
import { User, NotificationPreferences } from '@/lib/models/User';

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  dailySummary: {
    enabled: true,
    time: '20:00',
  },
  weeklyInsights: {
    enabled: true,
    dayOfWeek: 1, // Monday
    time: '09:00',
  },
  funFacts: {
    enabled: true,
    time: '09:00',
    maxPerDay: 1,
  },
  achievements: true,
  eventReminders: true,
  escalations: true,
  locationAlerts: false, // Mobile only, disabled by default
};

const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export default function NotificationPreferencesPage() {
  const { user } = useAppSelector((state) => state.auth);
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [originalPreferences, setOriginalPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
      const userPrefs = userData.notificationPreferences || DEFAULT_PREFERENCES;

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
          notificationPreferences: preferences,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save preferences');
      }

      setOriginalPreferences(preferences);
      setSaveMessage({ type: 'success', text: 'Preferences saved successfully!' });

      // Clear success message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Error saving preferences:', error);
      setSaveMessage({ type: 'error', text: 'Failed to save preferences. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setPreferences(originalPreferences);
    setSaveMessage(null);
  };

  const hasChanges = JSON.stringify(preferences) !== JSON.stringify(originalPreferences);

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
          Notification Preferences
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Customize when and how you receive notifications
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
              Enable Notifications
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Master toggle for all push notifications
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.enabled}
              onChange={(e) =>
                setPreferences({ ...preferences, enabled: e.target.checked })
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {/* Scheduled Notifications */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Scheduled Notifications
        </h2>

        {/* Daily Summary */}
        <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                Daily Summary
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Receive a daily recap of your activity and data
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer ml-4">
              <input
                type="checkbox"
                checked={preferences.dailySummary.enabled}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    dailySummary: {
                      ...preferences.dailySummary,
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
          {preferences.dailySummary.enabled && (
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Delivery Time
              </label>
              <input
                type="time"
                value={preferences.dailySummary.time}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    dailySummary: {
                      ...preferences.dailySummary,
                      time: e.target.value,
                    },
                  })
                }
                disabled={!preferences.enabled}
                className="block w-full md:w-48 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
              />
            </div>
          )}
        </div>

        {/* Weekly Insights */}
        <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                Weekly Insights
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Get weekly analytics and patterns from your data
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer ml-4">
              <input
                type="checkbox"
                checked={preferences.weeklyInsights.enabled}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    weeklyInsights: {
                      ...preferences.weeklyInsights,
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
          {preferences.weeklyInsights.enabled && (
            <div className="mt-3 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Day of Week
                </label>
                <select
                  value={preferences.weeklyInsights.dayOfWeek}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      weeklyInsights: {
                        ...preferences.weeklyInsights,
                        dayOfWeek: parseInt(e.target.value),
                      },
                    })
                  }
                  disabled={!preferences.enabled}
                  className="block w-full md:w-48 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                >
                  {DAYS_OF_WEEK.map((day, index) => (
                    <option key={index} value={index}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Delivery Time
                </label>
                <input
                  type="time"
                  value={preferences.weeklyInsights.time}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      weeklyInsights: {
                        ...preferences.weeklyInsights,
                        time: e.target.value,
                      },
                    })
                  }
                  disabled={!preferences.enabled}
                  className="block w-full md:w-48 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                />
              </div>
            </div>
          )}
        </div>

        {/* Fun Facts */}
        <div>
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                Fun Facts
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Receive interesting insights about your personal data
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer ml-4">
              <input
                type="checkbox"
                checked={preferences.funFacts.enabled}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    funFacts: {
                      ...preferences.funFacts,
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
          {preferences.funFacts.enabled && (
            <div className="mt-3 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Delivery Time
                </label>
                <input
                  type="time"
                  value={preferences.funFacts.time}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      funFacts: {
                        ...preferences.funFacts,
                        time: e.target.value,
                      },
                    })
                  }
                  disabled={!preferences.enabled}
                  className="block w-full md:w-48 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Frequency (per day)
                </label>
                <select
                  value={preferences.funFacts.maxPerDay}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      funFacts: {
                        ...preferences.funFacts,
                        maxPerDay: parseInt(e.target.value),
                      },
                    })
                  }
                  disabled={!preferences.enabled}
                  className="block w-full md:w-48 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                >
                  <option value={1}>1 per day</option>
                  <option value={2}>2 per day</option>
                  <option value={3}>3 per day</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Instant Notifications */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Instant Notifications
        </h2>
        <div className="space-y-4">
          {/* Event Reminders */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-medium text-gray-900 dark:text-white">
                Event Reminders
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Notifications for scheduled events and tasks
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.eventReminders}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    eventReminders: e.target.checked,
                  })
                }
                disabled={!preferences.enabled}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
            </label>
          </div>

          {/* Achievements */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-medium text-gray-900 dark:text-white">
                Achievements
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Celebrate milestones and goals you've reached
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.achievements}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    achievements: e.target.checked,
                  })
                }
                disabled={!preferences.enabled}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
            </label>
          </div>

          {/* Escalations */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-medium text-gray-900 dark:text-white">
                Urgent Reminders
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                High-priority escalated reminder notifications
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.escalations}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    escalations: e.target.checked,
                  })
                }
                disabled={!preferences.enabled}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
            </label>
          </div>

          {/* Location Alerts */}
          <div className="flex items-center justify-between opacity-50">
            <div>
              <h3 className="text-base font-medium text-gray-900 dark:text-white">
                Location Alerts
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Mobile only - activity tagging prompts
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-not-allowed">
              <input
                type="checkbox"
                checked={preferences.locationAlerts}
                disabled
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer dark:bg-gray-700 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
          💡 About Quiet Hours
        </h3>
        <p className="text-blue-800 dark:text-blue-200 text-sm mb-2">
          Want to set specific times when you don't want to be disturbed?
        </p>
        <p className="text-blue-700 dark:text-blue-300 text-sm">
          Visit the <a href="/settings/quiet-hours" className="underline font-medium hover:text-blue-600 dark:hover:text-blue-200">Quiet Hours</a> settings to create custom Do Not Disturb schedules. Notifications will be automatically suppressed during your quiet hours.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
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
  );
}
