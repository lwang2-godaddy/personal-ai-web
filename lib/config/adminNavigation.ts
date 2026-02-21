/**
 * Admin Navigation Configuration
 * Defines the sidebar navigation structure with collapsible groups
 *
 * Updated: Feb 2026 - Combined related pages using tabs to reduce sidebar items
 * Previous: 43 items → Now: ~18 items
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
  { href: '/admin/app-store-releases', label: 'App Store Releases', icon: '🚀' },
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
      { href: '/admin/users-hub', label: 'Users', icon: '👥' },
      { href: '/admin/app-config', label: 'App Config', icon: '⚙️' },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: '📈',
    items: [
      { href: '/admin/analytics', label: 'Analytics', icon: '📈' },
    ],
  },
  {
    id: 'ai-config',
    label: 'AI Configuration',
    icon: '🤖',
    items: [
      { href: '/admin/ai-setup', label: 'AI Setup', icon: '🔌' },
      { href: '/admin/prompts', label: 'Prompts', icon: '💬' },
      { href: '/admin/ai-content', label: 'AI Content', icon: '💡' },
      { href: '/admin/conversations', label: 'Conversations', icon: '💬' },
      { href: '/admin/events-hub', label: 'Events', icon: '📅' },
      { href: '/admin/notifications-hub', label: 'Notifications', icon: '🔔' },
    ],
  },
  {
    id: 'social',
    label: 'Social',
    icon: '🏆',
    items: [
      { href: '/admin/social', label: 'Social', icon: '🏆' },
    ],
  },
  {
    id: 'content',
    label: 'Content',
    icon: '📄',
    items: [
      { href: '/admin/content', label: 'Content', icon: '📄' },
    ],
  },
  {
    id: 'non-ai-features',
    label: 'Non-AI Features',
    icon: '🎮',
    items: [
      { href: '/admin/non-ai-features', label: 'Non-AI Features', icon: '🎮' },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: '🔧',
    items: [
      { href: '/admin/migrations', label: 'Migrations', icon: '🔄' },
      { href: '/admin/testing-tools', label: 'Testing Tools', icon: '🧪' },
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
