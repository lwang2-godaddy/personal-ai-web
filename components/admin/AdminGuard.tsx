'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';

/**
 * AdminGuard Component
 * Protects admin routes by verifying user has admin role
 * Redirects non-admin users to dashboard
 */
export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isAuthenticated, isAdmin, isLoading } = useAuth();

  useEffect(() => {
    // Wait for auth state to load
    if (isLoading) return;

    // Redirect if not authenticated
    if (!isAuthenticated) {
      console.warn('[AdminGuard] User not authenticated, redirecting to login');
      router.push('/login');
      return;
    }

    // Redirect if not admin
    if (!isAdmin) {
      console.warn('[AdminGuard] User is not admin, redirecting to dashboard');
      router.push('/dashboard');
      return;
    }
  }, [isAuthenticated, isAdmin, isLoading, router]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // Don't render admin content if not authenticated or not admin
  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  // User is authenticated and is admin - render protected content
  return <>{children}</>;
}
