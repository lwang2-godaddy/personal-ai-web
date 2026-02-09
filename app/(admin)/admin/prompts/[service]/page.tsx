'use client';

import { useEffect, useState, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { apiGet, apiPatch } from '@/lib/api/client';
import { useTrackPage } from '@/lib/hooks/useTrackPage';
import { TRACKED_SCREENS } from '@/lib/models/BehaviorEvent';
import {
  FirestorePromptConfig,
  PromptDefinition,
  PromptVersion,
  PromptExecution,
  PromptExecutionStats,
  GetExecutionsResponse,
  PROMPT_SERVICES,
  SUPPORTED_LANGUAGES,
  PromptVariable,
  getLifeFeedPromptPostType,
  LIFE_FEED_PROMPT_POST_TYPES,
  CONTEXT_SOURCES,
} from '@/lib/models/Prompt';
import {
  PROMPT_TEMPLATES,
  TEMPLATE_CATEGORIES,
  PromptTemplate,
} from '@/lib/data/promptTemplates';

interface ServiceResponse {
  config: FirestorePromptConfig | null;
  versions: PromptVersion[];
}

export default function EditPromptsPage({ params }: { params: Promise<{ service: string }> }) {
  // Track page view
  useTrackPage(TRACKED_SCREENS.adminPromptDetail);

  const { service } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialLanguage = searchParams.get('language') || 'en';
  const initialPromptId = searchParams.get('prompt') || null;
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
  const [editedModel, setEditedModel] = useState('gpt-4o-mini');
  const [editedTemperature, setEditedTemperature] = useState(0.7);
  const [editedMaxTokens, setEditedMaxTokens] = useState(1000);
  const [editNotes, setEditNotes] = useState('');

  // Executions state
  const [executions, setExecutions] = useState<PromptExecution[]>([]);
  const [executionStats, setExecutionStats] = useState<PromptExecutionStats | null>(null);
  const [executionsLoading, setExecutionsLoading] = useState(false);

  // New prompt modal state
  const [showNewPromptModal, setShowNewPromptModal] = useState(false);
  const [newPromptId, setNewPromptId] = useState('');
  const [newPromptType, setNewPromptType] = useState<'system' | 'user' | 'function'>('system');
  const [newPromptContent, setNewPromptContent] = useState('');
  const [newPromptDescription, setNewPromptDescription] = useState('');
  const [newPromptModel, setNewPromptModel] = useState('gpt-4o-mini');
  const [newPromptTemperature, setNewPromptTemperature] = useState(0.7);
  const [newPromptMaxTokens, setNewPromptMaxTokens] = useState(1000);
  const [newPromptVariables, setNewPromptVariables] = useState<PromptVariable[]>([]);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [templateCategory, setTemplateCategory] = useState('chat');

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

      // Select prompt from URL or first available
      if (response.config && !selectedPromptId) {
        // Check if URL has a specific prompt to select
        const promptToSelect = initialPromptId && response.config.prompts[initialPromptId]
          ? initialPromptId
          : Object.keys(response.config.prompts)[0];
        if (promptToSelect) {
          setSelectedPromptId(promptToSelect);
          setEditedContent(response.config.prompts[promptToSelect].content);
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
      const prompt = config.prompts[promptId];
      setEditedContent(prompt.content);
      setEditedModel(prompt.metadata?.model || 'gpt-4o-mini');
      setEditedTemperature(prompt.metadata?.temperature ?? 0.7);
      setEditedMaxTokens(prompt.metadata?.maxTokens ?? 1000);
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
        updates: {
          content: editedContent,
          metadata: {
            ...config.prompts[selectedPromptId].metadata,
            model: editedModel,
            temperature: editedTemperature,
            maxTokens: editedMaxTokens,
          },
        },
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

  // Reset new prompt form
  const resetNewPromptForm = () => {
    setNewPromptId('');
    setNewPromptType('system');
    setNewPromptContent('');
    setNewPromptDescription('');
    setNewPromptModel('gpt-4o-mini');
    setNewPromptTemperature(0.7);
    setNewPromptMaxTokens(1000);
    setNewPromptVariables([]);
    setShowTemplatePicker(false);
  };

  // Handle creating a new prompt
  const handleCreateNewPrompt = async () => {
    if (!newPromptId.trim()) {
      setError('Prompt ID is required');
      return;
    }
    if (config?.prompts[newPromptId]) {
      setError('Prompt ID already exists');
      return;
    }
    if (!newPromptContent.trim()) {
      setError('Prompt content is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const newPrompt: PromptDefinition = {
        id: newPromptId,
        service: service,
        type: newPromptType,
        content: newPromptContent,
        description: newPromptDescription || undefined,
        variables: newPromptVariables.length > 0 ? newPromptVariables : undefined,
        metadata: {
          model: newPromptModel,
          temperature: newPromptTemperature,
          maxTokens: newPromptMaxTokens,
        },
      };

      await apiPatch(`/api/admin/prompts/${service}`, {
        language: selectedLanguage,
        promptId: newPromptId,
        updates: newPrompt,
        notes: `Created new prompt: ${newPromptId}`,
      });

      setSuccess(`Prompt "${newPromptId}" created successfully!`);
      setShowNewPromptModal(false);
      resetNewPromptForm();
      fetchConfig();
      setSelectedPromptId(newPromptId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create prompt';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  // Handle deleting a prompt
  const handleDeletePrompt = async (promptId: string) => {
    if (!confirm(`Delete prompt "${promptId}"? This cannot be undone.`)) return;
    if (!config) return;

    try {
      setSaving(true);
      setError(null);

      // Create updated prompts without the deleted one
      const updatedPrompts = { ...config.prompts };
      delete updatedPrompts[promptId];

      // Update the entire config
      await apiPatch(`/api/admin/prompts/${service}`, {
        language: selectedLanguage,
        prompts: updatedPrompts,
        notes: `Deleted prompt: ${promptId}`,
      });

      setSuccess(`Prompt "${promptId}" deleted successfully!`);

      // Clear selection if deleted prompt was selected
      if (selectedPromptId === promptId) {
        setSelectedPromptId(null);
        setEditedContent('');
      }

      fetchConfig();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete prompt';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  // Handle duplicating a prompt
  const handleDuplicatePrompt = (promptId: string) => {
    const sourcePrompt = config?.prompts[promptId];
    if (!sourcePrompt) return;

    setNewPromptId(`${promptId}_copy`);
    setNewPromptType(sourcePrompt.type);
    setNewPromptContent(sourcePrompt.content);
    setNewPromptDescription(`${sourcePrompt.description || ''} (Copy)`);
    setNewPromptModel(sourcePrompt.metadata?.model || 'gpt-4o-mini');
    setNewPromptTemperature(sourcePrompt.metadata?.temperature ?? 0.7);
    setNewPromptMaxTokens(sourcePrompt.metadata?.maxTokens ?? 1000);
    setNewPromptVariables(sourcePrompt.variables || []);
    setShowNewPromptModal(true);
  };

  // Apply template to new prompt form
  const handleApplyTemplate = (template: PromptTemplate) => {
    setNewPromptContent(template.data.systemPrompt + '\n\n' + template.data.userPromptTemplate);
    setNewPromptModel(template.data.model);
    setNewPromptTemperature(template.data.temperature);
    setNewPromptMaxTokens(template.data.maxTokens);
    setNewPromptVariables(template.data.variables);
    setNewPromptDescription(template.description);
    setShowTemplatePicker(false);
  };

  // Add a new variable
  const addVariable = () => {
    setNewPromptVariables([
      ...newPromptVariables,
      { name: '', type: 'string', description: '', required: true },
    ]);
  };

  // Remove a variable
  const removeVariable = (index: number) => {
    setNewPromptVariables(newPromptVariables.filter((_, i) => i !== index));
  };

  // Update a variable
  const updateVariable = (index: number, field: keyof PromptVariable, value: unknown) => {
    const updated = [...newPromptVariables];
    updated[index] = { ...updated[index], [field]: value };
    setNewPromptVariables(updated);
  };

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
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Prompts</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {Object.keys(config.prompts).length} prompt(s)
                  </p>
                </div>
                <button
                  onClick={() => {
                    resetNewPromptForm();
                    setShowNewPromptModal(true);
                  }}
                  className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  + Add
                </button>
              </div>
              <div className="divide-y divide-gray-100">
                {Object.entries(config.prompts).map(([promptId, prompt]) => {
                  // Get post type info for LifeFeedGenerator prompts
                  const postTypeInfo = service === 'LifeFeedGenerator' ? getLifeFeedPromptPostType(promptId) : null;

                  return (
                  <div
                    key={promptId}
                    className={`group relative hover:bg-gray-50 transition-colors ${
                      selectedPromptId === promptId ? 'bg-red-50 border-l-4 border-red-500' : ''
                    }`}
                  >
                    <button
                      onClick={() => handlePromptSelect(promptId)}
                      className="w-full text-left p-3 pr-20"
                    >
                      <div className="font-medium text-sm text-gray-900">{promptId}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {prompt.type} • {prompt.metadata?.model || 'default'}
                      </div>
                      {/* Show post type badge for LifeFeedGenerator */}
                      {postTypeInfo && (
                        <div className="mt-1.5 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-1.5 py-0.5 text-xs rounded ${
                              postTypeInfo.postType === 'all'
                                ? 'bg-purple-100 text-purple-700'
                                : postTypeInfo.isVariant
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {postTypeInfo.postType === 'all' ? '🎯 system' : `📝 ${postTypeInfo.postType}`}
                            </span>
                            {postTypeInfo.isVariant && (
                              <span className="text-xs text-amber-600">variant</span>
                            )}
                          </div>
                        </div>
                      )}
                      {/* Context sources preview for all prompts */}
                      {(() => {
                        const icons: Record<string, string> = {
                          textNotes: '📝', voiceNotes: '🎤', photoMemories: '📸',
                          healthData: '❤️', locationData: '📍', events: '📅',
                          memories: '🧠', chatHistory: '💬', moodEntries: '😊',
                        };

                        // Get service-level sources
                        const serviceSources: string[] = serviceInfo && (serviceInfo as any).contextSources
                          ? ((serviceInfo as any).contextSources as any[]).map((s: any) => s.collection || s)
                          : [];

                        // Get prompt-level sources for LifeFeedGenerator
                        const promptSources = postTypeInfo?.contextSources || [];

                        if (serviceSources.length === 0 && promptSources.length === 0) return null;

                        return (
                          <div className="mt-1.5 space-y-0.5">
                            {/* Service sources (blue) */}
                            {serviceSources.length > 0 && (
                              <div className="flex flex-wrap gap-0.5 items-center">
                                <span className="text-[10px] text-blue-500 mr-0.5">S:</span>
                                {serviceSources.slice(0, 4).map((src: string) => (
                                  <span key={`svc-${src}`} className="text-xs opacity-60" title={`Service: ${src}`}>
                                    {icons[src] || '📦'}
                                  </span>
                                ))}
                                {serviceSources.length > 4 && (
                                  <span className="text-[10px] text-gray-400">+{serviceSources.length - 4}</span>
                                )}
                              </div>
                            )}
                            {/* Prompt sources (green) - only if different from service sources */}
                            {postTypeInfo && promptSources.length > 0 && (
                              <div className="flex flex-wrap gap-0.5 items-center">
                                <span className="text-[10px] text-emerald-500 mr-0.5">P:</span>
                                {promptSources.map((src: string) => (
                                  <span key={`pmt-${src}`} className="text-xs" title={`Prompt: ${src}`}>
                                    {icons[src] || '📦'}
                                  </span>
                                ))}
                              </div>
                            )}
                            {/* For non-LifeFeedGenerator, show "Uses all" indicator */}
                            {!postTypeInfo && serviceSources.length > 0 && (
                              <div className="flex items-center">
                                <span className="text-[10px] text-emerald-500 mr-0.5">P:</span>
                                <span className="text-[10px] text-gray-400 italic">all</span>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                      {/* Usage info preview */}
                      {(() => {
                        const usageInfo = postTypeInfo?.usageInfo || (serviceInfo && (serviceInfo as any).usageInfo);
                        if (!usageInfo) return null;

                        const logicIcons: Record<string, string> = {
                          'always': '✓', 'random': '🎲', 'conditional': '⚡',
                          'personality': '🎭', 'context-based': '🎯',
                        };

                        return (
                          <div className="mt-1 flex flex-wrap gap-1 text-[10px]">
                            <span className="text-amber-600" title={`Time range: ${usageInfo.dataTimeRange}`}>
                              ⏱️ {usageInfo.dataTimeRange.split(' ').slice(0, 2).join(' ')}
                            </span>
                            <span className="text-violet-600" title={`Selection: ${usageInfo.selectionLogic}`}>
                              {logicIcons[usageInfo.selectionLogic] || '?'} {usageInfo.selectionLogic}
                            </span>
                            {usageInfo.cooldownDays && (
                              <span className="text-orange-500" title={`Cooldown: ${usageInfo.cooldownDays} days`}>
                                ⏳{usageInfo.cooldownDays}d
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </button>
                    {/* Action buttons */}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicatePrompt(promptId);
                        }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="Duplicate"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePrompt(promptId);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
                })}
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

                  {/* Context Sources for all prompts - showing both service and prompt level */}
                  {(() => {
                    // Get service-level context sources
                    let serviceContextSources: string[] = [];
                    if (serviceInfo) {
                      const svcContextSources = (serviceInfo as any).contextSources;
                      if (svcContextSources && Array.isArray(svcContextSources)) {
                        serviceContextSources = svcContextSources.map((s: any) => s.collection || s);
                      }
                    }

                    // Get prompt-level context sources (for LifeFeedGenerator)
                    let promptContextSources: string[] | null = null;
                    if (service === 'LifeFeedGenerator' && selectedPromptId && LIFE_FEED_PROMPT_POST_TYPES[selectedPromptId]) {
                      promptContextSources = LIFE_FEED_PROMPT_POST_TYPES[selectedPromptId].contextSources;
                    }

                    const icons: Record<string, string> = {
                      textNotes: '📝', voiceNotes: '🎤', photoMemories: '📸',
                      healthData: '❤️', locationData: '📍', events: '📅',
                      memories: '🧠', chatHistory: '💬', moodEntries: '😊',
                    };

                    return (
                      <div className="mt-3 space-y-2">
                        {/* Service-Level Context Sources */}
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <h4 className="text-xs font-medium text-blue-800 mb-2">
                            Service Context Sources
                            <span className="ml-1 text-blue-600 font-normal">- all data available to {serviceInfo?.name || service}</span>
                          </h4>
                          {serviceContextSources.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {serviceContextSources.map((src: string) => {
                                const sourceInfo = CONTEXT_SOURCES[src as keyof typeof CONTEXT_SOURCES];
                                const isUsedByPrompt = promptContextSources ? promptContextSources.includes(src) : true;
                                return (
                                  <span
                                    key={src}
                                    className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs cursor-help ${
                                      isUsedByPrompt
                                        ? 'bg-white text-blue-700 border border-blue-200'
                                        : 'bg-blue-100 text-blue-400 border border-blue-100'
                                    }`}
                                    title={sourceInfo ? `${sourceInfo.description}\n\nTrigger: ${sourceInfo.trigger}${!isUsedByPrompt ? '\n\n⚠️ Not used by this prompt' : ''}` : src}
                                  >
                                    <span>{icons[src] || '📦'}</span>
                                    {src}
                                    {!isUsedByPrompt && <span className="text-blue-300">✗</span>}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-xs text-blue-600 italic">Direct user input (no data collections)</span>
                          )}
                        </div>

                        {/* Prompt-Level Context Sources (for LifeFeedGenerator and potentially other services) */}
                        <div className="p-3 bg-emerald-50 rounded-lg">
                          <h4 className="text-xs font-medium text-emerald-800 mb-2">
                            Prompt Context Sources
                            <span className="ml-1 text-emerald-600 font-normal">- data used by this specific prompt</span>
                          </h4>
                          {promptContextSources ? (
                            promptContextSources.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {promptContextSources.map((src: string) => {
                                  const sourceInfo = CONTEXT_SOURCES[src as keyof typeof CONTEXT_SOURCES];
                                  return (
                                    <span
                                      key={src}
                                      className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded text-xs text-emerald-700 border border-emerald-200 cursor-help"
                                      title={sourceInfo ? `${sourceInfo.description}\n\nTrigger: ${sourceInfo.trigger}` : src}
                                    >
                                      <span>{icons[src] || '📦'}</span>
                                      {src}
                                    </span>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-xs text-emerald-600 italic">System prompt - used by all post types</span>
                            )
                          ) : serviceContextSources.length > 0 ? (
                            <span className="text-xs text-emerald-600 italic">Uses all service context sources</span>
                          ) : (
                            <span className="text-xs text-emerald-600 italic">No data context (processes direct input)</span>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Usage Info: Data Time Range & Selection Logic */}
                  {(() => {
                    // Get usage info for this prompt
                    let usageInfo: { dataTimeRange: string; selectionLogic: string; variantGroup?: string; variants?: string[]; cooldownDays?: number } | null = null;

                    if (service === 'LifeFeedGenerator' && selectedPromptId && LIFE_FEED_PROMPT_POST_TYPES[selectedPromptId]) {
                      usageInfo = LIFE_FEED_PROMPT_POST_TYPES[selectedPromptId].usageInfo;
                    } else if (serviceInfo && (serviceInfo as any).usageInfo) {
                      usageInfo = (serviceInfo as any).usageInfo;
                    }

                    if (!usageInfo) return null;

                    const selectionLogicLabels: Record<string, { label: string; icon: string; description: string }> = {
                      'always': { label: 'Always', icon: '✓', description: 'This prompt is always used when the service runs' },
                      'random': { label: 'Random', icon: '🎲', description: 'Randomly selected from variant group when generating' },
                      'conditional': { label: 'Conditional', icon: '⚡', description: 'Selected based on specific conditions (e.g., daily vs weekly)' },
                      'personality': { label: 'Personality', icon: '🎭', description: 'Selected based on user\'s personality setting' },
                      'context-based': { label: 'Context-based', icon: '🎯', description: 'Selected based on available context data' },
                    };

                    const logicInfo = selectionLogicLabels[usageInfo.selectionLogic] || { label: usageInfo.selectionLogic, icon: '?', description: 'Unknown selection logic' };

                    return (
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        {/* Data Time Range */}
                        <div className="p-3 bg-amber-50 rounded-lg">
                          <h4 className="text-xs font-medium text-amber-800 mb-1.5 flex items-center gap-1">
                            <span>⏱️</span> Data Time Range
                          </h4>
                          <p className="text-sm text-amber-900 font-medium">{usageInfo.dataTimeRange}</p>
                          <p className="text-xs text-amber-600 mt-1">How far back data is fetched</p>
                        </div>

                        {/* Selection Logic */}
                        <div className="p-3 bg-violet-50 rounded-lg">
                          <h4 className="text-xs font-medium text-violet-800 mb-1.5 flex items-center gap-1">
                            <span>{logicInfo.icon}</span> Selection Logic
                          </h4>
                          <p className="text-sm text-violet-900 font-medium">{logicInfo.label}</p>
                          <p className="text-xs text-violet-600 mt-1">{logicInfo.description}</p>
                        </div>

                        {/* Variant Group (if random selection) */}
                        {usageInfo.selectionLogic === 'random' && usageInfo.variants && usageInfo.variants.length > 0 && (
                          <div className="col-span-2 p-3 bg-gray-50 rounded-lg">
                            <h4 className="text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                              <span>🎲</span> Variant Group: <span className="text-gray-900">{usageInfo.variantGroup}</span>
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                              {usageInfo.variants.map((variant) => (
                                <span
                                  key={variant}
                                  className={`px-2 py-1 text-xs rounded ${
                                    variant === selectedPromptId
                                      ? 'bg-violet-600 text-white font-medium'
                                      : 'bg-white border border-gray-200 text-gray-600 hover:border-violet-300 cursor-pointer'
                                  }`}
                                  onClick={() => {
                                    if (variant !== selectedPromptId && config?.prompts[variant]) {
                                      handlePromptSelect(variant);
                                    }
                                  }}
                                >
                                  {variant}
                                  {variant === selectedPromptId && ' (current)'}
                                </span>
                              ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                              Each time a <span className="font-medium">{usageInfo.variantGroup}</span> post is generated, one of these {usageInfo.variants.length} prompts is randomly selected
                            </p>
                          </div>
                        )}

                        {/* Cooldown (if applicable) */}
                        {usageInfo.cooldownDays && usageInfo.cooldownDays > 0 && (
                          <div className={`${usageInfo.selectionLogic === 'random' && usageInfo.variants ? '' : 'col-span-2'} p-3 bg-orange-50 rounded-lg`}>
                            <h4 className="text-xs font-medium text-orange-800 mb-1 flex items-center gap-1">
                              <span>⏳</span> Cooldown Period
                            </h4>
                            <p className="text-sm text-orange-900 font-medium">
                              {usageInfo.cooldownDays} day{usageInfo.cooldownDays > 1 ? 's' : ''} between generations
                            </p>
                            <p className="text-xs text-orange-600 mt-1">
                              After generating a {usageInfo.variantGroup || 'post of this type'}, wait {usageInfo.cooldownDays} day{usageInfo.cooldownDays > 1 ? 's' : ''} before generating another
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Editable Metadata */}
                <div className="p-4 bg-gray-50 border-b border-gray-200">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Model</label>
                      <select
                        value={editedModel}
                        onChange={(e) => setEditedModel(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 bg-white"
                      >
                        <option value="gpt-4o-mini">gpt-4o-mini</option>
                        <option value="gpt-4o">gpt-4o</option>
                        <option value="gpt-4-turbo">gpt-4-turbo</option>
                        <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Temperature: {editedTemperature}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.1"
                        value={editedTemperature}
                        onChange={(e) => setEditedTemperature(parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-600"
                      />
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>Precise</span>
                        <span>Creative</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Max Tokens</label>
                      <input
                        type="number"
                        min="1"
                        max="16000"
                        value={editedMaxTokens}
                        onChange={(e) => setEditedMaxTokens(parseInt(e.target.value) || 1000)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                  </div>
                  {selectedPrompt.metadata?.responseFormat && (
                    <div className="mt-2 text-xs text-gray-500">
                      Response Format: <strong>{selectedPrompt.metadata.responseFormat}</strong>
                    </div>
                  )}
                </div>

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
                        disabled={saving || (
                          editedContent === selectedPrompt.content &&
                          editedModel === (selectedPrompt.metadata?.model || 'gpt-4o-mini') &&
                          editedTemperature === (selectedPrompt.metadata?.temperature ?? 0.7) &&
                          editedMaxTokens === (selectedPrompt.metadata?.maxTokens ?? 1000)
                        )}
                        className={`px-6 py-2 rounded-md text-white font-medium transition-colors ${
                          saving || (
                            editedContent === selectedPrompt.content &&
                            editedModel === (selectedPrompt.metadata?.model || 'gpt-4o-mini') &&
                            editedTemperature === (selectedPrompt.metadata?.temperature ?? 0.7) &&
                            editedMaxTokens === (selectedPrompt.metadata?.maxTokens ?? 1000)
                          )
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

      {/* New Prompt Modal */}
      {showNewPromptModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                Create New Prompt
              </h2>
              <button
                onClick={() => setShowTemplatePicker(!showTemplatePicker)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  showTemplatePicker
                    ? 'bg-purple-100 text-purple-700 border border-purple-300'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                {showTemplatePicker ? 'Hide Templates' : 'Use Template'}
              </button>
            </div>

            {/* Modal Content */}
            <div className="px-6 py-4 space-y-6">
              {/* Template Picker */}
              {showTemplatePicker && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-purple-900 mb-3">
                    Choose a Template
                  </h3>
                  {/* Category tabs */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {TEMPLATE_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setTemplateCategory(cat.id)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                          templateCategory === cat.id
                            ? 'bg-purple-600 text-white'
                            : 'bg-white text-gray-700 border border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        {cat.icon} {cat.name}
                      </button>
                    ))}
                  </div>
                  {/* Template grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {PROMPT_TEMPLATES.filter(t => t.category === templateCategory).map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => handleApplyTemplate(template)}
                        className="text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-400 hover:shadow-sm transition-all"
                      >
                        <div className="font-medium text-sm text-gray-900">
                          {template.name}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {template.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Prompt ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prompt ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newPromptId}
                  onChange={(e) => setNewPromptId(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                  placeholder="e.g., my_new_prompt"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Unique identifier for this prompt (lowercase, underscores)
                </p>
              </div>

              {/* Type and Model Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={newPromptType}
                    onChange={(e) => setNewPromptType(e.target.value as 'system' | 'user' | 'function')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="system">System</option>
                    <option value="user">User</option>
                    <option value="function">Function</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                  <select
                    value={newPromptModel}
                    onChange={(e) => setNewPromptModel(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="gpt-4o-mini">gpt-4o-mini</option>
                    <option value="gpt-4o">gpt-4o</option>
                    <option value="gpt-4-turbo">gpt-4-turbo</option>
                    <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                  </select>
                </div>
              </div>

              {/* Temperature and Max Tokens Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Temperature ({newPromptTemperature})
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={newPromptTemperature}
                    onChange={(e) => setNewPromptTemperature(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Precise (0)</span>
                    <span>Creative (2)</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Tokens</label>
                  <input
                    type="number"
                    min="1"
                    max="16000"
                    value={newPromptMaxTokens}
                    onChange={(e) => setNewPromptMaxTokens(parseInt(e.target.value) || 1000)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={newPromptDescription}
                  onChange={(e) => setNewPromptDescription(e.target.value)}
                  placeholder="Brief description of this prompt"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prompt Content <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={newPromptContent}
                  onChange={(e) => setNewPromptContent(e.target.value)}
                  placeholder="Enter your prompt content here... Use {{variableName}} for Handlebars variables."
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 font-mono text-sm"
                />
              </div>

              {/* Variables */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Variables (Handlebars)
                </label>
                <div className="space-y-2">
                  {newPromptVariables.map((v, i) => (
                    <div key={i} className="flex gap-2 items-center p-2 bg-gray-50 rounded-md">
                      <input
                        placeholder="name"
                        value={v.name}
                        onChange={(e) => updateVariable(i, 'name', e.target.value)}
                        className="w-28 px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-red-500 focus:border-red-500 font-mono"
                      />
                      <select
                        value={v.type}
                        onChange={(e) => updateVariable(i, 'type', e.target.value)}
                        className="w-24 px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-red-500 focus:border-red-500"
                      >
                        <option value="string">string</option>
                        <option value="number">number</option>
                        <option value="boolean">boolean</option>
                        <option value="array">array</option>
                        <option value="object">object</option>
                      </select>
                      <input
                        placeholder="description"
                        value={v.description}
                        onChange={(e) => updateVariable(i, 'description', e.target.value)}
                        className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-red-500 focus:border-red-500"
                      />
                      <label className="flex items-center gap-1 text-sm whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={v.required}
                          onChange={(e) => updateVariable(i, 'required', e.target.checked)}
                          className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                        />
                        Req
                      </label>
                      <button
                        onClick={() => removeVariable(i)}
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addVariable}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    + Add Variable
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowNewPromptModal(false);
                  resetNewPromptForm();
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateNewPrompt}
                disabled={saving || !newPromptId.trim() || !newPromptContent.trim()}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
                  saving || !newPromptId.trim() || !newPromptContent.trim()
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {saving ? 'Creating...' : 'Create Prompt'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
