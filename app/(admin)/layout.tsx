'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import AdminGuard from '@/components/admin/AdminGuard';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { useAuth } from '@/lib/hooks/useAuth';
import { getAuth, signOut } from 'firebase/auth';
import { useTrackingSession } from '@/lib/hooks/useTrackPage';

/**
 * Admin Layout
 * Slate/indigo-themed layout with collapsible sidebar navigation
 * Includes admin guard protection and behavior tracking
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // Initialize behavior tracking session
  useTrackingSession();

  const router = useRouter();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <AdminGuard>
      <div className="flex min-h-screen bg-gray-50">
        {/* Sidebar */}
        <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="bg-slate-900 text-white shadow-lg">
            <div className="px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                {/* Left side - Hamburger and Title */}
                <div className="flex items-center">
                  {/* Mobile hamburger button */}
                  <button
                    onClick={() => setSidebarOpen(true)}
                    className="p-2 rounded-md hover:bg-slate-700 transition-colors md:hidden mr-2"
                    aria-label="Open sidebar"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>

                  {/* Title */}
                  <div className="flex items-center">
                    <Image
                      src="/app-icon.png"
                      alt="Sircharge"
                      width={32}
                      height={32}
                      className="rounded-md"
                    />
                    <span className="ml-2 text-xl font-semibold">Admin Panel</span>
                  </div>
                </div>

                {/* Right side - User Info and Actions */}
                <div className="flex items-center space-x-4">
                  {/* User Info */}
                  <div className="hidden sm:block text-sm">
                    <div className="font-medium">{user?.displayName || user?.email}</div>
                    <div className="text-slate-400 text-xs">Admin</div>
                  </div>

                  {/* Sign Out Button */}
                  <button
                    onClick={handleSignOut}
                    className="px-4 py-2 rounded-md text-sm font-medium bg-slate-700 hover:bg-slate-600 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AdminGuard>
  );
}
