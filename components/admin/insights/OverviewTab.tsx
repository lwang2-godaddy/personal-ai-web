'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPut } from '@/lib/api/client';
import {
  InsightsAdminConfig,
  InsightsCategory,
  CATEGORY_METADATA,
  INSIGHTS_CATEGORIES,
} from '@/lib/models/InsightsConfig';
import { InsightsSchedulerConfig, DEFAULT_SCHEDULER_CONFIG } from '@/lib/models/InsightsFeatureConfig';

interface OverviewTabProps {
  onSaving?: (saving: boolean) => void;
}

interface InsightsData {
  config: InsightsAdminConfig;
  analytics: {
    totalPosts: number;
    postsByCategory: Record<InsightsCategory, number>;
    postsLast24h: number;
    postsLast7d: number;
  };
}

/**
 * Overview Tab - Dashboard, global settings, unified scheduling
 * Combines analytics, schedule, rate limits, and home feed configuration
 */
export default function OverviewTab({ onSaving }: OverviewTabProps) {
  // Main config state
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Scheduler state
  const [schedulerConfig, setSchedulerConfig] = useState<InsightsSchedulerConfig>(DEFAULT_SCHEDULER_CONFIG);
  const [schedulerLoading, setSchedulerLoading] = useState(true);
  const [scheduleSaveSuccess, setScheduleSaveSuccess] = useState(false);

  // Editable rate limits state
  const [editingRateLimits, setEditingRateLimits] = useState(false);
  const [maxPostsPerDay, setMaxPostsPerDay] = useState(3);
  const [cooldownHours, setCooldownHours] = useState(2);

  // Editable home feed state
  const [editingHomeFeed, setEditingHomeFeed] = useState(false);
  const [homeFeedEnabled, setHomeFeedEnabled] = useState(true);
  const [homeFeedMaxItems, setHomeFeedMaxItems] = useState(3);
  const [homeFeedRefreshInterval, setHomeFeedRefreshInterval] = useState(4);

  // Editable refresh cooldowns state
  const [editingRefreshCooldowns, setEditingRefreshCooldowns] = useState(false);
  const [dataRefreshCooldown, setDataRefreshCooldown] = useState(30);
  const [generateCooldown, setGenerateCooldown] = useState(60);
  const [postsRefreshCooldown, setPostsRefreshCooldown] = useState(0);

  // Fetch main configuration
  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiGet<InsightsData>('/api/admin/insights');
      setData(result);
      // Initialize editable states
      setMaxPostsPerDay(result.config.maxPostsPerUserPerDay);
      setCooldownHours(result.config.globalCooldownHours);
      setHomeFeedEnabled(result.config.homeFeed.enabled);
      setHomeFeedMaxItems(result.config.homeFeed.maxItems);
      setHomeFeedRefreshInterval(result.config.homeFeed.refreshInterval);
      // Initialize refresh cooldowns (with fallback defaults for older configs)
      setDataRefreshCooldown(result.config.refreshCooldowns?.dataRefreshCooldownSeconds ?? 30);
      setGenerateCooldown(result.config.refreshCooldowns?.generateCooldownSeconds ?? 60);
      setPostsRefreshCooldown(result.config.refreshCooldowns?.postsRefreshCooldownSeconds ?? 0);
    } catch (err: any) {
      console.error('Failed to fetch insights config:', err);
      setError(err.message || 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch scheduler configuration
  const fetchSchedulerConfig = useCallback(async () => {
    try {
      setSchedulerLoading(true);
      const result = await apiGet<InsightsSchedulerConfig>('/api/admin/insights/scheduler');
      setSchedulerConfig(result);
    } catch (err: any) {
      console.error('Failed to fetch scheduler config:', err);
      setSchedulerConfig(DEFAULT_SCHEDULER_CONFIG);
    } finally {
      setSchedulerLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
    fetchSchedulerConfig();
  }, [fetchConfig, fetchSchedulerConfig]);

  useEffect(() => {
    onSaving?.(saving);
  }, [saving, onSaving]);

  // Toggle global enabled
  const handleGlobalToggle = async () => {
    if (!data) return;

    try {
      setSaving(true);
      await apiPut('/api/admin/insights', { enabled: !data.config.enabled });
      await fetchConfig();
    } catch (err: any) {
      setError(err.message || 'Failed to update configuration');
    } finally {
      setSaving(false);
    }
  };

  // Reset to defaults
  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset all insights settings to defaults?')) return;

    try {
      setSaving(true);
      await apiPut('/api/admin/insights', { reset: true });
      await fetchConfig();
    } catch (err: any) {
      setError(err.message || 'Failed to reset configuration');
    } finally {
      setSaving(false);
    }
  };


  // Generate cron expression from hours
  const generateCronExpression = (morning: number, afternoon: number, evening: number): string => {
    return `0 ${morning},${afternoon},${evening} * * *`;
  };

  // Update schedule time
  const handleTimeChange = (field: 'morningHour' | 'afternoonHour' | 'eveningHour', value: number) => {
    const newConfig = { ...schedulerConfig, [field]: value };
    newConfig.cronExpression = generateCronExpression(
      newConfig.morningHour,
      newConfig.afternoonHour,
      newConfig.eveningHour
    );
    setSchedulerConfig(newConfig);
  };

  // Save scheduler configuration
  const handleSaveSchedule = async () => {
    try {
      setSaving(true);
      setScheduleSaveSuccess(false);
      await apiPut('/api/admin/insights/scheduler', schedulerConfig);
      setScheduleSaveSuccess(true);
      setTimeout(() => setScheduleSaveSuccess(false), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to save schedule');
    } finally {
      setSaving(false);
    }
  };

  // Reset scheduler to defaults
  const handleResetSchedule = async () => {
    if (!confirm('Are you sure you want to reset scheduler settings to defaults?')) return;

    try {
      setSaving(true);
      await apiPut('/api/admin/insights/scheduler', { reset: true });
      await fetchSchedulerConfig();
    } catch (err: any) {
      setError(err.message || 'Failed to reset schedule');
    } finally {
      setSaving(false);
    }
  };

  // Save rate limits
  const handleSaveRateLimits = async () => {
    try {
      setSaving(true);
      await apiPut('/api/admin/insights', {
        maxPostsPerUserPerDay: maxPostsPerDay,
        globalCooldownHours: cooldownHours,
      });
      await fetchConfig();
      setEditingRateLimits(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save rate limits');
    } finally {
      setSaving(false);
    }
  };

  // Save home feed config
  const handleSaveHomeFeed = async () => {
    try {
      setSaving(true);
      await apiPut('/api/admin/insights', {
        homeFeed: {
          enabled: homeFeedEnabled,
          maxItems: homeFeedMaxItems,
          refreshInterval: homeFeedRefreshInterval,
        },
      });
      await fetchConfig();
      setEditingHomeFeed(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save home feed settings');
    } finally {
      setSaving(false);
    }
  };

  // Save refresh cooldowns config
  const handleSaveRefreshCooldowns = async () => {
    try {
      setSaving(true);
      await apiPut('/api/admin/insights', {
        refreshCooldowns: {
          dataRefreshCooldownSeconds: dataRefreshCooldown,
          generateCooldownSeconds: generateCooldown,
          postsRefreshCooldownSeconds: postsRefreshCooldown,
        },
      });
      await fetchConfig();
      setEditingRefreshCooldowns(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save refresh cooldowns');
    } finally {
      setSaving(false);
    }
  };

  // Generate hour options for dropdowns
  const morningHours = Array.from({ length: 8 }, (_, i) => i + 5); // 5-12
  const afternoonHours = Array.from({ length: 6 }, (_, i) => i + 12); // 12-17
  const eveningHours = Array.from({ length: 6 }, (_, i) => i + 18); // 18-23

  // Count active features
  const countActiveFeatures = () => {
    // This is a simple count - in reality you'd check each feature's enabled state
    return 6; // Fun Facts, Mood Compass, Memory Companion, Life Forecaster, Daily Insight, This Day
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{error || 'No configuration available'}</p>
        <button
          onClick={fetchConfig}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const { config, analytics } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Overview Dashboard</h2>
          <p className="text-sm text-gray-600">Global settings, schedule, and analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            disabled={saving}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Reset to Defaults
          </button>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <p className="text-sm font-medium text-gray-600">Total Posts</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{analytics.totalPosts.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <p className="text-sm font-medium text-gray-600">Last 24 Hours</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{analytics.postsLast24h.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
          <p className="text-sm font-medium text-gray-600">Last 7 Days</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{analytics.postsLast7d.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
          <p className="text-sm font-medium text-gray-600">Active Features</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{countActiveFeatures()}/6</p>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`rounded-lg p-4 ${config.enabled ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-2xl mr-3">{config.enabled ? '✅' : '⚠️'}</span>
            <div>
              <p className={`font-semibold ${config.enabled ? 'text-green-800' : 'text-yellow-800'}`}>
                {config.enabled ? 'Insights System Active' : 'Insights System Disabled'}
              </p>
              <p className={`text-sm ${config.enabled ? 'text-green-600' : 'text-yellow-600'}`}>
                Last updated: {new Date(config.lastUpdatedAt).toLocaleString()} by {config.lastUpdatedBy}
              </p>
            </div>
          </div>
          <button
            onClick={handleGlobalToggle}
            disabled={saving}
            className={`px-4 py-2 rounded-md transition-colors disabled:opacity-50 ${
              config.enabled
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {config.enabled ? 'Disable Insights' : 'Enable Insights'}
          </button>
        </div>
      </div>

      {/* Generation Schedules Overview */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Generation Schedules</h3>
            <p className="text-sm text-gray-500">Two separate generation paths produce Life Feed posts</p>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
          <div className="flex items-start">
            <span className="text-yellow-600 text-lg mr-2">⚠️</span>
            <p className="text-sm text-yellow-800">
              Schedule changes require <strong>Firebase Functions redeployment</strong> to take effect.
            </p>
          </div>
        </div>

        {/* Two Generation Paths */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Path 1: Life Feed Generator */}
          <div className="border border-blue-200 rounded-lg p-4 bg-blue-50/50">
            <div className="flex items-center mb-3">
              <span className="text-2xl mr-2">📰</span>
              <div>
                <h4 className="font-semibold text-gray-900">Path 1: Life Feed Generator</h4>
                <p className="text-xs text-gray-500">GPT-powered posts via lifeFeed.yaml prompts</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Schedule:</span>
                <span className="font-mono text-blue-700">3x daily (8, 14, 20 UTC)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Trigger:</span>
                <span className="text-gray-800">"Generate Feed" button</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Output:</span>
                <span className="text-gray-800">8 post types (Life Summary, Milestone, etc.)</span>
              </div>
            </div>
          </div>

          {/* Path 2: AI Insights */}
          <div className="border border-purple-200 rounded-lg p-4 bg-purple-50/50">
            <div className="flex items-center mb-3">
              <span className="text-2xl mr-2">🤖</span>
              <div>
                <h4 className="font-semibold text-gray-900">Path 2: AI Insights</h4>
                <p className="text-xs text-gray-500">Template-based posts from AI feature analysis</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Schedule:</span>
                <span className="font-mono text-purple-700">1x daily (9 UTC)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Trigger:</span>
                <span className="text-gray-800">Automatic only</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Output:</span>
                <span className="text-gray-800">reflective_insight, pattern_prediction posts</span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Feature Individual Schedules */}
        <div className="border-t pt-4">
          <h4 className="font-semibold text-gray-900 mb-3">AI Feature Schedules</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center mb-1">
                <span className="mr-2">🧭</span>
                <span className="font-medium text-gray-800">Mood Compass</span>
              </div>
              <p className="text-xs text-gray-500">2 AM UTC daily</p>
              <p className="text-xs text-blue-600 mt-1">Output: reflective_insight posts</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center mb-1">
                <span className="mr-2">📸</span>
                <span className="font-medium text-gray-800">Memory Companion</span>
              </div>
              <p className="text-xs text-gray-500">7 AM UTC daily</p>
              <p className="text-xs text-blue-600 mt-1">Output: memory posts</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center mb-1">
                <span className="mr-2">🔮</span>
                <span className="font-medium text-gray-800">Life Forecaster</span>
              </div>
              <p className="text-xs text-gray-500">6 AM UTC daily</p>
              <p className="text-xs text-blue-600 mt-1">Output: pattern_prediction posts</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center mb-1">
                <span className="mr-2">🔔</span>
                <span className="font-medium text-gray-800">Proactive Suggestions</span>
              </div>
              <p className="text-xs text-gray-500">Every 60 minutes</p>
              <p className="text-xs text-orange-600 mt-1">Output: push notifications</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center mb-1">
                <span className="mr-2">✨</span>
                <span className="font-medium text-gray-800">Daily Insight</span>
              </div>
              <p className="text-xs text-gray-500">On app open (1h cache)</p>
              <p className="text-xs text-blue-600 mt-1">Output: Home card</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center mb-1">
                <span className="mr-2">🕰️</span>
                <span className="font-medium text-gray-800">This Day</span>
              </div>
              <p className="text-xs text-gray-500">On app open (24h cache)</p>
              <p className="text-xs text-blue-600 mt-1">Output: Home carousel</p>
            </div>
          </div>
        </div>
      </div>

      {/* Path 1: Configurable Schedule */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Path 1: Life Feed Schedule</h3>
            <p className="text-sm text-gray-500">Configure when GPT-powered posts are generated</p>
          </div>
          <button
            onClick={handleResetSchedule}
            disabled={saving}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Reset Schedule
          </button>
        </div>

        {/* Success Banner */}
        {scheduleSaveSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <div className="flex items-center">
              <span className="text-green-600 text-lg mr-2">✅</span>
              <p className="text-sm text-green-800">
                Schedule saved. Remember to redeploy Cloud Functions.
              </p>
            </div>
          </div>
        )}

        {schedulerLoading ? (
          <div className="flex items-center justify-center py-6">
            <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Morning */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <span className="text-lg mr-2">🌅</span>
                  Morning (UTC)
                </label>
                <select
                  value={schedulerConfig.morningHour}
                  onChange={(e) => handleTimeChange('morningHour', parseInt(e.target.value))}
                  disabled={saving}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {morningHours.map(h => (
                    <option key={h} value={h}>{h.toString().padStart(2, '0')}:00 UTC</option>
                  ))}
                </select>
              </div>

              {/* Afternoon */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <span className="text-lg mr-2">☀️</span>
                  Afternoon (UTC)
                </label>
                <select
                  value={schedulerConfig.afternoonHour}
                  onChange={(e) => handleTimeChange('afternoonHour', parseInt(e.target.value))}
                  disabled={saving}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {afternoonHours.map(h => (
                    <option key={h} value={h}>{h.toString().padStart(2, '0')}:00 UTC</option>
                  ))}
                </select>
              </div>

              {/* Evening */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <span className="text-lg mr-2">🌙</span>
                  Evening (UTC)
                </label>
                <select
                  value={schedulerConfig.eveningHour}
                  onChange={(e) => handleTimeChange('eveningHour', parseInt(e.target.value))}
                  disabled={saving}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {eveningHours.map(h => (
                    <option key={h} value={h}>{h.toString().padStart(2, '0')}:00 UTC</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Cron Expression Display */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Cron Expression:</p>
              <code className="text-sm font-mono text-gray-800">{schedulerConfig.cronExpression}</code>
            </div>

            <button
              onClick={handleSaveSchedule}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Schedule'}
            </button>
          </div>
        )}
      </div>

      {/* Rate Limits */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Rate Limits</h3>
          {!editingRateLimits && (
            <button
              onClick={() => setEditingRateLimits(true)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Edit
            </button>
          )}
        </div>

        {editingRateLimits ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Posts Per User Per Day
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={maxPostsPerDay}
                  onChange={(e) => setMaxPostsPerDay(Number(e.target.value))}
                  disabled={saving}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Global Cooldown (hours)
                </label>
                <input
                  type="number"
                  min="0"
                  max="24"
                  value={cooldownHours}
                  onChange={(e) => setCooldownHours(Number(e.target.value))}
                  disabled={saving}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSaveRateLimits}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setMaxPostsPerDay(config.maxPostsPerUserPerDay);
                  setCooldownHours(config.globalCooldownHours);
                  setEditingRateLimits(false);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Max Posts Per User Per Day</p>
              <p className="text-2xl font-bold text-gray-900">{config.maxPostsPerUserPerDay}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Global Cooldown</p>
              <p className="text-2xl font-bold text-gray-900">{config.globalCooldownHours} hours</p>
            </div>
          </div>
        )}
      </div>

      {/* Home Feed Configuration */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Home Feed Configuration</h3>
          {!editingHomeFeed && (
            <button
              onClick={() => setEditingHomeFeed(true)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Edit
            </button>
          )}
        </div>

        {editingHomeFeed ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <input
                    type="checkbox"
                    checked={homeFeedEnabled}
                    onChange={(e) => setHomeFeedEnabled(e.target.checked)}
                    disabled={saving}
                    className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 mr-2"
                  />
                  Enabled
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Items</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={homeFeedMaxItems}
                  onChange={(e) => setHomeFeedMaxItems(Number(e.target.value))}
                  disabled={saving}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Refresh Interval (hours)</label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={homeFeedRefreshInterval}
                  onChange={(e) => setHomeFeedRefreshInterval(Number(e.target.value))}
                  disabled={saving}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSaveHomeFeed}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setHomeFeedEnabled(config.homeFeed.enabled);
                  setHomeFeedMaxItems(config.homeFeed.maxItems);
                  setHomeFeedRefreshInterval(config.homeFeed.refreshInterval);
                  setEditingHomeFeed(false);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Status</p>
                <p className={`font-semibold ${config.homeFeed.enabled ? 'text-green-600' : 'text-red-600'}`}>
                  {config.homeFeed.enabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Max Items</p>
                <p className="font-semibold text-gray-900">{config.homeFeed.maxItems}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Refresh Interval</p>
                <p className="font-semibold text-gray-900">{config.homeFeed.refreshInterval} hours</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Categories Shown on Home</p>
              <div className="flex flex-wrap gap-2">
                {config.homeFeed.showCategories.map((cat) => {
                  const meta = CATEGORY_METADATA[cat as InsightsCategory];
                  // Skip unknown categories that aren't in CATEGORY_METADATA
                  if (!meta) {
                    return (
                      <span
                        key={cat}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-600"
                      >
                        ❓ {cat}
                      </span>
                    );
                  }
                  return (
                    <span
                      key={cat}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm"
                      style={{ backgroundColor: `${meta.color}20`, color: meta.color }}
                    >
                      {meta.icon} {meta.displayName}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pull-to-Refresh Cooldowns Configuration */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Pull-to-Refresh Cooldowns</h3>
            <p className="text-sm text-gray-500">
              Control how often the mobile app can refresh data on pull-to-refresh
            </p>
          </div>
          {!editingRefreshCooldowns && (
            <button
              onClick={() => setEditingRefreshCooldowns(true)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Edit
            </button>
          )}
        </div>

        {editingRefreshCooldowns ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Refresh Cooldown (seconds)
                </label>
                <input
                  type="number"
                  min="0"
                  max="300"
                  value={dataRefreshCooldown}
                  onChange={(e) => setDataRefreshCooldown(Number(e.target.value))}
                  disabled={saving}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  For Keywords &amp; Fun Facts refresh
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Generate Cooldown (seconds)
                </label>
                <input
                  type="number"
                  min="0"
                  max="600"
                  value={generateCooldown}
                  onChange={(e) => setGenerateCooldown(Number(e.target.value))}
                  disabled={saving}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  For AI feed generation (expensive)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Posts Refresh Cooldown (seconds)
                </label>
                <input
                  type="number"
                  min="0"
                  max="300"
                  value={postsRefreshCooldown}
                  onChange={(e) => setPostsRefreshCooldown(Number(e.target.value))}
                  disabled={saving}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  For Life Feed posts (0 = always)
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSaveRefreshCooldowns}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setDataRefreshCooldown(config.refreshCooldowns?.dataRefreshCooldownSeconds ?? 30);
                  setGenerateCooldown(config.refreshCooldowns?.generateCooldownSeconds ?? 60);
                  setPostsRefreshCooldown(config.refreshCooldowns?.postsRefreshCooldownSeconds ?? 0);
                  setEditingRefreshCooldowns(false);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Data Refresh</p>
              <p className="text-2xl font-bold text-gray-900">
                {config.refreshCooldowns?.dataRefreshCooldownSeconds ?? 30}s
              </p>
              <p className="text-xs text-gray-500">Keywords &amp; Fun Facts</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Generate Cooldown</p>
              <p className="text-2xl font-bold text-gray-900">
                {config.refreshCooldowns?.generateCooldownSeconds ?? 60}s
              </p>
              <p className="text-xs text-gray-500">AI Feed Generation</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Posts Refresh</p>
              <p className="text-2xl font-bold text-gray-900">
                {config.refreshCooldowns?.postsRefreshCooldownSeconds === 0
                  ? 'Always'
                  : `${config.refreshCooldowns?.postsRefreshCooldownSeconds ?? 0}s`}
              </p>
              <p className="text-xs text-gray-500">Life Feed Posts</p>
            </div>
          </div>
        )}

        {/* Info box */}
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start">
            <span className="text-blue-600 mr-2">ℹ️</span>
            <p className="text-sm text-blue-700">
              These cooldowns prevent excessive API calls when users pull-to-refresh.
              The mobile app will skip refresh operations if the cooldown hasn&apos;t passed since the last refresh.
            </p>
          </div>
        </div>
      </div>

      {/* Categories - Post Counts by Category */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Categories</h3>
            <p className="text-sm text-gray-500">
              Categories are automatically assigned based on post content and data type
            </p>
          </div>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {INSIGHTS_CATEGORIES.map((category) => {
            const meta = CATEGORY_METADATA[category];
            const categoryConfig = config.categories?.[category];
            const count = analytics.postsByCategory?.[category] || 0;

            // Skip if metadata or config is missing
            if (!meta) return null;

            return (
              <div
                key={category}
                className="rounded-lg p-4 border-l-4"
                style={{ borderLeftColor: meta.color, backgroundColor: `${meta.color}08` }}
              >
                <div className="flex items-center mb-2">
                  <span className="text-2xl mr-2">{meta.icon}</span>
                  <span className="font-semibold text-gray-900">{meta.displayName}</span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{categoryConfig?.description || 'No description'}</p>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-gray-900">{count}</span>
                  <span className="text-sm text-gray-500">posts</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Info box */}
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start">
            <span className="text-blue-600 mr-2">ℹ️</span>
            <p className="text-sm text-blue-700">
              Categories are determined by the AI based on post content. Health posts come from health data,
              Activity from workouts and location visits, Social from interactions, etc.
            </p>
          </div>
        </div>
      </div>

      {/* Config Version */}
      <div className="text-center text-sm text-gray-500">
        Configuration Version: {config.version}
      </div>
    </div>
  );
}
