import { redirect } from 'next/navigation';

export default function AskQuestionsRedirect() {
  redirect('/admin/content/questions');
}
