'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Public Navigation Component
 * Simple navigation for public-facing documentation pages
 */
export function PublicNav() {
  const pathname = usePathname();

  const navigation = [
    { name: 'Docs', href: '/docs/getting-started' },
    { name: 'About', href: '/about' },
    { name: 'Support', href: '/support' },
  ];

  const isDocsActive = pathname?.startsWith('/docs');

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            {/* Logo */}
            <Link href="/" className="flex-shrink-0 flex items-center gap-2">
              <img
                src="/icon-192x192.svg"
                alt="SirCharge"
                className="h-8 w-8"
              />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                SirCharge
              </h1>
            </Link>

            {/* Navigation Links */}
            <div className="hidden sm:ml-8 sm:flex sm:space-x-6">
              {navigation.map((item) => {
                const isActive = item.href === '/docs/getting-started'
                  ? isDocsActive
                  : pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'border-blue-500 text-gray-900 dark:text-white'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Sign In Button */}
          <div className="flex items-center">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="sm:hidden flex space-x-4 pb-3">
          {navigation.map((item) => {
            const isActive = item.href === '/docs/getting-started'
              ? isDocsActive
              : pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`text-sm font-medium ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
