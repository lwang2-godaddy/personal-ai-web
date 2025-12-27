'use client';

import { useState, useRef, useEffect } from 'react';
import { useAppDispatch } from '@/lib/store/hooks';
import { openQuickCreate } from '@/lib/store/slices/quickCreateSlice';

export type CreateType = 'diary' | 'thought' | 'voice' | 'photo';

interface MenuItem {
  type: CreateType;
  label: string;
  emoji: string;
  description: string;
}

const menuItems: MenuItem[] = [
  { type: 'diary', label: 'Quick Note', emoji: '📝', description: 'Write a diary entry' },
  { type: 'thought', label: 'Quick Thought', emoji: '💭', description: 'Quick thought (280 chars)' },
  { type: 'voice', label: 'Voice Note', emoji: '🎙️', description: 'Record voice note' },
  { type: 'photo', label: 'Photo', emoji: '📸', description: 'Upload a photo' },
];

export default function FloatingActionButton() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dispatch = useAppDispatch();

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    }

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMenuOpen]);

  // Close menu on Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && isMenuOpen) {
        setIsMenuOpen(false);
        buttonRef.current?.focus();
      }
    }

    if (isMenuOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isMenuOpen]);

  const handleFABClick = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleMenuItemClick = (type: CreateType) => {
    dispatch(openQuickCreate({ type }));
    setIsMenuOpen(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Menu */}
      {isMenuOpen && (
        <div
          ref={menuRef}
          className="absolute bottom-20 right-0 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-scale-in"
          role="menu"
          aria-label="Quick create menu"
        >
          {menuItems.map((item, index) => (
            <button
              key={item.type}
              onClick={() => handleMenuItemClick(item.type)}
              className="w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left border-b border-gray-100 dark:border-gray-700 last:border-b-0 focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-700"
              role="menuitem"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleMenuItemClick(item.type);
                }
              }}
            >
              <span className="text-2xl" role="img" aria-label={item.label}>
                {item.emoji}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 dark:text-white text-sm">
                  {item.label}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {item.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* FAB Button */}
      <button
        ref={buttonRef}
        onClick={handleFABClick}
        className="w-14 h-14 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800"
        aria-label="Quick create"
        aria-expanded={isMenuOpen}
        aria-haspopup="menu"
      >
        <svg
          className={`w-6 h-6 transition-transform duration-200 ${isMenuOpen ? 'rotate-45' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
      </button>

      <style jsx>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.15s ease-out;
        }
      `}</style>
    </div>
  );
}
