'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Documentation Sidebar Navigation
 * Provides navigation between documentation pages
 */
export function DocsSidebar() {
  const pathname = usePathname();

  const sections = [
    {
      title: 'Getting Started',
      links: [
        { name: 'Introduction', href: '/docs/getting-started' },
      ],
    },
    {
      title: 'Using SirCharge',
      links: [
        { name: 'Features Overview', href: '/docs/features' },
        { name: 'FAQ', href: '/docs/faq' },
      ],
    },
    {
      title: 'Help & Support',
      links: [
        { name: 'Support Center', href: '/support' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { name: 'Privacy Policy', href: '/privacy' },
        { name: 'Terms of Service', href: '/terms' },
        { name: 'Open Source Licenses', href: '/licenses' },
      ],
    },
  ];

  return (
    <aside className="w-64 flex-shrink-0">
      <nav className="sticky top-20 space-y-6">
        {sections.map((section) => (
          <div key={section.title}>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
              {section.title}
            </h4>
            <ul className="space-y-1">
              {section.links.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={`block px-3 py-2 text-sm rounded-lg transition-colors ${
                        isActive
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      {link.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
