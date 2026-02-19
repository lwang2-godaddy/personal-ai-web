'use client';

import { AdminTabs } from '@/components/admin/AdminTabs';

const AI_CONTENT_TABS = [
  { id: 'insights', label: 'Insights', href: '/admin/ai-content/insights', icon: '💡' },
  { id: 'life-feed', label: 'Life Feed', href: '/admin/ai-content/life-feed', icon: '📰' },
  { id: 'memory-builder', label: 'Memory Builder', href: '/admin/ai-content/memory-builder', icon: '🧠' },
  { id: 'fun-facts', label: 'Fun Facts', href: '/admin/ai-content/fun-facts', icon: '🎲' },
  { id: 'keywords', label: 'Life Keywords', href: '/admin/ai-content/keywords', icon: '🔑' },
];

export default function AIContentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <AdminTabs tabs={AI_CONTENT_TABS} />
      {children}
    </div>
  );
}
