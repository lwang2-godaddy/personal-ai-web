'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { apiGet, apiPut } from '@/lib/api/client';
import { useTrackPage } from '@/lib/hooks/useTrackPage';
import { TRACKED_SCREENS } from '@/lib/models/BehaviorEvent';

// ============================================================
// Types
// ============================================================

type FeatureStatus = 'active' | 'beta' | 'stub' | 'planned';
type FeatureCategory = 'Core' | 'AI' | 'Social' | 'Engagement' | 'UX' | 'Admin' | 'Revenue' | 'Completion';

interface Feature {
  name: string;
  category: FeatureCategory;
  status: FeatureStatus;
  screens: string[];
  description: string;
  lastUpdated?: string;
}

interface ServiceEntry {
  name: string;
  domain: string;
  reduxSlice?: string;
  firestoreCollection?: string;
  status: 'healthy' | 'degraded' | 'unknown';
}

interface ConfigLink {
  name: string;
  href: string;
  description: string;
  icon: string;
  configPath?: string;
}

// ============================================================
// Feature Registry Data
// ============================================================

const FEATURES: Feature[] = [
  // Core features
  { name: 'RAG Chatbot', category: 'Core', status: 'active', screens: ['ChatScreen'], description: 'AI chatbot powered by RAG with personal data context' },
  { name: 'Health Data Collection', category: 'Core', status: 'active', screens: ['HealthDashboardScreen'], description: 'HealthKit/Google Fit data collection and visualization' },
  { name: 'Location Tracking', category: 'Core', status: 'active', screens: ['LocationHistoryScreen'], description: 'Background location tracking with saved places' },
  { name: 'Voice Notes', category: 'Core', status: 'active', screens: ['VoiceNotesScreen'], description: 'Voice recording with Whisper transcription' },
  { name: 'Diary / Text Notes', category: 'Core', status: 'active', screens: ['DiaryScreen', 'DiaryEditorScreen'], description: 'Text diary entries and quick thoughts' },
  { name: 'Photo Memories', category: 'Core', status: 'active', screens: ['PhotoMemoriesScreen'], description: 'Photo capture with AI descriptions and location tags' },
  { name: 'Firebase Auth', category: 'Core', status: 'active', screens: ['LoginScreen'], description: 'Google Sign-In authentication via Firebase' },
  { name: 'Cloud Sync', category: 'Core', status: 'active', screens: ['All screens'], description: 'Offline-first sync via SyncManager to Firestore' },

  // AI features
  { name: 'Ask About This', category: 'AI', status: 'active', screens: ['DiaryDetail', 'VoiceNoteDetail', 'PhotoDetail', 'LocationDetail', 'HealthDashboard'], description: 'Context-aware AI queries from any data detail screen' },
  { name: 'Follow-Up Questions', category: 'AI', status: 'active', screens: ['ChatScreen'], description: 'AI-suggested follow-up questions after chat responses' },
  { name: 'Voice Conversation', category: 'AI', status: 'active', screens: ['ChatScreen'], description: 'Phone-call-style hands-free voice conversation with AI' },
  { name: 'Embedding Pipeline', category: 'AI', status: 'active', screens: ['N/A (Cloud Function)'], description: 'Converts all data types to embeddings via Cloud Functions' },
  { name: 'Premium Personalities', category: 'Revenue', status: 'active', screens: ['ChatScreen'], description: 'Multiple AI personality options for premium users' },
  { name: 'Chat Suggestions', category: 'AI', status: 'active', screens: ['ChatScreen'], description: 'AI-generated conversation starters and suggestions' },
  { name: 'Memory Builder', category: 'AI', status: 'active', screens: ['N/A (Background)'], description: 'Extracts entities and relationships from user data' },
  { name: 'Life Keywords', category: 'AI', status: 'active', screens: ['N/A (Background)'], description: 'Auto-generated keywords from user life data' },

  // Social features
  { name: 'Emoji Reactions', category: 'Social', status: 'active', screens: ['LifeFeedScreen'], description: 'React to life feed posts with emoji reactions' },
  { name: 'Circles', category: 'Social', status: 'active', screens: ['CirclesScreen', 'CircleDetailScreen'], description: 'Private groups for sharing memories with friends' },
  { name: 'Friend Invites', category: 'Social', status: 'active', screens: ['CirclesScreen'], description: 'Invite friends to join circles via link' },
  { name: 'Challenges', category: 'Social', status: 'active', screens: ['ChallengesScreen'], description: 'Group challenges with progress tracking' },

  // Engagement features
  { name: 'Life Feed', category: 'Engagement', status: 'active', screens: ['LifeFeedScreen'], description: 'AI-generated insights and posts about user life' },
  { name: 'Daily Prompts', category: 'Engagement', status: 'active', screens: ['HomeFeedScreen'], description: '30-day journey + rotating prompts with XP rewards' },
  { name: 'Achievements & XP', category: 'Engagement', status: 'active', screens: ['ProfileScreen'], description: 'Gamification with levels, XP, and achievement badges' },
  { name: 'Streaks', category: 'Engagement', status: 'active', screens: ['HomeFeedScreen', 'ProfileScreen'], description: 'Daily usage streaks with bonus XP' },
  { name: 'Check-In Suggestions', category: 'Engagement', status: 'active', screens: ['HomeFeedScreen'], description: 'Location-based check-in suggestions with notifications' },
  { name: 'Fun Facts', category: 'Engagement', status: 'active', screens: ['LifeFeedScreen'], description: 'AI-generated fun facts from personal data' },
  { name: 'Events', category: 'Engagement', status: 'active', screens: ['EventsScreen'], description: 'Auto-extracted events from user data with calendar view' },
  { name: 'Morning Briefing', category: 'Engagement', status: 'planned', screens: ['HomeFeedScreen'], description: 'Daily AI-generated briefing with weather, schedule, insights' },
  { name: 'Weekly Report', category: 'Engagement', status: 'planned', screens: ['HomeFeedScreen'], description: 'Weekly summary of activities, health, and insights' },

  // UX features
  { name: 'Skeleton Loading', category: 'UX', status: 'active', screens: ['HomeFeedScreen', 'LifeFeedScreen', 'ChatScreen'], description: 'Smooth skeleton placeholders during data loading' },
  { name: 'Haptic Feedback', category: 'UX', status: 'active', screens: ['All screens'], description: 'Tactile haptic feedback on key interactions' },
  { name: 'Data Export Polish', category: 'Completion', status: 'active', screens: ['PrivacyDataManagementScreen'], description: 'Polished data export with privacy management' },
  { name: 'Quick Thoughts', category: 'UX', status: 'active', screens: ['HomeFeedScreen'], description: 'Twitter-style quick thought capture from home feed' },
  { name: 'Conversation Threads', category: 'UX', status: 'planned', screens: ['ChatScreen'], description: 'Threaded conversations in chat for topic organization' },
  { name: 'Quick Capture', category: 'UX', status: 'planned', screens: ['HomeFeedScreen'], description: 'One-tap capture for voice, photo, and text' },
  { name: 'Predictions', category: 'AI', status: 'planned', screens: ['HomeFeedScreen'], description: 'AI predictions based on personal data patterns' },

  // Admin features
  { name: 'Admin Dashboard', category: 'Admin', status: 'active', screens: ['Web: /admin'], description: 'Web admin panel for system management' },
  { name: 'Prompt Management', category: 'Admin', status: 'active', screens: ['Web: /admin/prompts'], description: 'Manage AI prompts across 9 languages' },
  { name: 'Usage Analytics', category: 'Admin', status: 'active', screens: ['Web: /admin/usage'], description: 'System-wide usage and cost tracking' },
  { name: 'Subscription Management', category: 'Admin', status: 'active', screens: ['Web: /admin/subscriptions'], description: 'Configure subscription tiers and quotas' },
];

// ============================================================
// Service Health Map Data
// ============================================================

const SERVICES: ServiceEntry[] = [
  // Data Collection
  { name: 'HealthDataCollector', domain: 'Data Collection', reduxSlice: 'health', firestoreCollection: 'healthData', status: 'healthy' },
  { name: 'LocationTracker', domain: 'Data Collection', reduxSlice: 'location', firestoreCollection: 'locationData', status: 'healthy' },
  { name: 'VoiceRecorder', domain: 'Data Collection', firestoreCollection: 'voiceNotes', status: 'healthy' },
  { name: 'PhotoCapture', domain: 'Data Collection', firestoreCollection: 'photoMemories', status: 'healthy' },
  { name: 'TextNoteService', domain: 'Data Collection', firestoreCollection: 'textNotes', status: 'healthy' },

  // AI / RAG
  { name: 'RAGEngine', domain: 'AI / RAG', firestoreCollection: 'chatMessages', status: 'healthy' },
  { name: 'EmbeddingPipeline', domain: 'AI / RAG', firestoreCollection: 'N/A (Pinecone)', status: 'healthy' },
  { name: 'OpenAIService', domain: 'AI / RAG', status: 'healthy' },
  { name: 'PineconeService', domain: 'AI / RAG', status: 'healthy' },
  { name: 'MemoryBuilderService', domain: 'AI / RAG', firestoreCollection: 'userMemories', status: 'healthy' },

  // Social
  { name: 'CircleService', domain: 'Social', reduxSlice: 'circles', firestoreCollection: 'circles', status: 'healthy' },
  { name: 'FriendService', domain: 'Social', firestoreCollection: 'friends', status: 'healthy' },
  { name: 'ChallengeService', domain: 'Social', firestoreCollection: 'challenges', status: 'healthy' },

  // Notifications
  { name: 'NotificationService', domain: 'Notifications', firestoreCollection: 'notificationRecords', status: 'healthy' },
  { name: 'CheckInSuggestionService', domain: 'Notifications', reduxSlice: 'checkInSuggestions', firestoreCollection: 'N/A (local)', status: 'healthy' },

  // Insights
  { name: 'LifeFeedGenerator', domain: 'Insights', firestoreCollection: 'lifeFeedPosts', status: 'healthy' },
  { name: 'InsightsIntegrationService', domain: 'Insights', firestoreCollection: 'config/insightsPostTypes', status: 'healthy' },
  { name: 'FunFactsGenerator', domain: 'Insights', firestoreCollection: 'funFacts', status: 'healthy' },
  { name: 'EventExtractionService', domain: 'Insights', firestoreCollection: 'events', status: 'healthy' },

  // Sync
  { name: 'SyncManager', domain: 'Sync', status: 'healthy' },

  // Engagement
  { name: 'EngagementService', domain: 'Engagement', reduxSlice: 'engagement', firestoreCollection: 'config/engagement', status: 'healthy' },
  { name: 'AchievementService', domain: 'Engagement', firestoreCollection: 'userAchievements', status: 'healthy' },
];

// ============================================================
// Configuration Links
// ============================================================

const CONFIG_LINKS: ConfigLink[] = [
  { name: 'AI Prompts', href: '/admin/prompts', description: 'Manage AI prompts across 9 languages', icon: '💬', configPath: 'promptConfigs/{lang}/services/{service}' },
  { name: 'App Settings', href: '/admin/app-settings', description: 'Support email, docs URLs, app metadata', icon: '⚙️', configPath: 'config/appSettings' },
  { name: 'Subscriptions', href: '/admin/subscriptions', description: 'Tier quotas, features, pricing', icon: '💳', configPath: 'config/subscriptionConfig' },
  { name: 'Engagement', href: '/admin/engagement', description: 'XP values, levels, achievements, daily prompts', icon: '🎮', configPath: 'config/engagement' },
  { name: 'Notifications', href: '/admin/notifications', description: 'Push notification templates and settings', icon: '🔔', configPath: 'config/notifications' },
  { name: 'AI Models', href: '/admin/ai-models', description: 'Configure OpenAI models per service', icon: '🤖', configPath: 'config/aiModels' },
  { name: 'Insights', href: '/admin/insights', description: 'Life feed post types and insight config', icon: '💡', configPath: 'config/insightsPostTypes' },
  { name: 'Event Config', href: '/admin/event-config', description: 'Event extraction settings', icon: '📅', configPath: 'config/eventExtraction' },
  { name: 'Voice Categories', href: '/admin/voice-categories', description: 'Voice note category configuration', icon: '🎤', configPath: 'config/voiceCategories' },
  { name: 'Vocabulary', href: '/admin/vocabulary', description: 'Learned vocabulary corrections', icon: '📚', configPath: 'config/vocabulary' },
];

// ============================================================
// Default Feature Flags
// ============================================================

const DEFAULT_FEATURE_FLAGS: Record<string, { label: string; description: string }> = {
  morningBriefing: { label: 'Morning Briefing', description: 'Daily AI-generated morning briefing' },
  weeklyReport: { label: 'Weekly Report', description: 'Weekly summary report generation' },
  predictions: { label: 'Predictions', description: 'AI predictions from personal data patterns' },
  conversationThreads: { label: 'Conversation Threads', description: 'Threaded conversations in chat' },
  quickCapture: { label: 'Quick Capture', description: 'One-tap capture for voice, photo, text' },
  dataExportPolish: { label: 'Data Export Polish', description: 'Enhanced data export with privacy management' },
  hapticFeedback: { label: 'Haptic Feedback', description: 'Tactile feedback on interactions' },
  emojiReactions: { label: 'Emoji Reactions', description: 'React to life feed posts with emojis' },
  premiumPersonalities: { label: 'Premium Personalities', description: 'Multiple AI personality options' },
  askAboutThis: { label: 'Ask About This', description: 'Context-aware AI queries from detail screens' },
  followUpQuestions: { label: 'Follow-Up Questions', description: 'AI-suggested follow-up questions' },
  skeletonLoading: { label: 'Skeleton Loading', description: 'Skeleton placeholders during loading' },
  quickThoughts: { label: 'Quick Thoughts', description: 'Twitter-style quick thought capture' },
  photoMemories: { label: 'Photo Memories', description: 'Photo capture with AI descriptions' },
  voiceConversation: { label: 'Voice Conversation', description: 'Hands-free voice conversation with AI' },
  lifeFeed: { label: 'Life Feed', description: 'AI-generated insights feed' },
  memoryBuilder: { label: 'Memory Builder', description: 'Entity and relationship extraction' },
  challenges: { label: 'Challenges', description: 'Group challenges with progress tracking' },
  engagement: { label: 'Engagement System', description: 'XP, levels, achievements, streaks' },
  checkInSuggestions: { label: 'Check-In Suggestions', description: 'Location-based check-in suggestions' },
};

// ============================================================
// Status & Category Styling
// ============================================================

const STATUS_STYLES: Record<FeatureStatus, string> = {
  active: 'bg-green-100 text-green-800',
  beta: 'bg-yellow-100 text-yellow-800',
  stub: 'bg-gray-100 text-gray-600',
  planned: 'bg-blue-100 text-blue-800',
};

const CATEGORY_STYLES: Record<string, string> = {
  Core: 'bg-indigo-100 text-indigo-800',
  AI: 'bg-purple-100 text-purple-800',
  Social: 'bg-pink-100 text-pink-800',
  Engagement: 'bg-orange-100 text-orange-800',
  UX: 'bg-teal-100 text-teal-800',
  Admin: 'bg-slate-100 text-slate-800',
  Revenue: 'bg-emerald-100 text-emerald-800',
  Completion: 'bg-cyan-100 text-cyan-800',
};

const SERVICE_DOMAIN_STYLES: Record<string, string> = {
  'Data Collection': 'bg-blue-50 border-blue-200',
  'AI / RAG': 'bg-purple-50 border-purple-200',
  Social: 'bg-pink-50 border-pink-200',
  Notifications: 'bg-yellow-50 border-yellow-200',
  Insights: 'bg-orange-50 border-orange-200',
  Sync: 'bg-gray-50 border-gray-200',
  Engagement: 'bg-green-50 border-green-200',
};

const SERVICE_STATUS_STYLES: Record<string, string> = {
  healthy: 'bg-green-500',
  degraded: 'bg-yellow-500',
  unknown: 'bg-gray-400',
};

// ============================================================
// Component
// ============================================================

type ActiveTab = 'features' | 'services' | 'config' | 'flags';

export default function AdminFeaturesPage() {
  useTrackPage(TRACKED_SCREENS.adminFeatures);

  // Tab state
  const [activeTab, setActiveTab] = useState<ActiveTab>('features');

  // Feature registry state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Feature flags state
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({});
  const [flagsLoading, setFlagsLoading] = useState(true);
  const [flagsSaving, setFlagsSaving] = useState(false);
  const [flagsError, setFlagsError] = useState<string | null>(null);
  const [flagsSuccess, setFlagsSuccess] = useState<string | null>(null);
  const [flagsIsDefault, setFlagsIsDefault] = useState(false);
  const [flagsLastUpdated, setFlagsLastUpdated] = useState<string | null>(null);

  // Fetch feature flags
  const fetchFeatureFlags = useCallback(async () => {
    try {
      setFlagsLoading(true);
      setFlagsError(null);
      const data = await apiGet<{
        flags: Record<string, boolean>;
        isDefault: boolean;
        lastUpdated: string | null;
      }>('/api/admin/features');
      setFeatureFlags(data.flags);
      setFlagsIsDefault(data.isDefault);
      setFlagsLastUpdated(data.lastUpdated);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load feature flags';
      setFlagsError(message);
    } finally {
      setFlagsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeatureFlags();
  }, [fetchFeatureFlags]);

  // Save feature flags
  const handleSaveFlags = async () => {
    try {
      setFlagsSaving(true);
      setFlagsError(null);
      setFlagsSuccess(null);

      const data = await apiPut<{
        flags: Record<string, boolean>;
        lastUpdated: string;
      }>('/api/admin/features', { flags: featureFlags });

      setFeatureFlags(data.flags);
      setFlagsIsDefault(false);
      setFlagsLastUpdated(data.lastUpdated);
      setFlagsSuccess('Feature flags saved successfully!');
      setTimeout(() => setFlagsSuccess(null), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save feature flags';
      setFlagsError(message);
    } finally {
      setFlagsSaving(false);
    }
  };

  // Toggle a single feature flag
  const toggleFlag = (key: string) => {
    setFeatureFlags((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Filtered features
  const filteredFeatures = useMemo(() => {
    return FEATURES.filter((feature) => {
      const matchesSearch =
        !searchQuery ||
        feature.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        feature.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        feature.screens.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = categoryFilter === 'all' || feature.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || feature.status === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [searchQuery, categoryFilter, statusFilter]);

  // Unique categories and statuses for filters
  const categories = useMemo(() => {
    const cats = new Set(FEATURES.map((f) => f.category));
    return Array.from(cats).sort();
  }, []);

  const statuses = useMemo(() => {
    const stats = new Set(FEATURES.map((f) => f.status));
    return Array.from(stats).sort();
  }, []);

  // Group services by domain
  const servicesByDomain = useMemo(() => {
    const grouped: Record<string, ServiceEntry[]> = {};
    SERVICES.forEach((service) => {
      if (!grouped[service.domain]) {
        grouped[service.domain] = [];
      }
      grouped[service.domain].push(service);
    });
    return grouped;
  }, []);

  // Summary stats
  const featureStats = useMemo(() => {
    const byStatus: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    FEATURES.forEach((f) => {
      byStatus[f.status] = (byStatus[f.status] || 0) + 1;
      byCategory[f.category] = (byCategory[f.category] || 0) + 1;
    });
    return { byStatus, byCategory, total: FEATURES.length };
  }, []);

  const TABS = [
    { id: 'features' as const, label: 'Feature Registry', icon: '📋' },
    { id: 'services' as const, label: 'Service Health', icon: '🏥' },
    { id: 'config' as const, label: 'Configuration', icon: '⚙️' },
    { id: 'flags' as const, label: 'Feature Flags', icon: '🚩' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">App Features Overview</h1>
        <p className="mt-1 text-sm text-gray-500">
          Complete registry of mobile app features, service health, configuration, and feature flags.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500">Total Features</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{featureStats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500">Active</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{featureStats.byStatus['active'] || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500">Planned</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{featureStats.byStatus['planned'] || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-500">Services</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">{SERVICES.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'features' && (
        <FeatureRegistryTab
          features={filteredFeatures}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          categories={categories}
          statuses={statuses}
          totalCount={FEATURES.length}
        />
      )}

      {activeTab === 'services' && (
        <ServiceHealthTab servicesByDomain={servicesByDomain} />
      )}

      {activeTab === 'config' && (
        <ConfigDashboardTab configLinks={CONFIG_LINKS} />
      )}

      {activeTab === 'flags' && (
        <FeatureFlagsTab
          featureFlags={featureFlags}
          flagsLoading={flagsLoading}
          flagsSaving={flagsSaving}
          flagsError={flagsError}
          flagsSuccess={flagsSuccess}
          flagsIsDefault={flagsIsDefault}
          flagsLastUpdated={flagsLastUpdated}
          onToggleFlag={toggleFlag}
          onSave={handleSaveFlags}
          onRefresh={fetchFeatureFlags}
        />
      )}
    </div>
  );
}

// ============================================================
// Section 1: Feature Registry Tab
// ============================================================

function FeatureRegistryTab({
  features,
  searchQuery,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
  statusFilter,
  onStatusFilterChange,
  categories,
  statuses,
  totalCount,
}: {
  features: Feature[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (category: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  categories: string[];
  statuses: string[];
  totalCount: number;
}) {
  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search features, screens, descriptions..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => onCategoryFilterChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Statuses</option>
            {statuses.map((status) => (
              <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>
            ))}
          </select>
        </div>

        <p className="text-xs text-gray-500 mt-2">
          Showing {features.length} of {totalCount} features
        </p>
      </div>

      {/* Feature Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-600">Feature Name</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Category</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600 hidden md:table-cell">Screens</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600 hidden lg:table-cell">Description</th>
              </tr>
            </thead>
            <tbody>
              {features.map((feature, index) => (
                <tr
                  key={feature.name}
                  className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    index % 2 === 0 ? '' : 'bg-gray-50/30'
                  }`}
                >
                  <td className="py-3 px-4 font-medium text-gray-900">
                    {feature.name}
                    <p className="text-xs text-gray-500 mt-0.5 lg:hidden">{feature.description}</p>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${CATEGORY_STYLES[feature.category] || 'bg-gray-100 text-gray-800'}`}>
                      {feature.category}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[feature.status]}`}>
                      {feature.status.charAt(0).toUpperCase() + feature.status.slice(1)}
                    </span>
                  </td>
                  <td className="py-3 px-4 hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {feature.screens.slice(0, 3).map((screen) => (
                        <span key={screen} className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                          {screen}
                        </span>
                      ))}
                      {feature.screens.length > 3 && (
                        <span className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">
                          +{feature.screens.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-500 hidden lg:table-cell max-w-xs truncate">
                    {feature.description}
                  </td>
                </tr>
              ))}
              {features.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    No features match your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Section 2: Service Health Tab
// ============================================================

function ServiceHealthTab({
  servicesByDomain,
}: {
  servicesByDomain: Record<string, ServiceEntry[]>;
}) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        All major services grouped by domain. Status indicators show service availability.
      </p>

      {Object.entries(servicesByDomain).map(([domain, services]) => (
        <div key={domain} className={`rounded-lg border p-4 ${SERVICE_DOMAIN_STYLES[domain] || 'bg-white border-gray-200'}`}>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">{domain}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {services.map((service) => (
              <div
                key={service.name}
                className="bg-white rounded-md border border-gray-200 p-3 flex items-start gap-3"
              >
                {/* Status dot */}
                <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${SERVICE_STATUS_STYLES[service.status]}`} />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{service.name}</p>

                  {service.reduxSlice && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Redux: <span className="font-mono text-gray-600">{service.reduxSlice}</span>
                    </p>
                  )}

                  {service.firestoreCollection && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Firestore: <span className="font-mono text-gray-600">{service.firestoreCollection}</span>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Section 3: Configuration Dashboard Tab
// ============================================================

function ConfigDashboardTab({
  configLinks,
}: {
  configLinks: ConfigLink[];
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Quick access to all admin configuration pages with their Firestore document paths.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {configLinks.map((config) => (
          <Link
            key={config.href}
            href={config.href}
            className="block bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md hover:border-indigo-300 transition-all"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{config.icon}</span>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900">{config.name}</h3>
                <p className="text-xs text-gray-500 mt-1">{config.description}</p>
                {config.configPath && (
                  <p className="text-xs text-gray-400 mt-2 font-mono truncate" title={config.configPath}>
                    {config.configPath}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-3 text-indigo-600 font-medium text-xs flex items-center">
              Open Configuration →
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Section 4: Feature Flags Tab
// ============================================================

function FeatureFlagsTab({
  featureFlags,
  flagsLoading,
  flagsSaving,
  flagsError,
  flagsSuccess,
  flagsIsDefault,
  flagsLastUpdated,
  onToggleFlag,
  onSave,
  onRefresh,
}: {
  featureFlags: Record<string, boolean>;
  flagsLoading: boolean;
  flagsSaving: boolean;
  flagsError: string | null;
  flagsSuccess: string | null;
  flagsIsDefault: boolean;
  flagsLastUpdated: string | null;
  onToggleFlag: (key: string) => void;
  onSave: () => void;
  onRefresh: () => void;
}) {
  if (flagsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-500 text-sm">Loading feature flags...</p>
        </div>
      </div>
    );
  }

  // Build ordered list of flags using the metadata map
  const flagEntries = Object.keys(DEFAULT_FEATURE_FLAGS).map((key) => ({
    key,
    label: DEFAULT_FEATURE_FLAGS[key].label,
    description: DEFAULT_FEATURE_FLAGS[key].description,
    enabled: featureFlags[key] ?? false,
  }));

  const enabledCount = flagEntries.filter((f) => f.enabled).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">
            Toggle feature flags to enable or disable features in the mobile app.
            Reads from Firestore <span className="font-mono text-gray-600">config/featureFlags</span>.
          </p>
          {flagsLastUpdated && (
            <p className="text-xs text-gray-400 mt-1">
              Last updated: {new Date(flagsLastUpdated).toLocaleString()}
            </p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            {enabledCount} of {flagEntries.length} flags enabled
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onRefresh}
            disabled={flagsLoading}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Refresh
          </button>
          <button
            onClick={onSave}
            disabled={flagsSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {flagsSaving ? 'Saving...' : 'Save Flags'}
          </button>
        </div>
      </div>

      {/* Status Banners */}
      {flagsIsDefault && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
          No feature flags found in Firestore. Showing default values. Click &quot;Save Flags&quot; to initialize.
        </div>
      )}

      {flagsError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
          {flagsError}
        </div>
      )}

      {flagsSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
          {flagsSuccess}
        </div>
      )}

      {/* Flags List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-100">
        {flagEntries.map((flag) => (
          <div
            key={flag.key}
            className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <div className="flex-1 min-w-0 mr-4">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-900">{flag.label}</p>
                <span className="text-xs font-mono text-gray-400">{flag.key}</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{flag.description}</p>
            </div>
            <button
              type="button"
              onClick={() => onToggleFlag(flag.key)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                flag.enabled ? 'bg-green-600' : 'bg-gray-300'
              }`}
              role="switch"
              aria-checked={flag.enabled}
              aria-label={`Toggle ${flag.label}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  flag.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
