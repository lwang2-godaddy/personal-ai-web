/**
 * Authentication Hook
 * Client-side hook for accessing auth state and getting ID tokens
 */

'use client';

import { useAppSelector } from '@/lib/store/hooks';
// Import auth from config to ensure Firebase is initialized
import { auth } from '@/lib/api/firebase/config';

/**
 * useAuth Hook
 * Provides access to authentication state and helpers
 *
 * Returns:
 * - user: Current user object (with role and status)
 * - isAuthenticated: Boolean indicating if user is logged in
 * - isAdmin: Boolean indicating if user has admin role
 * - isLoading: Boolean indicating if auth state is being loaded
 * - getIdToken: Async function to get Firebase ID token for API calls
 */
export function useAuth() {
  const { user, isAuthenticated, isLoading } = useAppSelector((state) => state.auth);

  /**
   * Get Firebase ID token for authenticated API calls
   * This token should be sent in the Authorization header: Bearer <token>
   *
   * @param forceRefresh - If true, forces token refresh even if not expired
   * @returns Firebase ID token string
   * @throws Error if user is not logged in
   */
  const getIdToken = async (forceRefresh = false): Promise<string> => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error('No user logged in. Please sign in first.');
    }

    try {
      const token = await currentUser.getIdToken(forceRefresh);
      return token;
    } catch (error: any) {
      console.error('[useAuth] Error getting ID token:', error);
      throw new Error(`Failed to get ID token: ${error.message}`);
    }
  };

  /**
   * Check if current user is an admin
   * Note: This should NOT be used for security checks (server must verify)
   * Only use for UI display logic (showing/hiding admin features)
   */
  const isAdmin = user?.role === 'admin';

  /**
   * Check if current user account is suspended
   */
  const isSuspended = user?.accountStatus === 'suspended';

  return {
    user,
    isAuthenticated,
    isAdmin,
    isSuspended,
    isLoading,
    getIdToken,
  };
}
