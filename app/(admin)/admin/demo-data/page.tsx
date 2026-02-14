'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiGet, apiPost } from '@/lib/api/client';
import { useTrackPage } from '@/lib/hooks/useTrackPage';
import { TRACKED_SCREENS } from '@/lib/models/BehaviorEvent';
import DemoStatusCard from '@/components/admin/demo/DemoStatusCard';
import DemoActionButton from '@/components/admin/demo/DemoActionButton';
import DemoProgressLog from '@/components/admin/demo/DemoProgressLog';
import type { DemoStatus, DemoProgressEvent } from '@/lib/services/demo/types';
import {
  DEMO_EMAIL,
  DEMO_PASSWORD,
  DEMO_DISPLAY_NAME,
  DEMO_FRIEND_EMAIL,
  DEMO_FRIEND_PASSWORD,
  DEMO_FRIEND_DISPLAY_NAME,
} from '@/lib/services/demo/demoData';

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

      {/* Demo Credentials */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Demo Account — Alex Chen (primary)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <span className="text-gray-500">Name: </span>
              <span className="font-mono font-medium text-gray-900">{DEMO_DISPLAY_NAME}</span>
            </div>
            <div>
              <span className="text-gray-500">Email: </span>
              <span className="font-mono font-medium text-gray-900">{DEMO_EMAIL}</span>
            </div>
            <div>
              <span className="text-gray-500">Password: </span>
              <span className="font-mono font-medium text-gray-900">{DEMO_PASSWORD}</span>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-200 pt-3">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            Friend Account — Sarah Johnson
            {status?.friendExists && <span className="ml-2 text-xs font-normal text-green-600">(active)</span>}
            {status && !status.friendExists && <span className="ml-2 text-xs font-normal text-gray-400">(not seeded)</span>}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <span className="text-gray-500">Name: </span>
              <span className="font-mono font-medium text-gray-900">{DEMO_FRIEND_DISPLAY_NAME}</span>
            </div>
            <div>
              <span className="text-gray-500">Email: </span>
              <span className="font-mono font-medium text-gray-900">{DEMO_FRIEND_EMAIL}</span>
            </div>
            <div>
              <span className="text-gray-500">Password: </span>
              <span className="font-mono font-medium text-gray-900">{DEMO_FRIEND_PASSWORD}</span>
            </div>
          </div>
          {status?.friendExists && (
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-gray-500">
              <div>Friend Posts: <span className="font-medium text-gray-700">{status.friendLifeFeedCount ?? 0}</span></div>
              <div>Circles: <span className="font-medium text-gray-700">{status.circleCount ?? 0}</span></div>
              <div>UID: <span className="font-mono text-gray-700">{status.friendUid?.slice(0, 12)}...</span></div>
            </div>
          )}
        </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <DemoActionButton
            title="Full Reset & Seed"
            description="Clean up existing data and seed fresh 2-month demo content"
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
            title="Seed Friend (Sarah)"
            description="Create Sarah Johnson as Alex's friend with posts, circles, and engagement"
            icon="👥"
            apiEndpoint="/api/admin/demo/seed-friend"
            variant="secondary"
            disabled={!status?.exists || !!status?.friendExists}
            onProgress={handleProgress}
            onComplete={handleOperationComplete}
            confirmMessage="This will create a friend user (Sarah Johnson) with life feed posts and social data. Continue?"
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
          <DemoActionButton
            title="Generate Keywords"
            description="Generate weekly keyword summaries from demo data"
            icon="🏷️"
            apiEndpoint="/api/admin/demo/keywords"
            variant="secondary"
            disabled={!status?.exists}
            onProgress={handleProgress}
            onComplete={handleOperationComplete}
          />
          <DemoActionButton
            title="Generate Insights"
            description="Generate fun facts and pattern insights"
            icon="💡"
            apiEndpoint="/api/admin/demo/insights"
            variant="secondary"
            disabled={!status?.exists}
            onProgress={handleProgress}
            onComplete={handleOperationComplete}
          />
          <DemoActionButton
            title="This Day Memories"
            description="Generate memories from 1 year ago for today"
            icon="🧠"
            apiEndpoint="/api/admin/demo/memories"
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

      {/* Life Feed Algorithm Reference (moved to Life Feed Viewer) */}
      <a
        href="/admin/life-feed"
        className="block bg-purple-50 border border-purple-200 rounded-lg p-4 hover:bg-purple-100/70 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="text-purple-500 text-xl">&#9881;</div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-purple-900">Life Feed Algorithm Reference</h3>
            <p className="text-xs text-purple-700 mt-0.5">
              Smart Frequency &amp; Post Type Selection algorithms &rarr; View in Life Feed Viewer
            </p>
          </div>
          <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </a>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <div className="text-blue-500 text-xl">&#8505;</div>
          <div>
            <h3 className="text-lg font-semibold text-blue-900 mb-2">How This Works</h3>
            <div className="space-y-2 text-sm text-blue-800">
              <p>
                <strong>Full Reset &amp; Seed</strong> creates a demo account (Alex Chen) with ~2 months of realistic data
                plus historical data from 1 year ago: health records, location visits, voice notes, text notes, and photos.
              </p>
              <p>
                <strong>Embeddings</strong> are generated automatically by Cloud Functions when data is written to Firestore.
                This takes 2-5 minutes after seeding.
              </p>
              <p>
                <strong>Life Feed</strong> calls <code>generateLifeFeedNow</code> to create AI-generated insight posts
                based on the seeded data. Uses <strong>Smart Frequency</strong> (see <a href="/admin/life-feed" className="underline hover:text-blue-600">Life Feed Viewer</a>) to determine post count.
                Seed data includes &quot;day 0&quot; entries for health, location, and voice so that the freshness score = 1.0
                at seed time. The full pipeline calls <code>generateLifeFeedNow</code> in 4 rounds (with 2s delays)
                to generate up to 12 posts across different post types.
              </p>
              <p>
                <strong>Keywords</strong> calls <code>generateKeywordsNow</code> to extract weekly keyword summaries
                from the demo user&apos;s data.
              </p>
              <p>
                <strong>Insights</strong> calls <code>generateUnifiedInsightsNow</code> to generate fun facts, patterns,
                and anomaly insights from the demo data.
              </p>
              <p>
                <strong>This Day Memories</strong> calls <code>generateThisDayMemories</code> to find what the demo user
                was doing exactly 1 year ago today. Requires the 1-year-ago seed data.
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
