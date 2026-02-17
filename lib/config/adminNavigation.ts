/**
 * Admin Navigation Configuration
 * Defines the sidebar navigation structure with collapsible groups
 */

export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

export interface NavGroup {
  id: string;
  label: string;
  icon: string;
  items: NavItem[];
}

/**
 * Standalone navigation items (always visible, not in a group)
 */
export const STANDALONE_NAV_ITEMS: NavItem[] = [
  { href: '/admin', label: 'Overview', icon: '📊' },
  { href: '/admin/alerts', label: 'Alerts', icon: '🚨' },
  { href: '/admin/features', label: 'Features', icon: '🧩' },
  { href: '/admin/release-notes', label: 'Release Notes', icon: '📋' },
];

/**
 * Grouped navigation items (collapsible)
 */
export const ADMIN_NAVIGATION: NavGroup[] = [
  {
    id: 'users',
    label: 'Users & Accounts',
    icon: '👥',
    items: [
      { href: '/admin/users', label: 'Users', icon: '👥' },
      { href: '/admin/subscriptions', label: 'Subscriptions', icon: '💳' },
      { href: '/admin/app-settings', label: 'App Settings', icon: '⚙️' },
      { href: '/admin/user-content', label: 'User Content', icon: '📋' },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: '📈',
    items: [
      { href: '/admin/usage', label: 'Usage Analytics', icon: '📈' },
      { href: '/admin/behavior', label: 'Behavior', icon: '🎯' },
      { href: '/admin/performance', label: 'Performance', icon: '⚡' },
    ],
  },
  {
    id: 'ai-config',
    label: 'AI Configuration',
    icon: '🤖',
    items: [
      { href: '/admin/ai-models', label: 'AI Models', icon: '🤖' },
      { href: '/admin/prompts', label: 'Prompts', icon: '💬' },
      { href: '/admin/insights', label: 'Insights', icon: '💡' },
      { href: '/admin/life-feed', label: 'Life Feed Viewer', icon: '📰' },
      { href: '/admin/memory-builder', label: 'Memory Builder', icon: '🧠' },
      { href: '/admin/life-keywords', label: 'Life Keywords', icon: '🔑' },
      { href: '/admin/fun-facts', label: 'Fun Facts', icon: '🎲' },
      { href: '/admin/events', label: 'Events', icon: '📅' },
      { href: '/admin/check-ins', label: 'Check-Ins', icon: '📍' },
      { href: '/admin/event-config', label: 'Event Config', icon: '⚙️' },
      { href: '/admin/vocabulary', label: 'Vocabulary', icon: '📚' },
      { href: '/admin/notifications', label: 'Notifications', icon: '🔔' },
      { href: '/admin/voice-categories', label: 'Voice Categories', icon: '🎤' },
      { href: '/admin/ask-ai-questions', label: 'Ask AI Questions', icon: '❓' },
    ],
  },
  {
    id: 'social',
    label: 'Social',
    icon: '🏆',
    items: [
      { href: '/admin/challenges', label: 'Challenges', icon: '🏆' },
      { href: '/admin/engagement', label: 'Engagement', icon: '🎮' },
    ],
  },
  {
    id: 'content',
    label: 'Content',
    icon: '📄',
    items: [
      { href: '/admin/ask-questions', label: 'Ask Questions', icon: '🔍' },
      { href: '/admin/pricing', label: 'Pricing', icon: '💰' },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: '🔧',
    items: [
      { href: '/admin/migrations', label: 'Migrations', icon: '🔄' },
      { href: '/admin/demo-data', label: 'Demo Data', icon: '🎭' },
      { href: '/admin/testing', label: 'Testing', icon: '🧪' },
      { href: '/admin/docs', label: 'Docs', icon: '📚' },
    ],
  },
];

/**
 * Bottom navigation items (shown at bottom of sidebar)
 */
export const BOTTOM_NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Back to Dashboard', icon: '←' },
];

/**
 * localStorage key for persisting open/closed group state
 */
export const ADMIN_NAV_STORAGE_KEY = 'admin-nav-open-groups';
