'use client';

import { MigrationRunStatus, getStatusBadgeClasses, getStatusDisplayText } from '@/lib/models/Migration';

interface MigrationStatusBadgeProps {
  status: MigrationRunStatus;
  className?: string;
}

/**
 * Badge component for displaying migration run status
 */
export default function MigrationStatusBadge({ status, className = '' }: MigrationStatusBadgeProps) {
  const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
  const statusClasses = getStatusBadgeClasses(status);
  const displayText = getStatusDisplayText(status);

  // Add animation for running status
  const animationClasses = status === 'running' ? 'animate-pulse' : '';

  return (
    <span className={`${baseClasses} ${statusClasses} ${animationClasses} ${className}`}>
      {status === 'running' && (
        <span className="mr-1.5 h-2 w-2 rounded-full bg-blue-500 animate-ping" />
      )}
      {displayText}
    </span>
  );
}
