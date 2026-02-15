import { redirect } from 'next/navigation';

export default function CostAlertsRedirect() {
  redirect('/admin/alerts');
}
