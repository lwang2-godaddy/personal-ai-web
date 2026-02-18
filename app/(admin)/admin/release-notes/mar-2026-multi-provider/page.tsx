'use client';

import Link from 'next/link';
import { useTrackPage } from '@/lib/hooks/useTrackPage';
import { TRACKED_SCREENS } from '@/lib/models/BehaviorEvent';

/**
 * Multi-Provider AI Architecture Release Notes
 *
 * March 2026 release introducing extensible AI provider framework.
 */
export default function MultiProviderReleaseNotesPage() {
  useTrackPage(TRACKED_SCREENS.adminReleaseNotes);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/release-notes"
            className="text-sm text-indigo-600 hover:text-indigo-800 mb-2 inline-block"
          >
            &larr; Back to Release Notes
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            Multi-Provider AI Architecture
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Version 1.5.0 | March 2026 | In Progress
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
          <span className="w-2 h-2 rounded-full bg-yellow-500" />
          In Progress
        </span>
      </div>

      {/* Overview */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Overview</h2>
        <p className="text-gray-700 leading-relaxed">
          This release introduces an extensible AI provider framework that allows switching between
          cloud providers (OpenAI, Google Cloud, Anthropic) and local LLMs (Ollama) without
          requiring app updates. Configuration is managed via Firestore and the admin portal,
          with changes taking effect within 5 minutes.
        </p>
      </section>

      {/* Key Features */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Key Features</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <FeatureCard
            icon="🔌"
            title="Provider Framework"
            description="Plug-in architecture for any LLM provider. Interfaces for chat, embedding, TTS, STT, and vision services."
          />
          <FeatureCard
            icon="☁️"
            title="Cloud Providers"
            description="OpenAI (GPT-4o, Whisper, TTS), Google Cloud (Gemini, Neural2 TTS, Speech V2), Anthropic (Claude)."
          />
          <FeatureCard
            icon="🏠"
            title="Local Providers"
            description="Ollama support for Llama 3, Mistral, and LLaVA. Zero API cost, full privacy, offline capable."
          />
          <FeatureCard
            icon="🔧"
            title="Custom Endpoints"
            description="Any OpenAI-compatible API (vLLM, text-generation-webui, LocalAI). Configurable base URL."
          />
          <FeatureCard
            icon="📊"
            title="Provider Analytics"
            description="Cost breakdown by provider in usage dashboard. Track calls, tokens, and latency per provider."
          />
          <FeatureCard
            icon="⏰"
            title="Async Processing"
            description="Off-peak scheduling for batch tasks. Run embeddings, summaries, and analysis during 2-6 AM."
          />
          <FeatureCard
            icon="🔄"
            title="Automatic Fallback"
            description="Configurable fallback providers per service. Graceful degradation when primary unavailable."
          />
          <FeatureCard
            icon="⚡"
            title="No App Update Required"
            description="Provider config stored in Firestore. Changes propagate within 5-minute cache TTL."
          />
        </div>
      </section>

      {/* Cost Savings */}
      <section className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💰</span>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-emerald-900 mb-4">
              Cost Savings Potential
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-emerald-200">
                    <th className="text-left py-2 text-emerald-800">Service</th>
                    <th className="text-right py-2 text-emerald-800">OpenAI</th>
                    <th className="text-right py-2 text-emerald-800">Google Cloud</th>
                    <th className="text-right py-2 text-emerald-800">Local (Ollama)</th>
                    <th className="text-right py-2 text-emerald-800">Savings</th>
                  </tr>
                </thead>
                <tbody className="text-emerald-700">
                  <tr className="border-b border-emerald-100">
                    <td className="py-2 font-medium">Chat (1M tokens)</td>
                    <td className="text-right">$2.50-$10</td>
                    <td className="text-right">$0.08-$0.30</td>
                    <td className="text-right text-green-600 font-semibold">$0</td>
                    <td className="text-right text-green-600 font-semibold">Up to 100%</td>
                  </tr>
                  <tr className="border-b border-emerald-100">
                    <td className="py-2 font-medium">TTS (1M chars)</td>
                    <td className="text-right">$15</td>
                    <td className="text-right text-green-600 font-semibold">$0 (1M free/mo)</td>
                    <td className="text-right">-</td>
                    <td className="text-right text-green-600 font-semibold">100%</td>
                  </tr>
                  <tr className="border-b border-emerald-100">
                    <td className="py-2 font-medium">STT (/minute)</td>
                    <td className="text-right">$0.006</td>
                    <td className="text-right text-green-600 font-semibold">$0 (60 min free/mo)</td>
                    <td className="text-right text-green-600 font-semibold">$0</td>
                    <td className="text-right text-green-600 font-semibold">100%</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-medium">Embeddings (1M tokens)</td>
                    <td className="text-right">$0.02</td>
                    <td className="text-right">$0.00025</td>
                    <td className="text-right text-green-600 font-semibold">$0</td>
                    <td className="text-right text-green-600 font-semibold">Up to 100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-emerald-600 mt-4">
              Google Cloud free tier: 1M TTS chars/month, 60 minutes STT/month. Local models have no API cost (compute only).
            </p>
          </div>
        </div>
      </section>

      {/* Admin Portal Changes */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Admin Portal Changes</h2>
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <span className="text-green-500 font-bold">+</span>
            <div>
              <span className="font-medium text-gray-900">New: /admin/ai-providers page</span>
              <p className="text-sm text-gray-600 mt-0.5">
                Configure which provider handles each service (chat, TTS, STT, embedding, vision).
                Set primary and fallback providers per service. Enable/disable providers globally.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-blue-500 font-bold">~</span>
            <div>
              <span className="font-medium text-gray-900">Enhanced: /admin/usage page</span>
              <p className="text-sm text-gray-600 mt-0.5">
                New provider breakdown section showing cost, calls, and latency per provider.
                Pie chart for cost distribution. Free tier usage tracking for Google Cloud.
              </p>
            </div>
          </li>
        </ul>
      </section>

      {/* Technical Details */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Technical Details</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Architecture</h3>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li>Registry pattern for provider management (ProviderRegistry)</li>
              <li>Interface-based provider abstraction (IAIProvider, IChatProvider, etc.)</li>
              <li>Central router for all AI operations (AIProviderRouter)</li>
              <li>Firestore-based runtime configuration with 5-minute cache TTL</li>
              <li>Automatic fallback on provider failure</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Firestore Documents</h3>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li><code className="bg-gray-100 px-1 rounded">/config/aiProviders</code> - Provider configuration per service</li>
              <li><code className="bg-gray-100 px-1 rounded">/config/pricing</code> - Pricing table for all providers</li>
              <li><code className="bg-gray-100 px-1 rounded">/promptExecutions/&#123;id&#125;</code> - Execution logs with providerId, providerType fields</li>
              <li><code className="bg-gray-100 px-1 rounded">/aiTasks/&#123;id&#125;</code> - Queued async tasks for off-peak processing</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-2">New Mobile Files</h3>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li><code className="bg-gray-100 px-1 rounded">src/providers/interfaces/</code> - Provider interfaces and types</li>
              <li><code className="bg-gray-100 px-1 rounded">src/providers/registry/ProviderRegistry.ts</code> - Provider registration</li>
              <li><code className="bg-gray-100 px-1 rounded">src/providers/config/ProviderConfigService.ts</code> - Firestore config management</li>
              <li><code className="bg-gray-100 px-1 rounded">src/providers/AIProviderRouter.ts</code> - Central routing service</li>
              <li><code className="bg-gray-100 px-1 rounded">src/providers/implementations/</code> - OpenAI, Google, Ollama adapters</li>
              <li><code className="bg-gray-100 px-1 rounded">src/providers/scheduling/AITaskScheduler.ts</code> - Async task scheduling</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Migration Guide */}
      <section className="bg-amber-50 border border-amber-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl">📋</span>
          <div>
            <h2 className="text-lg font-semibold text-amber-900 mb-2">Migration Guide</h2>
            <ol className="list-decimal list-inside text-sm text-amber-800 space-y-2">
              <li>
                <span className="font-medium">Initialize config</span> - Visit /admin/ai-providers and click "Initialize Configuration"
              </li>
              <li>
                <span className="font-medium">Test one service at a time</span> - Start with TTS (lowest risk), then STT, then chat
              </li>
              <li>
                <span className="font-medium">Monitor costs</span> - Check usage dashboard for cost breakdown by provider
              </li>
              <li>
                <span className="font-medium">Configure fallbacks</span> - Set OpenAI as fallback for all services initially
              </li>
              <li>
                <span className="font-medium">No app update required</span> - Config changes propagate within 5 minutes
              </li>
            </ol>
          </div>
        </div>
      </section>

      {/* Rollback Strategy */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Rollback Strategy</h2>
        <ul className="list-disc list-inside text-sm text-gray-600 space-y-2">
          <li><span className="font-medium">Per-service rollback:</span> Each service can independently revert to OpenAI</li>
          <li><span className="font-medium">Global rollback:</span> Set all services to OpenAI with one click in admin portal</li>
          <li><span className="font-medium">Version history:</span> Firestore maintains config version for audit trail</li>
          <li><span className="font-medium">Instant effect:</span> Config changes propagate within 5 minutes (cache TTL)</li>
          <li><span className="font-medium">Fallback configured:</span> Each service has fallback provider for automatic failover</li>
        </ul>
      </section>

      {/* Related Links */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Related Links</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <Link
            href="/admin/ai-providers"
            className="block rounded-lg border border-gray-200 p-3 hover:shadow-sm hover:border-indigo-300 transition-all"
          >
            <h3 className="text-sm font-semibold text-gray-900">AI Providers</h3>
            <p className="text-xs text-gray-500 mt-0.5">Configure provider settings</p>
            <div className="mt-2 text-indigo-600 font-medium text-xs">Open &rarr;</div>
          </Link>
          <Link
            href="/admin/usage"
            className="block rounded-lg border border-gray-200 p-3 hover:shadow-sm hover:border-indigo-300 transition-all"
          >
            <h3 className="text-sm font-semibold text-gray-900">Usage Analytics</h3>
            <p className="text-xs text-gray-500 mt-0.5">View cost breakdown by provider</p>
            <div className="mt-2 text-indigo-600 font-medium text-xs">Open &rarr;</div>
          </Link>
          <Link
            href="/admin/release-notes"
            className="block rounded-lg border border-gray-200 p-3 hover:shadow-sm hover:border-indigo-300 transition-all"
          >
            <h3 className="text-sm font-semibold text-gray-900">All Releases</h3>
            <p className="text-xs text-gray-500 mt-0.5">View all release notes</p>
            <div className="mt-2 text-indigo-600 font-medium text-xs">Open &rarr;</div>
          </Link>
        </div>
      </section>
    </div>
  );
}

/**
 * Feature card component
 */
function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}
