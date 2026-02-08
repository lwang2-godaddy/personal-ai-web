'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPatch } from '@/lib/api/client';
import {
  SubscriptionTierConfig,
  SubscriptionConfigVersion,
  TierQuotas,
  SubscriptionTierKey,
  formatQuotaValue,
} from '@/lib/models/Subscription';
import { useTrackPage } from '@/lib/hooks/useTrackPage';
import { TRACKED_SCREENS } from '@/lib/models/BehaviorEvent';

// Use the same tier key type as the model
type TierName = SubscriptionTierKey; // 'basic' | 'premium' | 'pro'

interface EditingTier {
  name: TierName;
  quotas: TierQuotas;
}

/**
 * Admin Subscription Plans Page
 * Configure tier quotas and features
 */
export default function AdminSubscriptionsPage() {
  // Track page view
  useTrackPage(TRACKED_SCREENS.adminSubscriptions);

  const [config, setConfig] = useState<SubscriptionTierConfig | null>(null);
  const [versions, setVersions] = useState<SubscriptionConfigVersion[]>([]);
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editingTier, setEditingTier] = useState<EditingTier | null>(null);
  const [changeNotes, setChangeNotes] = useState('');

  useEffect(() => {
    fetchConfig();
    fetchVersions();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiGet<{ config: SubscriptionTierConfig; isDefault: boolean }>(
        '/api/admin/subscriptions'
      );
      setConfig(data.config);
      setIsDefault(data.isDefault);
    } catch (err: any) {
      console.error('Failed to fetch subscription config:', err);
      setError(err.message || 'Failed to load subscription configuration');
    } finally {
      setLoading(false);
    }
  };

  const fetchVersions = async () => {
    try {
      const data = await apiGet<{ versions: SubscriptionConfigVersion[] }>(
        '/api/admin/subscriptions/versions?limit=10'
      );
      setVersions(data.versions);
    } catch (err: any) {
      console.error('Failed to fetch version history:', err);
    }
  };

  const initializeConfig = async () => {
    try {
      setSaving(true);
      setError(null);
      const data = await apiPost<{ config: SubscriptionTierConfig }>(
        '/api/admin/subscriptions',
        {}
      );
      setConfig(data.config);
      setIsDefault(false);
      setSuccessMessage('Configuration initialized successfully!');
      fetchVersions();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize configuration');
    } finally {
      setSaving(false);
    }
  };

  const saveTierChanges = async () => {
    if (!editingTier || !config) return;

    try {
      setSaving(true);
      setError(null);

      const data = await apiPatch<{ config: SubscriptionTierConfig }>(
        '/api/admin/subscriptions',
        {
          tiers: { [editingTier.name]: editingTier.quotas },
          changeNotes: changeNotes || `Updated ${editingTier.name} tier quotas`,
        }
      );

      setConfig(data.config);
      setEditingTier(null);
      setChangeNotes('');
      setSuccessMessage(`${editingTier.name.charAt(0).toUpperCase() + editingTier.name.slice(1)} tier updated successfully!`);
      fetchVersions();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const toggleDynamicConfig = async () => {
    if (!config) return;

    try {
      setSaving(true);
      setError(null);

      const data = await apiPatch<{ config: SubscriptionTierConfig }>(
        '/api/admin/subscriptions',
        {
          enableDynamicConfig: !config.enableDynamicConfig,
          changeNotes: config.enableDynamicConfig
            ? 'Disabled dynamic configuration (using hardcoded defaults)'
            : 'Enabled dynamic configuration',
        }
      );

      setConfig(data.config);
      setSuccessMessage(
        data.config.enableDynamicConfig
          ? 'Dynamic configuration enabled!'
          : 'Dynamic configuration disabled - using hardcoded defaults'
      );
      fetchVersions();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to toggle dynamic config');
    } finally {
      setSaving(false);
    }
  };

  const rollbackToVersion = async (versionId: string) => {
    if (!confirm(`Are you sure you want to rollback to ${versionId}?`)) return;

    try {
      setSaving(true);
      setError(null);

      const data = await apiPost<{ config: SubscriptionTierConfig }>(
        '/api/admin/subscriptions/versions',
        { versionId }
      );

      setConfig(data.config);
      setSuccessMessage(`Rolled back to ${versionId} successfully!`);
      fetchVersions();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to rollback');
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (tierName: TierName) => {
    if (!config) return;
    setEditingTier({
      name: tierName,
      quotas: { ...config.tiers[tierName] },
    });
    setChangeNotes('');
  };

  const updateEditingQuota = (field: keyof TierQuotas, value: number | boolean) => {
    if (!editingTier) return;
    setEditingTier({
      ...editingTier,
      quotas: { ...editingTier.quotas, [field]: value },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading subscription configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Subscription Plans</h1>
          <p className="mt-2 text-gray-600">
            Configure tier quotas and features for all users
          </p>
        </div>
        {config && (
          <div className="text-sm text-gray-500">
            Version {config.version} | Last updated: {new Date(config.lastUpdated).toLocaleDateString()}
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
            The subscription configuration has not been saved to Firestore yet.
            Click the button below to initialize with default values.
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
                  ? 'Apps are using the quotas configured here'
                  : 'Apps are using hardcoded defaults (kill switch active)'}
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

      {/* Tier Cards */}
      {config && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(['basic', 'premium', 'pro'] as TierName[]).map((tierName) => (
            <TierCard
              key={tierName}
              tierName={tierName}
              quotas={config.tiers[tierName]}
              isEditing={editingTier?.name === tierName}
              editingQuotas={editingTier?.name === tierName ? editingTier.quotas : null}
              onEdit={() => startEditing(tierName)}
              onCancel={() => setEditingTier(null)}
              onSave={saveTierChanges}
              onUpdateQuota={updateEditingQuota}
              saving={saving}
              changeNotes={changeNotes}
              onChangeNotesUpdate={setChangeNotes}
            />
          ))}
        </div>
      )}

      {/* Version History */}
      {versions.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Version History</h2>
          <div className="space-y-3">
            {versions.map((version) => (
              <div
                key={version.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <span className="font-semibold text-gray-900">{version.id}</span>
                  <span className="text-gray-500 ml-2">
                    {new Date(version.changedAt).toLocaleString()}
                  </span>
                  {version.changeNotes && (
                    <p className="text-sm text-gray-600 mt-1">{version.changeNotes}</p>
                  )}
                  <p className="text-xs text-gray-400">
                    by {version.changedByEmail || version.changedBy}
                  </p>
                </div>
                {version.version !== config?.version && (
                  <button
                    onClick={() => rollbackToVersion(version.id)}
                    disabled={saving}
                    className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
                  >
                    Rollback
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cache Propagation Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <div className="text-blue-500 text-xl">&#8505;</div>
          <div>
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              How Changes Propagate to Users
            </h3>
            <p className="text-blue-800 text-sm mb-3">
              Changes made here are cached on user devices for performance. Here&apos;s when users will see updated quotas:
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                <span className="text-blue-900">
                  <strong>Mobile App:</strong> Up to 24 hours (or on app restart if cache expired)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                <span className="text-blue-900">
                  <strong>Web Dashboard (Browser):</strong> Up to 24 hours
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                <span className="text-blue-900">
                  <strong>Web API (Server):</strong> Up to 5 minutes
                </span>
              </div>
            </div>
            <p className="text-blue-700 text-xs mt-3">
              Users can also force refresh by logging out and back in, which clears the local cache.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Tier Card Component
interface TierCardProps {
  tierName: TierName;
  quotas: TierQuotas;
  isEditing: boolean;
  editingQuotas: TierQuotas | null;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onUpdateQuota: (field: keyof TierQuotas, value: number | boolean) => void;
  saving: boolean;
  changeNotes: string;
  onChangeNotesUpdate: (notes: string) => void;
}

function TierCard({
  tierName,
  quotas,
  isEditing,
  editingQuotas,
  onEdit,
  onCancel,
  onSave,
  onUpdateQuota,
  saving,
  changeNotes,
  onChangeNotesUpdate,
}: TierCardProps) {
  const displayQuotas = editingQuotas || quotas;

  const tierColors: Record<TierName, string> = {
    basic: 'border-gray-400',
    premium: 'border-blue-500',
    pro: 'border-purple-500',
  };

  const tierLabels: Record<TierName, string> = {
    basic: 'BASIC (FREE)',
    premium: 'PREMIUM',
    pro: 'PRO',
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 border-t-4 ${tierColors[tierName]}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-900">{tierLabels[tierName]}</h3>
        {!isEditing ? (
          <button
            onClick={onEdit}
            className="px-3 py-1 text-sm bg-red-100 text-red-600 rounded hover:bg-red-200"
          >
            Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {/* Quotas */}
      <div className="space-y-3">
        <QuotaRow
          label="Messages/Month"
          value={displayQuotas.messagesPerMonth}
          isEditing={isEditing}
          onChange={(v) => onUpdateQuota('messagesPerMonth', v)}
        />
        <QuotaRow
          label="Photos/Month"
          value={displayQuotas.photosPerMonth}
          isEditing={isEditing}
          onChange={(v) => onUpdateQuota('photosPerMonth', v)}
        />
        <QuotaRow
          label="Voice Min/Month"
          value={displayQuotas.voiceMinutesPerMonth}
          isEditing={isEditing}
          onChange={(v) => onUpdateQuota('voiceMinutesPerMonth', v)}
        />
        <QuotaRow
          label="Max Recording (sec)"
          value={displayQuotas.maxVoiceRecordingSeconds}
          isEditing={isEditing}
          onChange={(v) => onUpdateQuota('maxVoiceRecordingSeconds', v)}
          step={30}
        />
        <QuotaRow
          label="Custom Activities"
          value={displayQuotas.customActivityTypes}
          isEditing={isEditing}
          onChange={(v) => onUpdateQuota('customActivityTypes', v)}
        />

        <hr className="my-3" />

        {/* Features */}
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Features</div>
        <FeatureRow
          label="Web Access"
          enabled={displayQuotas.webAccess}
          isEditing={isEditing}
          onChange={(v) => onUpdateQuota('webAccess', v)}
        />
        <FeatureRow
          label="Offline Mode"
          enabled={displayQuotas.offlineMode}
          isEditing={isEditing}
          onChange={(v) => onUpdateQuota('offlineMode', v)}
        />

        <hr className="my-3" />

        {/* API Cost Limits */}
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">API Cost Limits</div>
        <QuotaRow
          label="Max Tokens/Day"
          value={displayQuotas.maxTokensPerDay ?? 10000}
          isEditing={isEditing}
          onChange={(v) => onUpdateQuota('maxTokensPerDay', v)}
          step={1000}
          formatDisplay={(v) => v === -1 ? 'Unlimited' : `${(v / 1000).toFixed(0)}K`}
        />
        <QuotaRow
          label="Max API Calls/Day"
          value={displayQuotas.maxApiCallsPerDay ?? 100}
          isEditing={isEditing}
          onChange={(v) => onUpdateQuota('maxApiCallsPerDay', v)}
          step={100}
        />
        <CostRow
          label="Max Cost/Month"
          value={displayQuotas.maxCostPerMonth ?? 5.0}
          isEditing={isEditing}
          onChange={(v) => onUpdateQuota('maxCostPerMonth', v)}
        />
      </div>

      {/* Change Notes (only when editing) */}
      {isEditing && (
        <div className="mt-4">
          <label className="block text-sm text-gray-600 mb-1">Change Notes</label>
          <input
            type="text"
            value={changeNotes}
            onChange={(e) => onChangeNotesUpdate(e.target.value)}
            placeholder="Describe your changes..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>
      )}
    </div>
  );
}

// Quota Row Component
interface QuotaRowProps {
  label: string;
  value: number;
  isEditing: boolean;
  onChange: (value: number) => void;
  step?: number;
  formatDisplay?: (value: number) => string;
}

function QuotaRow({ label, value, isEditing, onChange, step = 1, formatDisplay }: QuotaRowProps) {
  const isUnlimited = value === -1;
  const displayValue = formatDisplay ? formatDisplay(value) : formatQuotaValue(value);

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">{label}</span>
      {isEditing ? (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={isUnlimited ? '' : value}
            onChange={(e) => onChange(e.target.value === '' ? -1 : parseInt(e.target.value, 10))}
            placeholder="∞"
            step={step}
            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-right"
          />
          <button
            onClick={() => onChange(-1)}
            className={`px-2 py-1 text-xs rounded ${
              isUnlimited ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
            }`}
          >
            ∞
          </button>
        </div>
      ) : (
        <span className="font-semibold text-gray-900">{displayValue}</span>
      )}
    </div>
  );
}

// Cost Row Component (for monetary values)
interface CostRowProps {
  label: string;
  value: number;
  isEditing: boolean;
  onChange: (value: number) => void;
}

function CostRow({ label, value, isEditing, onChange }: CostRowProps) {
  const isUnlimited = value === -1;

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">{label}</span>
      {isEditing ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">$</span>
          <input
            type="number"
            value={isUnlimited ? '' : value}
            onChange={(e) => onChange(e.target.value === '' ? -1 : parseFloat(e.target.value))}
            placeholder="∞"
            step={0.01}
            min={0}
            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right"
          />
          <button
            onClick={() => onChange(-1)}
            className={`px-2 py-1 text-xs rounded ${
              isUnlimited ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
            }`}
          >
            ∞
          </button>
        </div>
      ) : (
        <span className="font-semibold text-gray-900">
          {isUnlimited ? 'Unlimited' : `$${value.toFixed(2)}`}
        </span>
      )}
    </div>
  );
}

// Feature Row Component
interface FeatureRowProps {
  label: string;
  enabled: boolean;
  isEditing: boolean;
  onChange: (value: boolean) => void;
}

function FeatureRow({ label, enabled, isEditing, onChange }: FeatureRowProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">{label}</span>
      {isEditing ? (
        <button
          onClick={() => onChange(!enabled)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            enabled ? 'bg-green-600' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-5' : 'translate-x-1'
            }`}
          />
        </button>
      ) : (
        <span className={enabled ? 'text-green-600' : 'text-gray-400'}>
          {enabled ? '✓' : '✗'}
        </span>
      )}
    </div>
  );
}
