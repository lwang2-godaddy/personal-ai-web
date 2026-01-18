'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import AdminGuard from '@/components/admin/AdminGuard';
import { useAuth } from '@/lib/hooks/useAuth';
import { getAuth, signOut } from 'firebase/auth';

/**
 * Admin Layout
 * Red-themed layout to distinguish admin panel from regular dashboard
 * Includes navigation and admin guard protection
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  const handleSignOut = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const navLinks = [
    { href: '/admin', label: 'Overview', icon: '📊' },
    { href: '/admin/users', label: 'Users', icon: '👥' },
    { href: '/admin/subscriptions', label: 'Subscriptions', icon: '💳' },
    { href: '/admin/usage', label: 'Usage Analytics', icon: '📈' },
    { href: '/admin/pricing', label: 'Pricing', icon: '💰' },
    { href: '/admin/prompts', label: 'Prompts', icon: '💬' },
  ];

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50">
        {/* Admin Navigation Bar - Red Theme */}
        <nav className="bg-red-600 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Left side - Title and Nav Links */}
              <div className="flex items-center space-x-8">
                <div className="flex items-center">
                  <span className="text-2xl font-bold">⚙️</span>
                  <span className="ml-2 text-xl font-semibold">Admin Panel</span>
                </div>

                {/* Navigation Links */}
                <div className="hidden md:flex space-x-4">
                  {navLinks.map((link) => {
                    const isActive = pathname === link.href;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-red-700 text-white'
                            : 'text-red-100 hover:bg-red-500 hover:text-white'
                        }`}
                      >
                        <span className="mr-1">{link.icon}</span>
                        {link.label}
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Right side - User Info and Actions */}
              <div className="flex items-center space-x-4">
                {/* Back to Dashboard Link */}
                <Link
                  href="/dashboard"
                  className="px-3 py-2 rounded-md text-sm font-medium text-red-100 hover:bg-red-500 hover:text-white transition-colors"
                >
                  ← Back to Dashboard
                </Link>

                {/* User Info */}
                <div className="hidden md:block text-sm">
                  <div className="font-medium">{user?.displayName || user?.email}</div>
                  <div className="text-red-200 text-xs">Admin</div>
                </div>

                {/* Sign Out Button */}
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 rounded-md text-sm font-medium bg-red-700 hover:bg-red-800 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>

            {/* Mobile Navigation */}
            <div className="md:hidden pb-3 space-y-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`block px-3 py-2 rounded-md text-base font-medium ${
                      isActive
                        ? 'bg-red-700 text-white'
                        : 'text-red-100 hover:bg-red-500 hover:text-white'
                    }`}
                  >
                    <span className="mr-2">{link.icon}</span>
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>
    </AdminGuard>
  );
}
