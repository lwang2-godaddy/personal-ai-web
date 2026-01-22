'use client';

import { useState } from 'react';
import { useTrackPage } from '@/lib/hooks/useTrackPage';
import { TRACKED_SCREENS } from '@/lib/models/BehaviorEvent';

export default function SearchPage() {
  // Track page view
  useTrackPage(TRACKED_SCREENS.search);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'all' | 'health' | 'location' | 'voice' | 'photo'>('all');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement search functionality
    console.log('Searching for:', searchQuery, 'Type:', searchType);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Search Your Data
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Find specific activities, memories, and health data
        </p>
      </div>

      {/* Search Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
        <form onSubmit={handleSearch} className="space-y-4">
          {/* Search Input */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search Query
            </label>
            <input
              id="search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g., badminton, workouts, last month..."
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Filter by Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filter by Type
            </label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {[
                { value: 'all', label: 'All Data', icon: '📊' },
                { value: 'health', label: 'Health', icon: '💪' },
                { value: 'location', label: 'Locations', icon: '📍' },
                { value: 'voice', label: 'Voice Notes', icon: '🎤' },
                { value: 'photo', label: 'Photos', icon: '📸' },
              ].map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setSearchType(type.value as any)}
                  className={`px-4 py-3 rounded-lg border-2 transition-all ${
                    searchType === type.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  <div className="text-2xl mb-1">{type.icon}</div>
                  <div className="text-xs font-medium">{type.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Search Button */}
          <button
            type="submit"
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Coming Soon Message */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
          🚧 Coming Soon
        </h3>
        <p className="text-yellow-800 dark:text-yellow-200">
          Advanced search functionality is under development. For now, you can use the Chat interface
          to ask questions about your data, which uses the same AI-powered search technology.
        </p>
        <a
          href="/chat"
          className="inline-block mt-4 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
        >
          Try Chat Instead →
        </a>
      </div>
    </div>
  );
}
