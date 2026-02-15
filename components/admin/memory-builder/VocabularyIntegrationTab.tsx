'use client';

import { useState, useEffect } from 'react';
import { apiGet, apiPut } from '@/lib/api/client';
import {
  VocabularyIntegrationConfig,
  ExtractedEntityType,
  ENTITY_TYPE_METADATA,
} from '@/lib/models/MemoryBuilderConfig';

interface VocabularyIntegrationTabProps {
  onSaving?: (saving: boolean) => void;
}

const VOCABULARY_CATEGORIES = [
  { value: 'person_name', label: 'Person Name' },
  { value: 'place_name', label: 'Place Name' },
  { value: 'activity_type', label: 'Activity Type' },
  { value: 'organization', label: 'Organization' },
  { value: 'domain_specific', label: 'Domain Specific' },
  { value: 'custom', label: 'Custom' },
];

/**
 * Vocabulary Integration Tab - Configure auto-learning and cross-referencing
 */
export default function VocabularyIntegrationTab({ onSaving }: VocabularyIntegrationTabProps) {
  const [config, setConfig] = useState<VocabularyIntegrationConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiGet('/api/admin/memory-builder');
      setConfig(response.config.vocabularyIntegration);
    } catch (err: any) {
      setError(err.message || 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (updates: Partial<VocabularyIntegrationConfig>) => {
    if (!config) return;

    try {
      setSaving(true);
      onSaving?.(true);
      const fullConfig = await apiGet('/api/admin/memory-builder');
      await apiPut('/api/admin/memory-builder', {
        config: {
          ...fullConfig.config,
          vocabularyIntegration: {
            ...config,
            ...updates,
          },
        },
      });
      await loadConfig();
    } catch (err: any) {
      setError(err.message || 'Failed to update configuration');
    } finally {
      setSaving(false);
      onSaving?.(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700">{error}</p>
        <button
          onClick={loadConfig}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!config) return null;

  return (
    <div className="space-y-6">
      {/* Auto-Learning Settings */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Auto-Learning</h3>
        <p className="text-sm text-gray-600 mb-4">
          Automatically add high-confidence entities from memories to user vocabulary
        </p>

        <div className="space-y-4">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Enable Auto-Learning</div>
              <div className="text-sm text-gray-500">
                Automatically learn vocabulary from memory extraction
              </div>
            </div>
            <button
              onClick={() => updateConfig({ autoLearnEnabled: !config.autoLearnEnabled })}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config.autoLearnEnabled ? 'bg-blue-600' : 'bg-gray-200'
              } ${saving ? 'opacity-50' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.autoLearnEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Confidence Threshold */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Auto-Learn Confidence Threshold:{' '}
              {(config.autoLearnConfidenceThreshold * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="50"
              max="100"
              value={config.autoLearnConfidenceThreshold * 100}
              onChange={(e) =>
                updateConfig({ autoLearnConfidenceThreshold: parseInt(e.target.value) / 100 })
              }
              className="w-full"
              disabled={!config.autoLearnEnabled}
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>More learning (50%)</span>
              <span>Higher quality (100%)</span>
            </div>
          </div>

          {/* Max Per Day */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Auto-Learn Per Day: {config.maxAutoLearnPerDay}
            </label>
            <input
              type="range"
              min="5"
              max="50"
              value={config.maxAutoLearnPerDay}
              onChange={(e) => updateConfig({ maxAutoLearnPerDay: parseInt(e.target.value) })}
              className="w-full"
              disabled={!config.autoLearnEnabled}
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>5</span>
              <span>50</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cross-Reference Settings */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Cross-Reference</h3>
        <p className="text-sm text-gray-600 mb-4">
          Match extracted entities against existing vocabulary for confidence boosting
        </p>

        <div className="space-y-4">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Enable Cross-Reference</div>
              <div className="text-sm text-gray-500">
                Check entities against user vocabulary
              </div>
            </div>
            <button
              onClick={() => updateConfig({ crossReferenceEnabled: !config.crossReferenceEnabled })}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config.crossReferenceEnabled ? 'bg-blue-600' : 'bg-gray-200'
              } ${saving ? 'opacity-50' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.crossReferenceEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Boost Matched */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Boost Matched Entities</div>
              <div className="text-sm text-gray-500">
                Increase confidence for entities matching vocabulary
              </div>
            </div>
            <button
              onClick={() => updateConfig({ boostMatchedEntities: !config.boostMatchedEntities })}
              disabled={saving || !config.crossReferenceEnabled}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config.boostMatchedEntities ? 'bg-blue-600' : 'bg-gray-200'
              } ${saving || !config.crossReferenceEnabled ? 'opacity-50' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.boostMatchedEntities ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Boost Amount */}
          {config.boostMatchedEntities && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Boost Amount: +{(config.boostAmount * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="5"
                max="50"
                value={config.boostAmount * 100}
                onChange={(e) => updateConfig({ boostAmount: parseInt(e.target.value) / 100 })}
                className="w-full"
                disabled={!config.crossReferenceEnabled || !config.boostMatchedEntities}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>+5%</span>
                <span>+50%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Category Mapping */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Category Mapping</h3>
        <p className="text-sm text-gray-600 mb-4">
          Map entity types to vocabulary categories for auto-learning
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(Object.keys(config.categoryMapping) as ExtractedEntityType[]).map((entityType) => {
            const metadata = ENTITY_TYPE_METADATA[entityType];
            return (
              <div key={entityType} className="flex items-center gap-3">
                <span className="text-xl">{metadata?.icon || '?'}</span>
                <div className="flex-1">
                  <div className="text-sm font-medium">
                    {metadata?.displayName || entityType}
                  </div>
                  <select
                    value={config.categoryMapping[entityType]}
                    onChange={(e) =>
                      updateConfig({
                        categoryMapping: {
                          ...config.categoryMapping,
                          [entityType]: e.target.value,
                        },
                      })
                    }
                    className="mt-1 w-full text-sm border rounded px-2 py-1"
                    disabled={saving}
                  >
                    {VOCABULARY_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Suggestions Settings */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Suggestions</h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Enable Suggestions</div>
              <div className="text-sm text-gray-500">
                Generate vocabulary suggestions from memories
              </div>
            </div>
            <button
              onClick={() => updateConfig({ suggestionsEnabled: !config.suggestionsEnabled })}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config.suggestionsEnabled ? 'bg-blue-600' : 'bg-gray-200'
              } ${saving ? 'opacity-50' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.suggestionsEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Suggestions Per Memory: {config.maxSuggestionsPerMemory}
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={config.maxSuggestionsPerMemory}
              onChange={(e) =>
                updateConfig({ maxSuggestionsPerMemory: parseInt(e.target.value) })
              }
              className="w-full"
              disabled={!config.suggestionsEnabled}
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>1</span>
              <span>10</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
