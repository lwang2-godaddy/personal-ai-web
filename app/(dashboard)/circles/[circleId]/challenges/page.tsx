'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppSelector } from '@/lib/store/hooks';
import { CircleChallengeCard } from '@/components/circles';
import { useTrackPage } from '@/lib/hooks/useTrackPage';
import { TRACKED_SCREENS } from '@/lib/models/BehaviorEvent';

export default function CircleChallengesPage() {
  useTrackPage(TRACKED_SCREENS.circleChallenges);
  const params = useParams();
  const router = useRouter();
  const circleId = params.circleId as string;

  const { circles } = useAppSelector((state) => state.circles);
  const circle = circles.find((c) => c.id === circleId);

  // TODO: Implement challenges functionality
  // This is a placeholder for Phase 9 implementation

  const mockChallenges = [
    {
      id: 'challenge_1',
      circleId,
      name: '10,000 Steps Challenge',
      description: 'Hit 10,000 steps every day this week',
      type: 'steps' as const,
      goal: 70000,
      unit: 'steps',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdBy: 'user_1',
      participants: ['user_1', 'user_2', 'user_3'],
      status: 'active' as const,
    },
  ];

  const mockUserProgress = {
    userId: 'user_1',
    current: 45000,
    rank: 2,
  };

  if (!circle) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="text-gray-600">Circle not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={() => router.push(`/circles/${circleId}`)}
            className="text-blue-600 hover:text-blue-700 text-sm mb-2"
          >
            ← Back to Circle
          </button>
          <h1 className="text-3xl font-bold">Circle Challenges</h1>
          <p className="text-gray-600 mt-1">{circle.name}</p>
        </div>

        <button
          onClick={() => alert('Create challenge feature coming soon')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Create Challenge
        </button>
      </div>

      {/* Placeholder Notice */}
      <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">
          🚧 Challenges feature is coming soon! This is a placeholder for Phase 9
          implementation.
        </p>
      </div>

      {/* Active Challenges */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Active Challenges</h2>
        <div className="space-y-4">
          {mockChallenges.map((challenge) => (
            <CircleChallengeCard
              key={challenge.id}
              challenge={challenge}
              userProgress={mockUserProgress}
              onPress={() => alert('Challenge details coming soon')}
            />
          ))}
        </div>
      </div>

      {/* Completed Challenges */}
      <div>
        <h2 className="text-xl font-bold mb-4">Completed Challenges</h2>
        <div className="text-center py-8 text-gray-500">
          No completed challenges yet
        </div>
      </div>
    </div>
  );
}
