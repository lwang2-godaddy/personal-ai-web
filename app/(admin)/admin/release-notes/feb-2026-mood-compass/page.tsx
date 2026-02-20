'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useTrackPage } from '@/lib/hooks/useTrackPage';
import { TRACKED_SCREENS } from '@/lib/models/BehaviorEvent';

// ============================================================
// Types
// ============================================================

type FeatureStatus = 'active' | 'beta' | 'stub';

type CategoryId =
  | 'transparency'
  | 'gamification'
  | 'ux-polish'
  | 'admin';

interface ReleaseFeature {
  number: number;
  name: string;
  description: string;
  status: FeatureStatus;
  adminConfigHref: string | null;
  adminConfigLabel: string | null;
  mobileScreens: string[];
  categoryId: CategoryId;
}

interface CategoryMeta {
  id: CategoryId;
  label: string;
  color: string;
  borderColor: string;
  badgeStyle: string;
  iconBg: string;
}

// ============================================================
// Data
// ============================================================

const CATEGORIES: CategoryMeta[] = [
  {
    id: 'transparency',
    label: 'Transparency',
    color: 'bg-purple-50',
    borderColor: 'border-purple-200',
    badgeStyle: 'bg-purple-100 text-purple-800',
    iconBg: 'bg-purple-500',
  },
  {
    id: 'gamification',
    label: 'Gamification',
    color: 'bg-orange-50',
    borderColor: 'border-orange-200',
    badgeStyle: 'bg-orange-100 text-orange-800',
    iconBg: 'bg-orange-500',
  },
  {
    id: 'ux-polish',
    label: 'UX Polish',
    color: 'bg-teal-50',
    borderColor: 'border-teal-200',
    badgeStyle: 'bg-teal-100 text-teal-800',
    iconBg: 'bg-teal-500',
  },
  {
    id: 'admin',
    label: 'Admin',
    color: 'bg-slate-50',
    borderColor: 'border-slate-200',
    badgeStyle: 'bg-slate-100 text-slate-800',
    iconBg: 'bg-slate-500',
  },
];

const FEATURES: ReleaseFeature[] = [
  // Transparency (2)
  {
    number: 1,
    name: 'Mood Detail Bottom Sheet',
    description:
      'New expandable bottom sheet showing full details when tapping any mood entry. Displays the original source content (what the user said/wrote), keyword highlighting from extracted themes, and confidence meter. Supports audio playback for voice notes.',
    status: 'active',
    adminConfigHref: '/admin/ai-content/insights',
    adminConfigLabel: 'Insights',
    mobileScreens: ['MoodScreen', 'MoodDetailSheet'],
    categoryId: 'transparency',
  },
  {
    number: 2,
    name: 'AI Reasoning Display',
    description:
      'Shows exactly why a specific emotion was detected. The sentiment analysis service now returns structured reasoning points that explain what language patterns, keywords, and context clues led to the mood classification. Stored in new `reasoningPoints` field.',
    status: 'active',
    adminConfigHref: '/admin/prompts',
    adminConfigLabel: 'Prompts',
    mobileScreens: ['MoodDetailSheet'],
    categoryId: 'transparency',
  },

  // Gamification (3)
  {
    number: 3,
    name: 'Mood Streaks',
    description:
      'Track consecutive positive mood days with animated streak badges. Shows current streak count, longest streak record, and milestone celebrations at 7, 14, and 30 days. Includes fire animation and encouraging messages.',
    status: 'active',
    adminConfigHref: '/admin/ai-content/insights',
    adminConfigLabel: 'Insights',
    mobileScreens: ['MoodScreen', 'MoodStreakBadge'],
    categoryId: 'gamification',
  },
  {
    number: 4,
    name: 'Daily Mood Insights',
    description:
      'Fortune cookie-style daily insights based on mood patterns. Shows fun facts like "You\'re 40% happier on Fridays" or "Your mood improves 25% after visiting the gym". Includes shimmer animation and correlations discovery.',
    status: 'active',
    adminConfigHref: '/admin/ai-content/insights',
    adminConfigLabel: 'Insights',
    mobileScreens: ['MoodScreen', 'MoodInsightCard'],
    categoryId: 'gamification',
  },
  {
    number: 5,
    name: 'Achievement Badges',
    description:
      'Unlock achievement badges for mood tracking milestones. Includes "First Check-In", "Week of Calm", "Mood Explorer" (10 different activities), "Self-Aware" (100 entries), and more. Progress indicators show completion status.',
    status: 'active',
    adminConfigHref: null,
    adminConfigLabel: null,
    mobileScreens: ['MoodScreen', 'MoodAchievements'],
    categoryId: 'gamification',
  },

  // UX Polish (1)
  {
    number: 6,
    name: 'Enhanced Journal Entry Card',
    description:
      'Improved mood journal entry cards with source content preview (first 60 characters), "Tap to see why" hint, and better secondary emotions visualization with colored pills instead of just icons.',
    status: 'active',
    adminConfigHref: null,
    adminConfigLabel: null,
    mobileScreens: ['MoodScreen', 'MoodJournalEntry'],
    categoryId: 'ux-polish',
  },
];

// ============================================================
// Styling Helpers
// ============================================================

const STATUS_STYLES: Record<FeatureStatus, { badge: string; dot: string; label: string }> = {
  active: {
    badge: 'bg-green-100 text-green-800',
    dot: 'bg-green-500',
    label: 'Active',
  },
  beta: {
    badge: 'bg-yellow-100 text-yellow-800',
    dot: 'bg-yellow-500',
    label: 'Beta',
  },
  stub: {
    badge: 'bg-gray-100 text-gray-600',
    dot: 'bg-gray-400',
    label: 'Stub',
  },
};

function getCategoryMeta(categoryId: CategoryId): CategoryMeta {
  return CATEGORIES.find((c) => c.id === categoryId) || CATEGORIES[0];
}

// ============================================================
// Component
// ============================================================

export default function MoodCompassEnhancementPage() {
  useTrackPage(TRACKED_SCREENS.adminReleaseNotes);

  const [expandedFeatures, setExpandedFeatures] = useState<Set<number>>(new Set());
  const [collapsedCategories, setCollapsedCategories] = useState<Set<CategoryId>>(new Set());

  // Group features by category
  const featuresByCategory = useMemo(() => {
    const grouped: Record<CategoryId, ReleaseFeature[]> = {
      'transparency': [],
      'gamification': [],
      'ux-polish': [],
      'admin': [],
    };
    FEATURES.forEach((f) => {
      grouped[f.categoryId].push(f);
    });
    return grouped;
  }, []);

  // Summary stats
  const stats = useMemo(() => {
    const active = FEATURES.filter((f) => f.status === 'active').length;
    const beta = FEATURES.filter((f) => f.status === 'beta').length;
    const stub = FEATURES.filter((f) => f.status === 'stub').length;
    return { total: FEATURES.length, active, beta, stub };
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
        <span className="text-gray-600">v1.3.2 - Mood Compass Enhancement</span>
      </nav>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-mono font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
              v1.3.2
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Released
            </span>
            <span className="text-xs text-gray-400">Feb 19, 2026</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Mood Compass Enhancement
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            6 features across 4 categories - Making mood analysis transparent, interactive, and fun
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

      {/* User Feedback Context */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-5">
        <h2 className="text-lg font-semibold text-purple-900 mb-3 flex items-center gap-2">
          <span>💬</span> User Feedback Addressed
        </h2>
        <div className="space-y-3 text-sm text-purple-800">
          <div className="flex items-start gap-2">
            <span className="text-purple-500 mt-0.5">1.</span>
            <p><strong>"I can't see what I actually said/wrote"</strong> - Now shows full source content in detail sheet with keyword highlighting</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-purple-500 mt-0.5">2.</span>
            <p><strong>"I don't understand why this mood was decided"</strong> - AI reasoning breakdown shows exactly what triggered each emotion</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-purple-500 mt-0.5">3.</span>
            <p><strong>"It's not engaging enough"</strong> - Added streaks, achievements, and daily insights for gamification</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500">Total Features</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500">Active</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats.active}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500">Categories</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{CATEGORIES.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500">Locales</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">6</p>
        </div>
      </div>

      {/* Feature Categories */}
      {CATEGORIES.map((category) => {
        const features = featuresByCategory[category.id];
        if (features.length === 0) return null;

        const isCollapsed = collapsedCategories.has(category.id);
        const activeCount = features.filter((f) => f.status === 'active').length;
        const betaCount = features.filter((f) => f.status === 'beta').length;

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
                <h2 className="text-lg font-semibold text-gray-900">
                  {category.label}
                </h2>
                <span className="text-sm text-gray-500">
                  ({features.length} feature{features.length !== 1 ? 's' : ''})
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  {activeCount > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {activeCount} Active
                    </span>
                  )}
                  {betaCount > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      {betaCount} Beta
                    </span>
                  )}
                </div>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${
                    isCollapsed ? '' : 'rotate-180'
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
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
                          <th className="text-left py-2.5 px-4 font-medium text-gray-600 w-8">
                            #
                          </th>
                          <th className="text-left py-2.5 px-4 font-medium text-gray-600">
                            Feature
                          </th>
                          <th className="text-left py-2.5 px-4 font-medium text-gray-600 w-20">
                            Status
                          </th>
                          <th className="text-left py-2.5 px-4 font-medium text-gray-600 hidden md:table-cell">
                            Admin Config
                          </th>
                          <th className="text-left py-2.5 px-4 font-medium text-gray-600 hidden lg:table-cell">
                            Mobile Screens
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {features.map((feature) => {
                          const isExpanded = expandedFeatures.has(feature.number);
                          const statusStyle = STATUS_STYLES[feature.status];

                          return (
                            <FeatureRow
                              key={feature.number}
                              feature={feature}
                              isExpanded={isExpanded}
                              statusStyle={statusStyle}
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

      {/* Technical Implementation Notes */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span>🔧</span> Technical Implementation
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Mobile App Files</h3>
            <ul className="text-xs text-gray-600 space-y-1 font-mono">
              <li>• src/components/mood/MoodDetailSheet.tsx (NEW)</li>
              <li>• src/components/mood/MoodStreakBadge.tsx (NEW)</li>
              <li>• src/components/mood/MoodInsightCard.tsx (NEW)</li>
              <li>• src/components/mood/MoodAchievements.tsx (NEW)</li>
              <li>• src/components/mood/MoodJournalEntry.tsx (MODIFIED)</li>
              <li>• src/screens/mood/MoodScreen.tsx (MODIFIED)</li>
              <li>• src/services/mood/MoodService.ts (MODIFIED)</li>
              <li>• src/models/MoodEntry.ts (MODIFIED)</li>
            </ul>
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Backend Changes</h3>
            <ul className="text-xs text-gray-600 space-y-1 font-mono">
              <li>• SentimentAnalysisService.ts - reasoningPoints field</li>
              <li>• analysis.yaml - Updated prompt schema</li>
              <li>• types.ts - MoodEntry interface update</li>
            </ul>
            <h3 className="text-sm font-semibold text-gray-700 mt-4">Translations Added</h3>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• English (en) - 18 new keys</li>
              <li>• Spanish (es) - 18 new keys</li>
              <li>• French (fr) - 18 new keys</li>
              <li>• German (de) - 18 new keys</li>
              <li>• Japanese (ja) - 18 new keys</li>
              <li>• Chinese (zh) - 18 new keys</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Privacy Considerations */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
        <h2 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <span>🔒</span> Privacy Considerations
        </h2>
        <ul className="text-sm text-blue-800 space-y-2">
          <li>• Source content protected by existing Firestore security rules (userId filter)</li>
          <li>• No additional data exposed - only surfacing data already stored for user</li>
          <li>• AI reasoning derived entirely from user's own content</li>
          <li>• Audio playback uses user's own voice notes via secure Firebase Storage URLs</li>
        </ul>
      </div>

      {/* Related Admin Pages */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Related Admin Pages
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <AdminLink href="/admin/ai-content/insights" label="Insights Config" description="Mood Compass settings and analytics" />
          <AdminLink href="/admin/prompts" label="Prompts" description="AI prompts including analysis.yaml" />
          <AdminLink href="/admin/users" label="Users" description="View user mood data" />
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
  categoryMeta,
  onToggle,
}: {
  feature: ReleaseFeature;
  isExpanded: boolean;
  statusStyle: { badge: string; dot: string; label: string };
  categoryMeta: CategoryMeta;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
        onClick={onToggle}
      >
        {/* Number */}
        <td className="py-3 px-4 text-gray-400 font-mono text-xs">
          {feature.number}
        </td>

        {/* Feature Name */}
        <td className="py-3 px-4">
          <div className="flex items-center gap-2">
            <svg
              className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${
                isExpanded ? 'rotate-90' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
            <span className="font-medium text-gray-900">{feature.name}</span>
          </div>
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

        {/* Admin Config Link */}
        <td className="py-3 px-4 hidden md:table-cell">
          {feature.adminConfigHref ? (
            <Link
              href={feature.adminConfigHref}
              onClick={(e) => e.stopPropagation()}
              className="text-indigo-600 hover:text-indigo-800 text-xs font-medium hover:underline"
            >
              {feature.adminConfigLabel}
            </Link>
          ) : (
            <span className="text-gray-400 text-xs">&mdash;</span>
          )}
        </td>

        {/* Mobile Screens */}
        <td className="py-3 px-4 hidden lg:table-cell">
          <div className="flex flex-wrap gap-1">
            {feature.mobileScreens.slice(0, 3).map((screen) => (
              <span
                key={screen}
                className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-xs"
              >
                {screen}
              </span>
            ))}
            {feature.mobileScreens.length > 3 && (
              <span className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">
                +{feature.mobileScreens.length - 3}
              </span>
            )}
          </div>
        </td>
      </tr>

      {/* Expanded Description Row */}
      {isExpanded && (
        <tr className="border-b border-gray-100 bg-gray-50/50">
          <td colSpan={5} className="py-3 px-4">
            <div className="pl-10 space-y-2">
              <p className="text-sm text-gray-600 leading-relaxed">
                {feature.description}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs">
                {/* Category badge (visible in expanded view) */}
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${categoryMeta.badgeStyle}`}>
                  {categoryMeta.label}
                </span>

                {/* Admin config (visible on mobile in expanded view) */}
                {feature.adminConfigHref && (
                  <span className="md:hidden">
                    <Link
                      href={feature.adminConfigHref}
                      className="text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
                    >
                      Admin: {feature.adminConfigLabel}
                    </Link>
                  </span>
                )}

                {/* All mobile screens */}
                <div className="flex flex-wrap gap-1">
                  {feature.mobileScreens.map((screen) => (
                    <span
                      key={screen}
                      className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded"
                    >
                      {screen}
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

function AdminLink({
  href,
  label,
  description,
}: {
  href: string;
  label: string;
  description: string;
}) {
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
