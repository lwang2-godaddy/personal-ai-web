'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/lib/store/hooks';
import { CircleInvite } from '@/lib/models/Circle';

export default function CircleInvitesPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const { user } = useAppSelector((state) => state.auth);
  const [invites, setInvites] = useState<CircleInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingInviteId, setProcessingInviteId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchInvites();
    }
  }, [user?.uid]);

  const fetchInvites = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/circles/invites', {
        headers: {
          Authorization: `Bearer ${await user?.getIdToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch invites');
      }

      const data = await response.json();
      setInvites(data.invites);
    } catch (error: any) {
      console.error('Error fetching invites:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async (inviteId: string) => {
    try {
      setProcessingInviteId(inviteId);
      setError(null);

      const response = await fetch(`/api/circles/invites/${inviteId}/accept`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${await user?.getIdToken()}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to accept invite');
      }

      alert('Invite accepted! You are now a member of the circle.');
      fetchInvites();
    } catch (error: any) {
      console.error('Error accepting invite:', error);
      setError(error.message);
    } finally {
      setProcessingInviteId(null);
    }
  };

  const handleReject = async (inviteId: string) => {
    if (!confirm('Are you sure you want to reject this invite?')) {
      return;
    }

    try {
      setProcessingInviteId(inviteId);
      setError(null);

      const response = await fetch(`/api/circles/invites/${inviteId}/reject`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${await user?.getIdToken()}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reject invite');
      }

      alert('Invite rejected');
      fetchInvites();
    } catch (error: any) {
      console.error('Error rejecting invite:', error);
      setError(error.message);
    } finally {
      setProcessingInviteId(null);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  const isExpired = (expiresAt: string): boolean => {
    return new Date(expiresAt) < new Date();
  };

  const pendingInvites = invites.filter(
    (invite) => invite.status === 'pending' && !isExpired(invite.expiresAt)
  );
  const otherInvites = invites.filter(
    (invite) => invite.status !== 'pending' || isExpired(invite.expiresAt)
  );

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="text-gray-600">Loading invites...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/circles')}
          className="text-blue-600 hover:text-blue-700 text-sm mb-2"
        >
          ← Back to Circles
        </button>
        <h1 className="text-3xl font-bold">Circle Invites</h1>
        <p className="text-gray-600 mt-1">
          {pendingInvites.length} pending invite{pendingInvites.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Pending Invites */}
      {pendingInvites.length > 0 ? (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Pending Invites</h2>
          <div className="space-y-4">
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="p-4 bg-white rounded-lg border-2 border-blue-200"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">👥</span>
                      <h3 className="font-semibold text-gray-900">
                        Circle Invite from {invite.fromUserId}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      Invited {formatDate(invite.createdAt)}
                    </p>
                    {invite.message && (
                      <p className="text-sm text-gray-700 mt-2 italic">"{invite.message}"</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleReject(invite.id)}
                    disabled={processingInviteId === invite.id}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleAccept(invite.id)}
                    disabled={processingInviteId === invite.id}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {processingInviteId === invite.id ? 'Processing...' : 'Accept'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Pending Invites</h2>
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-600">No pending invites</p>
          </div>
        </div>
      )}

      {/* Other Invites (Accepted/Rejected/Expired) */}
      {otherInvites.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4">Past Invites</h2>
          <div className="space-y-3">
            {otherInvites.map((invite) => {
              const expired = isExpired(invite.expiresAt);
              const statusColor =
                invite.status === 'accepted'
                  ? 'bg-green-100 text-green-800'
                  : invite.status === 'rejected'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-800';

              return (
                <div
                  key={invite.id}
                  className="p-4 bg-white rounded-lg border border-gray-200 opacity-60"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">👥</span>
                        <h3 className="font-medium text-gray-900">
                          Circle Invite from {invite.fromUserId}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600">
                        Invited {formatDate(invite.createdAt)}
                      </p>
                    </div>
                    <span
                      className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${statusColor}`}
                    >
                      {expired && invite.status === 'pending'
                        ? 'Expired'
                        : invite.status.charAt(0).toUpperCase() + invite.status.slice(1)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
