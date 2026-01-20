import { Metadata } from 'next';
import Link from 'next/link';
import { DocsSidebar } from '@/components/public/DocsSidebar';

export const metadata: Metadata = {
  title: 'Terms of Service - SirCharge',
  description: 'SirCharge Terms of Service - The terms and conditions for using our service.',
};

export default function TermsOfServicePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex gap-8">
        {/* Sidebar */}
        <div className="hidden md:block">
          <DocsSidebar />
        </div>

        {/* Main Content */}
        <article className="flex-1 min-w-0 prose prose-gray dark:prose-invert max-w-none">
          <h1>Terms of Service</h1>

          <p className="text-sm text-gray-500 dark:text-gray-400">
            Last updated: January 2026
          </p>

          <p className="lead">
            Please read these Terms of Service (&quot;Terms&quot;, &quot;Terms of Service&quot;) carefully before using the SirCharge mobile application and web service (&quot;Service&quot;) operated by SirCharge (&quot;us&quot;, &quot;we&quot;, or &quot;our&quot;).
          </p>

          <h2 id="acceptance">1. Acceptance of Terms</h2>

          <p>
            By accessing or using our Service, you agree to be bound by these Terms. If you disagree with any part of the terms, you may not access the Service.
          </p>

          <h2 id="description">2. Description of Service</h2>

          <p>
            SirCharge is a personal AI assistant service that:
          </p>
          <ul>
            <li>Collects and stores your personal data (health, location, voice notes, text, photos) with your permission</li>
            <li>Processes your data using artificial intelligence to provide insights</li>
            <li>Enables you to query your personal data through a chat interface</li>
            <li>Syncs your data across devices</li>
          </ul>

          <h2 id="accounts">3. Accounts</h2>

          <h3>3.1 Account Creation</h3>
          <p>
            To use the Service, you must create an account using Google Sign-In. You are responsible for safeguarding your Google account credentials.
          </p>

          <h3>3.2 Account Requirements</h3>
          <p>
            You must:
          </p>
          <ul>
            <li>Be at least 13 years old to use the Service</li>
            <li>Provide accurate and complete information</li>
            <li>Maintain the security of your account</li>
            <li>Notify us immediately of any unauthorized access</li>
          </ul>

          <h3>3.3 Account Termination</h3>
          <p>
            We reserve the right to suspend or terminate your account if you:
          </p>
          <ul>
            <li>Violate these Terms</li>
            <li>Engage in fraudulent or illegal activity</li>
            <li>Abuse the Service or other users</li>
          </ul>

          <h2 id="user-responsibilities">4. User Responsibilities</h2>

          <h3>4.1 Acceptable Use</h3>
          <p>
            You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree NOT to:
          </p>
          <ul>
            <li>Use the Service for any illegal purpose</li>
            <li>Attempt to gain unauthorized access to any part of the Service</li>
            <li>Interfere with or disrupt the Service or servers</li>
            <li>Transmit viruses, malware, or other harmful code</li>
            <li>Harvest or collect user information without consent</li>
            <li>Use the Service to harm or exploit minors</li>
            <li>Impersonate another person or entity</li>
          </ul>

          <h3>4.2 Content Standards</h3>
          <p>
            Content you create, upload, or share through the Service must not:
          </p>
          <ul>
            <li>Be defamatory, obscene, or offensive</li>
            <li>Infringe on intellectual property rights</li>
            <li>Contain personal information of others without consent</li>
            <li>Promote violence or discrimination</li>
            <li>Contain illegal content</li>
          </ul>

          <h2 id="intellectual-property">5. Intellectual Property</h2>

          <h3>5.1 Our Intellectual Property</h3>
          <p>
            The Service and its original content (excluding user content), features, and functionality are and will remain the exclusive property of SirCharge and its licensors. The Service is protected by copyright, trademark, and other intellectual property laws.
          </p>

          <h3>5.2 Your Content</h3>
          <p>
            You retain ownership of any content you create or upload to the Service. By using the Service, you grant us a limited license to:
          </p>
          <ul>
            <li>Store and process your content to provide the Service</li>
            <li>Generate embeddings and AI responses from your content</li>
            <li>Back up and restore your content</li>
          </ul>
          <p>
            This license ends when you delete your content or account.
          </p>

          <h3>5.3 Feedback</h3>
          <p>
            If you provide feedback, suggestions, or improvements, you grant us the right to use them without compensation or attribution.
          </p>

          <h2 id="privacy">6. Privacy</h2>

          <p>
            Your privacy is important to us. Please review our <Link href="/privacy">Privacy Policy</Link> to understand how we collect, use, and protect your data.
          </p>

          <h2 id="third-party-services">7. Third-Party Services</h2>

          <p>
            The Service integrates with third-party services including:
          </p>
          <ul>
            <li>Google (Authentication, Android services)</li>
            <li>Apple (HealthKit, iOS services)</li>
            <li>OpenAI (AI processing)</li>
            <li>Firebase (Backend services)</li>
            <li>Pinecone (Vector database)</li>
          </ul>
          <p>
            Your use of these services is subject to their respective terms and policies.
          </p>

          <h2 id="disclaimers">8. Disclaimers</h2>

          <h3>8.1 Service Provided &quot;As Is&quot;</h3>
          <p>
            THE SERVICE IS PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS, WITHOUT ANY WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
          </p>
          <ul>
            <li>IMPLIED WARRANTIES OF MERCHANTABILITY</li>
            <li>FITNESS FOR A PARTICULAR PURPOSE</li>
            <li>NON-INFRINGEMENT</li>
            <li>ACCURACY OR COMPLETENESS OF INFORMATION</li>
          </ul>

          <h3>8.2 AI Limitations</h3>
          <p>
            The AI features of the Service:
          </p>
          <ul>
            <li>May produce inaccurate or incomplete responses</li>
            <li>Should not be relied upon for medical, legal, or financial advice</li>
            <li>Are based on the data you provide and may reflect biases in that data</li>
          </ul>

          <h3>8.3 Health Information</h3>
          <p>
            SirCharge is NOT a medical device. Health data and insights provided are for informational purposes only and should not replace professional medical advice.
          </p>

          <h2 id="limitation-liability">9. Limitation of Liability</h2>

          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL SIRCHARGE, ITS DIRECTORS, EMPLOYEES, PARTNERS, AGENTS, SUPPLIERS, OR AFFILIATES BE LIABLE FOR:
          </p>
          <ul>
            <li>ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES</li>
            <li>LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES</li>
            <li>DAMAGES RESULTING FROM UNAUTHORIZED ACCESS TO YOUR DATA</li>
            <li>DAMAGES RESULTING FROM INTERRUPTION OF SERVICE</li>
          </ul>
          <p>
            OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE PAST TWELVE MONTHS, OR $100, WHICHEVER IS GREATER.
          </p>

          <h2 id="indemnification">10. Indemnification</h2>

          <p>
            You agree to defend, indemnify, and hold harmless SirCharge and its officers, directors, employees, and agents from any claims, damages, obligations, losses, liabilities, costs, or debt arising from:
          </p>
          <ul>
            <li>Your use of the Service</li>
            <li>Your violation of these Terms</li>
            <li>Your violation of any third-party rights</li>
            <li>Content you create or upload</li>
          </ul>

          <h2 id="modifications">11. Modifications to Service</h2>

          <p>
            We reserve the right to:
          </p>
          <ul>
            <li>Modify or discontinue the Service at any time</li>
            <li>Change features, functionality, or pricing</li>
            <li>Impose limits on certain features or access</li>
          </ul>
          <p>
            We will provide reasonable notice of material changes when possible.
          </p>

          <h2 id="changes-to-terms">12. Changes to Terms</h2>

          <p>
            We may revise these Terms at any time. Material changes will be notified through:
          </p>
          <ul>
            <li>In-app notification</li>
            <li>Email to your registered address</li>
            <li>Updated &quot;Last updated&quot; date on this page</li>
          </ul>
          <p>
            Continued use of the Service after changes constitutes acceptance of the new Terms.
          </p>

          <h2 id="governing-law">13. Governing Law</h2>

          <p>
            These Terms shall be governed by and construed in accordance with the laws of the State of California, United States, without regard to its conflict of law provisions.
          </p>

          <h2 id="dispute-resolution">14. Dispute Resolution</h2>

          <h3>14.1 Informal Resolution</h3>
          <p>
            Before filing a claim, you agree to try to resolve the dispute informally by contacting us at <a href="mailto:fitness.w@gmail.com">fitness.w@gmail.com</a>.
          </p>

          <h3>14.2 Arbitration</h3>
          <p>
            If informal resolution fails, any disputes shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association.
          </p>

          <h3>14.3 Class Action Waiver</h3>
          <p>
            You agree to resolve disputes on an individual basis. You waive any right to participate in a class action lawsuit or class-wide arbitration.
          </p>

          <h2 id="severability">15. Severability</h2>

          <p>
            If any provision of these Terms is held to be invalid or unenforceable, the remaining provisions will remain in full force and effect.
          </p>

          <h2 id="entire-agreement">16. Entire Agreement</h2>

          <p>
            These Terms, together with the <Link href="/privacy">Privacy Policy</Link>, constitute the entire agreement between you and SirCharge regarding the Service.
          </p>

          <h2 id="contact">17. Contact Us</h2>

          <p>
            If you have questions about these Terms, contact us:
          </p>
          <ul>
            <li><strong>Email:</strong> <a href="mailto:fitness.w@gmail.com">fitness.w@gmail.com</a></li>
            <li><strong>Support:</strong> <Link href="/support">Support Center</Link></li>
          </ul>
        </article>
      </div>
    </div>
  );
}
