'use client';

import { useState } from 'react';
import Link from 'next/link';

type Section = 'aggregation' | 'generation' | null;

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

function DataAggregationSection() {
  return (
    <div className="pt-4">
      <p className="text-sm text-teal-800 mb-4">
        <code>LifeConnectionsAnalyzer</code> runs a multi-step pipeline. It fetches raw data from
        Firestore, aggregates into enriched daily buckets, generates a comprehensive pair matrix,
        and performs robust statistical analysis with multiple comparison correction.
      </p>

      {/* Step 1: Data Fetching */}
      <div className="bg-white rounded-lg p-4 border border-teal-100 mb-4">
        <p className="font-semibold text-teal-900 text-sm mb-2">Step 1: Fetch Raw Data (90 days lookback)</p>
        <p className="text-xs text-teal-700 mb-3">
          Query 6 Firestore collections for the target user, filtered to the lookback window:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mb-3">
          {[
            { col: 'healthData', desc: 'Steps, sleep, heart rate, workouts' },
            { col: 'locationData', desc: 'Visits, activities, places' },
            { col: 'voiceNotes', desc: 'Recordings, sentiment, duration' },
            { col: 'moodEntries', desc: 'Mood scores, timestamps' },
            { col: 'textNotes', desc: 'Diary entries, sentiment' },
            { col: 'photoMemories', desc: 'Photos, location, sentiment' },
          ].map((c) => (
            <div key={c.col} className="bg-teal-50 rounded px-2 py-1.5 border border-teal-100">
              <span className="font-mono text-xs font-semibold text-teal-800">{c.col}</span>
              <span className="block text-[10px] text-teal-500 mt-0.5">{c.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Step 2: Enriched Daily Aggregation */}
      <div className="bg-white rounded-lg p-4 border border-teal-100 mb-4">
        <p className="font-semibold text-teal-900 text-sm mb-2">Step 2: Enriched Daily Aggregation</p>
        <p className="text-xs text-teal-700 mb-3">
          Raw data is grouped by date into <code>DailyAggregate</code> objects with 10 metric domains.
          Each day includes temporal context, streak tracking, mood detail, and weather data:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
          {[
            { domain: 'health', metrics: 'sleepHours, steps, activeMinutes, heartRate, HRV, workouts' },
            { domain: 'activities', metrics: 'Record<name, count> (e.g., badminton: 1)' },
            { domain: 'locations', metrics: 'uniquePlaces, parkVisits, gymVisits' },
            { domain: 'voice', metrics: 'notesCount, totalDuration, avgSentiment' },
            { domain: 'mood', metrics: 'Combined from voice sentiment + mood entries' },
            { domain: 'temporal', metrics: 'isWeekend, dayOfWeek, dayName' },
            { domain: 'streaks', metrics: 'exercise, sleep(7h+), journal, per-activity' },
            { domain: 'weather', metrics: 'tempHigh, tempLow, precipMm, sunshineHours' },
          ].map((d) => (
            <div key={d.domain} className="bg-teal-50 rounded px-2 py-1.5 border border-teal-100">
              <span className="font-semibold text-teal-800">{d.domain}</span>
              <span className="block text-[10px] text-teal-500 mt-0.5">{d.metrics}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-teal-600 mt-3">
          Weather data fetched from Open-Meteo Historical API (free, no key) and cached in Firestore.
        </p>
      </div>

      {/* Step 3: Comprehensive Pair Matrix */}
      <div className="bg-white rounded-lg p-4 border border-teal-100 mb-4">
        <p className="font-semibold text-teal-900 text-sm mb-2">Step 3: Comprehensive Pair Matrix</p>
        <p className="text-xs text-teal-700 mb-3">
          Pairs are generated dynamically from all available metrics. The system builds a full cross-domain matrix:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs mb-3">
          {[
            { type: 'Activity x Health', desc: 'Every detected activity vs every health metric' },
            { type: 'Activity x Mood', desc: 'Every activity vs composite mood score' },
            { type: 'Health x Health', desc: 'Cross-domain health pairs (sleep vs HR, HRV vs sleep)' },
            { type: 'Streak x Outcomes', desc: 'Exercise/sleep streaks vs health and mood' },
            { type: 'Weather x Outcomes', desc: 'Temperature, rain vs steps, mood, sleep' },
            { type: 'Weekend x Outcomes', desc: 'Weekend/weekday patterns vs all metrics' },
          ].map((p) => (
            <div key={p.type} className="bg-teal-50 rounded px-2 py-1.5 border border-teal-100">
              <span className="font-semibold text-teal-800">{p.type}</span>
              <span className="block text-[10px] text-teal-500 mt-0.5">{p.desc}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-teal-600">
          Pairs are deduplicated using sorted key Set. Typically 30-50 pairs analyzed per user.
        </p>
      </div>

      {/* Step 4: Statistical Analysis */}
      <div className="bg-white rounded-lg p-4 border border-teal-100 mb-4">
        <p className="font-semibold text-teal-900 text-sm mb-2">Step 4: Robust Statistical Analysis</p>
        <p className="text-xs text-teal-700 mb-3">
          For each pair, values are aligned by date. The pipeline uses three layers of statistical rigor:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <div className="bg-teal-50 rounded-lg p-2.5">
            <p className="text-xs font-bold text-teal-700">Spearman &rho; (primary)</p>
            <p className="text-[11px] text-teal-600 mt-0.5">
              Rank-based correlation. Robust to outliers, captures non-linear monotonic relationships.
              Pearson r computed as secondary metric.
            </p>
          </div>
          <div className="bg-teal-50 rounded-lg p-2.5">
            <p className="text-xs font-bold text-teal-700">BH FDR Correction</p>
            <p className="text-[11px] text-teal-600 mt-0.5">
              Benjamini-Hochberg false discovery rate correction applied across all p-values.
              Controls expected proportion of false positives at 5%.
            </p>
          </div>
          <div className="bg-teal-50 rounded-lg p-2.5">
            <p className="text-xs font-bold text-teal-700">Autocorrelation Adjustment</p>
            <p className="text-[11px] text-teal-600 mt-0.5">
              Effective sample size computed via Bartlett&apos;s formula: n<sub>eff</sub> = n(1-r<sub>1</sub>)/(1+r<sub>1</sub>).
              Prevents inflated significance from correlated time series.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div className="bg-teal-50 rounded-lg p-2.5">
            <p className="text-xs font-bold text-teal-700">Partial Correlation</p>
            <p className="text-[11px] text-teal-600 mt-0.5">
              For significant pairs, partial Spearman correlation computed controlling for day-of-week.
              Determines if the correlation <code>survivesConfounderControl</code>.
            </p>
          </div>
          <div className="bg-teal-50 rounded-lg p-2.5">
            <p className="text-xs font-bold text-teal-700">With vs Without Comparison</p>
            <p className="text-[11px] text-teal-600 mt-0.5">
              For binary activities: days WITH (value &gt; 0) vs WITHOUT (value = 0).
              Reports mean, median, count for each group plus absolute/percent difference.
            </p>
          </div>
        </div>
        <p className="text-xs text-teal-600 mb-3">
          A pair is significant if: <code>adjustedP &lt; 0.05</code> AND <code>|d| &ge; 0.3</code> AND <code>n &ge; 14</code>
        </p>
      </div>

      {/* Default Thresholds */}
      <div className="bg-white rounded-lg p-4 border border-teal-100">
        <p className="font-semibold text-teal-900 text-sm mb-2">Default Thresholds</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-teal-200">
                <th className="text-left py-1.5 pr-3 text-teal-700 font-semibold">Parameter</th>
                <th className="text-center py-1.5 px-3 text-teal-700 font-semibold">Default</th>
                <th className="text-left py-1.5 pl-3 text-teal-700 font-semibold">Description</th>
              </tr>
            </thead>
            <tbody className="text-teal-800">
              {[
                { param: 'lookbackDays', val: '90', desc: 'Days of data to analyze' },
                { param: 'minSampleSize', val: '14', desc: 'Minimum days with data for both metrics' },
                { param: 'minPValue', val: '0.05', desc: 'Maximum BH-adjusted p-value (FDR = 5%)' },
                { param: 'minEffectSize', val: '0.3', desc: 'Minimum |Cohen\'s d| for practical significance' },
                { param: 'maxTimeLagDays', val: '3', desc: 'Max days for time-lagged analysis' },
                { param: 'correlationType', val: 'spearman', desc: 'Rank-based correlation (robust to outliers)' },
              ].map((row) => (
                <tr key={row.param} className="border-b border-teal-50">
                  <td className="py-1.5 pr-3 font-mono font-medium">{row.param}</td>
                  <td className="py-1.5 px-3 text-center font-mono">{row.val}</td>
                  <td className="py-1.5 pl-3">{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AIGenerationSection() {
  return (
    <div className="pt-4">
      <p className="text-sm text-emerald-800 mb-4">
        After statistical analysis, the pipeline checks time-lagged correlations, computes confounder controls,
        uses GPT-4o-mini to generate data-grounded explanations and recommendations, then saves the top connections to Firestore.
      </p>

      {/* Step 5: Time-Lagged Correlations */}
      <div className="bg-white rounded-lg p-4 border border-emerald-100 mb-4">
        <p className="font-semibold text-emerald-900 text-sm mb-2">Step 5: Time-Lagged Correlations</p>
        <p className="text-xs text-emerald-700 mb-3">
          For pairs marked with <code>checkTimeLag: true</code>, the analyzer also tests shifted correlations
          with 1-3 day lags in both directions:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div className="bg-emerald-50 rounded-lg p-2.5">
            <p className="text-xs font-bold text-emerald-700">A_leads_B</p>
            <p className="text-[11px] text-emerald-600 mt-0.5">
              Domain A on day N correlates with Domain B on day N+lag
              <br />
              (e.g., exercise today → better sleep tonight)
            </p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-2.5">
            <p className="text-xs font-bold text-emerald-700">B_leads_A</p>
            <p className="text-[11px] text-emerald-600 mt-0.5">
              Domain B on day N correlates with Domain A on day N+lag
              <br />
              (e.g., poor sleep → skip gym next day)
            </p>
          </div>
        </div>
        <p className="text-xs text-emerald-600">
          If a lagged correlation has a higher effect size than the same-day correlation, it replaces the original.
        </p>
      </div>

      {/* Step 6: Enrichment */}
      <div className="bg-white rounded-lg p-4 border border-emerald-100 mb-4">
        <p className="font-semibold text-emerald-900 text-sm mb-3">Step 6: Enrichment (Confounder Control & Trends)</p>
        <p className="text-xs text-emerald-700 mb-3">
          For each significant pair, additional analyses are computed:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="bg-emerald-50 rounded-lg p-2.5">
            <p className="text-xs font-bold text-emerald-700">Partial Correlation</p>
            <p className="text-[11px] text-emerald-600 mt-0.5">
              Controls for day-of-week using r<sub>xy.z</sub> formula.
              Sets <code>survivesConfounderControl</code> flag.
            </p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-2.5">
            <p className="text-xs font-bold text-emerald-700">Rolling Correlation</p>
            <p className="text-[11px] text-emerald-600 mt-0.5">
              30-day windowed correlations determine if the relationship is
              strengthening, stable, or weakening.
            </p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-2.5">
            <p className="text-xs font-bold text-emerald-700">With vs Without</p>
            <p className="text-[11px] text-emerald-600 mt-0.5">
              For binary activities: mean/median comparison of days
              with vs without the activity.
            </p>
          </div>
        </div>
      </div>

      {/* Step 7: AI Content Generation */}
      <div className="bg-white rounded-lg p-4 border border-emerald-100 mb-4">
        <p className="font-semibold text-emerald-900 text-sm mb-3">Step 7: AI Content Generation (GPT-4o-mini)</p>
        <p className="text-xs text-emerald-700 mb-3">
          GPT receives rich context including with/without data, best/worst day examples,
          confounder control results, and trend direction. Three prompts generate content:
        </p>
        <div className="flex flex-col sm:flex-row items-stretch gap-2">
          {[
            { label: 'generate_title', desc: 'Specific title with numbers (e.g., "Badminton adds 2h to your sleep")' },
            { label: 'explain_correlation', desc: 'Data-grounded explanation with real numbers, confounder status' },
            { label: 'generate_recommendation', desc: 'Specific recommendation based on with/without data' },
          ].map((step, i) => (
            <div key={step.label} className="flex-1 flex items-center gap-2">
              <div className="bg-emerald-100 rounded-lg p-2.5 flex-1 text-center">
                <p className="text-xs font-semibold text-emerald-900 font-mono">{step.label}</p>
                <p className="text-[10px] text-emerald-600 mt-0.5">{step.desc}</p>
              </div>
              {i < 2 && <span className="text-emerald-300 font-bold hidden sm:block">&rarr;</span>}
            </div>
          ))}
        </div>
        <div className="mt-3 bg-emerald-50 rounded-md p-2.5 text-xs text-emerald-700">
          <strong>Template variables:</strong> <code>withWithoutContext</code>, <code>confounderContext</code>,{' '}
          <code>trendContext</code>, <code>bestWorstContext</code>, <code>percentDifference</code>,{' '}
          <code>effectiveSampleSize</code>, <code>correlationType</code>
          <br />
          <strong>Fallback:</strong> If AI generation fails, template-based content is used with <code>aiGenerated: false</code>
        </div>
      </div>

      {/* Step 8: Save */}
      <div className="bg-white rounded-lg p-4 border border-emerald-100 mb-4">
        <p className="font-semibold text-emerald-900 text-sm mb-2">Step 8: Save Top 10 to Firestore</p>
        <p className="text-xs text-emerald-700 mb-2">
          Connections are ranked by <code>|effectSize|</code> (descending). Top 10 are saved to:
        </p>
        <div className="bg-white rounded-md p-2.5 border border-emerald-200 text-center mb-3">
          <code className="text-sm text-emerald-800">users/{'{userId}'}/lifeConnections/{'{connectionId}'}</code>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
          {[
            'category', 'direction', 'strength', 'domainA', 'domainB', 'metrics',
            'title', 'description', 'explanation', 'recommendation', 'timeLag',
            'withWithout', 'survivesConfounderControl', 'confounderPartialR',
            'confounderNote', 'trendDirection', 'dataPoints', 'detectedAt',
            'expiresAt', 'dismissed', 'aiGenerated',
          ].map((field) => (
            <span key={field} className="bg-emerald-50 text-emerald-700 rounded px-2 py-1 font-mono border border-emerald-100">
              {field}
            </span>
          ))}
        </div>
        <p className="text-xs text-emerald-600 mt-3">
          Connections auto-expire after 30 days (<code>expiresAt = detectedAt + 30d</code>).
          The scheduled function runs daily at 4 AM UTC.
        </p>
      </div>

      {/* Note about execution linking */}
      <div className="bg-amber-50 rounded-lg p-3 border border-amber-200 mb-4">
        <p className="text-xs text-amber-800">
          <strong>Note:</strong> Connection documents do <strong>not</strong> store a direct <code>promptExecutionId</code>.
          Execution records are matched heuristically by service (<code>LifeConnectionsService</code>),
          userId, and timestamp proximity (within 120s).
        </p>
      </div>

      {/* Link to prompt config */}
      <div className="text-xs text-emerald-600">
        <Link
          href="/admin/prompts/LifeConnectionsService"
          className="text-emerald-600 hover:text-emerald-800 hover:underline font-medium"
        >
          View Prompt Config for LifeConnectionsService &rarr;
        </Link>
      </div>
    </div>
  );
}

export default function ConnectionAlgorithmReference() {
  const [expanded, setExpanded] = useState<Section>(null);

  const toggle = (section: Section) => {
    setExpanded((prev) => (prev === section ? null : section));
  };

  return (
    <div className="space-y-3">
      {/* Data Aggregation & Statistical Analysis */}
      <div className="bg-teal-50 border border-teal-200 rounded-lg overflow-hidden">
        <button
          onClick={() => toggle('aggregation')}
          className="w-full flex items-center gap-3 p-4 text-left hover:bg-teal-100/50 transition-colors cursor-pointer"
        >
          <div className="text-teal-500 text-xl">&#128200;</div>
          <h3 className="flex-1 text-lg font-semibold text-teal-900">
            Connections: Data Aggregation &amp; Statistical Analysis
          </h3>
          <div className="text-teal-400">
            <ChevronIcon expanded={expanded === 'aggregation'} />
          </div>
        </button>
        {expanded === 'aggregation' && (
          <div className="px-4 pb-4">
            <DataAggregationSection />
          </div>
        )}
      </div>

      {/* AI Content Generation & Storage */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg overflow-hidden">
        <button
          onClick={() => toggle('generation')}
          className="w-full flex items-center gap-3 p-4 text-left hover:bg-emerald-100/50 transition-colors cursor-pointer"
        >
          <div className="text-emerald-500 text-xl">&#129302;</div>
          <h3 className="flex-1 text-lg font-semibold text-emerald-900">
            Connections: AI Content Generation &amp; Storage
          </h3>
          <div className="text-emerald-400">
            <ChevronIcon expanded={expanded === 'generation'} />
          </div>
        </button>
        {expanded === 'generation' && (
          <div className="px-4 pb-4">
            <AIGenerationSection />
          </div>
        )}
      </div>
    </div>
  );
}
