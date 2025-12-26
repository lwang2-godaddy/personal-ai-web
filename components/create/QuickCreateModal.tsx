'use client';

import { useEffect, useRef } from 'react';
import { useAppSelector, useAppDispatch } from '@/lib/store/hooks';
import { closeQuickCreate } from '@/lib/store/slices/quickCreateSlice';
import QuickDiaryForm from './QuickDiaryForm';
import QuickThoughtForm from './QuickThoughtForm';
import QuickVoiceForm from './QuickVoiceForm';
import QuickPhotoForm from './QuickPhotoForm';

export default function QuickCreateModal() {
  const { isOpen, activeType, isSubmitting } = useAppSelector((state) => state.quickCreate);
  const dispatch = useAppDispatch();
  const modalRef = useRef<HTMLDivElement>(null);

  // Close modal on Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen && !isSubmitting) {
        dispatch(closeQuickCreate());
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen, isSubmitting, dispatch]);

  // Focus trap
  useEffect(() => {
    if (isOpen && modalRef.current) {
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
  }, [isOpen, activeType]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      dispatch(closeQuickCreate());
    }
  };

  const getTitle = () => {
    switch (activeType) {
      case 'diary':
        return 'Quick Note';
      case 'thought':
        return 'Quick Thought';
      case 'voice':
        return 'Voice Note';
      case 'photo':
        return 'Upload Photo';
      default:
        return 'Create';
    }
  };

  const getForm = () => {
    switch (activeType) {
      case 'diary':
        return <QuickDiaryForm />;
      case 'thought':
        return <QuickThoughtForm />;
      case 'voice':
        return <QuickVoiceForm />;
      case 'photo':
        return <QuickPhotoForm />;
      default:
        return null;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col animate-scale-up"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 id="modal-title" className="text-xl font-semibold text-gray-900 dark:text-white">
            {getTitle()}
          </h2>
          <button
            onClick={() => !isSubmitting && dispatch(closeQuickCreate())}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-1"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <div className="flex-1 overflow-y-auto p-6">{getForm()}</div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes scale-up {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        .animate-scale-up {
          animation: scale-up 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
