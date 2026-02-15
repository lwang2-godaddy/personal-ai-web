'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api/client';
import { useAppSelector } from '@/lib/store/hooks';

// ============================================================================
// Types
// ============================================================================

interface PostProvenance {
  service: string;
  promptId?: string;
  promptVersion?: string;
  promptSource?: 'firestore' | 'yaml' | 'mobile' | 'inline';
  promptExecutionId?: string;
  upstreamService?: string;
  upstreamSourceType?: string;
  model?: string;
  generatedAt: string;
}

interface LifeFeedPostSummary {
  id: string;
  userId: string;
  content: string;
  contentWithEmoji?: string;
  type: string;
  category: string;
  emoji?: string;
  confidence?: number;
  generatedAt: string;
  publishedAt?: string;
  flagged?: boolean;
  provenance: PostProvenance | null;
  likeCount: number;
  commentCount: number;
  viewCount: number;
}

interface PromptExecution {
  id: string;
  userId: string;
  service: string;
  promptId: string;
  language: string;
  promptVersion: string;
  promptSource: string;
  model: string;
  temperature: number;
  maxTokens: number;
  inputSummary: string;
  inputTokens: number;
  outputSummary: string;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUSD: number;
  latencyMs: number;
  success: boolean;
  errorMessage?: string;
  executedAt: string;
  sourceType?: string;
  sourceId?: string;
}

interface PostsResponse {
  posts: LifeFeedPostSummary[];
  hasMore: boolean;
}

interface PostDetailResponse {
  post: Record<string, unknown>;
  execution: PromptExecution | null;
}

// ============================================================================
// Constants
// ============================================================================

const POST_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'life_summary', label: 'Life Update', icon: '📋', color: '#607D8B' },
  { value: 'milestone', label: 'Milestone', icon: '🏆', color: '#FFC107' },
  { value: 'pattern_prediction', label: 'Prediction', icon: '🔮', color: '#9C27B0' },
  { value: 'reflective_insight', label: 'Insight', icon: '💡', color: '#03A9F4' },
  { value: 'memory_highlight', label: 'Memory', icon: '📸', color: '#E91E63' },
  { value: 'streak_achievement', label: 'Streak', icon: '🔥', color: '#FF5722' },
  { value: 'comparison', label: 'Comparison', icon: '📊', color: '#00BCD4' },
  { value: 'seasonal_reflection', label: 'Reflection', icon: '🌟', color: '#8BC34A' },
  { value: 'activity_pattern', label: 'Pattern', icon: '🔄', color: '#673AB7' },
  { value: 'health_alert', label: 'Health Alert', icon: '❤️', color: '#F44336' },
  { value: 'category_insight', label: 'Category', icon: '📊', color: '#4CAF50' },
];

const SERVICES = [
  { value: '', label: 'All Services' },
  { value: 'LifeFeedGenerator', label: 'LifeFeedGenerator' },
  { value: 'InsightsIntegrationService', label: 'InsightsIntegrationService' },
];

function getPostTypeMeta(type: string) {
  return POST_TYPES.find((t) => t.value === type) || { label: type, icon: '📝', color: '#999' };
}

function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleString();
  } catch {
    return dateStr;
  }
}

function truncate(text: string, maxLen: number): string {
  if (!text) return '';
  return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function LifeFeedPostsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAppSelector((state) => state.auth);

  // Data
  const [posts, setPosts] = useState<LifeFeedPostSummary[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [userIdFilter, setUserIdFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [limit] = useState(50);

  // Pagination cursor (last doc ID)
  const [cursors, setCursors] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);

  // Expanded post detail
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [executionData, setExecutionData] = useState<Record<string, PromptExecution | null>>({});
  const [loadingExecution, setLoadingExecution] = useState<string | null>(null);

  // ============================================================================
  // Data Fetching
  // ============================================================================

  const fetchPosts = useCallback(async (cursor?: string) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({ limit: limit.toString() });
      if (typeFilter) params.append('type', typeFilter);
      if (serviceFilter) params.append('service', serviceFilter);
      if (userIdFilter.trim()) params.append('userId', userIdFilter.trim());
      if (startDate) params.append('startDate', new Date(startDate).toISOString());
      if (endDate) params.append('endDate', new Date(endDate + 'T23:59:59').toISOString());
      if (cursor) params.append('startAfter', cursor);

      const data = await apiGet<PostsResponse>(
        `/api/admin/insights/posts?${params.toString()}`
      );

      setPosts(data.posts);
      setHasMore(data.hasMore);
    } catch (err: unknown) {
      console.error('Failed to fetch posts:', err);
      const message = err instanceof Error ? err.message : 'Failed to load posts';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, serviceFilter, userIdFilter, startDate, endDate, limit]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      // Reset pagination when filters change
      setCursors([]);
      setCurrentPage(0);
      fetchPosts();
    }
  }, [authLoading, isAuthenticated, fetchPosts]);

  const handleNextPage = () => {
    if (posts.length === 0) return;
    const lastPostId = posts[posts.length - 1].id;
    setCursors((prev) => [...prev, lastPostId]);
    setCurrentPage((prev) => prev + 1);
    fetchPosts(lastPostId);
  };

  const handlePrevPage = () => {
    if (currentPage <= 0) return;
    const newCursors = cursors.slice(0, -1);
    setCursors(newCursors);
    setCurrentPage((prev) => prev - 1);
    const prevCursor = newCursors.length > 0 ? newCursors[newCursors.length - 1] : undefined;
    fetchPosts(prevCursor);
  };

  const handleRefresh = () => {
    setCursors([]);
    setCurrentPage(0);
    fetchPosts();
  };

  // ============================================================================
  // Execution Detail
  // ============================================================================

  const togglePostDetail = async (postId: string) => {
    if (expandedPostId === postId) {
      setExpandedPostId(null);
      return;
    }

    setExpandedPostId(postId);

    // Only fetch if we haven't already
    if (executionData[postId] === undefined) {
      const post = posts.find((p) => p.id === postId);
      if (post?.provenance?.promptExecutionId) {
        try {
          setLoadingExecution(postId);
          const data = await apiGet<PostDetailResponse>(
            `/api/admin/insights/posts/${postId}`
          );
          setExecutionData((prev) => ({ ...prev, [postId]: data.execution }));
        } catch (err) {
          console.error('Failed to fetch execution:', err);
          setExecutionData((prev) => ({ ...prev, [postId]: null }));
        } finally {
          setLoadingExecution(null);
        }
      } else {
        setExecutionData((prev) => ({ ...prev, [postId]: null }));
      }
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center text-sm text-gray-500">
        <Link href="/admin" className="hover:text-gray-700">Admin</Link>
        <span className="mx-2">/</span>
        <Link href="/admin/insights" className="hover:text-gray-700">Insights</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900 font-medium">Life Feed Posts</span>
      </nav>

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Life Feed Posts</h1>
          <p className="mt-1 text-gray-600">
            Browse AI-generated life feed posts with provenance tracking
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/insights?tab=life-feed"
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm"
          >
            Back to Life Feed Config
          </Link>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 text-sm"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Post Type */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">
              Post Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {POST_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.icon ? `${t.icon} ` : ''}{t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Service */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">
              Service
            </label>
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {SERVICES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* User ID */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">
              User ID
            </label>
            <input
              type="text"
              value={userIdFilter}
              onChange={(e) => setUserIdFilter(e.target.value)}
              placeholder="Filter by user ID..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
          <button
            onClick={handleRefresh}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* Posts Table */}
      {!loading && !error && (
        <>
          {posts.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-gray-500 text-lg">No posts found matching the current filters.</p>
              <p className="text-gray-400 text-sm mt-2">Try adjusting your filters or date range.</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider max-w-md">
                        Content
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Service
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Prompt / Source
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Model
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Generated At
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {posts.map((post) => {
                      const typeMeta = getPostTypeMeta(post.type);
                      const isExpanded = expandedPostId === post.id;

                      return (
                        <PostRow
                          key={post.id}
                          post={post}
                          typeMeta={typeMeta}
                          isExpanded={isExpanded}
                          execution={executionData[post.id]}
                          loadingExecution={loadingExecution === post.id}
                          onToggle={() => togglePostDetail(post.id)}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Page {currentPage + 1} &middot; Showing {posts.length} posts
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 0}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Previous
              </button>
              <button
                onClick={handleNextPage}
                disabled={!hasMore}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Post Row Component
// ============================================================================

interface PostRowProps {
  post: LifeFeedPostSummary;
  typeMeta: { label: string; icon?: string; color?: string };
  isExpanded: boolean;
  execution: PromptExecution | null | undefined;
  loadingExecution: boolean;
  onToggle: () => void;
}

function PostRow({ post, typeMeta, isExpanded, execution, loadingExecution, onToggle }: PostRowProps) {
  const provenance = post.provenance;

  // Determine what to show in "Prompt / Source" column
  let promptSourceLabel = '-';
  if (provenance) {
    if (provenance.service === 'LifeFeedGenerator' && provenance.promptId) {
      promptSourceLabel = provenance.promptId;
    } else if (provenance.service === 'InsightsIntegrationService') {
      const parts: string[] = [];
      if (provenance.upstreamService) parts.push(provenance.upstreamService);
      if (provenance.upstreamSourceType) parts.push(provenance.upstreamSourceType);
      promptSourceLabel = parts.length > 0 ? parts.join(' / ') : '-';
    } else if (provenance.promptId) {
      promptSourceLabel = provenance.promptId;
    }
  }

  return (
    <>
      <tr className={`hover:bg-gray-50 transition-colors ${post.flagged ? 'bg-red-50' : ''}`}>
        {/* Type */}
        <td className="px-4 py-3 whitespace-nowrap">
          <span
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: typeMeta.color || '#999' }}
          >
            {typeMeta.icon && <span className="mr-1">{typeMeta.icon}</span>}
            {typeMeta.label}
          </span>
        </td>

        {/* Category */}
        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
          {post.category || '-'}
        </td>

        {/* Content */}
        <td className="px-4 py-3 text-sm text-gray-900 max-w-md">
          <p className="truncate" title={post.content}>
            {truncate(post.content, 100)}
          </p>
        </td>

        {/* Service */}
        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
          <span className="font-mono text-xs">
            {provenance?.service || '-'}
          </span>
        </td>

        {/* Prompt / Source */}
        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
          <span className="font-mono text-xs">{promptSourceLabel}</span>
          {provenance?.promptSource && (
            <span className="ml-1 text-xs text-gray-400">({provenance.promptSource})</span>
          )}
        </td>

        {/* Model */}
        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
          <span className="font-mono text-xs">
            {provenance?.model || '-'}
          </span>
        </td>

        {/* Generated At */}
        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
          {formatDate(post.generatedAt)}
        </td>

        {/* Actions */}
        <td className="px-4 py-3 whitespace-nowrap text-sm">
          {provenance?.promptExecutionId ? (
            <button
              onClick={onToggle}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                isExpanded
                  ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              {isExpanded ? 'Hide Execution' : 'View Execution'}
            </button>
          ) : (
            <button
              onClick={onToggle}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                isExpanded
                  ? 'bg-gray-200 text-gray-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {isExpanded ? 'Hide Details' : 'Details'}
            </button>
          )}
        </td>
      </tr>

      {/* Expanded Detail Row */}
      {isExpanded && (
        <tr>
          <td colSpan={8} className="px-4 py-4 bg-gray-50 border-t border-gray-100">
            <ExpandedDetail
              post={post}
              execution={execution}
              loadingExecution={loadingExecution}
            />
          </td>
        </tr>
      )}
    </>
  );
}

// ============================================================================
// Expanded Detail Component
// ============================================================================

interface ExpandedDetailProps {
  post: LifeFeedPostSummary;
  execution: PromptExecution | null | undefined;
  loadingExecution: boolean;
}

function ExpandedDetail({ post, execution, loadingExecution }: ExpandedDetailProps) {
  const provenance = post.provenance;

  return (
    <div className="space-y-4">
      {/* Post Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Full Content */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Full Content</h4>
          <div className="bg-white rounded-md border border-gray-200 p-3">
            <p className="text-sm text-gray-900 whitespace-pre-wrap">{post.content}</p>
            {post.contentWithEmoji && post.contentWithEmoji !== post.content && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-1">With Emoji:</p>
                <p className="text-sm text-gray-700">{post.contentWithEmoji}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Provenance Details */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Provenance</h4>
          <div className="bg-white rounded-md border border-gray-200 p-3">
            {provenance ? (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">Service:</span>
                  <span className="ml-1 font-mono text-gray-900">{provenance.service}</span>
                </div>
                {provenance.promptId && (
                  <div>
                    <span className="text-gray-500">Prompt ID:</span>
                    <span className="ml-1 font-mono text-gray-900">{provenance.promptId}</span>
                  </div>
                )}
                {provenance.promptVersion && (
                  <div>
                    <span className="text-gray-500">Version:</span>
                    <span className="ml-1 text-gray-900">{provenance.promptVersion}</span>
                  </div>
                )}
                {provenance.promptSource && (
                  <div>
                    <span className="text-gray-500">Source:</span>
                    <span className="ml-1 text-gray-900">{provenance.promptSource}</span>
                  </div>
                )}
                {provenance.model && (
                  <div>
                    <span className="text-gray-500">Model:</span>
                    <span className="ml-1 font-mono text-gray-900">{provenance.model}</span>
                  </div>
                )}
                {provenance.upstreamService && (
                  <div>
                    <span className="text-gray-500">Upstream:</span>
                    <span className="ml-1 font-mono text-gray-900">{provenance.upstreamService}</span>
                  </div>
                )}
                {provenance.upstreamSourceType && (
                  <div>
                    <span className="text-gray-500">Source Type:</span>
                    <span className="ml-1 text-gray-900">{provenance.upstreamSourceType}</span>
                  </div>
                )}
                {provenance.promptExecutionId && (
                  <div className="col-span-2">
                    <span className="text-gray-500">Execution ID:</span>
                    <span className="ml-1 font-mono text-xs text-gray-900 break-all">
                      {provenance.promptExecutionId}
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-gray-500">Generated:</span>
                  <span className="ml-1 text-gray-900">{formatDate(provenance.generatedAt)}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No provenance data available</p>
            )}
          </div>

          {/* Post Metadata */}
          <h4 className="text-sm font-semibold text-gray-700 mb-2 mt-3">Post Metadata</h4>
          <div className="bg-white rounded-md border border-gray-200 p-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">Post ID:</span>
                <span className="ml-1 font-mono text-xs text-gray-900">{post.id}</span>
              </div>
              <div>
                <span className="text-gray-500">User ID:</span>
                <span className="ml-1 font-mono text-xs text-gray-900">{post.userId}</span>
              </div>
              <div>
                <span className="text-gray-500">Confidence:</span>
                <span className="ml-1 text-gray-900">
                  {post.confidence != null ? `${(post.confidence * 100).toFixed(1)}%` : '-'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Flagged:</span>
                <span className={`ml-1 ${post.flagged ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                  {post.flagged ? 'Yes' : 'No'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Views:</span>
                <span className="ml-1 text-gray-900">{post.viewCount}</span>
              </div>
              <div>
                <span className="text-gray-500">Likes:</span>
                <span className="ml-1 text-gray-900">{post.likeCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Execution Details */}
      {provenance?.promptExecutionId && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Prompt Execution Details</h4>
          {loadingExecution ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              Loading execution data...
            </div>
          ) : execution ? (
            <div className="bg-white rounded-md border border-gray-200 p-3">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
                {/* Tokens */}
                <div className="bg-blue-50 rounded-md p-2 text-center">
                  <p className="text-xs text-blue-600 font-medium">Total Tokens</p>
                  <p className="text-lg font-bold text-blue-900">
                    {execution.totalTokens.toLocaleString()}
                  </p>
                  <p className="text-xs text-blue-500">
                    {execution.inputTokens.toLocaleString()} in / {execution.outputTokens.toLocaleString()} out
                  </p>
                </div>

                {/* Cost */}
                <div className="bg-green-50 rounded-md p-2 text-center">
                  <p className="text-xs text-green-600 font-medium">Cost</p>
                  <p className="text-lg font-bold text-green-900">
                    ${execution.estimatedCostUSD.toFixed(6)}
                  </p>
                </div>

                {/* Latency */}
                <div className="bg-amber-50 rounded-md p-2 text-center">
                  <p className="text-xs text-amber-600 font-medium">Latency</p>
                  <p className="text-lg font-bold text-amber-900">
                    {execution.latencyMs.toLocaleString()}ms
                  </p>
                </div>

                {/* Status */}
                <div className={`rounded-md p-2 text-center ${execution.success ? 'bg-green-50' : 'bg-red-50'}`}>
                  <p className={`text-xs font-medium ${execution.success ? 'text-green-600' : 'text-red-600'}`}>
                    Status
                  </p>
                  <p className={`text-lg font-bold ${execution.success ? 'text-green-900' : 'text-red-900'}`}>
                    {execution.success ? 'Success' : 'Failed'}
                  </p>
                  {execution.errorMessage && (
                    <p className="text-xs text-red-500 mt-1">{execution.errorMessage}</p>
                  )}
                </div>
              </div>

              {/* Execution metadata */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 text-sm border-t border-gray-100 pt-3">
                <div>
                  <span className="text-gray-500">Model:</span>
                  <span className="ml-1 font-mono text-gray-900">{execution.model}</span>
                </div>
                <div>
                  <span className="text-gray-500">Temperature:</span>
                  <span className="ml-1 text-gray-900">{execution.temperature}</span>
                </div>
                <div>
                  <span className="text-gray-500">Max Tokens:</span>
                  <span className="ml-1 text-gray-900">{execution.maxTokens}</span>
                </div>
                <div>
                  <span className="text-gray-500">Prompt Version:</span>
                  <span className="ml-1 text-gray-900">{execution.promptVersion}</span>
                </div>
                <div>
                  <span className="text-gray-500">Prompt Source:</span>
                  <span className="ml-1 text-gray-900">{execution.promptSource}</span>
                </div>
                <div>
                  <span className="text-gray-500">Language:</span>
                  <span className="ml-1 text-gray-900">{execution.language}</span>
                </div>
                <div>
                  <span className="text-gray-500">Executed At:</span>
                  <span className="ml-1 text-gray-900">{formatDate(execution.executedAt)}</span>
                </div>
              </div>

              {/* Input/Output summaries */}
              {(execution.inputSummary || execution.outputSummary) && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                  {execution.inputSummary && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Input Summary:</p>
                      <p className="text-xs text-gray-700 font-mono bg-gray-50 p-2 rounded">
                        {execution.inputSummary}
                      </p>
                    </div>
                  )}
                  {execution.outputSummary && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Output Summary:</p>
                      <p className="text-xs text-gray-700 font-mono bg-gray-50 p-2 rounded">
                        {execution.outputSummary}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-md border border-gray-200 p-3">
              <p className="text-sm text-gray-400 italic">
                Execution record not found (ID: {provenance.promptExecutionId})
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
