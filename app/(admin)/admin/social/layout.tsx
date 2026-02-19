'use client';

import { AdminTabs } from '@/components/admin/AdminTabs';

const SOCIAL_TABS = [
  { id: 'challenges', label: 'Challenges', href: '/admin/social/challenges', icon: '🏆' },
];

export default function SocialLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <AdminTabs tabs={SOCIAL_TABS} />
      {children}
    </div>
  );
}
