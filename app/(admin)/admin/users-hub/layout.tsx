'use client';

import { AdminTabs } from '@/components/admin/AdminTabs';

const USERS_TABS = [
  { id: 'users', label: 'Users', href: '/admin/users-hub/users', icon: '👥' },
  { id: 'subscriptions', label: 'Subscriptions', href: '/admin/users-hub/subscriptions', icon: '💳' },
];

export default function UsersHubLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <AdminTabs tabs={USERS_TABS} />
      {children}
    </div>
  );
}
