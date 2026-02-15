/**
 * Cloud Function Caller for Admin Operations
 *
 * Calls Firebase Cloud Functions as a specific user by:
 * 1. Creating a custom token via Firebase Admin SDK
 * 2. Exchanging it for an ID token via Identity Toolkit REST API
 * 3. Calling the Cloud Function URL with Authorization header
 *
 * Simplified version of the pattern in lib/services/demo/demoOperations.ts
 */

import { getAdminAuth } from '@/lib/api/firebase/admin';

interface CallResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Call a Firebase Cloud Function as a specific user.
 *
 * @param userId - The UID of the user to impersonate
 * @param functionName - The Cloud Function name (e.g. 'manualGenerateFunFacts')
 * @param data - The payload to send as `{ data }` in the request body
 * @param timeoutMs - Request timeout in milliseconds (default: 120000)
 */
export async function callCloudFunctionAsUser(
  userId: string,
  functionName: string,
  data: Record<string, any>,
  timeoutMs = 120000,
): Promise<CallResult> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'NEXT_PUBLIC_FIREBASE_API_KEY not set' };
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'personal-ai-app';
  const region = process.env.FIREBASE_REGION || 'us-central1';

  try {
    // 1. Create custom token for the target user
    const auth = getAdminAuth();
    const customToken = await auth.createCustomToken(userId);

    // 2. Exchange custom token for ID token via Identity Toolkit
    const tokenResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: customToken, returnSecureToken: true }),
      },
    );

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      return { success: false, error: `Token exchange failed: ${errText}` };
    }

    const { idToken } = await tokenResponse.json();

    // 3. Call Cloud Function with Authorization header
    const functionUrl = `https://${region}-${projectId}.cloudfunctions.net/${functionName}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ data }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const errText = await response.text();
        return {
          success: false,
          error: `Cloud Function ${functionName} returned ${response.status}: ${errText}`,
        };
      }

      const result = await response.json();
      return { success: true, data: result.result || result };
    } catch (fetchErr: any) {
      clearTimeout(timer);
      if (fetchErr.name === 'AbortError') {
        return { success: false, error: `Cloud Function ${functionName} timed out after ${timeoutMs}ms` };
      }
      throw fetchErr;
    }
  } catch (err: any) {
    return {
      success: false,
      error: `Failed to call ${functionName}: ${err.message || String(err)}`,
    };
  }
}
