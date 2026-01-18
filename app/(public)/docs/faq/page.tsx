import { Metadata } from 'next';
import Link from 'next/link';
import { DocsSidebar } from '@/components/public/DocsSidebar';

export const metadata: Metadata = {
  title: 'FAQ - SirCharge Documentation',
  description: 'Frequently asked questions about SirCharge, including privacy, data handling, and troubleshooting.',
};

export default function FAQPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex gap-8">
        {/* Sidebar */}
        <div className="hidden md:block">
          <DocsSidebar />
        </div>

        {/* Main Content */}
        <article className="flex-1 min-w-0 prose prose-gray dark:prose-invert max-w-none">
          <h1>Frequently Asked Questions</h1>

          <p className="lead">
            Find answers to common questions about SirCharge.
          </p>

          {/* Table of Contents */}
          <nav className="not-prose bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-8">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">On this page</h2>
            <ul className="space-y-1 text-sm">
              <li><a href="#privacy" className="text-blue-600 dark:text-blue-400 hover:underline">Privacy & Data</a></li>
              <li><a href="#account" className="text-blue-600 dark:text-blue-400 hover:underline">Account Management</a></li>
              <li><a href="#technical" className="text-blue-600 dark:text-blue-400 hover:underline">Technical Questions</a></li>
              <li><a href="#ai" className="text-blue-600 dark:text-blue-400 hover:underline">AI & Data Processing</a></li>
              <li><a href="#troubleshooting" className="text-blue-600 dark:text-blue-400 hover:underline">Troubleshooting</a></li>
            </ul>
          </nav>

          <h2 id="privacy">Privacy & Data</h2>

          <h3>What data does SirCharge collect?</h3>
          <p>
            SirCharge can collect the following types of data, based on your permissions:
          </p>
          <ul>
            <li><strong>Health Data:</strong> Steps, workouts, sleep, heart rate (from Apple Health or Google Fit)</li>
            <li><strong>Location Data:</strong> Significant locations you visit (with your permission)</li>
            <li><strong>Voice Notes:</strong> Audio recordings you create and their transcriptions</li>
            <li><strong>Text Notes:</strong> Diary entries, thoughts, and quick notes you create</li>
            <li><strong>Photos:</strong> Images you upload with descriptions</li>
          </ul>
          <p>
            You have full control over what data you share with SirCharge.
          </p>

          <h3>Where is my data stored?</h3>
          <p>
            Your data is stored securely in multiple locations:
          </p>
          <ul>
            <li><strong>Locally:</strong> On your device for offline access</li>
            <li><strong>Firebase:</strong> Google&apos;s cloud platform for secure sync</li>
            <li><strong>Pinecone:</strong> Vector database for AI search (only embeddings, not raw data)</li>
          </ul>
          <p>
            All data is encrypted in transit (HTTPS/TLS) and at rest.
          </p>

          <h3>Is my data used to train AI models?</h3>
          <p>
            <strong>No.</strong> Your personal data is never used to train AI models. We use OpenAI&apos;s API with data retention set to zero days, meaning your queries are not stored or used for training.
          </p>

          <h3>Can SirCharge employees see my data?</h3>
          <p>
            No. Your data is encrypted and access-controlled. We cannot see your health data, locations, notes, or any personal content. The only exceptions are:
          </p>
          <ul>
            <li>Aggregate anonymous statistics (total users, total queries)</li>
            <li>Technical logs for debugging (no personal data)</li>
            <li>Legal requirements (court order, valid legal process)</li>
          </ul>

          <h3>How do I export my data?</h3>
          <p>
            You can export all your data from the app settings:
          </p>
          <ol>
            <li>Go to Settings &gt; Privacy &gt; Export Data</li>
            <li>Select the data types you want to export</li>
            <li>Choose format (JSON or CSV)</li>
            <li>Download your export file</li>
          </ol>

          <h2 id="account">Account Management</h2>

          <h3>How do I create an account?</h3>
          <p>
            SirCharge uses Google Sign-In for authentication. Simply tap &quot;Sign in with Google&quot; and follow the prompts. No password needed!
          </p>

          <h3>How do I delete my account?</h3>
          <p>
            To permanently delete your account and all data:
          </p>
          <ol>
            <li>Go to Settings &gt; Account &gt; Delete Account</li>
            <li>Confirm by typing &quot;DELETE&quot;</li>
            <li>All your data will be permanently deleted within 30 days</li>
          </ol>
          <p>
            <strong>Warning:</strong> This action cannot be undone.
          </p>

          <h3>Can I use SirCharge on multiple devices?</h3>
          <p>
            Yes! Sign in with the same Google account on all your devices. Your data will sync automatically. Note that health data is device-specific (HealthKit data stays on iOS, Google Fit on Android).
          </p>

          <h2 id="technical">Technical Questions</h2>

          <h3>Which devices are supported?</h3>
          <ul>
            <li><strong>iOS:</strong> iPhone running iOS 15.0 or later</li>
            <li><strong>Android:</strong> Devices running Android 10 or later</li>
            <li><strong>Web:</strong> Modern browsers (Chrome, Safari, Firefox, Edge)</li>
          </ul>

          <h3>Does SirCharge affect battery life?</h3>
          <p>
            SirCharge is designed to minimize battery impact:
          </p>
          <ul>
            <li>Uses efficient &quot;significant location&quot; APIs (not continuous GPS)</li>
            <li>Background tasks are batched and optimized</li>
            <li>Health data sync uses system-level efficient APIs</li>
          </ul>
          <p>
            Most users see less than 5% additional battery usage.
          </p>

          <h3>Does SirCharge work offline?</h3>
          <p>
            Partially. You can:
          </p>
          <ul>
            <li>Record voice notes (synced when online)</li>
            <li>Create text notes (synced when online)</li>
            <li>View previously loaded data</li>
          </ul>
          <p>
            AI chat requires an internet connection to work.
          </p>

          <h3>How much storage does SirCharge use?</h3>
          <p>
            Storage usage depends on your data volume. Typical usage:
          </p>
          <ul>
            <li>App itself: ~50MB</li>
            <li>Local data cache: 50-200MB</li>
            <li>Voice notes: ~1MB per minute of audio</li>
          </ul>

          <h2 id="ai">AI & Data Processing</h2>

          <h3>How does the AI chat work?</h3>
          <p>
            SirCharge uses RAG (Retrieval-Augmented Generation):
          </p>
          <ol>
            <li>Your question is converted to a semantic embedding</li>
            <li>Similar data is retrieved from your personal database</li>
            <li>GPT-4 generates a response using your data as context</li>
            <li>The response includes citations to source data</li>
          </ol>

          <h3>Why did the AI give an inaccurate answer?</h3>
          <p>
            Possible reasons:
          </p>
          <ul>
            <li><strong>Insufficient data:</strong> Not enough data collected yet</li>
            <li><strong>Vague question:</strong> Try being more specific with dates and activities</li>
            <li><strong>Embedding delay:</strong> New data takes 2-3 seconds to be searchable</li>
            <li><strong>Activity tagging:</strong> Untagged locations may not be found</li>
          </ul>

          <h3>What AI models does SirCharge use?</h3>
          <ul>
            <li><strong>Chat:</strong> GPT-4o (OpenAI)</li>
            <li><strong>Embeddings:</strong> text-embedding-3-small (OpenAI)</li>
            <li><strong>Transcription:</strong> Whisper (OpenAI)</li>
          </ul>

          <h2 id="troubleshooting">Troubleshooting</h2>

          <h3>Health data is not syncing</h3>
          <ol>
            <li>Check that health permissions are enabled in device settings</li>
            <li>Ensure SirCharge has &quot;Read&quot; access to relevant data types</li>
            <li>Force-close and reopen the app</li>
            <li>Check internet connection</li>
          </ol>

          <h3>Location tracking is not working</h3>
          <ol>
            <li>Verify location permissions are set to &quot;Always Allow&quot;</li>
            <li>Enable &quot;Precise Location&quot; if available</li>
            <li>Check that Location Services is enabled system-wide</li>
            <li>Note: Location tracking uses &quot;significant changes&quot; mode, not continuous GPS</li>
          </ol>

          <h3>Voice notes are not transcribing</h3>
          <ol>
            <li>Check internet connection (transcription requires online)</li>
            <li>Verify microphone permissions are granted</li>
            <li>Try recording in a quieter environment</li>
            <li>Check that the recording is at least 1 second long</li>
          </ol>

          <h3>Chat is giving errors</h3>
          <ol>
            <li>Check internet connection</li>
            <li>Sign out and sign back in (refreshes authentication)</li>
            <li>Try a simpler question first</li>
            <li>Wait a moment and try again (may be temporary service issue)</li>
          </ol>

          <h3>App is crashing</h3>
          <ol>
            <li>Update to the latest app version</li>
            <li>Restart your device</li>
            <li>Clear app cache (Settings &gt; Apps &gt; SirCharge &gt; Clear Cache)</li>
            <li>If problem persists, contact <Link href="/support">Support</Link></li>
          </ol>

          <h2>Still Have Questions?</h2>
          <p>
            If you didn&apos;t find your answer here:
          </p>
          <ul>
            <li><Link href="/support">Contact Support</Link> - Get help from our team</li>
            <li><Link href="/docs/features">Features Documentation</Link> - Learn more about features</li>
          </ul>
        </article>
      </div>
    </div>
  );
}
