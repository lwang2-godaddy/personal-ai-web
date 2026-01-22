'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { apiGet, apiPut } from '@/lib/api/client';
import {
  InsightsPostTypesConfig,
  InsightsPostType,
  PostTypeAnalytics,
  POST_TYPE_METADATA,
  INSIGHTS_POST_TYPES,
} from '@/lib/models/InsightsFeatureConfig';

interface PostTypesTabProps {
  onSaving?: (saving: boolean) => void;
}

/**
 * Post Types Tab - Configure post type behavior, cooldowns, and priorities
 */
export default function PostTypesTab({ onSaving }: PostTypesTabProps) {
  const [config, setConfig] = useState<InsightsPostTypesConfig | null>(null);
  const [analytics, setAnalytics] = useState<PostTypeAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingType, setEditingType] = useState<InsightsPostType | null>(null);

  // Fetch configuration
  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiGet<{ config: InsightsPostTypesConfig; analytics: PostTypeAnalytics }>(
        '/api/admin/insights/post-types'
      );
      setConfig(result.config);
      setAnalytics(result.analytics);
    } catch (err: any) {
      console.error('Failed to fetch post types config:', err);
      setError(err.message || 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    onSaving?.(saving);
  }, [saving, onSaving]);

  // Toggle post type enabled
  const handleToggle = async (postType: InsightsPostType) => {
    if (!config) return;

    try {
      setSaving(true);
      const currentEnabled = config.postTypes[postType].enabled;
      await apiPut('/api/admin/insights/post-types', {
        postType,
        enabled: !currentEnabled,
      });
      await fetchConfig();
    } catch (err: any) {
      setError(err.message || 'Failed to update post type');
    } finally {
      setSaving(false);
    }
  };

  // Update post type settings
  const handleUpdate = async (postType: InsightsPostType, updates: any) => {
    try {
      setSaving(true);
      await apiPut('/api/admin/insights/post-types', {
        postType,
        updates,
      });
      await fetchConfig();
      setEditingType(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update post type');
    } finally {
      setSaving(false);
    }
  };

  // Reset to defaults
  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset all post type settings to defaults?')) return;

    try {
      setSaving(true);
      await apiPut('/api/admin/insights/post-types', { reset: true });
      await fetchConfig();
    } catch (err: any) {
      setError(err.message || 'Failed to reset configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{error}</p>
        <button
          onClick={fetchConfig}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!config) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Post Types Configuration</h2>
          <p className="text-sm text-gray-600">
            Configure how different post formats are generated
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/prompts?service=LifeFeedGenerator"
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Edit Prompts
          </Link>
          <button
            onClick={handleReset}
            disabled={saving}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Reset to Defaults
          </button>
        </div>
      </div>

      {/* Post Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {INSIGHTS_POST_TYPES.map((postType) => {
          const meta = POST_TYPE_METADATA[postType];
          const typeConfig = config.postTypes[postType];
          const total = analytics?.totalByType[postType] || 0;
          const last7d = analytics?.last7dByType[postType] || 0;

          return (
            <div
              key={postType}
              className={`bg-white rounded-lg shadow-md p-4 border-l-4 ${
                typeConfig.enabled ? '' : 'opacity-60'
              }`}
              style={{ borderLeftColor: meta.color }}
            >
              {/* Header with toggle */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <span className="text-2xl mr-2">{meta.icon}</span>
                  <span className="font-semibold text-gray-900">{meta.displayName}</span>
                </div>
                <button
                  onClick={() => handleToggle(postType)}
                  disabled={saving}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    typeConfig.enabled ? 'bg-green-500' : 'bg-gray-300'
                  } disabled:opacity-50`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      typeConfig.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600 mb-2">{typeConfig.description}</p>

              {/* Stats */}
              <div className="flex items-center justify-between text-sm mb-3">
                <span className="text-gray-500">
                  Cooldown: {typeConfig.cooldownDays}d | Priority: {typeConfig.priority}
                </span>
              </div>

              {/* Analytics */}
              <div className="flex items-center justify-between text-sm border-t border-gray-100 pt-2">
                <span className="text-gray-500">Total: {total}</span>
                <span className="text-gray-500">7d: {last7d}</span>
              </div>

              {/* Edit button */}
              <button
                onClick={() => setEditingType(postType)}
                className="mt-3 w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Edit Settings
              </button>
            </div>
          );
        })}
      </div>

      {/* Edit Modal */}
      {editingType && (
        <EditPostTypeModal
          postType={editingType}
          config={config.postTypes[editingType]}
          onSave={(updates) => handleUpdate(editingType, updates)}
          onClose={() => setEditingType(null)}
          saving={saving}
        />
      )}

      {/* Version info */}
      <div className="text-center text-sm text-gray-500">
        Version: {config.version} | Last updated: {new Date(config.lastUpdatedAt).toLocaleString()}
      </div>
    </div>
  );
}

// Edit Modal Component
interface EditPostTypeModalProps {
  postType: InsightsPostType;
  config: InsightsPostTypesConfig['postTypes'][InsightsPostType];
  onSave: (updates: any) => void;
  onClose: () => void;
  saving: boolean;
}

function EditPostTypeModal({ postType, config, onSave, onClose, saving }: EditPostTypeModalProps) {
  const [cooldownDays, setCooldownDays] = useState(config.cooldownDays);
  const [priority, setPriority] = useState(config.priority);
  const [minConfidence, setMinConfidence] = useState(config.minConfidence);
  const [maxPerDay, setMaxPerDay] = useState(config.maxPerDay);

  const meta = POST_TYPE_METADATA[postType];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      cooldownDays,
      priority,
      minConfidence,
      maxPerDay,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="flex items-center mb-4">
          <span className="text-2xl mr-2">{meta.icon}</span>
          <h3 className="text-lg font-bold text-gray-900">Edit {meta.displayName}</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cooldown (days)
            </label>
            <input
              type="number"
              min="0"
              max="365"
              value={cooldownDays}
              onChange={(e) => setCooldownDays(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Minimum days between posts of this type
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority (1-10)
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Higher priority = generated more often
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Min Confidence (0-1)
            </label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.1"
              value={minConfidence}
              onChange={(e) => setMinConfidence(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Minimum confidence score to publish
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Per Day
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={maxPerDay}
              onChange={(e) => setMaxPerDay(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Maximum posts of this type per day
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
