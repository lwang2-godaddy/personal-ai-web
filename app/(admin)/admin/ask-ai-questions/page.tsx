'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { apiGet } from '@/lib/api/client';
import { useTrackPage } from '@/lib/hooks/useTrackPage';
import { TRACKED_SCREENS } from '@/lib/models/BehaviorEvent';

/**
 * Interface for Ask AI Question stored in Firestore
 */
interface AskAiQuestion {
  id: string;
  userId: string;
  contextType: 'diary' | 'voice' | 'photo' | 'location' | 'health' | 'lifefeed';
  contextItemId: string;
  contextSnippet: string;
  questionText: string;
  questionType: 'heuristic' | 'ai_generated';
  signalType?: string;
  signalStrength?: number;
  provenance?: {
    service: string;
    promptId: string;
    model?: string;
    tokens?: number;
    cost?: number;
    latencyMs?: number;
  };
  relatedItems?: Array<{
    id: string;
    type: string;
    snippet: string;
    similarity: number;
  }>;
  wasUsed: boolean;
  userFeedback?: 'helpful' | 'not_helpful';
  generatedAt: string;
  usedAt?: string;
}

interface QuestionsResponse {
  questions: AskAiQuestion[];
  hasMore: boolean;
  totalCount: number;
  stats: {
    heuristicCount: number;
    aiGeneratedCount: number;
    usageRate: number;
    avgSignalStrength: number;
  };
}

interface UsersResponse {
  users: Array<{
    id: string;
    email: string;
    displayName: string;
    questionCount: number;
    lastQuestionAt: string;
  }>;
}

const CONTEXT_TYPE_ICONS: Record<string, string> = {
  diary: '📝',
  voice: '🎙️',
  photo: '📸',
  location: '📍',
  health: '❤️',
  lifefeed: '✨',
};

const SIGNAL_TYPE_COLORS: Record<string, string> = {
  visit_frequency: 'bg-blue-100 text-blue-800',
  milestone: 'bg-purple-100 text-purple-800',
  streak: 'bg-green-100 text-green-800',
  gap: 'bg-orange-100 text-orange-800',
  day_pattern: 'bg-indigo-100 text-indigo-800',
  related_memory: 'bg-pink-100 text-pink-800',
  category_trend: 'bg-yellow-100 text-yellow-800',
};

// Algorithm documentation
const SIGNAL_THRESHOLDS = {
  visit_frequency: { threshold: 5, description: '5+ visits to same location' },
  streak: { threshold: 3, description: '3+ consecutive days of activity' },
  gap: { threshold: 14, description: '14+ days since last activity' },
  milestone: { threshold: '10, 25, 50, 100', description: 'Near milestone counts' },
  category_trend: { threshold: 4, description: '4+ entries in same category (weekly)' },
  day_pattern: { threshold: 3, description: '3+ occurrences on same weekday' },
  related_memory: { threshold: 0.8, description: '80%+ semantic similarity' },
};

export default function AdminAskAiQuestionsPage() {
  useTrackPage(TRACKED_SCREENS.adminAskAiQuestions || 'admin_ask_ai_questions');

  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [showAlgorithm, setShowAlgorithm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<AskAiQuestion[]>([]);
  const [stats, setStats] = useState<QuestionsResponse['stats'] | null>(null);
  const [users, setUsers] = useState<UsersResponse['users']>([]);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedContextType, setSelectedContextType] = useState<string>('');
  const [selectedQuestionType, setSelectedQuestionType] = useState<string>('');
  const [selectedSignalType, setSelectedSignalType] = useState<string>('');
  const [selectedUsage, setSelectedUsage] = useState<string>('');
  const [dateRange, setDateRange] = useState<string>('7d');

  // Detail modal
  const [selectedQuestion, setSelectedQuestion] = useState<AskAiQuestion | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchQuestions();
  }, [selectedUserId, selectedContextType, selectedQuestionType, selectedSignalType, selectedUsage, dateRange]);

  const fetchUsers = async () => {
    try {
      const response = await apiGet<UsersResponse>('/api/admin/ask-ai-questions/users');
      setUsers(response.users || []);
    } catch (err: unknown) {
      console.error('Failed to fetch users:', err);
    }
  };

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (selectedUserId) params.append('userId', selectedUserId);
      if (selectedContextType) params.append('contextType', selectedContextType);
      if (selectedQuestionType) params.append('questionType', selectedQuestionType);
      if (selectedSignalType) params.append('signalType', selectedSignalType);
      if (selectedUsage) params.append('wasUsed', selectedUsage);
      if (dateRange) params.append('dateRange', dateRange);
      params.append('limit', '50');

      const response = await apiGet<QuestionsResponse>(`/api/admin/ask-ai-questions?${params}`);
      setQuestions(response.questions || []);
      setStats(response.stats);
      setTotalCount(response.totalCount);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch questions';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ask AI Questions</h1>
          <p className="text-gray-600 mt-1">
            Review personalized questions generated for user content
          </p>
        </div>
        <button
          onClick={() => setShowAlgorithm(!showAlgorithm)}
          className="px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
        >
          {showAlgorithm ? 'Hide Algorithm' : 'View Algorithm'}
        </button>
      </div>

      {/* Algorithm Documentation */}
      {showAlgorithm && (
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span>🧠</span> Question Generation Algorithm
          </h2>

          {/* 2-Tier System Overview */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h3 className="font-medium text-indigo-800 mb-2 flex items-center gap-2">
                <span className="px-2 py-0.5 text-xs bg-indigo-100 text-indigo-800 rounded-full">Tier 1</span>
                Heuristic Questions
              </h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• <strong>Instant</strong> - No API calls, ~100ms</li>
                <li>• <strong>$0 cost</strong> - Uses cached data only</li>
                <li>• <strong>Signal-based</strong> - Detects patterns in user data</li>
                <li>• <strong>Fallback</strong> - Generic question if no signal &gt; 50%</li>
              </ul>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h3 className="font-medium text-purple-800 mb-2 flex items-center gap-2">
                <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded-full">Tier 2</span>
                AI-Generated Questions
              </h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• <strong>On-demand</strong> - User taps &quot;Get better questions&quot;</li>
                <li>• <strong>~$0.01/request</strong> - GPT-4o-mini</li>
                <li>• <strong>Semantic search</strong> - Pinecone finds related content</li>
                <li>• <strong>3-5 questions</strong> - Personalized to context</li>
              </ul>
            </div>
          </div>

          {/* Signal Detection Thresholds */}
          <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
            <h3 className="font-medium text-gray-900 mb-3">Signal Detection Thresholds</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(SIGNAL_THRESHOLDS).map(([signal, config]) => (
                <div
                  key={signal}
                  className={`p-3 rounded-lg ${SIGNAL_TYPE_COLORS[signal] || 'bg-gray-100 text-gray-800'}`}
                >
                  <div className="font-medium text-sm">{signal.replace(/_/g, ' ')}</div>
                  <div className="text-xs opacity-75 mt-1">
                    Threshold: {config.threshold}
                  </div>
                  <div className="text-xs opacity-60 mt-0.5">
                    {config.description}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Flow Explanation */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h3 className="font-medium text-gray-900 mb-3">Question Generation Flow</h3>
            <div className="flex items-center gap-2 text-sm text-gray-600 flex-wrap">
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">User taps Ask AI</span>
              <span>→</span>
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">Detect signals</span>
              <span>→</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded">Signal &gt; 50%?</span>
              <span>→</span>
              <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded">Personalized Q</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 mt-2 flex-wrap">
              <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded ml-[180px] md:ml-[220px]">No strong signal</span>
              <span>→</span>
              <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded">Fallback: &quot;What insights...&quot;</span>
            </div>
          </div>

          {/* Example Questions */}
          <div className="mt-4 text-sm">
            <h4 className="font-medium text-gray-700 mb-2">Example Personalized Questions:</h4>
            <div className="grid md:grid-cols-2 gap-2 text-gray-600">
              <div className="flex items-start gap-2">
                <span className={`px-1.5 py-0.5 text-xs rounded ${SIGNAL_TYPE_COLORS.visit_frequency}`}>visit</span>
                <span>&quot;This is your 5th visit to the gym - what keeps you coming back?&quot;</span>
              </div>
              <div className="flex items-start gap-2">
                <span className={`px-1.5 py-0.5 text-xs rounded ${SIGNAL_TYPE_COLORS.streak}`}>streak</span>
                <span>&quot;You&apos;re on a 7-day journaling streak! What&apos;s motivating you?&quot;</span>
              </div>
              <div className="flex items-start gap-2">
                <span className={`px-1.5 py-0.5 text-xs rounded ${SIGNAL_TYPE_COLORS.gap}`}>gap</span>
                <span>&quot;It&apos;s been 2 weeks since your last visit. What brought you back?&quot;</span>
              </div>
              <div className="flex items-start gap-2">
                <span className={`px-1.5 py-0.5 text-xs rounded ${SIGNAL_TYPE_COLORS.milestone}`}>milestone</span>
                <span>&quot;This is your 25th workout! How has your fitness journey been?&quot;</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {/* User Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">All Users</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.displayName || u.email} ({u.questionCount})
                </option>
              ))}
            </select>
          </div>

          {/* Context Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content Type</label>
            <select
              value={selectedContextType}
              onChange={(e) => setSelectedContextType(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">All Types</option>
              <option value="diary">📝 Diary</option>
              <option value="voice">🎙️ Voice</option>
              <option value="photo">📸 Photo</option>
              <option value="location">📍 Location</option>
              <option value="health">❤️ Health</option>
              <option value="lifefeed">✨ Life Feed</option>
            </select>
          </div>

          {/* Question Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Generation Type</label>
            <select
              value={selectedQuestionType}
              onChange={(e) => setSelectedQuestionType(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">All</option>
              <option value="heuristic">Heuristic (Tier 1)</option>
              <option value="ai_generated">AI Generated (Tier 2)</option>
            </select>
          </div>

          {/* Signal Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Signal Type</label>
            <select
              value={selectedSignalType}
              onChange={(e) => setSelectedSignalType(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">All Signals</option>
              <option value="visit_frequency">Visit Frequency</option>
              <option value="milestone">Milestone</option>
              <option value="streak">Streak</option>
              <option value="gap">Gap</option>
              <option value="day_pattern">Day Pattern</option>
              <option value="related_memory">Related Memory</option>
              <option value="category_trend">Category Trend</option>
            </select>
          </div>

          {/* Usage Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Usage</label>
            <select
              value={selectedUsage}
              onChange={(e) => setSelectedUsage(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">All</option>
              <option value="true">Used</option>
              <option value="false">Not Used</option>
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="1d">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="all">All time</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-900">{totalCount}</div>
            <div className="text-sm text-gray-500">Total Questions</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-indigo-600">{stats.heuristicCount}</div>
            <div className="text-sm text-gray-500">Heuristic (Tier 1)</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-600">{stats.aiGeneratedCount}</div>
            <div className="text-sm text-gray-500">AI Generated (Tier 2)</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">
              {(stats.usageRate * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-500">Usage Rate</div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Questions List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-4xl mb-4">❓</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No questions found</h3>
          <p className="text-gray-500">
            Questions will appear here when users tap &quot;Ask AI&quot; on their content.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {questions.map((question) => (
            <div
              key={question.id}
              className={`bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow cursor-pointer ${
                question.wasUsed ? 'border-green-200' : 'border-gray-200'
              }`}
              onClick={() => setSelectedQuestion(question)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">
                    {CONTEXT_TYPE_ICONS[question.contextType] || '❓'}
                  </span>
                  <div>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        question.questionType === 'heuristic'
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {question.questionType === 'heuristic' ? 'Heuristic' : 'AI'}
                    </span>
                    {question.signalType && (
                      <span
                        className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
                          SIGNAL_TYPE_COLORS[question.signalType] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {question.signalType.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 text-xs rounded-full ${
                    question.wasUsed
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {question.wasUsed ? 'Used' : 'Not used'}
                </span>
              </div>

              {/* Question Text */}
              <p className="text-sm text-gray-900 mb-3 line-clamp-3">
                {question.questionText.split(' | ')[0]}
              </p>

              {/* Context Snippet */}
              <p className="text-xs text-gray-500 mb-3 line-clamp-2">
                Context: {question.contextSnippet}
              </p>

              {/* Metadata */}
              <div className="flex flex-wrap gap-2 text-xs">
                {question.signalStrength && (
                  <span className="text-gray-500">
                    Strength: {(question.signalStrength * 100).toFixed(0)}%
                  </span>
                )}
                {question.provenance?.latencyMs && (
                  <span className="text-gray-500">
                    {question.provenance.latencyMs}ms
                  </span>
                )}
                {question.provenance?.tokens && (
                  <span className="text-gray-500">
                    {question.provenance.tokens} tokens
                  </span>
                )}
              </div>

              {/* Timestamp */}
              <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
                {new Date(question.generatedAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedQuestion && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setSelectedQuestion(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">
                  {CONTEXT_TYPE_ICONS[selectedQuestion.contextType] || '❓'}
                </span>
                <h2 className="text-lg font-semibold text-gray-900">Question Details</h2>
              </div>
              <button
                onClick={() => setSelectedQuestion(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="px-6 py-4 space-y-4">
              {/* Question Text */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Generated Question(s)</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  {selectedQuestion.questionText.split(' | ').map((q, i) => (
                    <p key={i} className="text-gray-900">
                      {i + 1}. {q}
                    </p>
                  ))}
                </div>
              </div>

              {/* Context */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Context</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                      {selectedQuestion.contextType}
                    </span>
                    <span className="text-xs text-gray-500">
                      ID: {selectedQuestion.contextItemId}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{selectedQuestion.contextSnippet}</p>
                </div>
              </div>

              {/* Generation Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Generation Type</h3>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <span
                      className={`px-2 py-1 text-sm rounded-full ${
                        selectedQuestion.questionType === 'heuristic'
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {selectedQuestion.questionType === 'heuristic' ? 'Heuristic (Tier 1)' : 'AI Generated (Tier 2)'}
                    </span>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Usage</h3>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <span
                      className={`px-2 py-1 text-sm rounded-full ${
                        selectedQuestion.wasUsed
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {selectedQuestion.wasUsed ? 'Used' : 'Not used'}
                    </span>
                    {selectedQuestion.usedAt && (
                      <p className="text-xs text-gray-500 mt-1">
                        Used at: {new Date(selectedQuestion.usedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Signal Details (for heuristic) */}
              {selectedQuestion.signalType && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Signal Detection</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`px-2 py-0.5 text-sm rounded-full ${
                          SIGNAL_TYPE_COLORS[selectedQuestion.signalType] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {selectedQuestion.signalType.replace(/_/g, ' ')}
                      </span>
                      {selectedQuestion.signalStrength && (
                        <span className="text-sm text-gray-600">
                          Strength: {(selectedQuestion.signalStrength * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Provenance (for AI-generated) */}
              {selectedQuestion.provenance && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Generation Provenance</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Service:</span>{' '}
                        <span className="font-medium">{selectedQuestion.provenance.service}</span>
                      </div>
                      {selectedQuestion.provenance.model && (
                        <div>
                          <span className="text-gray-500">Model:</span>{' '}
                          <span className="font-medium">{selectedQuestion.provenance.model}</span>
                        </div>
                      )}
                      {selectedQuestion.provenance.tokens && (
                        <div>
                          <span className="text-gray-500">Tokens:</span>{' '}
                          <span className="font-medium">{selectedQuestion.provenance.tokens}</span>
                        </div>
                      )}
                      {selectedQuestion.provenance.latencyMs && (
                        <div>
                          <span className="text-gray-500">Latency:</span>{' '}
                          <span className="font-medium">{selectedQuestion.provenance.latencyMs}ms</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Related Items */}
              {selectedQuestion.relatedItems && selectedQuestion.relatedItems.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Related Items Used</h3>
                  <div className="space-y-2">
                    {selectedQuestion.relatedItems.map((item, i) => (
                      <div key={i} className="bg-gray-50 rounded-lg p-3 text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                            {item.type}
                          </span>
                          <span className="text-gray-500">
                            {(item.similarity * 100).toFixed(0)}% similar
                          </span>
                        </div>
                        <p className="text-gray-600 line-clamp-2">{item.snippet}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="border-t border-gray-200 pt-4 text-sm text-gray-500">
                <p>Generated: {new Date(selectedQuestion.generatedAt).toLocaleString()}</p>
                <p>User ID: {selectedQuestion.userId}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
