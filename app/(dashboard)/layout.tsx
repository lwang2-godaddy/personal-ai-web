'use client';

import { AuthGuard } from '@/components/auth/AuthGuard';
// import { LanguageSwitcher } from '@/components/LanguageSwitcher'; // Temporarily disabled - requires i18n middleware
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { signOutThunk } from '@/lib/store/slices/authSlice';
import { FloatingActionButton, ToastContainer } from '@/components/common';
import QuickCreateModal from '@/components/create/QuickCreateModal';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const pathname = usePathname();

  const handleSignOut = async () => {
    await dispatch(signOutThunk());
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Chat', href: '/chat' },
    { name: 'Templates', href: '/create' },
    { name: 'Search', href: '/search' },
    { name: 'Settings', href: '/settings' },
  ];

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Navigation */}
        <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                {/* Logo */}
                <div className="flex-shrink-0 flex items-center">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    SirCharge
                  </h1>
                </div>

                {/* Navigation Links */}
                <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
                  {navigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                          isActive
                            ? 'border-blue-500 text-gray-900 dark:text-white'
                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                      >
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* User menu */}
              <div className="flex items-center">
                <div className="flex items-center gap-2">
                  {/* <LanguageSwitcher /> */}
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {user?.displayName || user?.email}
                  </span>
                  <button
                    onClick={handleSignOut}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Main content */}
        <main>{children}</main>

        {/* Floating Action Button */}
        <FloatingActionButton />

        {/* Quick Create Modal */}
        <QuickCreateModal />

        {/* Toast Notifications */}
        <ToastContainer />
      </div>
    </AuthGuard>
  );
}
