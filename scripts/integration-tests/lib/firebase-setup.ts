/**
 * Firebase Admin SDK initialization for integration tests
 */

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local (three levels up from lib/)
dotenv.config({ path: path.join(__dirname, '..', '..', '..', '.env.local') });

// Integration test user configuration
const INTEGRATION_TEST_EMAIL = 'integration-test@personalai.local';
const INTEGRATION_TEST_DISPLAY_NAME = 'Integration Test User';

/**
 * Initialize Firebase Admin SDK
 * Returns the Firestore instance
 */
export function initFirebase(): admin.firestore.Firestore {
  if (admin.apps.length === 0) {
    const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    if (serviceAccountPath) {
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else if (serviceAccountJson) {
      try {
        const serviceAccount = JSON.parse(serviceAccountJson);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      } catch (e) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON');
      }
    } else if (projectId) {
      admin.initializeApp({
        projectId,
      });
    } else {
      throw new Error(
        'Firebase credentials required. Set one of:\n' +
        '  - GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json\n' +
        '  - FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}\n' +
        '  - NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id (with gcloud auth)'
      );
    }
  }
  return admin.firestore();
}

/**
 * Ensure the integration test user exists in Firebase Auth.
 * Creates the user if it doesn't exist.
 * Returns the user's UID.
 */
export async function ensureTestUserExists(): Promise<string> {
  try {
    const existingUser = await admin.auth().getUserByEmail(INTEGRATION_TEST_EMAIL);
    return existingUser.uid;
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      const newUser = await admin.auth().createUser({
        email: INTEGRATION_TEST_EMAIL,
        displayName: INTEGRATION_TEST_DISPLAY_NAME,
        emailVerified: true,
      });
      return newUser.uid;
    }
    throw error;
  }
}

/**
 * Get Firebase project ID from environment
 */
export function getProjectId(): string {
  return process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'personal-ai-app';
}

/**
 * Get Firebase region from environment
 */
export function getRegion(): string {
  return process.env.FIREBASE_REGION || 'us-central1';
}
