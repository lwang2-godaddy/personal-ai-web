import { redirect } from 'next/navigation';

export default function ChatHistoryRedirect() {
  redirect('/admin/conversations/chat-history');
}
