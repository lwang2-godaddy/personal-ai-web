import { redirect } from 'next/navigation';

export default function UserContentRedirect() {
  redirect('/admin/app-config/user-content');
}
