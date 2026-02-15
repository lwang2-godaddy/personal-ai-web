'use client';

import React from 'react';

interface CheckIn {
  id: string;
  userId: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: string;
  activity: string | null;
  activityTaggedAt: string | null;
  address: string;
  placeName: string | null;
  duration: number;
  visitCount: number;
  embeddingId: string | null;
  isManualCheckIn: boolean;
  savedPlaceId: string | null;
  note: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface CheckInDetailModalProps {
  checkIn: CheckIn;
  onClose: () => void;
}

function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleString();
  } catch {
    return dateStr;
  }
}

function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return '-';
  if (minutes < 60) return `${Math.round(minutes)} minutes`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours} hours`;
}

export default function CheckInDetailModal({ checkIn, onClose }: CheckInDetailModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📍</span>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Check-In Details</h2>
              <p className="text-sm text-gray-500">
                {checkIn.activity || 'Unknown Activity'} &middot;{' '}
                {checkIn.isManualCheckIn ? 'Manual' : 'Automatic'}
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
              <span className="text-gray-500 block text-xs">Document ID</span>
              <span className="font-mono text-xs text-gray-900 break-all">{checkIn.id}</span>
            </div>
            <div className="bg-gray-50 rounded-md p-2">
              <span className="text-gray-500 block text-xs">User ID</span>
              <span className="font-mono text-xs text-gray-900 break-all">{checkIn.userId}</span>
            </div>
            <div className="bg-gray-50 rounded-md p-2">
              <span className="text-gray-500 block text-xs">Timestamp</span>
              <span className="text-xs text-gray-900">{formatDate(checkIn.timestamp)}</span>
            </div>
            <div className="bg-gray-50 rounded-md p-2">
              <span className="text-gray-500 block text-xs">Check-In Type</span>
              <span className="text-xs text-gray-900">
                {checkIn.isManualCheckIn ? 'Manual' : 'Automatic'}
              </span>
            </div>
          </div>

          {/* Location Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <span>📍</span> Location
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-3">
              {checkIn.placeName && (
                <div>
                  <span className="text-xs text-gray-500">Place Name</span>
                  <p className="text-sm text-gray-900 font-medium">{checkIn.placeName}</p>
                </div>
              )}
              <div>
                <span className="text-xs text-gray-500">Address</span>
                <p className="text-sm text-gray-900">{checkIn.address || '-'}</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <span className="text-xs text-gray-500">Latitude</span>
                  <p className="text-sm font-mono text-gray-900">{checkIn.latitude.toFixed(6)}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Longitude</span>
                  <p className="text-sm font-mono text-gray-900">{checkIn.longitude.toFixed(6)}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Accuracy</span>
                  <p className="text-sm text-gray-900">
                    {checkIn.accuracy != null ? `${checkIn.accuracy.toFixed(1)}m` : '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <span>🏷️</span> Activity
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <span className="text-xs text-gray-500">Activity</span>
                  <p className="text-sm text-gray-900">{checkIn.activity || '-'}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Tagged At</span>
                  <p className="text-sm text-gray-900">{formatDate(checkIn.activityTaggedAt)}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Visit Count</span>
                  <p className="text-sm text-gray-900">{checkIn.visitCount || 0}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Duration</span>
                  <p className="text-sm text-gray-900">{formatDuration(checkIn.duration)}</p>
                </div>
              </div>
              {checkIn.note && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <span className="text-xs text-gray-500">Note</span>
                  <p className="text-sm text-gray-900">{checkIn.note}</p>
                </div>
              )}
            </div>
          </div>

          {/* Embedding & References */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <span>🔗</span> References
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-gray-500">Embedding ID</span>
                  <p className="text-sm font-mono text-gray-900 break-all">
                    {checkIn.embeddingId || (
                      <span className="text-yellow-600">Not indexed</span>
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Saved Place ID</span>
                  <p className="text-sm font-mono text-gray-900 break-all">
                    {checkIn.savedPlaceId || '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <span>🕐</span> Timestamps
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-md p-3">
                <span className="text-xs text-gray-500 block">Timestamp</span>
                <span className="text-sm text-gray-900">{formatDate(checkIn.timestamp)}</span>
              </div>
              <div className="bg-gray-50 rounded-md p-3">
                <span className="text-xs text-gray-500 block">Created At</span>
                <span className="text-sm text-gray-900">{formatDate(checkIn.createdAt)}</span>
              </div>
              <div className="bg-gray-50 rounded-md p-3">
                <span className="text-xs text-gray-500 block">Updated At</span>
                <span className="text-sm text-gray-900">{formatDate(checkIn.updatedAt)}</span>
              </div>
            </div>
          </div>
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
