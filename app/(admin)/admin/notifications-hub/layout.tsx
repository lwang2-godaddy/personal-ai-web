'use client';

import { AdminTabs } from '@/components/admin/AdminTabs';

const NOTIFICATIONS_TABS = [
  { id: 'notifications', label: 'Notifications', href: '/admin/notifications-hub/notifications', icon: '🔔' },
  { id: 'voice-categories', label: 'Voice Categories', href: '/admin/notifications-hub/voice-categories', icon: '🎤' },
];

export default function NotificationsHubLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <AdminTabs tabs={NOTIFICATIONS_TABS} />
      {children}
    </div>
  );
}
