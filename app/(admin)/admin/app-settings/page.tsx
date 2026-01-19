'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPatch } from '@/lib/api/client';
import {
  AppSettingsConfig,
  AppSettings,
  isValidEmail,
  isValidUrl,
} from '@/lib/models/AppSettings';

/**
 * Admin App Settings Page
 * Configure support email, documentation URLs, and app metadata
 */
export default function AdminAppSettingsPage() {
  const [config, setConfig] = useState<AppSettingsConfig | null>(null);
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editedSettings, setEditedSettings] = useState<Partial<AppSettings>>({});
  const [changeNotes, setChangeNotes] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiGet<{ config: AppSettingsConfig; isDefault: boolean }>(
        '/api/admin/app-settings'
      );
      setConfig(data.config);
      setIsDefault(data.isDefault);
      setEditedSettings(data.config.settings);
    } catch (err: unknown) {
      console.error('Failed to fetch app settings config:', err);
      const message = err instanceof Error ? err.message : 'Failed to load app settings';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const initializeConfig = async () => {
    try {
      setSaving(true);
      setError(null);
      const data = await apiPost<{ config: AppSettingsConfig }>(
        '/api/admin/app-settings',
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

      const data = await apiPatch<{ config: AppSettingsConfig }>(
        '/api/admin/app-settings',
        {
          settings: editedSettings,
          changeNotes: changeNotes || 'Updated app settings',
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

      const data = await apiPatch<{ config: AppSettingsConfig }>(
        '/api/admin/app-settings',
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
          : 'Dynamic config disabled - Mobile app using hardcoded defaults'
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

  const updateSetting = (field: keyof AppSettings, value: string | number) => {
    setEditedSettings((prev) => ({ ...prev, [field]: value }));
  };

  const validateField = (
    field: keyof AppSettings,
    value: string
  ): { valid: boolean; message?: string } => {
    if (
      field === 'supportEmail' ||
      field === 'feedbackEmail' ||
      field === 'bugReportEmail'
    ) {
      if (value && !isValidEmail(value)) {
        return { valid: false, message: 'Invalid email format' };
      }
    }

    const urlFields = [
      'docsBaseUrl',
      'gettingStartedUrl',
      'featuresUrl',
      'faqUrl',
      'supportCenterUrl',
      'privacyPolicyUrl',
      'termsOfServiceUrl',
      'licensesUrl',
    ];

    if (urlFields.includes(field)) {
      if (value && !isValidUrl(value)) {
        return { valid: false, message: 'Invalid URL format' };
      }
    }

    return { valid: true };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading app settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">App Settings</h1>
          <p className="mt-2 text-gray-600">
            Configure support email, documentation URLs, and app metadata
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
            The app settings configuration has not been saved to Firestore yet. Click the
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
                  ? 'Mobile app is using settings configured here'
                  : 'Mobile app is using hardcoded defaults (kill switch active)'}
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

          {/* Support & Contact Section */}
          <SettingsSection title="Support & Contact" icon="📧">
            <SettingsField
              label="Support Email"
              description="Primary support email shown in the app"
              value={editedSettings.supportEmail || ''}
              onChange={(v) => updateSetting('supportEmail', v)}
              isEditing={isEditing}
              required
              validate={(v) => validateField('supportEmail', v)}
            />
            <SettingsField
              label="Feedback Email"
              description="Email for user feedback (defaults to support email if empty)"
              value={editedSettings.feedbackEmail || ''}
              onChange={(v) => updateSetting('feedbackEmail', v)}
              isEditing={isEditing}
              validate={(v) => validateField('feedbackEmail', v)}
            />
            <SettingsField
              label="Bug Report Email"
              description="Email for bug reports (defaults to support email if empty)"
              value={editedSettings.bugReportEmail || ''}
              onChange={(v) => updateSetting('bugReportEmail', v)}
              isEditing={isEditing}
              validate={(v) => validateField('bugReportEmail', v)}
            />
          </SettingsSection>

          {/* Documentation URLs Section */}
          <SettingsSection title="Documentation URLs" icon="📚">
            <SettingsField
              label="Docs Base URL"
              description="Base URL for documentation"
              value={editedSettings.docsBaseUrl || ''}
              onChange={(v) => updateSetting('docsBaseUrl', v)}
              isEditing={isEditing}
              required
              validate={(v) => validateField('docsBaseUrl', v)}
            />
            <SettingsField
              label="Getting Started URL"
              description="Link to getting started guide"
              value={editedSettings.gettingStartedUrl || ''}
              onChange={(v) => updateSetting('gettingStartedUrl', v)}
              isEditing={isEditing}
              required
              validate={(v) => validateField('gettingStartedUrl', v)}
            />
            <SettingsField
              label="Features URL"
              description="Link to features overview"
              value={editedSettings.featuresUrl || ''}
              onChange={(v) => updateSetting('featuresUrl', v)}
              isEditing={isEditing}
              required
              validate={(v) => validateField('featuresUrl', v)}
            />
            <SettingsField
              label="FAQ URL"
              description="Link to frequently asked questions"
              value={editedSettings.faqUrl || ''}
              onChange={(v) => updateSetting('faqUrl', v)}
              isEditing={isEditing}
              required
              validate={(v) => validateField('faqUrl', v)}
            />
            <SettingsField
              label="Support Center URL"
              description="Link to support center"
              value={editedSettings.supportCenterUrl || ''}
              onChange={(v) => updateSetting('supportCenterUrl', v)}
              isEditing={isEditing}
              required
              validate={(v) => validateField('supportCenterUrl', v)}
            />
          </SettingsSection>

          {/* Legal URLs Section */}
          <SettingsSection title="Legal URLs" icon="⚖️">
            <SettingsField
              label="Privacy Policy URL"
              description="Link to privacy policy"
              value={editedSettings.privacyPolicyUrl || ''}
              onChange={(v) => updateSetting('privacyPolicyUrl', v)}
              isEditing={isEditing}
              required
              validate={(v) => validateField('privacyPolicyUrl', v)}
            />
            <SettingsField
              label="Terms of Service URL"
              description="Link to terms of service"
              value={editedSettings.termsOfServiceUrl || ''}
              onChange={(v) => updateSetting('termsOfServiceUrl', v)}
              isEditing={isEditing}
              required
              validate={(v) => validateField('termsOfServiceUrl', v)}
            />
            <SettingsField
              label="Open Source Licenses URL"
              description="Link to open source licenses"
              value={editedSettings.licensesUrl || ''}
              onChange={(v) => updateSetting('licensesUrl', v)}
              isEditing={isEditing}
              required
              validate={(v) => validateField('licensesUrl', v)}
            />
          </SettingsSection>

          {/* App Metadata Section */}
          <SettingsSection title="App Metadata" icon="📱">
            <SettingsField
              label="App Name"
              description="Name displayed in the app"
              value={editedSettings.appName || ''}
              onChange={(v) => updateSetting('appName', v)}
              isEditing={isEditing}
              required
            />
            <SettingsField
              label="Company Name"
              description="Company name for copyright"
              value={editedSettings.companyName || ''}
              onChange={(v) => updateSetting('companyName', v)}
              isEditing={isEditing}
              required
            />
            <SettingsField
              label="Copyright Year"
              description="Year shown in copyright notice"
              value={String(editedSettings.copyrightYear || '')}
              onChange={(v) => updateSetting('copyrightYear', parseInt(v) || 2025)}
              isEditing={isEditing}
              required
              type="number"
            />
          </SettingsSection>
        </>
      )}
    </div>
  );
}

// Settings Section Component
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

// Settings Field Component
interface SettingsFieldProps {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  isEditing: boolean;
  required?: boolean;
  type?: 'text' | 'number' | 'email' | 'url';
  validate?: (value: string) => { valid: boolean; message?: string };
}

function SettingsField({
  label,
  description,
  value,
  onChange,
  isEditing,
  required,
  type = 'text',
  validate,
}: SettingsFieldProps) {
  const validation = validate ? validate(value) : { valid: true };

  return (
    <div className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
        <div className="sm:w-1/2">
          {isEditing ? (
            <div>
              <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md text-sm ${
                  !validation.valid
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-red-500 focus:border-red-500'
                }`}
              />
              {!validation.valid && (
                <p className="text-xs text-red-500 mt-1">{validation.message}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-900 truncate" title={value}>
              {value || <span className="text-gray-400 italic">Not set</span>}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
