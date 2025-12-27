'use client';

import { useState, useEffect } from 'react';
import { useAppSelector } from '@/lib/store/hooks';
import { QuietHours, QuietHoursSchedule } from '@/lib/models/User';

const DEFAULT_QUIET_HOURS: QuietHours = {
  enabled: false,
  schedule: [],
};

const QUICK_START_PRESETS: Omit<QuietHoursSchedule, 'id'>[] = [
  {
    name: 'Sleep',
    startTime: '22:00',
    endTime: '08:00',
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // All days
    allowUrgent: true,
  },
  {
    name: 'Work Hours',
    startTime: '09:00',
    endTime: '17:00',
    daysOfWeek: [1, 2, 3, 4, 5], // Weekdays
    allowUrgent: false,
  },
  {
    name: 'Focus Time',
    startTime: '14:00',
    endTime: '16:00',
    daysOfWeek: [1, 2, 3, 4, 5], // Weekdays
    allowUrgent: true,
  },
];

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FULL_DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export default function QuietHoursPage() {
  const { user } = useAppSelector((state) => state.auth);
  const [quietHours, setQuietHours] = useState<QuietHours>(DEFAULT_QUIET_HOURS);
  const [originalQuietHours, setOriginalQuietHours] = useState<QuietHours>(DEFAULT_QUIET_HOURS);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<QuietHoursSchedule | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Editor form state
  const [scheduleName, setScheduleName] = useState('');
  const [startTime, setStartTime] = useState('22:00');
  const [endTime, setEndTime] = useState('08:00');
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [allowUrgent, setAllowUrgent] = useState(true);

  useEffect(() => {
    if (user) {
      loadQuietHours();
    }
  }, [user]);

  const loadQuietHours = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/users/${user?.uid}`);
      if (!response.ok) throw new Error('Failed to fetch user data');

      const userData = await response.json();
      const userQuietHours = userData.quietHours || DEFAULT_QUIET_HOURS;

      setQuietHours(userQuietHours);
      setOriginalQuietHours(userQuietHours);
    } catch (error) {
      console.error('Error loading quiet hours:', error);
      setSaveMessage({ type: 'error', text: 'Failed to load quiet hours' });
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
          quietHours: quietHours,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save quiet hours');
      }

      setOriginalQuietHours(quietHours);
      setSaveMessage({ type: 'success', text: 'Quiet hours saved successfully!' });

      // Clear success message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Error saving quiet hours:', error);
      setSaveMessage({ type: 'error', text: 'Failed to save quiet hours. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setQuietHours(originalQuietHours);
    setSaveMessage(null);
  };

  const openEditor = (schedule?: QuietHoursSchedule) => {
    if (schedule) {
      setEditingSchedule(schedule);
      setScheduleName(schedule.name);
      setStartTime(schedule.startTime);
      setEndTime(schedule.endTime);
      setSelectedDays(schedule.daysOfWeek);
      setAllowUrgent(schedule.allowUrgent);
    } else {
      setEditingSchedule(null);
      setScheduleName('');
      setStartTime('22:00');
      setEndTime('08:00');
      setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
      setAllowUrgent(true);
    }
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setEditingSchedule(null);
  };

  const handleSaveSchedule = () => {
    if (!scheduleName.trim()) {
      setSaveMessage({ type: 'error', text: 'Please enter a schedule name' });
      return;
    }

    if (selectedDays.length === 0) {
      setSaveMessage({ type: 'error', text: 'Please select at least one day' });
      return;
    }

    const newSchedule: QuietHoursSchedule = {
      id: editingSchedule?.id || `schedule_${Date.now()}`,
      name: scheduleName.trim(),
      startTime,
      endTime,
      daysOfWeek: selectedDays.sort((a, b) => a - b),
      allowUrgent,
      timezone: user?.timezone,
    };

    if (editingSchedule) {
      // Update existing schedule
      setQuietHours({
        ...quietHours,
        schedule: quietHours.schedule.map((s) =>
          s.id === editingSchedule.id ? newSchedule : s
        ),
      });
    } else {
      // Add new schedule
      setQuietHours({
        ...quietHours,
        schedule: [...quietHours.schedule, newSchedule],
      });
    }

    closeEditor();
    setSaveMessage(null);
  };

  const handleDeleteSchedule = (scheduleId: string) => {
    if (confirm('Are you sure you want to delete this schedule?')) {
      setQuietHours({
        ...quietHours,
        schedule: quietHours.schedule.filter((s) => s.id !== scheduleId),
      });
      setSaveMessage(null);
    }
  };

  const handleAddPreset = (preset: Omit<QuietHoursSchedule, 'id'>) => {
    const newSchedule: QuietHoursSchedule = {
      ...preset,
      id: `schedule_${Date.now()}`,
      timezone: user?.timezone,
    };

    setQuietHours({
      ...quietHours,
      schedule: [...quietHours.schedule, newSchedule],
    });

    setShowPresets(false);
    setSaveMessage(null);
  };

  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day].sort((a, b) => a - b));
    }
  };

  const formatTimeRange = (start: string, end: string) => {
    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${displayHour}:${minutes} ${ampm}`;
    };

    return `${formatTime(start)} - ${formatTime(end)}`;
  };

  const formatDays = (days: number[]) => {
    if (days.length === 7) return 'Every day';
    if (days.length === 5 && days.every((d) => d >= 1 && d <= 5)) return 'Weekdays';
    if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends';
    return days.map((d) => DAYS_OF_WEEK[d]).join(', ');
  };

  const hasChanges = JSON.stringify(quietHours) !== JSON.stringify(originalQuietHours);

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
          Quiet Hours
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Set custom Do Not Disturb schedules to suppress notifications
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
              Enable Quiet Hours
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Master toggle for Do Not Disturb mode
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={quietHours.enabled}
              onChange={(e) =>
                setQuietHours({ ...quietHours, enabled: e.target.checked })
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {/* Quick Start Presets */}
      {quietHours.schedule.length === 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
            🚀 Quick Start
          </h3>
          <p className="text-blue-800 dark:text-blue-200 text-sm mb-4">
            Get started quickly with these preset schedules:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {QUICK_START_PRESETS.map((preset, index) => (
              <button
                key={index}
                onClick={() => handleAddPreset(preset)}
                className="p-4 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded-lg hover:border-blue-400 dark:hover:border-blue-500 transition-colors text-left"
              >
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                  {preset.name}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {formatTimeRange(preset.startTime, preset.endTime)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {formatDays(preset.daysOfWeek)}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Schedules List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Schedules
          </h2>
          <button
            onClick={() => openEditor()}
            disabled={!quietHours.enabled}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            + Add Schedule
          </button>
        </div>

        {quietHours.schedule.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🌙</div>
            <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">
              No schedules yet
            </p>
            <p className="text-gray-500 dark:text-gray-500 text-sm">
              Create a schedule to start using Quiet Hours
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {quietHours.schedule.map((schedule) => (
              <div
                key={schedule.id}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {schedule.name}
                      </h3>
                      {schedule.allowUrgent && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 rounded">
                          Allow Urgent
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                      ⏰ {formatTimeRange(schedule.startTime, schedule.endTime)}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      📅 {formatDays(schedule.daysOfWeek)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditor(schedule)}
                      disabled={!quietHours.enabled}
                      className="px-3 py-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteSchedule(schedule.id)}
                      disabled={!quietHours.enabled}
                      className="px-3 py-1 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100 mb-2">
          ℹ️ How Quiet Hours Work
        </h3>
        <ul className="text-amber-800 dark:text-amber-200 text-sm space-y-1 list-disc list-inside">
          <li>Notifications will be automatically suppressed during quiet hours</li>
          <li>Overnight schedules work correctly (e.g., 10 PM to 8 AM)</li>
          <li>"Allow Urgent" permits escalated reminders during quiet hours</li>
          <li>Multiple schedules can be active simultaneously</li>
          <li>Timezone is based on your account settings</li>
        </ul>
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

      {/* Schedule Editor Modal */}
      {isEditorOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {editingSchedule ? 'Edit Schedule' : 'New Schedule'}
                </h2>
                <button
                  onClick={closeEditor}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Schedule Name */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Schedule Name
                </label>
                <input
                  type="text"
                  value={scheduleName}
                  onChange={(e) => setScheduleName(e.target.value)}
                  placeholder="e.g., Sleep, Work, Focus Time"
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Time Range */}
              <div className="mb-6 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              {/* Days of Week */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Days of Week
                </label>
                <div className="flex flex-wrap gap-2">
                  {FULL_DAYS_OF_WEEK.map((day, index) => (
                    <button
                      key={index}
                      onClick={() => toggleDay(index)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        selectedDays.includes(index)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              {/* Allow Urgent */}
              <div className="mb-6">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowUrgent}
                    onChange={(e) => setAllowUrgent(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Allow urgent/escalated notifications during this schedule
                  </span>
                </label>
              </div>

              {/* Editor Actions */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={closeEditor}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSchedule}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  {editingSchedule ? 'Update Schedule' : 'Add Schedule'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
