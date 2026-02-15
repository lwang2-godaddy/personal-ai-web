/**
 * AnalyticsBridge.ts (Web)
 *
 * Dispatches analytics events to all configured providers:
 * - Firebase Analytics (page views, events, user properties)
 * - PostHog (events, page views, feature flags)
 *
 * Called from BehaviorTrackingService so existing tracking
 * hooks continue to work unchanged.
 */

import { AnalyticsService } from './AnalyticsService';
import { PostHogService } from './PostHogService';

export class AnalyticsBridge {
  private static instance: AnalyticsBridge;
  private initialized = false;

  static getInstance(): AnalyticsBridge {
    if (!AnalyticsBridge.instance) {
      AnalyticsBridge.instance = new AnalyticsBridge();
    }
    return AnalyticsBridge.instance;
  }

  private constructor() {}

  /**
   * Initialize all analytics providers
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await AnalyticsService.getInstance().initialize();
      PostHogService.getInstance().initialize();
      this.initialized = true;
      console.log('[AnalyticsBridge] All providers initialized');
    } catch (error) {
      console.error('[AnalyticsBridge] Partial initialization failure:', error);
      this.initialized = true;
    }
  }

  /**
   * Set user identity across all providers
   */
  setUserId(userId: string): void {
    AnalyticsService.getInstance().setUserId(userId);
    PostHogService.getInstance().identify(userId);
  }

  /**
   * Clear user identity across all providers (logout)
   */
  clearUserId(): void {
    AnalyticsService.getInstance().clearUserId();
    PostHogService.getInstance().reset();
  }

  /**
   * Track a page view across all providers
   */
  trackPageView(pageName: string, metadata?: Record<string, any>): void {
    AnalyticsService.getInstance().logPageView(pageName);
    PostHogService.getInstance().capturePageView(pageName, metadata);
  }

  /**
   * Track a feature use / custom event across all providers
   */
  trackEvent(eventName: string, properties?: Record<string, any>): void {
    AnalyticsService.getInstance().logEvent(eventName, properties);
    PostHogService.getInstance().capture(eventName, properties);
  }

  /**
   * Shutdown all providers
   */
  shutdown(): void {
    PostHogService.getInstance().shutdown();
  }
}
