/**
 * Performance Monitoring TypeScript Types
 * Used by the web admin dashboard for performance metrics visualization
 */

export type PerformanceMetricType =
  | 'app_startup'
  | 'screen_transition'
  | 'scroll_fps'
  | 'component_render'
  | 'js_thread_fps'
  | 'api_response_time';

export interface PerformanceMetric {
  id: string;
  userId: string;
  timestamp: string;
  metricType: PerformanceMetricType;
  screenName?: string;
  value: number;
  metadata?: Record<string, string | number | boolean>;
  platform: 'ios' | 'android';
  sessionId?: string;
  createdAt: string;
}

// Aggregate types (stored in performanceAggregates/{YYYY-MM-DD})

export interface StartupAggregate {
  count: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
}

export interface TransitionAggregate {
  count: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
}

export interface ScrollFpsAggregate {
  count: number;
  avgFps: number;
  minFps: number;
  avgDroppedFrames: number;
}

export interface JsThreadFpsAggregate {
  count: number;
  avgFps: number;
  minFps: number;
  below30Count: number;
  below45Count: number;
}

export interface ApiLatencyAggregate {
  count: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  errorCount: number;
}

export interface SlowRenderEntry {
  componentName: string;
  screenName: string;
  count: number;
  avgDurationMs: number;
  maxDurationMs: number;
}

export interface DailyPerformanceAggregate {
  date: string;
  computedAt: string;
  startup?: StartupAggregate;
  screenTransitions: Record<string, TransitionAggregate>;
  scrollFps: Record<string, ScrollFpsAggregate>;
  jsThreadFps?: JsThreadFpsAggregate;
  apiLatency: Record<string, ApiLatencyAggregate>;
  slowRenders: SlowRenderEntry[];
  totalMetrics: number;
  uniqueUsers: number;
}

export interface PerformanceOverview {
  aggregates: DailyPerformanceAggregate[];
  rawMetrics?: PerformanceMetric[];
}
