import { redirect } from 'next/navigation';

export default function AskAIQuestionsRedirect() {
  redirect('/admin/conversations/ask-ai');
}
