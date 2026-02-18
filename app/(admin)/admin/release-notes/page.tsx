'use client';

import Link from 'next/link';
import { useTrackPage } from '@/lib/hooks/useTrackPage';
import { TRACKED_SCREENS } from '@/lib/models/BehaviorEvent';

// ============================================================
// Types
// ============================================================

type ReleaseStatus = 'released' | 'in-progress' | 'planned';

interface Release {
  id: string;
  version: string;
  title: string;
  description: string;
  date: string;
  status: ReleaseStatus;
  featureCount: number;
  categories: string[];
  highlights: string[];
}

// ============================================================
// Data
// ============================================================

const RELEASES: Release[] = [
  {
    id: 'mar-2026-multi-provider',
    version: '1.5.0',
    title: 'Multi-Provider AI Architecture',
    description:
      'Extensible AI provider framework supporting cloud and local LLMs. Switch between OpenAI, Google Cloud, Anthropic, and Ollama without app updates. Save up to 100% on TTS/STT with free tiers.',
    date: 'Mar 2026',
    status: 'in-progress',
    featureCount: 8,
    categories: ['Infrastructure', 'Cost Savings', 'Admin', 'AI/Intelligence'],
    highlights: [
      'Provider framework (NEW)',
      'Google Cloud integration',
      'Local LLM support (Ollama)',
      'Admin config portal',
      'Cost tracking per provider',
    ],
  },
  {
    id: 'mar-2026-engagement',
    version: '1.4.0',
    title: 'Virtual Companion & Enhancements',
    description:
      'Introducing a virtual AI companion (Finch-style) that grows with your journaling journey. Plus monthly digests, photo timeline view, and smarter question personalization.',
    date: 'Mar 2026',
    status: 'planned',
    featureCount: 5,
    categories: ['Engagement', 'AI/Intelligence', 'Photos', 'Summaries'],
    highlights: [
      'Virtual AI companion (NEW)',
      'Monthly summary digests',
      'Photo timeline view',
      'Question effectiveness tracking',
      'Morning/evening routines',
    ],
  },
  {
    id: 'feb-2026-ui-ux',
    version: '1.3.0',
    title: 'Calm Clarity UI Refresh',
    description:
      'Complete UI/UX overhaul transforming the app from "Bold & Colorful" to "Calm Clarity" style. Inspired by Day One, Notion, and Linear for a more sophisticated, calming experience.',
    date: 'Feb 16, 2026',
    status: 'released',
    featureCount: 12,
    categories: ['Theme', 'Components', 'Typography', 'Animations'],
    highlights: [
      'Cool neutral color palette',
      'Softer shadows & subtle borders',
      'New animation tokens',
      'Empty state components',
    ],
  },
  {
    id: 'feb-2026-features',
    version: '1.2.0',
    title: 'Feature Batch (Feb 2026)',
    description:
      '20 new features across 7 categories including AI intelligence, engagement, revenue, and social features. Major additions like conversation threads, morning briefings, and premium AI personalities.',
    date: 'Feb 1-15, 2026',
    status: 'released',
    featureCount: 20,
    categories: [
      'Completion',
      'AI/Intelligence',
      'Engagement',
      'Revenue',
      'Social',
      'UX Polish',
      'Admin',
    ],
    highlights: [
      'Conversation threads',
      'Year in Review',
      'Morning briefing push',
      'Premium AI personalities',
    ],
  },
];

// ============================================================
// Styling Helpers
// ============================================================

const STATUS_STYLES: Record<
  ReleaseStatus,
  { badge: string; dot: string; label: string }
> = {
  released: {
    badge: 'bg-green-100 text-green-800',
    dot: 'bg-green-500',
    label: 'Released',
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

// ============================================================
// Component
// ============================================================

export default function AdminReleaseNotesIndexPage() {
  useTrackPage(TRACKED_SCREENS.adminReleaseNotes);

  // Summary stats
  const totalFeatures = RELEASES.reduce((sum, r) => sum + r.featureCount, 0);
  const releasedCount = RELEASES.filter((r) => r.status === 'released').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Release Notes</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track all releases and feature updates for PersonalAI
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500">Total Releases</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {RELEASES.length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500">Total Features</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">
            {totalFeatures}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500">Released</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {releasedCount}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500">Latest Version</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {RELEASES[0]?.version || '-'}
          </p>
        </div>
      </div>

      {/* Releases List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">All Releases</h2>

        {RELEASES.map((release) => {
          const statusStyle = STATUS_STYLES[release.status];

          return (
            <Link
              key={release.id}
              href={`/admin/release-notes/${release.id}`}
              className="block bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md hover:border-indigo-300 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                {/* Left: Title and metadata */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-mono font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      {release.version}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle.badge}`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`}
                      />
                      {statusStyle.label}
                    </span>
                    <span className="text-xs text-gray-400">{release.date}</span>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {release.title}
                  </h3>

                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {release.description}
                  </p>

                  {/* Categories */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {release.categories.slice(0, 5).map((cat) => (
                      <span
                        key={cat}
                        className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs"
                      >
                        {cat}
                      </span>
                    ))}
                    {release.categories.length > 5 && (
                      <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">
                        +{release.categories.length - 5}
                      </span>
                    )}
                  </div>

                  {/* Highlights */}
                  <div className="flex flex-wrap gap-2">
                    {release.highlights.map((highlight) => (
                      <span
                        key={highlight}
                        className="text-xs text-gray-500 flex items-center gap-1"
                      >
                        <span className="text-green-500">+</span>
                        {highlight}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Right: Feature count and arrow */}
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">
                      {release.featureCount}
                    </p>
                    <p className="text-xs text-gray-500">features</p>
                  </div>
                  <svg
                    className="w-5 h-5 text-gray-400"
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
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Links */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Related Admin Pages
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <AdminLink
            href="/admin/features"
            label="Features Overview"
            description="Full feature registry, service health, and flags"
          />
          <AdminLink
            href="/admin/app-settings"
            label="App Settings"
            description="Support email, docs URLs, app metadata"
          />
          <AdminLink
            href="/admin/prompts"
            label="Prompts"
            description="AI prompts across 9 languages"
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

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
      <div className="mt-2 text-indigo-600 font-medium text-xs">
        Open &rarr;
      </div>
    </Link>
  );
}
