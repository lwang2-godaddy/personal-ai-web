import { redirect } from 'next/navigation';

export default function AppConfigPage() {
  redirect('/admin/app-config/settings');
}
