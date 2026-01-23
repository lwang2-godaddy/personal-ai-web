'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { apiGet, apiPut } from '@/lib/api/client';
import {
  LifeKeywordsConfig,
  LifeKeywordCategory,
  KEYWORD_CATEGORY_METADATA,
  LIFE_KEYWORDS_PROMPTS,
} from '@/lib/models/InsightsFeatureConfig';

interface LifeKeywordsAnalytics {
  totalGenerated: number;
  last24h: number;
  last7d: number;
  byPeriodType: Record<string, number>;
  byCategory: Record<string, number>;
  avgConfidence: number;
  viewRate: number;
  expandRate: number;
}

interface LifeKeywordsTabProps {
  onSaving?: (saving: boolean) => void;
}

/**
 * Life Keywords Tab - Configure keyword generation settings
 * Maps to user toggle: preferences.aiFeatures.lifeKeywords
 */
export default function LifeKeywordsTab({ onSaving }: LifeKeywordsTabProps) {
  const [config, setConfig] = useState<LifeKeywordsConfig | null>(null);
  const [analytics, setAnalytics] = useState<LifeKeywordsAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch configuration
  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiGet<{ config: LifeKeywordsConfig; analytics?: LifeKeywordsAnalytics }>(
        '/api/admin/insights/life-keywords?analytics=true'
      );
      setConfig(result.config);
      if (result.analytics) {
        setAnalytics(result.analytics);
      }
    } catch (err: any) {
      console.error('Failed to fetch life keywords config:', err);
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
      await apiPut('/api/admin/insights/life-keywords', { enabled: !config.enabled });
      await fetchConfig();
    } catch (err: any) {
      setError(err.message || 'Failed to update configuration');
    } finally {
      setSaving(false);
    }
  };

  // Update settings
  const handleUpdateSettings = async (updates: Partial<LifeKeywordsConfig>) => {
    try {
      setSaving(true);
      await apiPut('/api/admin/insights/life-keywords', { updates });
      await fetchConfig();
    } catch (err: any) {
      setError(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  // Toggle period
  const handleTogglePeriod = async (period: keyof LifeKeywordsConfig['enabledPeriods']) => {
    if (!config) return;

    const newPeriods = {
      ...config.enabledPeriods,
      [period]: !config.enabledPeriods[period],
    };

    try {
      setSaving(true);
      await apiPut('/api/admin/insights/life-keywords', { enabledPeriods: newPeriods });
      await fetchConfig();
    } catch (err: any) {
      setError(err.message || 'Failed to update periods');
    } finally {
      setSaving(false);
    }
  };

  // Toggle category
  const handleToggleCategory = async (category: LifeKeywordCategory) => {
    if (!config) return;

    const newCategories = {
      ...config.enabledCategories,
      [category]: !config.enabledCategories[category],
    };

    try {
      setSaving(true);
      await apiPut('/api/admin/insights/life-keywords', { enabledCategories: newCategories });
      await fetchConfig();
    } catch (err: any) {
      setError(err.message || 'Failed to update categories');
    } finally {
      setSaving(false);
    }
  };

  // Reset to defaults
  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset Life Keywords settings to defaults?')) return;

    try {
      setSaving(true);
      await apiPut('/api/admin/insights/life-keywords', { reset: true });
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
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
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

  const periodTypes = [
    { id: 'weekly', name: 'Weekly', icon: '📅', description: 'Generate keywords every Monday' },
    { id: 'monthly', name: 'Monthly', icon: '📆', description: 'Generate keywords on 1st of month' },
    { id: 'quarterly', name: 'Quarterly', icon: '📊', description: 'Generate keywords each quarter' },
    { id: 'yearly', name: 'Yearly', icon: '📈', description: 'Generate year-in-review keywords' },
  ] as const;

  const categories = Object.entries(KEYWORD_CATEGORY_METADATA).map(([id, meta]) => ({
    id: id as LifeKeywordCategory,
    ...meta,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Life Keywords Configuration</h2>
          <p className="text-sm text-gray-600">AI-generated themes and patterns from user data</p>
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
            {config.enabled ? 'Disable' : 'Enable'} Life Keywords
          </button>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`rounded-lg p-4 ${config.enabled ? 'bg-purple-50 border border-purple-200' : 'bg-yellow-50 border border-yellow-200'}`}>
        <div className="flex items-center">
          <span className="text-2xl mr-3">{config.enabled ? '🔑' : '⚠️'}</span>
          <div>
            <p className={`font-semibold ${config.enabled ? 'text-purple-800' : 'text-yellow-800'}`}>
              Life Keywords {config.enabled ? 'Active' : 'Disabled'}
            </p>
            <p className={`text-sm ${config.enabled ? 'text-purple-600' : 'text-yellow-600'}`}>
              Min confidence: {config.minConfidence} | Max lookback: {config.maxLookbackMonths} months
            </p>
          </div>
        </div>
      </div>

      {/* Prompts Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Prompts</h3>
            <p className="text-sm text-gray-500">
              AI prompts used to generate life keywords
            </p>
          </div>
          <Link
            href="/admin/prompts?service=KeywordGenerator"
            className="text-sm text-purple-600 hover:text-purple-700 font-medium"
          >
            View All Prompts →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {LIFE_KEYWORDS_PROMPTS.map((prompt) => (
            <Link
              key={prompt.id}
              href={`/admin/prompts?service=KeywordGenerator&prompt=${prompt.id}`}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-purple-50 hover:border-purple-200 border border-gray-100 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">
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
      </div>

      {/* Analytics Summary */}
      {analytics && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Analytics Overview</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-3xl font-bold text-purple-600">{analytics.totalGenerated}</p>
              <p className="text-sm text-gray-600">Total Keywords</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-3xl font-bold text-blue-600">{analytics.last7d}</p>
              <p className="text-sm text-gray-600">Last 7 Days</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-3xl font-bold text-green-600">{(analytics.viewRate * 100).toFixed(1)}%</p>
              <p className="text-sm text-gray-600">View Rate</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-3xl font-bold text-orange-600">{(analytics.avgConfidence * 100).toFixed(0)}%</p>
              <p className="text-sm text-gray-600">Avg Confidence</p>
            </div>
          </div>

          {/* By Period Type */}
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">By Period Type</p>
            <div className="flex gap-4">
              {Object.entries(analytics.byPeriodType).map(([type, count]) => (
                <div key={type} className="px-3 py-1 bg-purple-100 rounded-full text-sm">
                  <span className="font-medium">{type}:</span> {count}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Enabled Periods */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Generation Periods</h3>
        <p className="text-sm text-gray-600 mb-4">Which time periods should generate keywords?</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {periodTypes.map((period) => {
            const enabled = config.enabledPeriods[period.id];

            return (
              <div
                key={period.id}
                className={`p-4 rounded-lg border ${enabled ? 'border-purple-200 bg-purple-50' : 'border-gray-200 bg-gray-50'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-xl mr-2">{period.icon}</span>
                    <div>
                      <p className="font-medium text-gray-900">{period.name}</p>
                      <p className="text-xs text-gray-500">{period.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleTogglePeriod(period.id)}
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

      {/* Keywords Per Period */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Keywords Per Period</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Weekly</label>
            <input
              type="number"
              min="1"
              max="10"
              value={config.keywordsPerWeek}
              onChange={(e) => handleUpdateSettings({ keywordsPerWeek: Number(e.target.value) })}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monthly</label>
            <input
              type="number"
              min="1"
              max="20"
              value={config.keywordsPerMonth}
              onChange={(e) => handleUpdateSettings({ keywordsPerMonth: Number(e.target.value) })}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quarterly</label>
            <input
              type="number"
              min="1"
              max="15"
              value={config.keywordsPerQuarter}
              onChange={(e) => handleUpdateSettings({ keywordsPerQuarter: Number(e.target.value) })}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Yearly</label>
            <input
              type="number"
              min="1"
              max="20"
              value={config.keywordsPerYear}
              onChange={(e) => handleUpdateSettings({ keywordsPerYear: Number(e.target.value) })}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Quality Settings */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Quality Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Data Points (Weekly)</label>
            <input
              type="number"
              min="1"
              max="100"
              value={config.minDataPointsWeekly}
              onChange={(e) => handleUpdateSettings({ minDataPointsWeekly: Number(e.target.value) })}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 mt-1">Minimum data points needed for weekly keywords</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Data Points (Monthly)</label>
            <input
              type="number"
              min="1"
              max="500"
              value={config.minDataPointsMonthly}
              onChange={(e) => handleUpdateSettings({ minDataPointsMonthly: Number(e.target.value) })}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 mt-1">Minimum data points for monthly keywords</p>
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 mt-1">Minimum confidence to publish keyword</p>
          </div>
        </div>
      </div>

      {/* Schedule Settings */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Schedule Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Weekly Generation Day</label>
            <select
              value={config.weeklyGenerationDay}
              onChange={(e) => handleUpdateSettings({ weeklyGenerationDay: Number(e.target.value) })}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            >
              <option value={0}>Sunday</option>
              <option value={1}>Monday</option>
              <option value={2}>Tuesday</option>
              <option value={3}>Wednesday</option>
              <option value={4}>Thursday</option>
              <option value={5}>Friday</option>
              <option value={6}>Saturday</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Generation Day</label>
            <input
              type="number"
              min="1"
              max="28"
              value={config.monthlyGenerationDay}
              onChange={(e) => handleUpdateSettings({ monthlyGenerationDay: Number(e.target.value) })}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 mt-1">Day of month (1-28)</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Generation Hour (UTC)</label>
            <input
              type="number"
              min="0"
              max="23"
              value={config.generationHourUTC}
              onChange={(e) => handleUpdateSettings({ generationHourUTC: Number(e.target.value) })}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 mt-1">Hour in UTC (0-23)</p>
          </div>
        </div>
      </div>

      {/* Lookback Setting */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Display Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Lookback (months)</label>
            <input
              type="number"
              min="1"
              max="24"
              value={config.maxLookbackMonths}
              onChange={(e) => handleUpdateSettings({ maxLookbackMonths: Number(e.target.value) })}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 mt-1">How far back to show keywords in the app</p>
          </div>
        </div>
      </div>

      {/* Enabled Categories */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Keyword Categories</h3>
        <p className="text-sm text-gray-600 mb-4">Which categories of keywords should be generated?</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => {
            const enabled = config.enabledCategories[category.id];

            return (
              <div
                key={category.id}
                className={`p-4 rounded-lg border ${enabled ? 'border-purple-200 bg-purple-50' : 'border-gray-200 bg-gray-50'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-xl mr-2">{category.icon}</span>
                    <div>
                      <p className="font-medium text-gray-900">{category.displayName}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleCategory(category.id)}
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

      {/* Version info */}
      <div className="text-center text-sm text-gray-500">
        Version: {config.version} | Last updated: {new Date(config.lastUpdatedAt).toLocaleString()}
      </div>
    </div>
  );
}
