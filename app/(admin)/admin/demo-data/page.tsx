'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiGet, apiPost } from '@/lib/api/client';
import { useTrackPage } from '@/lib/hooks/useTrackPage';
import { TRACKED_SCREENS } from '@/lib/models/BehaviorEvent';
import DemoStatusCard from '@/components/admin/demo/DemoStatusCard';
import DemoActionButton from '@/components/admin/demo/DemoActionButton';
import DemoProgressLog from '@/components/admin/demo/DemoProgressLog';
import type { DemoStatus, DemoProgressEvent } from '@/lib/services/demo/types';
import { DEMO_EMAIL, DEMO_PASSWORD, DEMO_DISPLAY_NAME } from '@/lib/services/demo/demoData';

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
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Demo Account Credentials</h3>
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

      {/* Smart Frequency Algorithm Reference */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <div className="text-purple-500 text-xl">&#9881;</div>
          <div className="w-full">
            <h3 className="text-lg font-semibold text-purple-900 mb-3">Life Feed: Smart Frequency Algorithm</h3>
            <p className="text-sm text-purple-800 mb-4">
              <code>generateLifeFeedNow</code> uses <code>SmartFrequencyCalculator</code> to decide <strong>how many</strong> posts
              to generate. It scores three dimensions (each 0–1), combines them with configurable weights, and maps the total to a post count.
            </p>

            {/* Scoring Components */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div className="bg-white rounded-lg p-3 border border-purple-100">
                <p className="font-semibold text-purple-900 text-sm mb-1">Data Volume <span className="text-purple-500 font-normal">(40%)</span></p>
                <p className="text-xs text-purple-700">
                  Counts data points in last <strong>7 days</strong> (steps, workouts, locations, notes, photos).
                  Logarithmic scaling: <code>log(pts+1)/log(51)</code>. Diminishing returns after ~20 points.
                </p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-purple-100">
                <p className="font-semibold text-purple-900 text-sm mb-1">Data Freshness <span className="text-purple-500 font-normal">(30%)</span></p>
                <p className="text-xs text-purple-700">
                  Checks for data within last <strong>24 hours</strong> across 3 collections: health, location, voice.
                  Score = freshCollections / 3. Values: <strong>0, 0.33, 0.67, or 1.0</strong>.
                </p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-purple-100">
                <p className="font-semibold text-purple-900 text-sm mb-1">Activity Diversity <span className="text-purple-500 font-normal">(30%)</span></p>
                <p className="text-xs text-purple-700">
                  Unique activities (60% weight, capped at 10) + data types present (40% weight, out of 7 types).
                  More varied data = higher score.
                </p>
              </div>
            </div>

            {/* Score → Posts table */}
            <div className="bg-white rounded-lg p-3 border border-purple-100 mb-4">
              <p className="font-semibold text-purple-900 text-sm mb-2">Total Score → Recommended Posts</p>
              <div className="grid grid-cols-5 gap-1 text-xs text-center">
                <div className="bg-green-100 text-green-800 rounded px-2 py-1 font-medium">&ge; 0.8 → 3 posts</div>
                <div className="bg-blue-100 text-blue-800 rounded px-2 py-1 font-medium">&ge; 0.6 → 2 posts</div>
                <div className="bg-yellow-100 text-yellow-800 rounded px-2 py-1 font-medium">&ge; 0.4 → 1 post</div>
                <div className="bg-orange-100 text-orange-800 rounded px-2 py-1 font-medium">&ge; 0.2 → 1 post</div>
                <div className="bg-red-100 text-red-800 rounded px-2 py-1 font-medium">&lt; 0.2 → 0 posts</div>
              </div>
            </div>

            {/* Worked Example */}
            <div className="bg-white rounded-lg p-4 border border-purple-100 mb-4">
              <p className="font-semibold text-purple-900 text-sm mb-3">Worked Example: Demo Seed Data</p>

              {/* Scenario comparison table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-purple-200">
                      <th className="text-left py-1.5 pr-3 text-purple-700 font-semibold">Component</th>
                      <th className="text-left py-1.5 pr-3 text-purple-700 font-semibold">Formula</th>
                      <th className="text-center py-1.5 px-2 text-red-700 font-semibold">Without day-0 data</th>
                      <th className="text-center py-1.5 px-2 text-green-700 font-semibold">With day-0 data</th>
                    </tr>
                  </thead>
                  <tbody className="text-purple-800">
                    <tr className="border-b border-purple-100">
                      <td className="py-1.5 pr-3 font-medium">Volume (40%)</td>
                      <td className="py-1.5 pr-3"><code className="text-[10px]">log(~13+1)/log(51)</code></td>
                      <td className="py-1.5 px-2 text-center font-mono">0.67</td>
                      <td className="py-1.5 px-2 text-center font-mono">0.67</td>
                    </tr>
                    <tr className="border-b border-purple-100">
                      <td className="py-1.5 pr-3 font-medium">Freshness (30%)</td>
                      <td className="py-1.5 pr-3"><code className="text-[10px]">freshCollections / 3</code></td>
                      <td className="py-1.5 px-2 text-center font-mono text-red-600 font-bold">0.0</td>
                      <td className="py-1.5 px-2 text-center font-mono text-green-600 font-bold">1.0</td>
                    </tr>
                    <tr className="border-b border-purple-100">
                      <td className="py-1.5 pr-3 font-medium">Diversity (30%)</td>
                      <td className="py-1.5 pr-3"><code className="text-[10px]">(acts/10)*.6 + (types/7)*.4</code></td>
                      <td className="py-1.5 px-2 text-center font-mono">0.70</td>
                      <td className="py-1.5 px-2 text-center font-mono">0.70</td>
                    </tr>
                    <tr className="border-t-2 border-purple-300">
                      <td className="py-2 pr-3 font-bold">Total</td>
                      <td className="py-2 pr-3"><code className="text-[10px]">V*.4 + F*.3 + D*.3</code></td>
                      <td className="py-2 px-2 text-center">
                        <span className="font-mono font-bold text-red-600">0.478</span>
                        <span className="block text-[10px] text-red-500 mt-0.5">1 post/round</span>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className="font-mono font-bold text-green-600">0.778</span>
                        <span className="block text-[10px] text-green-500 mt-0.5">2-3 posts/round</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Freshness detail */}
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-red-50 rounded p-2.5 border border-red-100">
                  <p className="font-semibold text-red-800 text-xs mb-1">Without day-0: Freshness = 0.0</p>
                  <div className="space-y-0.5 text-[11px] text-red-700">
                    <p>healthData in last 24h? <strong>No</strong> (earliest = day 1 = 24h+ ago)</p>
                    <p>locationData in last 24h? <strong>No</strong></p>
                    <p>voiceNotes in last 24h? <strong>No</strong></p>
                    <p className="mt-1 font-medium">0/3 fresh → score <strong>0.0</strong> → total drops to 0.478 → <strong>1 post</strong></p>
                  </div>
                </div>
                <div className="bg-green-50 rounded p-2.5 border border-green-100">
                  <p className="font-semibold text-green-800 text-xs mb-1">With day-0: Freshness = 1.0</p>
                  <div className="space-y-0.5 text-[11px] text-green-700">
                    <p>healthData in last 24h? <strong>Yes</strong> (day-0 steps)</p>
                    <p>locationData in last 24h? <strong>Yes</strong> (day-0 office visit)</p>
                    <p>voiceNotes in last 24h? <strong>Yes</strong> (day-0 morning note)</p>
                    <p className="mt-1 font-medium">3/3 fresh → score <strong>1.0</strong> → total rises to 0.778 → <strong>2-3 posts</strong></p>
                  </div>
                </div>
              </div>
            </div>

            {/* Demo seed note */}
            <p className="text-xs text-purple-600">
              <strong>Demo note:</strong> Seed data includes &quot;day 0&quot; entries for health, location, and voice so that the
              freshness score = 1.0 at seed time. The full pipeline calls <code>generateLifeFeedNow</code> in 4 rounds
              (with 2s delays) to generate up to 12 posts across different post types.
            </p>
          </div>
        </div>
      </div>

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
                based on the seeded data. Uses <strong>Smart Frequency</strong> (see above) to determine post count.
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
