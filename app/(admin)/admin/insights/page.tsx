'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiGet, apiPut } from '@/lib/api/client';
import {
  InsightsAdminConfig,
  InsightsCategory,
  CATEGORY_METADATA,
  INSIGHTS_CATEGORIES,
} from '@/lib/models/InsightsConfig';
import {
  PostTypesTab,
  FunFactsTab,
  MoodCompassTab,
  MemoryCompanionTab,
  LifeForecasterTab,
} from '@/components/admin/insights';

// Tab definitions
type TabId = 'categories' | 'post-types' | 'fun-facts' | 'mood-compass' | 'memory-companion' | 'life-forecaster';

const TABS: { id: TabId; label: string; icon: string; description: string }[] = [
  { id: 'categories', label: 'Categories', icon: '📂', description: '8 content categories' },
  { id: 'post-types', label: 'Post Types', icon: '📋', description: '8 post formats' },
  { id: 'fun-facts', label: 'Fun Facts', icon: '🎯', description: 'Daily trivia' },
  { id: 'mood-compass', label: 'Mood Compass', icon: '🧭', description: 'Emotional patterns' },
  { id: 'memory-companion', label: 'Memory Companion', icon: '📸', description: 'Memory surfacing' },
  { id: 'life-forecaster', label: 'Life Forecaster', icon: '🔮', description: 'Predictions' },
];

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
 * Admin Insights Dashboard
 * Manage AI-generated insights configuration with 6 tabs
 */
export default function AdminInsightsPage() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabId) || 'categories';

  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch configuration (for Categories tab)
  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiGet<InsightsData>('/api/admin/insights');
      setData(result);
    } catch (err: any) {
      console.error('Failed to fetch insights config:', err);
      setError(err.message || 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Update URL when tab changes
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', activeTab);
    window.history.replaceState({}, '', url.toString());
  }, [activeTab]);

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

  // Toggle category enabled
  const handleCategoryToggle = async (category: InsightsCategory) => {
    if (!data) return;

    try {
      setSaving(true);
      const currentEnabled = data.config.categories[category].enabled;
      await apiPut('/api/admin/insights', {
        category,
        updates: { enabled: !currentEnabled },
      });
      await fetchConfig();
    } catch (err: any) {
      setError(err.message || 'Failed to update category');
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

  // Render Categories Tab content
  const renderCategoriesTab = () => {
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
            <h2 className="text-xl font-bold text-gray-900">Categories Configuration</h2>
            <p className="text-sm text-gray-600">Configure content categories for insights</p>
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

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
            <p className="text-sm font-medium text-gray-600">Max Posts/Day</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{config.maxPostsPerUserPerDay}</p>
          </div>
        </div>

        {/* Status Banner */}
        <div className={`rounded-lg p-4 ${config.enabled ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
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
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {INSIGHTS_CATEGORIES.map((category) => {
            const meta = CATEGORY_METADATA[category];
            const categoryConfig = config.categories[category];
            const count = analytics.postsByCategory[category] || 0;

            return (
              <div
                key={category}
                className={`bg-white rounded-lg shadow-md p-4 border-l-4 ${
                  categoryConfig.enabled ? '' : 'opacity-60'
                }`}
                style={{ borderLeftColor: meta.color }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <span className="text-2xl mr-2">{meta.icon}</span>
                    <span className="font-semibold text-gray-900">{meta.displayName}</span>
                  </div>
                  <button
                    onClick={() => handleCategoryToggle(category)}
                    disabled={saving}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      categoryConfig.enabled ? 'bg-green-500' : 'bg-gray-300'
                    } disabled:opacity-50`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        categoryConfig.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                <p className="text-sm text-gray-600 mb-2">{categoryConfig.description}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    {categoryConfig.schedule.frequency} @ {categoryConfig.schedule.time || 'auto'}
                  </span>
                  <span className="font-medium text-gray-700">{count} posts</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Home Feed Config */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Home Feed Configuration</h3>
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
            <div className="md:col-span-3">
              <p className="text-sm font-medium text-gray-600 mb-2">Categories Shown on Home</p>
              <div className="flex flex-wrap gap-2">
                {config.homeFeed.showCategories.map((cat) => {
                  const meta = CATEGORY_METADATA[cat as InsightsCategory];
                  return (
                    <span
                      key={cat}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm"
                      style={{ backgroundColor: `${meta?.color}20`, color: meta?.color }}
                    >
                      {meta?.icon} {meta?.displayName}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Rate Limits */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Rate Limits</h3>
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
        </div>

        {/* Config Version */}
        <div className="text-center text-sm text-gray-500">
          Configuration Version: {config.version}
        </div>
      </div>
    );
  };

  // Render active tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'categories':
        return renderCategoriesTab();
      case 'post-types':
        return <PostTypesTab onSaving={setSaving} />;
      case 'fun-facts':
        return <FunFactsTab onSaving={setSaving} />;
      case 'mood-compass':
        return <MoodCompassTab onSaving={setSaving} />;
      case 'memory-companion':
        return <MemoryCompanionTab onSaving={setSaving} />;
      case 'life-forecaster':
        return <LifeForecasterTab onSaving={setSaving} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Insights Configuration</h1>
          <p className="mt-2 text-gray-600">
            Manage AI-generated insights, post types, and feature settings
          </p>
        </div>
        <Link
          href="/admin/prompts"
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
        >
          Edit Prompts
        </Link>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-1 overflow-x-auto" aria-label="Tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">{renderTabContent()}</div>

      {/* Saving indicator */}
      {saving && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center z-50">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
          Saving...
        </div>
      )}
    </div>
  );
}
