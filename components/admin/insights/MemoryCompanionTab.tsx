'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPut } from '@/lib/api/client';
import { MemoryCompanionConfig } from '@/lib/models/InsightsFeatureConfig';

interface MemoryCompanionTabProps {
  onSaving?: (saving: boolean) => void;
}

/**
 * Memory Companion Tab - Configure memory surfacing settings
 * Maps to user toggle: preferences.aiFeatures.memoryCompanion
 */
export default function MemoryCompanionTab({ onSaving }: MemoryCompanionTabProps) {
  const [config, setConfig] = useState<MemoryCompanionConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch configuration
  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiGet<{ config: MemoryCompanionConfig }>('/api/admin/insights/memory-companion');
      setConfig(result.config);
    } catch (err: any) {
      console.error('Failed to fetch memory companion config:', err);
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

  // Toggle enabled
  const handleToggleEnabled = async () => {
    if (!config) return;

    try {
      setSaving(true);
      await apiPut('/api/admin/insights/memory-companion', { enabled: !config.enabled });
      await fetchConfig();
    } catch (err: any) {
      setError(err.message || 'Failed to update configuration');
    } finally {
      setSaving(false);
    }
  };

  // Toggle trigger
  const handleToggleTrigger = async (triggerKey: keyof MemoryCompanionConfig['enabledTriggers']) => {
    if (!config) return;

    try {
      setSaving(true);
      await apiPut('/api/admin/insights/memory-companion', {
        enabledTriggers: {
          [triggerKey]: !config.enabledTriggers[triggerKey],
        },
      });
      await fetchConfig();
    } catch (err: any) {
      setError(err.message || 'Failed to update trigger');
    } finally {
      setSaving(false);
    }
  };

  // Update settings
  const handleUpdateSettings = async (updates: Partial<MemoryCompanionConfig>) => {
    try {
      setSaving(true);
      await apiPut('/api/admin/insights/memory-companion', { updates });
      await fetchConfig();
    } catch (err: any) {
      setError(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  // Reset to defaults
  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset Memory Companion settings to defaults?')) return;

    try {
      setSaving(true);
      await apiPut('/api/admin/insights/memory-companion', { reset: true });
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
        <button onClick={fetchConfig} className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
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
          <h2 className="text-xl font-bold text-gray-900">Memory Companion Configuration</h2>
          <p className="text-sm text-gray-600">Configure memory surfacing settings (maps to user toggle)</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            disabled={saving}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Reset to Defaults
          </button>
          <button
            onClick={handleToggleEnabled}
            disabled={saving}
            className={`px-4 py-2 rounded-md transition-colors disabled:opacity-50 ${
              config.enabled
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {config.enabled ? 'Disable' : 'Enable'} Memory Companion
          </button>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`rounded-lg p-4 ${config.enabled ? 'bg-pink-50 border border-pink-200' : 'bg-yellow-50 border border-yellow-200'}`}>
        <div className="flex items-center">
          <span className="text-2xl mr-3">{config.enabled ? '📸' : '⚠️'}</span>
          <div>
            <p className={`font-semibold ${config.enabled ? 'text-pink-800' : 'text-yellow-800'}`}>
              Memory Companion {config.enabled ? 'Active' : 'Disabled'}
            </p>
            <p className={`text-sm ${config.enabled ? 'text-pink-600' : 'text-yellow-600'}`}>
              Lookback: {config.lookbackDays} days | Frequency: {config.surfacingFrequency}
            </p>
          </div>
        </div>
      </div>

      {/* Surfacing Settings */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Surfacing Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lookback (days)</label>
            <input
              type="number"
              min="30"
              max="1825"
              value={config.lookbackDays}
              onChange={(e) => handleUpdateSettings({ lookbackDays: Number(e.target.value) })}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 mt-1">How far back to look for memories</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Surfacing Frequency</label>
            <select
              value={config.surfacingFrequency}
              onChange={(e) => handleUpdateSettings({ surfacingFrequency: e.target.value as any })}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="smart">Smart (adaptive)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">How often to surface memories</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Memories Per Surface</label>
            <input
              type="number"
              min="1"
              max="10"
              value={config.maxMemoriesPerSurface}
              onChange={(e) => handleUpdateSettings({ maxMemoriesPerSurface: Number(e.target.value) })}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 mt-1">Max memories to show at once</p>
          </div>
        </div>
      </div>

      {/* Enabled Triggers */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Memory Triggers</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(config.enabledTriggers).map(([key, enabled]) => {
            const labels: Record<string, { title: string; description: string; icon: string }> = {
              anniversaries: { title: 'Anniversaries', description: '"1 year ago today..."', icon: '🎂' },
              locationRevisits: { title: 'Location Revisits', description: '"You\'re back at..."', icon: '📍' },
              activityMilestones: { title: 'Activity Milestones', description: '"Your 100th visit to..."', icon: '🏆' },
              seasonalMemories: { title: 'Seasonal Memories', description: '"This time last year..."', icon: '🌸' },
            };
            const info = labels[key] || { title: key, description: '', icon: '📝' };

            return (
              <div
                key={key}
                className={`p-4 rounded-lg border ${enabled ? 'border-pink-200 bg-pink-50' : 'border-gray-200 bg-gray-50'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-xl mr-2">{info.icon}</span>
                    <div>
                      <p className="font-medium text-gray-900">{info.title}</p>
                      <p className="text-xs text-gray-500">{info.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleTrigger(key as keyof MemoryCompanionConfig['enabledTriggers'])}
                    disabled={saving}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      enabled ? 'bg-pink-500' : 'bg-gray-300'
                    } disabled:opacity-50`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quality Settings */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Quality Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Relevance Score (0-1)</label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.1"
              value={config.minRelevanceScore}
              onChange={(e) => handleUpdateSettings({ minRelevanceScore: Number(e.target.value) })}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 mt-1">Minimum relevance to surface</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Memory Age (days)</label>
            <input
              type="number"
              min="1"
              max="365"
              value={config.minMemoryAge}
              onChange={(e) => handleUpdateSettings({ minMemoryAge: Number(e.target.value) })}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 mt-1">Minimum days old to surface</p>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Notification Settings</h3>
        <div className="space-y-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={config.notifyOnMemory}
              onChange={(e) => handleUpdateSettings({ notifyOnMemory: e.target.checked })}
              disabled={saving}
              className="h-4 w-4 text-pink-600 rounded focus:ring-pink-500 disabled:opacity-50"
            />
            <span className="ml-2 text-sm text-gray-700">Notify users when memories are surfaced</span>
          </label>
          {config.notifyOnMemory && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notification Time</label>
              <input
                type="time"
                value={config.notificationTime}
                onChange={(e) => handleUpdateSettings({ notificationTime: e.target.value })}
                disabled={saving}
                className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
              <p className="text-xs text-gray-500 mt-1">When to send memory notifications (24h format)</p>
            </div>
          )}
        </div>
      </div>

      {/* Version info */}
      <div className="text-center text-sm text-gray-500">
        Version: {config.version} | Last updated: {new Date(config.lastUpdatedAt).toLocaleString()}
      </div>
    </div>
  );
}
