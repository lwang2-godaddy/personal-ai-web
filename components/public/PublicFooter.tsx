'use client';

import Link from 'next/link';
import { getVersion } from '@/lib/utils/version';

/**
 * Public Footer Component
 * Footer with legal links for public-facing pages
 */
export function PublicFooter() {
  const versionInfo = getVersion();
  const currentYear = new Date().getFullYear();

  const legalLinks = [
    { name: 'Privacy Policy', href: '/privacy' },
    { name: 'Terms of Service', href: '/terms' },
    { name: 'Open Source Licenses', href: '/licenses' },
  ];

  const docLinks = [
    { name: 'Getting Started', href: '/docs/getting-started' },
    { name: 'Features', href: '/docs/features' },
    { name: 'FAQ', href: '/docs/faq' },
  ];

  return (
    <footer className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              SirCharge
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your personal AI assistant that remembers everything.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              {versionInfo.fullVersion}
            </p>
          </div>

          {/* Documentation */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Documentation
            </h4>
            <ul className="space-y-2">
              {docLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Legal
            </h4>
            <ul className="space-y-2">
              {legalLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            &copy; {currentYear} SirCharge. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
