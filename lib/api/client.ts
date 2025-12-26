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

import { getAuth } from 'firebase/auth';

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
    const auth = getAuth();
    const user = auth.currentUser;

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
   * @param options - Additional fetch options
   * @returns Fetch Response object
   */
  static async delete(url: string, options?: RequestInit): Promise<Response> {
    const headers = await this.getAuthHeaders();

    return fetch(url, {
      method: 'DELETE',
      headers: {
        ...headers,
        ...(options?.headers || {}),
      },
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
export async function apiDelete<T = any>(url: string): Promise<T> {
  const response = await ApiClient.delete(url);
  return ApiClient.handleResponse<T>(response);
}
