'use client';

import { AdminTabs } from '@/components/admin/AdminTabs';

const EVENTS_TABS = [
  { id: 'events', label: 'Events', href: '/admin/events-hub/events', icon: '📅' },
  { id: 'check-ins', label: 'Check-Ins', href: '/admin/events-hub/check-ins', icon: '📍' },
  { id: 'config', label: 'Event Config', href: '/admin/events-hub/config', icon: '⚙️' },
];

export default function EventsHubLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <AdminTabs tabs={EVENTS_TABS} />
      {children}
    </div>
  );
}
