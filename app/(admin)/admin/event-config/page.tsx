'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPatch } from '@/lib/api/client';
import {
  EventExtractionConfig,
  EventExtractionSettings,
  ALL_EVENT_TYPES,
  TIMEZONE_OPTIONS,
} from '@/lib/models/EventExtractionConfig';
import { useTrackPage } from '@/lib/hooks/useTrackPage';
import { TRACKED_SCREENS } from '@/lib/models/BehaviorEvent';

const MODEL_OPTIONS = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast, Cheap)' },
  { value: 'gpt-4o', label: 'GPT-4o (Best Quality)' },
];

const EVENT_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  appointment: { label: 'Appointment', icon: '📅' },
  meeting: { label: 'Meeting', icon: '🤝' },
  intention: { label: 'Intention', icon: '🎯' },
  plan: { label: 'Plan', icon: '📋' },
  reminder: { label: 'Reminder', icon: '⏰' },
  todo: { label: 'To-Do', icon: '✅' },
};

/**
 * Admin Event Extraction Config Page
 * Configure AI model settings, toast display, and event type filtering
 */
export default function AdminEventConfigPage() {
  useTrackPage(TRACKED_SCREENS.adminEventConfig);

  const [config, setConfig] = useState<EventExtractionConfig | null>(null);
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editedSettings, setEditedSettings] = useState<Partial<EventExtractionSettings>>({});
  const [changeNotes, setChangeNotes] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiGet<{ config: EventExtractionConfig; isDefault: boolean }>(
        '/api/admin/event-config'
      );
      setConfig(data.config);
      setIsDefault(data.isDefault);
      setEditedSettings(data.config.settings);
    } catch (err: unknown) {
      console.error('Failed to fetch event extraction config:', err);
      const message = err instanceof Error ? err.message : 'Failed to load event extraction config';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const initializeConfig = async () => {
    try {
      setSaving(true);
      setError(null);
      const data = await apiPost<{ config: EventExtractionConfig }>(
        '/api/admin/event-config',
        {}
      );
      setConfig(data.config);
      setEditedSettings(data.config.settings);
      setIsDefault(false);
      setSuccessMessage('Configuration initialized successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to initialize configuration';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const saveChanges = async () => {
    if (!config) return;

    try {
      setSaving(true);
      setError(null);

      const data = await apiPatch<{ config: EventExtractionConfig }>(
        '/api/admin/event-config',
        {
          settings: editedSettings,
          changeNotes: changeNotes || 'Updated event extraction settings',
        }
      );

      setConfig(data.config);
      setEditedSettings(data.config.settings);
      setIsEditing(false);
      setChangeNotes('');
      setSuccessMessage('Settings updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save changes';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const toggleDynamicConfig = async () => {
    if (!config) return;

    try {
      setSaving(true);
      setError(null);

      const data = await apiPatch<{ config: EventExtractionConfig }>(
        '/api/admin/event-config',
        {
          enableDynamicConfig: !config.enableDynamicConfig,
          changeNotes: config.enableDynamicConfig
            ? 'Disabled dynamic config (using hardcoded defaults)'
            : 'Enabled dynamic config',
        }
      );

      setConfig(data.config);
      setSuccessMessage(
        data.config.enableDynamicConfig
          ? 'Dynamic config enabled!'
          : 'Dynamic config disabled - Cloud Functions using hardcoded defaults'
      );
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to toggle dynamic config';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const cancelEditing = () => {
    if (config) {
      setEditedSettings(config.settings);
    }
    setIsEditing(false);
    setChangeNotes('');
  };

  const updateSetting = (field: keyof EventExtractionSettings, value: string | number | boolean | string[]) => {
    setEditedSettings((prev) => ({ ...prev, [field]: value }));
  };

  const toggleEventType = (eventType: string) => {
    const current = (editedSettings.enabledEventTypes as string[]) || [...ALL_EVENT_TYPES];
    const updated = current.includes(eventType)
      ? current.filter((t) => t !== eventType)
      : [...current, eventType];
    updateSetting('enabledEventTypes', updated);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading event extraction config...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Event Extraction Config</h1>
          <p className="mt-2 text-gray-600">
            Configure AI model, toast display, confidence filtering, and event types
          </p>
        </div>
        {config && !isDefault && (
          <div className="text-sm text-gray-500">
            Version {config.version} | Last updated:{' '}
            {new Date(config.lastUpdated).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-600">{successMessage}</p>
        </div>
      )}

      {/* Initialize Button (only if default) */}
      {isDefault && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">
            Configuration Not Initialized
          </h3>
          <p className="text-yellow-700 mb-4">
            The event extraction configuration has not been saved to Firestore yet. Click the
            button below to initialize with default values.
          </p>
          <button
            onClick={initializeConfig}
            disabled={saving}
            className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
          >
            {saving ? 'Initializing...' : 'Initialize Configuration'}
          </button>
        </div>
      )}

      {/* Dynamic Config Toggle */}
      {config && !isDefault && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Dynamic Configuration</h3>
              <p className="text-sm text-gray-600 mt-1">
                {config.enableDynamicConfig
                  ? 'Cloud Functions and mobile app are using settings configured here'
                  : 'Cloud Functions and mobile app are using hardcoded defaults (kill switch active)'}
              </p>
            </div>
            <button
              onClick={toggleDynamicConfig}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config.enableDynamicConfig ? 'bg-green-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.enableDynamicConfig ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* Settings Sections */}
      {config && !isDefault && (
        <>
          {/* Edit Mode Controls */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Settings</h2>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Edit Settings
              </button>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={cancelEditing}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={saveChanges}
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>

          {/* Change Notes (when editing) */}
          {isEditing && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Change Notes
              </label>
              <input
                type="text"
                value={changeNotes}
                onChange={(e) => setChangeNotes(e.target.value)}
                placeholder="Describe what you're changing..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          )}

          {/* AI Model Section */}
          <SettingsSection title="AI Model" icon="🤖">
            <p className="text-sm text-gray-600 mb-4 -mt-2">
              Configure the OpenAI model used for extracting events from diary entries.
            </p>
            <SettingsSelectField
              label="Model"
              description="GPT-4o Mini is faster and cheaper. GPT-4o produces higher quality extractions."
              value={(editedSettings.model as string) || 'gpt-4o-mini'}
              options={MODEL_OPTIONS}
              onChange={(v) => updateSetting('model', v)}
              isEditing={isEditing}
            />
            <SettingsNumberField
              label="Temperature"
              description="Controls randomness. Lower = more deterministic. Higher = more creative. Recommended: 0.1-0.5 for extraction tasks."
              value={editedSettings.temperature ?? 0.3}
              onChange={(v) => updateSetting('temperature', v)}
              isEditing={isEditing}
              min={0}
              max={1}
              step={0.05}
            />
            <SettingsNumberField
              label="Max Tokens"
              description="Maximum response length. Higher allows more events per extraction. Recommended: 500-1500."
              value={editedSettings.maxTokens ?? 800}
              onChange={(v) => updateSetting('maxTokens', v)}
              isEditing={isEditing}
              min={100}
              max={4000}
              step={100}
            />
          </SettingsSection>

          {/* Time Handling Section */}
          <SettingsSection title="Time Handling" icon="🕐">
            <SettingsSelectField
              label="Timezone"
              description="Default timezone for resolving relative dates (e.g., 'tomorrow', 'next Monday')."
              value={(editedSettings.timezone as string) || 'America/Los_Angeles'}
              options={TIMEZONE_OPTIONS.map((tz) => ({ value: tz, label: tz }))}
              onChange={(v) => updateSetting('timezone', v)}
              isEditing={isEditing}
            />
          </SettingsSection>

          {/* Toast Display Section */}
          <SettingsSection title="Toast Display (Mobile)" icon="📱">
            <p className="text-sm text-gray-600 mb-4 -mt-2">
              Configure how extracted events are shown to users on the mobile home screen.
            </p>
            <SettingsToggle
              label="Toast Enabled"
              description="Show toast notifications for newly extracted events on the mobile home screen."
              enabled={editedSettings.toastEnabled ?? true}
              onChange={(enabled) => updateSetting('toastEnabled', enabled)}
              isEditing={isEditing}
            />
            <SettingsNumberField
              label="Lookback Window (Hours)"
              description="Only show events extracted within this many hours. Older drafts are ignored. Recommended: 12-48."
              value={editedSettings.toastLookbackHours ?? 24}
              onChange={(v) => updateSetting('toastLookbackHours', v)}
              isEditing={isEditing}
              min={1}
              max={168}
              step={1}
            />
            <SettingsNumberField
              label="Display Limit"
              description="Maximum number of event toasts to show at once. Recommended: 1-3."
              value={editedSettings.toastDisplayLimit ?? 1}
              onChange={(v) => updateSetting('toastDisplayLimit', v)}
              isEditing={isEditing}
              min={1}
              max={10}
              step={1}
            />
          </SettingsSection>

          {/* Confidence Filtering Section */}
          <SettingsSection title="Confidence Filtering" icon="🎯">
            <SettingsNumberField
              label="Confidence Threshold"
              description="Minimum confidence score (0.0-1.0) for extracted events. Events below this threshold are discarded. 0.0 = show all events."
              value={editedSettings.confidenceThreshold ?? 0.0}
              onChange={(v) => updateSetting('confidenceThreshold', v)}
              isEditing={isEditing}
              min={0}
              max={1}
              step={0.05}
            />
          </SettingsSection>

          {/* Event Types Section */}
          <SettingsSection title="Enabled Event Types" icon="📋">
            <p className="text-sm text-gray-600 mb-4 -mt-2">
              Choose which event types the AI should extract from diary entries. Disabled types will be ignored during extraction.
            </p>
            {ALL_EVENT_TYPES.map((eventType) => {
              const meta = EVENT_TYPE_LABELS[eventType];
              const enabled = (editedSettings.enabledEventTypes as string[] | undefined)?.includes(eventType) ?? true;
              return (
                <SettingsToggle
                  key={eventType}
                  label={`${meta.icon} ${meta.label}`}
                  description={`Extract "${eventType}" type events from diary entries.`}
                  enabled={enabled}
                  onChange={() => toggleEventType(eventType)}
                  isEditing={isEditing}
                />
              );
            })}
          </SettingsSection>
        </>
      )}
    </div>
  );
}

// ─── Reusable Components ────────────────────────────────────────────

interface SettingsSectionProps {
  title: string;
  icon: string;
  children: React.ReactNode;
}

function SettingsSection({ title, icon, children }: SettingsSectionProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <span>{icon}</span>
        {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

interface SettingsToggleProps {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  isEditing: boolean;
}

function SettingsToggle({
  label,
  description,
  enabled,
  onChange,
  isEditing,
}: SettingsToggleProps) {
  return (
    <div className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">{label}</label>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
        <div className="sm:w-1/2 flex justify-end">
          {isEditing ? (
            <button
              type="button"
              onClick={() => onChange(!enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                enabled ? 'bg-green-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          ) : (
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                enabled
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {enabled ? 'Enabled' : 'Disabled'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

interface SettingsNumberFieldProps {
  label: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
  isEditing: boolean;
  min?: number;
  max?: number;
  step?: number;
}

function SettingsNumberField({
  label,
  description,
  value,
  onChange,
  isEditing,
  min = 0,
  max = 100,
  step = 1,
}: SettingsNumberFieldProps) {
  return (
    <div className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">{label}</label>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
        <div className="sm:w-1/2">
          {isEditing ? (
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-600"
              />
              <input
                type="number"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value) || min)}
                className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm text-center"
              />
            </div>
          ) : (
            <p className="text-sm text-gray-900 text-right">{value}</p>
          )}
        </div>
      </div>
    </div>
  );
}

interface SettingsSelectFieldProps {
  label: string;
  description: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  isEditing: boolean;
}

function SettingsSelectField({
  label,
  description,
  value,
  options,
  onChange,
  isEditing,
}: SettingsSelectFieldProps) {
  return (
    <div className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">{label}</label>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
        <div className="sm:w-1/2">
          {isEditing ? (
            <select
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-red-500 focus:border-red-500"
            >
              {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-gray-900 text-right">{value}</p>
          )}
        </div>
      </div>
    </div>
  );
}
