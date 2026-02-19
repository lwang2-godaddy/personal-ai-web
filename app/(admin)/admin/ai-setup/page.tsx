import { redirect } from 'next/navigation';

export default function AISetupPage() {
  redirect('/admin/ai-setup/providers');
}
