'use client';

import { AdminTabs } from '@/components/admin/AdminTabs';

const CONTENT_TABS = [
  { id: 'user-content', label: 'User Content', href: '/admin/content/user-content', icon: '📋' },
  { id: 'voice-categories', label: 'Voice Categories', href: '/admin/content/voice-categories', icon: '🎤' },
];

export default function ContentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <AdminTabs tabs={CONTENT_TABS} />
      {children}
    </div>
  );
}
