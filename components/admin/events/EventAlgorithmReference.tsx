'use client';

import { useState } from 'react';
import Link from 'next/link';

type Section = 'extraction' | 'lifecycle' | null;

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

function ExtractionPipelineSection() {
  return (
    <div className="pt-4">
      <p className="text-sm text-rose-800 mb-4">
        <code>EventExtractionService</code> automatically extracts structured calendar events from
        voice notes, text notes, photos, health data, and location data using GPT-4o-mini.
        Each Cloud Function trigger converts source data to natural language text, then passes
        it through AI extraction.
      </p>

      {/* Step 1: Triggers */}
      <div className="bg-white rounded-lg p-4 border border-rose-100 mb-4">
        <p className="font-semibold text-rose-900 text-sm mb-2">Step 1: Cloud Function Triggers</p>
        <p className="text-xs text-rose-700 mb-3">
          Five Firestore <code>onDocumentCreated</code> triggers feed into the extraction pipeline.
          Each converts its source data to natural language text before calling the extraction service.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-rose-200">
                <th className="text-left py-1.5 pr-3 text-rose-700 font-semibold">Trigger</th>
                <th className="text-left py-1.5 px-3 text-rose-700 font-semibold">Source</th>
                <th className="text-left py-1.5 px-3 text-rose-700 font-semibold">Text Conversion</th>
              </tr>
            </thead>
            <tbody className="text-rose-800">
              {[
                { trigger: 'onVoiceNoteCreated', source: 'Voice Notes', text: 'Whisper transcription + temporal normalization' },
                { trigger: 'onTextNoteCreated', source: 'Text Notes', text: 'User-entered text directly' },
                { trigger: 'onPhotoMemoryCreated', source: 'Photos', text: 'Photo description/caption' },
                { trigger: 'onHealthDataCreated', source: 'Health Data', text: 'healthDataToText() (workout, HR, steps)' },
                { trigger: 'onLocationDataCreated', source: 'Location Data', text: 'locationDataToText() (place, activity)' },
              ].map((row) => (
                <tr key={row.trigger} className="border-b border-rose-50">
                  <td className="py-1.5 pr-3 font-mono text-[11px]">{row.trigger}</td>
                  <td className="py-1.5 px-3 font-medium">{row.source}</td>
                  <td className="py-1.5 px-3 text-[11px]">{row.text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-rose-600 mt-3">
          <strong>Temporal normalization:</strong> Voice notes are preprocessed by <code>TemporalParserService.normalizeText()</code> which
          replaces relative dates (&quot;yesterday&quot;, &quot;next Tuesday&quot;) with absolute dates before AI extraction.
        </p>
      </div>

      {/* Step 2: AI Extraction */}
      <div className="bg-white rounded-lg p-4 border border-rose-100 mb-4">
        <p className="font-semibold text-rose-900 text-sm mb-3">Step 2: AI Extraction (GPT-4o-mini)</p>
        <p className="text-xs text-rose-700 mb-3">
          The extraction service sends the text along with a reference timestamp to GPT-4o-mini,
          which returns structured JSON with one or more events extracted from the input.
        </p>
        <div className="flex flex-col sm:flex-row items-stretch gap-2 mb-4">
          {[
            { label: 'System prompt', desc: 'EventExtraction system' },
            { label: 'Source text', desc: 'Natural language input' },
            { label: 'Reference time', desc: 'Source creation timestamp' },
            { label: 'GPT-4o-mini', desc: 'temp 0.3, max 800 tokens' },
          ].map((step, i) => (
            <div key={step.label} className="flex-1 flex items-center gap-2">
              <div className="bg-rose-100 rounded-lg p-2.5 flex-1 text-center">
                <p className="text-xs font-semibold text-rose-900">{step.label}</p>
                <p className="text-[10px] text-rose-600 mt-0.5">{step.desc}</p>
              </div>
              {i < 3 && <span className="text-rose-300 font-bold hidden sm:block">&rarr;</span>}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
          <div>
            <span className="text-rose-600">Model:</span>
            <span className="ml-1 font-mono text-rose-900">gpt-4o-mini</span>
          </div>
          <div>
            <span className="text-rose-600">Temperature:</span>
            <span className="ml-1 text-rose-900">0.3 (deterministic)</span>
          </div>
          <div>
            <span className="text-rose-600">Max tokens:</span>
            <span className="ml-1 text-rose-900">800</span>
          </div>
          <div>
            <span className="text-rose-600">Response:</span>
            <span className="ml-1 text-rose-900">JSON</span>
          </div>
        </div>
      </div>

      {/* Step 3: Event Types */}
      <div className="bg-white rounded-lg p-4 border border-rose-100 mb-4">
        <p className="font-semibold text-rose-900 text-sm mb-3">Step 3: Event Type Classification</p>
        <p className="text-xs text-rose-700 mb-3">
          The AI classifies each extracted event into one of 6 types based on content patterns:
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {[
            { type: 'appointment', emoji: '📅', desc: 'Medical, services (dentist, haircut)', example: '"Doctor at 3 PM"' },
            { type: 'meeting', emoji: '👥', desc: 'Business meetings, video calls', example: '"Team sync at 10"' },
            { type: 'intention', emoji: '💡', desc: 'Personal goals ("I want to...")', example: '"I plan to exercise more"' },
            { type: 'plan', emoji: '🗺️', desc: 'Planned activities ("Going to...")', example: '"Trip to LA this weekend"' },
            { type: 'reminder', emoji: '⏰', desc: 'Things to remember', example: '"Don\'t forget to call mom"' },
            { type: 'todo', emoji: '✅', desc: 'Tasks and errands', example: '"Need to buy groceries"' },
          ].map((item) => (
            <div key={item.type} className="bg-rose-50 rounded-lg p-2.5 border border-rose-100">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-base">{item.emoji}</span>
                <span className="text-xs font-bold text-rose-800">{item.type}</span>
              </div>
              <p className="text-[11px] text-rose-600">{item.desc}</p>
              <p className="text-[10px] text-rose-400 mt-0.5 italic">{item.example}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Step 4: Confidence Scoring */}
      <div className="bg-white rounded-lg p-4 border border-rose-100 mb-4">
        <p className="font-semibold text-rose-900 text-sm mb-2">Step 4: Confidence Scoring</p>
        <p className="text-xs text-rose-700 mb-3">
          The AI assigns a confidence score (0.0&ndash;1.0) based on how specific the temporal
          information is in the source text. This score determines the event&apos;s initial status.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-rose-200">
                <th className="text-left py-1.5 pr-3 text-rose-700 font-semibold">Score</th>
                <th className="text-left py-1.5 px-3 text-rose-700 font-semibold">Temporal Specificity</th>
                <th className="text-left py-1.5 px-3 text-rose-700 font-semibold">Example</th>
                <th className="text-left py-1.5 px-3 text-rose-700 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="text-rose-800">
              {[
                { score: '0.9 – 1.0', specificity: 'Explicit date & time', example: '"Dec 26, 2025 at 3:00 PM"', status: 'pending' },
                { score: '0.7 – 0.9', specificity: 'Relative date with time', example: '"tomorrow at 3 PM"', status: 'pending' },
                { score: '0.5 – 0.7', specificity: 'Vague time reference', example: '"sometime next week"', status: 'draft' },
                { score: '0.3 – 0.5', specificity: 'Very vague reference', example: '"soon", "later"', status: 'draft' },
                { score: '0.0 – 0.3', specificity: 'No temporal info', example: '"I should call mom"', status: 'draft' },
              ].map((row) => (
                <tr key={row.score} className="border-b border-rose-50">
                  <td className="py-1.5 pr-3 font-mono">{row.score}</td>
                  <td className="py-1.5 px-3">{row.specificity}</td>
                  <td className="py-1.5 px-3 text-[11px] italic">{row.example}</td>
                  <td className="py-1.5 px-3">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      row.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-rose-600 mt-3">
          <strong>Threshold:</strong> confidence &ge; 0.7 &rarr; <code>pending</code> (shown in calendar),
          confidence &lt; 0.7 &rarr; <code>draft</code> (shown for user review).
        </p>
      </div>

      {/* Extracted fields */}
      <div className="bg-rose-50 rounded-lg p-3 border border-rose-200 mb-4">
        <p className="text-xs text-rose-800 mb-2">
          <strong>Extracted Fields:</strong> The AI returns a structured JSON for each event:
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 text-xs">
          {['title', 'description', 'datetime', 'endDatetime', 'type', 'confidence', 'location', 'participants', 'isAllDay', 'recurrence'].map((field) => (
            <span key={field} className="bg-white text-rose-700 rounded px-2 py-1 font-mono border border-rose-100">
              {field}
            </span>
          ))}
        </div>
      </div>

      {/* Execution tracking */}
      <div className="bg-rose-50 rounded-lg p-3 border border-rose-200 mb-4">
        <p className="text-xs text-rose-800">
          <strong>Execution Tracking:</strong> Each GPT call is tracked via <code>PromptExecutionTracker</code> with
          service = <code>EventExtractionService</code>. Execution records are matched heuristically by service, userId,
          and timestamp proximity (within 60s of event creation).
        </p>
      </div>

      {/* Link to prompt config */}
      <div className="text-xs text-rose-600">
        <Link
          href="/admin/prompts/EventExtractionService"
          className="text-rose-600 hover:text-rose-800 hover:underline font-medium"
        >
          View Prompt Config for EventExtractionService &rarr;
        </Link>
      </div>
    </div>
  );
}

function LifecycleSection() {
  return (
    <div className="pt-4">
      <p className="text-sm text-slate-800 mb-4">
        Events follow a multi-stage lifecycle from automatic extraction through user confirmation
        to completion, with smart reminders scheduled based on event type.
      </p>

      {/* Lifecycle Flow */}
      <div className="bg-white rounded-lg p-4 border border-slate-100 mb-4">
        <p className="font-semibold text-slate-900 text-sm mb-3">Event Lifecycle Flow</p>
        <div className="flex flex-col sm:flex-row items-stretch gap-2 mb-4">
          {[
            { label: 'Extracted', desc: 'AI creates event from source', color: 'bg-blue-100 text-blue-900' },
            { label: 'Pending / Draft', desc: 'Based on confidence score', color: 'bg-yellow-100 text-yellow-900' },
            { label: 'Confirmed', desc: 'User reviews & confirms', color: 'bg-green-100 text-green-900' },
            { label: 'Completed', desc: 'User marks as done', color: 'bg-gray-100 text-gray-700' },
          ].map((step, i) => (
            <div key={step.label} className="flex-1 flex items-center gap-2">
              <div className={`${step.color} rounded-lg p-2.5 flex-1 text-center`}>
                <p className="text-xs font-semibold">{step.label}</p>
                <p className="text-[10px] mt-0.5 opacity-75">{step.desc}</p>
              </div>
              {i < 3 && <span className="text-slate-300 font-bold hidden sm:block">&rarr;</span>}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="font-semibold text-slate-800 mb-1">Status Transitions</p>
            <ul className="text-slate-700 space-y-1 ml-3 list-disc">
              <li><code>draft</code> &rarr; <code>confirmed</code> (user confirms low-confidence event)</li>
              <li><code>pending</code> &rarr; <code>confirmed</code> (user confirms high-confidence event)</li>
              <li><code>confirmed</code> &rarr; <code>completed</code> (user marks done)</li>
              <li>Any status &rarr; <code>cancelled</code> (user cancels)</li>
            </ul>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="font-semibold text-slate-800 mb-1">User Modification Flags</p>
            <ul className="text-slate-700 space-y-1 ml-3 list-disc">
              <li><code>userConfirmed</code> &mdash; Set to <code>true</code> when user explicitly confirms</li>
              <li><code>userModified</code> &mdash; Set to <code>true</code> when user edits any field</li>
              <li><code>completedAt</code> &mdash; Timestamp when marked complete</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Smart Reminders */}
      <div className="bg-white rounded-lg p-4 border border-slate-100 mb-4">
        <p className="font-semibold text-slate-900 text-sm mb-2">Smart Reminder Defaults</p>
        <p className="text-xs text-slate-700 mb-3">
          Each event type has default reminder timings. Reminders are scheduled as push notifications
          via Expo Notifications when an event is created or confirmed.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-1.5 pr-3 text-slate-700 font-semibold">Event Type</th>
                <th className="text-left py-1.5 px-3 text-slate-700 font-semibold">Default Reminders</th>
              </tr>
            </thead>
            <tbody className="text-slate-800">
              {[
                { type: '📅 Appointment', reminders: '1 week, 1 day, 1 hour before' },
                { type: '👥 Meeting', reminders: '1 day, 1 hour, 15 min before' },
                { type: '💡 Intention', reminders: '1 day before' },
                { type: '🗺️ Plan', reminders: '1 week, 1 day before' },
                { type: '⏰ Reminder', reminders: '1 hour before' },
                { type: '✅ To-Do', reminders: '1 day, 1 hour before' },
              ].map((row) => (
                <tr key={row.type} className="border-b border-slate-50">
                  <td className="py-1.5 pr-3 font-medium">{row.type}</td>
                  <td className="py-1.5 px-3">{row.reminders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Firestore Schema */}
      <div className="bg-white rounded-lg p-4 border border-slate-100 mb-4">
        <p className="font-semibold text-slate-900 text-sm mb-2">Firestore Document Schema</p>
        <p className="text-xs text-slate-700 mb-3">
          Events are stored in the <code>events</code> collection. Each document contains the
          extracted data, source tracking, user modification flags, and embedding status.
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 text-xs">
          {[
            'userId', 'title', 'description', 'datetime', 'endDatetime', 'isAllDay',
            'type', 'status', 'confidence', 'sourceType', 'sourceId', 'sourceText',
            'location', 'participants', 'recurrence', 'recurrenceEndDate',
            'userConfirmed', 'userModified', 'completedAt',
            'embeddingId', 'embeddingCreatedAt', 'createdAt', 'updatedAt',
          ].map((field) => (
            <span key={field} className="bg-slate-50 text-slate-700 rounded px-2 py-1 font-mono border border-slate-100">
              {field}
            </span>
          ))}
        </div>
      </div>

      {/* Mobile Integration */}
      <div className="bg-white rounded-lg p-4 border border-slate-100 mb-4">
        <p className="font-semibold text-slate-900 text-sm mb-3">Mobile App Integration</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-slate-50 rounded-lg p-2.5">
            <p className="text-xs font-bold text-slate-700">Home Feed</p>
            <p className="text-[11px] text-slate-600 mt-0.5">
              <code>UpcomingEventsCard</code> shows next 5 upcoming events (pending/confirmed, future datetime)
            </p>
          </div>
          <div className="bg-slate-50 rounded-lg p-2.5">
            <p className="text-xs font-bold text-slate-700">Events List</p>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Calendar + list view with type filters. Draft events shown in &quot;Pending Review&quot; section
            </p>
          </div>
          <div className="bg-slate-50 rounded-lg p-2.5">
            <p className="text-xs font-bold text-slate-700">Event Detail</p>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Full details with confirm/edit/complete/cancel actions. Shows source text origin
            </p>
          </div>
        </div>
      </div>

      {/* Key files */}
      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
        <p className="text-xs text-slate-800 mb-2"><strong>Key Files:</strong></p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-[11px] text-slate-700 font-mono">
          <div>EventExtractionService.ts &mdash; AI extraction</div>
          <div>events.yaml &mdash; Prompt configuration</div>
          <div>index.ts &mdash; Cloud Function triggers</div>
          <div>TemporalParserService.ts &mdash; Date normalization</div>
          <div>EventService.ts &mdash; Mobile CRUD + sync</div>
          <div>UpcomingEventsCard.tsx &mdash; Home feed card</div>
        </div>
      </div>
    </div>
  );
}

export default function EventAlgorithmReference() {
  const [expanded, setExpanded] = useState<Section>(null);

  const toggle = (section: Section) => {
    setExpanded((prev) => (prev === section ? null : section));
  };

  return (
    <div className="space-y-3">
      {/* Extraction Pipeline */}
      <div className="bg-rose-50 border border-rose-200 rounded-lg overflow-hidden">
        <button
          onClick={() => toggle('extraction')}
          className="w-full flex items-center gap-3 p-4 text-left hover:bg-rose-100/50 transition-colors cursor-pointer"
        >
          <div className="text-rose-500 text-xl">&#9881;</div>
          <h3 className="flex-1 text-lg font-semibold text-rose-900">Events: Extraction Pipeline</h3>
          <div className="text-rose-400">
            <ChevronIcon expanded={expanded === 'extraction'} />
          </div>
        </button>
        {expanded === 'extraction' && (
          <div className="px-4 pb-4">
            <ExtractionPipelineSection />
          </div>
        )}
      </div>

      {/* Lifecycle & Mobile Integration */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
        <button
          onClick={() => toggle('lifecycle')}
          className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-100/50 transition-colors cursor-pointer"
        >
          <div className="text-slate-500 text-xl">&#128260;</div>
          <h3 className="flex-1 text-lg font-semibold text-slate-900">Events: Lifecycle &amp; Mobile Integration</h3>
          <div className="text-slate-400">
            <ChevronIcon expanded={expanded === 'lifecycle'} />
          </div>
        </button>
        {expanded === 'lifecycle' && (
          <div className="px-4 pb-4">
            <LifecycleSection />
          </div>
        )}
      </div>
    </div>
  );
}
