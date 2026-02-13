'use client';

import type { DemoStatus } from '@/lib/services/demo/types';

interface DemoStatusCardProps {
  status: DemoStatus | null;
  loading: boolean;
  onRefresh: () => void;
}

const COLLECTION_LABELS: Record<string, string> = {
  healthData: 'Health Data',
  locationData: 'Location Visits',
  voiceNotes: 'Voice Notes',
  textNotes: 'Text Notes',
  photoMemories: 'Photos',
  lifeFeedPosts: 'Life Feed Posts',
  events: 'Events',
};

export default function DemoStatusCard({ status, loading, onRefresh }: DemoStatusCardProps) {
  if (loading && !status) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-600">Loading demo account status...</span>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-500">Unable to load status.</p>
        <button onClick={onRefresh} className="mt-2 text-sm text-red-600 hover:underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">Demo Account Status</h2>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {!status.exists ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 font-medium">No demo account found</p>
          <p className="text-yellow-700 text-sm mt-1">
            Use &quot;Full Reset &amp; Seed&quot; to create the demo account with sample data.
          </p>
        </div>
      ) : (
        <>
          {/* Account Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Email</p>
              <p className="text-sm font-medium text-gray-900 truncate">{status.email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Name</p>
              <p className="text-sm font-medium text-gray-900">{status.displayName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">UID</p>
              <p className="text-sm font-mono text-gray-600 truncate">{status.uid}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Tier</p>
              <p className="text-sm font-medium text-green-600">Premium</p>
            </div>
          </div>

          {/* Data Counts */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Data Counts</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(status.counts).map(([col, count]) => (
                <div key={col} className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-gray-900">{count}</p>
                  <p className="text-xs text-gray-500">{COLLECTION_LABELS[col] || col}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Embedding Status */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Embedding Status</h3>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-green-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${status.embeddingStatus.percentage}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                {status.embeddingStatus.completed}/{status.embeddingStatus.total} ({status.embeddingStatus.percentage}%)
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
