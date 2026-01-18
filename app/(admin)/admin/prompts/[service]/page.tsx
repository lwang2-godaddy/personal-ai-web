'use client';

import { useEffect, useState, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { apiGet, apiPatch } from '@/lib/api/client';
import {
  FirestorePromptConfig,
  PromptDefinition,
  PromptVersion,
  PromptExecution,
  PromptExecutionStats,
  GetExecutionsResponse,
  PROMPT_SERVICES,
  SUPPORTED_LANGUAGES,
} from '@/lib/models/Prompt';

interface ServiceResponse {
  config: FirestorePromptConfig | null;
  versions: PromptVersion[];
}

export default function EditPromptsPage({ params }: { params: Promise<{ service: string }> }) {
  const { service } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialLanguage = searchParams.get('language') || 'en';
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [config, setConfig] = useState<FirestorePromptConfig | null>(null);
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState(initialLanguage);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Executions state
  const [executions, setExecutions] = useState<PromptExecution[]>([]);
  const [executionStats, setExecutionStats] = useState<PromptExecutionStats | null>(null);
  const [executionsLoading, setExecutionsLoading] = useState(false);

  const serviceInfo = PROMPT_SERVICES.find(s => s.id === service);

  useEffect(() => {
    fetchConfig();
  }, [service, selectedLanguage]);

  // Fetch executions when prompt is selected
  useEffect(() => {
    if (selectedPromptId) {
      fetchExecutions();
    }
  }, [selectedPromptId, selectedLanguage, service]);

  const fetchExecutions = async () => {
    if (!selectedPromptId) return;

    try {
      setExecutionsLoading(true);
      const response = await apiGet<GetExecutionsResponse>(
        `/api/admin/prompts/${service}/executions?promptId=${selectedPromptId}&language=${selectedLanguage}&limit=50`
      );
      setExecutions(response.executions);
      setExecutionStats(response.stats);
    } catch (err) {
      console.error('Failed to fetch executions:', err);
      setExecutions([]);
      setExecutionStats(null);
    } finally {
      setExecutionsLoading(false);
    }
  };

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiGet<ServiceResponse>(
        `/api/admin/prompts/${service}?language=${selectedLanguage}`
      );

      setConfig(response.config);
      setVersions(response.versions || []);

      // Select first prompt if available
      if (response.config && !selectedPromptId) {
        const firstPromptId = Object.keys(response.config.prompts)[0];
        if (firstPromptId) {
          setSelectedPromptId(firstPromptId);
          setEditedContent(response.config.prompts[firstPromptId].content);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch config';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handlePromptSelect = (promptId: string) => {
    setSelectedPromptId(promptId);
    if (config) {
      setEditedContent(config.prompts[promptId].content);
    }
    setEditNotes('');
    setSuccess(null);
  };

  const handleSavePrompt = async () => {
    if (!selectedPromptId || !config) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await apiPatch(`/api/admin/prompts/${service}`, {
        language: selectedLanguage,
        promptId: selectedPromptId,
        updates: { content: editedContent },
        notes: editNotes || `Updated ${selectedPromptId}`,
      });

      setSuccess('Prompt saved successfully!');
      fetchConfig(); // Refresh data
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save prompt';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = async () => {
    if (!config) return;

    try {
      setSaving(true);
      setError(null);

      await apiPatch(`/api/admin/prompts/${service}`, {
        language: selectedLanguage,
        enabled: !config.enabled,
      });

      setSuccess(`Prompts ${config.enabled ? 'disabled' : 'enabled'} - will ${config.enabled ? 'fallback to YAML' : 'use Firestore'}`);
      fetchConfig();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to toggle enabled';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: 'draft' | 'published' | 'archived') => {
    if (!config) return;

    try {
      setSaving(true);
      setError(null);

      await apiPatch(`/api/admin/prompts/${service}`, {
        language: selectedLanguage,
        status: newStatus,
      });

      setSuccess(`Status changed to ${newStatus}`);
      fetchConfig();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to change status';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const selectedPrompt = selectedPromptId && config ? config.prompts[selectedPromptId] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/admin/prompts"
            className="text-gray-500 hover:text-gray-700"
          >
            ← Back
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {serviceInfo?.name || service}
            </h1>
            <p className="text-gray-600">{serviceInfo?.description}</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {/* Language Selector */}
          <select
            value={selectedLanguage}
            onChange={(e) => {
              setSelectedLanguage(e.target.value);
              setSelectedPromptId(null);
            }}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            {SUPPORTED_LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.code}>
                {lang.nativeName} ({lang.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        </div>
      ) : !config ? (
        /* Not Migrated State */
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            No Firestore Configuration Found
          </h2>
          <p className="text-gray-600 mb-6">
            This service is currently using YAML files for prompts.
            <br />
            Migrate to Firestore to enable dynamic editing.
          </p>
          <p className="text-sm text-gray-500">
            To migrate, use the API endpoint POST /api/admin/prompts/migrate
            <br />
            with the YAML content parsed as a prompts object.
          </p>
        </div>
      ) : (
        /* Editor */
        <div className="grid grid-cols-12 gap-6">
          {/* Prompt List Sidebar */}
          <div className="col-span-3">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Prompts</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {Object.keys(config.prompts).length} prompt(s)
                </p>
              </div>
              <div className="divide-y divide-gray-100">
                {Object.entries(config.prompts).map(([promptId, prompt]) => (
                  <button
                    key={promptId}
                    onClick={() => handlePromptSelect(promptId)}
                    className={`w-full text-left p-3 hover:bg-gray-50 transition-colors ${
                      selectedPromptId === promptId ? 'bg-red-50 border-l-4 border-red-500' : ''
                    }`}
                  >
                    <div className="font-medium text-sm text-gray-900">{promptId}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {prompt.type} • {prompt.metadata?.model || 'default'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Config Controls */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-4 p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Configuration</h3>

              {/* Status */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={config.status}
                  onChange={(e) => handleStatusChange(e.target.value as 'draft' | 'published' | 'archived')}
                  disabled={saving}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              {/* Enabled Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Use Firestore</span>
                <button
                  onClick={handleToggleEnabled}
                  disabled={saving}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    config.enabled ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      config.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {config.enabled ? 'Using Firestore prompts' : 'Using YAML fallback'}
              </p>

              {/* Version Info */}
              <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
                <div>Version: {config.version}</div>
                <div>Last Updated: {new Date(config.lastUpdated).toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Editor Area */}
          <div className="col-span-9">
            {selectedPrompt ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                {/* Prompt Header */}
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{selectedPromptId}</h3>
                      <p className="text-sm text-gray-600">{selectedPrompt.description}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        selectedPrompt.type === 'system' ? 'bg-purple-100 text-purple-800' :
                        selectedPrompt.type === 'user' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedPrompt.type}
                      </span>
                      {selectedPrompt.metadata?.model && (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                          {selectedPrompt.metadata.model}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Metadata */}
                {selectedPrompt.metadata && (
                  <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center space-x-4 text-sm">
                    {selectedPrompt.metadata.temperature !== undefined && (
                      <span>Temperature: <strong>{selectedPrompt.metadata.temperature}</strong></span>
                    )}
                    {selectedPrompt.metadata.maxTokens !== undefined && (
                      <span>Max Tokens: <strong>{selectedPrompt.metadata.maxTokens}</strong></span>
                    )}
                    {selectedPrompt.metadata.responseFormat && (
                      <span>Format: <strong>{selectedPrompt.metadata.responseFormat}</strong></span>
                    )}
                  </div>
                )}

                {/* Content Editor */}
                <div className="p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prompt Content
                  </label>
                  <textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    rows={15}
                    className="w-full font-mono text-sm text-gray-900 bg-white border border-gray-300 rounded-md p-3 focus:ring-red-500 focus:border-red-500"
                    placeholder="Enter prompt content..."
                  />

                  {/* Variables Info */}
                  {selectedPrompt.variables && selectedPrompt.variables.length > 0 && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-md">
                      <h4 className="text-sm font-medium text-blue-800 mb-2">Variables (Handlebars)</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedPrompt.variables.map(v => (
                          <span
                            key={v.name}
                            className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
                            title={v.description}
                          >
                            {`{{${v.name}}}`} {v.required && '*'}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cultural Notes */}
                  {selectedPrompt.culturalNotes && (
                    <div className="mt-4 p-3 bg-yellow-50 rounded-md">
                      <h4 className="text-sm font-medium text-yellow-800 mb-1">Cultural Notes</h4>
                      <p className="text-sm text-yellow-700 whitespace-pre-wrap">{selectedPrompt.culturalNotes}</p>
                    </div>
                  )}

                  {/* Save Section */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-end space-x-4">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Change Notes (optional)
                        </label>
                        <input
                          type="text"
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          placeholder="Describe your changes..."
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        />
                      </div>
                      <button
                        onClick={handleSavePrompt}
                        disabled={saving || editedContent === selectedPrompt.content}
                        className={`px-6 py-2 rounded-md text-white font-medium transition-colors ${
                          saving || editedContent === selectedPrompt.content
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-red-600 hover:bg-red-700'
                        }`}
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
                Select a prompt from the sidebar to edit
              </div>
            )}

            {/* Version History */}
            {versions.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-4">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">Recent Changes</h3>
                </div>
                <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
                  {versions.map(version => (
                    <div key={version.id} className="p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">{version.promptId}</span>
                        <span className={`px-2 py-0.5 text-xs rounded ${
                          version.changeType === 'update' ? 'bg-blue-100 text-blue-700' :
                          version.changeType === 'create' ? 'bg-green-100 text-green-700' :
                          version.changeType === 'publish' ? 'bg-purple-100 text-purple-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {version.changeType}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(version.changedAt).toLocaleString()}
                        {version.changeNotes && ` • ${version.changeNotes}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Executions History */}
            {selectedPromptId && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-4">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">Recent Executions</h3>
                  {executionStats && (
                    <div className="flex gap-4 mt-2 text-sm text-gray-600">
                      <span>Total: <strong>{executionStats.totalExecutions}</strong></span>
                      <span>Avg Latency: <strong>{executionStats.avgLatencyMs}ms</strong></span>
                      <span>Cost: <strong>${executionStats.totalCostUSD.toFixed(4)}</strong></span>
                      <span>Success: <strong>{(executionStats.successRate * 100).toFixed(1)}%</strong></span>
                      <span>Users: <strong>{executionStats.uniqueUsers}</strong></span>
                    </div>
                  )}
                </div>
                {executionsLoading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600 mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">Loading executions...</p>
                  </div>
                ) : executions.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 text-sm">
                    No executions found for this prompt yet.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                    {executions.map(exec => (
                      <div key={exec.id} className="p-3 text-sm hover:bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">
                              {exec.userId.slice(0, 8)}...
                            </span>
                            <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                              {exec.model}
                            </span>
                            <span className="px-1.5 py-0.5 text-xs bg-blue-50 text-blue-600 rounded">
                              {exec.promptSource}
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 text-xs rounded ${
                            exec.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {exec.success ? 'Success' : 'Failed'}
                          </span>
                        </div>
                        <div className="text-gray-500 text-xs mt-1 flex gap-3">
                          <span>{new Date(exec.executedAt).toLocaleString()}</span>
                          <span>{exec.latencyMs}ms</span>
                          <span>{exec.totalTokens} tokens</span>
                          <span>${exec.estimatedCostUSD.toFixed(6)}</span>
                          {exec.sourceType && (
                            <span className="text-purple-600">{exec.sourceType}</span>
                          )}
                        </div>
                        <div className="mt-2 space-y-1">
                          <div className="text-xs">
                            <span className="text-gray-500">Input:</span>
                            <span className="text-gray-700 ml-1 font-mono">{exec.inputSummary}</span>
                          </div>
                          <div className="text-xs">
                            <span className="text-gray-500">Output:</span>
                            <span className="text-gray-700 ml-1 font-mono">{exec.outputSummary}</span>
                          </div>
                        </div>
                        {exec.errorMessage && (
                          <div className="mt-1 text-xs text-red-600">
                            Error: {exec.errorMessage}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
