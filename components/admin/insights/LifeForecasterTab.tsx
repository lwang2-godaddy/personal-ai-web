'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPut } from '@/lib/api/client';
import { LifeForecasterConfig } from '@/lib/models/InsightsFeatureConfig';

interface LifeForecasterTabProps {
  onSaving?: (saving: boolean) => void;
}

/**
 * Life Forecaster Tab - Configure pattern detection and prediction settings
 * Maps to user toggle: preferences.aiFeatures.lifeForecaster
 */
export default function LifeForecasterTab({ onSaving }: LifeForecasterTabProps) {
  const [config, setConfig] = useState<LifeForecasterConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch configuration
  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiGet<{ config: LifeForecasterConfig }>('/api/admin/insights/life-forecaster');
      setConfig(result.config);
    } catch (err: any) {
      console.error('Failed to fetch life forecaster config:', err);
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
      await apiPut('/api/admin/insights/life-forecaster', { enabled: !config.enabled });
      await fetchConfig();
    } catch (err: any) {
      setError(err.message || 'Failed to update configuration');
    } finally {
      setSaving(false);
    }
  };

  // Update settings
  const handleUpdateSettings = async (updates: Partial<LifeForecasterConfig>) => {
    try {
      setSaving(true);
      await apiPut('/api/admin/insights/life-forecaster', { updates });
      await fetchConfig();
    } catch (err: any) {
      setError(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  // Toggle category
  const handleToggleCategory = async (category: string) => {
    if (!config) return;

    const currentCategories = config.enabledCategories;
    const newCategories = currentCategories.includes(category)
      ? currentCategories.filter((c) => c !== category)
      : [...currentCategories, category];

    try {
      setSaving(true);
      await apiPut('/api/admin/insights/life-forecaster', { enabledCategories: newCategories });
      await fetchConfig();
    } catch (err: any) {
      setError(err.message || 'Failed to update categories');
    } finally {
      setSaving(false);
    }
  };

  // Reset to defaults
  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset Life Forecaster settings to defaults?')) return;

    try {
      setSaving(true);
      await apiPut('/api/admin/insights/life-forecaster', { reset: true });
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

  const allCategories = [
    { id: 'activity', name: 'Activity', icon: '🏃', description: 'Workouts, sports, exercise' },
    { id: 'location', name: 'Location', icon: '📍', description: 'Places, visits, travel' },
    { id: 'health', name: 'Health', icon: '❤️', description: 'Sleep, vitals, wellness' },
    { id: 'social', name: 'Social', icon: '👥', description: 'Social interactions' },
    { id: 'productivity', name: 'Productivity', icon: '⚡', description: 'Work patterns' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Life Forecaster Configuration</h2>
          <p className="text-sm text-gray-600">Configure pattern detection and predictions (maps to user toggle)</p>
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
            {config.enabled ? 'Disable' : 'Enable'} Life Forecaster
          </button>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`rounded-lg p-4 ${config.enabled ? 'bg-indigo-50 border border-indigo-200' : 'bg-yellow-50 border border-yellow-200'}`}>
        <div className="flex items-center">
          <span className="text-2xl mr-3">{config.enabled ? '🔮' : '⚠️'}</span>
          <div>
            <p className={`font-semibold ${config.enabled ? 'text-indigo-800' : 'text-yellow-800'}`}>
              Life Forecaster {config.enabled ? 'Active' : 'Disabled'}
            </p>
            <p className={`text-sm ${config.enabled ? 'text-indigo-600' : 'text-yellow-600'}`}>
              Min confidence: {config.minConfidence} | Lookback: {config.lookbackDays} days
            </p>
          </div>
        </div>
      </div>

      {/* Pattern Detection Settings */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Pattern Detection Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Occurrences</label>
            <input
              type="number"
              min="2"
              max="20"
              value={config.minOccurrences}
              onChange={(e) => handleUpdateSettings({ minOccurrences: Number(e.target.value) })}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 mt-1">Minimum occurrences to detect pattern</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Confidence (0-1)</label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.1"
              value={config.minConfidence}
              onChange={(e) => handleUpdateSettings({ minConfidence: Number(e.target.value) })}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 mt-1">Minimum confidence to show prediction</p>
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

      {/* Enabled Categories */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Prediction Categories</h3>
        <p className="text-sm text-gray-600 mb-4">Which categories should be analyzed for patterns?</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allCategories.map((category) => {
            const enabled = config.enabledCategories.includes(category.id);

            return (
              <div
                key={category.id}
                className={`p-4 rounded-lg border ${enabled ? 'border-indigo-200 bg-indigo-50' : 'border-gray-200 bg-gray-50'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-xl mr-2">{category.icon}</span>
                    <div>
                      <p className="font-medium text-gray-900">{category.name}</p>
                      <p className="text-xs text-gray-500">{category.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleCategory(category.id)}
                    disabled={saving}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      enabled ? 'bg-indigo-500' : 'bg-gray-300'
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

      {/* Prediction Settings */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Prediction Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Predictions Per Day</label>
            <input
              type="number"
              min="1"
              max="10"
              value={config.maxPredictionsPerDay}
              onChange={(e) => handleUpdateSettings({ maxPredictionsPerDay: Number(e.target.value) })}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 mt-1">Maximum predictions shown per day</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prediction Horizon (days)</label>
            <input
              type="number"
              min="1"
              max="30"
              value={config.predictionHorizonDays}
              onChange={(e) => handleUpdateSettings({ predictionHorizonDays: Number(e.target.value) })}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 mt-1">How far ahead to predict</p>
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
              checked={config.showConfidenceScore}
              onChange={(e) => handleUpdateSettings({ showConfidenceScore: e.target.checked })}
              disabled={saving}
              className="h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500 disabled:opacity-50"
            />
            <span className="ml-2 text-sm text-gray-700">Show confidence score to users</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={config.showPatternExplanation}
              onChange={(e) => handleUpdateSettings({ showPatternExplanation: e.target.checked })}
              disabled={saving}
              className="h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500 disabled:opacity-50"
            />
            <span className="ml-2 text-sm text-gray-700">Show pattern explanation to users</span>
          </label>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Notification Settings</h3>
        <div className="space-y-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={config.notifyOnPrediction}
              onChange={(e) => handleUpdateSettings({ notifyOnPrediction: e.target.checked })}
              disabled={saving}
              className="h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500 disabled:opacity-50"
            />
            <span className="ml-2 text-sm text-gray-700">Notify users about predictions</span>
          </label>
          {config.notifyOnPrediction && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notification Time</label>
              <input
                type="time"
                value={config.notificationTime}
                onChange={(e) => handleUpdateSettings({ notificationTime: e.target.value })}
                disabled={saving}
                className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
              <p className="text-xs text-gray-500 mt-1">When to send prediction notifications (24h format)</p>
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
