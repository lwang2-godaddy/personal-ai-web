'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPut } from '@/lib/api/client';
import { MoodCompassConfig } from '@/lib/models/InsightsFeatureConfig';

interface MoodCompassTabProps {
  onSaving?: (saving: boolean) => void;
}

/**
 * Mood Compass Tab - Configure mood analysis settings
 * Maps to user toggle: preferences.aiFeatures.moodCompass
 */
export default function MoodCompassTab({ onSaving }: MoodCompassTabProps) {
  const [config, setConfig] = useState<MoodCompassConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch configuration
  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiGet<{ config: MoodCompassConfig }>('/api/admin/insights/mood-compass');
      setConfig(result.config);
    } catch (err: any) {
      console.error('Failed to fetch mood compass config:', err);
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
      await apiPut('/api/admin/insights/mood-compass', { enabled: !config.enabled });
      await fetchConfig();
    } catch (err: any) {
      setError(err.message || 'Failed to update configuration');
    } finally {
      setSaving(false);
    }
  };

  // Toggle factor
  const handleToggleFactor = async (factorKey: keyof MoodCompassConfig['enabledFactors']) => {
    if (!config) return;

    try {
      setSaving(true);
      await apiPut('/api/admin/insights/mood-compass', {
        enabledFactors: {
          [factorKey]: !config.enabledFactors[factorKey],
        },
      });
      await fetchConfig();
    } catch (err: any) {
      setError(err.message || 'Failed to update factor');
    } finally {
      setSaving(false);
    }
  };

  // Update settings
  const handleUpdateSettings = async (updates: Partial<MoodCompassConfig>) => {
    try {
      setSaving(true);
      await apiPut('/api/admin/insights/mood-compass', { updates });
      await fetchConfig();
    } catch (err: any) {
      setError(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  // Update anomaly detection
  const handleUpdateAnomalyDetection = async (updates: Partial<MoodCompassConfig['anomalyDetection']>) => {
    if (!config) return;

    try {
      setSaving(true);
      await apiPut('/api/admin/insights/mood-compass', {
        anomalyDetection: updates,
      });
      await fetchConfig();
    } catch (err: any) {
      setError(err.message || 'Failed to update anomaly detection');
    } finally {
      setSaving(false);
    }
  };

  // Reset to defaults
  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset Mood Compass settings to defaults?')) return;

    try {
      setSaving(true);
      await apiPut('/api/admin/insights/mood-compass', { reset: true });
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
          <h2 className="text-xl font-bold text-gray-900">Mood Compass Configuration</h2>
          <p className="text-sm text-gray-600">Configure emotional pattern analysis (maps to user toggle)</p>
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
            {config.enabled ? 'Disable' : 'Enable'} Mood Compass
          </button>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`rounded-lg p-4 ${config.enabled ? 'bg-purple-50 border border-purple-200' : 'bg-yellow-50 border border-yellow-200'}`}>
        <div className="flex items-center">
          <span className="text-2xl mr-3">{config.enabled ? '🧭' : '⚠️'}</span>
          <div>
            <p className={`font-semibold ${config.enabled ? 'text-purple-800' : 'text-yellow-800'}`}>
              Mood Compass {config.enabled ? 'Active' : 'Disabled'}
            </p>
            <p className={`text-sm ${config.enabled ? 'text-purple-600' : 'text-yellow-600'}`}>
              Min correlation: {config.minCorrelation} | Lookback: {config.lookbackDays} days
            </p>
          </div>
        </div>
      </div>

      {/* Analysis Settings */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Analysis Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Correlation (0-1)</label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.1"
              value={config.minCorrelation}
              onChange={(e) => handleUpdateSettings({ minCorrelation: Number(e.target.value) })}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 mt-1">Minimum correlation to show</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Data Points</label>
            <input
              type="number"
              min="7"
              max="90"
              value={config.minDataPoints}
              onChange={(e) => handleUpdateSettings({ minDataPoints: Number(e.target.value) })}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 mt-1">Days of data needed</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lookback (days)</label>
            <input
              type="number"
              min="7"
              max="365"
              value={config.lookbackDays}
              onChange={(e) => handleUpdateSettings({ lookbackDays: Number(e.target.value) })}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 mt-1">Days of history to analyze</p>
          </div>
        </div>
      </div>

      {/* Enabled Factors */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Correlation Factors</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(config.enabledFactors).map(([key, enabled]) => {
            const labels: Record<string, { title: string; description: string; icon: string }> = {
              steps: { title: 'Steps', description: 'Daily step count', icon: '👟' },
              sleep: { title: 'Sleep', description: 'Sleep duration & quality', icon: '😴' },
              workouts: { title: 'Workouts', description: 'Exercise sessions', icon: '💪' },
              location: { title: 'Location', description: 'Places visited', icon: '📍' },
              weather: { title: 'Weather', description: 'Weather conditions', icon: '🌤️' },
              socialActivity: { title: 'Social Activity', description: 'Social interactions', icon: '👥' },
            };
            const info = labels[key] || { title: key, description: '', icon: '📝' };

            return (
              <div
                key={key}
                className={`p-4 rounded-lg border ${enabled ? 'border-purple-200 bg-purple-50' : 'border-gray-200 bg-gray-50'}`}
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
                    onClick={() => handleToggleFactor(key as keyof MoodCompassConfig['enabledFactors'])}
                    disabled={saving}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      enabled ? 'bg-purple-500' : 'bg-gray-300'
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

      {/* Anomaly Detection */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Anomaly Detection</h3>
          <button
            onClick={() => handleUpdateAnomalyDetection({ enabled: !config.anomalyDetection.enabled })}
            disabled={saving}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              config.anomalyDetection.enabled ? 'bg-purple-500' : 'bg-gray-300'
            } disabled:opacity-50`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                config.anomalyDetection.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Z-Score Threshold</label>
            <input
              type="number"
              min="1"
              max="5"
              step="0.1"
              value={config.anomalyDetection.zScoreThreshold}
              onChange={(e) => handleUpdateAnomalyDetection({ zScoreThreshold: Number(e.target.value) })}
              disabled={saving || !config.anomalyDetection.enabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 mt-1">Standard deviations for anomaly (default: 2.0)</p>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={config.anomalyDetection.notifyOnAnomaly}
              onChange={(e) => handleUpdateAnomalyDetection({ notifyOnAnomaly: e.target.checked })}
              disabled={saving || !config.anomalyDetection.enabled}
              className="h-4 w-4 text-purple-600 rounded focus:ring-purple-500 disabled:opacity-50"
            />
            <label className="ml-2 text-sm text-gray-700">Notify on anomaly detection</label>
          </div>
        </div>
      </div>

      {/* Display Settings */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Display Settings</h3>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={config.showCorrelationScore}
              onChange={(e) => handleUpdateSettings({ showCorrelationScore: e.target.checked })}
              disabled={saving}
              className="h-4 w-4 text-purple-600 rounded focus:ring-purple-500 disabled:opacity-50"
            />
            <span className="ml-2 text-sm text-gray-700">Show correlation score to users</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={config.showTrendChart}
              onChange={(e) => handleUpdateSettings({ showTrendChart: e.target.checked })}
              disabled={saving}
              className="h-4 w-4 text-purple-600 rounded focus:ring-purple-500 disabled:opacity-50"
            />
            <span className="ml-2 text-sm text-gray-700">Show trend chart to users</span>
          </label>
        </div>
      </div>

      {/* Version info */}
      <div className="text-center text-sm text-gray-500">
        Version: {config.version} | Last updated: {new Date(config.lastUpdatedAt).toLocaleString()}
      </div>
    </div>
  );
}
