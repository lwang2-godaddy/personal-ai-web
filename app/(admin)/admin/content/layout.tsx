'use client';

import { AdminTabs } from '@/components/admin/AdminTabs';

const CONTENT_TABS = [
  { id: 'questions', label: 'Ask Questions', href: '/admin/content/questions', icon: '🔍' },
  { id: 'pricing', label: 'Pricing', href: '/admin/content/pricing', icon: '💰' },
];

export default function ContentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <AdminTabs tabs={CONTENT_TABS} />
      {children}
    </div>
  );
}
