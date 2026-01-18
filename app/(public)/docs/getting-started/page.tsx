import { Metadata } from 'next';
import Link from 'next/link';
import { DocsSidebar } from '@/components/public/DocsSidebar';

export const metadata: Metadata = {
  title: 'Getting Started - SirCharge Documentation',
  description: 'Learn how to get started with SirCharge, your personal AI assistant that remembers everything.',
};

export default function GettingStartedPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex gap-8">
        {/* Sidebar */}
        <div className="hidden md:block">
          <DocsSidebar />
        </div>

        {/* Main Content */}
        <article className="flex-1 min-w-0 prose prose-gray dark:prose-invert max-w-none">
          <h1>Getting Started with SirCharge</h1>

          <p className="lead">
            SirCharge is your personal AI assistant that helps you remember and understand your life through your health data, locations, voice notes, and more.
          </p>

          <h2 id="what-is-sircharge">What is SirCharge?</h2>
          <p>
            SirCharge is a privacy-focused personal AI that:
          </p>
          <ul>
            <li><strong>Collects</strong> your personal data (health metrics, location history, voice notes)</li>
            <li><strong>Understands</strong> context through AI-powered embeddings</li>
            <li><strong>Answers</strong> questions about your life with accurate, contextual responses</li>
          </ul>
          <p>
            Ask questions like &quot;How many times did I play badminton this year?&quot; or &quot;What was my average sleep last week?&quot; and get accurate answers based on your actual data.
          </p>

          <h2 id="creating-account">Creating Your Account</h2>
          <p>Getting started is easy:</p>
          <ol>
            <li>Download the SirCharge mobile app from the App Store or Google Play</li>
            <li>Tap <strong>Sign in with Google</strong> to create your account</li>
            <li>Follow the on-screen prompts to complete setup</li>
          </ol>
          <p>
            Your account uses Google authentication for security. All your data is linked to your Google account and fully encrypted.
          </p>

          <h2 id="connecting-health-data">Connecting Health Data</h2>

          <h3>iOS (Apple Health)</h3>
          <p>
            On iOS, SirCharge integrates with Apple HealthKit to read your health data:
          </p>
          <ol>
            <li>When prompted, tap <strong>Allow</strong> to grant health data access</li>
            <li>Select the data types you want to share (steps, workouts, sleep, etc.)</li>
            <li>SirCharge will automatically sync your health data in the background</li>
          </ol>

          <h3>Android (Google Fit)</h3>
          <p>
            On Android, SirCharge integrates with Google Fit:
          </p>
          <ol>
            <li>Connect your Google Fit account when prompted</li>
            <li>Grant permissions to access your fitness data</li>
            <li>Your data will sync automatically</li>
          </ol>

          <h2 id="enabling-location">Enabling Location Tracking</h2>
          <p>
            Location tracking helps SirCharge understand where you&apos;ve been and what activities you&apos;ve done:
          </p>
          <ol>
            <li>Grant location permissions when prompted (&quot;Always Allow&quot; for best results)</li>
            <li>SirCharge tracks significant locations, not continuous GPS</li>
            <li>Tag your visits with activities like &quot;Gym&quot;, &quot;Badminton&quot;, &quot;Work&quot;, etc.</li>
          </ol>
          <p>
            <strong>Privacy Note:</strong> Location data is stored locally first and only synced when you have an internet connection. All data is encrypted and only accessible to you.
          </p>

          <h2 id="recording-voice-notes">Recording Voice Notes</h2>
          <p>
            Voice notes are a great way to capture thoughts, reminders, or journal entries:
          </p>
          <ol>
            <li>Tap the microphone button in the app</li>
            <li>Speak your note (supports multiple languages)</li>
            <li>SirCharge automatically transcribes using Whisper AI</li>
            <li>Your transcribed note becomes searchable and queryable</li>
          </ol>

          <h2 id="first-conversation">Your First AI Conversation</h2>
          <p>
            Once you have some data collected, try asking SirCharge questions:
          </p>
          <ul>
            <li>&quot;How many steps did I take yesterday?&quot;</li>
            <li>&quot;When did I last go to the gym?&quot;</li>
            <li>&quot;What was my average heart rate during workouts this week?&quot;</li>
            <li>&quot;Summarize my voice notes from this week&quot;</li>
          </ul>
          <p>
            The AI uses RAG (Retrieval-Augmented Generation) to find relevant information from your personal data and provide accurate, contextual answers.
          </p>

          <h2 id="tips">Tips for Best Results</h2>
          <ul>
            <li><strong>Be consistent:</strong> Let SirCharge collect data over time for better insights</li>
            <li><strong>Tag activities:</strong> Adding activity tags to locations improves query accuracy</li>
            <li><strong>Use voice notes:</strong> Record quick thoughts that you want to remember later</li>
            <li><strong>Ask specific questions:</strong> The more specific your question, the better the answer</li>
          </ul>

          <h2 id="next-steps">Next Steps</h2>
          <p>
            Ready to learn more? Check out these resources:
          </p>
          <ul>
            <li><Link href="/docs/features">Features Overview</Link> - Detailed documentation of all features</li>
            <li><Link href="/docs/faq">FAQ</Link> - Answers to common questions</li>
            <li><Link href="/support">Support Center</Link> - Get help with issues</li>
          </ul>
        </article>
      </div>
    </div>
  );
}
