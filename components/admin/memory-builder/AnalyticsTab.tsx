'use client';

import { useState, useEffect } from 'react';
import { apiGet } from '@/lib/api/client';
import {
  ExtractionAnalytics,
  VocabularyIntegrationAnalytics,
  ENTITY_TYPE_METADATA,
  ExtractedEntityType,
} from '@/lib/models/MemoryBuilderConfig';

/**
 * Analytics Tab - View extraction metrics and vocabulary usage
 */
export default function AnalyticsTab() {
  const [extractionAnalytics, setExtractionAnalytics] = useState<ExtractionAnalytics | null>(null);
  const [vocabularyAnalytics, setVocabularyAnalytics] =
    useState<VocabularyIntegrationAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiGet('/api/admin/memory-builder/analytics');
      setExtractionAnalytics(response.extraction);
      setVocabularyAnalytics(response.vocabulary);
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700">{error}</p>
        <button
          onClick={loadAnalytics}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Extraction Overview */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Extraction Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-3xl font-bold text-blue-600">
              {extractionAnalytics?.totalExtractions?.toLocaleString() || 0}
            </div>
            <div className="text-sm text-gray-600">Total Extractions</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-3xl font-bold text-green-600">
              {((extractionAnalytics?.successRate || 0) * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Success Rate</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-3xl font-bold text-purple-600">
              {extractionAnalytics?.avgEntitiesPerMemory?.toFixed(1) || 0}
            </div>
            <div className="text-sm text-gray-600">Avg Entities/Memory</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-3xl font-bold text-orange-600">
              {((extractionAnalytics?.avgConfidence || 0) * 100).toFixed(0)}%
            </div>
            <div className="text-sm text-gray-600">Avg Confidence</div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Last 24 Hours</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Extractions</span>
              <span className="font-semibold">
                {extractionAnalytics?.last24h?.extractions || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Entities Extracted</span>
              <span className="font-semibold">
                {extractionAnalytics?.last24h?.entities || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Vocabulary Learned</span>
              <span className="font-semibold">
                {extractionAnalytics?.last24h?.vocabLearned || 0}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Last 7 Days</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Extractions</span>
              <span className="font-semibold">
                {extractionAnalytics?.last7d?.extractions || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Entities Extracted</span>
              <span className="font-semibold">
                {extractionAnalytics?.last7d?.entities || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Vocabulary Learned</span>
              <span className="font-semibold">
                {extractionAnalytics?.last7d?.vocabLearned || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Entity Type Breakdown */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Entity Types</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(extractionAnalytics?.byEntityType || {}).map(
            ([type, stats]) => {
              const metadata = ENTITY_TYPE_METADATA[type as ExtractedEntityType];
              return (
                <div key={type} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="text-2xl">{metadata?.icon || '?'}</span>
                  <div>
                    <div className="font-medium">{metadata?.displayName || type}</div>
                    <div className="text-sm text-gray-500">
                      {stats.count.toLocaleString()} ({(stats.avgConfidence * 100).toFixed(0)}%
                      avg)
                    </div>
                  </div>
                </div>
              );
            }
          )}
        </div>
      </div>

      {/* Vocabulary Integration */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Vocabulary Integration</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-3xl font-bold text-blue-600">
              {vocabularyAnalytics?.totalAutoLearned || 0}
            </div>
            <div className="text-sm text-gray-600">Auto-Learned</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-3xl font-bold text-green-600">
              {vocabularyAnalytics?.totalManual || 0}
            </div>
            <div className="text-sm text-gray-600">Manual Edits</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-3xl font-bold text-purple-600">
              {((vocabularyAnalytics?.matchRate || 0) * 100).toFixed(0)}%
            </div>
            <div className="text-sm text-gray-600">Match Rate</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-3xl font-bold text-orange-600">
              +{((vocabularyAnalytics?.avgBoostApplied || 0) * 100).toFixed(0)}%
            </div>
            <div className="text-sm text-gray-600">Avg Boost</div>
          </div>
        </div>

        {/* Recent Suggestions */}
        {vocabularyAnalytics?.recentSuggestions &&
          vocabularyAnalytics.recentSuggestions.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Recent Auto-Learned</h4>
              <div className="space-y-2">
                {vocabularyAnalytics.recentSuggestions.slice(0, 5).map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <div>
                      <span className="font-medium">{s.term}</span>
                      <span className="ml-2 text-xs text-gray-500 px-2 py-0.5 bg-gray-200 rounded">
                        {s.category}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {(s.confidence * 100).toFixed(0)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
      </div>

      {/* Model Performance */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Model Performance</h3>
        <div className="space-y-3">
          {Object.entries(extractionAnalytics?.byModel || {}).map(([model, stats]) => (
            <div
              key={model}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div>
                <div className="font-medium">{model}</div>
                <div className="text-sm text-gray-500">
                  {stats.count.toLocaleString()} extractions
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm">
                  {((stats.successRate || 0) * 100).toFixed(1)}% success
                </div>
                <div className="text-xs text-gray-500">{stats.avgLatencyMs}ms avg</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Refresh Button */}
      <div className="text-center">
        <button
          onClick={loadAnalytics}
          className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800"
        >
          Refresh Analytics
        </button>
      </div>
    </div>
  );
}
