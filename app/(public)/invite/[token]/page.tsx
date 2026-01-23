'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAppSelector } from '@/lib/store/hooks';
import { FriendInvitePreview, AcceptFriendInviteResponse } from '@/lib/models/FriendInvite';
import { apiPost } from '@/lib/api/client';

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  const [preview, setPreview] = useState<FriendInvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  // Fetch invite preview
  useEffect(() => {
    async function fetchPreview() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/invites/${token}/preview`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Failed to load invite');
          return;
        }

        setPreview(data.preview);
      } catch (err: any) {
        setError(err.message || 'Failed to load invite');
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      fetchPreview();
    }
  }, [token]);

  // Handle accept invite
  const handleAccept = async () => {
    if (!isAuthenticated) {
      // Redirect to login with return URL
      router.push(`/login?redirect=/invite/${token}`);
      return;
    }

    try {
      setAccepting(true);
      setAcceptError(null);

      const response: AcceptFriendInviteResponse = await apiPost(
        `/api/invites/${token}/accept`,
        {}
      );

      if (response.success) {
        setAccepted(true);
      } else {
        setAcceptError(response.error || 'Failed to accept invite');
      }
    } catch (err: any) {
      setAcceptError(err.message || 'Failed to accept invite');
    } finally {
      setAccepting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading invite...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Error</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
            <Link
              href="/"
              className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Invalid invite state
  if (preview && !preview.isValid) {
    const invalidMessages: Record<string, { title: string; message: string }> = {
      not_found: {
        title: 'Invite Not Found',
        message: 'This invite link is invalid or does not exist.',
      },
      expired: {
        title: 'Invite Expired',
        message: 'This invite has expired. Ask your friend to send a new one.',
      },
      revoked: {
        title: 'Invite Revoked',
        message: 'This invite has been revoked by the sender.',
      },
      exhausted: {
        title: 'Invite Already Used',
        message: 'This invite has already been used and is no longer valid.',
      },
    };

    const { title, message } = invalidMessages[preview.invalidReason || 'expired'] || invalidMessages.expired;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{title}</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{message}</p>
            <Link
              href="/"
              className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Success state (accepted)
  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Friend Added!</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You are now friends with <span className="font-medium text-gray-900 dark:text-white">{preview?.inviterDisplayName}</span>.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Valid invite - show preview
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-center">
            <div className="w-20 h-20 rounded-full border-4 border-white mx-auto mb-3 overflow-hidden bg-white">
              {preview?.inviterPhotoURL ? (
                <Image
                  src={preview.inviterPhotoURL}
                  alt={preview.inviterDisplayName}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-600 text-2xl font-semibold">
                  {preview?.inviterDisplayName?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
            </div>
            <h2 className="text-white text-lg font-semibold">{preview?.inviterDisplayName}</h2>
            <p className="text-blue-100 text-sm">wants to connect with you</p>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="text-center mb-6">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Friend Invitation
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                You have been invited to connect on SirCharge
              </p>
            </div>

            {/* Personal message */}
            {preview?.message && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-6">
                <p className="text-gray-700 dark:text-gray-300 text-sm italic">
                  &ldquo;{preview.message}&rdquo;
                </p>
              </div>
            )}

            {/* Accept error */}
            {acceptError && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                <p className="text-red-700 dark:text-red-400 text-sm">{acceptError}</p>
              </div>
            )}

            {/* Action button */}
            <button
              onClick={handleAccept}
              disabled={accepting}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {accepting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Accepting...
                </>
              ) : isAuthenticated ? (
                'Accept Invitation'
              ) : (
                'Sign In to Accept'
              )}
            </button>

            {/* Sign in hint for unauthenticated users */}
            {!isAuthenticated && (
              <p className="text-center text-gray-500 dark:text-gray-400 text-sm mt-4">
                You need to sign in to accept this invitation.
              </p>
            )}

            {/* App info */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
              <p className="text-gray-500 dark:text-gray-400 text-xs">
                SirCharge is a personal AI assistant that helps you remember everything.
              </p>
              <Link
                href="/about"
                className="text-blue-600 dark:text-blue-400 text-xs hover:underline mt-1 inline-block"
              >
                Learn more
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
