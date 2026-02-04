import { Metadata } from 'next';
import Link from 'next/link';
import { DocsSidebar } from '@/components/public/DocsSidebar';

export const metadata: Metadata = {
  title: 'About - SirCharge',
  description: 'Learn about SirCharge, your personal AI assistant that remembers everything.',
};

export default function AboutPage() {
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
            <h1>About SirCharge</h1>

            <p className="lead">
              SirCharge is a personal AI assistant that helps you understand and remember your life through intelligent data collection and AI-powered insights.
            </p>

            <h2 id="mission">Our Mission</h2>
            <p>
              We believe that personal data should be personal. SirCharge puts you in control of your health, location, and daily experiences, making them accessible through natural conversation with AI.
            </p>
            <p>
              Our mission is to help you answer questions about your own life that would otherwise be impossible to answer: How many times did I visit the gym this year? What was my sleep pattern like last month? When did I last meet with a friend at that coffee shop?
            </p>

            <h2 id="how-it-works">How It Works</h2>
            <p>
              SirCharge uses a privacy-first approach to personal AI:
            </p>
            <ol>
              <li><strong>Data Collection</strong> - With your permission, we collect health data, locations, voice notes, and text entries from your daily life.</li>
              <li><strong>AI Processing</strong> - Your data is converted into semantic embeddings that capture meaning, not just keywords.</li>
              <li><strong>Intelligent Retrieval</strong> - When you ask a question, relevant information is retrieved from your personal database.</li>
              <li><strong>Contextual Answers</strong> - AI generates accurate answers based on your actual data, with source citations.</li>
            </ol>

            <h2 id="privacy">Privacy First</h2>
            <p>
              Your data belongs to you. SirCharge is built with privacy as a core principle:
            </p>
            <ul>
              <li><strong>User Data Isolation</strong> - Your data is completely separate from other users</li>
              <li><strong>End-to-End Security</strong> - All data is encrypted in transit and at rest</li>
              <li><strong>No Training on Your Data</strong> - We use OpenAI&apos;s API with zero data retention</li>
              <li><strong>Full Data Export</strong> - Export all your data anytime in portable formats</li>
              <li><strong>Account Deletion</strong> - Delete your account and all data permanently</li>
            </ul>
            <p>
              Read our full <Link href="/privacy">Privacy Policy</Link> for details.
            </p>

            <h2 id="technology">Technology</h2>
            <p>
              SirCharge is built with modern, reliable technology:
            </p>
            <ul>
              <li><strong>Mobile Apps</strong> - React Native for iOS and Android</li>
              <li><strong>Web Dashboard</strong> - Next.js with React</li>
              <li><strong>AI</strong> - OpenAI GPT-4o, text-embedding-3-small, and Whisper</li>
              <li><strong>Vector Search</strong> - Pinecone for fast semantic search</li>
              <li><strong>Backend</strong> - Firebase (Firestore, Auth, Functions, Storage)</li>
            </ul>

            <h2 id="features">Key Features</h2>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 mb-8">
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Health Tracking</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Integrates with Apple Health and Google Fit to track steps, workouts, sleep, heart rate, and more.
              </p>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Location Intelligence</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Track significant locations, tag activities, and count visits to your favorite places.
              </p>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Voice Notes</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Record voice notes that are automatically transcribed and made searchable by AI.
              </p>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">AI Chat</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Ask questions about your life in natural language and get accurate, contextual answers.
              </p>
            </div>
          </div>

          <div className="prose prose-gray dark:prose-invert max-w-none">
            <h2 id="documentation">Documentation</h2>
            <p>
              Learn more about using SirCharge:
            </p>
            <ul>
              <li><Link href="/docs/getting-started">Getting Started</Link> - New to SirCharge? Start here.</li>
              <li><Link href="/docs/features">Features Overview</Link> - Detailed feature documentation.</li>
              <li><Link href="/docs/faq">FAQ</Link> - Answers to common questions.</li>
            </ul>

            <h2 id="support">Support & Legal</h2>
            <ul>
              <li><Link href="/support">Support Center</Link> - Get help and report issues.</li>
              <li><Link href="/privacy">Privacy Policy</Link> - How we handle your data.</li>
              <li><Link href="/terms">Terms of Service</Link> - Our terms and conditions.</li>
              <li><Link href="/licenses">Open Source Licenses</Link> - Third-party software attributions.</li>
            </ul>

            <h2 id="contact">Contact</h2>
            <ul>
              <li><strong>General:</strong> <a href="mailto:hello@sircharge.ai">hello@sircharge.ai</a></li>
              <li><strong>Support:</strong> <a href="mailto:support@sircharge.ai">support@sircharge.ai</a></li>
              <li><strong>Privacy:</strong> <a href="mailto:privacy@sircharge.ai">privacy@sircharge.ai</a></li>
            </ul>
          </div>

          {/* Version Info */}
          <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
              <p className="font-medium text-gray-700 dark:text-gray-300">SirCharge</p>
              <p className="mt-1">Your personal AI assistant that remembers everything.</p>
              <p className="mt-4 text-xs">
                &copy; {new Date().getFullYear()} SirCharge. All rights reserved.
              </p>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
