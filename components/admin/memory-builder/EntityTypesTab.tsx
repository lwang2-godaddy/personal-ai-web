'use client';

import { useState, useEffect } from 'react';
import { apiGet, apiPut } from '@/lib/api/client';
import {
  EntityTypeConfig,
  ExtractedEntityType,
  ENTITY_TYPE_METADATA,
  ENTITY_TYPES,
} from '@/lib/models/MemoryBuilderConfig';

interface EntityTypesTabProps {
  onSaving?: (saving: boolean) => void;
}

interface EntityTypeWithMeta extends EntityTypeConfig {
  type: ExtractedEntityType;
  metadata: typeof ENTITY_TYPE_METADATA[ExtractedEntityType];
}

/**
 * Entity Types Tab - Configure each of the 9 entity types
 */
export default function EntityTypesTab({ onSaving }: EntityTypesTabProps) {
  const [entityTypes, setEntityTypes] = useState<EntityTypeWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedType, setExpandedType] = useState<ExtractedEntityType | null>(null);

  useEffect(() => {
    loadEntityTypes();
  }, []);

  const loadEntityTypes = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiGet('/api/admin/memory-builder/entity-types');

      // Merge with metadata
      const enriched = ENTITY_TYPES.map((type) => {
        const config = response.entityTypes.find((e: any) => e.type === type) || {
          enabled: true,
          confidenceThreshold: 0.6,
          searchWeight: 1.0,
          autoLearnVocabulary: true,
        };
        return {
          type,
          ...config,
          metadata: ENTITY_TYPE_METADATA[type],
        };
      });

      setEntityTypes(enriched);
    } catch (err: any) {
      setError(err.message || 'Failed to load entity types');
    } finally {
      setLoading(false);
    }
  };

  const toggleEntityType = async (type: ExtractedEntityType) => {
    const current = entityTypes.find((e) => e.type === type);
    if (!current) return;

    try {
      setSaving(true);
      onSaving?.(true);
      await apiPut('/api/admin/memory-builder/entity-types', {
        entityType: type,
        enabled: !current.enabled,
      });
      await loadEntityTypes();
    } catch (err: any) {
      setError(err.message || 'Failed to update entity type');
    } finally {
      setSaving(false);
      onSaving?.(false);
    }
  };

  const updateEntityType = async (type: ExtractedEntityType, updates: Partial<EntityTypeConfig>) => {
    try {
      setSaving(true);
      onSaving?.(true);
      await apiPut('/api/admin/memory-builder/entity-types', {
        entityType: type,
        updates,
      });
      await loadEntityTypes();
    } catch (err: any) {
      setError(err.message || 'Failed to update entity type');
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
          onClick={loadEntityTypes}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Entity Types</h3>
          <p className="text-sm text-gray-600">
            Configure extraction settings for each entity type
          </p>
        </div>
        <span className="text-sm text-gray-500">
          {entityTypes.filter((e) => e.enabled).length} of {entityTypes.length} enabled
        </span>
      </div>

      <div className="space-y-3">
        {entityTypes.map((entityType) => (
          <div
            key={entityType.type}
            className={`border rounded-lg overflow-hidden ${
              entityType.enabled ? 'bg-white' : 'bg-gray-50 opacity-75'
            }`}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
              onClick={() =>
                setExpandedType(expandedType === entityType.type ? null : entityType.type)
              }
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{entityType.metadata.icon}</span>
                <div>
                  <div className="font-medium">{entityType.metadata.displayName}</div>
                  <div className="text-sm text-gray-500">
                    {entityType.metadata.description}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    entityType.enabled
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {entityType.enabled ? 'Enabled' : 'Disabled'}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleEntityType(entityType.type);
                  }}
                  disabled={saving}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    entityType.enabled ? 'bg-blue-600' : 'bg-gray-200'
                  } ${saving ? 'opacity-50' : ''}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      entityType.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Expanded Settings */}
            {expandedType === entityType.type && (
              <div className="border-t px-4 py-4 space-y-4 bg-gray-50">
                {/* Examples */}
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">Examples</div>
                  <div className="flex flex-wrap gap-2">
                    {entityType.metadata.examples.map((example) => (
                      <span
                        key={example}
                        className="px-2 py-1 bg-white border rounded text-sm"
                      >
                        {example}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Confidence Threshold */}
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Confidence Threshold: {(entityType.confidenceThreshold * 100).toFixed(0)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={entityType.confidenceThreshold * 100}
                    onChange={(e) =>
                      updateEntityType(entityType.type, {
                        confidenceThreshold: parseInt(e.target.value) / 100,
                      })
                    }
                    className="w-full mt-1"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>More entities</span>
                    <span>Higher quality</span>
                  </div>
                </div>

                {/* Search Weight */}
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Search Weight: {entityType.searchWeight.toFixed(1)}x
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="200"
                    value={entityType.searchWeight * 100}
                    onChange={(e) =>
                      updateEntityType(entityType.type, {
                        searchWeight: parseInt(e.target.value) / 100,
                      })
                    }
                    className="w-full mt-1"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Lower priority</span>
                    <span>Higher priority</span>
                  </div>
                </div>

                {/* Auto-Learn Toggle */}
                <div className="flex items-center justify-between pt-2">
                  <div>
                    <div className="text-sm font-medium text-gray-700">
                      Auto-Learn to Vocabulary
                    </div>
                    <div className="text-xs text-gray-500">
                      Automatically add high-confidence entities to user vocabulary
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      updateEntityType(entityType.type, {
                        autoLearnVocabulary: !entityType.autoLearnVocabulary,
                      })
                    }
                    disabled={saving}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      entityType.autoLearnVocabulary ? 'bg-blue-600' : 'bg-gray-200'
                    } ${saving ? 'opacity-50' : ''}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        entityType.autoLearnVocabulary ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
