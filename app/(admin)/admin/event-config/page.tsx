import { redirect } from 'next/navigation';

export default function EventConfigRedirect() {
  redirect('/admin/events-hub/config');
}
