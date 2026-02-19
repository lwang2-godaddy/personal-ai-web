'use client';

import { AdminTabs } from '@/components/admin/AdminTabs';

const TESTING_TOOLS_TABS = [
  { id: 'demo-data', label: 'Demo Data', href: '/admin/testing-tools/demo-data', icon: '🎭' },
  { id: 'testing', label: 'Testing', href: '/admin/testing-tools/testing', icon: '🧪' },
  { id: 'screenshots', label: 'Screenshots', href: '/admin/testing-tools/screenshots', icon: '📸' },
];

export default function TestingToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <AdminTabs tabs={TESTING_TOOLS_TABS} />
      {children}
    </div>
  );
}
