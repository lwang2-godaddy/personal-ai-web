/**
 * Authentication Middleware for API Routes
 * Verifies Firebase ID tokens and checks user roles/status
 *
 * Usage:
 * - requireAuth() - Require any authenticated user
 * - requireAdmin() - Require admin role
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '@/lib/api/firebase/admin';

/**
 * Authenticated user information
 */
export interface AuthenticatedUser {
  uid: string;
  email: string | null;
  role: 'admin' | 'user';
  accountStatus: 'active' | 'suspended';
}

/**
 * Result of authentication verification
 */
interface AuthResult {
  user: AuthenticatedUser | null;
  error: string | null;
}

/**
 * Verify Firebase ID token from Authorization header
 * Returns user info if valid, error if invalid
 */
export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
  try {
    // Get Authorization header
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return { user: null, error: 'Missing Authorization header' };
    }

    if (!authHeader.startsWith('Bearer ')) {
      return { user: null, error: 'Invalid Authorization header format. Expected: Bearer <token>' };
    }

    // Extract ID token
    const idToken = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!idToken) {
      return { user: null, error: 'Empty ID token' };
    }

    // Verify ID token with Firebase Admin SDK
    const auth = getAdminAuth();
    let decodedToken;

    try {
      decodedToken = await auth.verifyIdToken(idToken);
    } catch (verifyError: any) {
      console.error('[Auth Middleware] Token verification failed:', verifyError.message);

      // Provide specific error messages for common issues
      if (verifyError.code === 'auth/id-token-expired') {
        return { user: null, error: 'ID token has expired. Please sign in again.' };
      } else if (verifyError.code === 'auth/id-token-revoked') {
        return { user: null, error: 'ID token has been revoked. Please sign in again.' };
      } else if (verifyError.code === 'auth/invalid-id-token') {
        return { user: null, error: 'Invalid ID token. Please sign in again.' };
      } else {
        return { user: null, error: 'Token verification failed' };
      }
    }

    // Get user data from Firestore to check role and status
    const db = getAdminFirestore();
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();

    if (!userDoc.exists) {
      return { user: null, error: 'User not found in database' };
    }

    const userData = userDoc.data();

    if (!userData) {
      return { user: null, error: 'User data is empty' };
    }

    // Check account status
    if (userData.accountStatus === 'suspended') {
      return {
        user: null,
        error: 'Account suspended. Please contact support.',
      };
    }

    // Return authenticated user info
    return {
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email || null,
        role: userData.role || 'user',
        accountStatus: userData.accountStatus || 'active',
      },
      error: null,
    };
  } catch (error: any) {
    console.error('[Auth Middleware] Unexpected error:', error);
    return {
      user: null,
      error: 'Authentication failed due to server error',
    };
  }
}

/**
 * Middleware to require authentication
 * Use this in API routes to protect endpoints
 *
 * Returns:
 * - user: Authenticated user info (if successful)
 * - response: Error response (if authentication failed)
 *
 * Example usage:
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const { user, response } = await requireAuth(request);
 *   if (response) return response; // Return error if auth failed
 *
 *   // Continue with authenticated user
 *   const userId = user.uid;
 *   // ...
 * }
 * ```
 */
export async function requireAuth(request: NextRequest): Promise<{
  user: AuthenticatedUser;
  response?: NextResponse;
}> {
  const { user, error } = await verifyAuth(request);

  if (!user) {
    console.warn('[Auth Middleware] Authentication required but failed:', error);

    return {
      user: null as any, // Type assertion needed for return type
      response: NextResponse.json(
        {
          error: error || 'Unauthorized',
          message: 'Authentication required to access this resource',
        },
        { status: 401 }
      ),
    };
  }

  return { user };
}

/**
 * Middleware to require admin role
 * Use this in admin API routes to restrict access
 *
 * Returns:
 * - user: Authenticated admin user info (if successful)
 * - response: Error response (if not admin or authentication failed)
 *
 * Example usage:
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const { user, response } = await requireAdmin(request);
 *   if (response) return response; // Return error if not admin
 *
 *   // Continue with admin user
 *   // ...
 * }
 * ```
 */
export async function requireAdmin(request: NextRequest): Promise<{
  user: AuthenticatedUser;
  response?: NextResponse;
}> {
  // First check authentication
  const { user, response } = await requireAuth(request);

  if (response) {
    // Authentication failed
    return { user, response };
  }

  // Check if user has admin role
  if (user.role !== 'admin') {
    console.warn(`[Auth Middleware] Admin access required but user ${user.uid} has role: ${user.role}`);

    return {
      user,
      response: NextResponse.json(
        {
          error: 'Forbidden',
          message: 'Admin access required to access this resource',
        },
        { status: 403 }
      ),
    };
  }

  // User is authenticated and is admin
  return { user };
}

/**
 * Helper function to extract user ID from request (after authentication)
 * Use this in API routes that have already called requireAuth
 */
export async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const { user } = await verifyAuth(request);
  return user?.uid || null;
}
