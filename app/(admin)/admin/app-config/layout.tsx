'use client';

import { AdminTabs } from '@/components/admin/AdminTabs';

const APP_CONFIG_TABS = [
  { id: 'settings', label: 'App Settings', href: '/admin/app-config/settings', icon: '⚙️' },
  { id: 'user-content', label: 'User Content', href: '/admin/app-config/user-content', icon: '📋' },
];

export default function AppConfigLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <AdminTabs tabs={APP_CONFIG_TABS} />
      {children}
    </div>
  );
}
