'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { fetchCircles } from '@/lib/store/slices/circleSlice';
import CircleCard from '@/components/circles/CircleCard';

/**
 * Circles list page
 * Shows all circles the user is a member of
 */
export default function CirclesPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { circles, isLoading, error, loadingStatus } = useAppSelector((state) => state.circles);

  useEffect(() => {
    if (user?.uid) {
      dispatch(fetchCircles());
    }
  }, [dispatch, user?.uid]);

  const handleCirclePress = (circleId: string) => {
    router.push(`/circles/${circleId}`);
  };

  const handleCreateCircle = () => {
    router.push('/circles/create');
  };

  const handleViewInvites = () => {
    router.push('/circles/invites');
  };

  if (loadingStatus.circles === 'loading' && circles.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && circles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Circles</h2>
        <p className="text-gray-600 mb-6 text-center">{error}</p>
        <button
          onClick={() => user?.uid && dispatch(fetchCircles())}
          className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Circles</h1>
        <div className="flex gap-3">
          <button
            onClick={handleViewInvites}
            className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            Invites
          </button>
          <button
            onClick={handleCreateCircle}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Create Circle
          </button>
        </div>
      </div>

      {/* Circles List */}
      {circles.length > 0 ? (
        <div className="space-y-4">
          {circles.map((circle) => (
            <CircleCard
              key={circle.id}
              circle={circle}
              onPress={() => handleCirclePress(circle.id)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="text-6xl mb-4">👥</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Circles Yet</h2>
          <p className="text-gray-600 mb-6 text-center max-w-md">
            Create your first circle to start sharing data and chatting with friends
          </p>
          <button
            onClick={handleCreateCircle}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Create Circle
          </button>
        </div>
      )}
    </div>
  );
}
