'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api/client';
import { useAppSelector } from '@/lib/store/hooks';
import { GeneratePanel } from '@/components/admin/shared';
import { PostCard, PostDetailModal, AlgorithmReference } from '@/components/admin/life-feed';

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
  generatedAt?: string;
}

interface SourcePreview {
  duration?: number;
  transcriptionPreview?: string;
  thumbnailUrl?: string;
  placeName?: string;
  activity?: string;
  value?: number;
  unit?: string;
}

interface Source {
  type: 'health' | 'location' | 'voice' | 'photo' | 'text';
  id: string;
  snippet?: string;
  timestamp?: string;
  preview?: SourcePreview;
}

interface LifeFeedPost {
  id: string;
  userId: string;
  type: string;
  category: string;
  content: string;
  contentWithEmoji?: string;
  emoji?: string;
  hashtags?: string[];
  confidence?: number;
  sources: Source[];
  provenance: PostProvenance | null;
  engagement?: {
    viewed: boolean;
    liked: boolean;
    shared: boolean;
    dismissed: boolean;
  };
  dateRange?: { start: string; end: string };
  publishedAt?: string;
  generatedAt?: string;
  flagged?: boolean;
  isAiGenerated?: boolean;
  isTemplate?: boolean;
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

interface UserWithPosts {
  id: string;
  email: string;
  displayName: string;
  postCount: number;
  lastPostAt: string | null;
}

interface PostsResponse {
  posts: LifeFeedPost[];
  hasMore: boolean;
  totalCount: number;
}

interface UsersResponse {
  users: UserWithPosts[];
}

interface PostDetailResponse {
  post: LifeFeedPost;
  execution: PromptExecution | null;
}

// ============================================================================
// Constants
// ============================================================================

const POST_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'life_summary', label: 'Life Update', icon: '📋' },
  { value: 'milestone', label: 'Milestone', icon: '🏆' },
  { value: 'pattern_prediction', label: 'Prediction', icon: '🔮' },
  { value: 'reflective_insight', label: 'Insight', icon: '💡' },
  { value: 'memory_highlight', label: 'Memory', icon: '📸' },
  { value: 'streak_achievement', label: 'Streak', icon: '🔥' },
  { value: 'comparison', label: 'Comparison', icon: '📊' },
  { value: 'seasonal_reflection', label: 'Reflection', icon: '🌟' },
  { value: 'activity_pattern', label: 'Pattern', icon: '🔄' },
  { value: 'health_alert', label: 'Health Alert', icon: '❤️' },
  { value: 'category_insight', label: 'Category', icon: '📊' },
  { value: 'fun_fact', label: 'Fun Fact', icon: '✨' },
];

const GENERATION_TYPES = [
  { value: 'all', label: 'All Posts' },
  { value: 'ai', label: 'AI Generated' },
  { value: 'template', label: 'Template Based' },
];

const DATE_PRESETS = [
  { value: '', label: 'All Time' },
  { value: '1', label: 'Last 24 hours' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
];

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  } catch {
    return dateStr;
  }
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function LifeFeedViewerPage() {
  const { isAuthenticated, isLoading: authLoading } = useAppSelector((state) => state.auth);

  // Users data
  const [users, setUsers] = useState<UserWithPosts[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Posts data
  const [posts, setPosts] = useState<LifeFeedPost[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState('');
  const [generationType, setGenerationType] = useState('all');
  const [datePreset, setDatePreset] = useState('');

  // Pagination
  const [cursors, setCursors] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);

  // Selected post for detail modal
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [executionData, setExecutionData] = useState<Record<string, PromptExecution | null>>({});
  const [loadingExecution, setLoadingExecution] = useState<string | null>(null);

  // ============================================================================
  // Fetch Users
  // ============================================================================

  const fetchUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const data = await apiGet<UsersResponse>('/api/admin/life-feed/users');
      setUsers(data.users);
      // Auto-select first user if none selected
      if (data.users.length > 0 && !selectedUserId) {
        setSelectedUserId(data.users[0].id);
      }
    } catch (err: unknown) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoadingUsers(false);
    }
  }, [selectedUserId]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchUsers();
    }
  }, [authLoading, isAuthenticated, fetchUsers]);

  // ============================================================================
  // Fetch Posts
  // ============================================================================

  const fetchPosts = useCallback(
    async (cursor?: string) => {
      if (!selectedUserId) return;

      try {
        setLoadingPosts(true);
        setError(null);

        const params = new URLSearchParams({
          userId: selectedUserId,
          limit: '20',
        });

        if (typeFilter) params.append('type', typeFilter);
        if (generationType !== 'all') params.append('generationType', generationType);

        // Calculate date range from preset
        if (datePreset) {
          const days = parseInt(datePreset, 10);
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - days);
          params.append('startDate', startDate.toISOString());
        }

        if (cursor) params.append('startAfter', cursor);

        const data = await apiGet<PostsResponse>(`/api/admin/life-feed?${params.toString()}`);

        setPosts(data.posts);
        setHasMore(data.hasMore);
        setTotalCount(data.totalCount);
      } catch (err: unknown) {
        console.error('Failed to fetch posts:', err);
        const message = err instanceof Error ? err.message : 'Failed to load posts';
        setError(message);
      } finally {
        setLoadingPosts(false);
      }
    },
    [selectedUserId, typeFilter, generationType, datePreset]
  );

  useEffect(() => {
    if (selectedUserId) {
      setCursors([]);
      setCurrentPage(0);
      fetchPosts();
    }
  }, [selectedUserId, typeFilter, generationType, datePreset, fetchPosts]);

  // ============================================================================
  // Pagination
  // ============================================================================

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
    fetchUsers();
    setCursors([]);
    setCurrentPage(0);
    fetchPosts();
  };

  // ============================================================================
  // Post Detail
  // ============================================================================

  const handleViewDetails = async (postId: string) => {
    if (selectedPostId === postId) {
      setSelectedPostId(null);
      return;
    }

    setSelectedPostId(postId);

    // Fetch execution data if not already loaded
    if (executionData[postId] === undefined) {
      const post = posts.find((p) => p.id === postId);
      if (post?.provenance?.promptExecutionId) {
        try {
          setLoadingExecution(postId);
          const data = await apiGet<PostDetailResponse>(`/api/admin/life-feed/${postId}`);
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
  // Filtered Users for Dropdown
  // ============================================================================

  const filteredUsers = users.filter(
    (user) =>
      user.displayName.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      user.id.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  const selectedUser = users.find((u) => u.id === selectedUserId);

  // ============================================================================
  // Calculate Stats
  // ============================================================================

  const aiCount = posts.filter((p) => p.isAiGenerated).length;
  const templateCount = posts.filter((p) => p.isTemplate && !p.isAiGenerated).length;
  const avgConfidence =
    posts.length > 0
      ? posts.reduce((sum, p) => sum + (p.confidence || 0), 0) / posts.length
      : 0;

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center text-sm text-gray-500">
        <Link href="/admin" className="hover:text-gray-700">
          Admin
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900 font-medium">Life Feed Viewer</span>
      </nav>

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Life Feed Viewer</h1>
          <p className="mt-1 text-gray-600">
            Browse and analyze life feed posts with full source and provenance details
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loadingPosts || loadingUsers}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm"
        >
          {loadingPosts || loadingUsers ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Algorithm Reference (collapsible) */}
      <AlgorithmReference />

      {/* User Selector */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* User Search/Select */}
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">
              Select User
            </label>
            <div className="relative">
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="Search users..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
              {userSearchQuery && filteredUsers.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {filteredUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => {
                        setSelectedUserId(user.id);
                        setUserSearchQuery('');
                      }}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                        selectedUserId === user.id ? 'bg-red-50' : ''
                      }`}
                    >
                      <div className="font-medium text-gray-900">{user.displayName}</div>
                      <div className="text-xs text-gray-500">
                        {user.email} &middot; {user.postCount} posts &middot; Last:{' '}
                        {formatRelativeTime(user.lastPostAt)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {!userSearchQuery && (
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                disabled={loadingUsers}
                className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                {loadingUsers ? (
                  <option>Loading users...</option>
                ) : users.length === 0 ? (
                  <option>No users with posts</option>
                ) : (
                  users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.displayName} ({user.postCount} posts)
                    </option>
                  ))
                )}
              </select>
            )}
          </div>

          {/* User Stats */}
          {selectedUser && (
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <span className="font-medium text-gray-900">{selectedUser.postCount}</span>
                <span>total posts</span>
              </div>
              <div className="flex items-center gap-1">
                <span>Last:</span>
                <span className="font-medium text-gray-900">
                  {formatRelativeTime(selectedUser.lastPostAt)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Generate Panel */}
      <GeneratePanel
        endpoint="/api/admin/life-feed"
        buttonLabel="Generate Life Feed"
        userId={selectedUserId}
        onSuccess={handleRefresh}
      />

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Post Type */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">
              Post Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              {POST_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.icon ? `${t.icon} ` : ''}
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Generation Type */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">
              Generation Type
            </label>
            <select
              value={generationType}
              onChange={(e) => setGenerationType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              {GENERATION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">
              Date Range
            </label>
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              {DATE_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Stats */}
        {posts.length > 0 && (
          <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-gray-100 text-sm">
            <span className="text-gray-500">
              Showing <span className="font-medium text-gray-900">{posts.length}</span> of{' '}
              <span className="font-medium text-gray-900">{totalCount}</span> posts
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-purple-600">
              🤖 {aiCount} AI
            </span>
            <span className="text-blue-600">
              📋 {templateCount} Template
            </span>
            <span className="text-gray-600">
              📊 Avg Confidence: {(avgConfidence * 100).toFixed(0)}%
            </span>
          </div>
        )}
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
      {loadingPosts && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* No User Selected */}
      {!selectedUserId && !loadingUsers && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-lg">Select a user to view their life feed posts</p>
        </div>
      )}

      {/* Posts Grid */}
      {!loadingPosts && !error && selectedUserId && (
        <>
          {posts.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-gray-500 text-lg">No posts found matching the current filters.</p>
              <p className="text-gray-400 text-sm mt-2">Try adjusting your filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  isSelected={selectedPostId === post.id}
                  onViewDetails={() => handleViewDetails(post.id)}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {posts.length > 0 && (
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
          )}
        </>
      )}

      {/* Detail Modal */}
      {selectedPostId && (
        <PostDetailModal
          post={posts.find((p) => p.id === selectedPostId)!}
          execution={executionData[selectedPostId]}
          loadingExecution={loadingExecution === selectedPostId}
          onClose={() => setSelectedPostId(null)}
        />
      )}
    </div>
  );
}
