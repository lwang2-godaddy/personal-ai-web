'use client';

import { AdminTabs } from '@/components/admin/AdminTabs';

const ANALYTICS_TABS = [
  { id: 'usage', label: 'Usage Analytics', href: '/admin/analytics/usage', icon: '📈' },
  { id: 'behavior', label: 'Behavior', href: '/admin/analytics/behavior', icon: '🎯' },
  { id: 'performance', label: 'Performance', href: '/admin/analytics/performance', icon: '⚡' },
  { id: 'pricing', label: 'Pricing', href: '/admin/analytics/pricing', icon: '💰' },
];

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <AdminTabs tabs={ANALYTICS_TABS} />
      {children}
    </div>
  );
}
