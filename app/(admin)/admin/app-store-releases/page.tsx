'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useTrackPage } from '@/lib/hooks/useTrackPage';
import { TRACKED_SCREENS } from '@/lib/models/BehaviorEvent';
import { useAuth } from '@/lib/hooks/useAuth';

// ============================================================
// Types
// ============================================================

type ReleaseStatus = 'submitted' | 'in-review' | 'approved' | 'released' | 'rejected';

interface Release {
  id: string;
  version: string;
  buildNumber: string;
  releaseDate: string | null;
  status: ReleaseStatus;
  releaseNotes: string;
  rawCommits: string[];
  commitRange: { from: string; to: string };
  previousVersion: string;
  createdAt: string | null;
  updatedAt: string | null;
}

// ============================================================
// Status Badge
// ============================================================

const STATUS_CONFIG: Record<ReleaseStatus, { label: string; color: string; bg: string }> = {
  submitted: { label: 'Submitted', color: 'text-blue-700', bg: 'bg-blue-100' },
  'in-review': { label: 'In Review', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  approved: { label: 'Approved', color: 'text-green-700', bg: 'bg-green-100' },
  released: { label: 'Released', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  rejected: { label: 'Rejected', color: 'text-red-700', bg: 'bg-red-100' },
};

function StatusBadge({ status }: { status: ReleaseStatus }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.submitted;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
      {config.label}
    </span>
  );
}

// ============================================================
// API Helpers
// ============================================================

async function fetchReleases(token: string): Promise<Release[]> {
  const res = await fetch('/api/admin/app-store-releases', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch releases');
  const data = await res.json();
  return data.releases || [];
}

async function updateRelease(
  token: string,
  id: string,
  updates: { status?: string; releaseNotes?: string }
): Promise<void> {
  const res = await fetch('/api/admin/app-store-releases', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id, ...updates }),
  });
  if (!res.ok) throw new Error('Failed to update release');
}

// ============================================================
// Page Component
// ============================================================

export default function AppStoreReleasesPage() {
  useTrackPage(TRACKED_SCREENS.adminAppStoreReleases);

  const { user, getIdToken } = useAuth();
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [editedNotes, setEditedNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const loadReleases = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getIdToken();
      if (!token) return;
      const data = await fetchReleases(token);
      setReleases(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load releases');
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  useEffect(() => {
    if (user) loadReleases();
  }, [user, loadReleases]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      setSaving(true);
      const token = await getIdToken();
      if (!token) return;
      await updateRelease(token, id, { status: newStatus });
      setReleases((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: newStatus as ReleaseStatus, updatedAt: new Date().toISOString() } : r))
      );
    } catch (err) {
      alert('Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotes = async (id: string) => {
    try {
      setSaving(true);
      const token = await getIdToken();
      if (!token) return;
      await updateRelease(token, id, { releaseNotes: editedNotes });
      setReleases((prev) =>
        prev.map((r) => (r.id === id ? { ...r, releaseNotes: editedNotes, updatedAt: new Date().toISOString() } : r))
      );
      setEditingNotesId(null);
    } catch (err) {
      alert('Failed to save release notes');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">App Store Releases</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track formal App Store submissions and manage release notes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/testing-tools/screenshots"
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Screenshots
          </Link>
          <a
            href="https://appstoreconnect.apple.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
          >
            App Store Connect
          </a>
        </div>
      </div>

      {/* Quick Reference */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800 mb-2">Quick Reference</h3>
        <div className="text-xs text-blue-700 space-y-1">
          <p>
            <span className="font-medium">Release command:</span>{' '}
            <code className="bg-blue-100 px-1 py-0.5 rounded">
              cd PersonalAIApp && ./scripts/release/release.sh --version x.y.z
            </code>
          </p>
          <p>
            <span className="font-medium">Generate notes only:</span>{' '}
            <code className="bg-blue-100 px-1 py-0.5 rounded">
              cd personal-ai-web && npx tsx scripts/release/generate-release-notes.ts --version x.y.z --git-dir ../PersonalAIApp
            </code>
          </p>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          <span className="ml-3 text-gray-500">Loading releases...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={loadReleases}
            className="mt-2 text-sm font-medium text-red-600 hover:text-red-500"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && releases.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No releases yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Run the release script to create your first App Store release.
          </p>
          <p className="mt-2">
            <code className="text-xs bg-gray-100 px-2 py-1 rounded">
              ./scripts/release/release.sh --version 1.1.0
            </code>
          </p>
        </div>
      )}

      {/* Releases List */}
      {!loading && releases.length > 0 && (
        <div className="space-y-4">
          {releases.map((release) => {
            const isExpanded = expandedId === release.id;
            const isEditing = editingNotesId === release.id;

            return (
              <div
                key={release.id}
                className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"
              >
                {/* Release Header */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedId(isExpanded ? null : release.id)}
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          v{release.version}
                        </h3>
                        <StatusBadge status={release.status} />
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">
                        Build {release.buildNumber} &middot; {formatDate(release.releaseDate)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">
                      {release.rawCommits?.length || 0} commits
                    </span>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Release Notes Preview (always visible) */}
                {!isExpanded && release.releaseNotes && (
                  <div className="px-4 pb-3">
                    <p className="text-sm text-gray-600 line-clamp-2">{release.releaseNotes.slice(0, 200)}...</p>
                  </div>
                )}

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="border-t border-gray-200 p-4 space-y-4">
                    {/* Status Selector */}
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium text-gray-700">Status:</label>
                      <select
                        value={release.status}
                        onChange={(e) => handleStatusChange(release.id, e.target.value)}
                        disabled={saving}
                        className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="submitted">Submitted</option>
                        <option value="in-review">In Review</option>
                        <option value="approved">Approved</option>
                        <option value="released">Released</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>

                    {/* Release Notes */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-700">Release Notes</h4>
                        {!isEditing ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingNotesId(release.id);
                              setEditedNotes(release.releaseNotes);
                            }}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                          >
                            Edit
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingNotesId(null);
                              }}
                              className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSaveNotes(release.id);
                              }}
                              disabled={saving}
                              className="text-xs text-white bg-indigo-600 hover:bg-indigo-700 px-2 py-1 rounded font-medium disabled:opacity-50"
                            >
                              {saving ? 'Saving...' : 'Save'}
                            </button>
                          </div>
                        )}
                      </div>

                      {isEditing ? (
                        <textarea
                          value={editedNotes}
                          onChange={(e) => setEditedNotes(e.target.value)}
                          rows={10}
                          className="w-full text-sm border border-gray-300 rounded-md p-3 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <div className="bg-gray-50 rounded-md p-3 text-sm text-gray-700 whitespace-pre-wrap">
                          {release.releaseNotes || 'No release notes.'}
                        </div>
                      )}
                    </div>

                    {/* Raw Commits */}
                    {release.rawCommits && release.rawCommits.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                          Raw Commits ({release.rawCommits.length})
                        </h4>
                        <div className="bg-gray-900 rounded-md p-3 max-h-60 overflow-y-auto">
                          {release.rawCommits.map((commit, i) => (
                            <div key={i} className="text-xs text-gray-300 font-mono py-0.5">
                              {commit}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="flex items-center gap-6 text-xs text-gray-400 pt-2 border-t border-gray-100">
                      <span>
                        Commit range: {release.commitRange?.from || 'N/A'} &rarr;{' '}
                        {release.commitRange?.to || 'N/A'}
                      </span>
                      {release.updatedAt && (
                        <span>Last updated: {formatDate(release.updatedAt)}</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Link
                        href="/admin/testing-tools/screenshots"
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Generate Screenshots
                      </Link>
                      <a
                        href="https://appstoreconnect.apple.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100"
                      >
                        Open App Store Connect
                      </a>
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
}
