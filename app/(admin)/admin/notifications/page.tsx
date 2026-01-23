'use client';

import { useState } from 'react';

interface NotificationType {
  type: string;
  name: string;
  description: string;
  trigger: 'scheduled' | 'realtime' | 'firestore';
  schedule?: string;
  channel: string;
  dataFields: string[];
  cloudFunction?: string;
  userPreference?: string;
}

const NOTIFICATION_TYPES: NotificationType[] = [
  {
    type: 'daily_summary',
    name: 'Daily Summary',
    description: 'Summary of daily activities including steps, workouts, and highlights',
    trigger: 'scheduled',
    schedule: 'Daily at 8 PM UTC (adjusts to user timezone)',
    channel: 'daily_summaries',
    dataFields: ['type', 'summaryId', 'date'],
    cloudFunction: 'sendDailySummary',
    userPreference: 'notificationPreferences.dailySummary.enabled',
  },
  {
    type: 'weekly_insights',
    name: 'Weekly Insights',
    description: 'Weekly analysis of patterns, trends, and achievements',
    trigger: 'scheduled',
    schedule: 'Monday at 9 AM UTC',
    channel: 'insights',
    dataFields: ['type', 'insightId', 'weekStart', 'weekEnd'],
    cloudFunction: 'sendWeeklyInsights',
    userPreference: 'notificationPreferences.weeklyInsights.enabled',
  },
  {
    type: 'fun_fact',
    name: 'Fun Facts',
    description: 'Personalized fun facts based on user data (e.g., "You\'ve played badminton 15 times!")',
    trigger: 'scheduled',
    schedule: 'Hourly check - sends at user\'s preferred time (default 9 AM)',
    channel: 'fun_facts',
    dataFields: ['type', 'factId', 'category', 'route'],
    cloudFunction: 'sendDailyFunFact',
    userPreference: 'notificationPreferences.funFacts.enabled',
  },
  {
    type: 'achievement',
    name: 'Achievement',
    description: 'Milestone achievements (10th visit, 100 workouts, etc.)',
    trigger: 'firestore',
    schedule: 'Real-time on milestone detection',
    channel: 'insights',
    dataFields: ['type', 'achievementId', 'category', 'milestone'],
    cloudFunction: 'checkAchievements (Firestore trigger)',
    userPreference: 'notificationPreferences.achievements',
  },
  {
    type: 'event_reminder',
    name: 'Event Reminder',
    description: 'Reminders for upcoming events and calendar items',
    trigger: 'scheduled',
    schedule: 'Per-event (configurable: 15min, 1hr, 1day before)',
    channel: 'event_reminders',
    dataFields: ['type', 'eventId', 'eventTitle', 'startTime'],
    cloudFunction: 'eventNotificationScheduler',
    userPreference: 'notificationPreferences.eventReminders',
  },
  {
    type: 'pattern_reminder',
    name: 'Pattern Reminder',
    description: 'Reminders based on detected behavior patterns (e.g., "Time for your usual gym session")',
    trigger: 'scheduled',
    schedule: 'Based on detected patterns',
    channel: 'pattern_reminders',
    dataFields: ['type', 'patternId', 'activity', 'suggestedTime'],
    cloudFunction: 'schedulePatternNotifications',
    userPreference: 'notificationPreferences.locationAlerts',
  },
  {
    type: 'escalated_reminder',
    name: 'Escalated Reminder',
    description: 'Follow-up reminders for missed or snoozed events',
    trigger: 'scheduled',
    schedule: 'After initial reminder is missed',
    channel: 'important_events',
    dataFields: ['type', 'eventId', 'escalationLevel', 'originalTime'],
    cloudFunction: 'EscalationService',
    userPreference: 'notificationPreferences.escalations',
  },
  {
    type: 'event_conflict',
    name: 'Event Conflict',
    description: 'Alerts when scheduling conflicts are detected',
    trigger: 'realtime',
    schedule: 'On event creation/update',
    channel: 'important_events',
    dataFields: ['type', 'conflictId', 'event1Id', 'event2Id'],
    cloudFunction: 'ConflictDetector',
    userPreference: 'notificationPreferences.eventReminders',
  },
  {
    type: 'social',
    name: 'Social/Circle Activity',
    description: 'Notifications for circle invites, shared memories, and friend activity',
    trigger: 'realtime',
    schedule: 'On circle/social events',
    channel: 'social',
    dataFields: ['type', 'circleId', 'action', 'fromUserId'],
    cloudFunction: 'Various circle triggers',
    userPreference: 'notificationPreferences.enabled (general)',
  },
];

const ANDROID_CHANNELS = [
  { id: 'reminders', name: 'Reminders', description: 'Event and task reminders' },
  { id: 'important_events', name: 'Important Events', description: 'Urgent notifications and conflicts' },
  { id: 'daily_summaries', name: 'Daily Summaries', description: 'Daily activity summaries' },
  { id: 'insights', name: 'Insights', description: 'Weekly insights and achievements' },
  { id: 'fun_facts', name: 'Fun Facts', description: 'Personalized fun facts' },
  { id: 'pattern_reminders', name: 'Pattern Reminders', description: 'Behavior-based reminders' },
  { id: 'event_reminders', name: 'Event Reminders', description: 'Calendar event reminders' },
  { id: 'social', name: 'Social', description: 'Circle and friend activity' },
  { id: 'location', name: 'Location', description: 'Location-based notifications' },
  { id: 'health', name: 'Health', description: 'Health and fitness notifications' },
  { id: 'general', name: 'General', description: 'General notifications' },
];

export default function NotificationsPage() {
  const [selectedType, setSelectedType] = useState<NotificationType | null>(null);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Notification System</h1>
      <p className="text-gray-600 mb-8">
        Documentation of all notification types, triggers, and configuration options.
      </p>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-3xl font-bold text-blue-600">{NOTIFICATION_TYPES.length}</p>
          <p className="text-sm text-blue-800">Notification Types</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <p className="text-3xl font-bold text-green-600">{ANDROID_CHANNELS.length}</p>
          <p className="text-sm text-green-800">Android Channels</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <p className="text-3xl font-bold text-purple-600">
            {NOTIFICATION_TYPES.filter(t => t.trigger === 'scheduled').length}
          </p>
          <p className="text-sm text-purple-800">Scheduled Jobs</p>
        </div>
      </div>

      {/* System Mapping Overview */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Notification → Insights → Prompts Mapping</h2>
          <p className="text-sm text-gray-500 mt-1">
            How push notifications relate to the Insights system and AI prompts
          </p>
        </div>
        <div className="p-6">
          {/* Architecture Diagram */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6 font-mono text-sm overflow-x-auto">
            <pre className="text-gray-700">{`
┌─────────────────────────────────────────────────────────────────────────────┐
│                           NOTIFICATION SYSTEM                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐      ┌─────────────────┐      ┌──────────────────┐         │
│  │   Trigger   │ ──→  │  Cloud Function │ ──→  │ Push Notification │         │
│  │  (Schedule/ │      │ (notifications.ts)     │   (FCM/APNs)      │         │
│  │   Firestore)│      └────────┬────────┘      └──────────────────┘         │
│  └─────────────┘               │                                             │
│                                ▼                                             │
│                    ┌───────────────────────┐                                 │
│                    │    Content Source     │                                 │
│                    │  (Insights System)    │                                 │
│                    └───────────┬───────────┘                                 │
│                                │                                             │
│            ┌───────────────────┼───────────────────┐                         │
│            ▼                   ▼                   ▼                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │  Fun Facts      │  │   Life Feed     │  │  Event System   │              │
│  │  Generator      │  │   Generator     │  │  (Reminders)    │              │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘              │
│           │                    │                    │                        │
│           ▼                    ▼                    ▼                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │ AI Prompts      │  │  AI Prompts     │  │  User Events    │              │
│  │ (funFacts.*)    │  │ (lifeFeed.*)    │  │  Collection     │              │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
            `}</pre>
          </div>

          {/* Detailed Mapping Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notification</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">AI Feature</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prompts (Admin)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mobile UI</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Settings</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 text-sm">
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <code className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">fun_fact</code>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium">Fun Facts Generator</span>
                    <p className="text-xs text-gray-500">FunFactGenerator.ts</p>
                  </td>
                  <td className="px-4 py-3">
                    <a href="/admin/prompts?service=FunFactGenerator" className="text-blue-600 hover:underline">
                      funFacts.* prompts
                    </a>
                    <p className="text-xs text-gray-500">Step milestones, activity stats</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-700">Home Screen Carousel</span>
                    <p className="text-xs text-gray-500">+ Insights Feed</p>
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-xs">funFacts.enabled</code>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <code className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded">daily_summary</code>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium">Life Feed Generator</span>
                    <p className="text-xs text-gray-500">LifeFeedGenerator.ts</p>
                  </td>
                  <td className="px-4 py-3">
                    <a href="/admin/prompts?service=LifeFeedGenerator" className="text-blue-600 hover:underline">
                      lifeFeed.dailySummary
                    </a>
                    <p className="text-xs text-gray-500">Daily activity recap</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-700">Insights Feed</span>
                    <p className="text-xs text-gray-500">Post type: life_summary</p>
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-xs">dailySummary.enabled</code>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <code className="bg-green-100 text-green-800 px-2 py-0.5 rounded">weekly_insights</code>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium">Life Feed Generator</span>
                    <p className="text-xs text-gray-500">+ Insights Orchestrator</p>
                  </td>
                  <td className="px-4 py-3">
                    <a href="/admin/prompts?service=LifeFeedGenerator" className="text-blue-600 hover:underline">
                      lifeFeed.weeklyInsights
                    </a>
                    <p className="text-xs text-gray-500">Pattern analysis, trends</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-700">Insights Feed</span>
                    <p className="text-xs text-gray-500">Post type: reflective_insight</p>
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-xs">weeklyInsights.enabled</code>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <code className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded">achievement</code>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium">Achievement Detector</span>
                    <p className="text-xs text-gray-500">Firestore triggers</p>
                  </td>
                  <td className="px-4 py-3">
                    <a href="/admin/insights?tab=life-feed" className="text-blue-600 hover:underline">
                      Life Feed → Milestones
                    </a>
                    <p className="text-xs text-gray-500">Post type: milestone</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-700">Insights Feed</span>
                    <p className="text-xs text-gray-500">+ Achievement popup</p>
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-xs">achievements</code>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <code className="bg-red-100 text-red-800 px-2 py-0.5 rounded">event_reminder</code>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium">Event Scheduler</span>
                    <p className="text-xs text-gray-500">eventNotificationScheduler.ts</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-500">No AI prompts</span>
                    <p className="text-xs text-gray-500">Uses event title/time directly</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-700">Events Screen</span>
                    <p className="text-xs text-gray-500">Calendar integration</p>
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-xs">eventReminders</code>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <code className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">pattern_reminder</code>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium">Life Forecaster</span>
                    <p className="text-xs text-gray-500">PatternDetectionService.ts</p>
                  </td>
                  <td className="px-4 py-3">
                    <a href="/admin/insights?tab=ai-features" className="text-blue-600 hover:underline">
                      AI Features → Life Forecaster
                    </a>
                    <p className="text-xs text-gray-500">Pattern-based predictions</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-700">Insights Feed</span>
                    <p className="text-xs text-gray-500">Post type: pattern_prediction</p>
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-xs">locationAlerts</code>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <code className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded">escalated_reminder</code>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium">Escalation Service</span>
                    <p className="text-xs text-gray-500">EscalationService.ts</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-500">No AI prompts</span>
                    <p className="text-xs text-gray-500">Template-based messages</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-700">Events Screen</span>
                    <p className="text-xs text-gray-500">Follow-up reminders</p>
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-xs">escalations</code>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <code className="bg-pink-100 text-pink-800 px-2 py-0.5 rounded">event_conflict</code>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium">Conflict Detector</span>
                    <p className="text-xs text-gray-500">ConflictDetector.ts</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-500">No AI prompts</span>
                    <p className="text-xs text-gray-500">Conflict detection logic</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-700">Events Screen</span>
                    <p className="text-xs text-gray-500">Conflict warnings</p>
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-xs">eventReminders</code>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <code className="bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded">social</code>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium">Circle Triggers</span>
                    <p className="text-xs text-gray-500">Various Firestore triggers</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-500">No AI prompts</span>
                    <p className="text-xs text-gray-500">Social event templates</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-700">Circles Screen</span>
                    <p className="text-xs text-gray-500">Invites, shares, activity</p>
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-xs">enabled (master)</code>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Quick Links */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/admin/insights"
              className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <span className="text-2xl mr-3">💡</span>
              <div>
                <p className="font-medium text-blue-900">Insights Config</p>
                <p className="text-sm text-blue-700">Configure AI features & post types</p>
              </div>
            </a>
            <a
              href="/admin/prompts"
              className="flex items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <span className="text-2xl mr-3">💬</span>
              <div>
                <p className="font-medium text-purple-900">Prompt Editor</p>
                <p className="text-sm text-purple-700">Edit AI-generated content</p>
              </div>
            </a>
            <a
              href="/admin/behavior"
              className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              <span className="text-2xl mr-3">🎯</span>
              <div>
                <p className="font-medium text-green-900">Behavior Analytics</p>
                <p className="text-sm text-green-700">View notification engagement</p>
              </div>
            </a>
          </div>
        </div>
      </div>

      {/* Testing Section */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
        <h2 className="text-lg font-semibold text-yellow-900 mb-2">Testing Notifications</h2>
        <p className="text-sm text-yellow-800 mb-3">
          Use <code className="bg-yellow-100 px-1 rounded">testFunFactNotification</code> to test push notifications:
        </p>
        <div className="bg-gray-800 text-green-400 text-sm p-3 rounded font-mono overflow-x-auto">
          <p className="text-gray-400"># Navigate to functions directory:</p>
          <p>cd PersonalAIApp/firebase/functions</p>
          <p>firebase functions:shell</p>
          <p className="mt-2 text-gray-400"># Test notification for a user:</p>
          <p>{`testFunFactNotification({"data": {"userId": "USER_ID"}})`}</p>
        </div>
        <p className="text-xs text-yellow-700 mt-2">
          This bypasses time checks and sends immediately. Shows diagnostics for FCM token, timezone, and preferences.
        </p>
      </div>

      {/* Notification Types Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Notification Types</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trigger</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Schedule</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Channel</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {NOTIFICATION_TYPES.map((notif) => (
                <tr key={notif.type} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">{notif.type}</code>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {notif.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      notif.trigger === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                      notif.trigger === 'realtime' ? 'bg-green-100 text-green-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {notif.trigger}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {notif.schedule}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">{notif.channel}</code>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => setSelectedType(notif)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Android Channels */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Android Notification Channels</h2>
          <p className="text-sm text-gray-500 mt-1">
            Android 8.0+ requires notification channels. Users can control each channel separately in system settings.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
          {ANDROID_CHANNELS.map((channel) => (
            <div key={channel.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">{channel.name}</span>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded">{channel.id}</code>
              </div>
              <p className="text-sm text-gray-500">{channel.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* User Preferences Structure */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">User Preferences Structure</h2>
          <p className="text-sm text-gray-500 mt-1">
            Stored in Firestore at <code className="bg-gray-100 px-1 rounded">users/{'{userId}'}/notificationPreferences</code>
          </p>
        </div>
        <div className="p-6">
          <pre className="bg-gray-800 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
{`{
  "enabled": true,                    // Master switch
  "dailySummary": {
    "enabled": true,
    "time": "20:00",                  // 24-hour format
    "timezone": "America/Los_Angeles"
  },
  "weeklyInsights": {
    "enabled": true,
    "dayOfWeek": 1,                   // 0=Sunday, 1=Monday
    "time": "09:00"
  },
  "funFacts": {
    "enabled": true,
    "time": "09:00",
    "maxPerDay": 1
  },
  "achievements": true,
  "eventReminders": true,
  "escalations": true,
  "locationAlerts": true,
  "channels": {
    "reminders": true,
    "insights": true,
    // ... per-channel overrides
  }
}`}
          </pre>
        </div>
      </div>

      {/* Cloud Functions */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Cloud Functions</h2>
          <p className="text-sm text-gray-500 mt-1">
            Located in <code className="bg-gray-100 px-1 rounded">PersonalAIApp/firebase/functions/src/</code>
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div className="border-l-4 border-blue-500 pl-4">
            <p className="font-medium text-gray-900">notifications.ts</p>
            <p className="text-sm text-gray-500">sendDailySummary, sendWeeklyInsights, checkAchievements, sendDailyFunFact</p>
          </div>
          <div className="border-l-4 border-green-500 pl-4">
            <p className="font-medium text-gray-900">schedulers/eventNotificationScheduler.ts</p>
            <p className="text-sm text-gray-500">Event reminder scheduling and delivery</p>
          </div>
          <div className="border-l-4 border-purple-500 pl-4">
            <p className="font-medium text-gray-900">schedulers/patternNotificationScheduler.ts</p>
            <p className="text-sm text-gray-500">Pattern-based reminder scheduling</p>
          </div>
          <div className="border-l-4 border-orange-500 pl-4">
            <p className="font-medium text-gray-900">services/EscalationService.ts</p>
            <p className="text-sm text-gray-500">Escalated reminder handling</p>
          </div>
          <div className="border-l-4 border-red-500 pl-4">
            <p className="font-medium text-gray-900">test-fun-fact-notification.ts</p>
            <p className="text-sm text-gray-500">Testing endpoint for debugging notifications</p>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">{selectedType.name}</h3>
              <button
                onClick={() => setSelectedType(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Type</p>
                <code className="text-lg bg-gray-100 px-2 py-1 rounded">{selectedType.type}</code>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Description</p>
                <p className="text-gray-900">{selectedType.description}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Trigger</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  selectedType.trigger === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                  selectedType.trigger === 'realtime' ? 'bg-green-100 text-green-800' :
                  'bg-purple-100 text-purple-800'
                }`}>
                  {selectedType.trigger}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Schedule</p>
                <p className="text-gray-900">{selectedType.schedule}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Android Channel</p>
                <code className="bg-gray-100 px-2 py-1 rounded">{selectedType.channel}</code>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Cloud Function</p>
                <code className="bg-gray-100 px-2 py-1 rounded">{selectedType.cloudFunction}</code>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">User Preference</p>
                <code className="bg-gray-100 px-2 py-1 rounded">{selectedType.userPreference}</code>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Data Fields</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {selectedType.dataFields.map((field) => (
                    <code key={field} className="bg-gray-100 px-2 py-1 rounded text-sm">{field}</code>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
