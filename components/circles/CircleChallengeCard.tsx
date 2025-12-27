'use client';

import React from 'react';

interface CircleChallenge {
  id: string;
  circleId: string;
  name: string;
  description: string;
  type: 'steps' | 'distance' | 'duration' | 'frequency';
  goal: number;
  unit: string;
  startDate: string;
  endDate: string;
  createdBy: string;
  participants: string[];
  status: 'active' | 'completed' | 'cancelled';
}

interface UserProgress {
  userId: string;
  current: number;
  rank: number;
}

interface CircleChallengeCardProps {
  challenge: CircleChallenge;
  userProgress: UserProgress;
  onPress?: () => void;
}

export const CircleChallengeCard: React.FC<CircleChallengeCardProps> = ({
  challenge,
  userProgress,
  onPress,
}) => {
  const getProgressPercent = (): number => {
    return Math.min(Math.round((userProgress.current / challenge.goal) * 100), 100);
  };

  const formatValue = (value: number): string => {
    if (challenge.type === 'steps') {
      return value.toLocaleString();
    }
    if (challenge.type === 'distance') {
      return `${(value / 1000).toFixed(1)}km`;
    }
    if (challenge.type === 'duration') {
      const hours = Math.floor(value / 60);
      const mins = value % 60;
      return `${hours}h ${mins}m`;
    }
    return value.toString();
  };

  const getDaysRemaining = (): number => {
    const endDate = new Date(challenge.endDate);
    const now = new Date();
    const diffMs = endDate.getTime() - now.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  const getChallengeIcon = () => {
    switch (challenge.type) {
      case 'steps':
        return '👟';
      case 'distance':
        return '🏃';
      case 'duration':
        return '⏱️';
      case 'frequency':
        return '📊';
      default:
        return '🏆';
    }
  };

  const getStatusBadgeColor = () => {
    switch (challenge.status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const progressPercent = getProgressPercent();
  const daysRemaining = getDaysRemaining();

  return (
    <div
      onClick={onPress}
      className={`p-4 bg-white rounded-lg border border-gray-200 ${
        onPress ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3">
          <span className="text-3xl">{getChallengeIcon()}</span>
          <div>
            <h3 className="font-semibold text-gray-900">{challenge.name}</h3>
            <p className="text-sm text-gray-600 mt-1">{challenge.description}</p>
          </div>
        </div>
        <span
          className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor()}`}
        >
          {challenge.status.charAt(0).toUpperCase() + challenge.status.slice(1)}
        </span>
      </div>

      {/* Goal and Progress */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-gray-600">
            Goal: {formatValue(challenge.goal)} {challenge.unit}
          </span>
          <span className="text-gray-600">
            Your Progress: {formatValue(userProgress.current)}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
          <span>{progressPercent}% complete</span>
          {challenge.status === 'active' && (
            <span>
              {daysRemaining > 0
                ? `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left`
                : 'Ending today'}
            </span>
          )}
        </div>
      </div>

      {/* Leaderboard Preview */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-600">Your Rank:</span>
        <span className="font-semibold text-gray-900">#{userProgress.rank}</span>
        <span className="text-gray-500">of {challenge.participants.length}</span>
      </div>
    </div>
  );
};
