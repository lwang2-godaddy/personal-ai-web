'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiGet } from '@/lib/api/client';

/**
 * Analytics data structure from the API
 */
interface MoodCompassAnalytics {
  totalEntries: number;
  entriesLast7d: number;
  entriesGrowth7d: number;
  activeUsersWithMood: number;
  usersGrowth7d: number;
  avgSentiment: number;
  emotionDistribution: Record<string, number>;
  topCorrelations: Array<{
    factor: string;
    factorValue: string;
    moodEffect: string;
    avgDelta: number;
    userCount: number;
  }>;
  patternStats: {
    total: number;
    byType: Record<string, number>;
  };
}

interface MoodCompassAnalyticsPanelProps {
  enabled: boolean;
}

/**
 * MoodCompassAnalyticsPanel - Displays analytics for the Mood Compass feature
 * Shows:
 * - Total entries, active users, average sentiment
 * - Top correlations discovered across users
 * - Emotion distribution chart
 */
export default function MoodCompassAnalyticsPanel({ enabled }: MoodCompassAnalyticsPanelProps) {
  const [analytics, setAnalytics] = useState<MoodCompassAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiGet<{ analytics: MoodCompassAnalytics }>(
        '/api/admin/insights/mood-compass/analytics'
      );
      setAnalytics(result.analytics);
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      fetchAnalytics();
    }
  }, [enabled, fetchAnalytics]);

  if (!enabled) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
        <p className="text-sm text-gray-500 text-center">
          Enable Mood Compass to view analytics
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-4">
        <div className="flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mr-2"></div>
          <span className="text-purple-700 text-sm">Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={fetchAnalytics}
          className="mt-2 text-sm text-red-700 underline hover:text-red-800"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  // Format sentiment score
  const formatSentiment = (score: number) => {
    if (score > 0.2) return { label: 'Positive', color: 'text-green-600', bg: 'bg-green-100' };
    if (score < -0.2) return { label: 'Negative', color: 'text-red-600', bg: 'bg-red-100' };
    return { label: 'Neutral', color: 'text-gray-600', bg: 'bg-gray-100' };
  };

  const sentimentDisplay = formatSentiment(analytics.avgSentiment);

  // Format growth percentage
  const formatGrowth = (value: number) => {
    if (value > 0) return `+${value.toFixed(0)}%`;
    if (value < 0) return `${value.toFixed(0)}%`;
    return '0%';
  };

  // Get emotion emoji
  const getEmotionEmoji = (emotion: string): string => {
    const emojiMap: Record<string, string> = {
      joy: '😊',
      excitement: '🎉',
      contentment: '😌',
      calm: '😇',
      stress: '😰',
      anxiety: '😟',
      sadness: '😢',
      anger: '😠',
      neutral: '😐',
      mixed: '🤔',
    };
    return emojiMap[emotion] || '📊';
  };

  // Get factor emoji
  const getFactorEmoji = (factor: string): string => {
    const emojiMap: Record<string, string> = {
      sleep: '😴',
      exercise: '💪',
      steps: '👟',
      location: '📍',
      activity: '🏃',
      weather: '🌤️',
      socialActivity: '👥',
    };
    return emojiMap[factor] || '📊';
  };

  // Sort emotions by count
  const sortedEmotions = Object.entries(analytics.emotionDistribution)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const maxEmotionCount = Math.max(...sortedEmotions.map(([, count]) => count), 1);

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-purple-900 flex items-center gap-2">
          <span>📊</span> Mood Compass Analytics
        </h4>
        <button
          onClick={fetchAnalytics}
          className="text-purple-600 hover:text-purple-800 text-sm flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        {/* Total Entries */}
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Total Entries</p>
          <p className="text-2xl font-bold text-gray-900">
            {analytics.totalEntries.toLocaleString()}
          </p>
          <p
            className={`text-xs ${analytics.entriesGrowth7d >= 0 ? 'text-green-600' : 'text-red-600'}`}
          >
            {formatGrowth(analytics.entriesGrowth7d)} 7d
          </p>
        </div>

        {/* Active Users */}
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Active Users</p>
          <p className="text-2xl font-bold text-gray-900">{analytics.activeUsersWithMood}</p>
          <p
            className={`text-xs ${analytics.usersGrowth7d >= 0 ? 'text-green-600' : 'text-red-600'}`}
          >
            {formatGrowth(analytics.usersGrowth7d)} 7d
          </p>
        </div>

        {/* Average Sentiment */}
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Avg Sentiment</p>
          <p className="text-2xl font-bold text-gray-900">
            {analytics.avgSentiment >= 0 ? '+' : ''}
            {analytics.avgSentiment.toFixed(2)}
          </p>
          <span className={`text-xs px-2 py-0.5 rounded-full ${sentimentDisplay.bg} ${sentimentDisplay.color}`}>
            {sentimentDisplay.label}
          </span>
        </div>
      </div>

      {/* Top Correlations */}
      {analytics.topCorrelations.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-medium text-purple-800 mb-2">Top Correlations Discovered</p>
          <div className="bg-white rounded-lg p-3 shadow-sm space-y-2">
            {analytics.topCorrelations.slice(0, 3).map((corr, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span>{getFactorEmoji(corr.factor)}</span>
                  <span className="text-gray-700">
                    {corr.factorValue.charAt(0).toUpperCase() + corr.factorValue.slice(1)} →{' '}
                    <span
                      className={corr.moodEffect === 'positive' ? 'text-green-600' : 'text-red-600'}
                    >
                      {corr.avgDelta >= 0 ? '+' : ''}
                      {(corr.avgDelta * 100).toFixed(0)}% mood
                    </span>
                  </span>
                </div>
                <span className="text-gray-400 text-xs">({corr.userCount} users)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Emotion Distribution */}
      {sortedEmotions.length > 0 && (
        <div>
          <p className="text-sm font-medium text-purple-800 mb-2">Emotion Distribution (Last 30d)</p>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="space-y-2">
              {sortedEmotions.map(([emotion, count]) => {
                const percentage = (count / maxEmotionCount) * 100;
                return (
                  <div key={emotion} className="flex items-center gap-2">
                    <span className="w-6 text-center">{getEmotionEmoji(emotion)}</span>
                    <span className="w-20 text-xs text-gray-600 capitalize">{emotion}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-purple-400 h-full rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="w-10 text-xs text-gray-500 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Pattern Stats */}
      {analytics.patternStats.total > 0 && (
        <div className="mt-4 text-xs text-purple-600">
          <span className="font-medium">{analytics.patternStats.total}</span> patterns detected across
          all users
        </div>
      )}
    </div>
  );
}
