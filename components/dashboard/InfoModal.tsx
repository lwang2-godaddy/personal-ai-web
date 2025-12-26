'use client';

import { useEffect, useRef, ReactNode } from 'react';

interface InfoModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * InfoModal Component
 *
 * Generic modal for displaying information about features or data.
 * Used primarily for mobile-only panels (Health, Location) to explain
 * how to start collecting that data via the mobile app.
 *
 * @param title - Modal title
 * @param onClose - Callback when modal is closed
 * @param children - Content to display in modal body
 */
export function InfoModal({ title, onClose, children }: InfoModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Store the element that triggered the modal
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
  }, []);

  // Close on Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleEscape);
    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
      // Return focus to trigger element
      previousFocusRef.current?.focus();
    };
  }, [onClose]);

  // Focus trap
  useEffect(() => {
    if (modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      function handleTabKey(e: KeyboardEvent) {
        if (e.key !== 'Tab') return;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      }

      modalRef.current.addEventListener('keydown', handleTabKey as any);
      firstElement?.focus();

      return () => {
        modalRef.current?.removeEventListener('keydown', handleTabKey as any);
      };
    }
  }, []);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="info-modal-title"
    >
      <div
        ref={modalRef}
        className="
          relative w-full max-w-md
          bg-white dark:bg-gray-800
          rounded-lg shadow-xl
          animate-scale-up
          max-h-[90vh] flex flex-col
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2
            id="info-modal-title"
            className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2"
          >
            <svg
              className="w-6 h-6 text-blue-600 dark:text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="
              text-gray-400 hover:text-gray-600 dark:hover:text-gray-200
              transition-colors
              focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full p-1
            "
            aria-label="Close modal"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="text-gray-700 dark:text-gray-300 space-y-4">
            {children}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="
              px-6 py-2
              bg-blue-600 hover:bg-blue-700 active:bg-blue-800
              text-white font-medium rounded-lg
              transition-colors
              focus:outline-none focus:ring-4 focus:ring-blue-300
              dark:focus:ring-blue-800
            "
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
