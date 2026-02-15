'use client';

import { useState, useEffect } from 'react';
import { apiGet, apiPut } from '@/lib/api/client';
import { MemoryBuilderConfig, ENTITY_TYPE_METADATA, ExtractedEntityType } from '@/lib/models/MemoryBuilderConfig';

interface OverviewTabProps {
  onSaving?: (saving: boolean) => void;
}

/**
 * Overview Tab - Main dashboard for Memory Builder
 * Shows status, quick stats, and global toggle
 */
export default function OverviewTab({ onSaving }: OverviewTabProps) {
  const [config, setConfig] = useState<MemoryBuilderConfig | null>(null);
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
      setConfig(response.config);
    } catch (err: any) {
      setError(err.message || 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const toggleEnabled = async () => {
    if (!config) return;

    try {
      setSaving(true);
      onSaving?.(true);
      await apiPut('/api/admin/memory-builder', { enabled: !config.enabled });
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

  const enabledEntityTypes = Object.entries(config.entityTypes).filter(([_, c]) => c.enabled).length;
  const totalEntityTypes = Object.keys(config.entityTypes).length;

  return (
    <div className="space-y-6">
      {/* Global Status */}
      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Enhanced Memory System</h3>
            <p className="text-gray-600 text-sm mt-1">
              Extract entities, analyze sentiment, and integrate with vocabulary
            </p>
          </div>
          <button
            onClick={toggleEnabled}
            disabled={saving}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              config.enabled ? 'bg-blue-600' : 'bg-gray-200'
            } ${saving ? 'opacity-50' : ''}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                config.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Status Badge */}
        <div className="mt-4">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              config.enabled
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {config.enabled ? 'Active' : 'Disabled'}
          </span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-600">Entity Types</div>
          <div className="text-2xl font-bold mt-1">
            {enabledEntityTypes} / {totalEntityTypes}
          </div>
          <div className="text-xs text-gray-500 mt-1">types enabled</div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-600">Extraction Model</div>
          <div className="text-2xl font-bold mt-1">{config.extraction.model}</div>
          <div className="text-xs text-gray-500 mt-1">
            temp: {config.extraction.temperature}, max: {config.extraction.maxTokens}
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-600">Auto-Learn</div>
          <div className="text-2xl font-bold mt-1">
            {config.vocabularyIntegration.autoLearnEnabled ? 'On' : 'Off'}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            threshold: {(config.vocabularyIntegration.autoLearnConfidenceThreshold * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Entity Types Preview */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Entity Types</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {(Object.keys(ENTITY_TYPE_METADATA) as ExtractedEntityType[]).map((type) => {
            const metadata = ENTITY_TYPE_METADATA[type];
            const typeConfig = config.entityTypes[type];
            return (
              <div
                key={type}
                className={`flex items-center gap-2 p-2 rounded-lg ${
                  typeConfig?.enabled ? 'bg-gray-50' : 'bg-gray-100 opacity-50'
                }`}
              >
                <span className="text-xl">{metadata.icon}</span>
                <div>
                  <div className="text-sm font-medium">{metadata.displayName}</div>
                  <div className="text-xs text-gray-500">
                    {typeConfig?.enabled ? (
                      <>thresh: {(typeConfig.confidenceThreshold * 100).toFixed(0)}%</>
                    ) : (
                      'disabled'
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Configuration Info */}
      <div className="bg-gray-50 border rounded-lg p-4 text-sm text-gray-600">
        <p>
          <strong>Last Updated:</strong>{' '}
          {new Date(config.lastUpdatedAt).toLocaleString()} by {config.lastUpdatedBy}
        </p>
        <p className="mt-1">
          <strong>Version:</strong> {config.version}
        </p>
      </div>
    </div>
  );
}
