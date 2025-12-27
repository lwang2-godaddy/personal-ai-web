'use client';

import { useAppDispatch } from '@/lib/store/hooks';
import { openQuickCreate } from '@/lib/store/slices/quickCreateSlice';

/**
 * QuickThoughtInput Component
 *
 * Twitter-style compose box for quick thoughts.
 * Displays at the top of the dashboard for immediate engagement.
 * Clicking opens the QuickCreateModal with 'thought' type.
 */
export function QuickThoughtInput() {
  const dispatch = useAppDispatch();

  const handleClick = () => {
    dispatch(openQuickCreate('thought'));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-start gap-3">
        {/* Avatar placeholder */}
        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
          <span className="text-lg" role="img" aria-label="thought bubble">
            💭
          </span>
        </div>

        {/* Input area */}
        <div className="flex-1">
          <button
            onClick={handleClick}
            aria-label="Compose new quick thought"
            className="w-full text-left px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-gray-500 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          >
            What's on your mind?
          </button>

          {/* Helper text */}
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Quick thoughts are limited to 280 characters • Click to compose
          </p>
        </div>
      </div>
    </div>
  );
}
