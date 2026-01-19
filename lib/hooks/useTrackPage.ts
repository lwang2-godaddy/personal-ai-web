/**
 * Page Tracking Hook
 * Client-side hooks for tracking page views and feature usage
 *
 * Usage:
 *   import { useTrackPage } from '@/lib/hooks/useTrackPage';
 *
 *   function DashboardPage() {
 *     useTrackPage();
 *     // or with explicit pathname
 *     useTrackPage('/custom-path');
 *
 *     return <div>...</div>;
 *   }
 */

'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { behaviorTrackingService } from '@/lib/services/tracking/BehaviorTrackingService';

/**
 * Hook to track page views for behavior analytics
 * Automatically uses the current pathname from Next.js router
 *
 * @param explicitPathname - Optional explicit pathname (overrides automatic detection)
 * @param metadata - Optional additional data to include with the tracking event
 */
export function useTrackPage(
  explicitPathname?: string,
  metadata?: Record<string, any>
): void {
  const routerPathname = usePathname();
  const pathname = explicitPathname || routerPathname;
  const hasTrackedRef = useRef(false);
  const lastPathnameRef = useRef<string | null>(null);

  useEffect(() => {
    // Skip if pathname hasn't changed
    if (pathname === lastPathnameRef.current) return;

    // Track exit from previous page
    if (lastPathnameRef.current && hasTrackedRef.current) {
      behaviorTrackingService.trackPageExit(lastPathnameRef.current);
    }

    // Track view of new page
    if (pathname) {
      behaviorTrackingService.trackPageView(pathname, metadata);
      hasTrackedRef.current = true;
      lastPathnameRef.current = pathname;
    }
  }, [pathname, metadata]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hasTrackedRef.current && lastPathnameRef.current) {
        behaviorTrackingService.trackPageExit(lastPathnameRef.current);
        hasTrackedRef.current = false;
      }
    };
  }, []);
}

/**
 * Hook to track feature usage
 * Returns methods for tracking various user interactions
 *
 * Usage:
 *   const { trackFeature, trackButton, trackToggle } = useTrackFeature();
 *
 *   <button onClick={() => trackButton('submit_form')}>Submit</button>
 */
export function useTrackFeature() {
  return {
    /**
     * Track a feature usage
     */
    trackFeature: (
      featureName: string,
      options?: {
        category?: 'navigation' | 'data_input' | 'ai_interaction' | 'settings' | 'social' | 'system';
        metadata?: Record<string, any>;
      }
    ) => {
      behaviorTrackingService.trackFeatureUse(featureName, options);
    },

    /**
     * Track a button click
     */
    trackButton: (buttonName: string, metadata?: Record<string, any>) => {
      behaviorTrackingService.trackButtonClick(buttonName, 'navigation', metadata);
    },

    /**
     * Track a toggle change
     */
    trackToggle: (toggleName: string, newValue: boolean, metadata?: Record<string, any>) => {
      behaviorTrackingService.trackToggle(toggleName, newValue, metadata);
    },

    /**
     * Track a chat message sent
     */
    trackChatMessage: (messageType: 'text' | 'voice', metadata?: Record<string, any>) => {
      behaviorTrackingService.trackChatMessage(messageType, metadata);
    },

    /**
     * Track a search
     */
    trackSearch: (query: string, resultCount?: number) => {
      behaviorTrackingService.trackFeatureUse('search', {
        category: 'navigation',
        metadata: { query, resultCount },
      });
    },

    /**
     * Track content creation
     */
    trackContentCreate: (contentType: 'note' | 'photo' | 'voice', metadata?: Record<string, any>) => {
      const featureName = contentType === 'note' ? 'create_note'
        : contentType === 'photo' ? 'upload_photo'
        : 'record_voice';

      behaviorTrackingService.trackFeatureUse(featureName, {
        category: 'data_input',
        metadata,
      });
    },
  };
}

/**
 * Hook to manage behavior tracking session
 * Call this in your root layout to automatically manage sessions
 *
 * Usage:
 *   function RootLayout({ children }) {
 *     useTrackingSession();
 *     return <>{children}</>;
 *   }
 */
export function useTrackingSession(): void {
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // Initialize the service and start session
    const initTracking = async () => {
      await behaviorTrackingService.initialize();
      await behaviorTrackingService.startSession();
    };

    initTracking();

    // End session on page unload (handled by the service's event listeners)
    // No need for explicit cleanup as the service handles beforeunload

    return () => {
      // Service handles cleanup via event listeners
    };
  }, []);
}

export default useTrackPage;
