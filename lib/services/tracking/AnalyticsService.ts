/**
 * AnalyticsService.ts (Web)
 *
 * Singleton wrapper around Firebase Analytics for the web dashboard.
 * Only initializes in the browser (not during SSR).
 */

import { Analytics, getAnalytics, logEvent, setUserId, setUserProperties, isSupported } from 'firebase/analytics';
import { app } from '@/lib/api/firebase/config';

export class AnalyticsService {
  private static instance: AnalyticsService;
  private analytics: Analytics | null = null;
  private initialized = false;

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  private constructor() {}

  /**
   * Initialize Firebase Analytics (browser only)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (typeof window === 'undefined') return; // Skip SSR

    try {
      const supported = await isSupported();
      if (!supported) {
        console.warn('[Analytics] Firebase Analytics not supported in this environment');
        return;
      }

      this.analytics = getAnalytics(app);
      this.initialized = true;
      console.log('[Analytics] Initialized');
    } catch (error) {
      console.error('[Analytics] Failed to initialize:', error);
    }
  }

  /**
   * Set the user ID for analytics
   */
  setUserId(userId: string): void {
    if (!this.analytics) return;
    try {
      setUserId(this.analytics, userId);
    } catch (error) {
      console.warn('[Analytics] Failed to set userId:', error);
    }
  }

  /**
   * Clear user ID on logout
   */
  clearUserId(): void {
    if (!this.analytics) return;
    try {
      setUserId(this.analytics, '');
    } catch (error) {
      console.warn('[Analytics] Failed to clear userId:', error);
    }
  }

  /**
   * Log a page/screen view event
   */
  logPageView(pageName: string, pageClass?: string): void {
    if (!this.analytics) return;
    try {
      logEvent(this.analytics, 'screen_view', {
        screen_name: pageName,
        screen_class: pageClass || pageName,
      });
    } catch (error) {
      console.warn('[Analytics] Failed to log page view:', error);
    }
  }

  /**
   * Log a custom event
   */
  logEvent(eventName: string, params?: Record<string, any>): void {
    if (!this.analytics) return;
    try {
      const sanitizedName = eventName
        .replace(/[^a-zA-Z0-9_]/g, '_')
        .substring(0, 40);
      logEvent(this.analytics, sanitizedName, params);
    } catch (error) {
      console.warn('[Analytics] Failed to log event:', error);
    }
  }

  /**
   * Set user properties
   */
  setUserProperties(properties: Record<string, string>): void {
    if (!this.analytics) return;
    try {
      setUserProperties(this.analytics, properties);
    } catch (error) {
      console.warn('[Analytics] Failed to set user properties:', error);
    }
  }
}
