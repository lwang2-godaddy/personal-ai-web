'use client';

import React from 'react';
import SourcesList from './SourcesList';
import ProvenanceCard from './ProvenanceCard';

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
}

interface PostDetailModalProps {
  post: LifeFeedPost;
  execution: PromptExecution | null | undefined;
  loadingExecution: boolean;
  onClose: () => void;
}

// Post type metadata
const POST_TYPES: Record<string, { label: string; icon: string; color: string }> = {
  life_summary: { label: 'Life Update', icon: '📋', color: '#607D8B' },
  milestone: { label: 'Milestone', icon: '🏆', color: '#FFC107' },
  pattern_prediction: { label: 'Prediction', icon: '🔮', color: '#9C27B0' },
  reflective_insight: { label: 'Insight', icon: '💡', color: '#03A9F4' },
  memory_highlight: { label: 'Memory', icon: '📸', color: '#E91E63' },
  streak_achievement: { label: 'Streak', icon: '🔥', color: '#FF5722' },
  comparison: { label: 'Comparison', icon: '📊', color: '#00BCD4' },
  seasonal_reflection: { label: 'Reflection', icon: '🌟', color: '#8BC34A' },
  activity_pattern: { label: 'Pattern', icon: '🔄', color: '#673AB7' },
  health_alert: { label: 'Health Alert', icon: '❤️', color: '#F44336' },
  category_insight: { label: 'Category', icon: '📊', color: '#4CAF50' },
  fun_fact: { label: 'Fun Fact', icon: '✨', color: '#FF9800' },
};

function getPostTypeMeta(type: string) {
  return POST_TYPES[type] || { label: type, icon: '📝', color: '#999' };
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleString();
  } catch {
    return dateStr;
  }
}

export default function PostDetailModal({
  post,
  execution,
  loadingExecution,
  onClose,
}: PostDetailModalProps) {
  const typeMeta = getPostTypeMeta(post.type);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{typeMeta.icon}</span>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Post Details</h2>
              <p className="text-sm text-gray-500">
                {typeMeta.label} &middot; {post.category}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="bg-gray-50 rounded-md p-2">
              <span className="text-gray-500 block text-xs">Post ID</span>
              <span className="font-mono text-xs text-gray-900 break-all">{post.id}</span>
            </div>
            <div className="bg-gray-50 rounded-md p-2">
              <span className="text-gray-500 block text-xs">User ID</span>
              <span className="font-mono text-xs text-gray-900 break-all">{post.userId}</span>
            </div>
            <div className="bg-gray-50 rounded-md p-2">
              <span className="text-gray-500 block text-xs">Published</span>
              <span className="text-xs text-gray-900">
                {formatDate(post.publishedAt || post.generatedAt)}
              </span>
            </div>
            <div className="bg-gray-50 rounded-md p-2">
              <span className="text-gray-500 block text-xs">Confidence</span>
              <span className="text-xs text-gray-900">
                {post.confidence !== undefined
                  ? `${(post.confidence * 100).toFixed(1)}%`
                  : '-'}
              </span>
            </div>
          </div>

          {/* Content Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <span>📝</span> Content
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-start gap-2">
                {post.emoji && <span className="text-2xl">{post.emoji}</span>}
                <div className="flex-1">
                  <p className="text-gray-900 whitespace-pre-wrap">{post.content}</p>
                  {post.contentWithEmoji && post.contentWithEmoji !== post.content && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">With Emoji:</p>
                      <p className="text-gray-700">{post.contentWithEmoji}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Hashtags */}
              {post.hashtags && post.hashtags.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">Hashtags:</p>
                  <div className="flex flex-wrap gap-1">
                    {post.hashtags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Date Range */}
              {post.dateRange && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Date Range:</p>
                  <p className="text-sm text-gray-700">
                    {formatDate(post.dateRange.start)} - {formatDate(post.dateRange.end)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Generation Info */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <span>⚙️</span> Generation Info
            </h3>
            <ProvenanceCard
              provenance={post.provenance}
              execution={execution}
              loadingExecution={loadingExecution}
            />
          </div>

          {/* Input Sources */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <span>📥</span> Input Sources ({post.sources?.length || 0} items)
            </h3>
            <div className="max-h-96 overflow-y-auto">
              <SourcesList sources={post.sources || []} />
            </div>
          </div>

          {/* Engagement */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <span>📊</span> Engagement
            </h3>
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-gray-50 rounded-md p-3 text-center">
                <span className="text-xl">{post.engagement?.viewed ? '✓' : '○'}</span>
                <p className="text-xs text-gray-500 mt-1">Viewed</p>
              </div>
              <div className="bg-gray-50 rounded-md p-3 text-center">
                <span className="text-xl">{post.engagement?.liked ? '❤️' : '○'}</span>
                <p className="text-xs text-gray-500 mt-1">Liked</p>
              </div>
              <div className="bg-gray-50 rounded-md p-3 text-center">
                <span className="text-xl">{post.engagement?.shared ? '🔗' : '○'}</span>
                <p className="text-xs text-gray-500 mt-1">Shared</p>
              </div>
              <div className="bg-gray-50 rounded-md p-3 text-center">
                <span className="text-xl">{post.engagement?.dismissed ? '🚫' : '○'}</span>
                <p className="text-xs text-gray-500 mt-1">Dismissed</p>
              </div>
            </div>
          </div>

          {/* Flagged Warning */}
          {post.flagged && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚠️</span>
                <div>
                  <p className="font-medium text-red-700">This post is flagged</p>
                  <p className="text-sm text-red-600">
                    Content may have been flagged for review by moderation systems.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
