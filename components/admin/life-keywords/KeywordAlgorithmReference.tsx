'use client';

import { useState } from 'react';
import Link from 'next/link';

type Section = 'gathering' | 'generation' | null;

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

function GatheringClusteringSection() {
  return (
    <div className="pt-4">
      <p className="text-sm text-teal-800 mb-4">
        <code>KeywordGenerator</code> runs a 5-step pipeline. Steps 1-2 gather vectors from Pinecone and
        cluster them by theme to identify dominant activities in a time period.
      </p>

      {/* Step 1: Pinecone Query */}
      <div className="bg-white rounded-lg p-4 border border-teal-100 mb-4">
        <p className="font-semibold text-teal-900 text-sm mb-2">Step 1: Gather Vectors from Pinecone</p>
        <p className="text-xs text-teal-700 mb-3">
          Query Pinecone with a random vector (<code>topK=1000</code>, filtered by <code>userId</code>),
          then client-side filter by date range using 5 timestamp field names:
        </p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {['timestamp', 'date', 'startDate', 'createdAt', 'recordedAt'].map((field) => (
            <span key={field} className="px-2 py-0.5 bg-teal-50 text-teal-700 rounded text-xs font-mono border border-teal-200">
              {field}
            </span>
          ))}
        </div>
        <p className="text-xs text-teal-600">
          Vectors outside the period&apos;s date range are discarded. The remaining vectors form the input for clustering.
        </p>
      </div>

      {/* Period Config Table */}
      <div className="bg-white rounded-lg p-4 border border-teal-100 mb-4">
        <p className="font-semibold text-teal-900 text-sm mb-2">Period Configuration</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-teal-200">
                <th className="text-left py-1.5 pr-3 text-teal-700 font-semibold">Period</th>
                <th className="text-center py-1.5 px-3 text-teal-700 font-semibold">Max Keywords</th>
                <th className="text-center py-1.5 px-3 text-teal-700 font-semibold">Min Data Points</th>
              </tr>
            </thead>
            <tbody className="text-teal-800">
              {[
                { period: 'Weekly', max: 3, min: 2 },
                { period: 'Monthly', max: 5, min: 5 },
                { period: 'Quarterly', max: 3, min: 10 },
                { period: 'Yearly', max: 10, min: 30 },
              ].map((row) => (
                <tr key={row.period} className="border-b border-teal-50">
                  <td className="py-1.5 pr-3 font-medium">{row.period}</td>
                  <td className="py-1.5 px-3 text-center font-mono">{row.max}</td>
                  <td className="py-1.5 px-3 text-center font-mono">{row.min}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Step 2: Clustering */}
      <div className="bg-white rounded-lg p-4 border border-teal-100 mb-4">
        <p className="font-semibold text-teal-900 text-sm mb-2">Step 2: Cluster by Theme</p>
        <p className="text-xs text-teal-700 mb-3">
          Vectors are grouped by a <code>type:activity</code> composite key (e.g., <code>location:badminton</code>).
          For each cluster:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <div className="bg-teal-50 rounded-lg p-2.5">
            <p className="text-xs font-bold text-teal-700">Centroid</p>
            <p className="text-[11px] text-teal-600 mt-0.5">
              Average of all vectors in the cluster (element-wise mean)
            </p>
          </div>
          <div className="bg-teal-50 rounded-lg p-2.5">
            <p className="text-xs font-bold text-teal-700">Cohesion</p>
            <p className="text-[11px] text-teal-600 mt-0.5">
              Average cosine similarity of each member to the centroid (0-1)
            </p>
          </div>
          <div className="bg-teal-50 rounded-lg p-2.5">
            <p className="text-xs font-bold text-teal-700">Ranking Score</p>
            <p className="text-[11px] text-teal-600 mt-0.5">
              <code className="text-[10px]">cohesion * sqrt(cluster_size)</code>
            </p>
          </div>
        </div>
        <p className="text-xs text-teal-600">
          Clusters are ranked by score (descending). Top clusters get passed to GPT for keyword generation.
        </p>
      </div>

      {/* Category Inference */}
      <div className="bg-white rounded-lg p-4 border border-teal-100">
        <p className="font-semibold text-teal-900 text-sm mb-2">Category Inference (12 categories)</p>
        <p className="text-xs text-teal-700 mb-2">
          Each cluster&apos;s activity string is matched against keyword patterns to infer a category:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 text-xs">
          {[
            { cat: 'health', patterns: 'doctor, hospital, pharmacy...' },
            { cat: 'fitness', patterns: 'gym, run, workout, swim...' },
            { cat: 'nutrition', patterns: 'restaurant, cook, meal...' },
            { cat: 'sleep', patterns: 'sleep, nap, bedtime...' },
            { cat: 'social', patterns: 'friend, party, dinner...' },
            { cat: 'work', patterns: 'office, meeting, work...' },
            { cat: 'hobby', patterns: 'game, music, art, craft...' },
            { cat: 'travel', patterns: 'airport, flight, hotel...' },
            { cat: 'emotion', patterns: 'mood, stress, happy...' },
            { cat: 'productivity', patterns: 'task, plan, organize...' },
            { cat: 'learning', patterns: 'study, class, read...' },
            { cat: 'general', patterns: '(fallback)' },
          ].map((c) => (
            <div key={c.cat} className="bg-teal-50 rounded px-2 py-1 border border-teal-100">
              <span className="font-semibold text-teal-800">{c.cat}</span>
              <span className="block text-[10px] text-teal-500 mt-0.5 truncate">{c.patterns}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GenerationScoringSection() {
  return (
    <div className="pt-4">
      <p className="text-sm text-emerald-800 mb-4">
        Steps 3-5 use GPT to generate a keyword for each top cluster, score the result,
        and save to Firestore. Each GPT call is tracked via <code>PromptExecutionTracker</code>.
      </p>

      {/* Step 3: GPT Generation */}
      <div className="bg-white rounded-lg p-4 border border-emerald-100 mb-4">
        <p className="font-semibold text-emerald-900 text-sm mb-3">Step 3: Per-Cluster GPT Generation</p>
        <div className="flex flex-col sm:flex-row items-stretch gap-2">
          {[
            { label: 'Sample 5 data points', desc: 'Random sample from cluster' },
            { label: 'Load prompt', desc: '{periodType}_keyword' },
            { label: 'Call GPT-4o-mini', desc: 'temp 0.8, JSON mode' },
            { label: 'Parse output', desc: '{ keyword, description, emoji }' },
          ].map((step, i) => (
            <div key={step.label} className="flex-1 flex items-center gap-2">
              <div className="bg-emerald-100 rounded-lg p-2.5 flex-1 text-center">
                <p className="text-xs font-semibold text-emerald-900">{step.label}</p>
                <p className="text-[10px] text-emerald-600 mt-0.5">{step.desc}</p>
              </div>
              {i < 3 && <span className="text-emerald-300 font-bold hidden sm:block">&rarr;</span>}
            </div>
          ))}
        </div>
        <div className="mt-3 bg-emerald-50 rounded-md p-2.5 text-xs text-emerald-700">
          <strong>Prompt ID format:</strong> <code>{'{periodType}'}_keyword</code> (e.g., <code>weekly_keyword</code>, <code>monthly_keyword</code>)
          <br />
          <strong>Execution tracking:</strong> service = <code>KeywordGenerator</code>, metadata includes <code>periodType</code>, <code>periodLabel</code>, <code>clusterSize</code>, <code>category</code>
        </div>
      </div>

      {/* Step 4: Scoring */}
      <div className="bg-white rounded-lg p-4 border border-emerald-100 mb-4">
        <p className="font-semibold text-emerald-900 text-sm mb-2">Step 4: Scoring</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div className="bg-emerald-50 rounded-lg p-3">
            <p className="text-xs font-bold text-emerald-700">confidence</p>
            <p className="text-sm font-mono text-emerald-900 mt-1">= cluster cohesion</p>
            <p className="text-[11px] text-emerald-600 mt-1">
              Average cosine similarity to centroid (0-1). Higher = tighter cluster = more confident keyword.
            </p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-3">
            <p className="text-xs font-bold text-emerald-700">dominance</p>
            <p className="text-sm font-mono text-emerald-900 mt-1">= clusterSize / totalVectors</p>
            <p className="text-[11px] text-emerald-600 mt-1">
              Fraction of all vectors in this cluster. Higher = this activity dominates the period.
            </p>
          </div>
        </div>
        <div className="bg-white rounded-md p-2.5 border border-emerald-200 text-xs text-emerald-700">
          <strong>minConfidence threshold:</strong> <code>0.5</code> &mdash; keywords below this are discarded before saving.
        </div>
      </div>

      {/* Step 5: Save */}
      <div className="bg-white rounded-lg p-4 border border-emerald-100 mb-4">
        <p className="font-semibold text-emerald-900 text-sm mb-2">Step 5: Save to Firestore</p>
        <p className="text-xs text-emerald-700 mb-2">
          Each keyword is saved to the <code>lifeKeywords</code> collection with all metadata:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
          {['keyword', 'description', 'emoji', 'category', 'periodType', 'periodStart', 'periodEnd', 'confidence', 'dominanceScore', 'dataPointCount', 'sampleDataPoints', 'relatedDataTypes'].map((field) => (
            <span key={field} className="bg-emerald-50 text-emerald-700 rounded px-2 py-1 font-mono border border-emerald-100">
              {field}
            </span>
          ))}
        </div>
      </div>

      {/* Note about execution linking */}
      <div className="bg-amber-50 rounded-lg p-3 border border-amber-200 mb-4">
        <p className="text-xs text-amber-800">
          <strong>Note:</strong> Unlike life-feed posts, keyword documents do <strong>not</strong> store a
          direct <code>promptExecutionId</code>. Execution records are matched heuristically by service, userId,
          category, periodType, and timestamp proximity.
        </p>
      </div>

      {/* Link to prompt config */}
      <div className="text-xs text-emerald-600">
        <Link
          href="/admin/prompts/KeywordGenerator"
          className="text-emerald-600 hover:text-emerald-800 hover:underline font-medium"
        >
          View Prompt Config for KeywordGenerator &rarr;
        </Link>
      </div>
    </div>
  );
}

export default function KeywordAlgorithmReference() {
  const [expanded, setExpanded] = useState<Section>(null);

  const toggle = (section: Section) => {
    setExpanded((prev) => (prev === section ? null : section));
  };

  return (
    <div className="space-y-3">
      {/* Data Gathering & Clustering */}
      <div className="bg-teal-50 border border-teal-200 rounded-lg overflow-hidden">
        <button
          onClick={() => toggle('gathering')}
          className="w-full flex items-center gap-3 p-4 text-left hover:bg-teal-100/50 transition-colors cursor-pointer"
        >
          <div className="text-teal-500 text-xl">&#128269;</div>
          <h3 className="flex-1 text-lg font-semibold text-teal-900">Keywords: Data Gathering &amp; Clustering</h3>
          <div className="text-teal-400">
            <ChevronIcon expanded={expanded === 'gathering'} />
          </div>
        </button>
        {expanded === 'gathering' && (
          <div className="px-4 pb-4">
            <GatheringClusteringSection />
          </div>
        )}
      </div>

      {/* GPT Generation & Scoring */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg overflow-hidden">
        <button
          onClick={() => toggle('generation')}
          className="w-full flex items-center gap-3 p-4 text-left hover:bg-emerald-100/50 transition-colors cursor-pointer"
        >
          <div className="text-emerald-500 text-xl">&#129302;</div>
          <h3 className="flex-1 text-lg font-semibold text-emerald-900">Keywords: GPT Generation &amp; Scoring</h3>
          <div className="text-emerald-400">
            <ChevronIcon expanded={expanded === 'generation'} />
          </div>
        </button>
        {expanded === 'generation' && (
          <div className="px-4 pb-4">
            <GenerationScoringSection />
          </div>
        )}
      </div>
    </div>
  );
}
