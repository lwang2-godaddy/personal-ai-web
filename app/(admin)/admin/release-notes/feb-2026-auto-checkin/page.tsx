'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useTrackPage } from '@/lib/hooks/useTrackPage';
import { TRACKED_SCREENS } from '@/lib/models/BehaviorEvent';

// ============================================================
// Types
// ============================================================

type FeatureStatus = 'planned' | 'in-progress' | 'completed';
type FeatureType = 'new' | 'enhancement';

type CategoryId = 'places' | 'preferences' | 'daily-summary' | 'settings-ui';

interface ReleaseFeature {
  number: number;
  name: string;
  description: string;
  status: FeatureStatus;
  type: FeatureType;
  adminConfigHref: string | null;
  adminConfigLabel: string | null;
  mobileScreens: string[];
  mobileServices: string[];
  categoryId: CategoryId;
  testsRequired: number;
  testsCompleted: number;
}

interface CategoryMeta {
  id: CategoryId;
  label: string;
  color: string;
  borderColor: string;
  badgeStyle: string;
  iconBg: string;
}

interface TimelinePhase {
  phase: number;
  label: string;
  features: string;
  weekRange: string;
  status: 'planned' | 'in-progress' | 'completed';
}

// ============================================================
// Data
// ============================================================

const CATEGORIES: CategoryMeta[] = [
  {
    id: 'places',
    label: 'Place Types',
    color: 'bg-blue-50',
    borderColor: 'border-blue-200',
    badgeStyle: 'bg-blue-100 text-blue-800',
    iconBg: 'bg-blue-500',
  },
  {
    id: 'preferences',
    label: 'Check-In Behavior',
    color: 'bg-orange-50',
    borderColor: 'border-orange-200',
    badgeStyle: 'bg-orange-100 text-orange-800',
    iconBg: 'bg-orange-500',
  },
  {
    id: 'daily-summary',
    label: 'Daily Summary',
    color: 'bg-purple-50',
    borderColor: 'border-purple-200',
    badgeStyle: 'bg-purple-100 text-purple-800',
    iconBg: 'bg-purple-500',
  },
  {
    id: 'settings-ui',
    label: 'Settings UI',
    color: 'bg-green-50',
    borderColor: 'border-green-200',
    badgeStyle: 'bg-green-100 text-green-800',
    iconBg: 'bg-green-500',
  },
];

const FEATURES: ReleaseFeature[] = [
  // Place Types (2)
  {
    number: 1,
    name: 'Place Type Designation',
    description:
      'Add PlaceType field (home/work/regular/other) to SavedPlace model. Allows users to designate special locations with unique check-in behavior. Only ONE home and ONE work allowed per user - setting a new one auto-clears the previous.',
    status: 'completed',
    type: 'new',
    adminConfigHref: '/admin/features',
    adminConfigLabel: 'Features',
    mobileScreens: ['CheckInSettingsScreen', 'PlaceEditModal'],
    mobileServices: ['SavedPlaceService', 'SavedPlaceModel'],
    categoryId: 'places',
    testsRequired: 3,
    testsCompleted: 3,
  },
  {
    number: 2,
    name: 'Home/Work Service Methods',
    description:
      'New SavedPlaceService methods: getHomePlace(), getWorkPlace(), setAsHome(), setAsWork(), clearDesignation(). Enforces one-home/one-work constraint by clearing previous designation before setting new one.',
    status: 'completed',
    type: 'new',
    adminConfigHref: null,
    adminConfigLabel: null,
    mobileScreens: [],
    mobileServices: ['SavedPlaceService'],
    categoryId: 'places',
    testsRequired: 2,
    testsCompleted: 2,
  },

  // Check-In Behavior (2)
  {
    number: 3,
    name: 'Category-Based Check-In Behavior',
    description:
      'Different check-in behavior based on place type. Home/work can be set to silent check-ins (no notifications, optional timeline recording). Regular places follow normal smart/always auto check-in rules.',
    status: 'completed',
    type: 'enhancement',
    adminConfigHref: '/admin/features',
    adminConfigLabel: 'Feature Flags',
    mobileScreens: [],
    mobileServices: ['CheckInSuggestionService'],
    categoryId: 'preferences',
    testsRequired: 2,
    testsCompleted: 2,
  },
  {
    number: 4,
    name: 'Silent Check-In for Home/Work',
    description:
      'New createSilentCheckIn() method that records visits to home/work without triggering notifications. Controlled by homeWorkCheckInEnabled and homeWorkTimelineOnly preferences.',
    status: 'completed',
    type: 'new',
    adminConfigHref: null,
    adminConfigLabel: null,
    mobileScreens: [],
    mobileServices: ['CheckInSuggestionService', 'NotificationService'],
    categoryId: 'preferences',
    testsRequired: 2,
    testsCompleted: 2,
  },

  // Daily Summary (3)
  {
    number: 5,
    name: 'Daily Summary Service',
    description:
      'New DailyCheckInSummaryService that generates end-of-day summaries of all places visited. Aggregates visits, calculates durations, and prepares data for batch confirmation UI.',
    status: 'completed',
    type: 'new',
    adminConfigHref: null,
    adminConfigLabel: null,
    mobileScreens: [],
    mobileServices: ['DailyCheckInSummaryService'],
    categoryId: 'daily-summary',
    testsRequired: 2,
    testsCompleted: 2,
  },
  {
    number: 6,
    name: 'Daily Summary Redux Slice',
    description:
      'New dailySummarySlice with async thunks: generateDailySummary, confirmSummaryItem, confirmAllItems, dismissAllItems. Manages summary state and batch confirmation workflow.',
    status: 'completed',
    type: 'new',
    adminConfigHref: null,
    adminConfigLabel: null,
    mobileScreens: [],
    mobileServices: ['dailySummarySlice', 'store.ts'],
    categoryId: 'daily-summary',
    testsRequired: 1,
    testsCompleted: 1,
  },
  {
    number: 7,
    name: 'Daily Summary Modal',
    description:
      'New DailySummaryModal component for batch confirmation of daily visits. Shows all places visited with arrival time, duration, and suggested activity. Supports confirm all, dismiss all, and individual actions.',
    status: 'completed',
    type: 'new',
    adminConfigHref: null,
    adminConfigLabel: null,
    mobileScreens: ['HomeFeedScreen', 'DailySummaryModal'],
    mobileServices: ['DailySummaryModal'],
    categoryId: 'daily-summary',
    testsRequired: 1,
    testsCompleted: 1,
  },

  // Settings UI (2)
  {
    number: 8,
    name: 'Home/Work Settings Section',
    description:
      'New "Home & Work Check-ins" section in CheckInSettingsScreen. Toggle to enable/disable check-in prompts at home/work, and toggle to record visits to timeline only (silent mode).',
    status: 'completed',
    type: 'enhancement',
    adminConfigHref: null,
    adminConfigLabel: null,
    mobileScreens: ['CheckInSettingsScreen'],
    mobileServices: [],
    categoryId: 'settings-ui',
    testsRequired: 1,
    testsCompleted: 1,
  },
  {
    number: 9,
    name: 'Daily Summary Settings Section',
    description:
      'New "Daily Summary" section in CheckInSettingsScreen. Toggle to enable daily summary notifications, and time picker to set preferred summary time (default: 7:00 PM).',
    status: 'completed',
    type: 'enhancement',
    adminConfigHref: null,
    adminConfigLabel: null,
    mobileScreens: ['CheckInSettingsScreen'],
    mobileServices: [],
    categoryId: 'settings-ui',
    testsRequired: 1,
    testsCompleted: 1,
  },
];

const TIMELINE: TimelinePhase[] = [
  {
    phase: 1,
    label: 'Place Types Foundation',
    features: 'Schema migration v19, SavedPlace model, SavedPlaceService methods',
    weekRange: 'Day 1',
    status: 'completed',
  },
  {
    phase: 2,
    label: 'Category-Based Behavior',
    features: 'New preferences, silent check-in, CheckInSuggestionService updates',
    weekRange: 'Day 1',
    status: 'completed',
  },
  {
    phase: 3,
    label: 'Daily Summary Feature',
    features: 'DailyCheckInSummaryService, dailySummarySlice, DailySummaryModal',
    weekRange: 'Day 1',
    status: 'completed',
  },
  {
    phase: 4,
    label: 'Settings UI + i18n',
    features: 'CheckInSettingsScreen updates, translations for 6 locales',
    weekRange: 'Day 1',
    status: 'completed',
  },
  {
    phase: 5,
    label: 'Integration Tests',
    features: 'auto-checkin-enhancements.test.ts with 4 test cases',
    weekRange: 'Day 1',
    status: 'completed',
  },
  {
    phase: 6,
    label: 'Admin Dashboard',
    features: 'Feature registry, feature flags, admin UI updates',
    weekRange: 'Day 1',
    status: 'completed',
  },
];

// ============================================================
// Styling Helpers
// ============================================================

const STATUS_STYLES: Record<FeatureStatus, { badge: string; dot: string; label: string }> = {
  completed: {
    badge: 'bg-green-100 text-green-800',
    dot: 'bg-green-500',
    label: 'Completed',
  },
  'in-progress': {
    badge: 'bg-yellow-100 text-yellow-800',
    dot: 'bg-yellow-500',
    label: 'In Progress',
  },
  planned: {
    badge: 'bg-gray-100 text-gray-600',
    dot: 'bg-gray-400',
    label: 'Planned',
  },
};

const TYPE_STYLES: Record<FeatureType, { badge: string; label: string }> = {
  new: {
    badge: 'bg-indigo-100 text-indigo-800',
    label: 'NEW',
  },
  enhancement: {
    badge: 'bg-teal-100 text-teal-800',
    label: 'ENHANCE',
  },
};

// ============================================================
// Component
// ============================================================

export default function Feb2026AutoCheckinPage() {
  useTrackPage(TRACKED_SCREENS.adminReleaseNotes);

  const [expandedFeatures, setExpandedFeatures] = useState<Set<number>>(new Set());
  const [collapsedCategories, setCollapsedCategories] = useState<Set<CategoryId>>(new Set());

  // Group features by category
  const featuresByCategory = useMemo(() => {
    const grouped: Record<CategoryId, ReleaseFeature[]> = {
      places: [],
      preferences: [],
      'daily-summary': [],
      'settings-ui': [],
    };
    FEATURES.forEach((f) => {
      grouped[f.categoryId].push(f);
    });
    return grouped;
  }, []);

  // Summary stats
  const stats = useMemo(() => {
    const completed = FEATURES.filter((f) => f.status === 'completed').length;
    const inProgress = FEATURES.filter((f) => f.status === 'in-progress').length;
    const planned = FEATURES.filter((f) => f.status === 'planned').length;
    const newFeatures = FEATURES.filter((f) => f.type === 'new').length;
    const enhancements = FEATURES.filter((f) => f.type === 'enhancement').length;
    const totalTests = FEATURES.reduce((sum, f) => sum + f.testsRequired, 0);
    const completedTests = FEATURES.reduce((sum, f) => sum + f.testsCompleted, 0);
    return { total: FEATURES.length, completed, inProgress, planned, newFeatures, enhancements, totalTests, completedTests };
  }, []);

  const toggleFeature = (featureNumber: number) => {
    setExpandedFeatures((prev) => {
      const next = new Set(prev);
      if (next.has(featureNumber)) {
        next.delete(featureNumber);
      } else {
        next.add(featureNumber);
      }
      return next;
    });
  };

  const toggleCategory = (categoryId: CategoryId) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setCollapsedCategories(new Set());
    setExpandedFeatures(new Set(FEATURES.map((f) => f.number)));
  };

  const collapseAll = () => {
    setCollapsedCategories(new Set(CATEGORIES.map((c) => c.id)));
    setExpandedFeatures(new Set());
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm">
        <Link href="/admin/release-notes" className="text-indigo-600 hover:text-indigo-800">
          Release Notes
        </Link>
        <span className="text-gray-400">/</span>
        <span className="text-gray-600">v1.3.1 - Auto Check-In Enhancements (Feb 2026)</span>
      </nav>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-mono font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
              v1.3.1
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Released
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Auto Check-In Enhancements</h1>
          <p className="mt-1 text-sm text-gray-500">
            {stats.total} features across 4 categories ({stats.newFeatures} new, {stats.enhancements} enhancements) - All completed
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={expandAll}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500">Total Features</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500">Completed</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats.completed}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500">New Features</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{stats.newFeatures}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500">Tests</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">
            {stats.completedTests}/{stats.totalTests}
          </p>
        </div>
      </div>

      {/* Feature Categories */}
      {CATEGORIES.map((category) => {
        const features = featuresByCategory[category.id];
        if (features.length === 0) return null;

        const isCollapsed = collapsedCategories.has(category.id);
        const completedCount = features.filter((f) => f.status === 'completed').length;

        return (
          <div
            key={category.id}
            className={`rounded-lg border ${category.borderColor} ${category.color} overflow-hidden`}
          >
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(category.id)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:opacity-80 transition-opacity"
            >
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${category.iconBg}`} />
                <h2 className="text-lg font-semibold text-gray-900">{category.label}</h2>
                <span className="text-sm text-gray-500">
                  ({features.length} feature{features.length !== 1 ? 's' : ''})
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {completedCount} Done
                </span>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {/* Category Content */}
            {!isCollapsed && (
              <div className="px-5 pb-4">
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left py-2.5 px-4 font-medium text-gray-600 w-8">#</th>
                          <th className="text-left py-2.5 px-4 font-medium text-gray-600">Feature</th>
                          <th className="text-left py-2.5 px-4 font-medium text-gray-600 w-20">Type</th>
                          <th className="text-left py-2.5 px-4 font-medium text-gray-600 w-24">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {features.map((feature) => {
                          const isExpanded = expandedFeatures.has(feature.number);
                          const statusStyle = STATUS_STYLES[feature.status];
                          const typeStyle = TYPE_STYLES[feature.type];

                          return (
                            <FeatureRow
                              key={feature.number}
                              feature={feature}
                              isExpanded={isExpanded}
                              statusStyle={statusStyle}
                              typeStyle={typeStyle}
                              categoryMeta={category}
                              onToggle={() => toggleFeature(feature.number)}
                            />
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Implementation Timeline */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Implementation Timeline</h2>
        <p className="text-sm text-gray-500 mb-4">
          All 6 phases completed in a single implementation session.
        </p>
        <div className="space-y-3">
          {TIMELINE.map((phase) => {
            const phaseStatusStyle = STATUS_STYLES[phase.status];
            return (
              <div
                key={phase.phase}
                className="flex items-start gap-4 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold bg-green-500">
                  {phase.phase}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">
                      Phase {phase.phase}: {phase.label}
                    </p>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${phaseStatusStyle.badge}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${phaseStatusStyle.dot}`} />
                      {phaseStatusStyle.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{phase.features}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* How to Test */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">How to Test</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4 border border-indigo-100">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🏠</span>
              <h3 className="font-semibold text-gray-900">Home/Work Designation</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Go to a saved place and set it as Home or Work. Only one of each allowed.
            </p>
            <p className="text-xs text-gray-500">
              <strong>Path:</strong> Settings &gt; Check-In Settings &gt; Home &amp; Work section
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-indigo-100">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🔕</span>
              <h3 className="font-semibold text-gray-900">Silent Check-ins</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Toggle &quot;Home/Work Check-ins&quot; OFF to suppress notifications at home/work.
            </p>
            <p className="text-xs text-gray-500">
              <strong>Default:</strong> OFF (no prompts at home/work)
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-indigo-100">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">📋</span>
              <h3 className="font-semibold text-gray-900">Daily Summary</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Enable Daily Summary and set a time. You&apos;ll get a notification with all places visited.
            </p>
            <p className="text-xs text-gray-500">
              <strong>Default time:</strong> 7:00 PM
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-indigo-100">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">✅</span>
              <h3 className="font-semibold text-gray-900">Batch Confirmation</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Tap the daily summary notification to open the modal. Confirm all, dismiss all, or pick individually.
            </p>
            <p className="text-xs text-gray-500">
              <strong>Path:</strong> Notification tap &gt; DailySummaryModal
            </p>
          </div>
        </div>
      </div>

      {/* Files Created/Modified */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Files Created/Modified</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">NEW Files (3)</h3>
            <ul className="space-y-1 text-xs text-gray-600 font-mono">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                src/components/checkin/DailySummaryModal.tsx
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                src/services/suggestions/DailyCheckInSummaryService.ts
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                src/store/slices/dailySummarySlice.ts
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">MODIFIED Files (16)</h3>
            <ul className="space-y-1 text-xs text-gray-600 font-mono">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                src/database/schema.ts (v19)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                src/database/migrations.ts
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                src/models/SavedPlace.ts
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                src/models/CheckInSuggestion.ts
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                src/services/places/SavedPlaceService.ts
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                src/services/suggestions/CheckInSuggestionService.ts
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                src/screens/settings/CheckInSettingsScreen.tsx
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                src/locales/*/common.json (6 files)
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Related Admin Pages */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Related Admin Pages</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <AdminLink href="/admin/features" label="Features Overview" description="Full feature registry with new Home/Work Places and Daily Summary entries" />
          <AdminLink href="/admin/notifications" label="Notifications" description="Push notification templates including daily summary" />
          <AdminLink href="/admin/release-notes" label="All Releases" description="View all release notes" />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function FeatureRow({
  feature,
  isExpanded,
  statusStyle,
  typeStyle,
  categoryMeta,
  onToggle,
}: {
  feature: ReleaseFeature;
  isExpanded: boolean;
  statusStyle: { badge: string; dot: string; label: string };
  typeStyle: { badge: string; label: string };
  categoryMeta: CategoryMeta;
  onToggle: () => void;
}) {
  return (
    <>
      <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer" onClick={onToggle}>
        <td className="py-3 px-4 text-gray-400 font-mono text-xs">{feature.number}</td>
        <td className="py-3 px-4">
          <div className="flex items-center gap-2">
            <svg
              className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="font-medium text-gray-900">{feature.name}</span>
          </div>
        </td>
        <td className="py-3 px-4">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${typeStyle.badge}`}>
            {typeStyle.label}
          </span>
        </td>
        <td className="py-3 px-4">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle.badge}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
            {statusStyle.label}
          </span>
        </td>
      </tr>

      {isExpanded && (
        <tr className="border-b border-gray-100 bg-gray-50/50">
          <td colSpan={4} className="py-3 px-4">
            <div className="pl-10 space-y-3">
              <p className="text-sm text-gray-600 leading-relaxed">{feature.description}</p>

              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${categoryMeta.badgeStyle}`}>
                  {categoryMeta.label}
                </span>
                {feature.adminConfigHref && (
                  <Link
                    href={feature.adminConfigHref}
                    onClick={(e) => e.stopPropagation()}
                    className="text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
                  >
                    Admin: {feature.adminConfigLabel}
                  </Link>
                )}
              </div>

              {feature.mobileScreens.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Mobile Screens:</p>
                  <div className="flex flex-wrap gap-1">
                    {feature.mobileScreens.map((screen) => (
                      <span key={screen} className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                        {screen}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {feature.mobileServices.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Services/Files:</p>
                  <div className="flex flex-wrap gap-1">
                    {feature.mobileServices.map((service) => (
                      <span key={service} className="inline-block px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-mono">
                        {service}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function AdminLink({ href, label, description }: { href: string; label: string; description: string }) {
  return (
    <Link
      href={href}
      className="block rounded-lg border border-gray-200 p-3 hover:shadow-sm hover:border-indigo-300 transition-all"
    >
      <h3 className="text-sm font-semibold text-gray-900">{label}</h3>
      <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      <div className="mt-2 text-indigo-600 font-medium text-xs">Open &rarr;</div>
    </Link>
  );
}
