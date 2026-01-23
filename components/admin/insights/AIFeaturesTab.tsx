'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPut } from '@/lib/api/client';
import {
  FunFactsConfig,
  MoodCompassConfig,
  MemoryCompanionConfig,
  LifeForecasterConfig,
} from '@/lib/models/InsightsFeatureConfig';

interface AIFeaturesTabProps {
  onSaving?: (saving: boolean) => void;
}

type ExpandedSection = 'fun-facts' | 'mood-compass' | 'memory-companion' | 'life-forecaster' | null;

/**
 * AI Features Tab - Configure 4 AI analysis features in accordion sections
 * Combines: Fun Facts, Mood Compass, Memory Companion, Life Forecaster
 */
export default function AIFeaturesTab({ onSaving }: AIFeaturesTabProps) {
  const [expandedSection, setExpandedSection] = useState<ExpandedSection>('fun-facts');
  const [saving, setSaving] = useState(false);

  // Fun Facts State
  const [funFactsConfig, setFunFactsConfig] = useState<FunFactsConfig | null>(null);
  const [funFactsLoading, setFunFactsLoading] = useState(true);
  const [funFactsError, setFunFactsError] = useState<string | null>(null);

  // Mood Compass State
  const [moodCompassConfig, setMoodCompassConfig] = useState<MoodCompassConfig | null>(null);
  const [moodCompassLoading, setMoodCompassLoading] = useState(true);
  const [moodCompassError, setMoodCompassError] = useState<string | null>(null);

  // Memory Companion State
  const [memoryCompanionConfig, setMemoryCompanionConfig] = useState<MemoryCompanionConfig | null>(null);
  const [memoryCompanionLoading, setMemoryCompanionLoading] = useState(true);
  const [memoryCompanionError, setMemoryCompanionError] = useState<string | null>(null);

  // Life Forecaster State
  const [lifeForecasterConfig, setLifeForecasterConfig] = useState<LifeForecasterConfig | null>(null);
  const [lifeForecasterLoading, setLifeForecasterLoading] = useState(true);
  const [lifeForecasterError, setLifeForecasterError] = useState<string | null>(null);

  // Fetch all configurations
  const fetchFunFacts = useCallback(async () => {
    try {
      setFunFactsLoading(true);
      setFunFactsError(null);
      const result = await apiGet<{ config: FunFactsConfig }>('/api/admin/insights/fun-facts');
      setFunFactsConfig(result.config);
    } catch (err: any) {
      setFunFactsError(err.message || 'Failed to load');
    } finally {
      setFunFactsLoading(false);
    }
  }, []);

  const fetchMoodCompass = useCallback(async () => {
    try {
      setMoodCompassLoading(true);
      setMoodCompassError(null);
      const result = await apiGet<{ config: MoodCompassConfig }>('/api/admin/insights/mood-compass');
      setMoodCompassConfig(result.config);
    } catch (err: any) {
      setMoodCompassError(err.message || 'Failed to load');
    } finally {
      setMoodCompassLoading(false);
    }
  }, []);

  const fetchMemoryCompanion = useCallback(async () => {
    try {
      setMemoryCompanionLoading(true);
      setMemoryCompanionError(null);
      const result = await apiGet<{ config: MemoryCompanionConfig }>('/api/admin/insights/memory-companion');
      setMemoryCompanionConfig(result.config);
    } catch (err: any) {
      setMemoryCompanionError(err.message || 'Failed to load');
    } finally {
      setMemoryCompanionLoading(false);
    }
  }, []);

  const fetchLifeForecaster = useCallback(async () => {
    try {
      setLifeForecasterLoading(true);
      setLifeForecasterError(null);
      const result = await apiGet<{ config: LifeForecasterConfig }>('/api/admin/insights/life-forecaster');
      setLifeForecasterConfig(result.config);
    } catch (err: any) {
      setLifeForecasterError(err.message || 'Failed to load');
    } finally {
      setLifeForecasterLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFunFacts();
    fetchMoodCompass();
    fetchMemoryCompanion();
    fetchLifeForecaster();
  }, [fetchFunFacts, fetchMoodCompass, fetchMemoryCompanion, fetchLifeForecaster]);

  useEffect(() => {
    onSaving?.(saving);
  }, [saving, onSaving]);

  const toggleSection = (section: ExpandedSection) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // Count enabled features
  const countEnabled = () => {
    let count = 0;
    if (funFactsConfig?.enabled) count++;
    if (moodCompassConfig?.enabled) count++;
    if (memoryCompanionConfig?.enabled) count++;
    if (lifeForecasterConfig?.enabled) count++;
    return count;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">AI Features Configuration</h2>
          <p className="text-sm text-gray-600">
            Configure 4 AI analysis features for intelligent insights
          </p>
        </div>
        <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg">
          <span className="font-semibold">{countEnabled()}/4</span> features enabled
        </div>
      </div>

      {/* Architecture Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">AI Features → Post Type Mapping</h4>
        <div className="text-sm text-blue-800">
          <p className="mb-3">Each AI feature generates specific post types to the Life Feed:</p>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-blue-200">
                <th className="py-1 pr-4">Feature</th>
                <th className="py-1 pr-4">Schedule</th>
                <th className="py-1 pr-4">Post Type</th>
                <th className="py-1">Method</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-blue-100">
                <td className="py-2 pr-4">🎯 Fun Facts (Notifications)</td>
                <td className="py-2 pr-4 font-mono text-xs">User pref time</td>
                <td className="py-2 pr-4"><span className="text-orange-600">Push notification</span></td>
                <td className="py-2">Template-based</td>
              </tr>
              <tr className="border-b border-blue-100">
                <td className="py-2 pr-4">🎯 Fun Facts (Carousel)</td>
                <td className="py-2 pr-4 font-mono text-xs">On app open</td>
                <td className="py-2 pr-4"><span className="text-gray-500 italic">Home carousel</span></td>
                <td className="py-2 text-green-700 font-medium">RAG + GPT</td>
              </tr>
              <tr className="border-b border-blue-100">
                <td className="py-2 pr-4">🧭 Mood Compass</td>
                <td className="py-2 pr-4 font-mono text-xs">2 AM UTC</td>
                <td className="py-2 pr-4"><code className="bg-blue-100 px-1 rounded">reflective_insight</code></td>
                <td className="py-2">Template + data</td>
              </tr>
              <tr className="border-b border-blue-100">
                <td className="py-2 pr-4">📸 Memory Companion</td>
                <td className="py-2 pr-4 font-mono text-xs">7 AM UTC</td>
                <td className="py-2 pr-4"><code className="bg-blue-100 px-1 rounded">memory_highlight</code></td>
                <td className="py-2">Template + data</td>
              </tr>
              <tr className="border-b border-blue-100">
                <td className="py-2 pr-4">🔮 Life Forecaster</td>
                <td className="py-2 pr-4 font-mono text-xs">6 AM UTC</td>
                <td className="py-2 pr-4"><code className="bg-blue-100 px-1 rounded">pattern_prediction</code></td>
                <td className="py-2">Template + stats</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">🔔 Proactive Suggestions</td>
                <td className="py-2 pr-4 font-mono text-xs">Every 60 min</td>
                <td className="py-2 pr-4"><span className="text-orange-600">Push notifications</span></td>
                <td className="py-2">Life Forecaster</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Post Type Overlap Note */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h4 className="font-semibold text-purple-900 mb-2">Overlap with Life Feed Tab</h4>
        <div className="text-sm text-purple-800 space-y-2">
          <p>The same post types can be generated by <strong>two sources</strong>:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div className="bg-purple-100/50 p-3 rounded">
              <p className="font-medium mb-1">📰 Life Feed Generator (Path 1)</p>
              <ul className="text-xs space-y-1">
                <li>Uses GPT with prompts from lifeFeed.yaml</li>
                <li>Narrative, AI-written content</li>
                <li>Runs 3x daily (8, 14, 20 UTC)</li>
              </ul>
            </div>
            <div className="bg-purple-100/50 p-3 rounded">
              <p className="font-medium mb-1">🤖 AI Features (Path 2)</p>
              <ul className="text-xs space-y-1">
                <li>Uses templates + analyzed data</li>
                <li>Data-driven, structured content</li>
                <li>Each feature has own schedule</li>
              </ul>
            </div>
          </div>
          <p className="text-xs text-purple-600 mt-2">Both paths write to the same <code className="bg-purple-100 px-1 rounded">lifeFeedPosts</code> collection.</p>
        </div>
      </div>

      {/* Fun Facts Section */}
      <AccordionSection
        id="fun-facts"
        title="Fun Facts"
        icon="🎯"
        description="Carousel: RAG+GPT • Notifications: Template-based"
        enabled={funFactsConfig?.enabled}
        expanded={expandedSection === 'fun-facts'}
        onToggle={() => toggleSection('fun-facts')}
        color="green"
      >
        <FunFactsContent
          config={funFactsConfig}
          loading={funFactsLoading}
          error={funFactsError}
          saving={saving}
          setSaving={setSaving}
          onRefresh={fetchFunFacts}
        />
      </AccordionSection>

      {/* Mood Compass Section */}
      <AccordionSection
        id="mood-compass"
        title="Mood Compass"
        icon="🧭"
        description="2 AM UTC daily • Creates reflective_insight posts"
        enabled={moodCompassConfig?.enabled}
        expanded={expandedSection === 'mood-compass'}
        onToggle={() => toggleSection('mood-compass')}
        color="purple"
      >
        <MoodCompassContent
          config={moodCompassConfig}
          loading={moodCompassLoading}
          error={moodCompassError}
          saving={saving}
          setSaving={setSaving}
          onRefresh={fetchMoodCompass}
        />
      </AccordionSection>

      {/* Memory Companion Section */}
      <AccordionSection
        id="memory-companion"
        title="Memory Companion"
        icon="📸"
        description="7 AM UTC daily • Creates memory posts"
        enabled={memoryCompanionConfig?.enabled}
        expanded={expandedSection === 'memory-companion'}
        onToggle={() => toggleSection('memory-companion')}
        color="pink"
      >
        <MemoryCompanionContent
          config={memoryCompanionConfig}
          loading={memoryCompanionLoading}
          error={memoryCompanionError}
          saving={saving}
          setSaving={setSaving}
          onRefresh={fetchMemoryCompanion}
        />
      </AccordionSection>

      {/* Life Forecaster Section */}
      <AccordionSection
        id="life-forecaster"
        title="Life Forecaster"
        icon="🔮"
        description="6 AM UTC daily • Posts + hourly notifications"
        enabled={lifeForecasterConfig?.enabled}
        expanded={expandedSection === 'life-forecaster'}
        onToggle={() => toggleSection('life-forecaster')}
        color="indigo"
      >
        <LifeForecasterContent
          config={lifeForecasterConfig}
          loading={lifeForecasterLoading}
          error={lifeForecasterError}
          saving={saving}
          setSaving={setSaving}
          onRefresh={fetchLifeForecaster}
        />
      </AccordionSection>
    </div>
  );
}

// Accordion Section Wrapper Component
interface AccordionSectionProps {
  id: string;
  title: string;
  icon: string;
  description: string;
  enabled?: boolean;
  expanded: boolean;
  onToggle: () => void;
  color: 'green' | 'purple' | 'pink' | 'indigo';
  children: React.ReactNode;
}

function AccordionSection({ title, icon, description, enabled, expanded, onToggle, color, children }: AccordionSectionProps) {
  const colorClasses = {
    green: 'border-green-200 bg-green-50',
    purple: 'border-purple-200 bg-purple-50',
    pink: 'border-pink-200 bg-pink-50',
    indigo: 'border-indigo-200 bg-indigo-50',
  };

  const enabledBgClass = enabled ? colorClasses[color] : 'border-gray-200 bg-gray-50';

  return (
    <div className={`rounded-lg border ${expanded ? 'border-gray-300' : enabledBgClass}`}>
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-lg"
      >
        <div className="flex items-center">
          <span className="text-2xl mr-3">{icon}</span>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">{title}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${enabled ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                {enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && <div className="px-6 pb-6 pt-2 border-t border-gray-200">{children}</div>}
    </div>
  );
}

// ============================================================================
// FUN FACTS CONTENT
// ============================================================================
interface FunFactsContentProps {
  config: FunFactsConfig | null;
  loading: boolean;
  error: string | null;
  saving: boolean;
  setSaving: (saving: boolean) => void;
  onRefresh: () => void;
}

function FunFactsContent({ config, loading, error, saving, setSaving, onRefresh }: FunFactsContentProps) {
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} onRetry={onRefresh} />;
  if (!config) return null;

  const handleToggleEnabled = async () => {
    try {
      setSaving(true);
      await apiPut('/api/admin/insights/fun-facts', { enabled: !config.enabled });
      await onRefresh();
    } catch (err: any) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTemplate = async (templateKey: keyof FunFactsConfig['enabledTemplates']) => {
    try {
      setSaving(true);
      await apiPut('/api/admin/insights/fun-facts', {
        enabledTemplates: { [templateKey]: !config.enabledTemplates[templateKey] },
      });
      await onRefresh();
    } catch (err: any) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSettings = async (updates: Partial<FunFactsConfig>) => {
    try {
      setSaving(true);
      await apiPut('/api/admin/insights/fun-facts', { updates });
      await onRefresh();
    } catch (err: any) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset Fun Facts settings to defaults?')) return;
    try {
      setSaving(true);
      await apiPut('/api/admin/insights/fun-facts', { reset: true });
      await onRefresh();
    } catch (err: any) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const templateLabels: Record<string, { title: string; description: string; icon: string }> = {
    stepMilestones: { title: 'Step Milestones', description: 'Walking/step achievements', icon: '👟' },
    locationMilestones: { title: 'Location Milestones', description: 'Places visited', icon: '📍' },
    activityMilestones: { title: 'Activity Milestones', description: 'Activity achievements', icon: '🏃' },
    sleepFacts: { title: 'Sleep Facts', description: 'Sleep patterns & insights', icon: '😴' },
    workoutFacts: { title: 'Workout Facts', description: 'Exercise achievements', icon: '💪' },
    comparisonFacts: { title: 'Comparison Facts', description: 'Period comparisons', icon: '📊' },
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleToggleEnabled}
          disabled={saving}
          className={`px-4 py-2 rounded-md transition-colors disabled:opacity-50 ${
            config.enabled ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {config.enabled ? 'Disable' : 'Enable'} Fun Facts
        </button>
        <button onClick={handleReset} disabled={saving} className="text-sm text-gray-500 hover:text-gray-700">
          Reset to Defaults
        </button>
      </div>

      {/* How It Works - Detailed Explanation */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-3">💡 How Fun Facts Work</h4>
        <div className="text-sm text-blue-800 space-y-4">
          {/* Scheduler - Notifications */}
          <div className="bg-white/60 rounded p-3">
            <p className="font-semibold text-blue-900 mb-1">📬 Scheduler → Push Notifications</p>
            <ul className="text-xs space-y-1 ml-4 list-disc">
              <li>Runs <strong>hourly</strong>, sends at user&apos;s preferred notification time</li>
              <li>Uses <strong>templates</strong> below (stepMilestones, sleepFacts, etc.)</li>
              <li className="text-green-700">✅ Respects <strong>Cooldown Hours</strong> and <strong>Max Facts/Day</strong></li>
              <li>Saves facts to Firestore <code className="bg-blue-100 px-1 rounded">fun_facts</code> collection</li>
            </ul>
          </div>

          {/* Carousel - Home Screen */}
          <div className="bg-white/60 rounded p-3">
            <p className="font-semibold text-blue-900 mb-1">🎠 Carousel → Home Screen</p>
            <ul className="text-xs space-y-1 ml-4 list-disc">
              <li>Generates facts <strong>on app open</strong> using RAG + GPT</li>
              <li>Has <strong>4-hour cache</strong> to reduce API calls</li>
              <li className="text-orange-700">⚠️ Does NOT use templates above (uses AI prompts)</li>
              <li className="text-orange-700">⚠️ Does NOT respect Cooldown/Max settings</li>
              <li>Falls back to Firestore facts if RAG fails</li>
            </ul>
            <a
              href="/admin/prompts?service=CarouselInsights"
              className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              <span>📝</span> Edit Carousel Prompts →
            </a>
          </div>

          {/* Refresh Button */}
          <div className="bg-white/60 rounded p-3">
            <p className="font-semibold text-blue-900 mb-1">🔄 Refresh Button → Per-fact Regeneration</p>
            <ul className="text-xs space-y-1 ml-4 list-disc">
              <li>Uses RAG + GPT to regenerate <strong>one fact</strong> at a time</li>
              <li className="text-orange-700">⚠️ Does NOT respect Cooldown/Max settings</li>
              <li>Limited only by user&apos;s <strong>free tier quota</strong></li>
              <li>Updates cached facts locally</li>
            </ul>
          </div>

          {/* Test Notification */}
          <div className="bg-white/60 rounded p-3">
            <p className="font-semibold text-blue-900 mb-1">🧪 Testing Notifications</p>
            <p className="text-xs text-blue-700 mb-2">
              Use the <code className="bg-blue-100 px-1 rounded">testFunFactNotification</code> Cloud Function to test push notifications:
            </p>
            <div className="bg-gray-800 text-green-400 text-xs p-2 rounded font-mono overflow-x-auto">
              <p className="text-gray-400"># In firebase functions directory:</p>
              <p>cd PersonalAIApp/firebase/functions</p>
              <p>firebase functions:shell</p>
              <p className="mt-2 text-gray-400"># Then run:</p>
              <p>testFunFactNotification({'{'}&quot;data&quot;: {'{'}&quot;userId&quot;: &quot;USER_ID&quot;{'}'}{'}'});</p>
            </div>
            <ul className="text-xs space-y-1 ml-4 list-disc mt-2">
              <li>Bypasses all time/cooldown checks</li>
              <li>Shows diagnostic info (FCM token, timezone, notification prefs)</li>
              <li>Generates and sends a fun fact notification immediately</li>
              <li className="text-green-700">✅ Great for debugging notification issues</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Settings Apply To Info */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
        <p className="text-sm text-yellow-800">
          <strong>⚠️ Note:</strong> The settings below (Max Facts/Day, Cooldown, Templates) only apply to
          <strong> scheduled push notifications</strong>. The carousel and refresh button use AI and are not limited by these settings.
        </p>
      </div>

      {/* Global Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Max Facts Per Day</label>
          <input
            type="number"
            min="1"
            max="20"
            value={config.maxFactsPerDay}
            onChange={(e) => handleUpdateSettings({ maxFactsPerDay: Number(e.target.value) })}
            disabled={saving}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cooldown (hours)</label>
          <input
            type="number"
            min="1"
            max="168"
            value={config.cooldownHours}
            onChange={(e) => handleUpdateSettings({ cooldownHours: Number(e.target.value) })}
            disabled={saving}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
        </div>
      </div>

      {/* Data Lookback Settings */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">Data Lookback Periods</h4>
        <p className="text-xs text-gray-500 mb-3">How far back to analyze user data when generating fun facts</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Health Data (days)</label>
            <input
              type="number"
              min="7"
              max="365"
              value={config.lookbackDays?.healthData ?? 90}
              onChange={(e) => handleUpdateSettings({
                lookbackDays: {
                  ...config.lookbackDays,
                  healthData: Number(e.target.value)
                }
              })}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <p className="text-xs text-gray-400 mt-1">Steps, sleep, heart rate</p>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Activity Data (days)</label>
            <input
              type="number"
              min="7"
              max="365"
              value={config.lookbackDays?.activityData ?? 90}
              onChange={(e) => handleUpdateSettings({
                lookbackDays: {
                  ...config.lookbackDays,
                  activityData: Number(e.target.value)
                }
              })}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <p className="text-xs text-gray-400 mt-1">Location + activities</p>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Recent Window (days)</label>
            <input
              type="number"
              min="1"
              max="30"
              value={config.lookbackDays?.recentWindow ?? 7}
              onChange={(e) => handleUpdateSettings({
                lookbackDays: {
                  ...config.lookbackDays,
                  recentWindow: Number(e.target.value)
                }
              })}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <p className="text-xs text-gray-400 mt-1">&quot;This week&quot; comparisons</p>
          </div>
        </div>
      </div>

      {/* Cache Settings */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">Cache Settings</h4>
        <p className="text-xs text-gray-500 mb-3">Controls how long carousel fun facts and prompts are cached on mobile devices</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Carousel Cache (hours)</label>
            <input
              type="number"
              min="1"
              max="24"
              value={config.cache?.carouselTTLHours ?? 4}
              onChange={(e) => handleUpdateSettings({
                cache: {
                  ...config.cache,
                  carouselTTLHours: Number(e.target.value)
                }
              })}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <p className="text-xs text-gray-400 mt-1">How long to cache carousel facts before regenerating</p>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Prompt Cache (minutes)</label>
            <input
              type="number"
              min="5"
              max="1440"
              value={config.cache?.promptTTLMinutes ?? 60}
              onChange={(e) => handleUpdateSettings({
                cache: {
                  ...config.cache,
                  promptTTLMinutes: Number(e.target.value)
                }
              })}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <p className="text-xs text-gray-400 mt-1">How long to cache prompts from admin API</p>
          </div>
        </div>
      </div>

      {/* Template Source Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <h4 className="font-medium text-gray-700 text-sm mb-2">📁 Template Source</h4>
        <p className="text-xs text-gray-600 mb-2">
          Push notification fun facts use <strong>template-based generation</strong> (not AI prompts).
          Templates are defined in the FunFactGenerator service.
        </p>
        <code className="text-xs bg-gray-200 px-2 py-1 rounded block overflow-x-auto">
          PersonalAIApp/firebase/functions/src/services/FunFactGenerator.ts
        </code>
        <p className="text-xs text-gray-500 mt-2">
          Template keys: <code className="bg-gray-200 px-1 rounded">funfacts:milestone_steps</code>,
          <code className="bg-gray-200 px-1 rounded">funfacts:steps_increased</code>, etc.
        </p>
      </div>

      {/* Template Toggles */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">Enabled Templates</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(config.enabledTemplates).map(([key, enabled]) => {
            const info = templateLabels[key] || { title: key, description: '', icon: '📝' };
            return (
              <ToggleCard
                key={key}
                icon={info.icon}
                title={info.title}
                description={info.description}
                enabled={enabled}
                onToggle={() => handleToggleTemplate(key as keyof FunFactsConfig['enabledTemplates'])}
                saving={saving}
                color="green"
              />
            );
          })}
        </div>
      </div>

      {/* Milestone Thresholds */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">Milestone Thresholds</h4>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Step Milestones (comma-separated)</label>
            <input
              type="text"
              value={config.stepMilestones.join(', ')}
              onChange={(e) => {
                const values = e.target.value.split(',').map((v) => parseInt(v.trim())).filter((v) => !isNaN(v));
                if (values.length > 0) handleUpdateSettings({ stepMilestones: values });
              }}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Location Milestones</label>
            <input
              type="text"
              value={config.locationMilestones.join(', ')}
              onChange={(e) => {
                const values = e.target.value.split(',').map((v) => parseInt(v.trim())).filter((v) => !isNaN(v));
                if (values.length > 0) handleUpdateSettings({ locationMilestones: values });
              }}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Activity Milestones</label>
            <input
              type="text"
              value={config.activityMilestones.join(', ')}
              onChange={(e) => {
                const values = e.target.value.split(',').map((v) => parseInt(v.trim())).filter((v) => !isNaN(v));
                if (values.length > 0) handleUpdateSettings({ activityMilestones: values });
              }}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-sm"
            />
          </div>
        </div>
      </div>

      <VersionInfo version={config.version} lastUpdatedAt={config.lastUpdatedAt} />
    </div>
  );
}

// ============================================================================
// MOOD COMPASS CONTENT
// ============================================================================
interface MoodCompassContentProps {
  config: MoodCompassConfig | null;
  loading: boolean;
  error: string | null;
  saving: boolean;
  setSaving: (saving: boolean) => void;
  onRefresh: () => void;
}

function MoodCompassContent({ config, loading, error, saving, setSaving, onRefresh }: MoodCompassContentProps) {
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} onRetry={onRefresh} />;
  if (!config) return null;

  const handleToggleEnabled = async () => {
    try {
      setSaving(true);
      await apiPut('/api/admin/insights/mood-compass', { enabled: !config.enabled });
      await onRefresh();
    } catch (err: any) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFactor = async (factorKey: keyof MoodCompassConfig['enabledFactors']) => {
    try {
      setSaving(true);
      await apiPut('/api/admin/insights/mood-compass', {
        enabledFactors: { [factorKey]: !config.enabledFactors[factorKey] },
      });
      await onRefresh();
    } catch (err: any) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSettings = async (updates: Partial<MoodCompassConfig>) => {
    try {
      setSaving(true);
      await apiPut('/api/admin/insights/mood-compass', { updates });
      await onRefresh();
    } catch (err: any) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateAnomalyDetection = async (updates: Partial<MoodCompassConfig['anomalyDetection']>) => {
    try {
      setSaving(true);
      await apiPut('/api/admin/insights/mood-compass', { anomalyDetection: updates });
      await onRefresh();
    } catch (err: any) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset Mood Compass settings to defaults?')) return;
    try {
      setSaving(true);
      await apiPut('/api/admin/insights/mood-compass', { reset: true });
      await onRefresh();
    } catch (err: any) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const factorLabels: Record<string, { title: string; description: string; icon: string }> = {
    steps: { title: 'Steps', description: 'Daily step count', icon: '👟' },
    sleep: { title: 'Sleep', description: 'Sleep duration & quality', icon: '😴' },
    workouts: { title: 'Workouts', description: 'Exercise sessions', icon: '💪' },
    location: { title: 'Location', description: 'Places visited', icon: '📍' },
    weather: { title: 'Weather', description: 'Weather conditions', icon: '🌤️' },
    socialActivity: { title: 'Social Activity', description: 'Social interactions', icon: '👥' },
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleToggleEnabled}
          disabled={saving}
          className={`px-4 py-2 rounded-md transition-colors disabled:opacity-50 ${
            config.enabled ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {config.enabled ? 'Disable' : 'Enable'} Mood Compass
        </button>
        <button onClick={handleReset} disabled={saving} className="text-sm text-gray-500 hover:text-gray-700">
          Reset to Defaults
        </button>
      </div>

      {/* Gap Warning */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
        <div className="flex items-start">
          <span className="text-orange-500 mr-2">⚠️</span>
          <div className="text-sm text-orange-800">
            <strong>Configuration Gap:</strong> The settings below are saved to Firestore but <strong>NOT currently used</strong> by MoodCorrelationService.
            The service uses hardcoded defaults (lookback: 30 days). Fix in progress.
          </div>
        </div>
      </div>

      {/* Analysis Settings */}
      <div className="opacity-60">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Analysis Settings <span className="text-xs text-orange-600">(not wired)</span></h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Min Correlation (0-1)</label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.1"
              value={config.minCorrelation}
              onChange={(e) => handleUpdateSettings({ minCorrelation: Number(e.target.value) })}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Min Data Points</label>
            <input
              type="number"
              min="7"
              max="90"
              value={config.minDataPoints}
              onChange={(e) => handleUpdateSettings({ minDataPoints: Number(e.target.value) })}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Lookback (days)</label>
            <input
              type="number"
              min="7"
              max="365"
              value={config.lookbackDays}
              onChange={(e) => handleUpdateSettings({ lookbackDays: Number(e.target.value) })}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Correlation Factors */}
      <div className="opacity-60">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Correlation Factors <span className="text-xs text-orange-600">(not wired)</span></h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(config.enabledFactors).map(([key, enabled]) => {
            const info = factorLabels[key] || { title: key, description: '', icon: '📝' };
            return (
              <ToggleCard
                key={key}
                icon={info.icon}
                title={info.title}
                description={info.description}
                enabled={enabled}
                onToggle={() => handleToggleFactor(key as keyof MoodCompassConfig['enabledFactors'])}
                saving={saving}
                color="purple"
              />
            );
          })}
        </div>
      </div>

      {/* Anomaly Detection */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700">Anomaly Detection</h4>
          <ToggleSwitch
            enabled={config.anomalyDetection.enabled}
            onToggle={() => handleUpdateAnomalyDetection({ enabled: !config.anomalyDetection.enabled })}
            saving={saving}
            color="purple"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Z-Score Threshold</label>
            <input
              type="number"
              min="1"
              max="5"
              step="0.1"
              value={config.anomalyDetection.zScoreThreshold}
              onChange={(e) => handleUpdateAnomalyDetection({ zScoreThreshold: Number(e.target.value) })}
              disabled={saving || !config.anomalyDetection.enabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={config.anomalyDetection.notifyOnAnomaly}
              onChange={(e) => handleUpdateAnomalyDetection({ notifyOnAnomaly: e.target.checked })}
              disabled={saving || !config.anomalyDetection.enabled}
              className="h-4 w-4 text-purple-600 rounded focus:ring-purple-500 disabled:opacity-50"
            />
            <label className="ml-2 text-sm text-gray-700">Notify on anomaly</label>
          </div>
        </div>
      </div>

      {/* Display Settings */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">Display Settings</h4>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={config.showCorrelationScore}
              onChange={(e) => handleUpdateSettings({ showCorrelationScore: e.target.checked })}
              disabled={saving}
              className="h-4 w-4 text-purple-600 rounded focus:ring-purple-500 disabled:opacity-50"
            />
            <span className="ml-2 text-sm text-gray-700">Show correlation score to users</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={config.showTrendChart}
              onChange={(e) => handleUpdateSettings({ showTrendChart: e.target.checked })}
              disabled={saving}
              className="h-4 w-4 text-purple-600 rounded focus:ring-purple-500 disabled:opacity-50"
            />
            <span className="ml-2 text-sm text-gray-700">Show trend chart to users</span>
          </label>
        </div>
      </div>

      <VersionInfo version={config.version} lastUpdatedAt={config.lastUpdatedAt} />
    </div>
  );
}

// ============================================================================
// MEMORY COMPANION CONTENT
// ============================================================================
interface MemoryCompanionContentProps {
  config: MemoryCompanionConfig | null;
  loading: boolean;
  error: string | null;
  saving: boolean;
  setSaving: (saving: boolean) => void;
  onRefresh: () => void;
}

function MemoryCompanionContent({ config, loading, error, saving, setSaving, onRefresh }: MemoryCompanionContentProps) {
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} onRetry={onRefresh} />;
  if (!config) return null;

  const handleToggleEnabled = async () => {
    try {
      setSaving(true);
      await apiPut('/api/admin/insights/memory-companion', { enabled: !config.enabled });
      await onRefresh();
    } catch (err: any) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTrigger = async (triggerKey: keyof MemoryCompanionConfig['enabledTriggers']) => {
    try {
      setSaving(true);
      await apiPut('/api/admin/insights/memory-companion', {
        enabledTriggers: { [triggerKey]: !config.enabledTriggers[triggerKey] },
      });
      await onRefresh();
    } catch (err: any) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSettings = async (updates: Partial<MemoryCompanionConfig>) => {
    try {
      setSaving(true);
      await apiPut('/api/admin/insights/memory-companion', { updates });
      await onRefresh();
    } catch (err: any) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset Memory Companion settings to defaults?')) return;
    try {
      setSaving(true);
      await apiPut('/api/admin/insights/memory-companion', { reset: true });
      await onRefresh();
    } catch (err: any) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const triggerLabels: Record<string, { title: string; description: string; icon: string }> = {
    anniversaries: { title: 'Anniversaries', description: '"1 year ago today..."', icon: '🎂' },
    locationRevisits: { title: 'Location Revisits', description: '"You\'re back at..."', icon: '📍' },
    activityMilestones: { title: 'Activity Milestones', description: '"Your 100th visit to..."', icon: '🏆' },
    seasonalMemories: { title: 'Seasonal Memories', description: '"This time last year..."', icon: '🌸' },
  };

  return (
    <div className="space-y-6">
      {/* Not Fully Implemented Warning */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
        <div className="flex items-start">
          <span className="text-yellow-500 mr-2">🚧</span>
          <div className="text-sm text-yellow-800">
            <strong>Partially Implemented:</strong> Memory Companion runs on schedule but full functionality is in development.
            Currently generates anniversary-based memory posts.
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleToggleEnabled}
          disabled={saving}
          className={`px-4 py-2 rounded-md transition-colors disabled:opacity-50 ${
            config.enabled ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {config.enabled ? 'Disable' : 'Enable'} Memory Companion
        </button>
        <button onClick={handleReset} disabled={saving} className="text-sm text-gray-500 hover:text-gray-700">
          Reset to Defaults
        </button>
      </div>

      {/* Surfacing Settings */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">Surfacing Settings</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Lookback (days)</label>
            <input
              type="number"
              min="30"
              max="1825"
              value={config.lookbackDays}
              onChange={(e) => handleUpdateSettings({ lookbackDays: Number(e.target.value) })}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Surfacing Frequency</label>
            <select
              value={config.surfacingFrequency}
              onChange={(e) => handleUpdateSettings({ surfacingFrequency: e.target.value as any })}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="smart">Smart (adaptive)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Max Memories Per Surface</label>
            <input
              type="number"
              min="1"
              max="10"
              value={config.maxMemoriesPerSurface}
              onChange={(e) => handleUpdateSettings({ maxMemoriesPerSurface: Number(e.target.value) })}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Memory Triggers */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">Memory Triggers</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(config.enabledTriggers).map(([key, enabled]) => {
            const info = triggerLabels[key] || { title: key, description: '', icon: '📝' };
            return (
              <ToggleCard
                key={key}
                icon={info.icon}
                title={info.title}
                description={info.description}
                enabled={enabled}
                onToggle={() => handleToggleTrigger(key as keyof MemoryCompanionConfig['enabledTriggers'])}
                saving={saving}
                color="pink"
              />
            );
          })}
        </div>
      </div>

      {/* Quality Settings */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">Quality Settings</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Min Relevance Score (0-1)</label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.1"
              value={config.minRelevanceScore}
              onChange={(e) => handleUpdateSettings({ minRelevanceScore: Number(e.target.value) })}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Min Memory Age (days)</label>
            <input
              type="number"
              min="1"
              max="365"
              value={config.minMemoryAge}
              onChange={(e) => handleUpdateSettings({ minMemoryAge: Number(e.target.value) })}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">Notification Settings</h4>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={config.notifyOnMemory}
              onChange={(e) => handleUpdateSettings({ notifyOnMemory: e.target.checked })}
              disabled={saving}
              className="h-4 w-4 text-pink-600 rounded focus:ring-pink-500 disabled:opacity-50"
            />
            <span className="ml-2 text-sm text-gray-700">Notify users when memories are surfaced</span>
          </label>
          {config.notifyOnMemory && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Notification Time</label>
              <input
                type="time"
                value={config.notificationTime}
                onChange={(e) => handleUpdateSettings({ notificationTime: e.target.value })}
                disabled={saving}
                className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>
          )}
        </div>
      </div>

      <VersionInfo version={config.version} lastUpdatedAt={config.lastUpdatedAt} />
    </div>
  );
}

// ============================================================================
// LIFE FORECASTER CONTENT
// ============================================================================
interface LifeForecasterContentProps {
  config: LifeForecasterConfig | null;
  loading: boolean;
  error: string | null;
  saving: boolean;
  setSaving: (saving: boolean) => void;
  onRefresh: () => void;
}

function LifeForecasterContent({ config, loading, error, saving, setSaving, onRefresh }: LifeForecasterContentProps) {
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} onRetry={onRefresh} />;
  if (!config) return null;

  const handleToggleEnabled = async () => {
    try {
      setSaving(true);
      await apiPut('/api/admin/insights/life-forecaster', { enabled: !config.enabled });
      await onRefresh();
    } catch (err: any) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSettings = async (updates: Partial<LifeForecasterConfig>) => {
    try {
      setSaving(true);
      await apiPut('/api/admin/insights/life-forecaster', { updates });
      await onRefresh();
    } catch (err: any) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleCategory = async (category: string) => {
    const currentCategories = config.enabledCategories;
    const newCategories = currentCategories.includes(category)
      ? currentCategories.filter((c) => c !== category)
      : [...currentCategories, category];

    try {
      setSaving(true);
      await apiPut('/api/admin/insights/life-forecaster', { enabledCategories: newCategories });
      await onRefresh();
    } catch (err: any) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset Life Forecaster settings to defaults?')) return;
    try {
      setSaving(true);
      await apiPut('/api/admin/insights/life-forecaster', { reset: true });
      await onRefresh();
    } catch (err: any) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const allCategories = [
    { id: 'activity', name: 'Activity', icon: '🏃', description: 'Workouts, sports, exercise' },
    { id: 'location', name: 'Location', icon: '📍', description: 'Places, visits, travel' },
    { id: 'health', name: 'Health', icon: '❤️', description: 'Sleep, vitals, wellness' },
    { id: 'social', name: 'Social', icon: '👥', description: 'Social interactions' },
    { id: 'productivity', name: 'Productivity', icon: '⚡', description: 'Work patterns' },
  ];

  return (
    <div className="space-y-6">
      {/* Info Box */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
        <div className="flex items-start">
          <span className="text-indigo-500 mr-2">ℹ️</span>
          <div className="text-sm text-indigo-800">
            <strong>Two outputs:</strong> Creates <code className="bg-indigo-100 px-1 rounded">pattern_prediction</code> posts at 6 AM UTC,
            and sends push notifications hourly via <code className="bg-indigo-100 px-1 rounded">deliverProactiveSuggestions</code>.
          </div>
        </div>
      </div>

      {/* Gap Warning */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
        <div className="flex items-start">
          <span className="text-orange-500 mr-2">⚠️</span>
          <div className="text-sm text-orange-800">
            <strong>Configuration Gap:</strong> Pattern Detection settings below are saved but <strong>NOT fully wired</strong> to PredictionService.
            The service uses some hardcoded defaults. Fix in progress.
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleToggleEnabled}
          disabled={saving}
          className={`px-4 py-2 rounded-md transition-colors disabled:opacity-50 ${
            config.enabled ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {config.enabled ? 'Disable' : 'Enable'} Life Forecaster
        </button>
        <button onClick={handleReset} disabled={saving} className="text-sm text-gray-500 hover:text-gray-700">
          Reset to Defaults
        </button>
      </div>

      {/* Pattern Detection Settings */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">Pattern Detection Settings</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Min Occurrences</label>
            <input
              type="number"
              min="2"
              max="20"
              value={config.minOccurrences}
              onChange={(e) => handleUpdateSettings({ minOccurrences: Number(e.target.value) })}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Min Confidence (0-1)</label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.1"
              value={config.minConfidence}
              onChange={(e) => handleUpdateSettings({ minConfidence: Number(e.target.value) })}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Lookback (days)</label>
            <input
              type="number"
              min="7"
              max="365"
              value={config.lookbackDays}
              onChange={(e) => handleUpdateSettings({ lookbackDays: Number(e.target.value) })}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Prediction Categories */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">Prediction Categories</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {allCategories.map((category) => {
            const enabled = config.enabledCategories.includes(category.id);
            return (
              <ToggleCard
                key={category.id}
                icon={category.icon}
                title={category.name}
                description={category.description}
                enabled={enabled}
                onToggle={() => handleToggleCategory(category.id)}
                saving={saving}
                color="indigo"
              />
            );
          })}
        </div>
      </div>

      {/* Prediction Settings */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">Prediction Settings</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Max Predictions Per Day</label>
            <input
              type="number"
              min="1"
              max="10"
              value={config.maxPredictionsPerDay}
              onChange={(e) => handleUpdateSettings({ maxPredictionsPerDay: Number(e.target.value) })}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Prediction Horizon (days)</label>
            <input
              type="number"
              min="1"
              max="30"
              value={config.predictionHorizonDays}
              onChange={(e) => handleUpdateSettings({ predictionHorizonDays: Number(e.target.value) })}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Display Settings */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">Display Settings</h4>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={config.showConfidenceScore}
              onChange={(e) => handleUpdateSettings({ showConfidenceScore: e.target.checked })}
              disabled={saving}
              className="h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500 disabled:opacity-50"
            />
            <span className="ml-2 text-sm text-gray-700">Show confidence score to users</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={config.showPatternExplanation}
              onChange={(e) => handleUpdateSettings({ showPatternExplanation: e.target.checked })}
              disabled={saving}
              className="h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500 disabled:opacity-50"
            />
            <span className="ml-2 text-sm text-gray-700">Show pattern explanation to users</span>
          </label>
        </div>
      </div>

      {/* Notification Settings */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">Notification Settings</h4>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={config.notifyOnPrediction}
              onChange={(e) => handleUpdateSettings({ notifyOnPrediction: e.target.checked })}
              disabled={saving}
              className="h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500 disabled:opacity-50"
            />
            <span className="ml-2 text-sm text-gray-700">Notify users about predictions</span>
          </label>
          {config.notifyOnPrediction && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Notification Time</label>
              <input
                type="time"
                value={config.notificationTime}
                onChange={(e) => handleUpdateSettings({ notificationTime: e.target.value })}
                disabled={saving}
                className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>
          )}
        </div>
      </div>

      <VersionInfo version={config.version} lastUpdatedAt={config.lastUpdatedAt} />
    </div>
  );
}

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}

function ErrorMessage({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <p className="text-red-600 text-sm">{error}</p>
      <button onClick={onRetry} className="mt-2 text-sm text-red-600 hover:text-red-700 underline">
        Retry
      </button>
    </div>
  );
}

interface ToggleCardProps {
  icon: string;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  saving: boolean;
  color: 'green' | 'purple' | 'pink' | 'indigo';
}

function ToggleCard({ icon, title, description, enabled, onToggle, saving, color }: ToggleCardProps) {
  const colorClasses = {
    green: { bg: 'bg-green-50', border: 'border-green-200', toggle: 'bg-green-500' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-200', toggle: 'bg-purple-500' },
    pink: { bg: 'bg-pink-50', border: 'border-pink-200', toggle: 'bg-pink-500' },
    indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', toggle: 'bg-indigo-500' },
  };

  const classes = colorClasses[color];

  return (
    <div className={`p-3 rounded-lg border ${enabled ? `${classes.border} ${classes.bg}` : 'border-gray-200 bg-gray-50'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <span className="text-lg mr-2">{icon}</span>
          <div>
            <p className="font-medium text-gray-900 text-sm">{title}</p>
            <p className="text-xs text-gray-500">{description}</p>
          </div>
        </div>
        <ToggleSwitch enabled={enabled} onToggle={onToggle} saving={saving} color={color} />
      </div>
    </div>
  );
}

interface ToggleSwitchProps {
  enabled: boolean;
  onToggle: () => void;
  saving: boolean;
  color: 'green' | 'purple' | 'pink' | 'indigo';
}

function ToggleSwitch({ enabled, onToggle, saving, color }: ToggleSwitchProps) {
  const colorClasses = {
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    pink: 'bg-pink-500',
    indigo: 'bg-indigo-500',
  };

  return (
    <button
      onClick={onToggle}
      disabled={saving}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        enabled ? colorClasses[color] : 'bg-gray-300'
      } disabled:opacity-50`}
    >
      <span
        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-5' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function VersionInfo({ version, lastUpdatedAt }: { version: string; lastUpdatedAt: string }) {
  return (
    <div className="text-xs text-gray-400 pt-2 border-t border-gray-100">
      v{version} | Updated: {new Date(lastUpdatedAt).toLocaleString()}
    </div>
  );
}
