'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPut } from '@/lib/api/client';
import { FunFactsConfig } from '@/lib/models/InsightsFeatureConfig';

interface FunFactsTabProps {
  onSaving?: (saving: boolean) => void;
}

/**
 * Fun Facts Tab - Configure milestone thresholds and fact templates
 */
export default function FunFactsTab({ onSaving }: FunFactsTabProps) {
  const [config, setConfig] = useState<FunFactsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch configuration
  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiGet<{ config: FunFactsConfig }>('/api/admin/insights/fun-facts');
      setConfig(result.config);
    } catch (err: any) {
      console.error('Failed to fetch fun facts config:', err);
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
      await apiPut('/api/admin/insights/fun-facts', { enabled: !config.enabled });
      await fetchConfig();
    } catch (err: any) {
      setError(err.message || 'Failed to update configuration');
    } finally {
      setSaving(false);
    }
  };

  // Toggle template
  const handleToggleTemplate = async (templateKey: keyof FunFactsConfig['enabledTemplates']) => {
    if (!config) return;

    try {
      setSaving(true);
      await apiPut('/api/admin/insights/fun-facts', {
        enabledTemplates: {
          [templateKey]: !config.enabledTemplates[templateKey],
        },
      });
      await fetchConfig();
    } catch (err: any) {
      setError(err.message || 'Failed to update template');
    } finally {
      setSaving(false);
    }
  };

  // Update settings
  const handleUpdateSettings = async (updates: Partial<FunFactsConfig>) => {
    try {
      setSaving(true);
      await apiPut('/api/admin/insights/fun-facts', { updates });
      await fetchConfig();
    } catch (err: any) {
      setError(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  // Reset to defaults
  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset Fun Facts settings to defaults?')) return;

    try {
      setSaving(true);
      await apiPut('/api/admin/insights/fun-facts', { reset: true });
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
          <h2 className="text-xl font-bold text-gray-900">Fun Facts Configuration</h2>
          <p className="text-sm text-gray-600">Configure trivia and milestone generation</p>
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
            {config.enabled ? 'Disable' : 'Enable'} Fun Facts
          </button>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`rounded-lg p-4 ${config.enabled ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
        <div className="flex items-center">
          <span className="text-2xl mr-3">{config.enabled ? '✅' : '⚠️'}</span>
          <div>
            <p className={`font-semibold ${config.enabled ? 'text-green-800' : 'text-yellow-800'}`}>
              Fun Facts {config.enabled ? 'Active' : 'Disabled'}
            </p>
            <p className={`text-sm ${config.enabled ? 'text-green-600' : 'text-yellow-600'}`}>
              Max {config.maxFactsPerDay} facts per day | {config.cooldownHours}h cooldown
            </p>
          </div>
        </div>
      </div>

      {/* Global Settings */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Global Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Facts Per Day</label>
            <input
              type="number"
              min="1"
              max="20"
              value={config.maxFactsPerDay}
              onChange={(e) => handleUpdateSettings({ maxFactsPerDay: Number(e.target.value) })}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cooldown (hours)</label>
            <input
              type="number"
              min="1"
              max="168"
              value={config.cooldownHours}
              onChange={(e) => handleUpdateSettings({ cooldownHours: Number(e.target.value) })}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Template Toggles */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Enabled Templates</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(config.enabledTemplates).map(([key, enabled]) => {
            const labels: Record<string, { title: string; description: string; icon: string }> = {
              stepMilestones: { title: 'Step Milestones', description: 'Walking/step achievements', icon: '👟' },
              locationMilestones: { title: 'Location Milestones', description: 'Places visited', icon: '📍' },
              activityMilestones: { title: 'Activity Milestones', description: 'Activity achievements', icon: '🏃' },
              sleepFacts: { title: 'Sleep Facts', description: 'Sleep patterns & insights', icon: '😴' },
              workoutFacts: { title: 'Workout Facts', description: 'Exercise achievements', icon: '💪' },
              comparisonFacts: { title: 'Comparison Facts', description: 'Period comparisons', icon: '📊' },
            };
            const info = labels[key] || { title: key, description: '', icon: '📝' };

            return (
              <div
                key={key}
                className={`p-4 rounded-lg border ${enabled ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}
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
                    onClick={() => handleToggleTemplate(key as keyof FunFactsConfig['enabledTemplates'])}
                    disabled={saving}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      enabled ? 'bg-green-500' : 'bg-gray-300'
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

      {/* Milestone Thresholds */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Milestone Thresholds</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Step Milestones</label>
            <p className="text-xs text-gray-500 mb-2">Comma-separated values (e.g., 50000, 100000, 500000)</p>
            <input
              type="text"
              value={config.stepMilestones.join(', ')}
              onChange={(e) => {
                const values = e.target.value.split(',').map((v) => parseInt(v.trim())).filter((v) => !isNaN(v));
                if (values.length > 0) handleUpdateSettings({ stepMilestones: values });
              }}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location Milestones</label>
            <p className="text-xs text-gray-500 mb-2">Number of unique locations visited</p>
            <input
              type="text"
              value={config.locationMilestones.join(', ')}
              onChange={(e) => {
                const values = e.target.value.split(',').map((v) => parseInt(v.trim())).filter((v) => !isNaN(v));
                if (values.length > 0) handleUpdateSettings({ locationMilestones: values });
              }}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Activity Milestones</label>
            <p className="text-xs text-gray-500 mb-2">Number of activity completions</p>
            <input
              type="text"
              value={config.activityMilestones.join(', ')}
              onChange={(e) => {
                const values = e.target.value.split(',').map((v) => parseInt(v.trim())).filter((v) => !isNaN(v));
                if (values.length > 0) handleUpdateSettings({ activityMilestones: values });
              }}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Version info */}
      <div className="text-center text-sm text-gray-500">
        Version: {config.version} | Last updated: {new Date(config.lastUpdatedAt).toLocaleString()}
      </div>
    </div>
  );
}
