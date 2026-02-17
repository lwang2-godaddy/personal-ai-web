'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useTrackPage } from '@/lib/hooks/useTrackPage';
import { TRACKED_SCREENS } from '@/lib/models/BehaviorEvent';

// ============================================================
// Types
// ============================================================

type ChangeType = 'theme' | 'component' | 'animation' | 'new-file';

interface UIChange {
  id: number;
  name: string;
  description: string;
  type: ChangeType;
  files: string[];
  before?: string;
  after?: string;
  details: string[];
}

interface CategoryMeta {
  id: ChangeType;
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
    id: 'theme',
    label: 'Theme & Colors',
    color: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    badgeStyle: 'bg-indigo-100 text-indigo-800',
    iconBg: 'bg-indigo-500',
  },
  {
    id: 'component',
    label: 'Components',
    color: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    badgeStyle: 'bg-emerald-100 text-emerald-800',
    iconBg: 'bg-emerald-500',
  },
  {
    id: 'animation',
    label: 'Animations',
    color: 'bg-amber-50',
    borderColor: 'border-amber-200',
    badgeStyle: 'bg-amber-100 text-amber-800',
    iconBg: 'bg-amber-500',
  },
  {
    id: 'new-file',
    label: 'New Files',
    color: 'bg-purple-50',
    borderColor: 'border-purple-200',
    badgeStyle: 'bg-purple-100 text-purple-800',
    iconBg: 'bg-purple-500',
  },
];

const CHANGES: UIChange[] = [
  // Theme & Colors
  {
    id: 1,
    name: 'Light Mode Color Palette',
    description: 'Transformed from warm cream to cool neutral palette for a calmer, more sophisticated feel.',
    type: 'theme',
    files: ['src/styles/theme.ts'],
    before: 'background: #FFFEF5 (warm ivory), card: #FFFBF0',
    after: 'background: #FAFAFA (cool neutral), card: #FFFFFF',
    details: [
      'Background: #FFFEF5 \u2192 #FAFAFA (warm ivory to cool neutral)',
      'Background Secondary: #FAF7F2 \u2192 #F5F5F5',
      'Card: #FFFBF0 \u2192 #FFFFFF (pure white)',
      'Border: #CBD5E1 \u2192 #E5E5E5 (softer)',
      'Text: #1E293B \u2192 #1A1A1A (deeper black)',
    ],
  },
  {
    id: 2,
    name: 'Dark Mode Color Palette',
    description: 'Updated to true OLED-friendly dark with warmer accent tones.',
    type: 'theme',
    files: ['src/styles/theme.ts'],
    before: 'background: #0F172A (navy slate)',
    after: 'background: #0F0F10 (true dark, OLED-friendly)',
    details: [
      'Background: #0F172A \u2192 #0F0F10 (true OLED black)',
      'Background Secondary: #1E293B \u2192 #1A1A1B',
      'Card: #1E293B \u2192 #1E1E1F (slightly warmer)',
      'Border: #475569 \u2192 #2D2D2E (subtler)',
    ],
  },
  {
    id: 3,
    name: 'Shadow Softening',
    description: 'Reduced shadow opacity by ~50% and increased blur for softer, more elegant shadows.',
    type: 'theme',
    files: ['src/styles/theme.ts'],
    details: [
      'Shadow opacity reduced: 0.12 \u2192 0.06 (light mode)',
      'Shadow blur increased: +20% shadowRadius',
      'Colored shadows removed from default cards',
      'New shadow scale: none, xs, sm, md, lg',
    ],
  },
  {
    id: 4,
    name: 'Typography Enhancement',
    description: 'Added letter-spacing for improved readability and modern feel.',
    type: 'theme',
    files: ['src/styles/theme.ts'],
    details: [
      'Title: letterSpacing: -0.5 (tighter headings, Linear-style)',
      'Heading: letterSpacing: -0.3',
      'Body: lineHeight: 26 (better readability)',
      'Caption: letterSpacing: 0.2 (more legible small text)',
    ],
  },
  {
    id: 5,
    name: 'New Design Tokens',
    description: 'Added new tokens for borderWidth and opacity for consistent styling.',
    type: 'theme',
    files: ['src/styles/theme.ts'],
    details: [
      'borderWidth: { hairline: 0.5, thin: 1, regular: 2 }',
      'opacity: { overlay: 0.5, disabled: 0.4, hover: 0.08, pressed: 0.12, subtle: 0.6 }',
    ],
  },

  // Components
  {
    id: 6,
    name: 'Card Component Variants',
    description: 'Added new minimal and subtle variants for different use cases.',
    type: 'component',
    files: ['src/components/common/Card.tsx'],
    details: [
      'New variant: "minimal" - border only, no shadow (for feed items)',
      'New variant: "subtle" - very light shadow',
      'New prop: accentBorder for left border category indication',
      'Border radius: xl \u2192 lg (16px \u2192 12px for mature look)',
      'Updated shadow logic to use dynamic theme shadows',
    ],
  },
  {
    id: 7,
    name: 'Message Bubble Refinement',
    description: 'More mature styling with reduced border radius and subtle borders.',
    type: 'component',
    files: ['src/components/chat/MessageBubble.tsx'],
    details: [
      'Border radius: 20px \u2192 16px (more mature)',
      'AI bubbles: Added 1px border with theme.colors.border',
      'User bubbles: Softer shadow',
    ],
  },
  {
    id: 8,
    name: 'FeedCardContainer Updates',
    description: 'Fixed static theme import and added visible borders for better definition.',
    type: 'component',
    files: ['src/components/feed/FeedCardContainer.tsx'],
    details: [
      'Changed from staticTheme.shadows.md to theme.shadows.sm (dynamic)',
      'Added borderWidth: 1 with theme.colors.border',
      'Border radius: 16px \u2192 12px',
      'Now uses useTheme() hook for dynamic theming',
    ],
  },
  {
    id: 9,
    name: 'HomeFeedScreen Header',
    description: 'Simplified header with smaller app icon.',
    type: 'component',
    files: ['src/screens/home/HomeFeedScreen.tsx'],
    details: [
      'App icon size: 36px \u2192 28px',
      'Updated to use EmptyStateFeed component for empty state',
    ],
  },
  {
    id: 10,
    name: 'Skeleton Loader Enhancement',
    description: 'Improved shimmer animation with staggered delays.',
    type: 'component',
    files: ['src/components/skeleton/SkeletonBase.tsx'],
    details: [
      'Now imports shimmer config from animations.ts',
      'Added delay prop for staggered animation effect',
      'Uses Easing.inOut(Easing.ease) for smoother shimmer',
    ],
  },

  // Animations
  {
    id: 11,
    name: 'Animation Tokens System',
    description: 'New centralized animation configuration with spring and timing presets.',
    type: 'animation',
    files: ['src/styles/animations.ts'],
    details: [
      'Spring configs: gentle, snappy, bouncy, stiff',
      'Timing durations: instant (100ms), fast (150ms), normal (250ms), slow (400ms)',
      'Easings: linear, ease, easeIn, easeOut, easeInOut, spring',
      'Presets: fadeIn, slideUp, scaleIn, bounceIn',
      'Shimmer config: duration 1500ms, opacityRange [0.3, 0.7]',
      'Haptic feedback patterns: light, medium, heavy, success, warning, error',
    ],
  },

  // New Files
  {
    id: 12,
    name: 'EmptyStateFeed Component',
    description: 'New delightful empty state component with Ionicons and suggested actions.',
    type: 'new-file',
    files: [
      'src/components/empty/EmptyStateFeed.tsx',
      'src/components/empty/index.ts',
    ],
    details: [
      'Uses Ionicons for professional iconography (no emojis)',
      'Three variants: feed, search, chat',
      'Icon container with soft background circle',
      'Title, subtitle, and action buttons',
      'SuggestionButton sub-component for quick actions',
      'Suggested actions: Diary, Voice, Photo',
    ],
  },

  // Emoji → Ionicon Migration
  {
    id: 13,
    name: 'Emoji to Ionicon Migration - Models',
    description: 'Replaced all emoji strings with Ionicon names across data models for consistent visual language.',
    type: 'component',
    files: [
      'src/models/MoodEntry.ts',
      'src/models/FunFact.ts',
      'src/models/CheckInSuggestion.ts',
      'src/models/LifeFeedPost.ts',
    ],
    details: [
      'MoodEntry: emoji field → iconName field (happy, sparkles, leaf, water, etc.)',
      'FunFact: FUN_FACT_CATEGORY_METADATA icons now use Ionicon names (trophy, bar-chart, flame, repeat, etc.)',
      'FunFact: FUN_FACT_TYPE_METADATA icons now use Ionicon names (fitness, walk, location, camera, sparkles)',
      'CheckInSuggestion: COMMON_ACTIVITIES emoji → iconName (briefcase, fitness, cafe, restaurant, etc.)',
      'LifeFeedPost: Added REACTION_ICON_MAP alongside legacy REACTION_EMOJI_MAP',
      'Backward compatible: emoji fields marked @deprecated but still available',
    ],
  },
  {
    id: 14,
    name: 'Emoji to Ionicon Migration - Components',
    description: 'Updated UI components to render Ionicons instead of emoji text for professional iconography.',
    type: 'component',
    files: [
      'src/components/settings/ColorThemePicker.tsx',
      'src/components/checkin/CheckInSuggestionCard.tsx',
      'src/components/lifeFeed/ReactionBar.tsx',
      'src/components/lifeFeed/ReactionPicker.tsx',
      'src/components/onboarding/OrbitingIcons.tsx',
      'src/components/onboarding/OnboardingVoiceMagic.tsx',
    ],
    details: [
      'ColorThemePicker: Theme icons now use Ionicons (sunny, moon, water, leaf, flower)',
      'CheckInSuggestionCard: Activity chips render Ionicons instead of emoji text',
      'ReactionBar: Reactions render Ionicons with color-coded styling',
      'ReactionPicker: Floating picker uses colored Ionicons with tinted backgrounds',
      'OrbitingIcons: Interface updated to support iconName field (legacy emoji still works)',
      'OnboardingVoiceMagic: Language options use "language" Ionicon instead of flag emojis',
    ],
  },
];

// ============================================================
// Styling Helpers
// ============================================================

const TYPE_STYLES: Record<ChangeType, { badge: string; label: string }> = {
  theme: {
    badge: 'bg-indigo-100 text-indigo-800',
    label: 'Theme',
  },
  component: {
    badge: 'bg-emerald-100 text-emerald-800',
    label: 'Component',
  },
  animation: {
    badge: 'bg-amber-100 text-amber-800',
    label: 'Animation',
  },
  'new-file': {
    badge: 'bg-purple-100 text-purple-800',
    label: 'New File',
  },
};

// ============================================================
// Component
// ============================================================

export default function Feb2026UIUXPage() {
  useTrackPage(TRACKED_SCREENS.adminReleaseNotes);

  const [expandedChanges, setExpandedChanges] = useState<Set<number>>(new Set());
  const [collapsedCategories, setCollapsedCategories] = useState<Set<ChangeType>>(new Set());

  // Group changes by type
  const changesByType = useMemo(() => {
    const grouped: Record<ChangeType, UIChange[]> = {
      theme: [],
      component: [],
      animation: [],
      'new-file': [],
    };
    CHANGES.forEach((c) => {
      grouped[c.type].push(c);
    });
    return grouped;
  }, []);

  // Summary stats
  const stats = useMemo(() => {
    const filesModified = new Set(CHANGES.flatMap((c) => c.files)).size;
    return {
      total: CHANGES.length,
      filesModified,
      categories: CATEGORIES.length,
    };
  }, []);

  const toggleChange = (changeId: number) => {
    setExpandedChanges((prev) => {
      const next = new Set(prev);
      if (next.has(changeId)) {
        next.delete(changeId);
      } else {
        next.add(changeId);
      }
      return next;
    });
  };

  const toggleCategory = (typeId: ChangeType) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(typeId)) {
        next.delete(typeId);
      } else {
        next.add(typeId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setCollapsedCategories(new Set());
    setExpandedChanges(new Set(CHANGES.map((c) => c.id)));
  };

  const collapseAll = () => {
    setCollapsedCategories(new Set(CATEGORIES.map((c) => c.id)));
    setExpandedChanges(new Set());
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm">
        <Link href="/admin/release-notes" className="text-indigo-600 hover:text-indigo-800">
          Release Notes
        </Link>
        <span className="text-gray-400">/</span>
        <span className="text-gray-600">v1.3.1 - Calm Clarity UI Refresh + Ionicon Migration</span>
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
            <span className="text-xs text-gray-400">Feb 16, 2026</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Calm Clarity UI Refresh
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Complete UI/UX overhaul from &quot;Bold &amp; Colorful&quot; to &quot;Calm Clarity&quot; style
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

      {/* Design Philosophy */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg border border-indigo-200 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Design Philosophy Shift</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/80 rounded-lg p-4 border border-gray-200">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Before</p>
            <p className="text-lg font-semibold text-gray-900">&quot;Bold &amp; Colorful&quot;</p>
            <p className="text-sm text-gray-600 mt-1">Spotify/Duolingo inspired, warm cream backgrounds, heavy gradients, colored shadows</p>
          </div>
          <div className="bg-white/80 rounded-lg p-4 border border-indigo-200">
            <p className="text-xs font-medium text-indigo-600 uppercase tracking-wide mb-2">After</p>
            <p className="text-lg font-semibold text-gray-900">&quot;Calm Clarity&quot;</p>
            <p className="text-sm text-gray-600 mt-1">Day One/Notion/Linear inspired, cool neutral palette, subtle shadows, refined typography</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-white text-gray-700 border border-gray-200">
            Inspired by Day One
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-white text-gray-700 border border-gray-200">
            Inspired by Notion
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-white text-gray-700 border border-gray-200">
            Inspired by Linear
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500">Total Changes</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500">Files Modified</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{stats.filesModified}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500">Categories</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.categories}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500">New Files</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">
            {changesByType['new-file'].reduce((sum, c) => sum + c.files.length, 0)}
          </p>
        </div>
      </div>

      {/* Color Palette Comparison */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Color Palette Changes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Light Mode */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">Light Mode</p>
            <div className="space-y-2">
              <ColorRow label="Background" before="#FFFEF5" after="#FAFAFA" />
              <ColorRow label="Card" before="#FFFBF0" after="#FFFFFF" />
              <ColorRow label="Border" before="#CBD5E1" after="#E5E5E5" />
              <ColorRow label="Text" before="#1E293B" after="#1A1A1A" />
            </div>
          </div>
          {/* Dark Mode */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">Dark Mode</p>
            <div className="space-y-2">
              <ColorRow label="Background" before="#0F172A" after="#0F0F10" isDark />
              <ColorRow label="Card" before="#1E293B" after="#1E1E1F" isDark />
              <ColorRow label="Border" before="#475569" after="#2D2D2E" isDark />
            </div>
          </div>
        </div>
      </div>

      {/* Changes by Category */}
      {CATEGORIES.map((category) => {
        const changes = changesByType[category.id];
        const isCollapsed = collapsedCategories.has(category.id);

        if (changes.length === 0) return null;

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
                  ({changes.length} change{changes.length !== 1 ? 's' : ''})
                </span>
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
            </button>

            {/* Category Content */}
            {!isCollapsed && (
              <div className="px-5 pb-4 space-y-3">
                {changes.map((change) => {
                  const isExpanded = expandedChanges.has(change.id);
                  const typeStyle = TYPE_STYLES[change.type];

                  return (
                    <div
                      key={change.id}
                      className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                    >
                      <button
                        onClick={() => toggleChange(change.id)}
                        className="w-full flex items-start justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${typeStyle.badge}`}>
                              {typeStyle.label}
                            </span>
                          </div>
                          <h3 className="font-medium text-gray-900">{change.name}</h3>
                          <p className="text-sm text-gray-600 mt-1">{change.description}</p>
                        </div>
                        <svg
                          className={`w-5 h-5 text-gray-400 flex-shrink-0 ml-4 transition-transform ${
                            isExpanded ? 'rotate-180' : ''
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
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-gray-100">
                          {/* Before/After */}
                          {change.before && change.after && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 mb-4">
                              <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                                <p className="text-xs font-medium text-red-800 uppercase tracking-wide mb-1">Before</p>
                                <p className="text-sm text-gray-700 font-mono">{change.before}</p>
                              </div>
                              <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                                <p className="text-xs font-medium text-green-800 uppercase tracking-wide mb-1">After</p>
                                <p className="text-sm text-gray-700 font-mono">{change.after}</p>
                              </div>
                            </div>
                          )}

                          {/* Files */}
                          <div className="mb-3">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Files Modified</p>
                            <div className="flex flex-wrap gap-1">
                              {change.files.map((file) => (
                                <span
                                  key={file}
                                  className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-mono"
                                >
                                  {file}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Details */}
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Details</p>
                            <ul className="space-y-1">
                              {change.details.map((detail, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                                  <span className="text-green-500 flex-shrink-0">+</span>
                                  {detail}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Files Changed Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">All Files Changed</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {Array.from(new Set(CHANGES.flatMap((c) => c.files))).sort().map((file) => (
            <div key={file} className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
              <span className="font-mono text-gray-700">{file}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Developer Notes */}
      <div className="bg-amber-50 rounded-lg border border-amber-200 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Developer Notes</h2>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-amber-600 flex-shrink-0 mt-0.5">!</span>
            <span>Run <code className="bg-white px-1.5 py-0.5 rounded border border-amber-200 font-mono text-xs">npx expo start --clear</code> to see theme changes (Metro cache)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-600 flex-shrink-0 mt-0.5">!</span>
            <span>FeedCardContainer now uses dynamic theme from useTheme() hook, not static import</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-600 flex-shrink-0 mt-0.5">!</span>
            <span>EmptyStateFeed uses LanguageContext, not react-i18next</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function ColorRow({
  label,
  before,
  after,
  isDark = false,
}: {
  label: string;
  before: string;
  after: string;
  isDark?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-24">{label}</span>
      <div className="flex items-center gap-2">
        <div
          className={`w-6 h-6 rounded border ${isDark ? 'border-gray-600' : 'border-gray-300'}`}
          style={{ backgroundColor: before }}
          title={before}
        />
        <span className="text-xs text-gray-400">\u2192</span>
        <div
          className={`w-6 h-6 rounded border ${isDark ? 'border-gray-600' : 'border-gray-300'}`}
          style={{ backgroundColor: after }}
          title={after}
        />
        <span className="text-xs font-mono text-gray-600">{after}</span>
      </div>
    </div>
  );
}
