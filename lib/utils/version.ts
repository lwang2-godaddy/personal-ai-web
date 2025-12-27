/**
 * Version Utility
 * Provides type-safe access to application version information
 */

export interface VersionInfo {
  version: string;        // e.g., "0.1.0"
  commitHash: string;     // e.g., "b3b7435"
  fullVersion: string;    // e.g., "v0.1.0 (b3b7435)"
}

/**
 * Get version information (works both client and server-side)
 */
export function getVersion(): VersionInfo {
  return {
    version: process.env.NEXT_PUBLIC_APP_VERSION || '0.0.0',
    commitHash: process.env.NEXT_PUBLIC_COMMIT_HASH || 'unknown',
    fullVersion: process.env.NEXT_PUBLIC_FULL_VERSION || 'v0.0.0 (unknown)',
  };
}

/**
 * Check if running in development mode
 */
export function isDevelopmentVersion(): boolean {
  return process.env.NEXT_PUBLIC_COMMIT_HASH === 'dev' ||
         process.env.NODE_ENV === 'development';
}
