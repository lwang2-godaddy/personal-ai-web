'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface AdminTab {
  id: string;
  label: string;
  href: string;
  icon?: string;
}

interface AdminTabsProps {
  tabs: AdminTab[];
}

/**
 * AdminTabs - Horizontal tab navigation for combined admin pages
 * Used to reduce sidebar clutter by grouping related pages under tabs
 */
export function AdminTabs({ tabs }: AdminTabsProps) {
  const pathname = usePathname();

  return (
    <div className="border-b border-slate-700 mb-6">
      <nav className="flex space-x-1 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`
                flex items-center px-4 py-3 text-sm font-medium whitespace-nowrap
                border-b-2 transition-colors duration-150
                ${isActive
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-600'
                }
              `}
            >
              {tab.icon && <span className="mr-2">{tab.icon}</span>}
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default AdminTabs;
