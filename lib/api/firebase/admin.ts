/**
 * Firebase Admin SDK Initialization
 * Server-side only - for API routes, middleware, and Cloud Functions
 *
 * IMPORTANT: This file should never be imported in client-side code
 */

import * as admin from 'firebase-admin';
import type { App } from 'firebase-admin/app';

let firebaseAdmin: App | null = null;

/**
 * Initialize Firebase Admin SDK
 * Uses service account credentials in production, application default credentials in development
 */
export function initializeFirebaseAdmin(): App {
  // Return existing instance if already initialized
  if (firebaseAdmin) {
    return firebaseAdmin;
  }

  // Prevent initialization in browser
  if (typeof window !== 'undefined') {
    throw new Error('Firebase Admin SDK cannot be initialized in the browser!');
  }

  try {
    // Check if already initialized (by another import)
    if (admin.apps.length > 0) {
      firebaseAdmin = admin.apps[0]!;
      console.log('[Firebase Admin] Using existing Firebase Admin app');
      return firebaseAdmin;
    }

    // Production: Use service account JSON from environment variable
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      console.log('[Firebase Admin] Initializing with service account credentials');

      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

        firebaseAdmin = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: serviceAccount.project_id,
        });

        console.log('[Firebase Admin] ✓ Initialized successfully with service account');
      } catch (parseError) {
        console.error('[Firebase Admin] Error parsing service account JSON:', parseError);
        throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_KEY format');
      }
    }
    // Development: Use Application Default Credentials (gcloud auth)
    else {
      console.log('[Firebase Admin] Initializing with Application Default Credentials');

      // Check if project ID is available
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;

      if (!projectId) {
        throw new Error(
          'Missing Firebase project ID. Set NEXT_PUBLIC_FIREBASE_PROJECT_ID or FIREBASE_PROJECT_ID'
        );
      }

      firebaseAdmin = admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId,
      });

      console.log('[Firebase Admin] ✓ Initialized successfully with ADC');
    }

    return firebaseAdmin;
  } catch (error) {
    console.error('[Firebase Admin] Initialization error:', error);
    throw error;
  }
}

/**
 * Get Firebase Admin app instance
 * Initializes if not already initialized
 */
export function getAdminApp(): App {
  if (!firebaseAdmin) {
    return initializeFirebaseAdmin();
  }
  return firebaseAdmin;
}

/**
 * Get Firestore instance (Admin SDK)
 */
export function getAdminFirestore() {
  const app = getAdminApp();
  return admin.firestore(app);
}

/**
 * Get Auth instance (Admin SDK)
 */
export function getAdminAuth() {
  const app = getAdminApp();
  return admin.auth(app);
}

/**
 * Get Storage instance (Admin SDK)
 */
export function getAdminStorage() {
  const app = getAdminApp();
  return admin.storage(app);
}

// Re-export admin namespace for convenience
export { admin };
