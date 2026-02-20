'use client';

import { useState } from 'react';
import Link from 'next/link';

type Section = 'query-analysis' | 'temporal' | 'counting' | 'routing' | 'e2e-tests' | null;

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

function QueryAnalysisSection() {
  return (
    <div className="pt-4">
      <p className="text-sm text-blue-800 mb-4">
        <code>RAGEngine.analyzeQuery()</code> detects user intent to optimize vector search. It supports
        <strong> 9 languages</strong>: English, Chinese, Japanese, Korean, Spanish, French, German, Italian, Portuguese.
      </p>

      {/* RAG Flow Diagram */}
      <div className="bg-white rounded-lg p-4 border border-blue-100 mb-4">
        <p className="font-semibold text-blue-900 text-sm mb-3">RAG Query Flow</p>
        <div className="flex flex-col sm:flex-row items-stretch gap-2">
          {[
            { label: '1. Analyze Query', desc: 'Intent + Data Type' },
            { label: '2. Parse Temporal', desc: 'Date range detection' },
            { label: '3. Generate Embedding', desc: 'OpenAI API' },
            { label: '4. Query Pinecone', desc: 'Vector search + filters' },
            { label: '5. Build Context', desc: '+ Events from Firestore' },
            { label: '6. GPT-4o Response', desc: 'With context' },
          ].map((step, i) => (
            <div key={step.label} className="flex-1 flex items-center gap-2">
              <div className="bg-blue-100 rounded-lg p-2.5 flex-1 text-center">
                <p className="text-xs font-semibold text-blue-900">{step.label}</p>
                <p className="text-[10px] text-blue-600 mt-0.5">{step.desc}</p>
              </div>
              {i < 5 && <span className="text-blue-300 font-bold hidden sm:block">&rarr;</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Intent Detection */}
      <div className="bg-white rounded-lg p-4 border border-blue-100 mb-4">
        <p className="font-semibold text-blue-900 text-sm mb-2">Intent Detection Types</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs font-bold text-blue-700">isCountQuery</p>
            <p className="text-[11px] text-blue-600 mt-1">
              "How many", "几个", "何個", "몇 개", "cuántos", "combien", "wie viele", "quanti", "quantos"
            </p>
            <p className="text-[10px] text-green-600 mt-1 font-semibold">
              &rarr; Direct Firestore count (exact)
            </p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs font-bold text-blue-700">isAggregationQuery</p>
            <p className="text-[11px] text-blue-600 mt-1">
              "total", "average", "平均", "총", "promedio", "moyenne", "durchschnitt", "media", "média"
            </p>
            <p className="text-[10px] text-green-600 mt-1 font-semibold">
              &rarr; Direct Firestore sum/avg/min/max
            </p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs font-bold text-blue-700">isComparisonQuery</p>
            <p className="text-[11px] text-blue-600 mt-1">
              "compare", "vs", "比较", "비교", "comparar", "comparer", "vergleichen", "confrontare"
            </p>
            <p className="text-[10px] text-green-600 mt-1 font-semibold">
              &rarr; Direct Firestore (2 queries + diff)
            </p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs font-bold text-blue-700">isPatternQuery</p>
            <p className="text-[11px] text-blue-600 mt-1">
              "usually", "typically", "规律", "習慣", "패턴", "generalmente", "gewöhnlich"
            </p>
            <p className="text-[10px] text-green-600 mt-1 font-semibold">
              &rarr; Direct DB + day/time analysis
            </p>
          </div>
        </div>
      </div>

      {/* Data Type Detection */}
      <div className="bg-white rounded-lg p-4 border border-blue-100 mb-4">
        <p className="font-semibold text-blue-900 text-sm mb-2">Data Type Detection (Multi-language)</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { type: 'voice', icon: '🎙️', examples: 'voice, 语音, 音声, 음성, voz, voix, stimme, voce' },
            { type: 'photo', icon: '📸', examples: 'photo, 照片, 写真, 사진, foto, image, bild' },
            { type: 'health', icon: '❤️', examples: 'steps, 运动, 運動, 운동, ejercicio, exercice, übung, esercizio' },
            { type: 'location', icon: '📍', examples: 'place, 地点, 場所, 장소, lugar, lieu, ort, luogo' },
          ].map((dt) => (
            <div key={dt.type} className="bg-blue-50 rounded-lg p-2.5 border border-blue-100">
              <p className="font-semibold text-blue-800 text-xs">
                {dt.icon} {dt.type}
              </p>
              <p className="text-[10px] text-blue-600 mt-1 truncate" title={dt.examples}>
                {dt.examples}
              </p>
            </div>
          ))}
        </div>
        <p className="text-xs text-blue-600 mt-3">
          <strong>Effect:</strong> When detected, applies <code>{'{ type: { $eq: dataType } }'}</code> filter to Pinecone query
        </p>
      </div>

      {/* Constants */}
      <div className="bg-white rounded-lg p-4 border border-blue-100">
        <p className="font-semibold text-blue-900 text-sm mb-2">Key Constants</p>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-gray-50 rounded px-2 py-1.5 border">
            <code className="text-blue-700">RAG_TOP_K_RESULTS</code>
            <span className="float-right font-bold">10</span>
          </div>
          <div className="bg-gray-50 rounded px-2 py-1.5 border">
            <code className="text-blue-700">RAG_TOP_K_COUNT_QUERY</code>
            <span className="float-right font-bold">50</span>
          </div>
          <div className="bg-gray-50 rounded px-2 py-1.5 border">
            <code className="text-blue-700">RAG_CONTEXT_MAX_LENGTH</code>
            <span className="float-right font-bold">8000</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TemporalSection() {
  return (
    <div className="pt-4">
      <p className="text-sm text-purple-800 mb-4">
        <code>parseTemporalIntent()</code> converts relative time references to absolute date ranges.
        Supports <strong>9 languages</strong> with consistent behavior across all locales.
      </p>

      {/* Temporal Patterns Table */}
      <div className="bg-white rounded-lg p-4 border border-purple-100 mb-4">
        <p className="font-semibold text-purple-900 text-sm mb-3">Supported Temporal Patterns</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-purple-200">
                <th className="text-left py-1.5 pr-2 text-purple-700 font-semibold">Pattern</th>
                <th className="text-left py-1.5 px-2 text-purple-700 font-semibold">EN</th>
                <th className="text-left py-1.5 px-2 text-purple-700 font-semibold">ZH</th>
                <th className="text-left py-1.5 px-2 text-purple-700 font-semibold">JA</th>
                <th className="text-left py-1.5 px-2 text-purple-700 font-semibold">KO</th>
                <th className="text-left py-1.5 px-2 text-purple-700 font-semibold">ES/FR/DE/IT/PT</th>
              </tr>
            </thead>
            <tbody className="text-purple-800">
              {[
                { pattern: 'today', en: 'today', zh: '今天', ja: '今日', ko: '오늘', eur: 'hoy/aujourd\'hui/heute/oggi/hoje' },
                { pattern: 'yesterday', en: 'yesterday', zh: '昨天', ja: '昨日', ko: '어제', eur: 'ayer/hier/gestern/ieri/ontem' },
                { pattern: 'this week', en: 'this week', zh: '这周/本周', ja: '今週', ko: '이번 주', eur: 'esta semana/cette semaine/...' },
                { pattern: 'last week', en: 'last week', zh: '上周', ja: '先週', ko: '지난 주', eur: 'la semana pasada/...' },
                { pattern: 'this month', en: 'this month', zh: '这个月/本月', ja: '今月', ko: '이번 달', eur: 'este mes/ce mois/...' },
                { pattern: 'last month', en: 'last month', zh: '上个月', ja: '先月', ko: '지난 달', eur: 'el mes pasado/...' },
                { pattern: 'N days ago', en: 'N days ago', zh: 'N天前', ja: 'N日前', ko: 'N일 전', eur: 'hace N días/il y a N jours/...' },
              ].map((row) => (
                <tr key={row.pattern} className="border-b border-purple-50">
                  <td className="py-1.5 pr-2 font-medium">{row.pattern}</td>
                  <td className="py-1.5 px-2"><code className="text-[10px]">{row.en}</code></td>
                  <td className="py-1.5 px-2"><code className="text-[10px]">{row.zh}</code></td>
                  <td className="py-1.5 px-2"><code className="text-[10px]">{row.ja}</code></td>
                  <td className="py-1.5 px-2"><code className="text-[10px]">{row.ko}</code></td>
                  <td className="py-1.5 px-2"><code className="text-[10px]">{row.eur}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Date Range Calculation */}
      <div className="bg-white rounded-lg p-4 border border-purple-100 mb-4">
        <p className="font-semibold text-purple-900 text-sm mb-2">Date Range Calculation</p>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-purple-50 rounded-lg p-2.5">
            <p className="font-semibold text-purple-800">today / yesterday</p>
            <p className="text-purple-600 mt-1">
              <code>startOfDay(date)</code> &rarr; <code>endOfDay(date)</code>
            </p>
          </div>
          <div className="bg-purple-50 rounded-lg p-2.5">
            <p className="font-semibold text-purple-800">this week</p>
            <p className="text-purple-600 mt-1">
              Sunday 00:00 &rarr; today 23:59
            </p>
          </div>
          <div className="bg-purple-50 rounded-lg p-2.5">
            <p className="font-semibold text-purple-800">last week</p>
            <p className="text-purple-600 mt-1">
              Previous Sunday &rarr; Previous Saturday
            </p>
          </div>
          <div className="bg-purple-50 rounded-lg p-2.5">
            <p className="font-semibold text-purple-800">this/last month</p>
            <p className="text-purple-600 mt-1">
              1st of month &rarr; end of month
            </p>
          </div>
        </div>
      </div>

      {/* Pinecone Date Filter */}
      <div className="bg-white rounded-lg p-4 border border-purple-100">
        <p className="font-semibold text-purple-900 text-sm mb-2">Pinecone Date Filter</p>
        <p className="text-xs text-purple-700 mb-2">
          Supports multiple date field names in metadata:
        </p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {['date', 'createdAt', 'timestamp'].map((field) => (
            <span key={field} className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs font-mono border border-purple-200">
              {field}
            </span>
          ))}
        </div>
        <pre className="bg-gray-50 rounded p-2 text-[10px] text-purple-800 overflow-x-auto">
{`$or: [
  { date: { $gte: start, $lte: end } },
  { createdAt: { $gte: start, $lte: end } },
  { timestamp: { $gte: start, $lte: end } }
]`}
        </pre>
      </div>
    </div>
  );
}

function QueryRoutingSection() {
  return (
    <div className="pt-4">
      <p className="text-sm text-orange-800 mb-4">
        <strong>Query Router Pattern:</strong> Routes queries to optimal handler based on intent detection.
        Counting/aggregation queries use direct Firestore queries for exact results.
        Semantic queries use RAG (vector search) for relevant context.
      </p>

      {/* Query Type Table */}
      <div className="bg-white rounded-lg p-4 border border-orange-100 mb-4">
        <p className="font-semibold text-orange-900 text-sm mb-3">10 Query Types &amp; Handling</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-orange-200">
                <th className="text-left py-1.5 pr-2 text-orange-700 font-semibold">Query Type</th>
                <th className="text-left py-1.5 px-2 text-orange-700 font-semibold">Example</th>
                <th className="text-left py-1.5 px-2 text-orange-700 font-semibold">Handler</th>
                <th className="text-left py-1.5 pl-2 text-orange-700 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="text-orange-800">
              <tr className="border-b border-orange-50">
                <td className="py-1.5 pr-2 font-medium">Counting</td>
                <td className="py-1.5 px-2">&quot;How many voice notes?&quot;</td>
                <td className="py-1.5 px-2"><code className="text-[10px] bg-green-100 px-1 rounded">Direct DB</code></td>
                <td className="py-1.5 pl-2"><span className="text-green-600">✅</span></td>
              </tr>
              <tr className="border-b border-orange-50">
                <td className="py-1.5 pr-2 font-medium">Aggregation</td>
                <td className="py-1.5 px-2">&quot;Total steps this week&quot;</td>
                <td className="py-1.5 px-2"><code className="text-[10px] bg-green-100 px-1 rounded">Direct DB</code></td>
                <td className="py-1.5 pl-2"><span className="text-green-600">✅</span></td>
              </tr>
              <tr className="border-b border-orange-50">
                <td className="py-1.5 pr-2 font-medium">Comparison</td>
                <td className="py-1.5 px-2">&quot;More exercise than last month?&quot;</td>
                <td className="py-1.5 px-2"><code className="text-[10px] bg-green-100 px-1 rounded">Direct DB (2x)</code></td>
                <td className="py-1.5 pl-2"><span className="text-green-600">✅</span></td>
              </tr>
              <tr className="border-b border-orange-50">
                <td className="py-1.5 pr-2 font-medium">Pattern/Trend</td>
                <td className="py-1.5 px-2">&quot;When do I usually exercise?&quot;</td>
                <td className="py-1.5 px-2"><code className="text-[10px] bg-green-100 px-1 rounded">Direct DB + Analytics</code></td>
                <td className="py-1.5 pl-2"><span className="text-green-600">✅</span></td>
              </tr>
              <tr className="border-b border-orange-50">
                <td className="py-1.5 pr-2 font-medium">Temporal</td>
                <td className="py-1.5 px-2">&quot;What did I do yesterday?&quot;</td>
                <td className="py-1.5 px-2"><code className="text-[10px] bg-blue-100 px-1 rounded">RAG + Date Filter</code></td>
                <td className="py-1.5 pl-2"><span className="text-green-600">✅</span></td>
              </tr>
              <tr className="border-b border-orange-50">
                <td className="py-1.5 pr-2 font-medium">Memory Recall</td>
                <td className="py-1.5 px-2">&quot;What did I say about gym?&quot;</td>
                <td className="py-1.5 px-2"><code className="text-[10px] bg-blue-100 px-1 rounded">RAG (Semantic)</code></td>
                <td className="py-1.5 pl-2"><span className="text-green-600">✅</span></td>
              </tr>
              <tr className="border-b border-orange-50">
                <td className="py-1.5 pr-2 font-medium">Recommendation</td>
                <td className="py-1.5 px-2">&quot;What should I do today?&quot;</td>
                <td className="py-1.5 px-2"><code className="text-[10px] bg-blue-100 px-1 rounded">RAG + LLM</code></td>
                <td className="py-1.5 pl-2"><span className="text-green-600">✅</span></td>
              </tr>
              <tr className="border-b border-orange-50">
                <td className="py-1.5 pr-2 font-medium">Existence</td>
                <td className="py-1.5 px-2">&quot;Did I log my workout?&quot;</td>
                <td className="py-1.5 px-2"><code className="text-[10px] bg-blue-100 px-1 rounded">RAG fallback</code></td>
                <td className="py-1.5 pl-2"><span className="text-green-600">✅</span></td>
              </tr>
              <tr className="border-b border-orange-50">
                <td className="py-1.5 pr-2 font-medium">Correlation</td>
                <td className="py-1.5 px-2">&quot;Does sleep affect mood?&quot;</td>
                <td className="py-1.5 px-2"><code className="text-[10px] bg-gray-100 px-1 rounded">DB + Stats</code></td>
                <td className="py-1.5 pl-2"><span className="text-gray-400">🔴</span></td>
              </tr>
              <tr>
                <td className="py-1.5 pr-2 font-medium">Multi-dimensional</td>
                <td className="py-1.5 px-2">&quot;Health during stressful weeks&quot;</td>
                <td className="py-1.5 px-2"><code className="text-[10px] bg-gray-100 px-1 rounded">Hybrid</code></td>
                <td className="py-1.5 pl-2"><span className="text-gray-400">🔴</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Decision Tree */}
      <div className="bg-white rounded-lg p-4 border border-orange-100 mb-4">
        <p className="font-semibold text-orange-900 text-sm mb-2">Query Routing Decision Tree</p>
        <pre className="bg-gray-50 rounded p-3 text-[10px] text-orange-800 overflow-x-auto font-mono">
{`User Query
    │
    ▼
┌─────────────────────────────┐
│      analyzeQuery()         │
│  isCountQuery? isAggregation│
│  suggestedDataType?         │
└─────────────────────────────┘
    │
    ├─ isCountQuery + dataType ─────► DIRECT COUNT
    │                                  │→ Query Firestore
    │                                  │→ Get exact count
    │                                  └→ GPT formats response
    │
    ├─ isAggregation + dataType ────► DIRECT AGGREGATION
    │                                  │→ Query Firestore
    │                                  │→ Calculate sum/avg
    │                                  └→ GPT formats response
    │
    ├─ isComparison + periods ──────► DIRECT COMPARISON
    │                                  │→ 2 Firestore queries
    │                                  │→ Calculate diff
    │                                  └→ GPT formats response
    │
    ├─ isPattern + dataType ────────► PATTERN ANALYSIS
    │                                  │→ Query Firestore
    │                                  │→ Analyze day/time
    │                                  └→ GPT formats response
    │
    └─ Otherwise ───────────────────► RAG (Semantic)
                                       │→ Pinecone search
                                       │→ Build context
                                       └→ GPT with context`}
        </pre>
      </div>

      {/* Dual-Query Pattern for Mixed Date Types */}
      <div className="bg-white rounded-lg p-4 border border-orange-100 mb-4">
        <p className="font-semibold text-orange-900 text-sm mb-2">Dual-Query Pattern (Date Type Handling)</p>
        <p className="text-xs text-orange-700 mb-3">
          Firestore <code>createdAt</code> can be stored as ISO string or Timestamp.
          Firestore only matches same-type comparisons. We run <strong>both queries in parallel</strong> and merge by doc ID.
        </p>
        <pre className="bg-gray-50 rounded p-3 text-[10px] text-orange-800 overflow-x-auto font-mono">
{`// Run both queries in parallel
const [stringSnap, timestampSnap] = await Promise.all([
  query.where('createdAt', '>=', '2026-02-19T00:00:00Z')
       .where('createdAt', '<=', '2026-02-19T23:59:59Z').get(),
  query.where('createdAt', '>=', Timestamp.fromDate(start))
       .where('createdAt', '<=', Timestamp.fromDate(end)).get(),
]);

// Merge results (deduplicate by doc ID)
const docMap = new Map();
stringSnap.docs.forEach(d => docMap.set(d.id, d));
timestampSnap.docs.forEach(d => docMap.set(d.id, d));`}
        </pre>
        <p className="text-[10px] text-orange-600 mt-2">
          Applied to: <code>executeDirectCount</code>, <code>executeDirectAggregation</code>, <code>executePatternAnalysis</code>
        </p>
      </div>

      {/* Activity Override */}
      <div className="bg-white rounded-lg p-4 border border-orange-100 mb-4">
        <p className="font-semibold text-orange-900 text-sm mb-2">Activity &rarr; Location Override</p>
        <p className="text-xs text-orange-700 mb-2">
          When an activity (badminton, gym, etc.) is detected, data type is forced to <code>location</code>
          since <code>activityTag</code> lives on <code>locationData</code>. Prevents misclassification as <code>event</code>
          when temporal words like &quot;this week&quot; appear.
        </p>
        <div className="flex items-center gap-2 text-xs">
          <span className="bg-red-100 text-red-700 px-2 py-1 rounded">&quot;badminton this week&quot; &rarr; event</span>
          <span className="text-orange-400 font-bold">&rarr;</span>
          <span className="bg-green-100 text-green-700 px-2 py-1 rounded">&quot;badminton this week&quot; &rarr; location</span>
        </div>
      </div>

      {/* Firestore Indexes Required */}
      <div className="bg-white rounded-lg p-4 border border-orange-100 mb-4">
        <p className="font-semibold text-orange-900 text-sm mb-2">Required Firestore Composite Indexes</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
          {[
            { collection: 'voiceNotes', fields: 'userId, createdAt' },
            { collection: 'textNotes', fields: 'userId, createdAt' },
            { collection: 'healthData', fields: 'userId, createdAt' },
            { collection: 'locationData', fields: 'userId, createdAt' },
            { collection: 'locationData', fields: 'userId, activityTag, createdAt' },
            { collection: 'photoMemories', fields: 'userId, createdAt' },
            { collection: 'events', fields: 'userId, createdAt' },
          ].map((idx) => (
            <div key={`${idx.collection}-${idx.fields}`} className="bg-orange-50 rounded px-2 py-1.5 border border-orange-100">
              <p className="font-mono font-bold text-orange-800">{idx.collection}</p>
              <p className="text-[10px] text-orange-600 mt-0.5">{idx.fields}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Benefits */}
      <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
        <p className="font-semibold text-orange-900 text-xs mb-1">Why Hybrid Routing?</p>
        <ul className="text-[11px] text-orange-800 list-disc list-inside space-y-0.5">
          <li><strong>Exact counts:</strong> &quot;5 voice notes&quot; not &quot;approximately 5&quot;</li>
          <li><strong>No topK limit:</strong> Works with 1000+ items (RAG limited to 50)</li>
          <li><strong>Faster:</strong> Direct DB query ~200ms vs RAG ~800ms</li>
          <li><strong>Cheaper:</strong> No embedding generation for direct queries</li>
          <li><strong>Sources included:</strong> Up to 10 items returned in contextUsed (snippet, id, type, score)</li>
        </ul>
      </div>
    </div>
  );
}

function E2ETestScenariosSection() {
  return (
    <div className="pt-4">
      <p className="text-sm text-cyan-800 mb-4">
        <strong>12 strict E2E tests</strong> create real Firestore data, call Cloud Functions, and verify responses with hard assertions.
        Run: <code className="bg-cyan-100 px-1 rounded">npx tsx scripts/integration-tests/tests/query-routing-e2e.test.ts</code>
      </p>

      {/* Test Summary */}
      <div className="bg-white rounded-lg p-4 border border-cyan-100 mb-3">
        <p className="font-semibold text-cyan-900 text-sm mb-3">
          <span className="bg-green-100 text-green-800 px-1.5 rounded text-xs mr-2">12/12</span>
          All Tests Passing
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-cyan-200">
                <th className="text-left py-1.5 pr-2 text-cyan-700 font-semibold">Test</th>
                <th className="text-left py-1.5 px-2 text-cyan-700 font-semibold">Assertion</th>
                <th className="text-left py-1.5 pl-2 text-cyan-700 font-semibold w-8">Status</th>
              </tr>
            </thead>
            <tbody className="text-cyan-800">
              {[
                { name: 'Count voice notes yesterday', assert: 'count=3, direct route, 3 sources', group: 'P1' },
                { name: 'Count photos yesterday', assert: 'count=0, direct route, 0 sources', group: 'P1' },
                { name: 'Count badminton this week', assert: 'count=2, type=location, 2 sources', group: 'P1' },
                { name: 'Chinese: 昨天我记录了几个语音信息', assert: 'contains 3, direct route', group: 'P1' },
                { name: 'Count diary entries today', assert: 'count=1, direct route', group: 'P1' },
                { name: 'Source format validation', assert: 'id, type, snippet, score, sourceId', group: 'SRC' },
                { name: 'Location sources for badminton', assert: 'type=location, id prefix match', group: 'SRC' },
                { name: 'Sources capped at 10', assert: 'contextUsed.length <= 10', group: 'SRC' },
                { name: 'Counting → DIRECT route', assert: 'wasDirectQuery=true, type=count', group: 'ROUTE' },
                { name: 'Semantic → RAG route', assert: 'wasDirectQuery !== true', group: 'ROUTE' },
                { name: 'ISO string dates queryable', assert: 'providerInfo.count=3 (not 0)', group: 'DATE' },
                { name: 'Timestamp dates queryable', assert: 'finds text notes with Timestamps', group: 'DATE' },
              ].map((test, i) => (
                <tr key={i} className="border-b border-cyan-50">
                  <td className="py-1.5 pr-2">
                    <span className={`text-[9px] px-1 rounded mr-1.5 font-mono ${
                      test.group === 'P1' ? 'bg-green-100 text-green-700' :
                      test.group === 'SRC' ? 'bg-purple-100 text-purple-700' :
                      test.group === 'ROUTE' ? 'bg-orange-100 text-orange-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>{test.group}</span>
                    {test.name}
                  </td>
                  <td className="py-1.5 px-2 font-mono text-[10px] text-cyan-600">{test.assert}</td>
                  <td className="py-1.5 pl-2 text-green-600">&#10003;</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Test Data */}
      <div className="bg-white rounded-lg p-4 border border-cyan-100 mb-3">
        <p className="font-semibold text-cyan-900 text-sm mb-2">Test Data Seeded</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div className="bg-cyan-50 rounded px-2.5 py-2 border border-cyan-100">
            <p className="font-bold text-cyan-800">6 voice notes</p>
            <p className="text-[10px] text-cyan-600">ISO string dates</p>
          </div>
          <div className="bg-cyan-50 rounded px-2.5 py-2 border border-cyan-100">
            <p className="font-bold text-cyan-800">3 text notes</p>
            <p className="text-[10px] text-cyan-600">Timestamp dates</p>
          </div>
          <div className="bg-cyan-50 rounded px-2.5 py-2 border border-cyan-100">
            <p className="font-bold text-cyan-800">6 locations</p>
            <p className="text-[10px] text-cyan-600">badminton, gym, work</p>
          </div>
          <div className="bg-cyan-50 rounded px-2.5 py-2 border border-cyan-100">
            <p className="font-bold text-cyan-800">6 health records</p>
            <p className="text-[10px] text-cyan-600">steps data</p>
          </div>
        </div>
      </div>

      {/* Strict Assertion Pattern */}
      <div className="bg-white rounded-lg p-4 border border-cyan-100 mb-3">
        <p className="font-semibold text-cyan-900 text-sm mb-2">Strict Assertion Pattern</p>
        <p className="text-xs text-cyan-700 mb-2">
          No fallbacks like <code className="bg-red-50 text-red-600 px-1 rounded">response.length {'>'} 30</code>.
          Tests throw on failure.
        </p>
        <pre className="bg-gray-50 rounded p-2 text-[10px] text-cyan-800 overflow-x-auto font-mono">
{`assertDirectQuery(providerInfo, 'count', msg);  // wasDirectQuery=true
assertContainsNumber(response, 3, msg);          // exact count in text
assertHasSources(contextUsed, 3, 'voice', msg);  // source format`}
        </pre>
      </div>

      {/* Run Tests */}
      <div className="bg-cyan-50 rounded-lg p-3 border border-cyan-200">
        <p className="text-xs text-cyan-800">
          <strong>Run E2E Tests:</strong>{' '}
          <code className="bg-cyan-100 px-1 rounded">cd personal-ai-web && npx tsx scripts/integration-tests/tests/query-routing-e2e.test.ts</code>
        </p>
        <p className="text-[10px] text-cyan-600 mt-1">
          Seeds data (ISO + Timestamp dates) &rarr; Calls queryRAG Cloud Function &rarr; Strict assertions &rarr; Cleanup
        </p>
      </div>
    </div>
  );
}

function CountingSection() {
  return (
    <div className="pt-4">
      <p className="text-sm text-green-800 mb-4">
        Counting queries now use <strong>Direct Firestore Count</strong> (bypasses RAG) for exact results.
        This ensures answers like &quot;You recorded exactly 5 voice notes yesterday&quot; instead of estimates.
      </p>

      {/* Counting Detection */}
      <div className="bg-white rounded-lg p-4 border border-green-100 mb-4">
        <p className="font-semibold text-green-900 text-sm mb-2">Counting Pattern Detection (9 Languages)</p>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-2 text-xs">
          {[
            { lang: 'EN', patterns: 'how many, count, times' },
            { lang: 'ZH', patterns: '几个, 多少, 数量' },
            { lang: 'JA', patterns: 'いくつ, 何個, 回数' },
            { lang: 'KO', patterns: '몇 개, 몇 번, 횟수' },
            { lang: 'ES', patterns: 'cuántos, veces' },
            { lang: 'FR', patterns: 'combien, fois' },
            { lang: 'DE', patterns: 'wie viele, anzahl' },
            { lang: 'IT', patterns: 'quanti, volte' },
            { lang: 'PT', patterns: 'quantos, vezes' },
          ].map((l) => (
            <div key={l.lang} className="bg-green-50 rounded px-2 py-1.5 border border-green-100">
              <span className="font-bold text-green-800">{l.lang}</span>
              <p className="text-[10px] text-green-600 mt-0.5">{l.patterns}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How Counting Works - NEW Direct DB approach */}
      <div className="bg-white rounded-lg p-4 border border-green-100 mb-4">
        <p className="font-semibold text-green-900 text-sm mb-3">How Counting Queries Work (NEW: Direct DB)</p>
        <div className="flex flex-col sm:flex-row items-stretch gap-2">
          {[
            { label: '1. Detect count pattern', desc: 'Multi-language regex' },
            { label: '2. Detect data type', desc: 'voice/health/location/etc' },
            { label: '3. Query Firestore', desc: 'Direct count query' },
            { label: '4. GPT formats response', desc: 'Natural language' },
          ].map((step, i) => (
            <div key={step.label} className="flex-1 flex items-center gap-2">
              <div className="bg-green-100 rounded-lg p-2.5 flex-1 text-center">
                <p className="text-xs font-semibold text-green-900">{step.label}</p>
                <p className="text-[10px] text-green-600 mt-0.5">{step.desc}</p>
              </div>
              {i < 3 && <span className="text-green-300 font-bold hidden sm:block">&rarr;</span>}
            </div>
          ))}
        </div>
        <p className="text-xs text-green-700 mt-3 bg-green-50 p-2 rounded">
          <strong>Note:</strong> If data type is not detected, falls back to RAG with topK=50 for semantic search.
        </p>
      </div>

      {/* Direct Query Response Format */}
      <div className="bg-white rounded-lg p-4 border border-green-100 mb-4">
        <p className="font-semibold text-green-900 text-sm mb-2">Direct Query Response Format</p>
        <pre className="bg-gray-50 rounded p-3 text-[11px] text-green-800 overflow-x-auto">
{`// providerInfo returned to client:
{
  provider: 'openai',
  model: 'gpt-4o-mini',
  wasDirectQuery: true,         // ← indicates direct DB path
  directQueryType: 'count',     // count | aggregation | comparison | pattern
  count: 5                      // exact count from Firestore
}

// contextUsed (up to 10 items):
[{
  id: 'voice-note-123',
  type: 'voice',
  snippet: 'Meeting reminder for tomorrow...',
  score: 1.0,
  sourceId: 'voice-note-123'
}]`}
        </pre>
      </div>

      {/* Real Use Cases */}
      <div className="bg-white rounded-lg p-4 border border-green-100 mb-4">
        <p className="font-semibold text-green-900 text-sm mb-2">Real Use Cases (All Languages Work)</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          {[
            { query: 'How many voice notes did I record yesterday?', lang: 'EN' },
            { query: '昨天我记录了几个语音信息', lang: 'ZH' },
            { query: '今日何枚写真を撮りましたか', lang: 'JA' },
            { query: '오늘 사진을 몇 장 찍었나요', lang: 'KO' },
            { query: '¿Cuántas veces hice ejercicio esta semana?', lang: 'ES' },
            { query: 'Wie oft habe ich diese Woche trainiert?', lang: 'DE' },
          ].map((ex, i) => (
            <div key={i} className="bg-green-50 rounded px-3 py-2 border border-green-100">
              <span className="font-mono text-green-800 text-[10px] bg-green-100 px-1 rounded">{ex.lang}</span>
              <p className="text-green-700 mt-1">&quot;{ex.query}&quot;</p>
            </div>
          ))}
        </div>
      </div>

      {/* E2E Tests Link */}
      <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
        <p className="text-xs text-amber-800">
          <strong>E2E Tests:</strong> 12 strict tests verify counting, source format, routing, and date handling.
          Run: <code className="bg-amber-100 px-1 rounded">npx tsx scripts/integration-tests/tests/query-routing-e2e.test.ts</code>
        </p>
      </div>
    </div>
  );
}

export default function RAGAlgorithmReference() {
  const [expanded, setExpanded] = useState<Section>(null);

  const toggle = (section: Section) => {
    setExpanded((prev) => (prev === section ? null : section));
  };

  return (
    <div className="space-y-3">
      {/* Query Analysis Algorithm */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg overflow-hidden">
        <button
          onClick={() => toggle('query-analysis')}
          className="w-full flex items-center gap-3 p-4 text-left hover:bg-blue-100/50 transition-colors cursor-pointer"
        >
          <div className="text-blue-500 text-xl">&#128269;</div>
          <h3 className="flex-1 text-lg font-semibold text-blue-900">RAG: Query Analysis &amp; Intent Detection</h3>
          <div className="text-blue-400">
            <ChevronIcon expanded={expanded === 'query-analysis'} />
          </div>
        </button>
        {expanded === 'query-analysis' && (
          <div className="px-4 pb-4">
            <QueryAnalysisSection />
          </div>
        )}
      </div>

      {/* Temporal Reasoning Algorithm */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg overflow-hidden">
        <button
          onClick={() => toggle('temporal')}
          className="w-full flex items-center gap-3 p-4 text-left hover:bg-purple-100/50 transition-colors cursor-pointer"
        >
          <div className="text-purple-500 text-xl">&#128197;</div>
          <h3 className="flex-1 text-lg font-semibold text-purple-900">RAG: Temporal Reasoning (Multi-language)</h3>
          <div className="text-purple-400">
            <ChevronIcon expanded={expanded === 'temporal'} />
          </div>
        </button>
        {expanded === 'temporal' && (
          <div className="px-4 pb-4">
            <TemporalSection />
          </div>
        )}
      </div>

      {/* Counting Query Algorithm */}
      <div className="bg-green-50 border border-green-200 rounded-lg overflow-hidden">
        <button
          onClick={() => toggle('counting')}
          className="w-full flex items-center gap-3 p-4 text-left hover:bg-green-100/50 transition-colors cursor-pointer"
        >
          <div className="text-green-500 text-xl">&#128290;</div>
          <h3 className="flex-1 text-lg font-semibold text-green-900">Direct DB: Counting Queries (9 Languages)</h3>
          <div className="text-green-400">
            <ChevronIcon expanded={expanded === 'counting'} />
          </div>
        </button>
        {expanded === 'counting' && (
          <div className="px-4 pb-4">
            <CountingSection />
          </div>
        )}
      </div>

      {/* Query Routing Architecture (NEW) */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg overflow-hidden">
        <button
          onClick={() => toggle('routing')}
          className="w-full flex items-center gap-3 p-4 text-left hover:bg-orange-100/50 transition-colors cursor-pointer"
        >
          <div className="text-orange-500 text-xl">&#128256;</div>
          <h3 className="flex-1 text-lg font-semibold text-orange-900">Query Routing Architecture (4 Phases)</h3>
          <div className="text-orange-400">
            <ChevronIcon expanded={expanded === 'routing'} />
          </div>
        </button>
        {expanded === 'routing' && (
          <div className="px-4 pb-4">
            <QueryRoutingSection />
          </div>
        )}
      </div>

      {/* E2E Test Scenarios (NEW) */}
      <div className="bg-cyan-50 border border-cyan-200 rounded-lg overflow-hidden">
        <button
          onClick={() => toggle('e2e-tests')}
          className="w-full flex items-center gap-3 p-4 text-left hover:bg-cyan-100/50 transition-colors cursor-pointer"
        >
          <div className="text-cyan-500 text-xl">&#129514;</div>
          <h3 className="flex-1 text-lg font-semibold text-cyan-900">E2E Test Scenarios (All Phases)</h3>
          <div className="text-cyan-400">
            <ChevronIcon expanded={expanded === 'e2e-tests'} />
          </div>
        </button>
        {expanded === 'e2e-tests' && (
          <div className="px-4 pb-4">
            <E2ETestScenariosSection />
          </div>
        )}
      </div>

      {/* Related Links */}
      <div className="text-xs text-gray-600 pt-2">
        <Link
          href="/admin/docs"
          className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
        >
          View Full Documentation &rarr;
        </Link>
      </div>
    </div>
  );
}
