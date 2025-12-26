'use client';

import { useState, useEffect } from 'react';
import { EventReminder, EventType, Event } from '@/lib/models/Event';
import ReminderService from '@/lib/services/reminders/ReminderService';

interface ReminderManagerProps {
  event?: Event | null;
  eventType: EventType;
  eventDatetime: Date;
  reminders: EventReminder[];
  onChange: (reminders: EventReminder[]) => void;
  disabled?: boolean;
}

export default function ReminderManager({
  event,
  eventType,
  eventDatetime,
  reminders,
  onChange,
  disabled = false,
}: ReminderManagerProps) {
  const [localReminders, setLocalReminders] = useState<EventReminder[]>(reminders);
  const [showCustom, setShowCustom] = useState(false);
  const [customTiming, setCustomTiming] = useState<number>(60);
  const [useSmartReminders, setUseSmartReminders] = useState(true);

  useEffect(() => {
    setLocalReminders(reminders);
  }, [reminders]);

  useEffect(() => {
    // Auto-generate smart reminders if enabled and no reminders exist
    if (useSmartReminders && localReminders.length === 0) {
      const smartReminders = ReminderService.generateSmartReminders(eventType);
      setLocalReminders(smartReminders);
      onChange(smartReminders);
    }
  }, [useSmartReminders, eventType]);

  const handleToggleSmartReminders = () => {
    if (!disabled) {
      if (!useSmartReminders) {
        // Enable smart reminders
        const smartReminders = ReminderService.generateSmartReminders(eventType);
        setLocalReminders(smartReminders);
        onChange(smartReminders);
        setUseSmartReminders(true);
      } else {
        // Disable smart reminders
        setLocalReminders([]);
        onChange([]);
        setUseSmartReminders(false);
      }
    }
  };

  const handleAddCustomReminder = () => {
    if (disabled) return;

    // Validate timing
    if (!ReminderService.validateReminderTiming(customTiming, eventDatetime)) {
      alert('Invalid reminder timing. Please choose a time in the future.');
      return;
    }

    const newReminder = ReminderService.createCustomReminder(customTiming);
    const updated = [...localReminders, newReminder];
    setLocalReminders(updated);
    onChange(updated);
    setShowCustom(false);
    setCustomTiming(60);
  };

  const handleRemoveReminder = (reminderId: string) => {
    if (disabled) return;

    const updated = localReminders.filter((r) => r.id !== reminderId);
    setLocalReminders(updated);
    onChange(updated);

    // If no reminders left and smart reminders was on, turn it off
    if (updated.length === 0 && useSmartReminders) {
      setUseSmartReminders(false);
    }
  };

  const handlePresetSelect = (value: number) => {
    setCustomTiming(value);
  };

  const sortedReminders = ReminderService.sortReminders(localReminders);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">Reminders</label>
        <button
          type="button"
          onClick={handleToggleSmartReminders}
          disabled={disabled}
          className={`text-sm px-3 py-1 rounded-md transition-colors ${
            useSmartReminders
              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {useSmartReminders ? '✓ Smart Reminders' : 'Enable Smart Reminders'}
        </button>
      </div>

      {/* Reminders List */}
      {sortedReminders.length > 0 ? (
        <div className="space-y-2">
          {sortedReminders.map((reminder) => (
            <div
              key={reminder.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {reminder.type === 'smart' ? '🤖' : '⏰'}
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {ReminderService.formatReminderTiming(reminder.timing)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {reminder.type === 'smart' ? 'Smart reminder' : 'Custom reminder'}
                    {reminder.status !== 'pending' && (
                      <span className={`ml-2 ${ReminderService.getStatusColor(reminder.status)}`}>
                        • {ReminderService.getStatusLabel(reminder.status)}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveReminder(reminder.id)}
                disabled={disabled}
                className="text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500 text-sm">No reminders set</p>
          <button
            type="button"
            onClick={handleToggleSmartReminders}
            disabled={disabled}
            className="mt-2 text-blue-600 hover:text-blue-700 text-sm underline disabled:opacity-50"
          >
            Add smart reminders
          </button>
        </div>
      )}

      {/* Add Custom Reminder */}
      <div className="pt-2">
        {!showCustom ? (
          <button
            type="button"
            onClick={() => setShowCustom(true)}
            disabled={disabled}
            className="text-sm text-blue-600 hover:text-blue-700 underline disabled:opacity-50"
          >
            + Add custom reminder
          </button>
        ) : (
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-900">Add Custom Reminder</h4>
              <button
                type="button"
                onClick={() => setShowCustom(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Preset Options */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-700">
                Quick Select
              </label>
              <div className="flex flex-wrap gap-2">
                {ReminderService.getPresetOptions().map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handlePresetSelect(option.value)}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      customTiming === option.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Input */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-700">
                Or enter minutes before event
              </label>
              <input
                type="number"
                min="1"
                max="40320"
                value={customTiming}
                onChange={(e) => setCustomTiming(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Minutes before event"
              />
              <p className="text-xs text-gray-500">
                Will remind at:{' '}
                {ReminderService.calculateReminderTime(eventDatetime, customTiming).toLocaleString()}
              </p>
            </div>

            {/* Add Button */}
            <button
              type="button"
              onClick={handleAddCustomReminder}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Add Reminder
            </button>
          </div>
        )}
      </div>

      {/* Info Message */}
      {sortedReminders.length > 0 && (
        <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
          <svg
            className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="text-xs text-blue-800">
            <p className="font-medium">You have {sortedReminders.length} reminder{sortedReminders.length !== 1 ? 's' : ''} set</p>
            <p className="mt-1">You'll receive notifications at the specified times before the event.</p>
          </div>
        </div>
      )}
    </div>
  );
}
