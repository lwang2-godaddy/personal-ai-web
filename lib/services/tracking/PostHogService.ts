/**
 * PostHogService.ts (Web)
 *
 * Singleton wrapper around PostHog for product analytics,
 * feature flags, and session replay on the web dashboard.
 */

import posthog, { PostHog } from 'posthog-js';

export class PostHogService {
  private static instance: PostHogService;
  private client: PostHog | null = null;
  private initialized = false;

  static getInstance(): PostHogService {
    if (!PostHogService.instance) {
      PostHogService.instance = new PostHogService();
    }
    return PostHogService.instance;
  }

  private constructor() {}

  /**
   * Initialize PostHog client (browser only)
   */
  initialize(): void {
    if (this.initialized) return;
    if (typeof window === 'undefined') return; // Skip SSR

    const apiKey = process.env.NEXT_PUBLIC_POSTHOG_API_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

    if (!apiKey) {
      console.warn('[PostHog] No API key configured, skipping initialization');
      return;
    }

    try {
      posthog.init(apiKey, {
        api_host: host || 'https://us.i.posthog.com',
        capture_pageview: false, // We handle page views manually via AnalyticsBridge
        capture_pageleave: true,
        autocapture: false, // Disable autocapture - we use explicit tracking
      });
      this.client = posthog;
      this.initialized = true;
      console.log('[PostHog] Initialized');
    } catch (error) {
      console.error('[PostHog] Failed to initialize:', error);
    }
  }

  /**
   * Get the PostHog client instance (for PostHogProvider)
   */
  getClient(): PostHog | null {
    return this.client;
  }

  /**
   * Identify the current user
   */
  identify(userId: string, properties?: Record<string, any>): void {
    try {
      this.client?.identify(userId, properties);
    } catch (error) {
      console.warn('[PostHog] Failed to identify user:', error);
    }
  }

  /**
   * Reset identity on logout
   */
  reset(): void {
    try {
      this.client?.reset();
    } catch (error) {
      console.warn('[PostHog] Failed to reset:', error);
    }
  }

  /**
   * Capture a custom event
   */
  capture(eventName: string, properties?: Record<string, any>): void {
    try {
      this.client?.capture(eventName, properties);
    } catch (error) {
      console.warn('[PostHog] Failed to capture event:', error);
    }
  }

  /**
   * Track a page view
   */
  capturePageView(pageName: string, properties?: Record<string, any>): void {
    try {
      this.client?.capture('$pageview', {
        $current_url: window.location.href,
        page_name: pageName,
        ...properties,
      });
    } catch (error) {
      console.warn('[PostHog] Failed to capture page view:', error);
    }
  }

  /**
   * Check if a feature flag is enabled
   */
  isFeatureEnabled(flagKey: string): boolean {
    try {
      return this.client?.isFeatureEnabled(flagKey) ?? false;
    } catch (error) {
      console.warn('[PostHog] Failed to check feature flag:', error);
      return false;
    }
  }

  /**
   * Shutdown the PostHog client
   */
  shutdown(): void {
    try {
      this.client = null;
      this.initialized = false;
    } catch (error) {
      console.warn('[PostHog] Failed to shutdown:', error);
    }
  }
}
