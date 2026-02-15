'use client';

import { useState } from 'react';
import Link from 'next/link';

type Section = 'rag' | 'generation' | 'notifications' | null;

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`w-5 h-5 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function RAGContextSection() {
  return (
    <div className="pt-4">
      <p className="text-sm text-orange-800 mb-4">
        <code>FunFactsService</code> uses RAG (Retrieval-Augmented Generation) to query relevant user
        data from Pinecone, then generates personalized fun facts using GPT-4o-mini via the{' '}
        <code>CarouselInsights</code> prompt service.
      </p>

      {/* Step 1: Period Calculation */}
      <div className="bg-white rounded-lg p-4 border border-orange-100 mb-4">
        <p className="font-semibold text-orange-900 text-sm mb-2">Step 1: Calculate Period Dates</p>
        <p className="text-xs text-orange-700 mb-3">
          The service calculates start/end dates and a localized label for the requested period type.
          Labels use <code>Intl.DateTimeFormat</code> for proper month/date localization across 9 languages.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-orange-200">
                <th className="text-left py-1.5 pr-3 text-orange-700 font-semibold">Period</th>
                <th className="text-left py-1.5 px-3 text-orange-700 font-semibold">Start</th>
                <th className="text-left py-1.5 px-3 text-orange-700 font-semibold">End</th>
                <th className="text-left py-1.5 px-3 text-orange-700 font-semibold">Label Example</th>
              </tr>
            </thead>
            <tbody className="text-orange-800">
              {[
                { period: 'Weekly', start: 'Monday 00:00', end: 'Sunday 23:59', label: 'Week 7, 2026' },
                { period: 'Monthly', start: '1st of month', end: 'Last day 23:59', label: 'February 2026' },
                { period: 'Quarterly', start: '1st of quarter', end: 'Last day of quarter', label: 'Q1 2026' },
                { period: 'Yearly', start: 'Jan 1', end: 'Dec 31', label: '2026' },
              ].map((row) => (
                <tr key={row.period} className="border-b border-orange-50">
                  <td className="py-1.5 pr-3 font-medium">{row.period}</td>
                  <td className="py-1.5 px-3 font-mono text-[11px]">{row.start}</td>
                  <td className="py-1.5 px-3 font-mono text-[11px]">{row.end}</td>
                  <td className="py-1.5 px-3 font-mono text-[11px]">{row.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Step 2: Pinecone Query */}
      <div className="bg-white rounded-lg p-4 border border-orange-100 mb-4">
        <p className="font-semibold text-orange-900 text-sm mb-2">Step 2: Query RAG Context from Pinecone</p>
        <p className="text-xs text-orange-700 mb-3">
          Generates an embedding for the query text, then retrieves the <code>topK=15</code> most
          relevant vectors filtered by <code>userId</code>.
        </p>
        <div className="bg-orange-50 rounded-md p-3 text-xs text-orange-700 font-mono mb-3">
          Query: &quot;My activities, health, and experiences during {'{periodLabel}'}&quot;
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-orange-50 rounded-lg p-2.5">
            <p className="text-xs font-bold text-orange-700">Embedding Model</p>
            <p className="text-[11px] text-orange-600 mt-0.5 font-mono">text-embedding-3-small</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-2.5">
            <p className="text-xs font-bold text-orange-700">Top K</p>
            <p className="text-[11px] text-orange-600 mt-0.5 font-mono">15 vectors</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-2.5">
            <p className="text-xs font-bold text-orange-700">Context Used</p>
            <p className="text-[11px] text-orange-600 mt-0.5 font-mono">Top 10 items</p>
          </div>
        </div>
        <p className="text-xs text-orange-600 mt-3">
          Context is formatted as numbered lines with dates and text from each vector&apos;s metadata fields
          (<code>text</code>, <code>summary</code>, <code>content</code>).
        </p>
      </div>

      {/* Step 2b: Structured Data Context */}
      <div className="bg-white rounded-lg p-4 border border-orange-100 mb-4">
        <p className="font-semibold text-orange-900 text-sm mb-2">Step 2b: Collect Structured Data from Firestore</p>
        <p className="text-xs text-orange-700 mb-3">
          <code>FunFactGenerator.collectStructuredData()</code> queries Firestore directly for precise stats.
          This plain-text summary is passed as context to ALL insight types (both AI insights and data-stat facts).
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          {[
            {
              source: 'Health Summary',
              icon: '❤️',
              collection: 'healthData',
              lookback: '90 days',
              details: 'Total steps, daily avg, week-over-week %, streak, personal record, weekday vs weekend avg',
            },
            {
              source: 'Activity Summary',
              icon: '🏃',
              collection: 'locationData (with activity)',
              lookback: '90 days',
              details: 'Top activities with %, most common day/time for top activity, activity streak',
            },
            {
              source: 'Location Summary',
              icon: '📍',
              collection: 'locationData',
              lookback: 'All time + 7-day window',
              details: 'Unique locations total, locations visited this week, top 3 most visited places with visit counts',
            },
            {
              source: 'Memory Summary',
              icon: '📸',
              collection: 'photoMemories + voiceNotes',
              lookback: 'All time + 7-day window',
              details: 'Total photo count, total voice note count, photos this week, voice notes this week',
            },
          ].map((item) => (
            <div key={item.source} className="bg-orange-50 rounded-lg p-3 border border-orange-100">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{item.icon}</span>
                <span className="text-xs font-bold text-orange-800">{item.source}</span>
              </div>
              <p className="text-[11px] text-orange-600">{item.details}</p>
              <p className="text-[10px] text-orange-500 mt-1 font-mono">Collection: {item.collection}</p>
              <p className="text-[10px] text-orange-500 font-mono">Lookback: {item.lookback}</p>
            </div>
          ))}
        </div>
        <div className="bg-orange-50 rounded-md p-2.5 text-xs text-orange-700">
          <strong>Context targeting:</strong> AI insight types (patterns, surprising, recommendation) receive the full
          combined context from all 4 sources. Data-stat types receive <strong>only their relevant domain</strong>:
          <code>health_stat</code> gets health summary only, <code>activity_stat</code> gets activity summary only,
          <code>location_stat</code> gets location summary only. Memory counts (photos/voice notes) are only included
          in the combined context for AI insights.
        </div>
      </div>

      {/* Collection note */}
      <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
        <p className="text-xs text-amber-800">
          <strong>Collection:</strong> All facts are stored in <code>funFacts</code> (camelCase).
          The legacy <code>fun_facts</code> (snake_case) collection is deprecated and no longer written to.
        </p>
      </div>
    </div>
  );
}

function GenerationSection() {
  return (
    <div className="pt-4">
      <p className="text-sm text-amber-800 mb-4">
        For each period, the service generates <strong>3&ndash;6 facts</strong> using the <code>CarouselInsights</code> prompt service:
        3 AI insight facts (always) + up to 3 data-stat facts (when structured data is available).
      </p>

      {/* Step 3a: AI Insight Types (always generated) */}
      <div className="bg-white rounded-lg p-4 border border-amber-100 mb-4">
        <p className="font-semibold text-amber-900 text-sm mb-1">Step 3a: AI Insight Facts (Always Generated)</p>
        <p className="text-xs text-amber-600 mb-3">Creative insights from RAG context. Temperature: 0.7</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          {[
            { type: 'patterns', emoji: '📊', desc: 'Recurring behaviors and trends', cat: 'pattern', prompt: '{period}_patterns' },
            { type: 'surprising', emoji: '✨', desc: 'Unexpected or noteworthy findings', cat: 'statistic', prompt: '{period}_surprising' },
            { type: 'recommendation', emoji: '💡', desc: 'Actionable suggestions', cat: 'achievement', prompt: '{period}_recommendation' },
          ].map((item) => (
            <div key={item.type} className="bg-amber-50 rounded-lg p-3 border border-amber-100">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{item.emoji}</span>
                <span className="text-xs font-bold text-amber-800">{item.type}</span>
              </div>
              <p className="text-[11px] text-amber-600">{item.desc}</p>
              <p className="text-[10px] text-amber-500 mt-1 font-mono">Category: {item.cat}</p>
              <p className="text-[10px] text-amber-500 font-mono">Prompt: {item.prompt}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Step 3b: Data-Stat Types (conditional) */}
      <div className="bg-white rounded-lg p-4 border border-blue-100 mb-4">
        <p className="font-semibold text-blue-900 text-sm mb-1">Step 3b: Data-Stat Facts (When Structured Data Available)</p>
        <p className="text-xs text-blue-600 mb-3">
          Template-inspired facts using precise stats from Firestore. Each type receives <strong>only its
          relevant domain data</strong> (no RAG context, no cross-domain data).
          Only generated when <code>structuredDataContext</code> is provided. Temperature: 0.5
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          {[
            { type: 'health_stat', emoji: '📈', desc: 'Step counts, streaks, personal records, week-over-week changes', cat: 'comparison', prompt: '{period}_health_stat' },
            { type: 'activity_stat', emoji: '🏃', desc: 'Top activities with %, day/time patterns, streaks', cat: 'statistic', prompt: '{period}_activity_stat' },
            { type: 'location_stat', emoji: '📍', desc: 'Most visited places, visit counts, new discoveries', cat: 'milestone', prompt: '{period}_location_stat' },
          ].map((item) => (
            <div key={item.type} className="bg-blue-50 rounded-lg p-3 border border-blue-100">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{item.emoji}</span>
                <span className="text-xs font-bold text-blue-800">{item.type}</span>
              </div>
              <p className="text-[11px] text-blue-600">{item.desc}</p>
              <p className="text-[10px] text-blue-500 mt-1 font-mono">Category: {item.cat}</p>
              <p className="text-[10px] text-blue-500 font-mono">Prompt: {item.prompt}</p>
            </div>
          ))}
        </div>
        <div className="bg-blue-50 rounded-md p-2.5 text-xs text-blue-700">
          <strong>Structured data</strong> is collected by <code>FunFactGenerator.collectStructuredData()</code> from
          Firestore: health summaries, activity patterns, location visits, and memory counts.
        </div>
      </div>

      {/* Prompt ID format note */}
      <div className="bg-amber-50 rounded-md p-2.5 text-xs text-amber-700 mb-4">
        <strong>Prompt ID format:</strong> <code>{'{periodType}'}_{'{insightType}'}</code> (e.g., <code>weekly_patterns</code>, <code>monthly_health_stat</code>)
        <br />
        <strong>Fallback:</strong> If period-specific prompt not found, falls back to <code>insight_{'{insightType}'}</code>
      </div>

      {/* Step 4: GPT Call */}
      <div className="bg-white rounded-lg p-4 border border-amber-100 mb-4">
        <p className="font-semibold text-amber-900 text-sm mb-3">Step 4: GPT Call Pipeline</p>

        <p className="text-xs text-amber-700 mb-2 font-medium">AI Insights (patterns, surprising, recommendation):</p>
        <div className="flex flex-col sm:flex-row items-stretch gap-2 mb-3">
          {[
            { label: 'System prompt', desc: 'CarouselInsights system' },
            { label: 'All structured data', desc: 'Health + activity + location + memory' },
            { label: 'RAG context', desc: 'User activities from Pinecone' },
            { label: 'User prompt', desc: 'Period + insight type specific' },
            { label: 'GPT-4o-mini', desc: 'temp 0.7, max 100 tokens' },
          ].map((step, i) => (
            <div key={step.label} className="flex-1 flex items-center gap-2">
              <div className="bg-amber-100 rounded-lg p-2.5 flex-1 text-center">
                <p className="text-xs font-semibold text-amber-900">{step.label}</p>
                <p className="text-[10px] text-amber-600 mt-0.5">{step.desc}</p>
              </div>
              {i < 4 && <span className="text-amber-300 font-bold hidden sm:block">&rarr;</span>}
            </div>
          ))}
        </div>

        <p className="text-xs text-blue-700 mb-2 font-medium">Data Stats (health_stat, activity_stat, location_stat):</p>
        <div className="flex flex-col sm:flex-row items-stretch gap-2">
          {[
            { label: 'System prompt', desc: 'CarouselInsights system' },
            { label: 'Domain data only', desc: 'e.g. health_stat = health summary' },
            { label: 'User prompt', desc: 'Period + insight type specific' },
            { label: 'GPT-4o-mini', desc: 'temp 0.5, max 100 tokens' },
          ].map((step, i) => (
            <div key={step.label} className="flex-1 flex items-center gap-2">
              <div className="bg-blue-100 rounded-lg p-2.5 flex-1 text-center">
                <p className="text-xs font-semibold text-blue-900">{step.label}</p>
                <p className="text-[10px] text-blue-600 mt-0.5">{step.desc}</p>
              </div>
              {i < 3 && <span className="text-blue-300 font-bold hidden sm:block">&rarr;</span>}
            </div>
          ))}
        </div>
        <div className="bg-blue-50 rounded-md p-2 mt-2 text-[10px] text-blue-600">
          No RAG context for data-stat types &mdash; they rely solely on structured Firestore data.
        </div>
        <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
          <div>
            <span className="text-amber-600">Model:</span>
            <span className="ml-1 font-mono text-amber-900">gpt-4o-mini</span>
          </div>
          <div>
            <span className="text-amber-600">Temperature:</span>
            <span className="ml-1 text-amber-900">0.7 (insights) / 0.5 (stats)</span>
          </div>
          <div>
            <span className="text-amber-600">Max tokens:</span>
            <span className="ml-1 text-amber-900">100</span>
          </div>
          <div>
            <span className="text-amber-600">Language:</span>
            <span className="ml-1 text-amber-900">9 supported</span>
          </div>
        </div>
      </div>

      {/* Step 5: Post-processing */}
      <div className="bg-white rounded-lg p-4 border border-amber-100 mb-4">
        <p className="font-semibold text-amber-900 text-sm mb-2">Step 5: Post-Processing & Save</p>
        <div className="space-y-2 text-xs text-amber-700">
          <p>1. <strong>Emoji extraction:</strong> If response starts with an emoji, it&apos;s extracted as the fact emoji. Otherwise, default emoji is used per insight type.</p>
          <p>2. <strong>Confidence:</strong> Fixed at <code>0.85</code> for all AI-generated facts.</p>
          <p>3. <strong>Data point count:</strong> Number of lines in the RAG context.</p>
          <p>4. <strong>Save to Firestore:</strong> Saved to <code>funFacts</code> collection with <code>viewed: false</code>, <code>hidden: false</code>.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs mt-3">
          {['text', 'category', 'insightType', 'confidence', 'emoji', 'periodType', 'periodStart', 'periodEnd', 'periodLabel', 'dataPointCount', 'viewed', 'hidden'].map((field) => (
            <span key={field} className="bg-amber-50 text-amber-700 rounded px-2 py-1 font-mono border border-amber-100">
              {field}
            </span>
          ))}
        </div>
      </div>

      {/* Execution tracking note */}
      <div className="bg-amber-50 rounded-lg p-3 border border-amber-200 mb-4">
        <p className="text-xs text-amber-800">
          <strong>Execution Tracking:</strong> Each GPT call is tracked via <code>PromptExecutionTracker</code> with
          service = <code>CarouselInsights</code>. Execution records are matched heuristically by service, userId,
          promptId (containing periodType and insightType), and timestamp proximity.
        </p>
      </div>

      {/* Link to prompt config */}
      <div className="text-xs text-amber-600">
        <Link
          href="/admin/prompts/CarouselInsights"
          className="text-amber-600 hover:text-amber-800 hover:underline font-medium"
        >
          View Prompt Config for CarouselInsights &rarr;
        </Link>
      </div>
    </div>
  );
}

function NotificationSection() {
  return (
    <div className="pt-4">
      <p className="text-sm text-green-800 mb-4">
        After saving fun facts, <code>FunFactsService.saveFunFacts()</code> fires a notification via{' '}
        <code>FunFactNotificationService</code> (fire-and-forget). This applies to ALL fact types
        (both AI insights and data-stat facts).
      </p>

      {/* Notification Flow */}
      <div className="bg-white rounded-lg p-4 border border-green-100 mb-4">
        <p className="font-semibold text-green-900 text-sm mb-3">Notification Pipeline</p>
        <div className="space-y-2 text-xs text-green-700">
          <p>1. <strong>Select best fact:</strong> Pick the fact with highest confidence score from the batch.</p>
          <p>2. <strong>Check FCM token:</strong> User must have a registered device token in <code>users</code> collection.</p>
          <p>3. <strong>Check preferences:</strong> User&apos;s <code>notificationPreferences.funFacts</code> must not be <code>false</code>.</p>
          <p>4. <strong>Check quiet hours:</strong> Uses <code>QuietHoursChecker</code> with user&apos;s timezone. Suppressed during quiet hours.</p>
          <p>5. <strong>Rate limit:</strong> Max 1 fun fact notification per hour per user (in-memory cache).</p>
          <p>6. <strong>Build content:</strong> Localized title + body (truncated to 80 chars). Supports 6 languages.</p>
          <p>7. <strong>Send FCM:</strong> Push notification with <code>type: &quot;fun_fact&quot;</code> data payload for navigation.</p>
          <p>8. <strong>Log history:</strong> Records to <code>NotificationHistoryService</code> (sent or suppressed + reason).</p>
        </div>
      </div>

      {/* FCM Payload */}
      <div className="bg-white rounded-lg p-4 border border-green-100 mb-4">
        <p className="font-semibold text-green-900 text-sm mb-2">FCM Payload</p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
          {[
            { field: 'type', value: '"fun_fact"' },
            { field: 'factId', value: 'Best fact ID' },
            { field: 'periodType', value: 'weekly/monthly/...' },
            { field: 'category', value: 'pattern/comparison/...' },
            { field: 'emoji', value: 'Fact emoji' },
            { field: 'insightType', value: 'patterns/health_stat/...' },
          ].map((item) => (
            <div key={item.field} className="bg-green-50 rounded-md p-2 border border-green-100">
              <span className="font-mono text-green-800">{item.field}</span>
              <span className="text-green-600 ml-1">{item.value}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-green-600">Android channel:</span>
            <span className="ml-1 font-mono text-green-900">insights</span>
          </div>
          <div>
            <span className="text-green-600">iOS:</span>
            <span className="ml-1 text-green-900">badge: 1, sound: default</span>
          </div>
        </div>
      </div>

      {/* Suppression reasons */}
      <div className="bg-white rounded-lg p-4 border border-green-100 mb-4">
        <p className="font-semibold text-green-900 text-sm mb-2">Suppression Reasons</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-green-200">
                <th className="text-left py-1.5 pr-3 text-green-700 font-semibold">Reason</th>
                <th className="text-left py-1.5 px-3 text-green-700 font-semibold">Description</th>
                <th className="text-left py-1.5 px-3 text-green-700 font-semibold">Logged As</th>
              </tr>
            </thead>
            <tbody className="text-green-800">
              {[
                { reason: 'No FCM token', desc: 'User has not registered a device token', logged: 'Not logged (early exit)' },
                { reason: 'Notifications disabled', desc: 'notificationPreferences.enabled = false', logged: 'Not logged (early exit)' },
                { reason: 'Fun facts disabled', desc: 'notificationPreferences.funFacts = false', logged: 'Not logged (early exit)' },
                { reason: 'Quiet hours', desc: 'Current time falls within user\'s quiet hours window', logged: 'suppressed / quiet_hours' },
                { reason: 'Rate limited', desc: 'Another fun fact notification sent within the last hour', logged: 'suppressed / rate_limit' },
                { reason: 'Invalid token', desc: 'FCM token expired or invalid (token auto-cleared)', logged: 'Not logged (FCM error)' },
              ].map((row) => (
                <tr key={row.reason} className="border-b border-green-50">
                  <td className="py-1.5 pr-3 font-medium">{row.reason}</td>
                  <td className="py-1.5 px-3">{row.desc}</td>
                  <td className="py-1.5 px-3 font-mono text-[11px]">{row.logged}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Localization */}
      <div className="bg-green-50 rounded-lg p-3 border border-green-200">
        <p className="text-xs text-green-800">
          <strong>Localization:</strong> Notification content is localized using user&apos;s <code>locale</code> setting.
          Supported languages: en, es, fr, de, ja, zh. Falls back to English if locale not supported.
          For multiple facts, title shows count (e.g., &quot;3 New Fun Facts&quot;) and body mentions remaining count.
        </p>
      </div>
    </div>
  );
}

export default function FunFactAlgorithmReference() {
  const [expanded, setExpanded] = useState<Section>(null);

  const toggle = (section: Section) => {
    setExpanded((prev) => (prev === section ? null : section));
  };

  return (
    <div className="space-y-3">
      {/* RAG Context */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg overflow-hidden">
        <button
          onClick={() => toggle('rag')}
          className="w-full flex items-center gap-3 p-4 text-left hover:bg-orange-100/50 transition-colors cursor-pointer"
        >
          <div className="text-orange-500 text-xl">&#128269;</div>
          <h3 className="flex-1 text-lg font-semibold text-orange-900">Fun Facts: RAG Context &amp; Data</h3>
          <div className="text-orange-400">
            <ChevronIcon expanded={expanded === 'rag'} />
          </div>
        </button>
        {expanded === 'rag' && (
          <div className="px-4 pb-4">
            <RAGContextSection />
          </div>
        )}
      </div>

      {/* GPT Generation */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg overflow-hidden">
        <button
          onClick={() => toggle('generation')}
          className="w-full flex items-center gap-3 p-4 text-left hover:bg-amber-100/50 transition-colors cursor-pointer"
        >
          <div className="text-amber-500 text-xl">&#129302;</div>
          <h3 className="flex-1 text-lg font-semibold text-amber-900">Fun Facts: GPT Generation &amp; Saving</h3>
          <div className="text-amber-400">
            <ChevronIcon expanded={expanded === 'generation'} />
          </div>
        </button>
        {expanded === 'generation' && (
          <div className="px-4 pb-4">
            <GenerationSection />
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="bg-green-50 border border-green-200 rounded-lg overflow-hidden">
        <button
          onClick={() => toggle('notifications')}
          className="w-full flex items-center gap-3 p-4 text-left hover:bg-green-100/50 transition-colors cursor-pointer"
        >
          <div className="text-green-500 text-xl">&#128276;</div>
          <h3 className="flex-1 text-lg font-semibold text-green-900">Fun Facts: Push Notifications</h3>
          <div className="text-green-400">
            <ChevronIcon expanded={expanded === 'notifications'} />
          </div>
        </button>
        {expanded === 'notifications' && (
          <div className="px-4 pb-4">
            <NotificationSection />
          </div>
        )}
      </div>
    </div>
  );
}
