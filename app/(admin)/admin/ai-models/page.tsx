import { redirect } from 'next/navigation';

export default function AdminAIModelsRedirect() {
  redirect('/admin/ai-setup/models');
}
