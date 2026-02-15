/**
 * E2E Performance Data Operations
 *
 * Core seed/cleanup operations and full 6-type aggregation.
 * Accepts Firebase Admin instances as parameters to avoid module bundling issues.
 */

import type { firestore } from 'firebase-admin';
import type { ProgressCallback } from './types';
import {
  PERF_USER_IDS,
  DEFAULT_PERF_CONFIG,
  generateDailyMetrics,
  getAllPerfDocIds,
  getPerfDates,
  type PerfSeedConfig,
} from './perfData';

// ---------------------------------------------------------------------------
// Aggregation helpers
// ---------------------------------------------------------------------------

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

// ---------------------------------------------------------------------------
// aggregateMetrics — Pure function, no Firestore dependency
// ---------------------------------------------------------------------------

/**
 * Compute a DailyPerformanceAggregate from an array of raw metric objects.
 * Works with both Firestore document data and plain objects.
 */
export function aggregateMetrics(
  metrics: any[],
  dateStr: string,
): {
  date: string;
  computedAt: string;
  startup?: any;
  screenTransitions: Record<string, any>;
  scrollFps: Record<string, any>;
  jsThreadFps?: any;
  apiLatency: Record<string, any>;
  slowRenders: any[];
  totalMetrics: number;
  uniqueUsers: number;
} {
  const uniqueUsers = new Set(metrics.map(m => m.userId));

  // Group by metric type
  const byType: Record<string, any[]> = {};
  metrics.forEach(m => {
    if (!byType[m.metricType]) byType[m.metricType] = [];
    byType[m.metricType].push(m);
  });

  // --- app_startup ---
  const startupMetrics = byType['app_startup'] || [];
  const startupValues = startupMetrics.map((m: any) => m.value);
  const startup = startupValues.length > 0 ? {
    count: startupValues.length,
    avgMs: Math.round(avg(startupValues)),
    p50Ms: Math.round(percentile(startupValues, 50)),
    p95Ms: Math.round(percentile(startupValues, 95)),
  } : undefined;

  // --- screen_transition ---
  const transitionMetrics = byType['screen_transition'] || [];
  const transitionsByScreen: Record<string, number[]> = {};
  transitionMetrics.forEach((m: any) => {
    const screen = m.screenName || 'unknown';
    if (!transitionsByScreen[screen]) transitionsByScreen[screen] = [];
    transitionsByScreen[screen].push(m.value);
  });
  const screenTransitions: Record<string, any> = {};
  Object.entries(transitionsByScreen).forEach(([screen, values]) => {
    screenTransitions[screen] = {
      count: values.length,
      avgMs: Math.round(avg(values)),
      p50Ms: Math.round(percentile(values, 50)),
      p95Ms: Math.round(percentile(values, 95)),
    };
  });

  // --- scroll_fps ---
  const scrollMetrics = byType['scroll_fps'] || [];
  const scrollByScreen: Record<string, { fps: number[]; dropped: number[] }> = {};
  scrollMetrics.forEach((m: any) => {
    const screen = m.screenName || 'unknown';
    if (!scrollByScreen[screen]) scrollByScreen[screen] = { fps: [], dropped: [] };
    scrollByScreen[screen].fps.push(m.value);
    scrollByScreen[screen].dropped.push(m.metadata?.droppedFrames ?? 0);
  });
  const scrollFps: Record<string, any> = {};
  Object.entries(scrollByScreen).forEach(([screen, data]) => {
    scrollFps[screen] = {
      count: data.fps.length,
      avgFps: Math.round(avg(data.fps) * 10) / 10,
      minFps: Math.min(...data.fps),
      avgDroppedFrames: Math.round(avg(data.dropped) * 10) / 10,
    };
  });

  // --- js_thread_fps ---
  const jsThreadMetrics = byType['js_thread_fps'] || [];
  const jsValues = jsThreadMetrics.map((m: any) => m.value);
  const jsThreadFps = jsValues.length > 0 ? {
    count: jsValues.length,
    avgFps: Math.round(avg(jsValues) * 10) / 10,
    minFps: Math.min(...jsValues),
    below30Count: jsValues.filter((v: number) => v < 30).length,
    below45Count: jsValues.filter((v: number) => v < 45).length,
  } : undefined;

  // --- api_response_time ---
  const apiMetrics = byType['api_response_time'] || [];
  const apiByEndpoint: Record<string, { values: number[]; errors: number }> = {};
  apiMetrics.forEach((m: any) => {
    const endpoint = m.metadata?.endpoint || 'unknown';
    if (!apiByEndpoint[endpoint]) apiByEndpoint[endpoint] = { values: [], errors: 0 };
    apiByEndpoint[endpoint].values.push(m.value);
    if (m.metadata?.isError) apiByEndpoint[endpoint].errors++;
  });
  const apiLatency: Record<string, any> = {};
  Object.entries(apiByEndpoint).forEach(([endpoint, data]) => {
    apiLatency[endpoint] = {
      count: data.values.length,
      avgMs: Math.round(avg(data.values)),
      p50Ms: Math.round(percentile(data.values, 50)),
      p95Ms: Math.round(percentile(data.values, 95)),
      errorCount: data.errors,
    };
  });

  // --- component_render (slow renders) ---
  const renderMetrics = byType['component_render'] || [];
  const renderByComponent: Record<string, { screen: string; values: number[] }> = {};
  renderMetrics.forEach((m: any) => {
    const component = m.metadata?.componentName || 'unknown';
    if (!renderByComponent[component]) {
      renderByComponent[component] = { screen: m.screenName || 'unknown', values: [] };
    }
    renderByComponent[component].values.push(m.value);
  });
  const slowRenders = Object.entries(renderByComponent)
    .map(([componentName, data]) => ({
      componentName,
      screenName: data.screen,
      count: data.values.length,
      avgDurationMs: Math.round(avg(data.values)),
      maxDurationMs: Math.max(...data.values),
    }))
    .sort((a, b) => b.avgDurationMs - a.avgDurationMs)
    .slice(0, 20);

  return {
    date: dateStr,
    computedAt: new Date().toISOString(),
    ...(startup && { startup }),
    screenTransitions,
    scrollFps,
    ...(jsThreadFps && { jsThreadFps }),
    apiLatency,
    slowRenders,
    totalMetrics: metrics.length,
    uniqueUsers: uniqueUsers.size,
  };
}

// ---------------------------------------------------------------------------
// aggregateDay — Full 6-type aggregation, writes to Firestore
// ---------------------------------------------------------------------------

/**
 * Aggregate all raw metrics for a given date into a single
 * performanceAggregates document. Handles all 6 metric types.
 */
export async function aggregateDay(
  db: firestore.Firestore,
  dateStr: string,
): Promise<void> {
  const dayStart = dateStr + 'T00:00:00.000Z';
  const dayEnd = dateStr + 'T23:59:59.999Z';

  const snapshot = await db.collection('performanceMetrics')
    .where('timestamp', '>=', dayStart)
    .where('timestamp', '<=', dayEnd)
    .get();

  if (snapshot.empty) return;

  const metrics = snapshot.docs.map(doc => doc.data());
  const aggregate = aggregateMetrics(metrics, dateStr);

  await db.collection('performanceAggregates').doc(dateStr).set(aggregate);
}

// ---------------------------------------------------------------------------
// seedPerformanceData
// ---------------------------------------------------------------------------

export async function seedPerformanceData(
  db: firestore.Firestore,
  onProgress: ProgressCallback,
  config: PerfSeedConfig = DEFAULT_PERF_CONFIG,
): Promise<void> {
  const dates = getPerfDates(config);
  let totalWritten = 0;

  // Phase 1: Generate & write raw metrics
  onProgress({
    phase: 1,
    phaseName: 'Write Metrics',
    level: 'info',
    message: `Generating synthetic metrics for ${config.days} days, ${PERF_USER_IDS.length} users...`,
  });

  for (let dayIdx = 0; dayIdx < dates.length; dayIdx++) {
    const dateStr = dates[dayIdx];

    for (const userId of PERF_USER_IDS) {
      const metrics = generateDailyMetrics(userId, dateStr, dayIdx);

      // Write in batches of 500 (Firestore limit)
      for (let batchStart = 0; batchStart < metrics.length; batchStart += 500) {
        const batchSlice = metrics.slice(batchStart, batchStart + 500);
        const batch = db.batch();

        batchSlice.forEach(metric => {
          const { id, ...data } = metric;
          batch.set(db.collection('performanceMetrics').doc(id), data, { merge: true });
        });

        await batch.commit();
        totalWritten += batchSlice.length;
      }

      onProgress({
        phase: 1,
        phaseName: 'Write Metrics',
        level: 'info',
        message: `Day ${dayIdx + 1}/${config.days}: Wrote ${generateDailyMetrics(userId, dateStr, dayIdx).length} metrics for ${userId}`,
        progress: { current: dayIdx * PERF_USER_IDS.length + PERF_USER_IDS.indexOf(userId) + 1, total: config.days * PERF_USER_IDS.length },
      });
    }
  }

  onProgress({
    phase: 1,
    phaseName: 'Write Metrics',
    level: 'success',
    message: `Wrote ${totalWritten} raw metric documents to Firestore`,
  });

  // Phase 2: Aggregate each day
  onProgress({
    phase: 2,
    phaseName: 'Aggregate',
    level: 'info',
    message: `Aggregating ${config.days} days of metrics...`,
  });

  for (let dayIdx = 0; dayIdx < dates.length; dayIdx++) {
    await aggregateDay(db, dates[dayIdx]);

    onProgress({
      phase: 2,
      phaseName: 'Aggregate',
      level: 'info',
      message: `Aggregated day ${dayIdx + 1}/${config.days}: ${dates[dayIdx]}`,
      progress: { current: dayIdx + 1, total: config.days },
    });
  }

  onProgress({
    phase: 2,
    phaseName: 'Aggregate',
    level: 'success',
    message: `Aggregated all ${config.days} days`,
  });

  // Phase 3: Summary
  onProgress({
    phase: 3,
    phaseName: 'Complete',
    level: 'success',
    message: `Seed complete! ${totalWritten} raw metrics + ${config.days} aggregate documents. Users: ${PERF_USER_IDS.join(', ')}`,
  });
}

// ---------------------------------------------------------------------------
// cleanupPerformanceData
// ---------------------------------------------------------------------------

export async function cleanupPerformanceData(
  db: firestore.Firestore,
  onProgress: ProgressCallback,
  config: PerfSeedConfig = DEFAULT_PERF_CONFIG,
): Promise<void> {
  onProgress({
    phase: 0,
    phaseName: 'Cleanup',
    level: 'info',
    message: 'Starting performance data cleanup...',
  });

  // Phase 1: Delete raw metrics by deterministic IDs
  const allIds = getAllPerfDocIds(config);

  onProgress({
    phase: 1,
    phaseName: 'Delete Metrics',
    level: 'info',
    message: `Deleting ${allIds.length} raw metric documents...`,
  });

  let deletedMetrics = 0;
  for (let batchStart = 0; batchStart < allIds.length; batchStart += 500) {
    const batchSlice = allIds.slice(batchStart, batchStart + 500);
    const batch = db.batch();

    batchSlice.forEach(id => {
      batch.delete(db.collection('performanceMetrics').doc(id));
    });

    await batch.commit();
    deletedMetrics += batchSlice.length;

    onProgress({
      phase: 1,
      phaseName: 'Delete Metrics',
      level: 'info',
      message: `Deleted ${deletedMetrics}/${allIds.length} metrics...`,
      progress: { current: deletedMetrics, total: allIds.length },
    });
  }

  onProgress({
    phase: 1,
    phaseName: 'Delete Metrics',
    level: 'success',
    message: `Deleted ${deletedMetrics} raw metric documents`,
  });

  // Phase 2: Delete aggregate docs by date
  const dates = getPerfDates(config);

  onProgress({
    phase: 2,
    phaseName: 'Delete Aggregates',
    level: 'info',
    message: `Deleting ${dates.length} aggregate documents...`,
  });

  let deletedAggregates = 0;
  for (const dateStr of dates) {
    try {
      await db.collection('performanceAggregates').doc(dateStr).delete();
      deletedAggregates++;
    } catch {
      // Document may not exist
    }
  }

  onProgress({
    phase: 2,
    phaseName: 'Delete Aggregates',
    level: 'success',
    message: `Deleted ${deletedAggregates} aggregate documents`,
  });

  // Phase 3: Summary
  onProgress({
    phase: 3,
    phaseName: 'Complete',
    level: 'success',
    message: `Cleanup complete! Deleted ${deletedMetrics} metrics + ${deletedAggregates} aggregates.`,
  });
}
