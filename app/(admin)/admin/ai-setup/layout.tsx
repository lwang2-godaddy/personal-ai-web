'use client';

import { AdminTabs } from '@/components/admin/AdminTabs';

const AI_SETUP_TABS = [
  { id: 'providers', label: 'AI Providers', href: '/admin/ai-setup/providers', icon: '🔌' },
  { id: 'models', label: 'AI Models', href: '/admin/ai-setup/models', icon: '🤖' },
];

export default function AISetupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <AdminTabs tabs={AI_SETUP_TABS} />
      {children}
    </div>
  );
}
