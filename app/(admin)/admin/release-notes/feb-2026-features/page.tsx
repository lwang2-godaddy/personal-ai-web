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
  | 'completion'
  | 'ai-intelligence'
  | 'engagement'
  | 'revenue'
  | 'social'
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

interface TimelineBatch {
  batch: number;
  label: string;
  features: string;
  dateRange: string;
}

// ============================================================
// Data
// ============================================================

const CATEGORIES: CategoryMeta[] = [
  {
    id: 'completion',
    label: 'Completion',
    color: 'bg-cyan-50',
    borderColor: 'border-cyan-200',
    badgeStyle: 'bg-cyan-100 text-cyan-800',
    iconBg: 'bg-cyan-500',
  },
  {
    id: 'ai-intelligence',
    label: 'AI / Intelligence',
    color: 'bg-purple-50',
    borderColor: 'border-purple-200',
    badgeStyle: 'bg-purple-100 text-purple-800',
    iconBg: 'bg-purple-500',
  },
  {
    id: 'engagement',
    label: 'Engagement',
    color: 'bg-orange-50',
    borderColor: 'border-orange-200',
    badgeStyle: 'bg-orange-100 text-orange-800',
    iconBg: 'bg-orange-500',
  },
  {
    id: 'revenue',
    label: 'Revenue',
    color: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    badgeStyle: 'bg-emerald-100 text-emerald-800',
    iconBg: 'bg-emerald-500',
  },
  {
    id: 'social',
    label: 'Social',
    color: 'bg-pink-50',
    borderColor: 'border-pink-200',
    badgeStyle: 'bg-pink-100 text-pink-800',
    iconBg: 'bg-pink-500',
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
  // Completion (4)
  {
    number: 1,
    name: 'Complete Challenges + Leaderboards',
    description:
      'Finalized challenge system with leaderboard rankings, progress tracking, and group competition. Users can compete in challenges created within circles and track their standing in real-time.',
    status: 'active',
    adminConfigHref: '/admin/challenges',
    adminConfigLabel: 'Challenges',
    mobileScreens: ['ChallengeDetailScreen'],
    categoryId: 'completion',
  },
  {
    number: 2,
    name: 'External Sharing (Image Cards)',
    description:
      'Share life feed posts externally as beautiful image cards. Generates a styled image from post content that can be shared to social media, messaging apps, or saved locally.',
    status: 'active',
    adminConfigHref: '/admin/app-settings',
    adminConfigLabel: 'App Settings',
    mobileScreens: ['LifeFeedScreen', 'ShareModal'],
    categoryId: 'completion',
  },
  {
    number: 3,
    name: 'Data Export Polish + New Types',
    description:
      'Enhanced data export with additional data types (photos, voice notes, location history). Includes privacy-first management tools and downloadable archives.',
    status: 'active',
    adminConfigHref: '/admin/users',
    adminConfigLabel: 'Users',
    mobileScreens: ['PrivacyDataManagementScreen'],
    categoryId: 'completion',
  },

  // AI / Intelligence (4)
  {
    number: 5,
    name: 'Conversation Threads',
    description:
      'Threaded conversations in chat for topic organization. Users can create, switch between, and manage multiple conversation threads with full history.',
    status: 'active',
    adminConfigHref: '/admin/user-content',
    adminConfigLabel: 'User Content',
    mobileScreens: ['ConversationsListScreen', 'ChatScreen'],
    categoryId: 'ai-intelligence',
  },
  {
    number: 6,
    name: '"Ask About This" Contextual RAG',
    description:
      'Context-aware AI queries from any data detail screen. Users can tap "Ask About This" on diary entries, photos, voice notes, locations, or health data to get AI insights specific to that item.',
    status: 'active',
    adminConfigHref: '/admin/insights',
    adminConfigLabel: 'Insights',
    mobileScreens: [
      'DiaryDetail',
      'PhotoDetail',
      'VoiceNoteDetail',
      'LocationDetail',
      'HealthDashboard',
    ],
    categoryId: 'ai-intelligence',
  },
  {
    number: 7,
    name: 'Year in Review',
    description:
      'AI-generated annual summary with key stats, highlights, and insights from the user\'s personal data throughout the year. Includes shareable cards and data visualizations.',
    status: 'beta',
    adminConfigHref: '/admin/insights',
    adminConfigLabel: 'Insights',
    mobileScreens: ['YearInReviewScreen'],
    categoryId: 'ai-intelligence',
  },
  {
    number: 8,
    name: 'Smart Follow-Up Questions',
    description:
      'AI-suggested follow-up questions after chat responses. The system analyzes the conversation context and generates relevant questions the user might want to ask next.',
    status: 'active',
    adminConfigHref: '/admin/prompts',
    adminConfigLabel: 'Prompts',
    mobileScreens: ['ChatScreen'],
    categoryId: 'ai-intelligence',
  },

  // Engagement (3)
  {
    number: 9,
    name: 'Morning Briefing Push',
    description:
      'Daily AI-generated morning briefing delivered as a push notification. Includes weather, upcoming events, health insights, and personalized recommendations for the day.',
    status: 'active',
    adminConfigHref: '/admin/notifications',
    adminConfigLabel: 'Notifications',
    mobileScreens: ['MorningBriefingScreen'],
    categoryId: 'engagement',
  },
  {
    number: 10,
    name: 'Quick Capture Enhancement',
    description:
      'Enhanced quick capture with one-tap actions for voice, photo, and text. Streamlined UI with action menu for faster data entry and improved user flow.',
    status: 'active',
    adminConfigHref: '/admin/app-settings',
    adminConfigLabel: 'App Settings',
    mobileScreens: ['CreateActionMenu'],
    categoryId: 'engagement',
  },
  {
    number: 11,
    name: 'Mood-Activity Correlation Alerts',
    description:
      'AI detects correlations between mood patterns and activities, then alerts users with actionable insights. For example: "You tend to feel better on days you exercise."',
    status: 'active',
    adminConfigHref: '/admin/insights',
    adminConfigLabel: 'Insights',
    mobileScreens: ['CorrelationAlertCard'],
    categoryId: 'engagement',
  },

  // Revenue (2)
  {
    number: 12,
    name: 'Premium AI Personality Pack',
    description:
      'Multiple AI personality options for premium subscribers. Choose from different conversation styles and tones for a personalized AI assistant experience.',
    status: 'active',
    adminConfigHref: '/admin/subscriptions',
    adminConfigLabel: 'Subscriptions',
    mobileScreens: ['PersonalitySelector'],
    categoryId: 'revenue',
  },
  {
    number: 13,
    name: 'Weekly AI Report (Tiered)',
    description:
      'Weekly summary report with tiered depth based on subscription level. Free users get highlights, premium users get detailed analysis with trends and recommendations.',
    status: 'active',
    adminConfigHref: '/admin/insights',
    adminConfigLabel: 'Insights',
    mobileScreens: ['WeeklyReportScreen'],
    categoryId: 'revenue',
  },

  // Social (2)
  {
    number: 14,
    name: 'Circle Activity Digest',
    description:
      'Periodic digest notifications summarizing activity within circles. Includes new posts, reactions, challenge updates, and member activity highlights.',
    status: 'active',
    adminConfigHref: '/admin/notifications',
    adminConfigLabel: 'Notifications',
    mobileScreens: ['CircleDigestCard'],
    categoryId: 'social',
  },
  {
    number: 15,
    name: 'Shared Life Feed Reactions',
    description:
      'React to shared life feed posts with emoji reactions. Supports multiple reaction types and shows reaction counts on posts shared within circles.',
    status: 'active',
    adminConfigHref: '/admin/app-settings',
    adminConfigLabel: 'App Settings',
    mobileScreens: ['LifeFeedPostCard'],
    categoryId: 'social',
  },

  // UX Polish (3)
  {
    number: 16,
    name: 'Guided Permission Flow',
    description:
      'Step-by-step guided flow for requesting app permissions (location, health, notifications, microphone). Explains why each permission is needed before requesting.',
    status: 'active',
    adminConfigHref: '/admin/app-settings',
    adminConfigLabel: 'App Settings',
    mobileScreens: ['PermissionFlowScreen'],
    categoryId: 'ux-polish',
  },
  {
    number: 17,
    name: 'Skeleton Loading States',
    description:
      'Smooth skeleton placeholder animations during data loading across all major screens. Improves perceived performance and provides visual feedback during async operations.',
    status: 'active',
    adminConfigHref: null,
    adminConfigLabel: null,
    mobileScreens: ['HomeFeedScreen', 'LifeFeedScreen', 'ChatScreen'],
    categoryId: 'ux-polish',
  },
  {
    number: 18,
    name: 'Haptic Feedback System',
    description:
      'Tactile haptic feedback on key interactions throughout the app. Supports selection, success, error, and impact feedback patterns for a more responsive feel.',
    status: 'active',
    adminConfigHref: null,
    adminConfigLabel: null,
    mobileScreens: ['All screens'],
    categoryId: 'ux-polish',
  },

  // Admin (2)
  {
    number: 19,
    name: 'App Features Overview',
    description:
      'Comprehensive admin page showing all mobile app features, service health, configuration links, and feature flags. Single source of truth for feature status.',
    status: 'active',
    adminConfigHref: '/admin/features',
    adminConfigLabel: 'Features',
    mobileScreens: ['(web only)'],
    categoryId: 'admin',
  },
  {
    number: 20,
    name: 'Data Quality Alerts',
    description:
      'Automated alerts when data quality issues are detected, such as embedding failures, sync errors, or stale data. Displayed as banners on affected screens.',
    status: 'active',
    adminConfigHref: '/admin/notifications',
    adminConfigLabel: 'Notifications',
    mobileScreens: ['DataQualityBanner'],
    categoryId: 'admin',
  },
];

const TIMELINE: TimelineBatch[] = [
  {
    batch: 1,
    label: 'Completion & Polish',
    features: '#1-4 (Challenges, Sharing, Predictions, Export)',
    dateRange: 'Feb 1-2',
  },
  {
    batch: 2,
    label: 'AI / Intelligence',
    features: '#5-8 (Threads, Ask About, Year in Review, Follow-ups)',
    dateRange: 'Feb 3-5',
  },
  {
    batch: 3,
    label: 'Engagement',
    features: '#9-11 (Morning Briefing, Quick Capture, Correlations)',
    dateRange: 'Feb 6-7',
  },
  {
    batch: 4,
    label: 'Revenue',
    features: '#12-13 (Personalities, Weekly Report)',
    dateRange: 'Feb 8-9',
  },
  {
    batch: 5,
    label: 'Social',
    features: '#14-15 (Circle Digest, Reactions)',
    dateRange: 'Feb 10-11',
  },
  {
    batch: 6,
    label: 'UX Polish',
    features: '#16-18 (Permissions, Skeletons, Haptics)',
    dateRange: 'Feb 12-13',
  },
  {
    batch: 7,
    label: 'Admin & Wrap-up',
    features: '#19-20 (Features Page, Data Quality)',
    dateRange: 'Feb 14-15',
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

export default function Feb2026FeaturesPage() {
  useTrackPage(TRACKED_SCREENS.adminReleaseNotes);

  const [expandedFeatures, setExpandedFeatures] = useState<Set<number>>(new Set());
  const [collapsedCategories, setCollapsedCategories] = useState<Set<CategoryId>>(new Set());

  // Group features by category
  const featuresByCategory = useMemo(() => {
    const grouped: Record<CategoryId, ReleaseFeature[]> = {
      'completion': [],
      'ai-intelligence': [],
      'engagement': [],
      'revenue': [],
      'social': [],
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
        <span className="text-gray-600">v1.2.0 - Feature Batch (Feb 2026)</span>
      </nav>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-mono font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
              v1.2.0
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Released
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Feature Batch (Feb 2026)
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            20 new features across 7 categories
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
          <p className="text-sm font-medium text-gray-500">Active</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats.active}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500">Beta</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.beta}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500">Categories</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{CATEGORIES.length}</p>
        </div>
      </div>

      {/* Feature Categories */}
      {CATEGORIES.map((category) => {
        const features = featuresByCategory[category.id];
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

      {/* Implementation Timeline */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Implementation Timeline
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Features were implemented in 7 batches over 2 weeks (Feb 1-15, 2026).
        </p>
        <div className="space-y-3">
          {TIMELINE.map((batch) => {
            const category = CATEGORIES[batch.batch - 1];
            return (
              <div
                key={batch.batch}
                className="flex items-start gap-4 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
              >
                {/* Batch number */}
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                    category ? category.iconBg : 'bg-gray-500'
                  }`}
                >
                  {batch.batch}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">
                      Batch {batch.batch}: {batch.label}
                    </p>
                    <span className="text-xs text-gray-400">{batch.dateRange}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{batch.features}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Related Admin Pages */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Related Admin Pages
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <AdminLink href="/admin/features" label="Features Overview" description="Full feature registry, service health, and feature flags" />
          <AdminLink href="/admin/challenges" label="Challenges" description="Manage group challenges and leaderboards" />
          <AdminLink href="/admin/subscriptions" label="Subscriptions" description="Subscription tiers, quotas, and pricing" />
          <AdminLink href="/admin/prompts" label="Prompts" description="AI prompts across 9 languages" />
          <AdminLink href="/admin/insights" label="Insights" description="Life feed post types and insight config" />
          <AdminLink href="/admin/notifications" label="Notifications" description="Push notification templates and settings" />
          <AdminLink href="/admin/app-settings" label="App Settings" description="Support email, docs URLs, app metadata" />
          <AdminLink href="/admin/user-content" label="User Content" description="Browse user-generated content" />
          <AdminLink href="/admin/users" label="Users" description="User management and data export" />
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
