import { Metadata } from 'next';
import Link from 'next/link';
import { DocsSidebar } from '@/components/public/DocsSidebar';

export const metadata: Metadata = {
  title: 'Open Source Licenses - SirCharge',
  description: 'Open source software licenses and attributions used in SirCharge.',
};

interface LicenseInfo {
  name: string;
  version: string;
  license: string;
  url: string;
  description: string;
}

const dependencies: LicenseInfo[] = [
  {
    name: 'Next.js',
    version: '16.1.1',
    license: 'MIT',
    url: 'https://github.com/vercel/next.js',
    description: 'The React Framework for Production',
  },
  {
    name: 'React',
    version: '19.2.3',
    license: 'MIT',
    url: 'https://github.com/facebook/react',
    description: 'A JavaScript library for building user interfaces',
  },
  {
    name: 'React DOM',
    version: '19.2.3',
    license: 'MIT',
    url: 'https://github.com/facebook/react',
    description: 'React DOM rendering',
  },
  {
    name: 'Redux Toolkit',
    version: '2.11.2',
    license: 'MIT',
    url: 'https://github.com/reduxjs/redux-toolkit',
    description: 'The official, opinionated, batteries-included toolset for efficient Redux development',
  },
  {
    name: 'React Redux',
    version: '9.2.0',
    license: 'MIT',
    url: 'https://github.com/reduxjs/react-redux',
    description: 'Official React bindings for Redux',
  },
  {
    name: 'Redux Persist',
    version: '6.0.0',
    license: 'MIT',
    url: 'https://github.com/rt2zz/redux-persist',
    description: 'Persist and rehydrate a Redux store',
  },
  {
    name: 'Firebase',
    version: '12.7.0',
    license: 'Apache-2.0',
    url: 'https://github.com/firebase/firebase-js-sdk',
    description: 'Firebase JavaScript SDK',
  },
  {
    name: 'Firebase Admin',
    version: '12.7.0',
    license: 'Apache-2.0',
    url: 'https://github.com/firebase/firebase-admin-node',
    description: 'Firebase Admin Node.js SDK',
  },
  {
    name: 'OpenAI',
    version: '6.15.0',
    license: 'Apache-2.0',
    url: 'https://github.com/openai/openai-node',
    description: 'Official OpenAI Node.js library',
  },
  {
    name: 'Pinecone',
    version: '6.1.3',
    license: 'Apache-2.0',
    url: 'https://github.com/pinecone-io/pinecone-ts-client',
    description: 'Pinecone TypeScript Client',
  },
  {
    name: 'Headless UI',
    version: '2.2.9',
    license: 'MIT',
    url: 'https://github.com/tailwindlabs/headlessui',
    description: 'Completely unstyled, fully accessible UI components',
  },
  {
    name: 'Tailwind CSS',
    version: '4.0.0',
    license: 'MIT',
    url: 'https://github.com/tailwindlabs/tailwindcss',
    description: 'A utility-first CSS framework',
  },
  {
    name: 'date-fns',
    version: '4.1.0',
    license: 'MIT',
    url: 'https://github.com/date-fns/date-fns',
    description: 'Modern JavaScript date utility library',
  },
  {
    name: 'React Big Calendar',
    version: '1.19.4',
    license: 'MIT',
    url: 'https://github.com/jquense/react-big-calendar',
    description: 'Calendar component for React',
  },
  {
    name: 'Recharts',
    version: '3.6.0',
    license: 'MIT',
    url: 'https://github.com/recharts/recharts',
    description: 'Redefined chart library built with React and D3',
  },
  {
    name: 'next-intl',
    version: '4.6.1',
    license: 'MIT',
    url: 'https://github.com/amannn/next-intl',
    description: 'Internationalization for Next.js',
  },
  {
    name: 'TypeScript',
    version: '5.x',
    license: 'Apache-2.0',
    url: 'https://github.com/microsoft/TypeScript',
    description: 'TypeScript is a superset of JavaScript that compiles to clean JavaScript output',
  },
  {
    name: 'ESLint',
    version: '9.x',
    license: 'MIT',
    url: 'https://github.com/eslint/eslint',
    description: 'Find and fix problems in your JavaScript code',
  },
  {
    name: 'dotenv',
    version: '17.2.3',
    license: 'BSD-2-Clause',
    url: 'https://github.com/motdotla/dotenv',
    description: 'Loads environment variables from .env file',
  },
];

export default function LicensesPage() {
  const mitLicenses = dependencies.filter((d) => d.license === 'MIT');
  const apacheLicenses = dependencies.filter((d) => d.license === 'Apache-2.0');
  const otherLicenses = dependencies.filter((d) => !['MIT', 'Apache-2.0'].includes(d.license));

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex gap-8">
        {/* Sidebar */}
        <div className="hidden md:block">
          <DocsSidebar />
        </div>

        {/* Main Content */}
        <article className="flex-1 min-w-0 prose prose-gray dark:prose-invert max-w-none">
          <h1>Open Source Licenses</h1>

          <p className="lead">
            SirCharge is built with the help of many open source projects. We are grateful to the developers and maintainers of these projects.
          </p>

          <h2 id="acknowledgements">Acknowledgements</h2>
          <p>
            We would like to thank all the open source projects that make SirCharge possible. This page lists the third-party software used in our web application along with their licenses.
          </p>

          <h2 id="mit-license">MIT License</h2>
          <p>
            The following packages are licensed under the MIT License:
          </p>

          <div className="not-prose">
            <div className="space-y-3">
              {mitLicenses.map((dep) => (
                <div key={dep.name} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        <a
                          href={dep.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          {dep.name}
                        </a>
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {dep.description}
                      </p>
                    </div>
                    <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-1 rounded">
                      v{dep.version}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 my-6 text-sm">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">MIT License</h4>
            <p className="text-gray-600 dark:text-gray-400">
              Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the &quot;Software&quot;), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
            </p>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
            </p>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              THE SOFTWARE IS PROVIDED &quot;AS IS&quot;, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED.
            </p>
          </div>

          <h2 id="apache-license">Apache License 2.0</h2>
          <p>
            The following packages are licensed under the Apache License 2.0:
          </p>

          <div className="not-prose">
            <div className="space-y-3">
              {apacheLicenses.map((dep) => (
                <div key={dep.name} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        <a
                          href={dep.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          {dep.name}
                        </a>
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {dep.description}
                      </p>
                    </div>
                    <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded">
                      v{dep.version}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 my-6 text-sm">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Apache License 2.0</h4>
            <p className="text-gray-600 dark:text-gray-400">
              Licensed under the Apache License, Version 2.0 (the &quot;License&quot;); you may not use this file except in compliance with the License. You may obtain a copy of the License at:
            </p>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              <a
                href="https://www.apache.org/licenses/LICENSE-2.0"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                https://www.apache.org/licenses/LICENSE-2.0
              </a>
            </p>
          </div>

          {otherLicenses.length > 0 && (
            <>
              <h2 id="other-licenses">Other Licenses</h2>
              <div className="not-prose">
                <div className="space-y-3">
                  {otherLicenses.map((dep) => (
                    <div key={dep.name} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            <a
                              href={dep.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-blue-600 dark:hover:text-blue-400"
                            >
                              {dep.name}
                            </a>
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {dep.description}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            License: {dep.license}
                          </p>
                        </div>
                        <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 px-2 py-1 rounded">
                          v{dep.version}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <h2 id="mobile-app">Mobile App Dependencies</h2>
          <p>
            The SirCharge mobile app (iOS and Android) uses additional open source packages. For a complete list, please refer to the About section in the mobile app or the <a href="https://github.com/lwang2-godaddy/personal-ai-app" target="_blank" rel="noopener noreferrer">mobile app repository</a>.
          </p>

          <h2 id="reporting">Reporting License Issues</h2>
          <p>
            If you believe we have inadvertently included a package without proper attribution, or if you have concerns about license compliance, please contact us at <a href="mailto:legal@sircharge.app">legal@sircharge.app</a>.
          </p>

          <h2 id="related">Related Pages</h2>
          <ul>
            <li><Link href="/privacy">Privacy Policy</Link></li>
            <li><Link href="/terms">Terms of Service</Link></li>
            <li><Link href="/about">About SirCharge</Link></li>
          </ul>
        </article>
      </div>
    </div>
  );
}
