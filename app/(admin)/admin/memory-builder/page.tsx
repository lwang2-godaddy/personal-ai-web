'use client';

import { useState } from 'react';
import {
  OverviewTab,
  EntityTypesTab,
  ExtractionSettingsTab,
  VocabularyIntegrationTab,
  AnalyticsTab,
} from '@/components/admin/memory-builder';

type TabId = 'overview' | 'entity-types' | 'extraction' | 'vocabulary' | 'analytics';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'entity-types', label: 'Entity Types', icon: '🏷️' },
  { id: 'extraction', label: 'Extraction', icon: '⚙️' },
  { id: 'vocabulary', label: 'Vocabulary', icon: '📚' },
  { id: 'analytics', label: 'Analytics', icon: '📈' },
];

/**
 * Memory Builder Admin Page
 *
 * Configure the Enhanced Memory System with Vocabulary Integration:
 * - 9 entity types (person, place, topic, event, organization, activity, emotion, time_reference, custom_term)
 * - AI model settings for extraction
 * - Vocabulary auto-learning and cross-referencing
 * - Analytics and performance metrics
 */
export default function MemoryBuilderAdminPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [saving, setSaving] = useState(false);

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🧠</span>
          <div>
            <h1 className="text-2xl font-bold">Memory Builder</h1>
            <p className="text-gray-600">
              Enhanced entity extraction with vocabulary integration
            </p>
          </div>
        </div>
        {saving && (
          <div className="mt-2 text-sm text-blue-600">Saving changes...</div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b mb-6">
        <nav className="flex gap-1 -mb-px">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
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
      <div className="min-h-[500px]">
        {activeTab === 'overview' && <OverviewTab onSaving={setSaving} />}
        {activeTab === 'entity-types' && <EntityTypesTab onSaving={setSaving} />}
        {activeTab === 'extraction' && <ExtractionSettingsTab onSaving={setSaving} />}
        {activeTab === 'vocabulary' && <VocabularyIntegrationTab onSaving={setSaving} />}
        {activeTab === 'analytics' && <AnalyticsTab />}
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t text-sm text-gray-500">
        <p>
          <strong>Note:</strong> Changes to entity types and extraction settings will apply to
          new memories. Use the migration script to backfill existing memories.
        </p>
        <p className="mt-2">
          <code className="bg-gray-100 px-2 py-1 rounded text-xs">
            cd personal-ai-web && npx tsx scripts/migrations/enhance-existing-memories.ts
          </code>
        </p>
      </div>
    </div>
  );
}
