'use client';

import { useEffect, useRef } from 'react';
import { MigrationDefinition, MigrationRunOptions, MigrationStatusResponse } from '@/lib/models/Migration';

interface ConfirmMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  migration: MigrationDefinition;
  options: MigrationRunOptions;
  status?: MigrationStatusResponse | null;
  isTriggering?: boolean;
}

/**
 * Confirmation modal before triggering a migration
 */
export default function ConfirmMigrationModal({
  isOpen,
  onClose,
  onConfirm,
  migration,
  options,
  status,
  isTriggering = false,
}: ConfirmMigrationModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Focus trap
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isDryRun = options.dryRun;
  const isDestructive = migration.destructive;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={modalRef}
          tabIndex={-1}
          className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 focus:outline-none"
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div
              className={`flex-shrink-0 p-2 rounded-full ${
                isDestructive && !isDryRun
                  ? 'bg-red-100'
                  : isDryRun
                    ? 'bg-blue-100'
                    : 'bg-yellow-100'
              }`}
            >
              {isDestructive && !isDryRun ? (
                <span className="text-2xl">Warning</span>
              ) : isDryRun ? (
                <span className="text-2xl">Info</span>
              ) : (
                <span className="text-2xl">Migrate</span>
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {isDryRun ? 'Start Dry Run?' : 'Start Migration?'}
              </h3>
              <p className="text-sm text-gray-500">{migration.name}</p>
            </div>
          </div>

          {/* Warning for destructive migrations */}
          {isDestructive && !isDryRun && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
              <p className="text-sm text-red-800 font-medium">
                This is a destructive migration. Data may be permanently deleted.
              </p>
            </div>
          )}

          {/* Dry run info */}
          {isDryRun && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
              <p className="text-sm text-blue-800">
                <strong>Dry run mode:</strong> No changes will be made. This will
                only simulate the migration and report what would be done.
              </p>
            </div>
          )}

          {/* Live mode warning */}
          {!isDryRun && !isDestructive && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>Live mode:</strong> This will modify data in your database.
                Make sure you have tested with a dry run first.
              </p>
            </div>
          )}

          {/* Status info */}
          {status && (
            <div className="bg-gray-50 border border-gray-200 rounded-md p-3 mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Current Status</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">Total users:</span>
                  <span className="ml-1 font-medium">{status.totalUsers}</span>
                </div>
                <div>
                  <span className="text-gray-500">Processed:</span>
                  <span className="ml-1 font-medium">{status.usersProcessed}</span>
                </div>
                <div>
                  <span className="text-gray-500">Remaining:</span>
                  <span className="ml-1 font-medium">{status.usersRemaining}</span>
                </div>
                <div>
                  <span className="text-gray-500">Completion:</span>
                  <span className="ml-1 font-medium">{status.percentComplete}%</span>
                </div>
              </div>
              {status.estimatedTimeMinutes !== undefined && (
                <p className="text-xs text-gray-500 mt-2">
                  Estimated time: ~{status.estimatedTimeMinutes} minutes
                </p>
              )}
            </div>
          )}

          {/* Configuration Summary */}
          <div className="text-sm text-gray-600 mb-6">
            <h4 className="font-medium text-gray-700 mb-2">Configuration</h4>
            <ul className="space-y-1 text-xs">
              <li>
                <span className="text-gray-500">Mode:</span>{' '}
                {isDryRun ? 'Dry Run' : 'Live'}
              </li>
              <li>
                <span className="text-gray-500">Batch size:</span> {options.batchSize}
              </li>
              {options.startAfterUserId && (
                <li>
                  <span className="text-gray-500">Resume from:</span>{' '}
                  <code className="bg-gray-100 px-1 rounded">
                    {options.startAfterUserId}
                  </code>
                </li>
              )}
            </ul>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isTriggering}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isTriggering}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md disabled:opacity-50 transition-colors ${
                isDestructive && !isDryRun
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {isTriggering
                ? 'Starting...'
                : isDryRun
                  ? 'Start Dry Run'
                  : 'Start Migration'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
