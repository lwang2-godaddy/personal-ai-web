'use client';

import { useState, useEffect } from 'react';
import { apiGet, apiDelete } from '@/lib/api/client';

interface VocabularyItem {
  id: string;
  userId: string;
  originalPhrase: string;
  correctedPhrase: string;
  category: string;
  source?: string;
  usageCount: number;
  confidence: number;
  createdAt: string;
  updatedAt: string;
}

interface VocabularyStats {
  totalCount: number;
  bySource: Record<string, number>;
  byCategory: Record<string, number>;
  recentlyLearned: number;
}

const SOURCE_INFO: Record<string, { label: string; color: string; icon: string }> = {
  manual_edit: { label: 'Manual Edit', color: '#4F46E5', icon: '✏️' },
  memory_extraction: { label: 'Auto-Learned', color: '#10B981', icon: '✨' },
  user_added: { label: 'User Added', color: '#F59E0B', icon: '➕' },
};

const CATEGORY_INFO: Record<string, { label: string; color: string }> = {
  proper_noun: { label: 'Proper Noun', color: '#4F46E5' },
  technical_term: { label: 'Technical', color: '#059669' },
  abbreviation: { label: 'Abbreviation', color: '#D97706' },
  foreign_word: { label: 'Foreign', color: '#7C3AED' },
  custom: { label: 'Custom', color: '#6B7280' },
  person_name: { label: 'Person Name', color: '#EC4899' },
  place_name: { label: 'Place Name', color: '#10B981' },
  activity_type: { label: 'Activity', color: '#F59E0B' },
  organization: { label: 'Organization', color: '#3B82F6' },
  domain_specific: { label: 'Domain Term', color: '#8B5CF6' },
};

/**
 * Admin Vocabulary Management Page
 *
 * View and manage user vocabulary across the system:
 * - View auto-learned vocabulary from memory extraction
 * - View manual edits and user-added vocabulary
 * - Filter by source and category
 * - View vocabulary statistics
 */
export default function AdminVocabularyPage() {
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
  const [stats, setStats] = useState<VocabularyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [users, setUsers] = useState<{ uid: string; email: string }[]>([]);

  useEffect(() => {
    loadData();
  }, [selectedUserId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load vocabulary data
      const params = new URLSearchParams();
      if (selectedUserId !== 'all') {
        params.set('userId', selectedUserId);
      }

      const response = await apiGet(`/api/admin/vocabulary?${params.toString()}`);
      setVocabulary(response.vocabulary || []);
      setStats(response.stats || null);
      setUsers(response.users || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load vocabulary data');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId: string, vocabId: string) => {
    if (!confirm('Are you sure you want to delete this vocabulary entry?')) return;

    try {
      await apiDelete(`/api/admin/vocabulary?userId=${userId}&vocabId=${vocabId}`);
      setVocabulary((prev) => prev.filter((v) => v.id !== vocabId));
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  // Filter vocabulary based on selections
  const filteredVocabulary = vocabulary.filter((v) => {
    if (selectedSource !== 'all' && v.source !== selectedSource) return false;
    if (selectedCategory !== 'all' && v.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      if (
        !v.originalPhrase.toLowerCase().includes(query) &&
        !v.correctedPhrase.toLowerCase().includes(query)
      ) {
        return false;
      }
    }
    return true;
  });

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
          <button
            onClick={loadData}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl">📚</span>
          <div>
            <h1 className="text-2xl font-bold">Vocabulary Management</h1>
            <p className="text-gray-600">
              View and manage user vocabulary across the system
            </p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-blue-600">{stats.totalCount}</div>
            <div className="text-sm text-gray-600">Total Vocabulary</div>
          </div>
          <div className="bg-white border rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-green-600">
              {stats.bySource?.memory_extraction || 0}
            </div>
            <div className="text-sm text-gray-600">Auto-Learned</div>
          </div>
          <div className="bg-white border rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-purple-600">
              {stats.bySource?.manual_edit || 0}
            </div>
            <div className="text-sm text-gray-600">Manual Edits</div>
          </div>
          <div className="bg-white border rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-orange-600">{stats.recentlyLearned || 0}</div>
            <div className="text-sm text-gray-600">Last 7 Days</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* User Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="all">All Users</option>
              {users.map((user) => (
                <option key={user.uid} value={user.uid}>
                  {user.email}
                </option>
              ))}
            </select>
          </div>

          {/* Source Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="all">All Sources</option>
              {Object.entries(SOURCE_INFO).map(([key, info]) => (
                <option key={key} value={key}>
                  {info.icon} {info.label}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="all">All Categories</option>
              {Object.entries(CATEGORY_INFO).map(([key, info]) => (
                <option key={key} value={key}>
                  {info.label}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vocabulary..."
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Vocabulary List */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <span className="font-medium">
              {filteredVocabulary.length} vocabulary items
            </span>
            <button
              onClick={loadData}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Refresh
            </button>
          </div>
        </div>

        {filteredVocabulary.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No vocabulary items found matching your filters.
          </div>
        ) : (
          <div className="divide-y">
            {filteredVocabulary.map((item) => {
              const sourceInfo = item.source ? SOURCE_INFO[item.source] : null;
              const categoryInfo = CATEGORY_INFO[item.category];

              return (
                <div
                  key={item.id}
                  className="p-4 hover:bg-gray-50 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-gray-500 line-through">
                        "{item.originalPhrase}"
                      </span>
                      <span className="text-gray-400">→</span>
                      <span className="font-medium">"{item.correctedPhrase}"</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {/* Category badge */}
                      <span
                        className="px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: (categoryInfo?.color || '#6B7280') + '20',
                          color: categoryInfo?.color || '#6B7280',
                        }}
                      >
                        {categoryInfo?.label || item.category}
                      </span>

                      {/* Source badge */}
                      {sourceInfo && (
                        <span
                          className="px-2 py-0.5 rounded"
                          style={{
                            backgroundColor: sourceInfo.color + '20',
                            color: sourceInfo.color,
                          }}
                        >
                          {sourceInfo.icon} {sourceInfo.label}
                        </span>
                      )}

                      {/* Usage count */}
                      <span className="text-gray-500">
                        Used {item.usageCount} time{item.usageCount === 1 ? '' : 's'}
                      </span>

                      {/* Confidence */}
                      <span className="text-gray-500">
                        {(item.confidence * 100).toFixed(0)}% confidence
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(item.userId, item.id)}
                    className="text-red-500 hover:text-red-700 px-3 py-1"
                  >
                    Delete
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Category Breakdown */}
      {stats?.byCategory && Object.keys(stats.byCategory).length > 0 && (
        <div className="mt-6 bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Category Breakdown</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.entries(stats.byCategory).map(([category, count]) => {
              const info = CATEGORY_INFO[category];
              return (
                <div
                  key={category}
                  className="p-3 rounded-lg text-center"
                  style={{ backgroundColor: (info?.color || '#6B7280') + '10' }}
                >
                  <div
                    className="text-xl font-bold"
                    style={{ color: info?.color || '#6B7280' }}
                  >
                    {count}
                  </div>
                  <div className="text-xs text-gray-600">{info?.label || category}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
