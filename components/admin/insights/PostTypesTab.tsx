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

      {/* How It Works */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-blue-900 mb-3 flex items-center">
          <span className="mr-2">⚙️</span>
          How Insight Feed Generation Works
        </h3>
        <div className="space-y-4 text-sm text-blue-800">
          <div>
            <p className="font-semibold mb-2">🔄 Generation Process</p>
            <p className="text-blue-700 mb-2">
              When generating insights (via scheduler or manual trigger), the system iterates through <strong>all {INSIGHTS_POST_TYPES.length} post types</strong> dynamically:
            </p>
            <ol className="list-decimal list-inside space-y-1 ml-2 text-blue-700">
              <li><strong>Check if enabled</strong> — Skip disabled post types</li>
              <li><strong>Check cooldown period</strong> — Skip if a post of this type was generated within the cooldown days</li>
              <li><strong>Check data requirements</strong> — Skip if user doesn&apos;t have sufficient data (e.g., no health data for milestones)</li>
              <li><strong>Generate post</strong> — If all checks pass, generate one post for this type</li>
            </ol>
          </div>

          <div className="bg-blue-100 rounded p-3">
            <p className="font-semibold text-blue-900 mb-2">📊 Example Scenario</p>
            <p className="text-blue-700 text-xs">
              User clicks &quot;Generate&quot; with 8 post types configured. The system checks each:
            </p>
            <ul className="mt-2 space-y-1 text-xs text-blue-600">
              <li>✅ <strong>life_summary</strong> — Enabled, past cooldown, has data → <span className="text-green-600">Generated</span></li>
              <li>⏳ <strong>milestone</strong> — Enabled, but generated 2 days ago (cooldown: 7d) → <span className="text-amber-600">Skipped</span></li>
              <li>❌ <strong>pattern_prediction</strong> — Disabled → <span className="text-gray-500">Skipped</span></li>
              <li>✅ <strong>reflective_insight</strong> — Enabled, past cooldown, has data → <span className="text-green-600">Generated</span></li>
              <li>📭 <strong>memory_highlight</strong> — Enabled, but no memories older than 30 days → <span className="text-gray-500">Skipped</span></li>
              <li>✅ <strong>streak_achievement</strong> — Enabled, past cooldown, has streak data → <span className="text-green-600">Generated</span></li>
              <li>⏳ <strong>comparison</strong> — Enabled, but generated yesterday (cooldown: 3d) → <span className="text-amber-600">Skipped</span></li>
              <li>✅ <strong>seasonal_reflection</strong> — Enabled, past cooldown, has data → <span className="text-green-600">Generated</span></li>
            </ul>
            <p className="mt-2 text-xs text-blue-800">
              <strong>Result:</strong> 4 posts generated in one batch. Each eligible post type gets one post per generation cycle.
            </p>
          </div>

          <div>
            <p className="font-semibold mb-1">💡 Key Points</p>
            <ul className="list-disc list-inside ml-2 text-blue-600">
              <li>New post types added to the code are automatically included in generation</li>
              <li>Cooldown is per post type, not global — different types can generate simultaneously</li>
              <li>The &quot;max per day&quot; setting limits how many of each type can be generated daily</li>
              <li>Priority affects selection order when multiple candidates compete</li>
            </ul>
          </div>
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

              {/* Data Requirements */}
              <div className="bg-amber-50 border border-amber-200 rounded-md p-2 mb-3">
                <div className="flex items-start gap-1.5">
                  <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-amber-800">{meta.requirements}</p>
                </div>
              </div>

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

              {/* Prompts Section */}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500 uppercase">
                    Prompts ({meta.prompts.length})
                  </span>
                </div>
                {meta.prompts.map((prompt) => (
                  <Link
                    key={prompt.id}
                    href={`/admin/prompts?service=LifeFeedGenerator&prompt=${prompt.id}`}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors mb-1 last:mb-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 truncate">
                        {prompt.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {prompt.description}
                      </p>
                    </div>
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>

              {/* Edit button */}
              <button
                onClick={() => setEditingType(postType)}
                className="mt-3 w-full px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
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
              step="0.5"
              value={cooldownDays}
              onChange={(e) => setCooldownDays(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Minimum days between posts (e.g., 0.5 = 12 hours)
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
