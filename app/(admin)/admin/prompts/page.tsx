'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { apiGet, apiPost } from '@/lib/api/client';
import { FirestorePromptConfig, PROMPT_SERVICES, PROMPT_CATEGORIES, SERVICE_OUTPUT_CATEGORIES, SUPPORTED_LANGUAGES, PromptService, LIFE_FEED_PROMPT_POST_TYPES } from '@/lib/models/Prompt';
import { getOperationsForService } from '@/lib/models/ServiceOperations';
import { useTrackPage } from '@/lib/hooks/useTrackPage';
import { TRACKED_SCREENS } from '@/lib/models/BehaviorEvent';

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

interface AllLanguagesMigrationResult {
  language: string;
  languageName: string;
  result: MigrationResponse | null;
  error?: string;
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
  // Track page view
  useTrackPage(TRACKED_SCREENS.adminPrompts);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  // Handle deep-link redirect: /admin/prompts?service=X&prompt=Y -> /admin/prompts/X?prompt=Y
  useEffect(() => {
    const serviceParam = searchParams.get('service');
    if (serviceParam) {
      const promptParam = searchParams.get('prompt');
      const languageParam = searchParams.get('language') || 'en';
      const redirectUrl = promptParam
        ? `/admin/prompts/${serviceParam}?language=${languageParam}&prompt=${promptParam}`
        : `/admin/prompts/${serviceParam}?language=${languageParam}`;
      router.replace(redirectUrl);
    }
  }, [searchParams, router]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configs, setConfigs] = useState<FirestorePromptConfig[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationResponse | null>(null);
  const [migratingAllLanguages, setMigratingAllLanguages] = useState(false);
  const [allLanguagesMigrationResults, setAllLanguagesMigrationResults] = useState<AllLanguagesMigrationResult[]>([]);
  const [currentMigratingLanguage, setCurrentMigratingLanguage] = useState<string | null>(null);
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

  const handleMigrateAll = async (overwrite: boolean = false) => {
    const confirmMessage = overwrite
      ? 'This will RE-SYNC all YAML prompts to Firestore for the selected language, OVERWRITING any existing prompts. This is useful when YAML files have been updated. Continue?'
      : 'This will migrate all YAML prompts to Firestore for the selected language. Services that already exist will be skipped. Continue?';

    if (!confirm(confirmMessage)) {
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
          overwrite,
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

  const handleMigrateAllLanguages = async () => {
    if (!confirm(`This will migrate YAML prompts to Firestore for ALL ${SUPPORTED_LANGUAGES.length} languages. This may take a few minutes. Continue?`)) {
      return;
    }

    setMigratingAllLanguages(true);
    setAllLanguagesMigrationResults([]);
    setMigrationResult(null);
    setError(null);

    const results: AllLanguagesMigrationResult[] = [];

    for (const lang of SUPPORTED_LANGUAGES) {
      setCurrentMigratingLanguage(lang.code);

      try {
        const response = await apiPost<MigrationResponse>(
          '/api/admin/prompts/migrate',
          {
            language: lang.code,
            overwrite: false,
          }
        );

        results.push({
          language: lang.code,
          languageName: lang.nativeName,
          result: response,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Migration failed';
        results.push({
          language: lang.code,
          languageName: lang.nativeName,
          result: null,
          error: message,
        });
      }

      // Update results progressively
      setAllLanguagesMigrationResults([...results]);
    }

    setCurrentMigratingLanguage(null);
    setMigratingAllLanguages(false);

    // Refresh the list for current language
    await fetchPrompts();
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

  // Group services by OUTPUT category (matches /admin/insights?tab=debug structure)
  const servicesByOutputCategory = SERVICE_OUTPUT_CATEGORIES.map(category => ({
    ...category,
    services: serviceMatrix.filter(s => (category.services as readonly string[]).includes(s.id)),
  }));

  // Legacy: Group services by feature category (for reference)
  const servicesByFeatureCategory = PROMPT_CATEGORIES.map(category => ({
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
          {/* Badge Legend */}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
            <span className="text-gray-500 font-medium">Legend:</span>
            <span className="inline-flex items-center gap-1">
              <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">📱 Mobile</span>
              <span className="text-gray-400">= Used by mobile app</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">🌐 Web</span>
              <span className="text-gray-400">= Used by web app</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">📲 Client-side</span>
              <span className="text-gray-400">= Runs in app</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">☁️ Cloud Function</span>
              <span className="text-gray-400">= Runs on server</span>
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {/* Language Selector */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Language:</label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
            >
              {SUPPORTED_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.nativeName} ({lang.code})
                </option>
              ))}
            </select>
          </div>
          {/* Migrate Buttons */}
          <button
            onClick={() => handleMigrateAll(false)}
            disabled={migrating || migratingAllLanguages}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {migrating ? 'Migrating...' : `Migrate ${selectedLanguage.toUpperCase()}`}
          </button>
          <button
            onClick={() => handleMigrateAll(true)}
            disabled={migrating || migratingAllLanguages}
            className="px-4 py-2 bg-gray-400 text-white rounded-md transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed line-through"
            title="DEPRECATED: Use CLI script instead: npx tsx scripts/migrations/migrate-all-prompts-i18n.ts"
          >
            {migrating ? 'Syncing...' : `Re-sync (Deprecated)`}
          </button>
          <button
            onClick={handleMigrateAllLanguages}
            disabled={migrating || migratingAllLanguages}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {migratingAllLanguages
              ? `Migrating ${currentMigratingLanguage?.toUpperCase() || '...'} (${allLanguagesMigrationResults.length + 1}/${SUPPORTED_LANGUAGES.length})`
              : `Migrate All ${SUPPORTED_LANGUAGES.length} Languages`}
          </button>
        </div>
      </div>

      {/* Migration Result (Single Language) */}
      {migrationResult && (
        <div className={`p-4 rounded-lg border ${migrationResult.success ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
          <h3 className={`font-medium mb-2 ${migrationResult.success ? 'text-green-800' : 'text-yellow-800'}`}>
            Migration {migrationResult.success ? 'Complete' : 'Completed with Issues'} ({selectedLanguage.toUpperCase()})
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

      {/* All Languages Migration Results */}
      {allLanguagesMigrationResults.length > 0 && (
        <div className="p-4 rounded-lg border bg-white border-gray-200">
          <h3 className="font-medium mb-3 text-gray-900">
            All Languages Migration Results
            {migratingAllLanguages && (
              <span className="ml-2 text-sm text-gray-500">
                (In Progress: {allLanguagesMigrationResults.length}/{SUPPORTED_LANGUAGES.length})
              </span>
            )}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {allLanguagesMigrationResults.map((langResult) => (
              <div
                key={langResult.language}
                className={`p-3 rounded-lg border ${
                  langResult.error
                    ? 'bg-red-50 border-red-200'
                    : langResult.result?.success
                    ? 'bg-green-50 border-green-200'
                    : 'bg-yellow-50 border-yellow-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">
                    {langResult.languageName} ({langResult.language.toUpperCase()})
                  </span>
                  {langResult.error ? (
                    <span className="text-red-600 text-xs">Failed</span>
                  ) : langResult.result?.success ? (
                    <span className="text-green-600 text-xs">Success</span>
                  ) : (
                    <span className="text-yellow-600 text-xs">Partial</span>
                  )}
                </div>
                {langResult.error ? (
                  <p className="text-xs text-red-600">{langResult.error}</p>
                ) : langResult.result && (
                  <div className="text-xs space-y-1">
                    {langResult.result.migrated.length > 0 && (
                      <p className="text-green-700">
                        Migrated: {langResult.result.migrated.length}
                      </p>
                    )}
                    {langResult.result.skipped.length > 0 && (
                      <p className="text-gray-600">
                        Skipped: {langResult.result.skipped.length}
                      </p>
                    )}
                    {langResult.result.errors.length > 0 && (
                      <p className="text-red-600">
                        Errors: {langResult.result.errors.length}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Summary */}
          {!migratingAllLanguages && allLanguagesMigrationResults.length === SUPPORTED_LANGUAGES.length && (
            <div className="mt-4 pt-3 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Summary</h4>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="text-green-700">
                  Total Migrated: {allLanguagesMigrationResults.reduce((sum, r) => sum + (r.result?.migrated.length || 0), 0)}
                </span>
                <span className="text-gray-600">
                  Total Skipped: {allLanguagesMigrationResults.reduce((sum, r) => sum + (r.result?.skipped.length || 0), 0)}
                </span>
                <span className="text-red-600">
                  Total Errors: {allLanguagesMigrationResults.reduce((sum, r) => sum + (r.result?.errors.length || 0) + (r.error ? 1 : 0), 0)}
                </span>
              </div>
            </div>
          )}
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <>
          {/* Services Grouped by Output Category (matches /admin/insights?tab=debug) */}
          {servicesByOutputCategory.map(category => (
            <div key={category.id} className="space-y-4">
              {/* Category Header */}
              <div className="border-b border-gray-200 pb-2">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <span className="text-xl">{category.icon}</span>
                  {category.name}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm text-gray-500">{category.description}</p>
                  <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                    → {category.outputCollection}
                  </span>
                </div>
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
                      {/* Header Row: Icon + Name + Used By Badges */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{service.icon}</span>
                            <h3 className="text-base font-semibold text-gray-900">{service.name}</h3>
                          </div>
                          <code className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded mt-1 inline-block">
                            {service.id}
                          </code>
                        </div>
                        {/* Used By Badges - Show which apps use this service */}
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs text-gray-500 font-medium">Used by:</span>
                          <div className="flex gap-1">
                            {(service.usedBy as readonly string[])?.includes('mobile') && (
                              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                                📱 Mobile
                              </span>
                            )}
                            {(service.usedBy as readonly string[])?.includes('web') && (
                              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                                🌐 Web
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Runs On Badge - Where the processing happens */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-gray-500">Runs on:</span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          service.platform === 'mobile'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {service.platform === 'mobile' ? '📲 Client-side' : '☁️ Cloud Function'}
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
                        {/* Prompts Section - Show all prompts with types */}
                        <div className="mb-3">
                          <p className="text-xs font-medium text-gray-500 mb-1.5">
                            Prompts ({service.config ? Object.keys(service.config.prompts).length : 0}):
                          </p>
                          {service.config && (
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {Object.values(service.config.prompts).map((prompt: any) => {
                                // Get per-prompt context sources for LifeFeedGenerator
                                const promptContextSources = service.id === 'LifeFeedGenerator' && LIFE_FEED_PROMPT_POST_TYPES[prompt.id]
                                  ? LIFE_FEED_PROMPT_POST_TYPES[prompt.id].contextSources
                                  : [];
                                const contextIcons: Record<string, string> = {
                                  textNotes: '📝', voiceNotes: '🎤', photoMemories: '📸',
                                  healthData: '❤️', locationData: '📍', events: '📅',
                                  memories: '🧠', chatHistory: '💬', moodEntries: '😊',
                                };

                                return (
                                  <div key={prompt.id} className="flex items-center gap-1.5">
                                    {/* Type Badge */}
                                    <span
                                      className={`px-1.5 py-0.5 text-xs rounded shrink-0 ${
                                        prompt.type === 'system'
                                          ? 'bg-purple-100 text-purple-700'
                                          : prompt.type === 'user'
                                          ? 'bg-blue-100 text-blue-700'
                                          : 'bg-yellow-100 text-yellow-700'
                                      }`}
                                    >
                                      {prompt.type}
                                    </span>
                                    {/* Prompt ID */}
                                    <span className="text-xs text-gray-600 truncate" title={prompt.description || prompt.id}>
                                      {prompt.id}
                                    </span>
                                    {/* Per-prompt context sources (LifeFeedGenerator only) */}
                                    {promptContextSources.length > 0 && (
                                      <span className="text-xs text-gray-400 ml-auto shrink-0" title={`Uses: ${promptContextSources.join(', ')}`}>
                                        {promptContextSources.map((c: string) => contextIcons[c] || '📦').join('')}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {!service.config && (
                            <p className="text-xs text-gray-400 italic">Not migrated yet</p>
                          )}
                        </div>

                        {/* Stats Row */}
                        <div className="flex items-center justify-between text-sm mb-3">
                          <div className="flex items-center gap-4">
                            <span className="text-gray-600">
                              <span className="font-medium">{executions.toLocaleString()}</span> runs
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${costBadgeClass}`}>
                            ${cost.toFixed(4)}
                          </span>
                        </div>

                        {/* Operations Used */}
                        {(() => {
                          const operations = getOperationsForService(service.id);
                          const maxToShow = 4;
                          const visibleOps = operations.slice(0, maxToShow);
                          const hiddenCount = operations.length - maxToShow;

                          return operations.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs font-medium text-gray-500 mb-1.5">Operations Used:</p>
                              <div className="flex flex-wrap gap-1">
                                {visibleOps.map((op) => (
                                  <span
                                    key={op.operation}
                                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-700"
                                    title={op.label}
                                  >
                                    <span className="mr-1">{op.icon}</span>
                                    {op.label}
                                  </span>
                                ))}
                                {hiddenCount > 0 && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-50 text-gray-500">
                                    +{hiddenCount} more
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Context Sources */}
                        {(() => {
                          const contextSources = (service as any).contextSources || [];
                          const collectionIcons: Record<string, string> = {
                            textNotes: '📝',
                            voiceNotes: '🎤',
                            photoMemories: '📸',
                            healthData: '❤️',
                            locationData: '📍',
                            events: '📅',
                            memories: '🧠',
                            chatHistory: '💬',
                            moodEntries: '😊',
                          };

                          return (
                            <div className="mb-3">
                              <p className="text-xs font-medium text-gray-500 mb-1.5">Context Sources:</p>
                              {contextSources.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {contextSources.slice(0, 4).map((src: any) => (
                                    <span
                                      key={src.collection}
                                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700 cursor-help"
                                      title={`${src.description}\n\nTrigger: ${src.trigger}`}
                                    >
                                      <span className="mr-1">{collectionIcons[src.collection] || '📦'}</span>
                                      {src.collection}
                                    </span>
                                  ))}
                                  {contextSources.length > 4 && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-50 text-gray-500">
                                      +{contextSources.length - 4} more
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400 italic">Direct user input (no collections)</span>
                              )}
                            </div>
                          );
                        })()}

                        {/* View Cost Breakdown Link */}
                        <Link
                          href={`/admin/usage?service=${service.id}`}
                          className="block text-xs text-indigo-600 hover:text-indigo-800 mb-3"
                        >
                          → View cost breakdown for this service
                        </Link>

                        {/* Status and Source Badges */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {/* Data Source Badge */}
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                service.isMigrated
                                  ? service.enabled
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-orange-100 text-orange-800'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {service.isMigrated
                                ? service.enabled
                                  ? '🔥 Firestore'
                                  : '📄 YAML Fallback'
                                : '📄 YAML Only'}
                            </span>
                            {/* Status Badge */}
                            {service.isMigrated && (
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  service.status === 'published'
                                    ? 'bg-blue-100 text-blue-800'
                                    : service.status === 'draft'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {service.status}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Version and Last Updated */}
                        {service.config && (
                          <div className="text-xs text-gray-500 mb-3">
                            <span>v{service.config.version}</span>
                            <span className="mx-1">•</span>
                            <span>Updated {new Date(service.config.lastUpdated).toLocaleDateString()}</span>
                          </div>
                        )}

                        {/* Action Button */}
                        <Link
                          href={`/admin/prompts/${service.id}?language=${selectedLanguage}`}
                          className="block w-full text-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm font-medium"
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

          {/* Service Categorization Info */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <h3 className="text-indigo-800 font-medium mb-2 flex items-center gap-2">
              <span>📊</span> Understanding Service Categories
            </h3>
            <p className="text-indigo-700 text-sm mb-3">
              Services are grouped by their <strong>output destination</strong> (where they write data), matching the structure in{' '}
              <Link href="/admin/insights?tab=debug" className="underline hover:text-indigo-900">
                Insights Debug Tab
              </Link>.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              <div className="bg-white/60 rounded p-2">
                <span className="font-medium text-indigo-800">Context Sources</span>
                <p className="text-indigo-600">Collections the service READS from</p>
              </div>
              <div className="bg-white/60 rounded p-2">
                <span className="font-medium text-indigo-800">Output Collection</span>
                <p className="text-indigo-600">Where the service WRITES to</p>
              </div>
              <div className="bg-white/60 rounded p-2">
                <span className="font-medium text-indigo-800">Trigger</span>
                <p className="text-indigo-600">What causes data to be created</p>
              </div>
            </div>
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

          {/* CLI Migration Script Panel */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h3 className="text-amber-800 font-medium mb-2 flex items-center gap-2">
              <span>🔧</span> CLI Migration Script (Recommended)
            </h3>
            <p className="text-amber-700 text-sm mb-3">
              To add new prompts or services, update the migration script and run it. This is the <strong>source of truth</strong> for all prompts:
            </p>
            <div className="bg-gray-900 text-gray-100 rounded-lg p-3 font-mono text-xs overflow-x-auto mb-3">
              <div className="text-green-400"># Navigate to personal-ai-web directory first</div>
              <div className="text-gray-300">cd personal-ai-web</div>
              <div className="text-gray-300 mt-2"># Run the i18n migration script (creates/updates all languages)</div>
              <div className="text-gray-300">npx tsx scripts/migrations/migrate-all-prompts-i18n.ts</div>
            </div>
            <div className="text-amber-700 text-sm space-y-1">
              <p><strong>Source:</strong> <code className="bg-amber-100 px-1 rounded text-xs">personal-ai-web/scripts/migrations/migrate-all-prompts-i18n.ts</code></p>
              <p><strong>Target:</strong> Firestore <code className="bg-amber-100 px-1 rounded text-xs">promptConfigs/[lang]/services/[service]</code></p>
              <p><strong>When to use:</strong> When adding new services, prompts, or translations. Edit the script first, then run it.</p>
            </div>
            <div className="mt-3 p-2 bg-amber-100 rounded text-amber-800 text-xs">
              <strong>Note:</strong> The &quot;Re-sync from YAML&quot; button above is deprecated. YAML files are frozen fallbacks only. Use this CLI script for all prompt changes.
            </div>
          </div>

          {/* How To Add Guide */}
          <details className="bg-white rounded-lg shadow-sm border border-gray-200">
            <summary className="p-4 cursor-pointer hover:bg-gray-50 font-semibold text-gray-900 flex items-center gap-2">
              <span>📖</span> How to Add AI Features, Services, Types & Prompts
            </summary>
            <div className="p-4 pt-0 space-y-6 text-sm">
              {/* Type Badges Legend */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Prompt Types</h4>
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 text-xs rounded bg-purple-100 text-purple-700">system</span>
                    <span className="text-gray-600">Configuration/setup prompts for AI behavior</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700">user</span>
                    <span className="text-gray-600">User-facing prompts that generate output</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-700">function</span>
                    <span className="text-gray-600">Tool/function call prompts</span>
                  </div>
                </div>
              </div>

              {/* Add New AI Feature */}
              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="font-semibold text-gray-900 mb-2">1. Add New AI Feature</h4>
                <p className="text-gray-600 mb-2">AI Features match the &quot;AI Features&quot; section in mobile app Settings (ProfileScreen).</p>
                <div className="bg-gray-900 text-gray-100 rounded-lg p-3 font-mono text-xs overflow-x-auto">
                  <div className="text-green-400">// personal-ai-web/lib/models/Prompt.ts</div>
                  <div className="text-gray-300">export const PROMPT_CATEGORIES = [</div>
                  <div className="text-gray-300 pl-4">...</div>
                  <div className="text-yellow-300 pl-4">{`{ id: 'new_feature', name: 'New Feature', icon: '🆕', description: 'Your description' },`}</div>
                  <div className="text-gray-300">] as const;</div>
                </div>
              </div>

              {/* Add New Service */}
              <div className="border-l-4 border-green-500 pl-4">
                <h4 className="font-semibold text-gray-900 mb-2">2. Add New Service</h4>
                <p className="text-gray-600 mb-2">Services are the AI components that use prompts. Requires changes in 3 files:</p>

                <div className="space-y-3">
                  <div>
                    <p className="text-gray-700 font-medium mb-1">Step A: Register service → YAML mapping</p>
                    <div className="bg-gray-900 text-gray-100 rounded-lg p-3 font-mono text-xs overflow-x-auto">
                      <div className="text-green-400">// personal-ai-web/lib/models/Prompt.ts</div>
                      <div className="text-gray-300">export const SERVICE_FILE_MAP = {`{`}</div>
                      <div className="text-gray-300 pl-4">...</div>
                      <div className="text-yellow-300 pl-4">NewService: &apos;newService.yaml&apos;,</div>
                      <div className="text-gray-300">{`}`};</div>
                    </div>
                  </div>

                  <div>
                    <p className="text-gray-700 font-medium mb-1">Step B: Add to PROMPT_SERVICES array</p>
                    <div className="bg-gray-900 text-gray-100 rounded-lg p-3 font-mono text-xs overflow-x-auto">
                      <div className="text-green-400">// personal-ai-web/lib/models/Prompt.ts</div>
                      <div className="text-gray-300">export const PROMPT_SERVICES = [</div>
                      <div className="text-gray-300 pl-4">...</div>
                      <div className="text-yellow-300 pl-4">{`{`}</div>
                      <div className="text-yellow-300 pl-6">id: &apos;NewService&apos;,</div>
                      <div className="text-yellow-300 pl-6">name: &apos;Display Name&apos;,</div>
                      <div className="text-yellow-300 pl-6">category: &apos;your_ai_feature&apos; as PromptCategoryId,  <span className="text-gray-500">// matches AI Feature id</span></div>
                      <div className="text-yellow-300 pl-6">icon: &apos;🆕&apos;,</div>
                      <div className="text-yellow-300 pl-6">description: &apos;What this service does&apos;,</div>
                      <div className="text-yellow-300 pl-6">trigger: &apos;When X happens&apos;,</div>
                      <div className="text-yellow-300 pl-6">platform: &apos;server&apos; as const,</div>
                      <div className="text-yellow-300 pl-6">example: &apos;Example output&apos;,</div>
                      <div className="text-yellow-300 pl-4">{`}`},</div>
                      <div className="text-gray-300">];</div>
                    </div>
                  </div>

                  <div>
                    <p className="text-gray-700 font-medium mb-1">Step C: Register in PromptLoader (3 locations)</p>
                    <div className="bg-gray-900 text-gray-100 rounded-lg p-3 font-mono text-xs overflow-x-auto">
                      <div className="text-green-400">// PersonalAIApp/firebase/functions/src/config/prompts/loader.ts</div>
                      <div className="text-gray-300">const fileMap = {`{`}</div>
                      <div className="text-gray-300 pl-4">...</div>
                      <div className="text-yellow-300 pl-4">&apos;NewService&apos;: &apos;newService.yaml&apos;,</div>
                      <div className="text-gray-300">{`}`};</div>
                      <div className="text-gray-500 mt-2">// Update fileMap in loadPrompts(), getPrompt(), and reloadPrompts()</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Add New Prompts */}
              <div className="border-l-4 border-purple-500 pl-4">
                <h4 className="font-semibold text-gray-900 mb-2">3. Add New Prompts</h4>
                <p className="text-gray-600 mb-2">Add prompts directly in the i18n migration script (source of truth), then run it.</p>

                <div className="space-y-3">
                  <div>
                    <p className="text-gray-700 font-medium mb-1">Step A: Add to migration script</p>
                    <div className="bg-gray-900 text-gray-100 rounded-lg p-3 font-mono text-xs overflow-x-auto">
                      <div className="text-green-400">// personal-ai-web/scripts/migrations/migrate-all-prompts-i18n.ts</div>
                      <div className="text-gray-300 mt-2">// 1. Add translations for all languages in the translations object</div>
                      <div className="text-gray-300">const translations: Record&lt;string, Translations&gt; = {`{`}</div>
                      <div className="text-gray-300 pl-2">en: {`{`}</div>
                      <div className="text-yellow-300 pl-4">new_prompt_content: &apos;Your prompt content here...&apos;,</div>
                      <div className="text-gray-300 pl-2">{`}`},</div>
                      <div className="text-gray-300 pl-2">zh: {`{`}</div>
                      <div className="text-yellow-300 pl-4">new_prompt_content: &apos;你的提示内容...&apos;,</div>
                      <div className="text-gray-300 pl-2">{`}`},</div>
                      <div className="text-gray-300 pl-2">// ... other languages</div>
                      <div className="text-gray-300">{`}`};</div>
                      <div className="text-gray-300 mt-2">// 2. Add to the builder function for your service</div>
                      <div className="text-gray-300">function buildYourServiceDoc(lang: string, t: Translations) {`{`}</div>
                      <div className="text-gray-300 pl-2">return {`{`}</div>
                      <div className="text-gray-300 pl-4">prompts: {`{`}</div>
                      <div className="text-yellow-300 pl-6">new_prompt: {`{`}</div>
                      <div className="text-yellow-300 pl-8">id: &apos;new-prompt-id&apos;,</div>
                      <div className="text-yellow-300 pl-8">service: &apos;YourService&apos;,</div>
                      <div className="text-yellow-300 pl-8">type: &apos;system&apos;,</div>
                      <div className="text-yellow-300 pl-8">content: t.new_prompt_content,</div>
                      <div className="text-yellow-300 pl-8">metadata: {`{`} model: &apos;gpt-4o-mini&apos;, temperature: 0.7 {`}`}</div>
                      <div className="text-yellow-300 pl-6">{`}`},</div>
                      <div className="text-gray-300 pl-4">{`}`}</div>
                      <div className="text-gray-300 pl-2">{`}`};</div>
                      <div className="text-gray-300">{`}`}</div>
                    </div>
                  </div>

                  <div>
                    <p className="text-gray-700 font-medium mb-1">Step B: Run migration script</p>
                    <div className="bg-gray-900 text-gray-100 rounded-lg p-3 font-mono text-xs overflow-x-auto">
                      <div className="text-green-400"># From personal-ai-web directory</div>
                      <div className="text-gray-300">cd personal-ai-web</div>
                      <div className="text-gray-300">npx tsx scripts/migrations/migrate-all-prompts-i18n.ts</div>
                    </div>
                    <p className="text-gray-500 text-xs mt-2">
                      This creates/updates Firestore documents at <code className="bg-gray-100 px-1 rounded">promptConfigs/[lang]/services/[service]</code> for all 9 languages.
                    </p>
                  </div>
                </div>
              </div>

              {/* Add New Type */}
              <div className="border-l-4 border-yellow-500 pl-4">
                <h4 className="font-semibold text-gray-900 mb-2">4. Add New Prompt Type (Advanced)</h4>
                <p className="text-gray-600 mb-2">Currently supports: system, user, function. To add a new type:</p>
                <div className="bg-gray-900 text-gray-100 rounded-lg p-3 font-mono text-xs overflow-x-auto">
                  <div className="text-green-400">// personal-ai-web/lib/models/Prompt.ts</div>
                  <div className="text-gray-300">export interface PromptDefinition {`{`}</div>
                  <div className="text-gray-300 pl-4">...</div>
                  <div className="text-yellow-300 pl-4">type: &apos;system&apos; | &apos;user&apos; | &apos;function&apos; | &apos;new_type&apos;;</div>
                  <div className="text-gray-300">{`}`}</div>
                  <div className="text-gray-500 mt-2">// Also update page.tsx badge colors (lines ~453-459)</div>
                </div>
              </div>

              {/* Use in Cloud Functions */}
              <div className="border-l-4 border-indigo-500 pl-4">
                <h4 className="font-semibold text-gray-900 mb-2">5. Use Prompts in Cloud Functions</h4>
                <div className="bg-gray-900 text-gray-100 rounded-lg p-3 font-mono text-xs overflow-x-auto">
                  <div className="text-green-400">// In your Cloud Function</div>
                  <div className="text-gray-300">import {`{`} PromptLoader {`}`} from &apos;../../config/prompts&apos;;</div>
                  <div className="text-gray-300 mt-2">const promptLoader = PromptLoader.getInstance();</div>
                  <div className="text-gray-300">await promptLoader.loadPrompts(&apos;NewService&apos;, &apos;en&apos;);</div>
                  <div className="text-gray-300 mt-2">const prompt = promptLoader.getPrompt(</div>
                  <div className="text-gray-300 pl-2">&apos;NewService&apos;,</div>
                  <div className="text-gray-300 pl-2">&apos;system&apos;,  <span className="text-gray-500">// prompt ID from YAML</span></div>
                  <div className="text-gray-300 pl-2">{`{`} language: &apos;en&apos;, variables: {`{`} context: &apos;...&apos; {`}`} {`}`}</div>
                  <div className="text-gray-300">);</div>
                  <div className="text-gray-300 mt-2">// Use prompt.content and prompt.metadata</div>
                </div>
              </div>

              {/* File Locations Summary */}
              <div className="bg-gray-100 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">📁 Key File Locations</h4>
                <table className="w-full text-xs">
                  <tbody>
                    <tr className="border-b border-gray-200">
                      <td className="py-1 text-gray-600">AI Features & Services</td>
                      <td className="py-1 font-mono text-gray-900">personal-ai-web/lib/models/Prompt.ts</td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="py-1 text-gray-600">Migration Script (Source of Truth)</td>
                      <td className="py-1 font-mono text-gray-900">personal-ai-web/scripts/migrations/migrate-all-prompts-i18n.ts</td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="py-1 text-gray-600">PromptLoader (Cloud Functions)</td>
                      <td className="py-1 font-mono text-gray-900">PersonalAIApp/firebase/functions/src/config/prompts/loader.ts</td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="py-1 text-gray-600">YAML Prompts (Deprecated Fallback)</td>
                      <td className="py-1 font-mono text-gray-900 text-gray-500">PersonalAIApp/firebase/functions/src/config/prompts/locales/</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-gray-600">Full Documentation</td>
                      <td className="py-1 font-mono text-gray-900">PersonalAIApp/firebase/functions/docs/PROMPT_CONFIGURATION.md</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </details>

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
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
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
