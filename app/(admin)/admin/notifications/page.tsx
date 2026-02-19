import { redirect } from 'next/navigation';

export default function NotificationsRedirect() {
  redirect('/admin/notifications-hub/notifications');
}
