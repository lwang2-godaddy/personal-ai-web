'use client';

import { useState } from 'react';

type Section = 'frequency' | 'selection' | null;

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

function FrequencySection() {
  return (
    <div className="pt-4">
      <p className="text-sm text-purple-800 mb-4">
        <code>generateLifeFeedNow</code> uses <code>SmartFrequencyCalculator</code> to decide <strong>how many</strong> posts
        to generate. It scores three dimensions (each 0-1), combines them with configurable weights, and maps the total to a post count.
      </p>

      {/* Scoring Components */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded-lg p-3 border border-purple-100">
          <p className="font-semibold text-purple-900 text-sm mb-1">Data Volume <span className="text-purple-500 font-normal">(40%)</span></p>
          <p className="text-xs text-purple-700">
            Counts data points in last <strong>7 days</strong> (steps, workouts, locations, notes, photos).
            Logarithmic scaling: <code>log(pts+1)/log(51)</code>. Diminishing returns after ~20 points.
          </p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-purple-100">
          <p className="font-semibold text-purple-900 text-sm mb-1">Data Freshness <span className="text-purple-500 font-normal">(30%)</span></p>
          <p className="text-xs text-purple-700">
            Checks for data within last <strong>24 hours</strong> across 3 collections: health, location, voice.
            Score = freshCollections / 3. Values: <strong>0, 0.33, 0.67, or 1.0</strong>.
          </p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-purple-100">
          <p className="font-semibold text-purple-900 text-sm mb-1">Activity Diversity <span className="text-purple-500 font-normal">(30%)</span></p>
          <p className="text-xs text-purple-700">
            Unique activities (60% weight, capped at 10) + data types present (40% weight, out of 7 types).
            More varied data = higher score.
          </p>
        </div>
      </div>

      {/* Score -> Posts table */}
      <div className="bg-white rounded-lg p-3 border border-purple-100 mb-4">
        <p className="font-semibold text-purple-900 text-sm mb-2">Total Score &rarr; Recommended Posts</p>
        <div className="grid grid-cols-5 gap-1 text-xs text-center">
          <div className="bg-green-100 text-green-800 rounded px-2 py-1 font-medium">&ge; 0.8 &rarr; 3 posts</div>
          <div className="bg-blue-100 text-blue-800 rounded px-2 py-1 font-medium">&ge; 0.6 &rarr; 2 posts</div>
          <div className="bg-yellow-100 text-yellow-800 rounded px-2 py-1 font-medium">&ge; 0.4 &rarr; 1 post</div>
          <div className="bg-orange-100 text-orange-800 rounded px-2 py-1 font-medium">&ge; 0.2 &rarr; 1 post</div>
          <div className="bg-red-100 text-red-800 rounded px-2 py-1 font-medium">&lt; 0.2 &rarr; 0 posts</div>
        </div>
      </div>

      {/* Worked Example */}
      <div className="bg-white rounded-lg p-4 border border-purple-100 mb-4">
        <p className="font-semibold text-purple-900 text-sm mb-3">Worked Example</p>

        {/* Scenario comparison table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-purple-200">
                <th className="text-left py-1.5 pr-3 text-purple-700 font-semibold">Component</th>
                <th className="text-left py-1.5 pr-3 text-purple-700 font-semibold">Formula</th>
                <th className="text-center py-1.5 px-2 text-red-700 font-semibold">Without day-0 data</th>
                <th className="text-center py-1.5 px-2 text-green-700 font-semibold">With day-0 data</th>
              </tr>
            </thead>
            <tbody className="text-purple-800">
              <tr className="border-b border-purple-100">
                <td className="py-1.5 pr-3 font-medium">Volume (40%)</td>
                <td className="py-1.5 pr-3"><code className="text-[10px]">log(~13+1)/log(51)</code></td>
                <td className="py-1.5 px-2 text-center font-mono">0.67</td>
                <td className="py-1.5 px-2 text-center font-mono">0.67</td>
              </tr>
              <tr className="border-b border-purple-100">
                <td className="py-1.5 pr-3 font-medium">Freshness (30%)</td>
                <td className="py-1.5 pr-3"><code className="text-[10px]">freshCollections / 3</code></td>
                <td className="py-1.5 px-2 text-center font-mono text-red-600 font-bold">0.0</td>
                <td className="py-1.5 px-2 text-center font-mono text-green-600 font-bold">1.0</td>
              </tr>
              <tr className="border-b border-purple-100">
                <td className="py-1.5 pr-3 font-medium">Diversity (30%)</td>
                <td className="py-1.5 pr-3"><code className="text-[10px]">(acts/10)*.6 + (types/7)*.4</code></td>
                <td className="py-1.5 px-2 text-center font-mono">0.70</td>
                <td className="py-1.5 px-2 text-center font-mono">0.70</td>
              </tr>
              <tr className="border-t-2 border-purple-300">
                <td className="py-2 pr-3 font-bold">Total</td>
                <td className="py-2 pr-3"><code className="text-[10px]">V*.4 + F*.3 + D*.3</code></td>
                <td className="py-2 px-2 text-center">
                  <span className="font-mono font-bold text-red-600">0.478</span>
                  <span className="block text-[10px] text-red-500 mt-0.5">1 post/round</span>
                </td>
                <td className="py-2 px-2 text-center">
                  <span className="font-mono font-bold text-green-600">0.778</span>
                  <span className="block text-[10px] text-green-500 mt-0.5">2-3 posts/round</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Freshness detail */}
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-red-50 rounded p-2.5 border border-red-100">
            <p className="font-semibold text-red-800 text-xs mb-1">Without day-0: Freshness = 0.0</p>
            <div className="space-y-0.5 text-[11px] text-red-700">
              <p>healthData in last 24h? <strong>No</strong> (earliest = day 1 = 24h+ ago)</p>
              <p>locationData in last 24h? <strong>No</strong></p>
              <p>voiceNotes in last 24h? <strong>No</strong></p>
              <p className="mt-1 font-medium">0/3 fresh &rarr; score <strong>0.0</strong> &rarr; total drops to 0.478 &rarr; <strong>1 post</strong></p>
            </div>
          </div>
          <div className="bg-green-50 rounded p-2.5 border border-green-100">
            <p className="font-semibold text-green-800 text-xs mb-1">With day-0: Freshness = 1.0</p>
            <div className="space-y-0.5 text-[11px] text-green-700">
              <p>healthData in last 24h? <strong>Yes</strong> (day-0 steps)</p>
              <p>locationData in last 24h? <strong>Yes</strong> (day-0 office visit)</p>
              <p>voiceNotes in last 24h? <strong>Yes</strong> (day-0 morning note)</p>
              <p className="mt-1 font-medium">3/3 fresh &rarr; score <strong>1.0</strong> &rarr; total rises to 0.778 &rarr; <strong>2-3 posts</strong></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SelectionSection() {
  return (
    <div className="pt-4">
      <p className="text-sm text-indigo-800 mb-4">
        Once <code>SmartFrequencyCalculator</code> decides <strong>how many</strong> posts (N), the generator iterates through
        all post types from <code>config/insightsPostTypes</code> and passes each through <strong>4 filters</strong>.
        Candidates are then ranked by AI confidence and the top N are returned.
      </p>

      {/* 4-Filter Pipeline */}
      <div className="bg-white rounded-lg p-4 border border-indigo-100 mb-4">
        <p className="font-semibold text-indigo-900 text-sm mb-3">Filter Pipeline (per type)</p>
        <div className="flex flex-col sm:flex-row items-stretch gap-2">
          {[
            { num: '1', label: 'Admin Enabled?', desc: 'config/insightsPostTypes' },
            { num: '2', label: 'User Enabled?', desc: 'User preferences' },
            { num: '3', label: 'Not in Cooldown?', desc: 'Per-type cooldown period' },
            { num: '4', label: 'Data Eligible?', desc: 'isPostTypeEligible()' },
          ].map((f) => (
            <div key={f.num} className="flex-1 flex items-center gap-2">
              <div className="bg-indigo-100 rounded-lg p-2.5 flex-1 text-center">
                <p className="text-xs font-bold text-indigo-700">Filter {f.num}</p>
                <p className="text-xs font-semibold text-indigo-900 mt-0.5">{f.label}</p>
                <p className="text-[10px] text-indigo-600 mt-0.5">{f.desc}</p>
              </div>
              {f.num !== '4' && <span className="text-indigo-300 font-bold hidden sm:block">&rarr;</span>}
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-indigo-700">
          <span>All 4 pass?</span>
          <span className="font-bold">&rarr;</span>
          <span className="bg-indigo-100 px-2 py-1 rounded font-semibold">Generate post via GPT</span>
          <span className="font-bold">&rarr;</span>
          <span className="bg-indigo-100 px-2 py-1 rounded font-semibold">Add to candidates</span>
        </div>
      </div>

      {/* Cooldown Periods */}
      <div className="bg-white rounded-lg p-4 border border-indigo-100 mb-4">
        <p className="font-semibold text-indigo-900 text-sm mb-2">Cooldown Periods (Filter 3)</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
          {[
            { type: 'life_summary', days: '1d' },
            { type: 'health_alert', days: '1d' },
            { type: 'pattern_prediction', days: '1d' },
            { type: 'streak_achievement', days: '3d' },
            { type: 'reflective_insight', days: '3d' },
            { type: 'category_insight', days: '3d' },
            { type: 'milestone', days: '7d' },
            { type: 'memory_highlight', days: '7d' },
            { type: 'activity_pattern', days: '7d' },
            { type: 'comparison', days: '14d' },
            { type: 'seasonal_reflection', days: '30d' },
          ].map((c) => (
            <div key={c.type} className="flex items-center justify-between bg-indigo-50 rounded px-2 py-1">
              <span className="text-indigo-800 truncate">{c.type}</span>
              <span className="font-mono font-bold text-indigo-600 ml-1 shrink-0">{c.days}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Data Eligibility Rules */}
      <div className="bg-white rounded-lg p-4 border border-indigo-100 mb-4">
        <p className="font-semibold text-indigo-900 text-sm mb-2">Data Eligibility Rules (Filter 4)</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-indigo-200">
                <th className="text-left py-1.5 pr-3 text-indigo-700 font-semibold">Post Type</th>
                <th className="text-left py-1.5 text-indigo-700 font-semibold">Requires</th>
              </tr>
            </thead>
            <tbody className="text-indigo-800">
              {[
                { type: 'life_summary', req: 'Always eligible', highlight: true },
                { type: 'milestone', req: 'Detected milestones (special detection pass)', highlight: false },
                { type: 'streak_achievement', req: 'Detected streaks (special detection pass)', highlight: false },
                { type: 'pattern_prediction', req: 'Detected predictions (special detection pass)', highlight: false },
                { type: 'health_alert', req: 'Detected anomalies in health data', highlight: false },
                { type: 'activity_pattern', req: 'Detected patterns in data', highlight: false },
                { type: 'reflective_insight', req: 'Any steps, activities, or locations', highlight: true },
                { type: 'comparison', req: 'Any steps, activities, or locations', highlight: true },
                { type: 'memory_highlight', req: 'Any photos, voice notes, or text notes', highlight: false },
                { type: 'seasonal_reflection', req: '2+ activities/patterns OR 1+ event', highlight: false },
                { type: 'category_insight', req: '5+ total content items (notes + photos)', highlight: false },
              ].map((r) => (
                <tr key={r.type} className="border-b border-indigo-50">
                  <td className="py-1.5 pr-3 font-medium font-mono">{r.type}</td>
                  <td className={`py-1.5 ${r.highlight ? 'text-green-700' : ''}`}>{r.req}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Final Ranking */}
      <div className="bg-white rounded-lg p-4 border border-indigo-100 mb-4">
        <p className="font-semibold text-indigo-900 text-sm mb-2">Final Ranking &amp; Selection</p>
        <div className="flex flex-col sm:flex-row items-stretch gap-2 text-xs text-center">
          <div className="flex-1 bg-indigo-50 rounded-lg p-2.5">
            <p className="font-bold text-indigo-700">Collect</p>
            <p className="text-indigo-600 mt-0.5">Generate up to N+2 candidates (buffer for filtering)</p>
          </div>
          <span className="text-indigo-300 font-bold self-center hidden sm:block">&rarr;</span>
          <div className="flex-1 bg-indigo-50 rounded-lg p-2.5">
            <p className="font-bold text-indigo-700">Filter</p>
            <p className="text-indigo-600 mt-0.5">Drop posts with confidence &lt; 0.5</p>
          </div>
          <span className="text-indigo-300 font-bold self-center hidden sm:block">&rarr;</span>
          <div className="flex-1 bg-indigo-50 rounded-lg p-2.5">
            <p className="font-bold text-indigo-700">Rank</p>
            <p className="text-indigo-600 mt-0.5">Sort by GPT confidence score (descending)</p>
          </div>
          <span className="text-indigo-300 font-bold self-center hidden sm:block">&rarr;</span>
          <div className="flex-1 bg-green-50 rounded-lg p-2.5 border border-green-200">
            <p className="font-bold text-green-700">Select Top N</p>
            <p className="text-green-600 mt-0.5">Return the highest-confidence posts</p>
          </div>
        </div>
      </div>

      {/* Key insight */}
      <p className="text-xs text-indigo-600">
        <strong>Key insight:</strong> Types are tried in the order they appear in <code>config/insightsPostTypes</code>.
        The loop stops early after collecting N+2 candidates. There is no pre-scoring to pick types &mdash; eligibility
        is binary, and <strong>GPT confidence</strong> is the sole ranking factor for the final selection.
      </p>
    </div>
  );
}

export default function AlgorithmReference() {
  const [expanded, setExpanded] = useState<Section>(null);

  const toggle = (section: Section) => {
    setExpanded((prev) => (prev === section ? null : section));
  };

  return (
    <div className="space-y-3">
      {/* Smart Frequency Algorithm */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg overflow-hidden">
        <button
          onClick={() => toggle('frequency')}
          className="w-full flex items-center gap-3 p-4 text-left hover:bg-purple-100/50 transition-colors cursor-pointer"
        >
          <div className="text-purple-500 text-xl">&#9881;</div>
          <h3 className="flex-1 text-lg font-semibold text-purple-900">Life Feed: Smart Frequency Algorithm</h3>
          <div className="text-purple-400">
            <ChevronIcon expanded={expanded === 'frequency'} />
          </div>
        </button>
        {expanded === 'frequency' && (
          <div className="px-4 pb-4">
            <FrequencySection />
          </div>
        )}
      </div>

      {/* Post Type Selection Algorithm */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg overflow-hidden">
        <button
          onClick={() => toggle('selection')}
          className="w-full flex items-center gap-3 p-4 text-left hover:bg-indigo-100/50 transition-colors cursor-pointer"
        >
          <div className="text-indigo-500 text-xl">&#127919;</div>
          <h3 className="flex-1 text-lg font-semibold text-indigo-900">Life Feed: Post Type Selection Algorithm</h3>
          <div className="text-indigo-400">
            <ChevronIcon expanded={expanded === 'selection'} />
          </div>
        </button>
        {expanded === 'selection' && (
          <div className="px-4 pb-4">
            <SelectionSection />
          </div>
        )}
      </div>
    </div>
  );
}
