'use client';

import { useState } from 'react';

type Section = 'aggregation' | 'ai-generation' | 'highlights' | 'comparisons' | 'template' | 'notifications' | null;

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

function AggregationSection() {
  return (
    <div className="pt-4">
      <p className="text-sm text-blue-800 mb-4">
        <code>DailySummaryService.aggregateMetrics()</code> processes health, location, and event data into a unified <code>SummaryMetrics</code> object.
        Each data source is queried for the summary&rsquo;s date range.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded-lg p-3 border border-blue-100">
          <p className="font-semibold text-blue-900 text-sm mb-1">Health Data</p>
          <div className="text-xs text-blue-700 space-y-0.5">
            <p><strong>Steps:</strong> Sum of all type=&apos;steps&apos; records</p>
            <p><strong>Sleep:</strong> Sum of durations (min &rarr; hours)</p>
            <p><strong>Heart Rate:</strong> Average of all values (rounded)</p>
            <p><strong>Calories:</strong> Sum from activeEnergyBurned</p>
            <p><strong>Workouts:</strong> Count type=&apos;workout&apos; + unique types + total minutes</p>
          </div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-blue-100">
          <p className="font-semibold text-blue-900 text-sm mb-1">Location Data</p>
          <div className="text-xs text-blue-700 space-y-0.5">
            <p><strong>Places:</strong> Unique coordinates (3 decimal places)</p>
            <p><strong>Activities:</strong> Count records with activity tag</p>
            <p><strong>Top Activities:</strong> Ranked by frequency, top 3</p>
          </div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-blue-100">
          <p className="font-semibold text-blue-900 text-sm mb-1">Event Data</p>
          <div className="text-xs text-blue-700 space-y-0.5">
            <p><strong>Events Total:</strong> Count confirmed (not draft/cancelled)</p>
            <p><strong>Events Completed:</strong> Count status=&apos;completed&apos;</p>
            <p><strong>Event Types:</strong> Grouped by type field</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg p-3 border border-blue-100">
        <p className="font-semibold text-blue-900 text-sm mb-2">Metric Formulas</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
          {[
            { metric: 'steps', formula: 'SUM(values)' },
            { metric: 'sleepHours', formula: 'SUM(min) / 60' },
            { metric: 'heartRate', formula: 'AVG(values)' },
            { metric: 'calories', formula: 'SUM(energy)' },
            { metric: 'places', formula: 'COUNT(UNIQUE coords)' },
            { metric: 'activities', formula: 'COUNT(tagged)' },
            { metric: 'workouts', formula: 'COUNT(type=workout)' },
            { metric: 'events', formula: 'COUNT(confirmed)' },
          ].map((f) => (
            <div key={f.metric} className="flex items-center justify-between bg-blue-50 rounded px-2 py-1">
              <span className="text-blue-800 font-medium">{f.metric}</span>
              <code className="font-mono text-blue-600 text-[10px] ml-1">{f.formula}</code>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AIGenerationSection() {
  return (
    <div className="pt-4">
      <p className="text-sm text-emerald-800 mb-4">
        AI summaries use <code>PromptLoader</code> to fetch prompts from Firestore, then call <code>generateAISummary</code> Cloud Function
        which sends aggregated metrics to <strong>GPT-4o-mini</strong> for natural language summary generation.
      </p>

      <div className="bg-white rounded-lg p-4 border border-emerald-100 mb-4">
        <p className="font-semibold text-emerald-900 text-sm mb-3">Generation Pipeline</p>
        <div className="flex flex-col sm:flex-row items-stretch gap-2">
          {[
            { num: '1', label: 'Aggregate Metrics', desc: 'Health + Location + Events' },
            { num: '2', label: 'Load Prompt', desc: 'PromptLoader from Firestore' },
            { num: '3', label: 'Generate Highlights', desc: 'Threshold-based detection' },
            { num: '4', label: 'Call GPT-4o-mini', desc: 'Metrics + highlights as context' },
          ].map((step) => (
            <div key={step.num} className="flex-1 flex items-center gap-2">
              <div className="bg-emerald-100 rounded-lg p-2.5 flex-1 text-center">
                <p className="text-xs font-bold text-emerald-700">Step {step.num}</p>
                <p className="text-xs font-semibold text-emerald-900 mt-0.5">{step.label}</p>
                <p className="text-[10px] text-emerald-600 mt-0.5">{step.desc}</p>
              </div>
              {step.num !== '4' && <span className="text-emerald-300 font-bold hidden sm:block">&rarr;</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg p-3 border border-emerald-100">
        <p className="font-semibold text-emerald-900 text-sm mb-2">Output Fields</p>
        <div className="grid grid-cols-2 gap-1.5 text-xs">
          <div className="bg-emerald-50 rounded px-2 py-1 text-emerald-800"><strong>textSummary</strong> &mdash; Natural language summary text</div>
          <div className="bg-emerald-50 rounded px-2 py-1 text-emerald-800"><strong>generationMethod</strong> &mdash; &apos;ai&apos; on success</div>
          <div className="bg-emerald-50 rounded px-2 py-1 text-emerald-800"><strong>highlights[]</strong> &mdash; Auto-detected achievements</div>
          <div className="bg-emerald-50 rounded px-2 py-1 text-emerald-800"><strong>comparison</strong> &mdash; Period-over-period changes</div>
        </div>
      </div>
    </div>
  );
}

function HighlightsSection() {
  return (
    <div className="pt-4">
      <p className="text-sm text-amber-800 mb-4">
        <code>generateHighlights()</code> identifies noteworthy data points using threshold-based detection.
        A maximum of <strong>4 highlights</strong> are returned per summary.
      </p>

      <div className="bg-white rounded-lg p-4 border border-amber-100 mb-4">
        <p className="font-semibold text-amber-900 text-sm mb-2">Achievement Thresholds</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-amber-200">
                <th className="text-left py-1.5 pr-3 text-amber-700 font-semibold">Highlight</th>
                <th className="text-left py-1.5 pr-3 text-amber-700 font-semibold">Condition</th>
                <th className="text-left py-1.5 text-amber-700 font-semibold">Icon</th>
              </tr>
            </thead>
            <tbody className="text-amber-800">
              <tr className="border-b border-amber-50">
                <td className="py-1.5 pr-3 font-medium">Step Goal</td>
                <td className="py-1.5 pr-3"><code>steps &ge; 10,000</code></td>
                <td className="py-1.5">🎯</td>
              </tr>
              <tr className="border-b border-amber-50">
                <td className="py-1.5 pr-3 font-medium">Workout</td>
                <td className="py-1.5 pr-3"><code>workoutsCount &gt; 0</code></td>
                <td className="py-1.5">💪</td>
              </tr>
              <tr className="border-b border-amber-50">
                <td className="py-1.5 pr-3 font-medium">Sleep Quality</td>
                <td className="py-1.5 pr-3"><code>sleepHours &ge; 7</code></td>
                <td className="py-1.5">😴</td>
              </tr>
              <tr className="border-b border-amber-50">
                <td className="py-1.5 pr-3 font-medium">Top Activity</td>
                <td className="py-1.5 pr-3"><code>topActivities.length &gt; 0</code></td>
                <td className="py-1.5">🏆</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-lg p-4 border border-amber-100">
        <p className="font-semibold text-amber-900 text-sm mb-2">Comparison Highlights (Weekly/Monthly only)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="bg-green-50 rounded p-2 text-green-800">
            <strong>Steps Increased:</strong> When <code>stepsChange &gt; 10%</code> &rarr; 📈
          </div>
          <div className="bg-red-50 rounded p-2 text-red-800">
            <strong>Steps Decreased:</strong> When <code>stepsChange &lt; -10%</code> &rarr; 📉
          </div>
        </div>
        <p className="text-xs text-amber-600 mt-2">
          Changes between -10% and +10% are ignored (too minor). Maximum 4 highlights total.
        </p>
      </div>
    </div>
  );
}

function ComparisonsSection() {
  return (
    <div className="pt-4">
      <p className="text-sm text-violet-800 mb-4">
        <code>calculateComparison()</code> computes period-over-period changes by comparing the current summary&rsquo;s
        metrics against the previous period&rsquo;s summary.
      </p>

      <div className="bg-white rounded-lg p-4 border border-violet-100 mb-4">
        <p className="font-semibold text-violet-900 text-sm mb-2">Percentage Change Formula</p>
        <div className="bg-violet-50 rounded p-3 text-center">
          <code className="text-sm text-violet-800">
            Change % = ((current - previous) / previous) &times; 100
          </code>
        </div>
        <p className="text-xs text-violet-600 mt-2">
          If <code>previous = 0</code>, change defaults to <strong>0%</strong> (avoids division by zero).
        </p>
      </div>

      <div className="bg-white rounded-lg p-4 border border-violet-100 mb-4">
        <p className="font-semibold text-violet-900 text-sm mb-2">Trend Determination</p>
        <div className="bg-violet-50 rounded p-3 mb-2">
          <code className="text-xs text-violet-800">
            avgChange = (stepsChange + workoutsChange + sleepChange) / 3
          </code>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs text-center">
          <div className="bg-green-100 text-green-800 rounded px-2 py-1.5 font-medium">
            avgChange &gt; 5% &rarr; <strong>improving</strong>
          </div>
          <div className="bg-gray-100 text-gray-800 rounded px-2 py-1.5 font-medium">
            -5% to +5% &rarr; <strong>stable</strong>
          </div>
          <div className="bg-red-100 text-red-800 rounded px-2 py-1.5 font-medium">
            avgChange &lt; -5% &rarr; <strong>declining</strong>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg p-4 border border-violet-100">
        <p className="font-semibold text-violet-900 text-sm mb-2">Monthly Multi-Period Comparisons</p>
        <p className="text-xs text-violet-700 mb-2">
          Monthly summaries calculate up to 4 comparisons against past months:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
          {[
            { period: 'vs 1 month', desc: 'Previous month' },
            { period: 'vs 3 months', desc: 'Quarterly comparison' },
            { period: 'vs 6 months', desc: 'Half-year comparison' },
            { period: 'vs 12 months', desc: 'Year-over-year' },
          ].map((c) => (
            <div key={c.period} className="bg-violet-50 rounded px-2 py-1.5 text-center">
              <p className="font-bold text-violet-800">{c.period}</p>
              <p className="text-violet-600 mt-0.5">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TemplateFallbackSection() {
  return (
    <div className="pt-4">
      <p className="text-sm text-orange-800 mb-4">
        When AI generation fails (API error, timeout, etc.), the system falls back to <strong>template-based</strong> summaries.
        Templates compose parts from <code>SUMMARY_TEMPLATES</code> model data.
      </p>

      <div className="bg-white rounded-lg p-4 border border-orange-100 mb-4">
        <p className="font-semibold text-orange-900 text-sm mb-3">Template Patterns by Period</p>
        <div className="space-y-3">
          <div className="bg-orange-50 rounded p-3">
            <p className="font-semibold text-orange-800 text-xs mb-1">Daily Template</p>
            <div className="text-[11px] text-orange-700 space-y-0.5">
              <p>intro(date) + steps(count, goal) + workouts(...) + sleep(...) + activities(...) + places(count)</p>
              <p className="text-orange-600 mt-1">Parts are space-joined. Workouts/sleep/activities only included if data exists.</p>
            </div>
          </div>
          <div className="bg-orange-50 rounded p-3">
            <p className="font-semibold text-orange-800 text-xs mb-1">Weekly Template</p>
            <div className="text-[11px] text-orange-700 space-y-0.5">
              <p>intro(weekNum) + total(&apos;steps&apos;) + average(&apos;steps&apos;, steps/7) + total(&apos;workouts&apos;) + average(&apos;sleep&apos;) + comparison(stepsChange)</p>
              <p className="text-orange-600 mt-1">Includes comparison to previous week if available.</p>
            </div>
          </div>
          <div className="bg-orange-50 rounded p-3">
            <p className="font-semibold text-orange-800 text-xs mb-1">Monthly Template</p>
            <div className="text-[11px] text-orange-700 space-y-0.5">
              <p>intro(monthName, year) + total(&apos;steps&apos;) + average(&apos;steps&apos;, steps/daysInMonth) + workouts + sleep + comparison + yearOverYear</p>
              <p className="text-orange-600 mt-1">Calculates days in month for accurate daily averages. Includes YoY comparison.</p>
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-orange-600">
        <strong>Fallback trigger:</strong> The system logs a warning and sets <code>generationMethod = &apos;template&apos;</code>.
        Template summaries are functional but less personalized than AI-generated ones.
      </p>
    </div>
  );
}

function NotificationSection() {
  return (
    <div className="pt-4">
      <p className="text-sm text-cyan-800 mb-4">
        Summaries trigger notifications via <code>NotificationService</code> based on user preferences.
        Each period type has its own scheduling logic.
      </p>

      <div className="bg-white rounded-lg p-4 border border-cyan-100 mb-4">
        <p className="font-semibold text-cyan-900 text-sm mb-3">Notification Timing</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-cyan-50 rounded-lg p-3">
            <p className="font-bold text-cyan-800 text-sm mb-1">Daily</p>
            <div className="text-xs text-cyan-700 space-y-0.5">
              <p><strong>Default:</strong> 08:00 AM</p>
              <p><strong>Content:</strong> Yesterday&rsquo;s summary</p>
              <p><strong>Logic:</strong> Schedule at <code>preferredTime</code>; if past, push to tomorrow</p>
            </div>
          </div>
          <div className="bg-cyan-50 rounded-lg p-3">
            <p className="font-bold text-cyan-800 text-sm mb-1">Weekly</p>
            <div className="text-xs text-cyan-700 space-y-0.5">
              <p><strong>Default:</strong> Monday at 08:00</p>
              <p><strong>Content:</strong> Last week&rsquo;s summary</p>
              <p><strong>Logic:</strong> Schedule on <code>preferredDay</code> (0=Sun..6=Sat); if past, next week</p>
            </div>
          </div>
          <div className="bg-cyan-50 rounded-lg p-3">
            <p className="font-bold text-cyan-800 text-sm mb-1">Monthly</p>
            <div className="text-xs text-cyan-700 space-y-0.5">
              <p><strong>Default:</strong> 1st of month at 08:00</p>
              <p><strong>Content:</strong> Last month&rsquo;s summary</p>
              <p><strong>Logic:</strong> Schedule on <code>monthlyDay</code> (1-28); handles short months</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg p-4 border border-cyan-100 mb-4">
        <p className="font-semibold text-cyan-900 text-sm mb-2">Notification Body Format</p>
        <div className="space-y-2 text-xs">
          <div className="bg-cyan-50 rounded p-2 text-cyan-800">
            <strong>Daily:</strong> <code>&quot;12,500 steps &bull; 2 workouts &bull; 5 places visited&quot;</code>
          </div>
          <div className="bg-cyan-50 rounded p-2 text-cyan-800">
            <strong>Weekly:</strong> <code>&quot;Total: 87,500 steps, 5 workouts📈 Improving from last week!&quot;</code>
          </div>
          <div className="bg-cyan-50 rounded p-2 text-cyan-800">
            <strong>Monthly:</strong> <code>&quot;January: 380,000 steps, 12 workouts 📈 Better than last month! (+15% vs last year!)&quot;</code>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg p-3 border border-cyan-100">
        <p className="font-semibold text-cyan-900 text-sm mb-2">User Preferences</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
          <div className="bg-cyan-50 rounded px-2 py-1 text-cyan-800"><strong>enabled</strong> &mdash; Master toggle</div>
          <div className="bg-cyan-50 rounded px-2 py-1 text-cyan-800"><strong>dailyEnabled</strong> &mdash; Daily toggle</div>
          <div className="bg-cyan-50 rounded px-2 py-1 text-cyan-800"><strong>preferredTime</strong> &mdash; HH:mm format</div>
          <div className="bg-cyan-50 rounded px-2 py-1 text-cyan-800"><strong>preferredDay</strong> &mdash; 0-6 (weekly)</div>
        </div>
      </div>
    </div>
  );
}

const SECTIONS: Array<{
  id: Section;
  title: string;
  icon: string;
  bg: string;
  border: string;
  hover: string;
  text: string;
  iconColor: string;
  Content: () => React.JSX.Element;
}> = [
  {
    id: 'aggregation',
    title: 'Data Aggregation Pipeline',
    icon: '\u{1F4CA}',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    hover: 'hover:bg-blue-100/50',
    text: 'text-blue-900',
    iconColor: 'text-blue-500',
    Content: AggregationSection,
  },
  {
    id: 'ai-generation',
    title: 'AI Summary Generation',
    icon: '\u{1F916}',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    hover: 'hover:bg-emerald-100/50',
    text: 'text-emerald-900',
    iconColor: 'text-emerald-500',
    Content: AIGenerationSection,
  },
  {
    id: 'highlights',
    title: 'Highlight Detection',
    icon: '\u{2B50}',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    hover: 'hover:bg-amber-100/50',
    text: 'text-amber-900',
    iconColor: 'text-amber-500',
    Content: HighlightsSection,
  },
  {
    id: 'comparisons',
    title: 'Period Comparisons',
    icon: '\u{1F4C8}',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    hover: 'hover:bg-violet-100/50',
    text: 'text-violet-900',
    iconColor: 'text-violet-500',
    Content: ComparisonsSection,
  },
  {
    id: 'template',
    title: 'Template Fallback',
    icon: '\u{1F4DD}',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    hover: 'hover:bg-orange-100/50',
    text: 'text-orange-900',
    iconColor: 'text-orange-500',
    Content: TemplateFallbackSection,
  },
  {
    id: 'notifications',
    title: 'Notification Scheduling',
    icon: '\u{1F514}',
    bg: 'bg-cyan-50',
    border: 'border-cyan-200',
    hover: 'hover:bg-cyan-100/50',
    text: 'text-cyan-900',
    iconColor: 'text-cyan-500',
    Content: NotificationSection,
  },
];

export default function SummaryAlgorithmReference() {
  const [expanded, setExpanded] = useState<Section>(null);

  const toggle = (section: Section) => {
    setExpanded((prev) => (prev === section ? null : section));
  };

  return (
    <div className="space-y-3">
      {SECTIONS.map((section) => (
        <div key={section.id} className={`${section.bg} border ${section.border} rounded-lg overflow-hidden`}>
          <button
            onClick={() => toggle(section.id)}
            className={`w-full flex items-center gap-3 p-4 text-left ${section.hover} transition-colors cursor-pointer`}
          >
            <div className={`${section.iconColor} text-xl`}>{section.icon}</div>
            <h3 className={`flex-1 text-lg font-semibold ${section.text}`}>{section.title}</h3>
            <div className={section.iconColor}>
              <ChevronIcon expanded={expanded === section.id} />
            </div>
          </button>
          {expanded === section.id && (
            <div className="px-4 pb-4">
              <section.Content />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
