import { redirect } from 'next/navigation';

/**
 * Redirect to the new combined AI Setup page
 * Old URL: /admin/ai-providers
 * New URL: /admin/ai-setup/providers
 */
export default function AdminAIProvidersRedirect() {
  redirect('/admin/ai-setup/providers');
}
