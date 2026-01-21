'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPatch } from '@/lib/api/client';
import {
  AIModelsConfig,
  AIModelsConfigVersion,
  SERVICE_METADATA,
  formatModelCost,
  OpenAIModelId,
} from '@/lib/models/AIModels';

type ServiceName = keyof AIModelsConfig['services'];

/**
 * Admin AI Models Configuration Page
 * Configure which OpenAI models are used for different services
 */
export default function AdminAIModelsPage() {
  const [config, setConfig] = useState<AIModelsConfig | null>(null);
  const [versions, setVersions] = useState<AIModelsConfigVersion[]>([]);
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editingService, setEditingService] = useState<ServiceName | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Record<string, OpenAIModelId>>({});
  const [changeNotes, setChangeNotes] = useState('');

  useEffect(() => {
    fetchConfig();
    fetchVersions();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiGet<{ config: AIModelsConfig; isDefault: boolean }>(
        '/api/admin/ai-models'
      );
      setConfig(data.config);
      setIsDefault(data.isDefault);
    } catch (err: any) {
      console.error('Failed to fetch AI models config:', err);
      setError(err.message || 'Failed to load AI models configuration');
    } finally {
      setLoading(false);
    }
  };

  const fetchVersions = async () => {
    try {
      const data = await apiGet<{ versions: AIModelsConfigVersion[] }>(
        '/api/admin/ai-models/versions?limit=10'
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
      const data = await apiPost<{ config: AIModelsConfig }>(
        '/api/admin/ai-models',
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

  const saveServiceChange = async (serviceName: ServiceName, newModel: OpenAIModelId) => {
    if (!config) return;

    try {
      setSaving(true);
      setError(null);

      const data = await apiPatch<{ config: AIModelsConfig }>(
        '/api/admin/ai-models',
        {
          services: { [serviceName]: { default: newModel } },
          changeNotes: changeNotes || `Changed ${SERVICE_METADATA[serviceName].name} model to ${newModel}`,
        }
      );

      setConfig(data.config);
      setEditingService(null);
      setPendingChanges({});
      setChangeNotes('');
      setSuccessMessage(`${SERVICE_METADATA[serviceName].name} model updated successfully!`);
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

      const data = await apiPatch<{ config: AIModelsConfig }>(
        '/api/admin/ai-models',
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
          : 'Dynamic configuration disabled - Cloud Functions will use gpt-4o as fallback'
      );
      fetchVersions();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to toggle dynamic config');
    } finally {
      setSaving(false);
    }
  };

  const toggleModelEnabled = async (modelId: string, enabled: boolean) => {
    if (!config) return;

    try {
      setSaving(true);
      setError(null);

      const data = await apiPatch<{ config: AIModelsConfig }>(
        '/api/admin/ai-models',
        {
          availableModels: { [modelId]: { enabled } },
          changeNotes: `${enabled ? 'Enabled' : 'Disabled'} model ${modelId}`,
        }
      );

      setConfig(data.config);
      setSuccessMessage(`Model ${modelId} ${enabled ? 'enabled' : 'disabled'}!`);
      fetchVersions();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update model');
    } finally {
      setSaving(false);
    }
  };

  const rollbackToVersion = async (versionId: string) => {
    if (!confirm(`Are you sure you want to rollback to ${versionId}?`)) return;

    try {
      setSaving(true);
      setError(null);

      const data = await apiPost<{ config: AIModelsConfig }>(
        '/api/admin/ai-models/versions',
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

  const getEnabledModels = (): string[] => {
    if (!config) return [];
    return Object.entries(config.availableModels)
      .filter(([_, info]) => info.enabled)
      .map(([id]) => id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading AI models configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Models Configuration</h1>
          <p className="mt-2 text-gray-600">
            Configure which OpenAI models are used for different services
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
            The AI models configuration has not been saved to Firestore yet.
            Click the button below to initialize with default values (gpt-4o for chat, gpt-4o-mini for other services).
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
                  ? 'Cloud Functions are using the models configured here'
                  : 'Cloud Functions are using hardcoded defaults (gpt-4o as fallback)'}
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

      {/* Service Model Configuration */}
      {config && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Service Model Assignments</h2>
          <p className="text-sm text-gray-600 mb-6">
            Configure which model each service uses. GPT-4o is recommended for chat (12x cheaper than GPT-4).
          </p>
          <div className="space-y-4">
            {(Object.keys(SERVICE_METADATA) as ServiceName[]).map((serviceName) => {
              const meta = SERVICE_METADATA[serviceName];
              const currentModel = config.services[serviceName].default;
              const isEditing = editingService === serviceName;

              return (
                <div
                  key={serviceName}
                  className={`flex items-center justify-between p-4 rounded-lg ${
                    meta.note ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{meta.name}</h4>
                    <p className="text-sm text-gray-600">{meta.description}</p>
                    {meta.note && (
                      <p className="text-xs text-amber-600 mt-1">* {meta.note}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={pendingChanges[serviceName] || currentModel}
                          onChange={(e) => setPendingChanges({
                            ...pendingChanges,
                            [serviceName]: e.target.value as OpenAIModelId
                          })}
                          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                          {getEnabledModels().map((modelId) => (
                            <option key={modelId} value={modelId}>
                              {config.availableModels[modelId].displayName}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => {
                            setEditingService(null);
                            setPendingChanges({});
                          }}
                          className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => saveServiceChange(
                            serviceName,
                            pendingChanges[serviceName] || currentModel
                          )}
                          disabled={saving || (pendingChanges[serviceName] || currentModel) === currentModel}
                          className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="text-right">
                          <span className="font-medium text-gray-900">
                            {config.availableModels[currentModel]?.displayName || currentModel}
                          </span>
                          <span className="block text-xs text-gray-500">
                            {config.availableModels[currentModel]
                              ? formatModelCost(config.availableModels[currentModel])
                              : 'N/A'} per 1M tokens (in/out)
                          </span>
                        </div>
                        <button
                          onClick={() => setEditingService(serviceName)}
                          disabled={saving}
                          className="px-3 py-1 text-sm bg-red-100 text-red-600 rounded hover:bg-red-200 disabled:opacity-50"
                        >
                          Change
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Available Models */}
      {config && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Available Models</h2>
          <p className="text-sm text-gray-600 mb-6">
            Enable or disable models that can be used by services. Disabled models cannot be selected.
          </p>
          <div className="space-y-3">
            {Object.entries(config.availableModels).map(([modelId, modelInfo]) => (
              <div
                key={modelId}
                className={`flex items-center justify-between p-4 rounded-lg ${
                  modelInfo.enabled ? 'bg-green-50' : 'bg-gray-50'
                }`}
              >
                <div>
                  <h4 className="font-semibold text-gray-900">{modelInfo.displayName}</h4>
                  <p className="text-sm text-gray-600">
                    Cost: {formatModelCost(modelInfo)} per 1M tokens (input/output)
                  </p>
                </div>
                <button
                  onClick={() => toggleModelEnabled(modelId, !modelInfo.enabled)}
                  disabled={saving}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    modelInfo.enabled ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      modelInfo.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cost Comparison Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <div className="text-blue-500 text-xl">&#8505;</div>
          <div>
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              Model Cost Comparison
            </h3>
            <div className="space-y-2 text-sm text-blue-800">
              <p><strong>GPT-4:</strong> $30/$60 per 1M tokens - Legacy, most expensive</p>
              <p><strong>GPT-4 Turbo:</strong> $10/$30 per 1M tokens - Faster than GPT-4</p>
              <p><strong>GPT-4o:</strong> $2.50/$10 per 1M tokens - <span className="text-green-700 font-semibold">Recommended (12x cheaper than GPT-4)</span></p>
              <p><strong>GPT-4o Mini:</strong> $0.15/$0.60 per 1M tokens - Best for simple tasks</p>
            </div>
            <p className="text-blue-700 text-xs mt-3">
              Switching from GPT-4 to GPT-4o can reduce your OpenAI costs by up to 92%
            </p>
          </div>
        </div>
      </div>

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
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <div className="text-amber-500 text-xl">&#9888;</div>
          <div>
            <h3 className="text-lg font-semibold text-amber-900 mb-2">
              How Changes Propagate to Cloud Functions
            </h3>
            <p className="text-amber-800 text-sm mb-3">
              Cloud Functions cache the AI models config for performance. Changes will take effect:
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-amber-500 rounded-full"></span>
                <span className="text-amber-900">
                  <strong>Within 5 minutes:</strong> Config cache expires and new settings are fetched
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-amber-500 rounded-full"></span>
                <span className="text-amber-900">
                  <strong>Immediately:</strong> If Cloud Functions experience a cold start
                </span>
              </div>
            </div>
            <p className="text-amber-700 text-xs mt-3">
              To force immediate update: Redeploy Cloud Functions or wait for cold start on next invocation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
