'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { useAppSelector, useAppDispatch } from '@/lib/store/hooks';
import { refreshUserDataThunk } from '@/lib/store/slices/authSlice';
import { hasWebAccess, normalizeTier } from '@/lib/models/Subscription';
import Link from 'next/link';

interface WebAccessGuardProps {
  children: ReactNode;
}

/**
 * Guard component that checks if user has Pro tier subscription
 * Only Pro tier users can access the web dashboard
 */
export function WebAccessGuard({ children }: WebAccessGuardProps) {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, isLoading } = useAppSelector((state) => state.auth);
  const lastRefreshedUserId = useRef<string | null>(null);

  // Refresh user data from Firestore on mount or when user changes
  useEffect(() => {
    if (user?.uid && lastRefreshedUserId.current !== user.uid) {
      lastRefreshedUserId.current = user.uid;
      dispatch(refreshUserDataThunk(user.uid));
    }
  }, [user?.uid, dispatch]);

  // Still loading auth state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - AuthGuard should handle this, but just in case
  if (!isAuthenticated || !user) {
    return null;
  }

  // Check if user is admin (admins always have access)
  const isAdmin = user.role === 'admin';

  // Check subscription tier
  const userTier = normalizeTier(user.subscription?.tier);
  const hasAccess = isAdmin || hasWebAccess(userTier);

  // User doesn't have web access - show upgrade prompt
  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
          {/* Lock Icon */}
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Pro Subscription Required
          </h1>

          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The web dashboard is available exclusively for <span className="font-semibold text-purple-600 dark:text-purple-400">Pro</span> subscribers.
          </p>

          {/* Current Plan Badge */}
          <div className="inline-flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-full mb-6">
            <span className="text-sm text-gray-600 dark:text-gray-400">Your current plan:</span>
            <span className="ml-2 font-semibold text-gray-900 dark:text-white capitalize">{userTier}</span>
          </div>

          {/* Pro Benefits */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-6 text-left">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Pro includes:</h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-center">
                <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Web dashboard access
              </li>
              <li className="flex items-center">
                <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                1,000 messages/month
              </li>
              <li className="flex items-center">
                <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                200 photos/month
              </li>
              <li className="flex items-center">
                <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                1,000 min voice/month
              </li>
              <li className="flex items-center">
                <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                5 min recordings (vs 30s)
              </li>
            </ul>
          </div>

          {/* Upgrade CTA */}
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Upgrade to Pro in the mobile app for <span className="font-semibold">$5.99/month</span>
          </p>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <Link
              href="/login"
              className="w-full py-3 px-4 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
            >
              Sign Out
            </Link>
          </div>

          {/* Footer Note */}
          <p className="mt-6 text-xs text-gray-400 dark:text-gray-500">
            Already a Pro subscriber? Make sure you&apos;re signed in with the same account used in the mobile app.
          </p>
        </div>
      </div>
    );
  }

  // User has access - render children
  return <>{children}</>;
}
