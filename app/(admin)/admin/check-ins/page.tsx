import { redirect } from 'next/navigation';

export default function CheckInsRedirect() {
  redirect('/admin/events-hub/check-ins');
}
