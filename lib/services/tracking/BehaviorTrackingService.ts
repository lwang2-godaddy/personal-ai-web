/**
 * BehaviorTrackingService.ts
 *
 * Web service for tracking user behavior (page views, feature usage, sessions).
 * Uses a hybrid approach: real-time for critical events, batch for high-frequency events.
 *
 * Features:
 * - Singleton pattern for efficient resource usage
 * - Batch queue with 15-second flush interval
 * - Uses visibilitychange and beforeunload events for session management
 * - Uses navigator.sendBeacon for reliable unload tracking
 * - LocalStorage for offline queue support
 */

import { getAuth, User } from 'firebase/auth';
import {
  BehaviorEvent,
  BehaviorEventType,
  BehaviorCategory,
  BehaviorTargetType,
  BehaviorPlatform,
  BEHAVIOR_TRACKING_CONFIG,
  TRACKED_SCREENS,
  TRACKED_FEATURES,
} from '@/lib/models/BehaviorEvent';

// ============================================================================
// Types
// ============================================================================

interface QueuedEvent {
  event: Omit<BehaviorEvent, 'id' | 'createdAt'>;
  queuedAt: number;
}

interface SessionState {
  sessionId: string | null;
  startedAt: string | null;
  lastActivityAt: number;
  currentPage: string | null;
  pageEnterTime: number | null;
}

// ============================================================================
// Service Implementation
// ============================================================================

class BehaviorTrackingService {
  private static instance: BehaviorTrackingService;

  // Queue management
  private eventQueue: QueuedEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  // Session state
  private sessionState: SessionState = {
    sessionId: null,
    startedAt: null,
    lastActivityAt: Date.now(),
    currentPage: null,
    pageEnterTime: null,
  };

  // Initialization state
  private initialized = false;
  private boundHandleVisibilityChange: () => void;
  private boundHandleBeforeUnload: () => void;

  // ============================================================================
  // Singleton
  // ============================================================================

  static getInstance(): BehaviorTrackingService {
    if (typeof window === 'undefined') {
      // Return a no-op instance for SSR
      return new BehaviorTrackingService();
    }

    if (!BehaviorTrackingService.instance) {
      BehaviorTrackingService.instance = new BehaviorTrackingService();
    }
    return BehaviorTrackingService.instance;
  }

  private constructor() {
    // Bind handlers to preserve context
    this.boundHandleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.boundHandleBeforeUnload = this.handleBeforeUnload.bind(this);
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Initialize the service (call once at app startup)
   */
  async initialize(): Promise<void> {
    if (typeof window === 'undefined') return;
    if (this.initialized) return;

    try {
      // Restore session state from storage
      this.restoreSessionState();

      // Start flush timer
      this.startFlushTimer();

      // Setup event listeners
      this.setupEventListeners();

      // Load offline queue
      this.loadOfflineQueue();

      this.initialized = true;
      console.log('[BehaviorTracking] Initialized successfully');
    } catch (error) {
      console.warn('[BehaviorTracking] Failed to initialize:', error);
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    if (typeof window !== 'undefined') {
      document.removeEventListener('visibilitychange', this.boundHandleVisibilityChange);
      window.removeEventListener('beforeunload', this.boundHandleBeforeUnload);
    }

    // Flush remaining events
    this.flushQueue();
  }

  // ============================================================================
  // Public API - Page Tracking
  // ============================================================================

  /**
   * Track page view (call when page becomes visible)
   */
  trackPageView(pathname: string, metadata?: Record<string, any>): void {
    const previousPage = this.sessionState.currentPage;

    // Update session state
    this.sessionState.currentPage = pathname;
    this.sessionState.pageEnterTime = Date.now();
    this.sessionState.lastActivityAt = Date.now();

    this.queueEvent({
      eventType: 'screen_view',
      category: 'navigation',
      action: 'view',
      target: this.normalizePathname(pathname),
      targetType: 'screen',
      previousScreen: previousPage ? this.normalizePathname(previousPage) : undefined,
      metadata,
    });
  }

  /**
   * Track page exit (call when navigating away)
   */
  trackPageExit(pathname?: string): void {
    const page = pathname || this.sessionState.currentPage;
    if (!page) return;

    // Calculate time spent on page
    const timeSpentMs = this.sessionState.pageEnterTime
      ? Date.now() - this.sessionState.pageEnterTime
      : 0;

    this.queueEvent({
      eventType: 'screen_view',
      category: 'navigation',
      action: 'exit',
      target: this.normalizePathname(page),
      targetType: 'screen',
      metadata: { timeSpentMs },
    });

    // Clear current page
    if (!pathname || pathname === this.sessionState.currentPage) {
      this.sessionState.currentPage = null;
      this.sessionState.pageEnterTime = null;
    }
  }

  // ============================================================================
  // Public API - Feature Tracking
  // ============================================================================

  /**
   * Track feature usage
   */
  trackFeatureUse(
    featureName: string,
    options?: {
      category?: BehaviorCategory;
      targetType?: BehaviorTargetType;
      metadata?: Record<string, any>;
    }
  ): void {
    this.sessionState.lastActivityAt = Date.now();

    this.queueEvent({
      eventType: 'feature_use',
      category: options?.category || 'data_input',
      action: 'use',
      target: featureName,
      targetType: options?.targetType || 'button',
      metadata: options?.metadata,
    });
  }

  /**
   * Track button click
   */
  trackButtonClick(
    buttonName: string,
    category: BehaviorCategory = 'navigation',
    metadata?: Record<string, any>
  ): void {
    this.trackFeatureUse(buttonName, {
      category,
      targetType: 'button',
      metadata,
    });
  }

  /**
   * Track toggle change
   */
  trackToggle(
    toggleName: string,
    newValue: boolean,
    metadata?: Record<string, any>
  ): void {
    this.trackFeatureUse(toggleName, {
      category: 'settings',
      targetType: 'toggle',
      metadata: { ...metadata, newValue },
    });
  }

  /**
   * Track chat message sent
   */
  trackChatMessage(messageType: 'text' | 'voice', metadata?: Record<string, any>): void {
    this.trackFeatureUse(
      messageType === 'voice' ? TRACKED_FEATURES.startVoiceChat : TRACKED_FEATURES.sendChatMessage,
      {
        category: 'ai_interaction',
        targetType: 'button',
        metadata: { ...metadata, messageType },
      }
    );
  }

  // ============================================================================
  // Public API - Session Management
  // ============================================================================

  /**
   * Start a new session
   */
  async startSession(): Promise<string | null> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      console.warn('[BehaviorTracking] No user logged in, cannot start session');
      return null;
    }

    try {
      // Check if we have an active session that hasn't timed out
      if (this.sessionState.sessionId && !this.isSessionExpired()) {
        console.log('[BehaviorTracking] Resuming existing session');
        return this.sessionState.sessionId;
      }

      // Get device info
      const deviceInfo = this.getDeviceInfo();

      // Call API to start session
      const response = await this.callApi('/api/tracking/session', {
        method: 'POST',
        body: JSON.stringify({
          platform: 'web',
          ...deviceInfo,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to start session: ${response.status}`);
      }

      const data = await response.json();

      // Update local state
      this.sessionState = {
        sessionId: data.sessionId,
        startedAt: data.startedAt,
        lastActivityAt: Date.now(),
        currentPage: null,
        pageEnterTime: null,
      };

      // Persist session state
      this.persistSessionState();

      console.log('[BehaviorTracking] Session started:', data.sessionId);
      return data.sessionId;
    } catch (error) {
      console.warn('[BehaviorTracking] Failed to start session:', error);
      return null;
    }
  }

  /**
   * End current session
   */
  async endSession(): Promise<void> {
    if (!this.sessionState.sessionId) return;

    try {
      // Flush remaining events
      await this.flushQueue();

      // Use sendBeacon for reliable delivery on page unload
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const token = await this.getIdToken();
        if (token) {
          const blob = new Blob(
            [JSON.stringify({ sessionId: this.sessionState.sessionId })],
            { type: 'application/json' }
          );
          // Note: sendBeacon doesn't support auth headers, so we pass token in body
          navigator.sendBeacon('/api/tracking/session?token=' + encodeURIComponent(token), blob);
        }
      } else {
        // Fallback to regular fetch
        await this.callApi('/api/tracking/session', {
          method: 'PATCH',
          body: JSON.stringify({ sessionId: this.sessionState.sessionId }),
        });
      }

      console.log('[BehaviorTracking] Session ended:', this.sessionState.sessionId);

      // Clear session state
      this.sessionState = {
        sessionId: null,
        startedAt: null,
        lastActivityAt: Date.now(),
        currentPage: null,
        pageEnterTime: null,
      };

      this.clearSessionState();
    } catch (error) {
      console.warn('[BehaviorTracking] Failed to end session:', error);
    }
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.sessionState.sessionId;
  }

  // ============================================================================
  // Private - Event Queue Management
  // ============================================================================

  private queueEvent(event: Omit<BehaviorEvent, 'id' | 'createdAt' | 'userId' | 'timestamp' | 'platform' | 'sessionId'>): void {
    const userId = this.getCurrentUserId();
    if (!userId) {
      console.warn('[BehaviorTracking] No user logged in, skipping event');
      return;
    }

    const sessionId = this.sessionState.sessionId || 'unknown';
    const timestamp = new Date().toISOString();

    const fullEvent: Omit<BehaviorEvent, 'id' | 'createdAt'> = {
      ...event,
      userId,
      timestamp,
      platform: 'web',
      sessionId,
    };

    this.eventQueue.push({
      event: fullEvent,
      queuedAt: Date.now(),
    });

    // Flush immediately if queue is full
    if (this.eventQueue.length >= BEHAVIOR_TRACKING_CONFIG.webMaxBatchSize) {
      this.flushQueue();
    }
  }

  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      this.flushQueue();
    }, BEHAVIOR_TRACKING_CONFIG.webBatchIntervalMs);
  }

  private async flushQueue(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    try {
      const response = await this.callApi('/api/tracking/events', {
        method: 'POST',
        body: JSON.stringify({
          events: eventsToSend.map(q => q.event),
          sessionId: this.sessionState.sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to flush events: ${response.status}`);
      }

      console.log(`[BehaviorTracking] Flushed ${eventsToSend.length} events`);
    } catch (error) {
      console.warn('[BehaviorTracking] Failed to flush events:', error);
      // Re-queue failed events for retry
      this.eventQueue = [...eventsToSend, ...this.eventQueue];
      // Persist to offline storage
      this.persistOfflineQueue();
    }
  }

  // ============================================================================
  // Private - Persistence (LocalStorage)
  // ============================================================================

  private persistSessionState(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      localStorage.setItem(
        BEHAVIOR_TRACKING_CONFIG.offlineQueueKey + '_session',
        JSON.stringify(this.sessionState)
      );
    } catch (error) {
      console.warn('[BehaviorTracking] Failed to persist session state:', error);
    }
  }

  private restoreSessionState(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const stored = localStorage.getItem(BEHAVIOR_TRACKING_CONFIG.offlineQueueKey + '_session');
      if (stored) {
        const state = JSON.parse(stored);
        // Only restore if session hasn't expired
        if (state.lastActivityAt && Date.now() - state.lastActivityAt < BEHAVIOR_TRACKING_CONFIG.sessionTimeoutMs) {
          this.sessionState = state;
          console.log('[BehaviorTracking] Restored session state');
        }
      }
    } catch (error) {
      console.warn('[BehaviorTracking] Failed to restore session state:', error);
    }
  }

  private clearSessionState(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      localStorage.removeItem(BEHAVIOR_TRACKING_CONFIG.offlineQueueKey + '_session');
    } catch (error) {
      console.warn('[BehaviorTracking] Failed to clear session state:', error);
    }
  }

  private persistOfflineQueue(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      localStorage.setItem(
        BEHAVIOR_TRACKING_CONFIG.offlineQueueKey,
        JSON.stringify(this.eventQueue)
      );
    } catch (error) {
      console.warn('[BehaviorTracking] Failed to persist offline queue:', error);
    }
  }

  private loadOfflineQueue(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const stored = localStorage.getItem(BEHAVIOR_TRACKING_CONFIG.offlineQueueKey);
      if (stored) {
        const queue = JSON.parse(stored);
        this.eventQueue = [...queue, ...this.eventQueue];
        localStorage.removeItem(BEHAVIOR_TRACKING_CONFIG.offlineQueueKey);
        console.log(`[BehaviorTracking] Loaded ${queue.length} offline events`);
      }
    } catch (error) {
      console.warn('[BehaviorTracking] Failed to load offline queue:', error);
    }
  }

  // ============================================================================
  // Private - Event Listeners
  // ============================================================================

  private setupEventListeners(): void {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.boundHandleVisibilityChange);
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this.boundHandleBeforeUnload);
    }
  }

  private handleVisibilityChange(): void {
    if (document.visibilityState === 'hidden') {
      // Page is being hidden - flush events
      this.flushQueue();
      this.persistSessionState();
    } else if (document.visibilityState === 'visible') {
      // Page is visible again
      if (this.isSessionExpired()) {
        // Session expired, start new one
        this.startSession();
      } else {
        // Resume existing session
        this.sessionState.lastActivityAt = Date.now();
        this.persistSessionState();
      }
    }
  }

  private handleBeforeUnload(): void {
    // Flush remaining events using sendBeacon for reliability
    if (this.eventQueue.length > 0 && typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob(
        [JSON.stringify({
          events: this.eventQueue.map(q => q.event),
          sessionId: this.sessionState.sessionId,
        })],
        { type: 'application/json' }
      );
      navigator.sendBeacon('/api/tracking/events', blob);
    }
  }

  // ============================================================================
  // Private - Utilities
  // ============================================================================

  private getCurrentUserId(): string | null {
    if (typeof window === 'undefined') return null;

    try {
      const auth = getAuth();
      return auth.currentUser?.uid || null;
    } catch {
      return null;
    }
  }

  private async getIdToken(): Promise<string | null> {
    if (typeof window === 'undefined') return null;

    try {
      const auth = getAuth();
      if (auth.currentUser) {
        return await auth.currentUser.getIdToken();
      }
      return null;
    } catch {
      return null;
    }
  }

  private async callApi(url: string, options: RequestInit): Promise<Response> {
    const token = await this.getIdToken();

    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  }

  private isSessionExpired(): boolean {
    const timeSinceLastActivity = Date.now() - this.sessionState.lastActivityAt;
    return timeSinceLastActivity >= BEHAVIOR_TRACKING_CONFIG.sessionTimeoutMs;
  }

  private normalizePathname(pathname: string): string {
    // Remove trailing slashes and convert to a standard format
    return pathname.replace(/\/+$/, '').replace(/^\//, '') || 'home';
  }

  private getDeviceInfo(): { userAgent?: string; deviceType?: string; browser?: string; os?: string } {
    if (typeof navigator === 'undefined') return {};

    const userAgent = navigator.userAgent;
    let deviceType: 'desktop' | 'tablet' | 'mobile' = 'desktop';
    let browser = 'Unknown';
    let os = 'Unknown';

    // Detect device type
    if (/Mobi|Android/i.test(userAgent)) {
      deviceType = 'mobile';
    } else if (/Tablet|iPad/i.test(userAgent)) {
      deviceType = 'tablet';
    }

    // Detect browser
    if (userAgent.includes('Firefox')) {
      browser = 'Firefox';
    } else if (userAgent.includes('Chrome')) {
      browser = 'Chrome';
    } else if (userAgent.includes('Safari')) {
      browser = 'Safari';
    } else if (userAgent.includes('Edge')) {
      browser = 'Edge';
    }

    // Detect OS
    if (userAgent.includes('Windows')) {
      os = 'Windows';
    } else if (userAgent.includes('Mac')) {
      os = 'macOS';
    } else if (userAgent.includes('Linux')) {
      os = 'Linux';
    } else if (userAgent.includes('Android')) {
      os = 'Android';
    } else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) {
      os = 'iOS';
    }

    return { userAgent, deviceType, browser, os };
  }
}

// Export singleton instance
export const behaviorTrackingService = BehaviorTrackingService.getInstance();
export default BehaviorTrackingService;
