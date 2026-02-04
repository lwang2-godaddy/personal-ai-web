import { Metadata } from 'next';
import Link from 'next/link';
import { DocsSidebar } from '@/components/public/DocsSidebar';

export const metadata: Metadata = {
  title: 'Support Center - SirCharge',
  description: 'Get help with SirCharge. Contact support, report bugs, and request features.',
};

export default function SupportPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex gap-8">
        {/* Sidebar */}
        <div className="hidden md:block">
          <DocsSidebar />
        </div>

        {/* Main Content */}
        <article className="flex-1 min-w-0">
          <div className="prose prose-gray dark:prose-invert max-w-none">
            <h1>Support Center</h1>

            <p className="lead">
              Need help with SirCharge? We&apos;re here to assist you.
            </p>
          </div>

          {/* Contact Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            {/* Email Support */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Email Support</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Send us an email and we&apos;ll get back to you within 24-48 hours.
              </p>
              <a
                href="mailto:support@sircharge.ai"
                className="inline-flex items-center text-blue-600 dark:text-blue-400 font-medium hover:underline"
              >
                support@sircharge.ai
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>
            </div>

            {/* Documentation */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Documentation</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Browse our documentation for guides and answers.
              </p>
              <Link
                href="/docs/getting-started"
                className="inline-flex items-center text-blue-600 dark:text-blue-400 font-medium hover:underline"
              >
                View Documentation
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Bug Report Section */}
          <div className="mt-12 prose prose-gray dark:prose-invert max-w-none">
            <h2 id="bug-reports">Report a Bug</h2>
            <p>
              Found a bug? Help us improve SirCharge by reporting it. Please include as much detail as possible.
            </p>

            <div className="not-prose bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mt-4">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Bug Report Template</h4>
              <div className="bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 p-4 font-mono text-sm">
                <p className="text-gray-600 dark:text-gray-400">
                  <strong>Subject:</strong> [Bug Report] Brief description<br /><br />
                  <strong>Description:</strong><br />
                  A clear description of the bug.<br /><br />
                  <strong>Steps to Reproduce:</strong><br />
                  1. Go to...<br />
                  2. Click on...<br />
                  3. See error<br /><br />
                  <strong>Expected Behavior:</strong><br />
                  What you expected to happen.<br /><br />
                  <strong>Actual Behavior:</strong><br />
                  What actually happened.<br /><br />
                  <strong>Device/Platform:</strong><br />
                  - Device: iPhone 14 / Pixel 8 / Desktop<br />
                  - OS: iOS 17 / Android 14 / macOS<br />
                  - App Version: 1.0.0<br /><br />
                  <strong>Screenshots:</strong><br />
                  Attach any relevant screenshots.
                </p>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                Send bug reports to: <a href="mailto:bugs@sircharge.ai" className="text-blue-600 dark:text-blue-400">bugs@sircharge.ai</a>
              </p>
            </div>

            <h2 id="feature-requests">Request a Feature</h2>
            <p>
              Have an idea for a new feature? We&apos;d love to hear it!
            </p>

            <div className="not-prose bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mt-4">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Feature Request Template</h4>
              <div className="bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 p-4 font-mono text-sm">
                <p className="text-gray-600 dark:text-gray-400">
                  <strong>Subject:</strong> [Feature Request] Brief description<br /><br />
                  <strong>Problem:</strong><br />
                  What problem does this feature solve?<br /><br />
                  <strong>Proposed Solution:</strong><br />
                  Describe your idea for the feature.<br /><br />
                  <strong>Alternatives Considered:</strong><br />
                  Any alternative solutions you&apos;ve thought of.<br /><br />
                  <strong>Additional Context:</strong><br />
                  Any other context, mockups, or examples.
                </p>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                Send feature requests to: <a href="mailto:features@sircharge.ai" className="text-blue-600 dark:text-blue-400">features@sircharge.ai</a>
              </p>
            </div>

            <h2 id="response-times">Response Times</h2>
            <p>We aim to respond to all inquiries as quickly as possible:</p>
            <table>
              <thead>
                <tr>
                  <th>Type of Inquiry</th>
                  <th>Expected Response Time</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Security Issues</td>
                  <td>Within 24 hours</td>
                </tr>
                <tr>
                  <td>Bug Reports</td>
                  <td>24-48 hours</td>
                </tr>
                <tr>
                  <td>General Support</td>
                  <td>48-72 hours</td>
                </tr>
                <tr>
                  <td>Feature Requests</td>
                  <td>1 week (acknowledgment)</td>
                </tr>
              </tbody>
            </table>

            <h2 id="security">Security Concerns</h2>
            <p>
              If you&apos;ve discovered a security vulnerability, please report it responsibly:
            </p>
            <ul>
              <li>Email: <a href="mailto:security@sircharge.ai">security@sircharge.ai</a></li>
              <li>Please do not disclose the vulnerability publicly until we&apos;ve had a chance to address it</li>
              <li>Include detailed steps to reproduce the issue</li>
              <li>We appreciate responsible disclosure and will acknowledge your contribution</li>
            </ul>

            <h2 id="helpful-resources">Helpful Resources</h2>
            <ul>
              <li><Link href="/docs/getting-started">Getting Started Guide</Link> - New to SirCharge? Start here.</li>
              <li><Link href="/docs/features">Features Overview</Link> - Learn about all features.</li>
              <li><Link href="/docs/faq">FAQ</Link> - Answers to common questions.</li>
              <li><Link href="/privacy">Privacy Policy</Link> - How we handle your data.</li>
              <li><Link href="/terms">Terms of Service</Link> - Our terms and conditions.</li>
            </ul>

            <h2 id="app-stores">Download the App</h2>
            <p>
              Get SirCharge for your device:
            </p>
            <div className="not-prose flex gap-4 mt-4">
              <a
                href="#"
                className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                App Store
              </a>
              <a
                href="#"
                className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 20.5v-17c0-.59.34-1.11.84-1.35L13.69 12l-9.85 9.85c-.5-.25-.84-.76-.84-1.35zm13.81-5.38L6.05 21.34l8.49-8.49 2.27 2.27zm3.35-4.31c.34.27.64.71.64 1.19s-.3.92-.64 1.19l-2.14 1.23-2.5-2.5 2.5-2.5 2.14 1.39zm-14.21-8.5l10.76 6.22-2.27 2.27-8.49-8.49z"/>
                </svg>
                Google Play
              </a>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
