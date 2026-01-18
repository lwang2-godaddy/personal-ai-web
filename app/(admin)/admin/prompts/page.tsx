'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { apiGet, apiPost } from '@/lib/api/client';
import { FirestorePromptConfig, PROMPT_SERVICES, PROMPT_CATEGORIES, SUPPORTED_LANGUAGES } from '@/lib/models/Prompt';

interface PromptsResponse {
  configs: FirestorePromptConfig[];
  total: number;
  services: typeof PROMPT_SERVICES;
  languages: typeof SUPPORTED_LANGUAGES;
}

interface MigrationResponse {
  success: boolean;
  migrated: string[];
  skipped: string[];
  errors: { service: string; error: string }[];
}

interface ServiceStats {
  service: string;
  totalCost: number;
  executionCount: number;
  avgCostPerExecution: number;
}

interface StatsResponse {
  services: ServiceStats[];
  period: {
    startDate: string;
    endDate: string;
  };
  totals: {
    totalCost: number;
    totalExecutions: number;
  };
}

export default function AdminPromptsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configs, setConfigs] = useState<FirestorePromptConfig[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationResponse | null>(null);
  const [serviceStats, setServiceStats] = useState<Map<string, ServiceStats>>(new Map());

  useEffect(() => {
    fetchPrompts();
    fetchStats();
  }, [selectedLanguage]);

  const fetchStats = async () => {
    try {
      const response = await apiGet<StatsResponse>('/api/admin/prompts/stats?days=30');
      const statsMap = new Map<string, ServiceStats>();
      response.services.forEach((stat) => {
        statsMap.set(stat.service, stat);
      });
      setServiceStats(statsMap);
    } catch (err: unknown) {
      // Stats fetch is non-critical, just log the error
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleMigrateAll = async () => {
    if (!confirm('This will migrate all YAML prompts to Firestore. Services that already exist will be skipped. Continue?')) {
      return;
    }

    setMigrating(true);
    setMigrationResult(null);
    setError(null);

    try {
      const response = await apiPost<MigrationResponse>(
        '/api/admin/prompts/migrate',
        {
          language: selectedLanguage,
          overwrite: false,
        }
      );

      setMigrationResult(response);

      // Refresh the list
      await fetchPrompts();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Migration failed';
      setError(message);
    } finally {
      setMigrating(false);
    }
  };

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

  // Group services by category
  const servicesByCategory = PROMPT_CATEGORIES.map(category => ({
    ...category,
    services: serviceMatrix.filter(s => s.category === category.id),
  }));

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
          {/* Migrate Button */}
          <button
            onClick={handleMigrateAll}
            disabled={migrating}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {migrating ? 'Migrating...' : 'Migrate YAML to Firestore'}
          </button>
        </div>
      </div>

      {/* Migration Result */}
      {migrationResult && (
        <div className={`p-4 rounded-lg border ${migrationResult.success ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
          <h3 className={`font-medium mb-2 ${migrationResult.success ? 'text-green-800' : 'text-yellow-800'}`}>
            Migration {migrationResult.success ? 'Complete' : 'Completed with Issues'}
          </h3>
          <div className="text-sm space-y-1">
            {migrationResult.migrated.length > 0 && (
              <p className="text-green-700">
                Migrated: {migrationResult.migrated.join(', ')}
              </p>
            )}
            {migrationResult.skipped.length > 0 && (
              <p className="text-gray-600">
                Skipped (already exist): {migrationResult.skipped.join(', ')}
              </p>
            )}
            {migrationResult.errors.length > 0 && (
              <div className="text-red-700">
                Errors:
                <ul className="list-disc list-inside ml-2">
                  {migrationResult.errors.map((err, i) => (
                    <li key={i}>{err.service}: {err.error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

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
          {/* Services Grouped by Category */}
          {servicesByCategory.map(category => (
            <div key={category.id} className="space-y-4">
              {/* Category Header */}
              <div className="border-b border-gray-200 pb-2">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <span className="text-xl">{category.icon}</span>
                  {category.name}
                </h2>
                <p className="text-sm text-gray-500 mt-1">{category.description}</p>
              </div>

              {/* Services Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.services.map(service => {
                  const stats = serviceStats.get(service.id);
                  const cost = stats?.totalCost ?? 0;
                  const executions = stats?.executionCount ?? 0;
                  const costBadgeClass = cost < 1
                    ? 'bg-green-100 text-green-800'
                    : cost < 10
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800';

                  return (
                    <div
                      key={service.id}
                      className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow"
                    >
                      {/* Header Row: Icon + Name + Platform Badge */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{service.icon}</span>
                          <h3 className="text-base font-semibold text-gray-900">{service.name}</h3>
                        </div>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            service.platform === 'mobile'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-purple-100 text-purple-700'
                          }`}
                        >
                          {service.platform === 'mobile' ? '📱 Mobile' : '☁️ Server'}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-gray-600 mb-3">{service.description}</p>

                      {/* Trigger */}
                      <div className="flex items-start gap-2 mb-2">
                        <span className="text-yellow-500">⚡</span>
                        <span className="text-sm text-gray-600">{service.trigger}</span>
                      </div>

                      {/* Example */}
                      <div className="flex items-start gap-2 mb-4">
                        <span className="text-gray-400">💭</span>
                        <span className="text-sm text-gray-500 italic">&quot;{service.example}&quot;</span>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-gray-100 pt-3 mt-3">
                        {/* Stats Row */}
                        <div className="flex items-center justify-between text-sm mb-3">
                          <div className="flex items-center gap-4">
                            <span className="text-gray-600">
                              <span className="font-medium">{service.config ? Object.keys(service.config.prompts).length : 0}</span> prompts
                            </span>
                            <span className="text-gray-600">
                              <span className="font-medium">{executions.toLocaleString()}</span> runs
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${costBadgeClass}`}>
                            ${cost.toFixed(4)}
                          </span>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center justify-between mb-3">
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
                            {service.isMigrated ? (
                              <>
                                {service.status === 'published' && '✅ '}
                                {service.status === 'draft' && '📝 '}
                                {service.status === 'archived' && '📦 '}
                                {service.status}
                              </>
                            ) : (
                              'YAML Only'
                            )}
                          </span>
                          {service.config && (
                            <span className={`text-xs ${service.enabled ? 'text-green-600' : 'text-orange-600'}`}>
                              {service.enabled ? 'Firestore' : 'YAML Fallback'}
                            </span>
                          )}
                        </div>

                        {/* Action Button */}
                        <Link
                          href={`/admin/prompts/${service.id}?language=${selectedLanguage}`}
                          className="block w-full text-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
                        >
                          {service.isMigrated ? 'Edit Prompts' : 'Migrate & Edit'}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

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
