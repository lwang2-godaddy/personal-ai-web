'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiGet } from '@/lib/api/client';
import { useTrackPage } from '@/lib/hooks/useTrackPage';
import { TRACKED_SCREENS } from '@/lib/models/BehaviorEvent';
import RAGAlgorithmReference from '@/components/admin/chat/RAGAlgorithmReference';

// ============================================================================
// Types
// ============================================================================

interface ContextReference {
  id: string;
  score: number;
  type: 'health' | 'location' | 'voice' | 'photo' | 'text';
  snippet?: string;
}

interface MessageFeedback {
  rating: 'thumbs_up' | 'thumbs_down';
  timestamp: string;
  comment?: string;
}

interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  voiceInput?: boolean;
  contextUsed?: ContextReference[];
  // Provider tracking fields
  provider?: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
  estimatedCostUSD?: number;
  promptExecutionId?: string;
  // Feedback
  feedback?: MessageFeedback | null;
}

interface ChatConversation {
  id: string;
  userId: string;
  messages: ChatMessage[];
  messageCount: number;
  userMessageCount: number;
  assistantMessageCount: number;
  messagesWithContextCount: number;
  contextTypesUsed: string[];
  createdAt: string;
  updatedAt: string;
  preview: string | null;
  // Provider tracking stats
  providerBreakdown?: Record<string, number>;
  totalCost?: number;
  totalTokens?: number;
  avgLatencyMs?: number;
  // Feedback stats
  thumbsUpCount?: number;
  thumbsDownCount?: number;
}

interface UserWithChats {
  id: string;
  email: string;
  displayName: string;
  chatCount: number;
  totalMessages: number;
  lastChatAt: string | null;
}

interface ConversationsResponse {
  conversations: ChatConversation[];
  hasMore: boolean;
  totalCount: number;
}

interface UsersResponse {
  users: UserWithChats[];
}

// ============================================================================
// Constants
// ============================================================================

const DATE_PRESETS = [
  { value: '', label: 'All Time' },
  { value: '1', label: 'Last 24 hours' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
];

const FEEDBACK_FILTERS = [
  { value: '', label: 'All Conversations' },
  { value: 'has_negative', label: 'Has Negative Feedback' },
  { value: 'has_positive', label: 'Has Positive Feedback' },
  { value: 'has_any', label: 'Has Any Feedback' },
  { value: 'no_feedback', label: 'No Feedback' },
];

const CONTEXT_TYPE_ICONS: Record<string, string> = {
  health: '❤️',
  location: '📍',
  voice: '🎙️',
  photo: '📸',
  text: '📝',
};

const CONTEXT_TYPE_COLORS: Record<string, string> = {
  health: 'bg-red-100 text-red-800',
  location: 'bg-blue-100 text-blue-800',
  voice: 'bg-purple-100 text-purple-800',
  photo: 'bg-green-100 text-green-800',
  text: 'bg-amber-100 text-amber-800',
};

const PROVIDER_COLORS: Record<string, string> = {
  openai: 'bg-green-100 text-green-800',
  google: 'bg-blue-100 text-blue-800',
  anthropic: 'bg-orange-100 text-orange-800',
  ollama: 'bg-gray-100 text-gray-800',
};

// ============================================================================
// Component
// ============================================================================

export default function AdminChatHistoryPage() {
  useTrackPage(TRACKED_SCREENS.adminChatHistory || 'admin_chat_history');

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [users, setUsers] = useState<UserWithChats[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Filters
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [dateRange, setDateRange] = useState<string>('');
  const [userSearch, setUserSearch] = useState('');
  const [feedbackFilter, setFeedbackFilter] = useState<string>('');

  // Detail modal
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [selectedMessageIndex, setSelectedMessageIndex] = useState<number | null>(null);

  // Fetch users on mount
  useEffect(() => {
    fetchUsers();
  }, []);

  // Fetch conversations when user/filters change
  useEffect(() => {
    if (selectedUserId) {
      fetchConversations();
    } else {
      setConversations([]);
      setTotalCount(0);
    }
  }, [selectedUserId, dateRange]);

  const fetchUsers = async () => {
    try {
      const response = await apiGet<UsersResponse>('/api/admin/chat-history/users');
      setUsers(response.users || []);

      // Auto-select first user if available
      if (response.users && response.users.length > 0 && !selectedUserId) {
        setSelectedUserId(response.users[0].id);
      }
    } catch (err: unknown) {
      console.error('Failed to fetch users:', err);
    }
  };

  const fetchConversations = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append('userId', selectedUserId);
      params.append('limit', '50');

      if (dateRange) {
        const days = parseInt(dateRange, 10);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        params.append('startDate', startDate.toISOString());
      }

      const response = await apiGet<ConversationsResponse>(`/api/admin/chat-history?${params}`);
      setConversations(response.conversations || []);
      setTotalCount(response.totalCount);
      setHasMore(response.hasMore);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch conversations';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Filter users by search
  const filteredUsers = users.filter(
    (u) =>
      u.displayName.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.id.toLowerCase().includes(userSearch.toLowerCase())
  );

  // Get selected user info
  const selectedUser = users.find((u) => u.id === selectedUserId);

  // Apply feedback filter (client-side)
  const filteredConversations = useMemo(() => {
    if (!feedbackFilter) return conversations;
    return conversations.filter((c) => {
      const up = c.thumbsUpCount || 0;
      const down = c.thumbsDownCount || 0;
      switch (feedbackFilter) {
        case 'has_negative': return down > 0;
        case 'has_positive': return up > 0;
        case 'has_any': return up > 0 || down > 0;
        case 'no_feedback': return up === 0 && down === 0;
        default: return true;
      }
    });
  }, [conversations, feedbackFilter]);

  // Calculate aggregate feedback stats
  const feedbackStats = useMemo(() => {
    let totalUp = 0;
    let totalDown = 0;
    conversations.forEach((c) => {
      totalUp += c.thumbsUpCount || 0;
      totalDown += c.thumbsDownCount || 0;
    });
    return { totalUp, totalDown };
  }, [conversations]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chat History</h1>
          <p className="text-gray-600 mt-1">
            Review chat conversations and RAG context used for responses
          </p>
        </div>
        <button
          onClick={fetchConversations}
          disabled={!selectedUserId || loading}
          className="px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {/* RAG Algorithm Reference */}
      <RAGAlgorithmReference />

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* User Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search users..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mb-2"
              />
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Select a user</option>
                {filteredUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.displayName || u.email} ({u.chatCount} chats, {u.totalMessages} messages)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              {DATE_PRESETS.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>

          {/* Feedback Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Feedback</label>
            <select
              value={feedbackFilter}
              onChange={(e) => setFeedbackFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              {FEEDBACK_FILTERS.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </div>

          {/* Stats */}
          <div className="flex items-end">
            {selectedUser && (
              <div className="bg-gray-50 rounded-lg p-3 w-full">
                <div className="text-sm text-gray-500">Selected User Stats</div>
                <div className="flex gap-4 mt-1">
                  <div>
                    <span className="font-semibold text-gray-900">{selectedUser.chatCount}</span>
                    <span className="text-gray-500 text-sm ml-1">chats</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900">{selectedUser.totalMessages}</span>
                    <span className="text-gray-500 text-sm ml-1">messages</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      {selectedUserId && !loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-6 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900">{totalCount}</div>
              <div className="text-sm text-gray-500">Total Conversations</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600">
                {conversations.reduce((sum, c) => sum + c.userMessageCount, 0)}
              </div>
              <div className="text-sm text-gray-500">User Messages</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">
                {conversations.reduce((sum, c) => sum + c.assistantMessageCount, 0)}
              </div>
              <div className="text-sm text-gray-500">AI Responses</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-600">
                {conversations.reduce((sum, c) => sum + c.messagesWithContextCount, 0)}
              </div>
              <div className="text-sm text-gray-500">With RAG Context</div>
            </div>
            <div className="bg-white border border-green-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">{feedbackStats.totalUp}</div>
              <div className="text-sm text-gray-500">Thumbs Up</div>
            </div>
            <div className="bg-white border border-red-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-red-600">{feedbackStats.totalDown}</div>
              <div className="text-sm text-gray-500">Thumbs Down</div>
            </div>
          </div>

          {/* Provider Stats */}
          <div className="grid grid-cols-5 gap-4">
            {(() => {
              // Calculate aggregated provider stats
              const providerCounts: Record<string, number> = {};
              const providerCosts: Record<string, number> = {};
              let totalCost = 0;
              let totalTokens = 0;
              conversations.forEach(c => {
                if (c.providerBreakdown) {
                  Object.entries(c.providerBreakdown).forEach(([provider, count]) => {
                    providerCounts[provider] = (providerCounts[provider] || 0) + count;
                  });
                }
                if (c.totalCost) totalCost += c.totalCost;
                if (c.totalTokens) totalTokens += c.totalTokens;
                c.messages.forEach(m => {
                  if (m.role === 'assistant' && m.provider && m.estimatedCostUSD) {
                    providerCosts[m.provider] = (providerCosts[m.provider] || 0) + m.estimatedCostUSD;
                  }
                });
              });
              return (
                <>
                  {['openai', 'google', 'anthropic', 'ollama'].map(provider => {
                    const count = providerCounts[provider] || 0;
                    const cost = providerCosts[provider] || 0;
                    return (
                      <div key={provider} className="bg-white border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${PROVIDER_COLORS[provider]}`}>
                            {provider}
                          </span>
                        </div>
                        <div className="text-xl font-bold text-gray-900">{count}</div>
                        <div className="text-xs text-gray-500">responses</div>
                        {cost > 0 && (
                          <div className="text-xs text-green-600 mt-1">${cost.toFixed(4)}</div>
                        )}
                      </div>
                    );
                  })}
                  <div className="bg-white border border-gray-200 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Total Cost</div>
                    <div className="text-xl font-bold text-green-600">${totalCost.toFixed(4)}</div>
                    <div className="text-xs text-gray-500 mt-1">{totalTokens.toLocaleString()} tokens</div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Conversations List */}
      {!selectedUserId ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-4xl mb-4">💬</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a User</h3>
          <p className="text-gray-500">Choose a user from the dropdown to view their chat history.</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : filteredConversations.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-4xl mb-4">💬</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {feedbackFilter ? 'No Matching Conversations' : 'No Chat History'}
          </h3>
          <p className="text-gray-500">
            {feedbackFilter
              ? 'No conversations match the selected feedback filter.'
              : "This user hasn't had any chat conversations yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedConversation(conversation)}
            >
              {/* Conversation Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">💬</span>
                    <span className="font-medium text-gray-900">
                      {conversation.messageCount} messages
                    </span>
                    <span className="text-gray-400">|</span>
                    <span className="text-sm text-gray-500">
                      {conversation.userMessageCount} user, {conversation.assistantMessageCount} AI
                    </span>
                    {/* Feedback indicators */}
                    {(conversation.thumbsUpCount || 0) > 0 && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs rounded-full bg-green-100 text-green-700">
                        👍 {conversation.thumbsUpCount}
                      </span>
                    )}
                    {(conversation.thumbsDownCount || 0) > 0 && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs rounded-full bg-red-100 text-red-700">
                        👎 {conversation.thumbsDownCount}
                      </span>
                    )}
                  </div>
                  {conversation.preview && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      First message: &quot;{conversation.preview}&quot;
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">
                    {new Date(conversation.updatedAt).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(conversation.updatedAt).toLocaleTimeString()}
                  </div>
                </div>
              </div>

              {/* Context Types Used */}
              {conversation.contextTypesUsed.length > 0 && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-gray-500">Context types used:</span>
                  <div className="flex gap-1">
                    {conversation.contextTypesUsed.map((type) => (
                      <span
                        key={type}
                        className={`px-2 py-0.5 text-xs rounded-full ${CONTEXT_TYPE_COLORS[type] || 'bg-gray-100 text-gray-700'}`}
                      >
                        {CONTEXT_TYPE_ICONS[type] || '📄'} {type}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="flex gap-4 text-xs">
                <span className="text-gray-500">
                  {conversation.messagesWithContextCount} responses used RAG context
                </span>
                {conversation.messagesWithContextCount > 0 && (
                  <span className="text-purple-600 font-medium">
                    Click to view details
                  </span>
                )}
              </div>
            </div>
          ))}

          {hasMore && (
            <div className="text-center py-4">
              <span className="text-sm text-gray-500">
                Showing {filteredConversations.length} of {totalCount} conversations
              </span>
            </div>
          )}
        </div>
      )}

      {/* Conversation Detail Modal */}
      {selectedConversation && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => {
            setSelectedConversation(null);
            setSelectedMessageIndex(null);
          }}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Conversation Details
                </h2>
                <p className="text-sm text-gray-500">
                  {selectedConversation.messageCount} messages |{' '}
                  {new Date(selectedConversation.createdAt).toLocaleString()}
                  {((selectedConversation.thumbsUpCount || 0) > 0 || (selectedConversation.thumbsDownCount || 0) > 0) && (
                    <span className="ml-2">
                      | 👍 {selectedConversation.thumbsUpCount || 0} 👎 {selectedConversation.thumbsDownCount || 0}
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedConversation(null);
                  setSelectedMessageIndex(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {selectedConversation.messages.map((message, index) => (
                <div
                  key={index}
                  className={`${
                    message.role === 'user'
                      ? 'ml-8 bg-blue-50 border-blue-200'
                      : message.role === 'assistant'
                      ? 'mr-8 bg-gray-50 border-gray-200'
                      : 'mx-4 bg-yellow-50 border-yellow-200'
                  } border rounded-lg p-4 ${
                    selectedMessageIndex === index ? 'ring-2 ring-indigo-500' : ''
                  }`}
                  onClick={() => setSelectedMessageIndex(index)}
                >
                  {/* Message Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                        message.role === 'user'
                          ? 'bg-blue-100 text-blue-800'
                          : message.role === 'assistant'
                          ? 'bg-gray-200 text-gray-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {message.role === 'user' ? '👤 User' : message.role === 'assistant' ? '🤖 AI' : '⚙️ System'}
                      </span>
                      {message.voiceInput && (
                        <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded-full">
                          🎙️ Voice Input
                        </span>
                      )}
                      {/* Feedback badge */}
                      {message.feedback && (
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                          message.feedback.rating === 'thumbs_up'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {message.feedback.rating === 'thumbs_up' ? '👍 Positive' : '👎 Negative'}
                          <span className="ml-1 opacity-60">
                            {new Date(message.feedback.timestamp).toLocaleTimeString()}
                          </span>
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  {/* Feedback comment */}
                  {message.feedback?.comment && (
                    <div className="mb-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                      💬 {message.feedback.comment}
                    </div>
                  )}

                  {/* Provider/Model Info (for assistant messages) */}
                  {message.role === 'assistant' && (
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {message.provider && (
                        <span className={`px-2 py-0.5 text-xs rounded-full ${PROVIDER_COLORS[message.provider] || 'bg-gray-100 text-gray-800'}`}>
                          {message.provider}
                        </span>
                      )}
                      {message.model && (
                        <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full font-mono">
                          {message.model}
                        </span>
                      )}
                      {(message.inputTokens != null || message.outputTokens != null) && (
                        <span className="text-xs text-gray-500">
                          {(message.inputTokens || 0) + (message.outputTokens || 0)} tokens
                        </span>
                      )}
                      {message.latencyMs != null && (
                        <span className="text-xs text-gray-500">
                          {message.latencyMs}ms
                        </span>
                      )}
                      {message.estimatedCostUSD != null && (
                        <span className="text-xs text-green-600 font-medium">
                          ${message.estimatedCostUSD.toFixed(4)}
                        </span>
                      )}
                      {!message.provider && (
                        <span className="text-xs text-gray-400 italic">
                          (not tracked)
                        </span>
                      )}
                    </div>
                  )}

                  {/* Message Content */}
                  <div className="text-sm text-gray-900 whitespace-pre-wrap">
                    {message.content}
                  </div>

                  {/* Context Used (for assistant messages) */}
                  {message.role === 'assistant' && message.contextUsed && message.contextUsed.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium text-gray-700">
                          RAG Context Used ({message.contextUsed.length} items)
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMessageIndex(selectedMessageIndex === index ? null : index);
                          }}
                          className="text-xs text-indigo-600 hover:text-indigo-800"
                        >
                          {selectedMessageIndex === index ? 'Hide details' : 'Show details'}
                        </button>
                      </div>

                      {/* Context Summary */}
                      <div className="flex flex-wrap gap-1 mb-2">
                        {message.contextUsed.map((ctx, i) => (
                          <span
                            key={i}
                            className={`px-2 py-0.5 text-xs rounded-full ${CONTEXT_TYPE_COLORS[ctx.type] || 'bg-gray-100 text-gray-700'}`}
                          >
                            {CONTEXT_TYPE_ICONS[ctx.type] || '📄'} {(ctx.score * 100).toFixed(0)}%
                          </span>
                        ))}
                      </div>

                      {/* Context Details (when expanded) */}
                      {selectedMessageIndex === index && (
                        <div className="space-y-2 mt-3">
                          {message.contextUsed.map((ctx, i) => (
                            <div
                              key={i}
                              className="bg-white border border-gray-200 rounded-lg p-3"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 text-xs rounded-full ${CONTEXT_TYPE_COLORS[ctx.type] || 'bg-gray-100 text-gray-700'}`}>
                                    {CONTEXT_TYPE_ICONS[ctx.type] || '📄'} {ctx.type}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    Relevance: {(ctx.score * 100).toFixed(1)}%
                                  </span>
                                </div>
                                <code className="text-xs text-gray-400 font-mono">
                                  {ctx.id.substring(0, 20)}...
                                </code>
                              </div>
                              {ctx.snippet && (
                                <p className="text-xs text-gray-600 bg-gray-50 rounded p-2">
                                  {ctx.snippet}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Conversation ID: <code className="font-mono text-xs">{selectedConversation.id}</code>
                </div>
                <button
                  onClick={() => {
                    setSelectedConversation(null);
                    setSelectedMessageIndex(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
