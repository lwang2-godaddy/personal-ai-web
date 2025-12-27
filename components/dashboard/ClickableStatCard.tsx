'use client';

interface ClickableStatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  onClick: () => void;
  ariaLabel: string;
}

/**
 * ClickableStatCard Component
 *
 * Interactive stat card that triggers actions when clicked.
 * Maintains the visual design of StatCard but adds click behavior.
 * Features hover effects and a visual "Click to add" hint.
 */
export function ClickableStatCard({
  title,
  value,
  subtitle,
  icon,
  onClick,
  ariaLabel,
}: ClickableStatCardProps) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className="
        bg-white dark:bg-gray-800 rounded-lg shadow p-6
        hover:shadow-lg hover:scale-105
        transition-all duration-200
        cursor-pointer
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        dark:focus:ring-offset-gray-900
        text-left w-full
      "
    >
      {/* Header with title and icon */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {title}
        </h3>
        <span className="text-2xl" role="img" aria-label={icon}>
          {icon}
        </span>
      </div>

      {/* Value */}
      <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
        {value}
      </p>

      {/* Subtitle */}
      <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>

      {/* Visual indicator for clickability */}
      <div className="mt-3 flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
        <span>Click to add</span>
      </div>
    </button>
  );
}
