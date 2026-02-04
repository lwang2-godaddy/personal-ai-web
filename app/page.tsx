'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppSelector } from '@/lib/store/hooks';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);

  useEffect(() => {
    // Only redirect authenticated users to dashboard
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show landing page for non-authenticated users
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Navigation */}
      <nav className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-2">
              <img
                src="/app-icon.png"
                alt="SirCharge"
                className="h-9 w-9 rounded-lg"
              />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                SirCharge
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/about"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
              >
                About
              </Link>
              <Link
                href="/docs/getting-started"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
              >
                Docs
              </Link>
              <Link
                href="/support"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
              >
                Support
              </Link>
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <img
              src="/app-icon.png"
              alt="SirCharge"
              className="h-24 w-24 rounded-2xl shadow-lg"
            />
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Your Personal AI That
            <span className="text-orange-500"> Remembers Everything</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-4 max-w-3xl mx-auto">
            Track your health, locations, and daily experiences. Ask questions about your life and get accurate, contextual answers powered by AI.
          </p>
          <p className="text-lg text-gray-500 dark:text-gray-500 mb-8 max-w-2xl mx-auto italic">
            &ldquo;How many times did I play badminton this year?&rdquo; &mdash; Get instant, accurate answers from your personal data.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="px-8 py-3 text-lg font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors shadow-lg hover:shadow-xl"
            >
              Get Started Free
            </Link>
            <Link
              href="/docs/getting-started"
              className="px-8 py-3 text-lg font-medium text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700 rounded-lg transition-colors shadow-lg hover:shadow-xl border border-gray-200 dark:border-gray-700"
            >
              Learn More
            </Link>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="bg-white dark:bg-gray-800/50 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
            How It Works
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
            SirCharge uses RAG (Retrieval-Augmented Generation) to give you accurate answers about your life
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-orange-600">1</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Collect</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Health data, locations, voice notes, and photos are collected with your permission
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-orange-600">2</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Process</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                AI converts your data into semantic embeddings that capture meaning
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-orange-600">3</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Search</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                When you ask a question, relevant data is retrieved instantly
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-orange-600">4</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Answer</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                GPT-4 generates accurate answers with citations from your data
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
          Key Features
        </h2>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
          Everything you need to understand your life better
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Health Tracking */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Health Tracking</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
              Integrates with Apple Health and Google Fit to track steps, workouts, sleep, heart rate, and more.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 italic">
              &ldquo;How many steps did I walk last month?&rdquo;
            </p>
          </div>

          {/* Location Intelligence */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Location Intelligence</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
              Track significant locations, tag activities like &ldquo;badminton&rdquo; or &ldquo;gym&rdquo;, and count visits.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 italic">
              &ldquo;How many times did I play badminton this year?&rdquo;
            </p>
          </div>

          {/* Voice Notes */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Voice Notes</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
              Record voice notes automatically transcribed by Whisper AI and searchable instantly.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 italic">
              &ldquo;What did I say about the project last week?&rdquo;
            </p>
          </div>

          {/* AI Chat */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">AI Chat</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
              Ask questions about your life in natural language. Get accurate answers with source citations.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 italic">
              &ldquo;What was my sleep pattern like last month?&rdquo;
            </p>
          </div>

          {/* Photo Memories */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-pink-600 dark:text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Photo Memories</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
              Upload photos with AI-generated descriptions and location tags. Search by content.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 italic">
              &ldquo;Show me photos from my trip to Japan&rdquo;
            </p>
          </div>

          {/* Fun Facts & Insights */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Fun Facts & Insights</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
              Discover patterns in your life with AI-generated insights, streaks, and achievements.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 italic">
              &ldquo;You&apos;ve visited 15 new places this month!&rdquo;
            </p>
          </div>
        </div>
      </div>

      {/* Privacy Section */}
      <div className="bg-gray-900 dark:bg-black py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Privacy First
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Your data belongs to you. SirCharge is built with privacy as a core principle.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">User Data Isolation</h3>
              <p className="text-gray-400 text-sm">
                Your data is completely separate from other users. No one else can access it.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Zero Data Retention</h3>
              <p className="text-gray-400 text-sm">
                We use OpenAI&apos;s API with zero data retention. Your conversations aren&apos;t used for training.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Full Data Control</h3>
              <p className="text-gray-400 text-sm">
                Export all your data anytime. Delete your account and all data permanently.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Example Query Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-8 md:p-12 text-white">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Ask Anything About Your Life
            </h2>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-6">
              <p className="text-lg mb-4 font-medium">
                &ldquo;How many times did I play badminton this year?&rdquo;
              </p>
              <div className="border-t border-white/20 pt-4">
                <p className="text-white/90">
                  <span className="font-semibold">SirCharge:</span> Based on your location data, you played badminton <span className="font-bold">15 times</span> this year at SF Badminton Club. Your most active month was March with 4 sessions. Would you like to see the breakdown by month?
                </p>
              </div>
            </div>
            <Link
              href="/login"
              className="inline-block px-8 py-3 bg-white text-orange-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
            >
              Try It Now
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Links Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Documentation */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Documentation</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/docs/getting-started" className="text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 flex items-center">
                  <span className="mr-2">📚</span> Getting Started
                </Link>
              </li>
              <li>
                <Link href="/docs/features" className="text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 flex items-center">
                  <span className="mr-2">✨</span> Features Overview
                </Link>
              </li>
              <li>
                <Link href="/docs/faq" className="text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 flex items-center">
                  <span className="mr-2">❓</span> FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Support</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/support" className="text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 flex items-center">
                  <span className="mr-2">🆘</span> Support Center
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 flex items-center">
                  <span className="mr-2">ℹ️</span> About SirCharge
                </Link>
              </li>
              <li>
                <a href="mailto:support@sircharge.app" className="text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 flex items-center">
                  <span className="mr-2">📧</span> Contact Us
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Legal</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/privacy" className="text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 flex items-center">
                  <span className="mr-2">🔒</span> Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 flex items-center">
                  <span className="mr-2">📄</span> Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/licenses" className="text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 flex items-center">
                  <span className="mr-2">⚖️</span> Open Source Licenses
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            <div className="flex justify-center items-center gap-2 mb-2">
              <img
                src="/app-icon.png"
                alt="SirCharge"
                className="h-6 w-6 rounded-md"
              />
              <p className="font-medium text-gray-700 dark:text-gray-300">SirCharge</p>
            </div>
            <p className="mt-1">Your personal AI assistant that remembers everything.</p>
            <p className="mt-4 text-xs">
              &copy; {new Date().getFullYear()} SirCharge. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
