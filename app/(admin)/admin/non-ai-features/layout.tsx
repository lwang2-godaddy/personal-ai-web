'use client';

import { AdminTabs } from '@/components/admin/AdminTabs';

const NON_AI_FEATURES_TABS = [
  { id: 'engagement', label: 'Engagement', href: '/admin/non-ai-features/engagement', icon: '🎮' },
];

export default function NonAIFeaturesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <AdminTabs tabs={NON_AI_FEATURES_TABS} />
      {children}
    </div>
  );
}
