'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  ADMIN_NAVIGATION,
  STANDALONE_NAV_ITEMS,
  BOTTOM_NAV_ITEMS,
  ADMIN_NAV_STORAGE_KEY,
  NavGroup,
} from '@/lib/config/adminNavigation';

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Chevron icon component for expand/collapse indicator
 */
function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

/**
 * Admin Sidebar Component
 * Collapsible sidebar navigation with grouped items and localStorage persistence
 */
export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  // Load open groups from localStorage on mount
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(ADMIN_NAV_STORAGE_KEY);
      if (saved) {
        setOpenGroups(new Set(JSON.parse(saved)));
      }
    } catch (error) {
      console.error('Failed to load nav state from localStorage:', error);
    }
  }, []);

  // Auto-expand group containing active item
  useEffect(() => {
    if (!mounted) return;

    ADMIN_NAVIGATION.forEach((group) => {
      if (group.items.some((item) => pathname === item.href || pathname.startsWith(item.href + '/'))) {
        setOpenGroups((prev) => {
          const next = new Set(prev);
          next.add(group.id);
          return next;
        });
      }
    });
  }, [pathname, mounted]);

  // Toggle group open/closed state
  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      // Persist to localStorage
      try {
        localStorage.setItem(ADMIN_NAV_STORAGE_KEY, JSON.stringify([...next]));
      } catch (error) {
        console.error('Failed to save nav state to localStorage:', error);
      }
      return next;
    });
  };

  // Check if a nav item is active
  const isItemActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  // Handle nav item click (close sidebar on mobile)
  const handleNavClick = () => {
    onClose();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50
          w-64 bg-red-700 text-white
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          flex flex-col h-screen md:h-auto md:min-h-screen
        `}
      >
        {/* Sidebar header (mobile) */}
        <div className="flex items-center justify-between p-4 border-b border-red-600 md:hidden">
          <div className="flex items-center">
            <span className="text-xl font-bold">⚙️</span>
            <span className="ml-2 font-semibold">Admin Panel</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-red-600 transition-colors"
            aria-label="Close sidebar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation content */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {/* Standalone items (Overview) */}
          {STANDALONE_NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleNavClick}
              className={`
                flex items-center px-3 py-2.5 rounded-md text-sm font-medium
                transition-colors duration-150
                ${isItemActive(item.href)
                  ? 'bg-red-800 text-white'
                  : 'text-red-100 hover:bg-red-600 hover:text-white'
                }
              `}
            >
              <span className="mr-3 text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}

          {/* Divider */}
          <div className="border-t border-red-600 my-3" />

          {/* Grouped navigation */}
          {ADMIN_NAVIGATION.map((group) => (
            <NavGroupComponent
              key={group.id}
              group={group}
              isOpen={openGroups.has(group.id)}
              onToggle={() => toggleGroup(group.id)}
              pathname={pathname}
              onItemClick={handleNavClick}
            />
          ))}
        </nav>

        {/* Bottom navigation */}
        <div className="p-4 border-t border-red-600">
          {BOTTOM_NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleNavClick}
              className="
                flex items-center px-3 py-2.5 rounded-md text-sm font-medium
                text-red-100 hover:bg-red-600 hover:text-white
                transition-colors duration-150
              "
            >
              <span className="mr-3 text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </aside>
    </>
  );
}

/**
 * Navigation Group Component
 * Renders a collapsible group with nested items
 */
function NavGroupComponent({
  group,
  isOpen,
  onToggle,
  pathname,
  onItemClick,
}: {
  group: NavGroup;
  isOpen: boolean;
  onToggle: () => void;
  pathname: string;
  onItemClick: () => void;
}) {
  // Check if any item in this group is active
  const hasActiveItem = group.items.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + '/')
  );

  return (
    <div className="space-y-1">
      {/* Group header (button) */}
      <button
        onClick={onToggle}
        className={`
          w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium
          transition-colors duration-150
          ${hasActiveItem
            ? 'bg-red-800/50 text-white'
            : 'text-red-100 hover:bg-red-600 hover:text-white'
          }
        `}
      >
        <div className="flex items-center">
          <span className="mr-3 text-base">{group.icon}</span>
          {group.label}
        </div>
        <ChevronIcon isOpen={isOpen} />
      </button>

      {/* Group items (collapsible) */}
      <div
        className={`
          overflow-hidden transition-all duration-200 ease-in-out
          ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}
        `}
      >
        <div className="pl-4 space-y-1 pt-1">
          {group.items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onItemClick}
                className={`
                  flex items-center px-3 py-2 rounded-md text-sm
                  transition-colors duration-150
                  ${isActive
                    ? 'bg-red-800 text-white font-medium'
                    : 'text-red-200 hover:bg-red-600 hover:text-white'
                  }
                `}
              >
                <span className="mr-3 text-sm">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
