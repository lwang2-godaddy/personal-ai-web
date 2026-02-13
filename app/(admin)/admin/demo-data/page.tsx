'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiGet, apiPost } from '@/lib/api/client';
import { useTrackPage } from '@/lib/hooks/useTrackPage';
import { TRACKED_SCREENS } from '@/lib/models/BehaviorEvent';
import DemoStatusCard from '@/components/admin/demo/DemoStatusCard';
import DemoActionButton from '@/components/admin/demo/DemoActionButton';
import DemoProgressLog from '@/components/admin/demo/DemoProgressLog';
import type { DemoStatus, DemoProgressEvent } from '@/lib/services/demo/types';

interface EmbeddingDetail {
  total: number;
  completed: number;
  percentage: number;
  byCollection: Record<string, { total: number; completed: number }>;
}

const COLLECTION_LABELS: Record<string, string> = {
  healthData: 'Health Data',
  locationData: 'Location Data',
  voiceNotes: 'Voice Notes',
  textNotes: 'Text Notes',
};

export default function AdminDemoDataPage() {
  useTrackPage(TRACKED_SCREENS.adminDemoData);

  const [status, setStatus] = useState<DemoStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [logEvents, setLogEvents] = useState<DemoProgressEvent[]>([]);
  const [embeddings, setEmbeddings] = useState<EmbeddingDetail | null>(null);
  const [embeddingsLoading, setEmbeddingsLoading] = useState(false);
  const [anyRunning, setAnyRunning] = useState(false);
  const [screenshotResult, setScreenshotResult] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setStatusLoading(true);
      const data = await apiGet<DemoStatus>('/api/admin/demo/status');
      setStatus(data);
    } catch (err: any) {
      console.error('Failed to fetch demo status:', err);
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const fetchEmbeddings = useCallback(async () => {
    try {
      setEmbeddingsLoading(true);
      const data = await apiGet<EmbeddingDetail>('/api/admin/demo/embeddings');
      setEmbeddings(data);
    } catch {
      // 404 if no demo account — that's fine
    } finally {
      setEmbeddingsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleProgress = useCallback((event: DemoProgressEvent) => {
    setLogEvents(prev => [...prev, event]);
  }, []);

  const handleOperationComplete = useCallback(() => {
    setAnyRunning(false);
    fetchStatus();
    fetchEmbeddings();
  }, [fetchStatus, fetchEmbeddings]);

  const handleScreenshot = useCallback(async () => {
    setScreenshotResult(null);
    try {
      const data = await apiPost<{ path: string; filename: string }>('/api/admin/demo/screenshot');
      setScreenshotResult(`Screenshot saved: ${data.filename}`);
    } catch (err: any) {
      setScreenshotResult(`Error: ${err.message}`);
    }
  }, []);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Demo Data Management</h1>
        <p className="mt-2 text-gray-600">
          Manage the demo account for App Store screenshots. Seed data, trigger life feed, and take simulator screenshots.
        </p>
      </div>

      {/* Status Card */}
      <DemoStatusCard
        status={status}
        loading={statusLoading}
        onRefresh={fetchStatus}
      />

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DemoActionButton
            title="Full Reset & Seed"
            description="Clean up existing data and seed fresh demo content"
            icon="🔄"
            apiEndpoint="/api/admin/demo/seed"
            body={{ skipPhotos: true, skipLifeFeed: false, skipWait: false }}
            variant="primary"
            onProgress={handleProgress}
            onComplete={handleOperationComplete}
            confirmMessage="This will delete all existing demo data and create a fresh demo account. Continue?"
          />
          <DemoActionButton
            title="Cleanup Only"
            description="Delete all demo account data without re-seeding"
            icon="🗑️"
            apiEndpoint="/api/admin/demo/cleanup"
            variant="danger"
            onProgress={handleProgress}
            onComplete={handleOperationComplete}
            confirmMessage="This will permanently delete all demo data. Continue?"
          />
          <DemoActionButton
            title="Trigger Life Feed"
            description="Generate life feed posts for the demo account"
            icon="📰"
            apiEndpoint="/api/admin/demo/life-feed"
            variant="secondary"
            disabled={!status?.exists}
            onProgress={handleProgress}
            onComplete={handleOperationComplete}
          />
          <div>
            <button
              onClick={handleScreenshot}
              disabled={!status?.exists}
              className={`
                w-full text-left rounded-lg p-4 transition-all cursor-pointer
                bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">📱</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">Take Screenshot</p>
                  <p className="text-sm text-gray-500">
                    {screenshotResult || 'Capture current iOS Simulator screen (dev only)'}
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Progress Log */}
      <DemoProgressLog
        events={logEvents}
        onClear={() => setLogEvents([])}
      />

      {/* Embedding Status (detailed) */}
      {status?.exists && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Embedding Details</h2>
            <button
              onClick={fetchEmbeddings}
              disabled={embeddingsLoading}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50"
            >
              {embeddingsLoading ? 'Checking...' : 'Check Embeddings'}
            </button>
          </div>

          {embeddings ? (
            <div>
              {/* Overall progress */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">Overall</span>
                  <span className="text-sm font-medium text-gray-700">
                    {embeddings.completed}/{embeddings.total} ({embeddings.percentage}%)
                  </span>
                </div>
                <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-green-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${embeddings.percentage}%` }}
                  />
                </div>
              </div>

              {/* Per-collection breakdown */}
              <div className="space-y-3">
                {Object.entries(embeddings.byCollection).map(([col, data]) => {
                  const pct = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
                  return (
                    <div key={col}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-600">{COLLECTION_LABELS[col] || col}</span>
                        <span className="text-xs text-gray-500">
                          {data.completed}/{data.total} ({pct}%)
                        </span>
                      </div>
                      <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            pct === 100 ? 'bg-green-500' : pct > 0 ? 'bg-blue-500' : 'bg-gray-300'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">
              Click &quot;Check Embeddings&quot; to see per-collection embedding status.
            </p>
          )}
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <div className="text-blue-500 text-xl">&#8505;</div>
          <div>
            <h3 className="text-lg font-semibold text-blue-900 mb-2">How This Works</h3>
            <div className="space-y-2 text-sm text-blue-800">
              <p>
                <strong>Full Reset &amp; Seed</strong> creates a demo account (Alex Chen) with 4 weeks of realistic data:
                health records, location visits, voice notes, text notes, and life feed posts.
              </p>
              <p>
                <strong>Embeddings</strong> are generated automatically by Cloud Functions when data is written to Firestore.
                This takes 2-5 minutes after seeding.
              </p>
              <p>
                <strong>Life Feed</strong> generation calls the <code>generateLifeFeedNow</code> Cloud Function to
                create AI-generated insight posts based on the seeded data.
              </p>
              <p>
                <strong>Screenshots</strong> use <code>xcrun simctl</code> to capture the current iOS Simulator screen.
                Only works locally in development.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
