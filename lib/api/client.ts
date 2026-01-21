/**
 * API Client Wrapper
 * Client-side API client that automatically adds authentication headers
 *
 * Usage:
 * ```typescript
 * import { ApiClient } from '@/lib/api/client';
 *
 * // GET request
 * const response = await ApiClient.get('/api/users');
 *
 * // POST request
 * const response = await ApiClient.post('/api/chat', { message: 'Hello' });
 *
 * // PATCH request
 * const response = await ApiClient.patch('/api/users/123', { name: 'New Name' });
 *
 * // DELETE request
 * const response = await ApiClient.delete('/api/users/123');
 * ```
 */

// Import auth from config to ensure Firebase is initialized
import { auth } from '@/lib/api/firebase/config';
import { onAuthStateChanged, User } from 'firebase/auth';

/**
 * Wait for Firebase auth to be ready
 * Firebase auth state is not immediately available on page load.
 * This returns a promise that resolves when auth state is determined.
 */
let authReadyPromise: Promise<User | null> | null = null;

function waitForAuth(): Promise<User | null> {
  if (authReadyPromise) {
    return authReadyPromise;
  }

  // If currentUser is already set, auth is ready
  if (auth.currentUser) {
    return Promise.resolve(auth.currentUser);
  }

  // Wait for onAuthStateChanged to fire once
  authReadyPromise = new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });

  return authReadyPromise;
}

/**
 * API Client Class
 * Wraps fetch() with automatic authentication header injection
 */
export class ApiClient {
  /**
   * Get authorization headers for authenticated requests
   * @private
   */
  private static async getAuthHeaders(): Promise<HeadersInit> {
    // Wait for Firebase auth to be ready before checking currentUser
    const user = await waitForAuth();

    if (!user) {
      throw new Error('User not authenticated. Please sign in first.');
    }

    // Get Firebase ID token
    const token = await user.getIdToken();

    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * GET request with authentication
   *
   * @param url - API endpoint URL
   * @param options - Additional fetch options
   * @returns Fetch Response object
   */
  static async get(url: string, options?: RequestInit): Promise<Response> {
    const headers = await this.getAuthHeaders();

    return fetch(url, {
      method: 'GET',
      headers: {
        ...headers,
        ...(options?.headers || {}),
      },
      ...options,
    });
  }

  /**
   * POST request with authentication
   *
   * @param url - API endpoint URL
   * @param body - Request body (will be JSON stringified)
   * @param options - Additional fetch options
   * @returns Fetch Response object
   */
  static async post(url: string, body?: any, options?: RequestInit): Promise<Response> {
    const headers = await this.getAuthHeaders();

    return fetch(url, {
      method: 'POST',
      headers: {
        ...headers,
        ...(options?.headers || {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });
  }

  /**
   * PATCH request with authentication
   *
   * @param url - API endpoint URL
   * @param body - Request body (will be JSON stringified)
   * @param options - Additional fetch options
   * @returns Fetch Response object
   */
  static async patch(url: string, body?: any, options?: RequestInit): Promise<Response> {
    const headers = await this.getAuthHeaders();

    return fetch(url, {
      method: 'PATCH',
      headers: {
        ...headers,
        ...(options?.headers || {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });
  }

  /**
   * PUT request with authentication
   *
   * @param url - API endpoint URL
   * @param body - Request body (will be JSON stringified)
   * @param options - Additional fetch options
   * @returns Fetch Response object
   */
  static async put(url: string, body?: any, options?: RequestInit): Promise<Response> {
    const headers = await this.getAuthHeaders();

    return fetch(url, {
      method: 'PUT',
      headers: {
        ...headers,
        ...(options?.headers || {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });
  }

  /**
   * DELETE request with authentication
   *
   * @param url - API endpoint URL
   * @param body - Optional request body
   * @param options - Additional fetch options
   * @returns Fetch Response object
   */
  static async delete(url: string, body?: any, options?: RequestInit): Promise<Response> {
    const headers = await this.getAuthHeaders();

    return fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
        ...(options?.headers || {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });
  }

  /**
   * Helper method to handle API response and extract JSON
   * Throws error if response is not ok
   *
   * @param response - Fetch Response object
   * @returns Parsed JSON data
   */
  static async handleResponse<T = any>(response: Response): Promise<T> {
    if (!response.ok) {
      // Try to extract error message from response
      let errorMessage = `API error: ${response.status} ${response.statusText}`;

      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        // Failed to parse error JSON, use default message
      }

      throw new Error(errorMessage);
    }

    // Parse and return JSON
    return response.json();
  }
}

/**
 * Convenience wrapper functions for common usage patterns
 */

/**
 * Make authenticated GET request and return parsed JSON
 */
export async function apiGet<T = any>(url: string): Promise<T> {
  const response = await ApiClient.get(url);
  return ApiClient.handleResponse<T>(response);
}

/**
 * Make authenticated POST request and return parsed JSON
 */
export async function apiPost<T = any>(url: string, body?: any): Promise<T> {
  const response = await ApiClient.post(url, body);
  return ApiClient.handleResponse<T>(response);
}

/**
 * Make authenticated PATCH request and return parsed JSON
 */
export async function apiPatch<T = any>(url: string, body?: any): Promise<T> {
  const response = await ApiClient.patch(url, body);
  return ApiClient.handleResponse<T>(response);
}

/**
 * Make authenticated PUT request and return parsed JSON
 */
export async function apiPut<T = any>(url: string, body?: any): Promise<T> {
  const response = await ApiClient.put(url, body);
  return ApiClient.handleResponse<T>(response);
}

/**
 * Make authenticated DELETE request and return parsed JSON
 */
export async function apiDelete<T = any>(url: string, body?: any): Promise<T> {
  const response = await ApiClient.delete(url, body);
  return ApiClient.handleResponse<T>(response);
}
