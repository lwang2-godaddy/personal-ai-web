'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { apiGet } from '@/lib/api/client';
import { FirestorePromptConfig, PROMPT_SERVICES, SUPPORTED_LANGUAGES } from '@/lib/models/Prompt';

interface PromptsResponse {
  configs: FirestorePromptConfig[];
  total: number;
  services: typeof PROMPT_SERVICES;
  languages: typeof SUPPORTED_LANGUAGES;
}

export default function AdminPromptsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configs, setConfigs] = useState<FirestorePromptConfig[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');

  useEffect(() => {
    fetchPrompts();
  }, [selectedLanguage]);

  const fetchPrompts = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiGet<PromptsResponse>(
        `/api/admin/prompts?language=${selectedLanguage}`
      );

      setConfigs(response.configs || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch prompts';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Build a matrix of services with their migration status
  const serviceMatrix = PROMPT_SERVICES.map(service => {
    const config = configs.find(c => c.service === service.id);
    return {
      ...service,
      config,
      isMigrated: !!config,
      status: config?.status || 'not_migrated',
      enabled: config?.enabled ?? false,
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prompt Management</h1>
          <p className="text-gray-600 mt-1">
            Manage AI prompts dynamically without app updates
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Language Selector */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Language:</label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-red-500 focus:border-red-500"
            >
              {SUPPORTED_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.nativeName} ({lang.code})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        </div>
      ) : (
        <>
          {/* Services Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {serviceMatrix.map(service => (
              <div
                key={service.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{service.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                  </div>
                  {/* Status Badge */}
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      service.status === 'published'
                        ? 'bg-green-100 text-green-800'
                        : service.status === 'draft'
                        ? 'bg-yellow-100 text-yellow-800'
                        : service.status === 'archived'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {service.isMigrated ? service.status : 'YAML Only'}
                  </span>
                </div>

                {/* Config Details */}
                {service.config && (
                  <div className="mt-4 space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Prompts:</span>
                      <span className="font-medium">
                        {Object.keys(service.config.prompts).length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Version:</span>
                      <span className="font-medium">{service.config.version}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Updated:</span>
                      <span className="font-medium">
                        {new Date(service.config.lastUpdated).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Source:</span>
                      <span className={`font-medium ${service.enabled ? 'text-green-600' : 'text-orange-600'}`}>
                        {service.enabled ? 'Firestore' : 'YAML Fallback'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-4 flex space-x-2">
                  <Link
                    href={`/admin/prompts/${service.id}?language=${selectedLanguage}`}
                    className="flex-1 text-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
                  >
                    {service.isMigrated ? 'Edit Prompts' : 'Migrate & Edit'}
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Info Panel */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-blue-800 font-medium mb-2">How Prompt Loading Works</h3>
            <ul className="text-blue-700 text-sm space-y-1">
              <li>1. Cloud Functions first check Firestore for prompts</li>
              <li>2. If not found or disabled, falls back to YAML files</li>
              <li>3. Prompts are cached for 1 hour (TTL-based)</li>
              <li>4. Use the &quot;Enabled&quot; toggle to switch between Firestore and YAML</li>
            </ul>
          </div>

          {/* Language Status */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Language Status</h3>
            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3">
              {SUPPORTED_LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => setSelectedLanguage(lang.code)}
                  className={`p-3 rounded-lg border text-center transition-colors ${
                    selectedLanguage === lang.code
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">{lang.code.toUpperCase()}</div>
                  <div className="text-xs text-gray-500">{lang.nativeName}</div>
                  <div className={`text-xs mt-1 ${
                    lang.status === 'complete' ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    {lang.status === 'complete' ? 'Complete' : 'Pending'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
