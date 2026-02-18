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

type CategoryId = 'engagement' | 'summaries' | 'photos' | 'ai-intelligence';

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
    id: 'engagement',
    label: 'Engagement',
    color: 'bg-orange-50',
    borderColor: 'border-orange-200',
    badgeStyle: 'bg-orange-100 text-orange-800',
    iconBg: 'bg-orange-500',
  },
  {
    id: 'summaries',
    label: 'Summaries',
    color: 'bg-blue-50',
    borderColor: 'border-blue-200',
    badgeStyle: 'bg-blue-100 text-blue-800',
    iconBg: 'bg-blue-500',
  },
  {
    id: 'photos',
    label: 'Photos',
    color: 'bg-pink-50',
    borderColor: 'border-pink-200',
    badgeStyle: 'bg-pink-100 text-pink-800',
    iconBg: 'bg-pink-500',
  },
  {
    id: 'ai-intelligence',
    label: 'AI / Intelligence',
    color: 'bg-purple-50',
    borderColor: 'border-purple-200',
    badgeStyle: 'bg-purple-100 text-purple-800',
    iconBg: 'bg-purple-500',
  },
];

const FEATURES: ReleaseFeature[] = [
  // Engagement (2)
  {
    number: 1,
    name: 'Virtual AI Companion (Mascot)',
    description:
      'A Finch-inspired virtual pet companion that grows with your journaling journey. The mascot reacts to user activities (diary entries, voice notes, photos, health data, location check-ins), has time-aware states (morning/afternoon/evening/night), and celebrates milestones and streaks. Features include XP/leveling system with 50 levels, mood states based on interaction, and full cloud sync.',
    status: 'completed',
    type: 'new',
    adminConfigHref: null,
    adminConfigLabel: null,
    mobileScreens: ['MascotScreen', 'MascotWidget', 'HomeScreen'],
    mobileServices: ['MascotService', 'mascotSlice'],
    categoryId: 'engagement',
    testsRequired: 12,
    testsCompleted: 0,
  },
  {
    number: 5,
    name: 'Morning & Evening Routines',
    description:
      'Structured morning check-in flow (intentions, gratitude) and evening reflection flow (wins, learnings). Includes routine completion tracking and streak bonuses for completing routines consistently.',
    status: 'planned',
    type: 'enhancement',
    adminConfigHref: '/admin/notifications',
    adminConfigLabel: 'Notifications',
    mobileScreens: ['MorningRoutineScreen', 'EveningRoutineScreen'],
    mobileServices: ['RoutineService'],
    categoryId: 'engagement',
    testsRequired: 4,
    testsCompleted: 0,
  },

  // Summaries (1)
  {
    number: 2,
    name: 'Monthly Summary Digests',
    description:
      'Extend existing DailySummaryService to support monthly summaries. Includes aggregation of all monthly data, comparisons to 3/6/12 months ago, highlight selection for monthly period, and shareable monthly summary cards. Cloud Function triggers on 1st of month.',
    status: 'completed',
    type: 'enhancement',
    adminConfigHref: '/admin/insights',
    adminConfigLabel: 'Insights',
    mobileScreens: ['SummariesScreen', 'DailySummaryCard'],
    mobileServices: ['DailySummaryService', 'DailySummary model'],
    categoryId: 'summaries',
    testsRequired: 5,
    testsCompleted: 0,
  },

  // Photos (1)
  {
    number: 3,
    name: 'Photo Timeline View',
    description:
      'Add timeline view mode to existing PhotoGallery. Photos display in chronological horizontal scroll, with date-based grouping and timeline navigation (jump to month/year). Integrates with existing photo services and metadata.',
    status: 'completed',
    type: 'enhancement',
    adminConfigHref: null,
    adminConfigLabel: null,
    mobileScreens: ['PhotoTimelineScreen', 'PhotoGalleryScreen'],
    mobileServices: ['PhotoMemoryGrouper'],
    categoryId: 'photos',
    testsRequired: 5,
    testsCompleted: 0,
  },

  // AI / Intelligence (1)
  {
    number: 4,
    name: 'Question Effectiveness Tracking',
    description:
      'Track which questions lead to longer diary entries to improve question personalization. Stores response length and engagement metrics, implements A/B testing for question variants, and includes time-aware boosting (morning vs evening questions). User feedback loop with "Was this helpful?" option.',
    status: 'completed',
    type: 'enhancement',
    adminConfigHref: '/admin/prompts',
    adminConfigLabel: 'Prompts',
    mobileScreens: ['DiaryScreen'],
    mobileServices: ['EnhancedQuestionService', 'questionEffectiveness collection'],
    categoryId: 'ai-intelligence',
    testsRequired: 5,
    testsCompleted: 0,
  },
];

const TIMELINE: TimelinePhase[] = [
  {
    phase: 1,
    label: 'Virtual Companion Core',
    features: 'Create MascotService, mascotSlice, MascotWidget, MascotScreen',
    weekRange: 'Weeks 1-3',
    status: 'completed',
  },
  {
    phase: 2,
    label: 'Full Companion Integration',
    features: 'Diary, Streaks, XP, Voice, Photos, Health, Location, Chat integrations',
    weekRange: 'Weeks 4-6',
    status: 'completed',
  },
  {
    phase: 3,
    label: 'Digest & Enhancement',
    features: 'Monthly digests, Photo timeline, Question effectiveness',
    weekRange: 'Weeks 7-8',
    status: 'completed',
  },
  {
    phase: 4,
    label: 'Polish & Testing',
    features: 'Integration tests, E2E tests, Localization (9 languages)',
    weekRange: 'Weeks 9-10',
    status: 'in-progress',
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

export default function Mar2026EngagementPage() {
  useTrackPage(TRACKED_SCREENS.adminReleaseNotes);

  const [expandedFeatures, setExpandedFeatures] = useState<Set<number>>(new Set());
  const [collapsedCategories, setCollapsedCategories] = useState<Set<CategoryId>>(new Set());

  // Group features by category
  const featuresByCategory = useMemo(() => {
    const grouped: Record<CategoryId, ReleaseFeature[]> = {
      engagement: [],
      summaries: [],
      photos: [],
      'ai-intelligence': [],
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
        <span className="text-gray-600">v1.4.0 - Virtual Companion & Enhancements (Mar 2026)</span>
      </nav>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-mono font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
              v1.4.0
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
              In Progress
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Virtual Companion & Enhancements</h1>
          <p className="mt-1 text-sm text-gray-500">
            5 features across 4 categories ({stats.newFeatures} new, {stats.enhancements} enhancements) — {stats.completed} completed
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
          <p className="text-sm font-medium text-gray-500">In Progress</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.inProgress}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500">Planned</p>
          <p className="text-2xl font-bold text-gray-600 mt-1">{stats.planned}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500">Tests</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">
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
        const inProgressCount = features.filter((f) => f.status === 'in-progress').length;

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
                <div className="flex gap-1.5">
                  {completedCount > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {completedCount} Done
                    </span>
                  )}
                  {inProgressCount > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      {inProgressCount} WIP
                    </span>
                  )}
                </div>
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
                          <th className="text-left py-2.5 px-4 font-medium text-gray-600 w-20 hidden md:table-cell">
                            Tests
                          </th>
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
          Features will be implemented in 4 phases over 10 weeks (March - May 2026).
        </p>
        <div className="space-y-3">
          {TIMELINE.map((phase) => {
            const phaseStatusStyle = STATUS_STYLES[phase.status];
            return (
              <div
                key={phase.phase}
                className="flex items-start gap-4 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
              >
                {/* Phase number */}
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                    phase.status === 'completed'
                      ? 'bg-green-500'
                      : phase.status === 'in-progress'
                        ? 'bg-yellow-500'
                        : 'bg-gray-400'
                  }`}
                >
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
                    <span className="text-xs text-gray-400">{phase.weekRange}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{phase.features}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Files to Create/Modify */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Files Created/Modified</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">NEW Files</h3>
            <ul className="space-y-1 text-xs text-gray-600 font-mono">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                src/models/Mascot.ts ✓
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                src/services/mascot/MascotService.ts ✓
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                src/store/slices/mascotSlice.ts ✓
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                src/components/mascot/MascotWidget.tsx ✓
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                src/screens/mascot/MascotScreen.tsx ✓
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                src/screens/photos/PhotoTimelineScreen.tsx ✓
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gray-300" />
                scripts/integration-tests/tests/virtual-companion.test.ts
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">MODIFIED Files</h3>
            <ul className="space-y-1 text-xs text-gray-600 font-mono">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                src/services/summaries/DailySummaryService.ts ✓
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                src/services/ai/EnhancedQuestionService.ts ✓
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                src/navigation/RootStackNavigator.tsx ✓
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                src/store/store.ts ✓
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                src/locales/*/common.json (6 files) ✓
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* How to Access Features */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">How to Access Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4 border border-indigo-100">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🐕</span>
              <h3 className="font-semibold text-gray-900">Virtual Companion</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              The mascot widget appears on the Home Feed screen. Tap it to open the full Mascot screen.
            </p>
            <p className="text-xs text-gray-500">
              <strong>Path:</strong> Home Feed → Mascot Widget (tap) → Mascot Screen
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-indigo-100">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">📸</span>
              <h3 className="font-semibold text-gray-900">Photo Timeline</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Navigate to PhotoTimeline screen from navigation. Shows photos grouped by date with month picker.
            </p>
            <p className="text-xs text-gray-500">
              <strong>Path:</strong> Navigation → PhotoTimeline
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-indigo-100">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">📊</span>
              <h3 className="font-semibold text-gray-900">Monthly Digests</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Monthly summaries are generated on the 1st of each month via Cloud Function.
            </p>
            <p className="text-xs text-gray-500">
              <strong>Path:</strong> Summaries → Monthly tab (coming soon)
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-indigo-100">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🧠</span>
              <h3 className="font-semibold text-gray-900">Question Effectiveness</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Tracking is automatic in EnhancedQuestionService. Analytics available in admin dashboard.
            </p>
            <p className="text-xs text-gray-500">
              <strong>Path:</strong> Admin → Insights → Question Analytics
            </p>
          </div>
        </div>
      </div>

      {/* Related Admin Pages */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Related Admin Pages</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <AdminLink href="/admin/features" label="Features Overview" description="Full feature registry, service health, and feature flags" />
          <AdminLink href="/admin/insights" label="Insights" description="Life feed post types and insight config" />
          <AdminLink href="/admin/prompts" label="Prompts" description="AI prompts across 9 languages" />
          <AdminLink href="/admin/notifications" label="Notifications" description="Push notification templates and settings" />
          <AdminLink href="/admin/subscriptions" label="Subscriptions" description="Subscription tiers, quotas, and pricing" />
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
        {/* Number */}
        <td className="py-3 px-4 text-gray-400 font-mono text-xs">{feature.number}</td>

        {/* Feature Name */}
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

        {/* Type */}
        <td className="py-3 px-4">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${typeStyle.badge}`}>
            {typeStyle.label}
          </span>
        </td>

        {/* Status */}
        <td className="py-3 px-4">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle.badge}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
            {statusStyle.label}
          </span>
        </td>

        {/* Tests */}
        <td className="py-3 px-4 hidden md:table-cell">
          <span className="text-xs text-gray-500">
            {feature.testsCompleted}/{feature.testsRequired}
          </span>
        </td>
      </tr>

      {/* Expanded Description Row */}
      {isExpanded && (
        <tr className="border-b border-gray-100 bg-gray-50/50">
          <td colSpan={5} className="py-3 px-4">
            <div className="pl-10 space-y-3">
              <p className="text-sm text-gray-600 leading-relaxed">{feature.description}</p>

              {/* Category and Admin link */}
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

              {/* Mobile Screens */}
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

              {/* Mobile Services */}
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
