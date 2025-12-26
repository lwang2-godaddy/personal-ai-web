'use client';

import { ButtonHTMLAttributes } from 'react';

type ActionType = 'create' | 'info' | null;

interface PanelHeaderProps {
  title: string;
  emoji: string;
  actionType?: ActionType;
  onActionClick?: () => void;
  ariaLabel?: string;
}

/**
 * PanelHeader Component
 *
 * Reusable header for dashboard panels with optional action button.
 * Displays title with emoji on the left, and an action button on the right.
 *
 * @param title - Panel title text
 * @param emoji - Emoji icon for the panel
 * @param actionType - Type of action: 'create' (+), 'info' (i), or null (no button)
 * @param onActionClick - Callback when action button is clicked
 * @param ariaLabel - Accessible label for the action button
 */
export function PanelHeader({
  title,
  emoji,
  actionType = null,
  onActionClick,
  ariaLabel,
}: PanelHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      {/* Title with emoji */}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <span role="img" aria-label={emoji} className="text-xl">
          {emoji}
        </span>
        {title}
      </h3>

      {/* Action button (create or info) */}
      {actionType && onActionClick && (
        <button
          onClick={onActionClick}
          aria-label={ariaLabel || `${actionType === 'create' ? 'Create new' : 'Learn more about'} ${title}`}
          className="
            w-8 h-8 min-w-[44px] min-h-[44px] -m-2
            rounded-full
            bg-gray-100 dark:bg-gray-700
            hover:bg-blue-100 dark:hover:bg-blue-900/30
            text-gray-600 dark:text-gray-400
            hover:text-blue-600 dark:hover:text-blue-400
            flex items-center justify-center
            transition-all duration-200
            hover:scale-105 active:scale-95
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            dark:focus:ring-offset-gray-800
          "
          type="button"
        >
          {actionType === 'create' ? (
            // Plus icon for create
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          ) : (
            // Info icon
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}
