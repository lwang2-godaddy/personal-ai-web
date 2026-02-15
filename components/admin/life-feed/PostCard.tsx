'use client';

import React from 'react';
import { SourcesSummary } from './SourcesList';
import { GenerationTypeBadge } from './ProvenanceCard';

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

interface Source {
  type: 'health' | 'location' | 'voice' | 'photo' | 'text';
  id: string;
  snippet?: string;
  timestamp?: string;
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

interface PostCardProps {
  post: LifeFeedPost;
  onViewDetails: () => void;
  isSelected?: boolean;
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
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

function truncate(text: string, maxLen: number): string {
  if (!text) return '';
  return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
}

export default function PostCard({ post, onViewDetails, isSelected }: PostCardProps) {
  const typeMeta = getPostTypeMeta(post.type);

  return (
    <div
      className={`bg-white rounded-lg border p-4 transition-all ${
        isSelected
          ? 'border-indigo-400 ring-2 ring-indigo-100'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
      } ${post.flagged ? 'border-l-4 border-l-red-500' : ''}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          {/* Type badge */}
          <span
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: typeMeta.color }}
          >
            <span className="mr-1">{typeMeta.icon}</span>
            {typeMeta.label}
          </span>

          {/* Flagged badge */}
          {post.flagged && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
              Flagged
            </span>
          )}
        </div>

        <span className="text-xs text-gray-400 whitespace-nowrap">
          {formatDate(post.publishedAt || post.generatedAt)}
        </span>
      </div>

      {/* Content preview */}
      <div className="mb-3">
        <p className="text-sm text-gray-900 leading-relaxed">
          {post.emoji && <span className="mr-1">{post.emoji}</span>}
          {truncate(post.content, 150)}
        </p>
      </div>

      {/* Metadata row */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-3">
        {/* Confidence */}
        {post.confidence !== undefined && (
          <span className="flex items-center gap-1">
            <span>📊</span>
            Confidence: {(post.confidence * 100).toFixed(0)}%
          </span>
        )}

        {/* Generation type badge */}
        <GenerationTypeBadge provenance={post.provenance} />

        {/* Sources summary */}
        <SourcesSummary sources={post.sources} />
      </div>

      {/* Hashtags */}
      {post.hashtags && post.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {post.hashtags.slice(0, 5).map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600"
            >
              {tag}
            </span>
          ))}
          {post.hashtags.length > 5 && (
            <span className="text-xs text-gray-400">+{post.hashtags.length - 5} more</span>
          )}
        </div>
      )}

      {/* Engagement */}
      {post.engagement && (
        <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
          <span>{post.engagement.viewed ? '✓ Viewed' : '○ Not viewed'}</span>
          <span>{post.engagement.liked ? '❤️ Liked' : '○ Not liked'}</span>
          {post.engagement.dismissed && <span>🚫 Dismissed</span>}
        </div>
      )}

      {/* View button */}
      <button
        onClick={onViewDetails}
        className={`w-full px-3 py-2 text-sm font-medium rounded-md transition-colors ${
          isSelected
            ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        {isSelected ? 'Hide Details' : 'View Details'}
      </button>
    </div>
  );
}
