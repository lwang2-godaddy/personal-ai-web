'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppSelector } from '@/lib/store/hooks';
import { apiGet } from '@/lib/api/client';
import { CircleInsightCard } from '@/components/circles';

interface CircleAnalytics {
  id: string;
  circleId: string;
  generatedAt: string;
  totalActivities: number;
  totalMessages: number;
  activeMemberCount: number;
  activeChallenges: number;
  completedChallenges: number;
  topContributors: Array<{
    userId: string;
    activityCount: number;
    messageCount: number;
  }>;
  insights: Array<{
    type: 'pattern' | 'achievement' | 'suggestion';
    title: string;
    description: string;
    confidence: number;
  }>;
}

export default function CircleAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const circleId = params.circleId as string;

  const { user } = useAppSelector((state) => state.auth);
  const { circles } = useAppSelector((state) => state.circles);
  const circle = circles.find((c) => c.id === circleId);

  const [analytics, setAnalytics] = useState<CircleAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (circle && user) {
      fetchAnalytics();
    }
  }, [circleId, user?.uid]);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await apiGet<{ analytics: CircleAnalytics | null }>(`/api/circles/${circleId}/analytics`);
      setAnalytics(data.analytics);
    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="text-gray-600">Loading analytics...</div>
        </div>
      </div>
    );
  }

  if (!circle) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="text-gray-600">Circle not found</div>
        </div>
      </div>
    );
  }

  // Mock analytics data (placeholder for Phase 9)
  const mockAnalytics: CircleAnalytics = {
    id: 'analytics_1',
    circleId,
    generatedAt: new Date().toISOString(),
    totalActivities: 145,
    totalMessages: 89,
    activeMemberCount: 5,
    activeChallenges: 2,
    completedChallenges: 7,
    topContributors: [
      { userId: 'user_1', activityCount: 45, messageCount: 30 },
      { userId: 'user_2', activityCount: 38, messageCount: 25 },
      { userId: 'user_3', activityCount: 32, messageCount: 20 },
    ],
    insights: [
      {
        type: 'pattern',
        title: 'Peak Activity Time',
        description:
          'Your circle is most active on Tuesday evenings between 7-9 PM. This is the best time to schedule group challenges.',
        confidence: 87,
      },
      {
        type: 'achievement',
        title: 'Consistency Champions',
        description:
          'All members have been active at least 4 times this week. Great teamwork!',
        confidence: 95,
      },
      {
        type: 'suggestion',
        title: 'Try a Distance Challenge',
        description:
          'Based on your activity patterns, a weekly distance challenge could boost engagement by 30%.',
        confidence: 72,
      },
    ],
  };

  const displayAnalytics = analytics || mockAnalytics;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push(`/circles/${circleId}`)}
          className="text-blue-600 hover:text-blue-700 text-sm mb-2"
        >
          ← Back to Circle
        </button>
        <h1 className="text-3xl font-bold">Circle Analytics</h1>
        <p className="text-gray-600 mt-1">
          {circle.name} •{' '}
          {!analytics && (
            <span className="text-yellow-600">Using mock data (Phase 9 placeholder)</span>
          )}
          {analytics && (
            <span>Generated {new Date(displayAnalytics.generatedAt).toLocaleDateString()}</span>
          )}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Placeholder Notice */}
      {!analytics && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800">
            🚧 Analytics generation is coming soon! Showing mock data for now (Phase 9
            implementation).
          </p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">
            {displayAnalytics.totalActivities}
          </div>
          <div className="text-sm text-gray-600">Total Activities</div>
        </div>
        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">
            {displayAnalytics.totalMessages}
          </div>
          <div className="text-sm text-gray-600">Messages Sent</div>
        </div>
        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">
            {displayAnalytics.activeMemberCount}
          </div>
          <div className="text-sm text-gray-600">Active Members</div>
        </div>
      </div>

      {/* AI Insights */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">AI-Generated Insights</h2>
        <div className="space-y-4">
          {displayAnalytics.insights.map((insight, index) => (
            <CircleInsightCard key={index} insight={insight} />
          ))}
        </div>
      </div>

      {/* Top Contributors */}
      <div>
        <h2 className="text-xl font-bold mb-4">Top Contributors</h2>
        <div className="bg-white rounded-lg border border-gray-200">
          {displayAnalytics.topContributors.map((contributor, index) => (
            <div
              key={contributor.userId}
              className="flex items-center justify-between p-4 border-b border-gray-200 last:border-b-0"
            >
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                  #{index + 1}
                </div>
                <div>
                  <div className="font-medium text-gray-900">{contributor.userId}</div>
                  <div className="text-sm text-gray-600">
                    {contributor.activityCount} activities • {contributor.messageCount}{' '}
                    messages
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
