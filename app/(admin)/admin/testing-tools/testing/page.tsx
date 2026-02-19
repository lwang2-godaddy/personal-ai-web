'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiGet } from '@/lib/api/client';
import { useTrackPage } from '@/lib/hooks/useTrackPage';
import { TRACKED_SCREENS } from '@/lib/models/BehaviorEvent';
import DemoActionButton from '@/components/admin/demo/DemoActionButton';
import DemoProgressLog from '@/components/admin/demo/DemoProgressLog';
import type { DemoProgressEvent } from '@/lib/services/demo/types';
import type { E2EStatus } from '@/lib/services/e2e/types';
import {
  E2E_PRIMARY_EMAIL,
  E2E_PRIMARY_PASSWORD,
  E2E_PRIMARY_DISPLAY_NAME,
  E2E_FRIEND_EMAIL,
  E2E_FRIEND_PASSWORD,
  E2E_FRIEND_DISPLAY_NAME,
} from '@/lib/services/e2e/e2eData';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAESTRO_FLOWS = [
  { file: '01_smoke_test.yaml', description: 'App launches and shows login screen' },
  { file: '02_auth_login.yaml', description: 'Email login, verify all 4 tab buttons visible' },
  { file: '03_feed_tab.yaml', description: 'Feed tab - Navigate, scroll list, take screenshot' },
  { file: '04_insights_tab.yaml', description: 'Insights tab - Navigate through 4 sub-tabs' },
  { file: '05_social_tab.yaml', description: 'Social tab - Navigate through 3 sub-tabs' },
  { file: '06_profile_tab.yaml', description: 'Profile tab - View profile, navigate to settings' },
  { file: '07_create_menu.yaml', description: '"+" button - Verify create action menu opens' },
  { file: '08_diary_flow.yaml', description: 'Create diary entry via quick create modal' },
  { file: '09_chat_flow.yaml', description: 'Chat flow - Send message, wait for AI response' },
  { file: '10_circles_flow.yaml', description: 'Circles - Navigate to circles list, tap first circle' },
  { file: '11_challenges_flow.yaml', description: 'Challenges - Browse challenges, verify list loads' },
  { file: '12_settings_flow.yaml', description: 'Settings - Navigate through settings sub-screens' },
  { file: '13_auth_logout.yaml', description: 'Sign out - Verify return to login screen' },
];

const INTEGRATION_TESTS = [
  { file: 'embedding-pipeline.test.ts', keyword: 'embedding', type: 'Standard' },
  { file: 'enhanced-memory-rag-e2e.test.ts', keyword: 'enhanced-memory-rag', type: 'E2E' },
  { file: 'enhanced-memory-system-e2e.test.ts', keyword: 'enhanced-memory-system', type: 'E2E' },
  { file: 'event-date-extraction.test.ts', keyword: 'event-date', type: 'Standard' },
  { file: 'insights-orchestrator.test.ts', keyword: 'insights-orchestrator', type: 'Standard' },
  { file: 'insights-subservices.test.ts', keyword: 'insights-subservices', type: 'Standard' },
  { file: 'life-feed-generator.test.ts', keyword: 'life-feed-generator', type: 'Standard' },
  { file: 'life-feed-provenance-admin.test.ts', keyword: 'provenance-admin', type: 'Standard' },
  { file: 'life-feed-provenance-e2e.test.ts', keyword: 'provenance-e2e', type: 'E2E' },
  { file: 'life-feed-provenance.test.ts', keyword: 'provenance', type: 'Standard' },
  { file: 'life-feed-rich-content-e2e.test.ts', keyword: 'rich-content-e2e', type: 'E2E' },
  { file: 'life-feed-rich-content.test.ts', keyword: 'rich-content', type: 'Standard' },
  { file: 'life-feed-sources-e2e.test.ts', keyword: 'sources-e2e', type: 'E2E' },
  { file: 'life-feed-sources.test.ts', keyword: 'sources', type: 'Standard' },
  { file: 'memory-builder-config.test.ts', keyword: 'memory-builder-config', type: 'Standard' },
  { file: 'memory-builder-workflow-e2e.test.ts', keyword: 'memory-builder-workflow', type: 'E2E' },
  { file: 'memory-entity-extraction.test.ts', keyword: 'memory-entity', type: 'Standard' },
  { file: 'memory-normalized-content.test.ts', keyword: 'memory-normalized', type: 'Standard' },
  { file: 'memory-search-relevance.test.ts', keyword: 'memory-search', type: 'Standard' },
  { file: 'mood-entries-timestamp.test.ts', keyword: 'mood-entries', type: 'Standard' },
  { file: 'prompt-execution-tracking-e2e.test.ts', keyword: 'prompt-execution-e2e', type: 'E2E' },
  { file: 'prompt-execution-tracking.test.ts', keyword: 'prompt-execution', type: 'Standard' },
  { file: 'rag-engine.test.ts', keyword: 'rag-engine', type: 'Standard' },
  { file: 'scheduler-services.test.ts', keyword: 'scheduler', type: 'Standard' },
  { file: 'temporal-parser-deployed.test.ts', keyword: 'temporal-parser', type: 'Standard' },
  { file: 'temporal-rag-query.test.ts', keyword: 'temporal-rag', type: 'Standard' },
  { file: 'this-day-memories.test.ts', keyword: 'this-day', type: 'Standard' },
  { file: 'vocabulary-memory-integration.test.ts', keyword: 'vocabulary', type: 'Standard' },
];

// Mobile app unit tests (PersonalAIApp/__tests__/)
const MOBILE_UNIT_TESTS = {
  components: [
    { file: 'AnimatedCounter.test.tsx', description: 'Animated number counter with formatting' },
    { file: 'ChallengeProgressBar.test.tsx', description: 'Challenge progress visualization' },
    { file: 'CorrelationAlertCard.test.tsx', description: 'Mood-activity correlation alerts' },
    { file: 'DataQualityBanner.test.tsx', description: 'Data quality issue banners' },
    { file: 'FollowUpChips.test.tsx', description: 'AI follow-up question chips' },
    { file: 'LeaderboardCard.test.tsx', description: 'Challenge leaderboard display' },
    { file: 'PredictionCard.test.tsx', description: 'AI prediction cards' },
    { file: 'SkeletonBase.test.tsx', description: 'Skeleton loading base component' },
    { file: 'SkeletonCard.test.tsx', description: 'Skeleton card placeholder' },
    { file: 'SkeletonList.test.tsx', description: 'Skeleton list placeholder' },
  ],
  services: [
    { file: 'CircleDigestService.test.ts', description: 'Weekly circle activity digests' },
    { file: 'ContextualQuestionService.test.ts', description: 'Contextual RAG questions' },
    { file: 'ConversationService.test.ts', description: 'Chat conversation threads' },
    { file: 'DataExportService.test.ts', description: 'User data export functionality' },
    { file: 'DataQualityService.test.ts', description: 'Data quality monitoring' },
    { file: 'FollowUpQuestionService.test.ts', description: 'AI follow-up question generation' },
    { file: 'HapticsService.test.ts', description: 'Haptic feedback patterns' },
    { file: 'MoodCorrelationAlertService.test.ts', description: 'Mood-activity pattern detection' },
    { file: 'ShareService.test.ts', description: 'External sharing functionality' },
  ],
  models: [
    { file: 'Conversation.test.ts', description: 'Conversation thread model' },
    { file: 'CorrelationAlert.test.ts', description: 'Correlation alert model' },
    { file: 'DataQualityAlert.test.ts', description: 'Data quality alert model' },
    { file: 'MorningBriefing.test.ts', description: 'Morning briefing model' },
    { file: 'Subscription-premium.test.ts', description: 'Premium personality logic' },
    { file: 'WeeklyReport.test.ts', description: 'Weekly report model' },
    { file: 'YearInReview.test.ts', description: 'Year in review model' },
  ],
  store: [
    { file: 'chatSlice.test.ts', description: 'Chat Redux slice' },
    { file: 'chatSlice-conversations.test.ts', description: 'Conversation threads in chat slice' },
  ],
};

const MOBILE_TEST_TOTAL =
  MOBILE_UNIT_TESTS.components.length +
  MOBILE_UNIT_TESTS.services.length +
  MOBILE_UNIT_TESTS.models.length +
  MOBILE_UNIT_TESTS.store.length;

type TabId = 'maestro' | 'integration' | 'mobile' | 'performance';

// ---------------------------------------------------------------------------
// Collection label map
// ---------------------------------------------------------------------------

const COLLECTION_LABELS: Record<string, string> = {
  textNotes: 'Diary Entries',
  lifeFeedPosts: 'Life Feed Posts',
  locationData: 'Locations',
  healthData: 'Health Data',
  circles: 'Circles',
  challenges: 'Challenges',
  users: 'User Profiles',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminTestingPage() {
  useTrackPage(TRACKED_SCREENS.adminTesting);

  const [activeTab, setActiveTab] = useState<TabId>('maestro');
  const [status, setStatus] = useState<E2EStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [logEvents, setLogEvents] = useState<DemoProgressEvent[]>([]);
  const [testFilter, setTestFilter] = useState('');

  const fetchStatus = useCallback(async () => {
    try {
      setStatusLoading(true);
      const data = await apiGet<E2EStatus>('/api/admin/e2e/status');
      setStatus(data);
    } catch (err: any) {
      console.error('Failed to fetch E2E status:', err);
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleProgress = useCallback((event: DemoProgressEvent) => {
    setLogEvents(prev => [...prev, event]);
  }, []);

  const handleOperationComplete = useCallback(() => {
    fetchStatus();
  }, [fetchStatus]);

  // ---------------------------------------------------------------------------
  // Tab: Maestro UI Tests
  // ---------------------------------------------------------------------------

  const renderMaestroTab = () => (
    <div className="space-y-6">
      {/* Test User Credentials */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            Primary Test User
            {status?.primaryUser.exists && <span className="ml-2 text-xs font-normal text-green-600">(active)</span>}
            {status && !status.primaryUser.exists && <span className="ml-2 text-xs font-normal text-gray-400">(not created)</span>}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <span className="text-gray-500">Name: </span>
              <span className="font-mono font-medium text-gray-900">{E2E_PRIMARY_DISPLAY_NAME}</span>
            </div>
            <div>
              <span className="text-gray-500">Email: </span>
              <span className="font-mono font-medium text-gray-900">{E2E_PRIMARY_EMAIL}</span>
            </div>
            <div>
              <span className="text-gray-500">Password: </span>
              <span className="font-mono font-medium text-gray-900">{E2E_PRIMARY_PASSWORD}</span>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-200 pt-3">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            Friend Test User
            {status?.friendUser.exists && <span className="ml-2 text-xs font-normal text-green-600">(active)</span>}
            {status && !status.friendUser.exists && <span className="ml-2 text-xs font-normal text-gray-400">(not created)</span>}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <span className="text-gray-500">Name: </span>
              <span className="font-mono font-medium text-gray-900">{E2E_FRIEND_DISPLAY_NAME}</span>
            </div>
            <div>
              <span className="text-gray-500">Email: </span>
              <span className="font-mono font-medium text-gray-900">{E2E_FRIEND_EMAIL}</span>
            </div>
            <div>
              <span className="text-gray-500">Password: </span>
              <span className="font-mono font-medium text-gray-900">{E2E_FRIEND_PASSWORD}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Data Status */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">E2E Data Status</h2>
          <button
            onClick={fetchStatus}
            disabled={statusLoading}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50"
          >
            {statusLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
        {status ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Object.entries(status.dataCounts).map(([collection, count]) => (
              <div key={collection} className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-gray-900">{count}</div>
                <div className="text-xs text-gray-500">{COLLECTION_LABELS[collection] || collection}</div>
              </div>
            ))}
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">{status.totalDocuments}</div>
              <div className="text-xs text-gray-500">Total Documents</div>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Loading status...</p>
        )}
      </div>

      {/* Actions */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DemoActionButton
            title="Seed Test Data"
            description="Create E2E test users and seed deterministic Firestore data"
            icon="🌱"
            apiEndpoint="/api/admin/e2e/seed"
            variant="primary"
            onProgress={handleProgress}
            onComplete={handleOperationComplete}
            confirmMessage="This will create/update E2E test users and seed test data. Continue?"
          />
          <DemoActionButton
            title="Cleanup Test Data"
            description="Delete all E2E test data and auth users"
            icon="🧹"
            apiEndpoint="/api/admin/e2e/cleanup"
            variant="danger"
            onProgress={handleProgress}
            onComplete={handleOperationComplete}
            confirmMessage="This will permanently delete all E2E test data and auth users. Continue?"
          />
        </div>
      </div>

      {/* Maestro Flows Reference */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Maestro Flows ({MAESTRO_FLOWS.length} flows)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 pr-4 text-gray-500 font-medium">#</th>
                <th className="text-left py-2 pr-4 text-gray-500 font-medium">File</th>
                <th className="text-left py-2 text-gray-500 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {MAESTRO_FLOWS.map((flow, idx) => (
                <tr key={flow.file} className="border-b border-gray-100">
                  <td className="py-2 pr-4 text-gray-400">{idx + 1}</td>
                  <td className="py-2 pr-4 font-mono text-gray-700">{flow.file}</td>
                  <td className="py-2 text-gray-600">{flow.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CLI Quick Reference */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <div className="text-blue-500 text-xl">&#8505;</div>
          <div>
            <h3 className="text-lg font-semibold text-blue-900 mb-2">CLI Quick Reference</h3>
            <div className="space-y-2 text-sm text-blue-800 font-mono">
              <p><code className="bg-blue-100 px-2 py-0.5 rounded">cd PersonalAIApp</code></p>
              <p><code className="bg-blue-100 px-2 py-0.5 rounded">maestro test maestro/flows/</code> — Run all flows</p>
              <p><code className="bg-blue-100 px-2 py-0.5 rounded">maestro test maestro/flows/01_smoke_test.yaml</code> — Run single flow</p>
              <p><code className="bg-blue-100 px-2 py-0.5 rounded">maestro studio</code> — Interactive flow editor</p>
              <p className="text-blue-700 font-sans mt-2">
                Env vars: <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">--env TEST_USER_EMAIL=...</code> and <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">--env TEST_USER_PASSWORD=...</code>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Tab: Integration Tests
  // ---------------------------------------------------------------------------

  const renderIntegrationTab = () => {
    const standardCount = INTEGRATION_TESTS.filter(t => t.type === 'Standard').length;
    const e2eCount = INTEGRATION_TESTS.filter(t => t.type === 'E2E').length;

    return (
      <div className="space-y-6">
        {/* Run Controls */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Run Tests</h2>

          {/* Filter input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by keyword</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={testFilter}
                onChange={(e) => setTestFilter(e.target.value)}
                placeholder="e.g., temporal-parser, rag-engine, life-feed..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {testFilter && (
                <button
                  onClick={() => setTestFilter('')}
                  className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Run buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <DemoActionButton
              title="Run All Tests"
              description={`All ${INTEGRATION_TESTS.length} tests (${standardCount} standard + ${e2eCount} E2E)`}
              icon="▶️"
              apiEndpoint="/api/admin/e2e/tests"
              body={testFilter ? { filter: testFilter } : {}}
              variant="primary"
              onProgress={handleProgress}
              onComplete={handleOperationComplete}
              confirmMessage={`Run ${testFilter ? `tests matching "${testFilter}"` : 'all integration tests'}? This may take several minutes.`}
            />
            <DemoActionButton
              title="Standard Only"
              description={`${standardCount} standard tests (no Cloud Function calls)`}
              icon="⚡"
              apiEndpoint="/api/admin/e2e/tests"
              body={{ skipE2E: true, ...(testFilter ? { filter: testFilter } : {}) }}
              variant="secondary"
              onProgress={handleProgress}
              onComplete={handleOperationComplete}
            />
            <DemoActionButton
              title="E2E Only"
              description={`${e2eCount} E2E tests (requires deployed functions)`}
              icon="🔗"
              apiEndpoint="/api/admin/e2e/tests"
              body={{ e2eOnly: true, ...(testFilter ? { filter: testFilter } : {}) }}
              variant="secondary"
              onProgress={handleProgress}
              onComplete={handleOperationComplete}
            />
            {testFilter && (
              <DemoActionButton
                title={`Run "${testFilter}"`}
                description={`Filtered: ${testFilter}`}
                icon="🔍"
                apiEndpoint="/api/admin/e2e/tests"
                body={{ filter: testFilter }}
                variant="secondary"
                onProgress={handleProgress}
                onComplete={handleOperationComplete}
              />
            )}
          </div>
        </div>

        {/* Test File List */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Test Files ({INTEGRATION_TESTS.length})
            <span className="ml-2 text-sm font-normal text-gray-500">
              {standardCount} Standard, {e2eCount} E2E
            </span>
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 pr-4 text-gray-500 font-medium">File</th>
                  <th className="text-left py-2 pr-4 text-gray-500 font-medium">Filter Keyword</th>
                  <th className="text-left py-2 text-gray-500 font-medium">Type</th>
                </tr>
              </thead>
              <tbody>
                {INTEGRATION_TESTS.map((test) => (
                  <tr key={test.file} className="border-b border-gray-100">
                    <td className="py-2 pr-4 font-mono text-gray-700 text-xs">{test.file}</td>
                    <td className="py-2 pr-4">
                      <button
                        onClick={() => setTestFilter(test.keyword)}
                        className="font-mono text-blue-600 hover:text-blue-800 hover:underline text-xs"
                      >
                        {test.keyword}
                      </button>
                    </td>
                    <td className="py-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        test.type === 'E2E'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {test.type}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* CLI Quick Reference */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <div className="text-blue-500 text-xl">&#8505;</div>
            <div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">CLI Quick Reference</h3>
              <div className="space-y-2 text-sm text-blue-800 font-mono">
                <p><code className="bg-blue-100 px-2 py-0.5 rounded">cd personal-ai-web</code></p>
                <p><code className="bg-blue-100 px-2 py-0.5 rounded">npm test</code> — Run all tests</p>
                <p><code className="bg-blue-100 px-2 py-0.5 rounded">npm test -- --filter temporal-parser</code> — Run by keyword</p>
                <p><code className="bg-blue-100 px-2 py-0.5 rounded">npm test -- --skip-e2e</code> — Standard tests only</p>
                <p><code className="bg-blue-100 px-2 py-0.5 rounded">npm test -- --e2e-only</code> — E2E tests only</p>
                <p><code className="bg-blue-100 px-2 py-0.5 rounded">npm test -- --test-case normalization</code> — Specific test case</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Tab: Mobile Unit Tests
  // ---------------------------------------------------------------------------

  const renderMobileTab = () => (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="text-green-500 text-xl">📱</div>
          <div>
            <h3 className="text-sm font-semibold text-green-900 mb-1">Mobile App Unit Tests (Jest)</h3>
            <p className="text-sm text-green-700">
              Unit tests for the React Native mobile app. These tests run locally via Jest and cover
              components, services, models, and Redux store slices. They are <strong>not included</strong> in
              the production app bundle.
            </p>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{MOBILE_TEST_TOTAL}</div>
          <div className="text-xs text-gray-500">Total Tests</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{MOBILE_UNIT_TESTS.components.length}</div>
          <div className="text-xs text-gray-500">Components</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{MOBILE_UNIT_TESTS.services.length}</div>
          <div className="text-xs text-gray-500">Services</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">{MOBILE_UNIT_TESTS.models.length}</div>
          <div className="text-xs text-gray-500">Models</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-teal-600">{MOBILE_UNIT_TESTS.store.length}</div>
          <div className="text-xs text-gray-500">Store Slices</div>
        </div>
      </div>

      {/* Components Tests */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          Component Tests
          <span className="ml-2 text-sm font-normal text-blue-600">
            ({MOBILE_UNIT_TESTS.components.length} files)
          </span>
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 pr-4 text-gray-500 font-medium">File</th>
                <th className="text-left py-2 text-gray-500 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {MOBILE_UNIT_TESTS.components.map((test) => (
                <tr key={test.file} className="border-b border-gray-100">
                  <td className="py-2 pr-4 font-mono text-gray-700 text-xs">{test.file}</td>
                  <td className="py-2 text-gray-600 text-sm">{test.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Services Tests */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          Service Tests
          <span className="ml-2 text-sm font-normal text-purple-600">
            ({MOBILE_UNIT_TESTS.services.length} files)
          </span>
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 pr-4 text-gray-500 font-medium">File</th>
                <th className="text-left py-2 text-gray-500 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {MOBILE_UNIT_TESTS.services.map((test) => (
                <tr key={test.file} className="border-b border-gray-100">
                  <td className="py-2 pr-4 font-mono text-gray-700 text-xs">{test.file}</td>
                  <td className="py-2 text-gray-600 text-sm">{test.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Models Tests */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          Model Tests
          <span className="ml-2 text-sm font-normal text-orange-600">
            ({MOBILE_UNIT_TESTS.models.length} files)
          </span>
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 pr-4 text-gray-500 font-medium">File</th>
                <th className="text-left py-2 text-gray-500 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {MOBILE_UNIT_TESTS.models.map((test) => (
                <tr key={test.file} className="border-b border-gray-100">
                  <td className="py-2 pr-4 font-mono text-gray-700 text-xs">{test.file}</td>
                  <td className="py-2 text-gray-600 text-sm">{test.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Store Tests */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          Store Slice Tests
          <span className="ml-2 text-sm font-normal text-teal-600">
            ({MOBILE_UNIT_TESTS.store.length} files)
          </span>
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 pr-4 text-gray-500 font-medium">File</th>
                <th className="text-left py-2 text-gray-500 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {MOBILE_UNIT_TESTS.store.map((test) => (
                <tr key={test.file} className="border-b border-gray-100">
                  <td className="py-2 pr-4 font-mono text-gray-700 text-xs">{test.file}</td>
                  <td className="py-2 text-gray-600 text-sm">{test.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CLI Quick Reference */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <div className="text-blue-500 text-xl">&#8505;</div>
          <div>
            <h3 className="text-lg font-semibold text-blue-900 mb-2">CLI Quick Reference</h3>
            <div className="space-y-2 text-sm text-blue-800 font-mono">
              <p><code className="bg-blue-100 px-2 py-0.5 rounded">cd PersonalAIApp</code></p>
              <p><code className="bg-blue-100 px-2 py-0.5 rounded">npm test</code> — Run all tests</p>
              <p><code className="bg-blue-100 px-2 py-0.5 rounded">npm test -- --watch</code> — Watch mode (re-run on changes)</p>
              <p><code className="bg-blue-100 px-2 py-0.5 rounded">npm test -- CircleDigestService</code> — Run specific test file</p>
              <p><code className="bg-blue-100 px-2 py-0.5 rounded">npm test -- __tests__/components</code> — Run all component tests</p>
              <p><code className="bg-blue-100 px-2 py-0.5 rounded">npm test -- __tests__/services</code> — Run all service tests</p>
              <p><code className="bg-blue-100 px-2 py-0.5 rounded">npm test -- --coverage</code> — Run with coverage report</p>
            </div>
          </div>
        </div>
      </div>

      {/* Location Note */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="text-gray-400 text-xl">📁</div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-1">File Locations</h3>
            <p className="text-sm text-gray-600">
              Tests are located in <code className="bg-gray-100 px-1 rounded text-xs">PersonalAIApp/__tests__/</code> and{' '}
              <code className="bg-gray-100 px-1 rounded text-xs">PersonalAIApp/src/store/slices/__tests__/</code>.
              These files are excluded from production builds by Metro bundler.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Tab: Performance Baseline
  // ---------------------------------------------------------------------------

  const renderPerformanceTab = () => (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="text-purple-500 text-xl">&#9881;</div>
          <div>
            <h3 className="text-sm font-semibold text-purple-900 mb-1">Performance Baseline Data</h3>
            <p className="text-sm text-purple-700">
              Generates ~630 synthetic performance metrics across 7 days for 3 test users,
              covering all 6 metric types (startup, transitions, scroll FPS, component renders,
              JS thread FPS, API latency), then computes daily aggregates.
            </p>
          </div>
        </div>
      </div>

      {/* Test Users */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Synthetic User IDs</h3>
        <p className="text-xs text-gray-500 mb-2">
          These are fake IDs written to the <code className="bg-gray-100 px-1 rounded">userId</code> field on each metric document.
          No real Firebase Auth accounts are created — the admin performance dashboard reads all metrics without filtering by user.
        </p>
        <div className="flex flex-wrap gap-2">
          <span className="font-mono text-xs bg-white border border-gray-200 rounded px-2 py-1 text-gray-700">e2e-perf-user-1</span>
          <span className="font-mono text-xs bg-white border border-gray-200 rounded px-2 py-1 text-gray-700">e2e-perf-user-2</span>
          <span className="font-mono text-xs bg-white border border-gray-200 rounded px-2 py-1 text-gray-700">e2e-perf-user-3</span>
        </div>
      </div>

      {/* Actions */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DemoActionButton
            title="Seed Performance Data"
            description="Generate synthetic metrics and daily aggregates for 7 days"
            icon="&#128200;"
            apiEndpoint="/api/admin/e2e/performance/seed"
            variant="primary"
            onProgress={handleProgress}
            onComplete={handleOperationComplete}
            confirmMessage="This will write ~630 synthetic performance metrics and 7 aggregate documents. Continue?"
          />
          <DemoActionButton
            title="Cleanup Performance Data"
            description="Delete all seeded performance metrics and aggregates"
            icon="&#128465;"
            apiEndpoint="/api/admin/e2e/performance/cleanup"
            variant="danger"
            onProgress={handleProgress}
            onComplete={handleOperationComplete}
            confirmMessage="This will permanently delete all seeded performance data. Continue?"
          />
        </div>
      </div>

      {/* Metric Types Reference */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Metric Types (6)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 pr-4 text-gray-500 font-medium">Type</th>
                <th className="text-left py-2 pr-4 text-gray-500 font-medium">Count/Day</th>
                <th className="text-left py-2 pr-4 text-gray-500 font-medium">Base Value</th>
                <th className="text-left py-2 text-gray-500 font-medium">Patterns</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-2 pr-4 font-mono text-gray-700">app_startup</td>
                <td className="py-2 pr-4 text-gray-600">2-3</td>
                <td className="py-2 pr-4 text-gray-600">1200ms</td>
                <td className="py-2 text-gray-600">Morning slower, weekend slower</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 pr-4 font-mono text-gray-700">screen_transition</td>
                <td className="py-2 pr-4 text-gray-600">8-12</td>
                <td className="py-2 pr-4 text-gray-600">80-250ms</td>
                <td className="py-2 text-gray-600">Varies by screen (Home=120, LifeFeed=250)</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 pr-4 font-mono text-gray-700">scroll_fps</td>
                <td className="py-2 pr-4 text-gray-600">4-6</td>
                <td className="py-2 pr-4 text-gray-600">55 FPS</td>
                <td className="py-2 text-gray-600">LifeFeed -5fps, 10% frame drops</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 pr-4 font-mono text-gray-700">component_render</td>
                <td className="py-2 pr-4 text-gray-600">4-6</td>
                <td className="py-2 pr-4 text-gray-600">6-22ms</td>
                <td className="py-2 text-gray-600">LifeFeedPostCard=22ms, 15% slow renders</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 pr-4 font-mono text-gray-700">js_thread_fps</td>
                <td className="py-2 pr-4 text-gray-600">2-3</td>
                <td className="py-2 pr-4 text-gray-600">56 FPS</td>
                <td className="py-2 text-gray-600">8% chance of dips</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 pr-4 font-mono text-gray-700">api_response_time</td>
                <td className="py-2 pr-4 text-gray-600">5-8</td>
                <td className="py-2 pr-4 text-gray-600">180-1200ms</td>
                <td className="py-2 text-gray-600">queryRAG=800ms, 10% slow, 5% errors</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Link to dashboard */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="text-blue-500 text-xl">&#8505;</div>
          <div>
            <h3 className="text-sm font-semibold text-blue-900 mb-1">View Results</h3>
            <p className="text-sm text-blue-700">
              After seeding, view the data on the{' '}
              <a href="/admin/performance" className="underline font-medium hover:text-blue-900">
                Performance Dashboard
              </a>
              . Select the last 7 days and click &quot;Load Data&quot; to see all 6 metric tabs populated.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Testing</h1>
        <p className="mt-2 text-gray-600">
          Manage Maestro UI test data and run backend integration tests.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('maestro')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'maestro'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Maestro UI Tests
            <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
              {MAESTRO_FLOWS.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('integration')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'integration'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Integration Tests
            <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
              {INTEGRATION_TESTS.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('mobile')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'mobile'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Mobile Unit Tests
            <span className="ml-2 bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs">
              {MOBILE_TEST_TOTAL}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'performance'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Performance
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'maestro' && renderMaestroTab()}
      {activeTab === 'integration' && renderIntegrationTab()}
      {activeTab === 'mobile' && renderMobileTab()}
      {activeTab === 'performance' && renderPerformanceTab()}

      {/* Progress Log (shared) */}
      <DemoProgressLog
        events={logEvents}
        onClear={() => setLogEvents([])}
      />
    </div>
  );
}
