import { Metadata } from 'next';
import Link from 'next/link';
import { DocsSidebar } from '@/components/public/DocsSidebar';

export const metadata: Metadata = {
  title: 'Features Overview - SirCharge Documentation',
  description: 'Explore all the features of SirCharge, including health tracking, location intelligence, voice notes, and AI chat.',
};

export default function FeaturesPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex gap-8">
        {/* Sidebar */}
        <div className="hidden md:block">
          <DocsSidebar />
        </div>

        {/* Main Content */}
        <article className="flex-1 min-w-0 prose prose-gray dark:prose-invert max-w-none">
          <h1>Features Overview</h1>

          <p className="lead">
            SirCharge combines multiple data sources with AI to give you powerful insights into your daily life.
          </p>

          <h2 id="health-tracking">Health Tracking</h2>
          <p>
            SirCharge integrates with your device&apos;s health platform to collect and analyze your health data.
          </p>

          <h3>Data Types Collected</h3>
          <ul>
            <li><strong>Steps:</strong> Daily step counts with hourly breakdowns</li>
            <li><strong>Workouts:</strong> Exercise sessions including type, duration, and calories burned</li>
            <li><strong>Sleep:</strong> Sleep duration and quality metrics</li>
            <li><strong>Heart Rate:</strong> Resting, active, and workout heart rate data</li>
            <li><strong>Active Energy:</strong> Calories burned through activity</li>
            <li><strong>Distance:</strong> Walking, running, and cycling distances</li>
          </ul>

          <h3>Platform Support</h3>
          <table>
            <thead>
              <tr>
                <th>Platform</th>
                <th>Integration</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>iOS</td>
                <td>Apple HealthKit</td>
                <td>Full support</td>
              </tr>
              <tr>
                <td>Android</td>
                <td>Google Fit</td>
                <td>Full support</td>
              </tr>
            </tbody>
          </table>

          <h3>Example Queries</h3>
          <ul>
            <li>&quot;How many steps did I take last week?&quot;</li>
            <li>&quot;What was my average sleep duration this month?&quot;</li>
            <li>&quot;Compare my workouts from January to February&quot;</li>
            <li>&quot;When was my highest heart rate this week?&quot;</li>
          </ul>

          <h2 id="location-intelligence">Location Intelligence</h2>
          <p>
            SirCharge tracks your significant locations and helps you understand your movement patterns.
          </p>

          <h3>Features</h3>
          <ul>
            <li><strong>Automatic Location Detection:</strong> Tracks significant places you visit</li>
            <li><strong>Activity Tagging:</strong> Tag locations with activities (Gym, Badminton, Coffee Shop, etc.)</li>
            <li><strong>Visit Counting:</strong> Know how many times you&apos;ve visited each place</li>
            <li><strong>Duration Tracking:</strong> Track how long you spent at each location</li>
            <li><strong>Address Resolution:</strong> Automatic reverse geocoding for readable addresses</li>
          </ul>

          <h3>Privacy Features</h3>
          <ul>
            <li><strong>Local-First:</strong> Data stored locally before cloud sync</li>
            <li><strong>Significant Locations Only:</strong> Not continuous GPS tracking</li>
            <li><strong>Battery Optimized:</strong> Uses iOS/Android efficient location APIs</li>
            <li><strong>User Control:</strong> Full control over what gets tracked</li>
          </ul>

          <h3>Example Queries</h3>
          <ul>
            <li>&quot;How many times did I go to the gym this month?&quot;</li>
            <li>&quot;When did I last visit Starbucks?&quot;</li>
            <li>&quot;How much time do I spend at the office on average?&quot;</li>
            <li>&quot;List all the places I visited yesterday&quot;</li>
          </ul>

          <h2 id="voice-notes">Voice Notes</h2>
          <p>
            Capture your thoughts, ideas, and memories with voice notes that are automatically transcribed.
          </p>

          <h3>Features</h3>
          <ul>
            <li><strong>One-Tap Recording:</strong> Quick and easy voice capture</li>
            <li><strong>Whisper Transcription:</strong> OpenAI Whisper for accurate transcription</li>
            <li><strong>Multi-Language Support:</strong> Supports 90+ languages automatically detected</li>
            <li><strong>Searchable:</strong> Full-text search across all transcriptions</li>
            <li><strong>AI-Queryable:</strong> Ask questions about your voice notes</li>
          </ul>

          <h3>Use Cases</h3>
          <ul>
            <li>Daily journaling and reflection</li>
            <li>Quick reminders and to-do items</li>
            <li>Meeting notes and summaries</li>
            <li>Ideas and creative thoughts</li>
            <li>Personal health logs</li>
          </ul>

          <h3>Example Queries</h3>
          <ul>
            <li>&quot;What did I talk about in my voice notes this week?&quot;</li>
            <li>&quot;Find my voice note about the project idea&quot;</li>
            <li>&quot;Summarize my journal entries from last month&quot;</li>
          </ul>

          <h2 id="ai-chat">AI Chat</h2>
          <p>
            The heart of SirCharge is its intelligent chat interface powered by RAG (Retrieval-Augmented Generation).
          </p>

          <h3>How It Works</h3>
          <ol>
            <li><strong>Query Understanding:</strong> Your question is analyzed to understand intent</li>
            <li><strong>Embedding Generation:</strong> Question converted to semantic vector</li>
            <li><strong>Context Retrieval:</strong> Relevant data found from your personal database</li>
            <li><strong>AI Response:</strong> GPT-4 generates accurate response using your context</li>
            <li><strong>Source Citations:</strong> Responses include references to source data</li>
          </ol>

          <h3>Query Types Supported</h3>
          <ul>
            <li><strong>Counting:</strong> &quot;How many times...&quot;, &quot;Count my...&quot;</li>
            <li><strong>Averaging:</strong> &quot;What&apos;s my average...&quot;</li>
            <li><strong>Comparison:</strong> &quot;Compare my... to...&quot;</li>
            <li><strong>Timeline:</strong> &quot;When did I last...&quot;</li>
            <li><strong>Summarization:</strong> &quot;Summarize my...&quot;</li>
            <li><strong>Search:</strong> &quot;Find my... about...&quot;</li>
          </ul>

          <h3>Tips for Better Responses</h3>
          <ul>
            <li>Be specific with time ranges (yesterday, last week, in January)</li>
            <li>Use activity names that match your tags</li>
            <li>Ask follow-up questions for more details</li>
            <li>Reference specific data types when relevant</li>
          </ul>

          <h2 id="insights-feed">Insights Feed</h2>
          <p>
            The Insights feed is your personalized AI-generated timeline about your life. It analyzes your data and creates meaningful posts about your patterns, achievements, and predictions.
          </p>

          <h3>Content Categories</h3>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Icon</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Health</td>
                <td>❤️</td>
                <td>Health data, sleep, heart rate insights</td>
              </tr>
              <tr>
                <td>Activity</td>
                <td>🏃</td>
                <td>Workouts, streaks, activity patterns</td>
              </tr>
              <tr>
                <td>Location</td>
                <td>📍</td>
                <td>Places visited, location patterns</td>
              </tr>
              <tr>
                <td>Social</td>
                <td>👥</td>
                <td>Social activities and connections</td>
              </tr>
              <tr>
                <td>Memory</td>
                <td>💭</td>
                <td>Memory highlights and anniversaries</td>
              </tr>
              <tr>
                <td>Achievement</td>
                <td>🏆</td>
                <td>Milestones and achievements</td>
              </tr>
            </tbody>
          </table>

          <h3>Post Types</h3>
          <ul>
            <li><strong>📋 Life Updates:</strong> Weekly and daily summaries</li>
            <li><strong>🏆 Milestones:</strong> &quot;100th gym visit!&quot;</li>
            <li><strong>🔮 Predictions:</strong> &quot;Tomorrow is your usual badminton day&quot;</li>
            <li><strong>💡 Insights:</strong> &quot;You&apos;re 30% more active on weekdays&quot;</li>
            <li><strong>📸 Memories:</strong> Photo and voice note highlights</li>
            <li><strong>🔥 Streaks:</strong> &quot;7-day workout streak!&quot;</li>
            <li><strong>📊 Comparisons:</strong> This month vs last month</li>
          </ul>

          <h3>AI Features Powering Insights</h3>
          <ul>
            <li><strong>Fun Facts:</strong> Daily trivia about your data (&quot;You&apos;ve walked 500 miles!&quot;)</li>
            <li><strong>Pattern Detection:</strong> Identifies your activity patterns</li>
            <li><strong>Anomaly Alerts:</strong> Notices unusual behavior changes</li>
            <li><strong>Mood Insights:</strong> Correlates activities with your mood</li>
            <li><strong>Life Forecaster:</strong> Predictions based on your patterns</li>
          </ul>

          <h3>Interacting with Insights</h3>
          <ul>
            <li><strong>Like:</strong> Save insights you find valuable</li>
            <li><strong>Share:</strong> Share with friends or to social circles</li>
            <li><strong>Prediction Feedback:</strong> Mark predictions as correct/incorrect to improve accuracy</li>
            <li><strong>Filter:</strong> View by category (Health, Activity, etc.)</li>
          </ul>

          <h2 id="data-insights">Dashboard</h2>
          <p>
            The dashboard gives you a quick overview of all your collected data.
          </p>

          <h3>Dashboard Features</h3>
          <ul>
            <li><strong>Data Statistics:</strong> See counts of all your data types</li>
            <li><strong>Recent Activity:</strong> Quick view of recently added data</li>
            <li><strong>Embedding Status:</strong> Track which data has been processed</li>
            <li><strong>Quick Actions:</strong> Easy access to common tasks</li>
          </ul>

          <h2 id="privacy-first">Privacy-First Design</h2>
          <p>
            SirCharge is built with privacy as a core principle.
          </p>

          <h3>Security Features</h3>
          <ul>
            <li><strong>User Data Isolation:</strong> Your data is completely separate from other users</li>
            <li><strong>End-to-End Encryption:</strong> Data encrypted in transit and at rest</li>
            <li><strong>Local-First Storage:</strong> Data stored locally before cloud sync</li>
            <li><strong>No Data Training:</strong> Your data is never used to train AI models</li>
            <li><strong>Data Export:</strong> Export all your data anytime</li>
            <li><strong>Account Deletion:</strong> Delete your account and all data permanently</li>
          </ul>

          <p>
            For more details, see our <Link href="/privacy">Privacy Policy</Link>.
          </p>

          <h2 id="next-steps">Next Steps</h2>
          <ul>
            <li><Link href="/docs/getting-started">Getting Started</Link> - Set up your account</li>
            <li><Link href="/docs/faq">FAQ</Link> - Common questions and answers</li>
            <li><Link href="/support">Support</Link> - Get help with issues</li>
          </ul>
        </article>
      </div>
    </div>
  );
}
