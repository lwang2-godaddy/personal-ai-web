import { redirect } from 'next/navigation';

export default function AppSettingsRedirect() {
  redirect('/admin/app-config/settings');
}
