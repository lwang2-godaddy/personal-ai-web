'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  OverviewTab,
  LifeFeedTab,
  CategoriesTab,
  LifeKeywordsTab,
  AIFeaturesTab,
  FlashbackTab,
  DebugTab,
} from '@/components/admin/insights';

// Tab definitions - reorganized to include Categories, Flashback, and Debug
type TabId = 'overview' | 'life-feed' | 'categories' | 'life-keywords' | 'ai-features' | 'flashback' | 'debug';

const TABS: { id: TabId; label: string; icon: string; description: string }[] = [
  { id: 'overview', label: 'Overview', icon: '📊', description: 'Dashboard & settings' },
  { id: 'life-feed', label: 'Life Feed', icon: '📰', description: '10 post types' },
  { id: 'categories', label: 'Categories', icon: '📁', description: '12 unified categories' },
  { id: 'life-keywords', label: 'Life Keywords', icon: '🔑', description: 'Themes & patterns' },
  { id: 'ai-features', label: 'AI Features', icon: '🤖', description: '4 analysis features' },
  { id: 'flashback', label: 'Flashback', icon: '⚡', description: 'Random memory' },
  { id: 'debug', label: 'Debug', icon: '🔧', description: 'Architecture & data' },
];

/**
 * Admin Insights Dashboard
 * Reorganized from 8 tabs to 4 tabs for cleaner navigation:
 * - Overview: Dashboard, global settings, schedule, rate limits
 * - Life Feed: 8 post types configuration
 * - Life Keywords: Keyword generation settings
 * - AI Features: Fun Facts, Mood Compass, Memory Companion, Life Forecaster
 */
export default function AdminInsightsPage() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabId) || 'overview';

  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [saving, setSaving] = useState(false);

  // Update URL when tab changes
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', activeTab);
    window.history.replaceState({}, '', url.toString());
  }, [activeTab]);

  // Render active tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab onSaving={setSaving} />;
      case 'life-feed':
        return <LifeFeedTab onSaving={setSaving} />;
      case 'categories':
        return <CategoriesTab onSaving={setSaving} />;
      case 'life-keywords':
        return <LifeKeywordsTab onSaving={setSaving} />;
      case 'ai-features':
        return <AIFeaturesTab onSaving={setSaving} />;
      case 'flashback':
        return <FlashbackTab onSaving={setSaving} />;
      case 'debug':
        return <DebugTab onSaving={setSaving} />;
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
              className={`px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
              <span className="ml-2 text-xs text-gray-400">{tab.description}</span>
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
