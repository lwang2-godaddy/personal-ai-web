'use client';

import React from 'react';
import {
  Circle,
  CircleInvite,
  CircleDataSharing,
  isPredefinedCircle,
  getPrivacyTierInfo,
} from '@/lib/models/Circle';

interface JoinCircleModalProps {
  visible: boolean;
  invite: CircleInvite | null;
  circle: CirclePreview | null;
  inviterName: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// Circle preview data returned from API
interface CirclePreview {
  id: string;
  name: string;
  emoji?: string;
  description?: string;
  dataSharing: CircleDataSharing;
  memberCount: number;
  isPredefined: boolean;
  privacyTier?: string | null;
}

interface DataSharingItem {
  key: keyof CircleDataSharing;
  icon: string;
  label: string;
  description: string;
}

const DATA_SHARING_ITEMS: DataSharingItem[] = [
  {
    key: 'shareActivities',
    icon: '📊',
    label: 'Activity Stats',
    description: 'Steps, workouts',
  },
  {
    key: 'sharePhotos',
    icon: '📸',
    label: 'Photos',
    description: 'Photo memories',
  },
  {
    key: 'shareLocation',
    icon: '📍',
    label: 'Location',
    description: 'Places visited',
  },
  {
    key: 'shareVoiceNotes',
    icon: '🎤',
    label: 'Voice Notes',
    description: 'Audio transcriptions',
  },
  {
    key: 'shareHealth',
    icon: '❤️',
    label: 'Health Data',
    description: 'Heart rate, sleep',
  },
];

/**
 * JoinCircleModal component (Web)
 * Shows circle info and data sharing disclosure before joining
 */
export const JoinCircleModal: React.FC<JoinCircleModalProps> = ({
  visible,
  invite,
  circle,
  inviterName,
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  if (!visible || !invite) return null;

  // Get circle display info
  const circleEmoji = circle?.emoji || '👥';
  const circleName = circle?.name || 'Circle';
  const memberCount = circle?.memberCount || 0;
  const isPredefined = circle?.isPredefined || false;
  const tierInfo = circle?.privacyTier
    ? getPrivacyTierInfo(circle.privacyTier as 'acquaintances' | 'friends' | 'close_friends' | 'inner_circle')
    : null;

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="join-circle-title"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-md max-h-[85vh] bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4">
          <h2 id="join-circle-title" className="text-xl font-bold text-gray-900">
            Join Circle?
          </h2>
          <button
            onClick={onCancel}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6">
          {/* Circle Info */}
          <div className="text-center py-4">
            <span className="text-5xl">{circleEmoji}</span>
            <h3 className="text-xl font-bold text-gray-900 mt-3 mb-1">{circleName}</h3>
            <p className="text-gray-600">Invited by {inviterName}</p>
            {isPredefined && tierInfo && (
              <span className="inline-block mt-3 px-3 py-1 text-xs font-semibold text-blue-600 bg-blue-50 rounded-full">
                {tierInfo.emoji} Privacy Tier: {tierInfo.name}
              </span>
            )}
          </div>

          {/* Divider */}
          <hr className="border-gray-200 my-4" />

          {/* Data Sharing Disclosure */}
          <div className="py-2">
            <p className="font-semibold text-gray-900 mb-4">
              By joining, you agree to share:
            </p>

            {isLoading && !circle ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-3" />
                <span className="text-gray-600">Loading circle details...</span>
              </div>
            ) : (
              <div className="space-y-3">
                {DATA_SHARING_ITEMS.map((item) => {
                  const isEnabled = circle?.dataSharing?.[item.key] ?? false;
                  return (
                    <div key={item.key} className="flex items-center gap-3">
                      <span
                        className={`font-bold ${
                          isEnabled ? 'text-green-600' : 'text-gray-400'
                        }`}
                      >
                        {isEnabled ? '✓' : '✗'}
                      </span>
                      <span className="text-xl">{item.icon}</span>
                      <div className="flex-1">
                        <span
                          className={`font-medium ${
                            isEnabled ? 'text-gray-900' : 'text-gray-400'
                          }`}
                        >
                          {item.label}
                        </span>
                        <p className="text-xs text-gray-500">{item.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Member count */}
            <p className="text-center text-sm text-gray-500 mt-6">
              {memberCount} member{memberCount !== 1 ? 's' : ''} in this circle
            </p>
          </div>

          {/* Optional invite message */}
          {invite.message && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Personal message:</p>
              <p className="text-gray-700 italic">"{invite.message}"</p>
            </div>
          )}
        </div>

        {/* Divider */}
        <hr className="border-gray-200" />

        {/* Action Buttons */}
        <div className="flex gap-3 p-6">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-3 text-gray-900 font-semibold bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-3 text-white font-semibold bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Join Circle'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default JoinCircleModal;
