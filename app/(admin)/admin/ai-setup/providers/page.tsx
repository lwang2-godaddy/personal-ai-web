'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPatch, apiPost } from '@/lib/api/client';
import {
  AIProviderConfig,
  ServiceType,
  ServiceConfig,
  RegisteredProvider,
  ProviderStatus,
  ALL_SERVICE_TYPES,
  DEFAULT_AI_PROVIDER_CONFIG,
  getAIServiceDisplayName,
  getServiceIcon,
  getProviderTypeLabel,
  getProviderTypeColor,
} from '@/lib/models/AIProviderConfig';
import { useTrackPage } from '@/lib/hooks/useTrackPage';
import { TRACKED_SCREENS } from '@/lib/models/BehaviorEvent';

/**
 * Model options by provider and service type
 */
const MODEL_OPTIONS: Record<string, Record<ServiceType, { value: string; label: string }[]>> = {
  openai: {
    chat: [
      { value: 'gpt-4o', label: 'GPT-4o (Recommended)' },
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Cheaper)' },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    ],
    embedding: [
      { value: 'text-embedding-3-small', label: 'text-embedding-3-small (Recommended)' },
      { value: 'text-embedding-3-large', label: 'text-embedding-3-large (Higher quality)' },
    ],
    tts: [
      { value: 'tts-1', label: 'TTS-1 (Standard)' },
      { value: 'tts-1-hd', label: 'TTS-1 HD (Higher quality)' },
    ],
    stt: [
      { value: 'whisper-1', label: 'Whisper-1' },
    ],
    vision: [
      { value: 'gpt-4o', label: 'GPT-4o Vision' },
    ],
  },
  google: {
    chat: [
      { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Recommended)' },
      { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Most capable)' },
      { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    ],
    embedding: [
      { value: 'gemini-embedding-001', label: 'Gemini Embedding 001' },
    ],
    tts: [
      { value: 'Wavenet', label: 'Wavenet (Recommended)' },
      { value: 'Neural2', label: 'Neural2 (English/EU only)' },
      { value: 'Studio', label: 'Studio (Premium, English only)' },
      { value: 'Standard', label: 'Standard (Basic)' },
    ],
    stt: [
      { value: 'chirp_2', label: 'Chirp 2 (Latest)' },
      { value: 'latest_long', label: 'Latest Long' },
      { value: 'latest_short', label: 'Latest Short' },
    ],
    vision: [
      { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash Vision' },
      { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro Vision' },
    ],
  },
  anthropic: {
    chat: [
      { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (Recommended)' },
      { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus (Most capable)' },
      { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku (Fastest)' },
    ],
    embedding: [],
    tts: [],
    stt: [],
    vision: [
      { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet Vision' },
    ],
  },
  ollama: {
    chat: [
      { value: 'llama3.2', label: 'Llama 3.2' },
      { value: 'mistral', label: 'Mistral' },
      { value: 'mixtral', label: 'Mixtral' },
    ],
    embedding: [
      { value: 'nomic-embed-text', label: 'Nomic Embed Text' },
      { value: 'all-minilm', label: 'All-MiniLM' },
    ],
    tts: [],
    stt: [],
    vision: [
      { value: 'llava', label: 'LLaVA' },
    ],
  },
};

/**
 * Get model options for a specific provider and service
 */
function getModelOptions(providerId: string, service: ServiceType): { value: string; label: string }[] {
  return MODEL_OPTIONS[providerId]?.[service] || [];
}

/**
 * Get default model for a provider and service
 */
function getDefaultModel(providerId: string, service: ServiceType): string {
  const options = getModelOptions(providerId, service);
  return options[0]?.value || '';
}

/**
 * Get display label for a model value
 */
function getModelDisplayLabel(providerId: string, service: ServiceType, modelValue: string): string {
  const options = getModelOptions(providerId, service);
  const found = options.find(o => o.value === modelValue);
  return found?.label || modelValue;
}

/**
 * Admin AI Providers Configuration Page
 *
 * Configure which AI providers are used for different services.
 * Supports OpenAI, Google Cloud, Anthropic, and local Ollama.
 */
export default function AdminAIProvidersPage() {
  // Track page view
  useTrackPage(TRACKED_SCREENS.adminAiProviders);

  const [config, setConfig] = useState<AIProviderConfig | null>(null);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus[]>([]);
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editingService, setEditingService] = useState<ServiceType | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Partial<ServiceConfig>>({});

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await apiGet<{
        config: AIProviderConfig;
        isDefault: boolean;
        providerStatus: ProviderStatus[];
      }>('/api/admin/ai-providers');

      setConfig(data.config);
      setIsDefault(data.isDefault);
      setProviderStatus(data.providerStatus || []);
    } catch (err: any) {
      console.error('Failed to fetch AI providers config:', err);
      // Use default config on error
      setConfig(DEFAULT_AI_PROVIDER_CONFIG);
      setIsDefault(true);
      setError(err.message || 'Failed to load AI providers configuration');
    } finally {
      setLoading(false);
    }
  };

  const initializeConfig = async () => {
    try {
      setSaving(true);
      setError(null);

      const data = await apiPost<{ config: AIProviderConfig }>(
        '/api/admin/ai-providers',
        {}
      );

      setConfig(data.config);
      setIsDefault(false);
      setSuccessMessage('Configuration initialized successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize configuration');
    } finally {
      setSaving(false);
    }
  };

  const saveServiceConfig = async (service: ServiceType, serviceConfig: ServiceConfig) => {
    try {
      setSaving(true);
      setError(null);

      const data = await apiPatch<{ config: AIProviderConfig }>(
        '/api/admin/ai-providers',
        {
          service,
          serviceConfig,
        }
      );

      setConfig(data.config);
      setEditingService(null);
      setPendingChanges({});
      setSuccessMessage(`${getAIServiceDisplayName(service)} configuration updated!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const toggleProviderEnabled = async (providerId: string, enabled: boolean) => {
    if (!config) return;

    try {
      setSaving(true);
      setError(null);

      const data = await apiPatch<{ config: AIProviderConfig }>(
        '/api/admin/ai-providers',
        {
          toggleProvider: { providerId, enabled },
        }
      );

      setConfig(data.config);
      setSuccessMessage(`Provider ${providerId} ${enabled ? 'enabled' : 'disabled'}!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update provider');
    } finally {
      setSaving(false);
    }
  };

  const getEnabledProvidersForService = (service: ServiceType): RegisteredProvider[] => {
    if (!config) return [];
    return config.registeredProviders.filter(
      (p) => p.enabled && p.supportedServices.includes(service)
    );
  };

  const getProviderName = (providerId: string): string => {
    if (!config) return providerId;
    const provider = config.registeredProviders.find((p) => p.id === providerId);
    return provider?.name || providerId;
  };

  const getProviderStatusById = (providerId: string): ProviderStatus | undefined => {
    return providerStatus.find((p) => p.id === providerId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading AI providers configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Provider Configuration</h1>
          <p className="mt-2 text-gray-600">
            Configure which AI providers are used for each service
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
            The AI provider configuration has not been saved to Firestore yet.
            Click the button below to initialize with default values (OpenAI as primary provider).
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

      {/* Provider Status */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Registered Providers</h2>
        <p className="text-sm text-gray-600 mb-6">
          Enable or disable providers. Changes take effect immediately on the mobile app (within 5 min cache).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {config?.registeredProviders.map((provider) => {
            const status = getProviderStatusById(provider.id);
            return (
              <div
                key={provider.id}
                className={`p-4 rounded-lg border-2 ${
                  provider.enabled
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{provider.name}</h3>
                    <span
                      className={`inline-block text-xs px-2 py-1 rounded-full mt-1 ${getProviderTypeColor(
                        provider.type
                      )}`}
                    >
                      {getProviderTypeLabel(provider.type)}
                    </span>
                  </div>
                  <button
                    onClick={() => toggleProviderEnabled(provider.id, !provider.enabled)}
                    disabled={saving}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      provider.enabled ? 'bg-green-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        provider.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="text-sm text-gray-600">
                  <p className="mb-1">
                    <strong>Services:</strong> {provider.supportedServices.map(getServiceIcon).join(' ')}
                  </p>
                  {provider.baseUrl && (
                    <p className="text-xs truncate">
                      <strong>URL:</strong> {provider.baseUrl}
                    </p>
                  )}
                </div>

                {/* Status indicator */}
                <div className="mt-3 pt-3 border-t border-gray-200">
                  {status ? (
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          status.available ? 'bg-green-500' : 'bg-red-500'
                        }`}
                      />
                      <span className="text-xs text-gray-500">
                        {status.available ? 'Available' : 'Unavailable'}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">Status unknown</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Service Configuration */}
      {config && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Service Configuration</h2>
          <p className="text-sm text-gray-600 mb-6">
            Configure which provider handles each service. Fallback providers are used if the primary is unavailable.
          </p>

          <div className="space-y-4">
            {ALL_SERVICE_TYPES.map((service) => {
              const serviceConfig = config.services[service];
              const isEditing = editingService === service;
              const enabledProviders = getEnabledProvidersForService(service);

              return (
                <div
                  key={service}
                  className="p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getServiceIcon(service)}</span>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {getAIServiceDisplayName(service)}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Provider: <strong>{getProviderName(serviceConfig.providerId)}</strong>
                          {' '}| {service === 'tts' ? 'Voice' : 'Model'}: <code className="bg-gray-200 px-1 rounded">{getModelDisplayLabel(serviceConfig.providerId, service, serviceConfig.model)}</code>
                        </p>
                        {serviceConfig.fallbackProviderId && (
                          <p className="text-xs text-gray-400 mt-1">
                            Fallback: {getProviderName(serviceConfig.fallbackProviderId)} ({getModelDisplayLabel(serviceConfig.fallbackProviderId, service, serviceConfig.fallbackModel || '')})
                          </p>
                        )}
                      </div>
                    </div>

                    {!isEditing && (
                      <button
                        onClick={() => {
                          setEditingService(service);
                          setPendingChanges(serviceConfig);
                        }}
                        disabled={saving}
                        className="px-3 py-1 text-sm bg-indigo-100 text-indigo-600 rounded hover:bg-indigo-200 disabled:opacity-50"
                      >
                        Configure
                      </button>
                    )}
                  </div>

                  {/* Editing form */}
                  {isEditing && (
                    <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Primary Provider
                          </label>
                          <select
                            value={pendingChanges.providerId || serviceConfig.providerId}
                            onChange={(e) => {
                              const newProviderId = e.target.value;
                              const newModel = getDefaultModel(newProviderId, service);
                              setPendingChanges({
                                ...pendingChanges,
                                providerId: newProviderId,
                                model: newModel,
                              });
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          >
                            {enabledProviders.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {service === 'tts' ? 'Voice' : 'Model'}
                          </label>
                          {(() => {
                            const currentProviderId = pendingChanges.providerId || serviceConfig.providerId;
                            const modelOptions = getModelOptions(currentProviderId, service);
                            const currentModel = pendingChanges.model || serviceConfig.model;

                            if (modelOptions.length === 0) {
                              return (
                                <input
                                  type="text"
                                  value={currentModel}
                                  onChange={(e) =>
                                    setPendingChanges({
                                      ...pendingChanges,
                                      model: e.target.value,
                                    })
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                  placeholder="Enter model name"
                                />
                              );
                            }

                            return (
                              <select
                                value={currentModel}
                                onChange={(e) =>
                                  setPendingChanges({
                                    ...pendingChanges,
                                    model: e.target.value,
                                  })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              >
                                {modelOptions.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                                {/* Show current value if not in options (legacy) */}
                                {!modelOptions.find(o => o.value === currentModel) && currentModel && (
                                  <option value={currentModel}>{currentModel} (Current)</option>
                                )}
                              </select>
                            );
                          })()}
                        </div>

                        {/* Google Cloud TTS language fallback info */}
                        {service === 'tts' && (pendingChanges.providerId || serviceConfig.providerId) === 'google' && (
                          <div className="col-span-1 md:col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-blue-900 mb-2">
                              Language-Aware Voice Mapping
                            </h4>
                            <p className="text-xs text-blue-700 mb-3">
                              Not all voice families are available for every language. The app automatically falls back to the best available family.
                            </p>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-blue-200">
                                    <th className="text-left py-1 pr-3 text-blue-800">Language</th>
                                    <th className="text-center py-1 px-2 text-blue-800">Neural2</th>
                                    <th className="text-center py-1 px-2 text-blue-800">Wavenet</th>
                                    <th className="text-center py-1 px-2 text-blue-800">Standard</th>
                                    <th className="text-center py-1 px-2 text-blue-800">Studio</th>
                                  </tr>
                                </thead>
                                <tbody className="text-blue-700">
                                  {[
                                    { lang: 'English', neural2: true, wavenet: true, standard: true, studio: true },
                                    { lang: 'Chinese', neural2: false, wavenet: true, standard: true, studio: false },
                                    { lang: 'Japanese', neural2: true, wavenet: true, standard: true, studio: false },
                                    { lang: 'Korean', neural2: true, wavenet: true, standard: true, studio: false },
                                    { lang: 'Spanish', neural2: true, wavenet: true, standard: true, studio: false },
                                    { lang: 'French', neural2: true, wavenet: true, standard: true, studio: false },
                                    { lang: 'German', neural2: true, wavenet: true, standard: true, studio: false },
                                    { lang: 'Italian', neural2: true, wavenet: true, standard: true, studio: false },
                                    { lang: 'Portuguese', neural2: true, wavenet: true, standard: true, studio: false },
                                  ].map((row) => (
                                    <tr key={row.lang} className="border-b border-blue-100">
                                      <td className="py-1 pr-3 font-medium">{row.lang}</td>
                                      <td className="text-center py-1 px-2">{row.neural2 ? '✓' : '—'}</td>
                                      <td className="text-center py-1 px-2">{row.wavenet ? '✓' : '—'}</td>
                                      <td className="text-center py-1 px-2">{row.standard ? '✓' : '—'}</td>
                                      <td className="text-center py-1 px-2">{row.studio ? '✓' : '—'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <p className="text-xs text-blue-600 mt-2">
                              {(() => {
                                const selected = pendingChanges.model || serviceConfig.model || 'Neural2';
                                if (selected === 'Neural2') {
                                  return 'Neural2 selected → Chinese users will automatically get Wavenet voices (Neural2 unavailable for Chinese).';
                                }
                                if (selected === 'Studio') {
                                  return 'Studio selected → Non-English users will automatically fall back to Wavenet → Standard.';
                                }
                                return `${selected} selected → Languages without ${selected} support will fall back to: Wavenet → Standard.`;
                              })()}
                            </p>
                          </div>
                        )}

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Fallback Provider (Optional)
                          </label>
                          <select
                            value={pendingChanges.fallbackProviderId || serviceConfig.fallbackProviderId || ''}
                            onChange={(e) => {
                              const newFallbackProviderId = e.target.value || undefined;
                              const newFallbackModel = newFallbackProviderId
                                ? getDefaultModel(newFallbackProviderId, service)
                                : undefined;
                              setPendingChanges({
                                ...pendingChanges,
                                fallbackProviderId: newFallbackProviderId,
                                fallbackModel: newFallbackModel,
                              });
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          >
                            <option value="">None</option>
                            {enabledProviders
                              .filter((p) => p.id !== (pendingChanges.providerId || serviceConfig.providerId))
                              .map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {service === 'tts' ? 'Fallback Voice' : 'Fallback Model'}
                          </label>
                          {(() => {
                            const fallbackProviderId = pendingChanges.fallbackProviderId || serviceConfig.fallbackProviderId;
                            const fallbackModel = pendingChanges.fallbackModel || serviceConfig.fallbackModel || '';
                            const modelOptions = fallbackProviderId ? getModelOptions(fallbackProviderId, service) : [];
                            const isDisabled = !fallbackProviderId;

                            if (modelOptions.length === 0 || isDisabled) {
                              return (
                                <input
                                  type="text"
                                  value={fallbackModel}
                                  onChange={(e) =>
                                    setPendingChanges({
                                      ...pendingChanges,
                                      fallbackModel: e.target.value || undefined,
                                    })
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                                  placeholder={isDisabled ? 'Select fallback provider first' : 'Enter model name'}
                                  disabled={isDisabled}
                                />
                              );
                            }

                            return (
                              <select
                                value={fallbackModel}
                                onChange={(e) =>
                                  setPendingChanges({
                                    ...pendingChanges,
                                    fallbackModel: e.target.value || undefined,
                                  })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              >
                                {modelOptions.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                                {/* Show current value if not in options (legacy) */}
                                {!modelOptions.find(o => o.value === fallbackModel) && fallbackModel && (
                                  <option value={fallbackModel}>{fallbackModel} (Current)</option>
                                )}
                              </select>
                            );
                          })()}
                        </div>
                      </div>

                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => {
                            setEditingService(null);
                            setPendingChanges({});
                          }}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() =>
                            saveServiceConfig(service, {
                              ...serviceConfig,
                              ...pendingChanges,
                            } as ServiceConfig)
                          }
                          disabled={saving}
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                        >
                          {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cost Comparison Card */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💰</span>
          <div>
            <h3 className="text-lg font-semibold text-emerald-900 mb-3">Provider Cost Comparison</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-emerald-200">
                    <th className="text-left py-2 text-emerald-800">Provider</th>
                    <th className="text-right py-2 text-emerald-800">Chat (1M tokens)</th>
                    <th className="text-right py-2 text-emerald-800">TTS (1M chars)</th>
                    <th className="text-right py-2 text-emerald-800">STT (/min)</th>
                    <th className="text-right py-2 text-emerald-800">Free Tier</th>
                  </tr>
                </thead>
                <tbody className="text-emerald-700">
                  <tr className="border-b border-emerald-100">
                    <td className="py-2 font-medium">OpenAI</td>
                    <td className="text-right">$2.50/$10</td>
                    <td className="text-right">$15</td>
                    <td className="text-right">$0.006</td>
                    <td className="text-right">None</td>
                  </tr>
                  <tr className="border-b border-emerald-100">
                    <td className="py-2 font-medium">Google Cloud</td>
                    <td className="text-right">$0.075/$0.30</td>
                    <td className="text-right">$16</td>
                    <td className="text-right">$0.016</td>
                    <td className="text-right text-green-600 font-semibold">TTS: 1M chars/mo, STT: 60 min/mo</td>
                  </tr>
                  <tr className="border-b border-emerald-100">
                    <td className="py-2 font-medium">Anthropic</td>
                    <td className="text-right">$3/$15</td>
                    <td className="text-right">-</td>
                    <td className="text-right">-</td>
                    <td className="text-right">None</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-medium">Ollama (Local)</td>
                    <td className="text-right text-green-600 font-semibold">$0</td>
                    <td className="text-right">-</td>
                    <td className="text-right">-</td>
                    <td className="text-right text-green-600 font-semibold">Unlimited</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-emerald-600 mt-3">
              Switching TTS/STT to Google Cloud can save 100% with free tier. Gemini is 30x cheaper than GPT-4o for chat.
            </p>
          </div>
        </div>
      </div>

      {/* Cache Info */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⏱️</span>
          <div>
            <h3 className="text-lg font-semibold text-amber-900 mb-2">
              Configuration Cache
            </h3>
            <p className="text-amber-800 text-sm">
              The mobile app caches this configuration for 5 minutes. Changes will take effect:
            </p>
            <ul className="list-disc list-inside text-amber-700 text-sm mt-2 space-y-1">
              <li>Within 5 minutes on the next AI operation</li>
              <li>Immediately if the app is restarted</li>
              <li>No app update required to switch providers</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
