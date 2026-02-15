/**
 * E2E Performance Test Data Definitions
 *
 * Deterministic synthetic data generators for all 6 performance metric types.
 * Uses predictable document IDs for idempotent seed/cleanup operations.
 */

import type { PerformanceMetricType } from '@/lib/models/PerformanceMetric';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const PERF_USER_IDS = ['e2e-perf-user-1', 'e2e-perf-user-2', 'e2e-perf-user-3'];

export const PERF_SCREENS = ['Home', 'Chat', 'LifeFeed', 'DiaryList', 'Settings'];

export const PERF_COMPONENTS = ['StatsFeedCard', 'DiaryFeedCard', 'PhotoFeedCard', 'VoiceNoteFeedCard', 'LifeFeedPostCard'];

export const PERF_ENDPOINTS = ['cf:queryRAG', 'cf:queryRAGStream', 'cf:generateLifeFeedNow', 'cf:generateUnifiedInsightsNow', 'cf:generateAISummary'];

export const PERF_DOC_ID_PREFIX = 'e2e-perf-';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface PerfSeedConfig {
  days: number;                   // default 7
  metricsPerUserPerDay: number;   // default 30
}

export const DEFAULT_PERF_CONFIG: PerfSeedConfig = {
  days: 7,
  metricsPerUserPerDay: 30,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Seeded pseudo-random number generator (deterministic) */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

/** Pick from array using seeded random */
function pick<T>(arr: T[], seed: number): T {
  return arr[Math.floor(seededRandom(seed) * arr.length)];
}

/** Random value in range using seeded random */
function rangeValue(min: number, max: number, seed: number): number {
  return min + seededRandom(seed) * (max - min);
}

/** Get date string N days ago from today */
function daysAgoStr(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

/** Build a deterministic doc ID */
function buildDocId(userId: string, type: string, dayOffset: number, index: number): string {
  return `${PERF_DOC_ID_PREFIX}${userId}-${type}-d${dayOffset}-${index}`;
}

// ---------------------------------------------------------------------------
// Base values per screen/component/endpoint
// ---------------------------------------------------------------------------

const SCREEN_TRANSITION_BASE: Record<string, number> = {
  Home: 120,
  Chat: 180,
  LifeFeed: 250,
  DiaryList: 160,
  Settings: 100,
};

const SCREEN_SCROLL_FPS_BASE: Record<string, number> = {
  Home: 57,
  Chat: 56,
  LifeFeed: 52,
  DiaryList: 55,
  Settings: 58,
};

const COMPONENT_RENDER_BASE: Record<string, number> = {
  StatsFeedCard: 6,
  DiaryFeedCard: 14,
  PhotoFeedCard: 16,
  VoiceNoteFeedCard: 18,
  LifeFeedPostCard: 22,
};

const ENDPOINT_LATENCY_BASE: Record<string, number> = {
  'cf:queryRAG': 800,
  'cf:queryRAGStream': 650,
  'cf:generateLifeFeedNow': 2200,
  'cf:generateUnifiedInsightsNow': 3500,
  'cf:generateAISummary': 1800,
};

// ---------------------------------------------------------------------------
// Per-type metric generators
// ---------------------------------------------------------------------------

interface RawMetric {
  id: string;
  userId: string;
  timestamp: string;
  metricType: PerformanceMetricType;
  screenName?: string;
  value: number;
  metadata?: Record<string, string | number | boolean>;
  platform: 'ios' | 'android';
  sessionId: string;
  createdAt: string;
}

function generateAppStartup(userId: string, dateStr: string, dayOffset: number, seed: number): RawMetric[] {
  const count = 2 + Math.floor(seededRandom(seed) * 2); // 2-3
  const metrics: RawMetric[] = [];

  for (let i = 0; i < count; i++) {
    const s = seed * 100 + i;
    const isMorning = i === 0;
    const isWeekend = new Date(dateStr).getDay() % 6 === 0;
    let base = 1200;
    if (isMorning) base += 300;
    if (isWeekend) base += 200;
    const value = Math.round(base + rangeValue(-400, 800, s));

    metrics.push({
      id: buildDocId(userId, 'startup', dayOffset, i),
      userId,
      timestamp: `${dateStr}T${String(8 + i * 4).padStart(2, '0')}:${String(Math.floor(seededRandom(s + 1) * 60)).padStart(2, '0')}:00.000Z`,
      metricType: 'app_startup',
      value: Math.max(800, Math.min(3000, value)),
      platform: seededRandom(s + 2) > 0.5 ? 'ios' : 'android',
      sessionId: `session-${userId}-d${dayOffset}-${i}`,
      createdAt: `${dateStr}T${String(8 + i * 4).padStart(2, '0')}:00:00.000Z`,
    });
  }
  return metrics;
}

function generateScreenTransitions(userId: string, dateStr: string, dayOffset: number, seed: number): RawMetric[] {
  const count = 8 + Math.floor(seededRandom(seed) * 5); // 8-12
  const metrics: RawMetric[] = [];

  for (let i = 0; i < count; i++) {
    const s = seed * 200 + i;
    const screen = pick(PERF_SCREENS, s);
    const base = SCREEN_TRANSITION_BASE[screen];
    const jitter = rangeValue(-40, 200, s + 1);
    const value = Math.round(Math.max(80, Math.min(800, base + jitter)));

    metrics.push({
      id: buildDocId(userId, 'transition', dayOffset, i),
      userId,
      timestamp: `${dateStr}T${String(9 + Math.floor(i * 12 / count)).padStart(2, '0')}:${String(Math.floor(seededRandom(s + 2) * 60)).padStart(2, '0')}:00.000Z`,
      metricType: 'screen_transition',
      screenName: screen,
      value,
      platform: seededRandom(s + 3) > 0.5 ? 'ios' : 'android',
      sessionId: `session-${userId}-d${dayOffset}-0`,
      createdAt: `${dateStr}T${String(9 + Math.floor(i * 12 / count)).padStart(2, '0')}:00:00.000Z`,
    });
  }
  return metrics;
}

function generateScrollFps(userId: string, dateStr: string, dayOffset: number, seed: number): RawMetric[] {
  const count = 4 + Math.floor(seededRandom(seed) * 3); // 4-6
  const metrics: RawMetric[] = [];

  for (let i = 0; i < count; i++) {
    const s = seed * 300 + i;
    const screen = pick(PERF_SCREENS, s);
    const base = SCREEN_SCROLL_FPS_BASE[screen];
    const isDrop = seededRandom(s + 1) < 0.1; // 10% chance of frame drops
    const jitter = isDrop ? rangeValue(-20, -5, s + 2) : rangeValue(-3, 5, s + 2);
    const value = Math.round(Math.max(28, Math.min(60, base + jitter)));
    const droppedFrames = isDrop ? Math.floor(rangeValue(5, 20, s + 3)) : Math.floor(rangeValue(0, 3, s + 3));

    metrics.push({
      id: buildDocId(userId, 'scroll', dayOffset, i),
      userId,
      timestamp: `${dateStr}T${String(10 + Math.floor(i * 8 / count)).padStart(2, '0')}:${String(Math.floor(seededRandom(s + 4) * 60)).padStart(2, '0')}:00.000Z`,
      metricType: 'scroll_fps',
      screenName: screen,
      value,
      metadata: { droppedFrames },
      platform: seededRandom(s + 5) > 0.5 ? 'ios' : 'android',
      sessionId: `session-${userId}-d${dayOffset}-0`,
      createdAt: `${dateStr}T${String(10 + Math.floor(i * 8 / count)).padStart(2, '0')}:00:00.000Z`,
    });
  }
  return metrics;
}

/** Map each profiled component to its actual screen */
const COMPONENT_SCREEN_MAP: Record<string, string> = {
  StatsFeedCard: 'HomeFeed',
  DiaryFeedCard: 'HomeFeed',
  PhotoFeedCard: 'HomeFeed',
  VoiceNoteFeedCard: 'HomeFeed',
  LifeFeedPostCard: 'LifeFeed',
};

function generateComponentRender(userId: string, dateStr: string, dayOffset: number, seed: number): RawMetric[] {
  const count = 4 + Math.floor(seededRandom(seed) * 3); // 4-6
  const metrics: RawMetric[] = [];

  for (let i = 0; i < count; i++) {
    const s = seed * 400 + i;
    const component = pick(PERF_COMPONENTS, s);
    const screen = COMPONENT_SCREEN_MAP[component] || 'HomeFeed';
    const base = COMPONENT_RENDER_BASE[component];
    const isSlow = seededRandom(s + 2) < 0.15; // 15% chance of slow render
    const multiplier = isSlow ? rangeValue(3, 8, s + 3) : rangeValue(0.5, 2, s + 3);
    const value = Math.round(Math.max(3, Math.min(200, base * multiplier)));

    metrics.push({
      id: buildDocId(userId, 'render', dayOffset, i),
      userId,
      timestamp: `${dateStr}T${String(10 + Math.floor(i * 8 / count)).padStart(2, '0')}:${String(Math.floor(seededRandom(s + 4) * 60)).padStart(2, '0')}:00.000Z`,
      metricType: 'component_render',
      screenName: screen,
      value,
      metadata: { componentName: component },
      platform: seededRandom(s + 5) > 0.5 ? 'ios' : 'android',
      sessionId: `session-${userId}-d${dayOffset}-0`,
      createdAt: `${dateStr}T${String(10 + Math.floor(i * 8 / count)).padStart(2, '0')}:00:00.000Z`,
    });
  }
  return metrics;
}

function generateJsThreadFps(userId: string, dateStr: string, dayOffset: number, seed: number): RawMetric[] {
  const count = 2 + Math.floor(seededRandom(seed) * 2); // 2-3
  const metrics: RawMetric[] = [];

  for (let i = 0; i < count; i++) {
    const s = seed * 500 + i;
    const isDip = seededRandom(s + 1) < 0.08; // 8% chance of dips
    const base = 56;
    const jitter = isDip ? rangeValue(-24, -10, s + 2) : rangeValue(-4, 4, s + 2);
    const value = Math.round(Math.max(32, Math.min(60, base + jitter)));

    metrics.push({
      id: buildDocId(userId, 'jsthread', dayOffset, i),
      userId,
      timestamp: `${dateStr}T${String(11 + Math.floor(i * 6 / count)).padStart(2, '0')}:${String(Math.floor(seededRandom(s + 3) * 60)).padStart(2, '0')}:00.000Z`,
      metricType: 'js_thread_fps',
      value,
      platform: seededRandom(s + 4) > 0.5 ? 'ios' : 'android',
      sessionId: `session-${userId}-d${dayOffset}-0`,
      createdAt: `${dateStr}T${String(11 + Math.floor(i * 6 / count)).padStart(2, '0')}:00:00.000Z`,
    });
  }
  return metrics;
}

function generateApiResponseTime(userId: string, dateStr: string, dayOffset: number, seed: number): RawMetric[] {
  const count = 5 + Math.floor(seededRandom(seed) * 4); // 5-8
  const metrics: RawMetric[] = [];

  for (let i = 0; i < count; i++) {
    const s = seed * 600 + i;
    const endpoint = pick(PERF_ENDPOINTS, s);
    const base = ENDPOINT_LATENCY_BASE[endpoint];
    const isSlow = seededRandom(s + 1) < 0.1; // 10% slow responses
    const multiplier = isSlow ? rangeValue(2, 3, s + 2) : rangeValue(0.6, 1.4, s + 2);
    const value = Math.round(Math.max(80, Math.min(2500, base * multiplier)));
    const isError = seededRandom(s + 3) < 0.05; // 5% error rate

    metrics.push({
      id: buildDocId(userId, 'api', dayOffset, i),
      userId,
      timestamp: `${dateStr}T${String(9 + Math.floor(i * 12 / count)).padStart(2, '0')}:${String(Math.floor(seededRandom(s + 4) * 60)).padStart(2, '0')}:00.000Z`,
      metricType: 'api_response_time',
      value,
      metadata: { endpoint, method: 'CALL', status: isError ? 500 : 200, success: !isError },
      platform: seededRandom(s + 5) > 0.5 ? 'ios' : 'android',
      sessionId: `session-${userId}-d${dayOffset}-0`,
      createdAt: `${dateStr}T${String(9 + Math.floor(i * 12 / count)).padStart(2, '0')}:00:00.000Z`,
    });
  }
  return metrics;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Generate all metrics for one user for one day */
export function generateDailyMetrics(userId: string, dateStr: string, dayOffset: number): RawMetric[] {
  // Use userId + dayOffset as seed base for determinism
  const userSeed = PERF_USER_IDS.indexOf(userId) + 1;
  const baseSeed = userSeed * 1000 + dayOffset;

  return [
    ...generateAppStartup(userId, dateStr, dayOffset, baseSeed + 1),
    ...generateScreenTransitions(userId, dateStr, dayOffset, baseSeed + 2),
    ...generateScrollFps(userId, dateStr, dayOffset, baseSeed + 3),
    ...generateComponentRender(userId, dateStr, dayOffset, baseSeed + 4),
    ...generateJsThreadFps(userId, dateStr, dayOffset, baseSeed + 5),
    ...generateApiResponseTime(userId, dateStr, dayOffset, baseSeed + 6),
  ];
}

/** Get all deterministic doc IDs for cleanup */
export function getAllPerfDocIds(config: PerfSeedConfig = DEFAULT_PERF_CONFIG): string[] {
  const ids: string[] = [];

  for (let day = 0; day < config.days; day++) {
    const dateStr = daysAgoStr(config.days - 1 - day);
    PERF_USER_IDS.forEach(userId => {
      const metrics = generateDailyMetrics(userId, dateStr, day);
      metrics.forEach(m => ids.push(m.id));
    });
  }

  return ids;
}

/** Get date strings for aggregate cleanup */
export function getPerfDates(config: PerfSeedConfig = DEFAULT_PERF_CONFIG): string[] {
  const dates: string[] = [];
  for (let day = 0; day < config.days; day++) {
    dates.push(daysAgoStr(config.days - 1 - day));
  }
  return dates;
}

/** Get all metrics for all users across all days */
export function getAllPerfMetrics(config: PerfSeedConfig = DEFAULT_PERF_CONFIG): RawMetric[] {
  const allMetrics: RawMetric[] = [];

  for (let day = 0; day < config.days; day++) {
    const dateStr = daysAgoStr(config.days - 1 - day);
    PERF_USER_IDS.forEach(userId => {
      allMetrics.push(...generateDailyMetrics(userId, dateStr, day));
    });
  }

  return allMetrics;
}
