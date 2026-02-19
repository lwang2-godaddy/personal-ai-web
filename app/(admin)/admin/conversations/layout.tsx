'use client';

import { AdminTabs } from '@/components/admin/AdminTabs';

const CONVERSATIONS_TABS = [
  { id: 'chat-history', label: 'Chat History', href: '/admin/conversations/chat-history', icon: '💬' },
  { id: 'vocabulary', label: 'Vocabulary', href: '/admin/conversations/vocabulary', icon: '📚' },
  { id: 'ask-ai', label: 'Ask AI Questions', href: '/admin/conversations/ask-ai', icon: '❓' },
];

export default function ConversationsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <AdminTabs tabs={CONVERSATIONS_TABS} />
      {children}
    </div>
  );
}
