import { Metadata } from 'next';
import Link from 'next/link';
import { DocsSidebar } from '@/components/public/DocsSidebar';

export const metadata: Metadata = {
  title: 'Privacy Policy - SirCharge',
  description: 'SirCharge Privacy Policy - Learn how we collect, use, and protect your personal data.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex gap-8">
        {/* Sidebar */}
        <div className="hidden md:block">
          <DocsSidebar />
        </div>

        {/* Main Content */}
        <article className="flex-1 min-w-0 prose prose-gray dark:prose-invert max-w-none">
          <h1>Privacy Policy</h1>

          <p className="text-sm text-gray-500 dark:text-gray-400">
            Last updated: January 2026
          </p>

          <p className="lead">
            SirCharge (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and web service.
          </p>

          <h2 id="information-collected">Information We Collect</h2>

          <h3>Information You Provide</h3>
          <ul>
            <li><strong>Account Information:</strong> Google account details (email, name, profile picture) when you sign in</li>
            <li><strong>Text Notes:</strong> Diary entries, quick thoughts, and notes you create</li>
            <li><strong>Voice Notes:</strong> Audio recordings and their transcriptions</li>
            <li><strong>Photos:</strong> Images you upload along with descriptions and location data</li>
            <li><strong>Activity Tags:</strong> Labels you assign to locations</li>
          </ul>

          <h3>Information Collected Automatically</h3>
          <ul>
            <li><strong>Health Data:</strong> With your permission, data from Apple Health (iOS) or Google Fit (Android) including steps, workouts, sleep, heart rate, and active energy</li>
            <li><strong>Location Data:</strong> With your permission, significant locations you visit</li>
            <li><strong>Device Information:</strong> Device type, operating system, app version</li>
            <li><strong>Usage Data:</strong> Features used, interaction patterns, error logs</li>
          </ul>

          <h3>Information from Third Parties</h3>
          <ul>
            <li><strong>Google Authentication:</strong> Basic profile information from Google when you sign in</li>
            <li><strong>Health Platforms:</strong> Health data from Apple Health or Google Fit (with your explicit permission)</li>
          </ul>

          <h2 id="how-we-use">How We Use Your Information</h2>

          <p>We use the information we collect to:</p>
          <ul>
            <li><strong>Provide Services:</strong> Enable AI-powered chat, data insights, and personal analytics</li>
            <li><strong>Generate Embeddings:</strong> Convert your data to semantic vectors for AI search</li>
            <li><strong>Improve the App:</strong> Understand usage patterns to improve features</li>
            <li><strong>Provide Support:</strong> Respond to your inquiries and troubleshoot issues</li>
            <li><strong>Security:</strong> Detect and prevent fraud, abuse, and security incidents</li>
          </ul>

          <h2 id="data-processing">Data Processing and AI</h2>

          <h3>Embedding Generation</h3>
          <p>
            Your data is converted to semantic embeddings (numerical vectors) using OpenAI&apos;s embedding models. These embeddings:
          </p>
          <ul>
            <li>Enable AI search across your personal data</li>
            <li>Are stored separately from your raw data</li>
            <li>Cannot be reverse-engineered to reveal original content</li>
          </ul>

          <h3>AI Chat Processing</h3>
          <p>
            When you use the AI chat feature:
          </p>
          <ul>
            <li>Your question is sent to OpenAI&apos;s API along with relevant context from your data</li>
            <li>OpenAI processes this with zero data retention (not stored or used for training)</li>
            <li>Responses are generated and returned to you</li>
          </ul>

          <h3>Voice Transcription</h3>
          <p>
            Voice notes are transcribed using OpenAI&apos;s Whisper API:
          </p>
          <ul>
            <li>Audio is temporarily sent to OpenAI for transcription</li>
            <li>OpenAI has zero data retention for Whisper API</li>
            <li>Transcriptions are stored with your data</li>
          </ul>

          <h2 id="third-party-services">Third-Party Services</h2>

          <p>We use the following third-party services to provide SirCharge:</p>

          <table>
            <thead>
              <tr>
                <th>Service</th>
                <th>Purpose</th>
                <th>Privacy Policy</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Google Firebase</td>
                <td>Authentication, Database, Storage</td>
                <td><a href="https://firebase.google.com/support/privacy" target="_blank" rel="noopener noreferrer">Firebase Privacy</a></td>
              </tr>
              <tr>
                <td>OpenAI</td>
                <td>AI Chat, Embeddings, Transcription</td>
                <td><a href="https://openai.com/privacy" target="_blank" rel="noopener noreferrer">OpenAI Privacy</a></td>
              </tr>
              <tr>
                <td>Pinecone</td>
                <td>Vector Database for AI Search</td>
                <td><a href="https://www.pinecone.io/privacy/" target="_blank" rel="noopener noreferrer">Pinecone Privacy</a></td>
              </tr>
              <tr>
                <td>Vercel</td>
                <td>Web App Hosting</td>
                <td><a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">Vercel Privacy</a></td>
              </tr>
            </tbody>
          </table>

          <h2 id="data-retention">Data Retention</h2>

          <ul>
            <li><strong>Account Data:</strong> Retained while your account is active</li>
            <li><strong>Personal Data:</strong> Retained until you delete it or your account</li>
            <li><strong>Embeddings:</strong> Deleted when source data is deleted</li>
            <li><strong>Analytics:</strong> Aggregated, anonymous data may be retained indefinitely</li>
            <li><strong>Deleted Accounts:</strong> All data permanently deleted within 30 days</li>
          </ul>

          <h2 id="data-security">Data Security</h2>

          <p>We implement security measures including:</p>
          <ul>
            <li><strong>Encryption in Transit:</strong> All data transferred using TLS/HTTPS</li>
            <li><strong>Encryption at Rest:</strong> Data encrypted on Firebase and Pinecone servers</li>
            <li><strong>Access Control:</strong> Strict user data isolation via security rules</li>
            <li><strong>Authentication:</strong> Secure Google OAuth 2.0</li>
            <li><strong>Regular Audits:</strong> Security practices reviewed regularly</li>
          </ul>

          <h2 id="your-rights">Your Rights</h2>

          <p>You have the right to:</p>
          <ul>
            <li><strong>Access:</strong> Request a copy of your personal data</li>
            <li><strong>Correction:</strong> Request correction of inaccurate data</li>
            <li><strong>Deletion:</strong> Request deletion of your data</li>
            <li><strong>Export:</strong> Export your data in a portable format</li>
            <li><strong>Object:</strong> Object to certain processing activities</li>
            <li><strong>Restrict:</strong> Request restriction of processing</li>
          </ul>

          <p>
            To exercise these rights, contact us at <a href="mailto:sircharge.ai@gmail.com">sircharge.ai@gmail.com</a>.
          </p>

          <h2 id="data-export">Data Export and Portability</h2>

          <p>You can export your data at any time:</p>
          <ol>
            <li>Go to Settings &gt; Privacy &gt; Export Data</li>
            <li>Select data types to export</li>
            <li>Choose format (JSON or CSV)</li>
            <li>Download your export</li>
          </ol>

          <h2 id="childrens-privacy">Children&apos;s Privacy</h2>

          <p>
            SirCharge is not intended for users under 13 years of age. We do not knowingly collect personal information from children under 13. If we learn we have collected such information, we will delete it promptly.
          </p>

          <h2 id="international-transfers">International Data Transfers</h2>

          <p>
            Your data may be transferred to and processed in countries other than your own, including the United States where our service providers (Firebase, OpenAI, Pinecone) operate. These transfers are protected by appropriate safeguards including standard contractual clauses.
          </p>

          <h2 id="changes">Changes to This Policy</h2>

          <p>
            We may update this Privacy Policy from time to time. We will notify you of material changes by:
          </p>
          <ul>
            <li>Posting the new policy on this page</li>
            <li>Updating the &quot;Last updated&quot; date</li>
            <li>Sending an email notification for significant changes</li>
          </ul>

          <h2 id="contact">Contact Us</h2>

          <p>If you have questions about this Privacy Policy, contact us:</p>
          <ul>
            <li><strong>Email:</strong> <a href="mailto:sircharge.ai@gmail.com">sircharge.ai@gmail.com</a></li>
            <li><strong>Support:</strong> <Link href="/support">Support Center</Link></li>
          </ul>

          <h2 id="additional-rights">Additional Rights for Specific Regions</h2>

          <h3>California Residents (CCPA)</h3>
          <p>
            California residents have additional rights under the California Consumer Privacy Act (CCPA), including the right to know what personal information is collected and the right to request deletion.
          </p>

          <h3>European Residents (GDPR)</h3>
          <p>
            EU/EEA residents have rights under the General Data Protection Regulation (GDPR). Our legal basis for processing is consent (for health/location data) and contract performance (for core service features). You may withdraw consent at any time.
          </p>

          <p>
            For region-specific requests, contact <a href="mailto:sircharge.ai@gmail.com">sircharge.ai@gmail.com</a>.
          </p>
        </article>
      </div>
    </div>
  );
}
