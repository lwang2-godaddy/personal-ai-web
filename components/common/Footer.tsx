'use client';

import { getVersion } from '@/lib/utils/version';
import { useState } from 'react';

/**
 * Application Footer Component
 * Displays version information across all pages
 * Subtle, non-intrusive design that matches the app theme
 */
export function Footer() {
  const [showDetails, setShowDetails] = useState(false);
  const versionInfo = getVersion();

  return (
    <footer className="w-full py-3 px-4 text-center border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-2 py-1"
        aria-label="Toggle version details"
      >
        {versionInfo.fullVersion}
      </button>

      {showDetails && (
        <div className="mt-2 text-xs text-gray-400 dark:text-gray-500 space-y-1">
          <div>Version: {versionInfo.version}</div>
          <div>Commit: {versionInfo.commitHash}</div>
          <div>
            <a
              href={`https://github.com/lwang2-godaddy/personal-ai-web/commit/${versionInfo.commitHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600 underline"
            >
              View on GitHub
            </a>
          </div>
        </div>
      )}
    </footer>
  );
}
