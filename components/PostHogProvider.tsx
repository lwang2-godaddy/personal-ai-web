'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { PostHogService } from '@/lib/services/tracking/PostHogService';
import { AnalyticsBridge } from '@/lib/services/tracking/AnalyticsBridge';

/**
 * PostHogPageviewTracker
 *
 * Automatically tracks page views on route changes.
 * Uses AnalyticsBridge to send to both Firebase Analytics and PostHog.
 */
function PostHogPageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname) {
      const url = searchParams?.toString()
        ? `${pathname}?${searchParams.toString()}`
        : pathname;

      AnalyticsBridge.getInstance().trackPageView(pathname, {
        url,
        referrer: document.referrer,
      });
    }
  }, [pathname, searchParams]);

  return null;
}

/**
 * PostHogProvider
 *
 * Initializes PostHog and provides automatic page view tracking.
 * Place this inside the Providers component tree.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize the analytics bridge (which initializes PostHog + Firebase Analytics)
    AnalyticsBridge.getInstance().initialize();
  }, []);

  return (
    <>
      <PostHogPageviewTracker />
      {children}
    </>
  );
}
