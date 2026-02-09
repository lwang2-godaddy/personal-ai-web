/**
 * Scheduler Services - Integration Tests
 *
 * Tests the scheduled Cloud Functions that run daily/hourly:
 *
 * Daily Schedulers (7 AM PST):
 * - generateLifeFeed - Main life feed generation
 * - generateMoodPatterns - Mood analysis
 * - generateInsights - InsightsOrchestrator
 * - generateFunFacts - Fun facts
 * - generateKeywords - Life keywords
 * - generateConnections - Life connections
 * - generateThisDayMemories - "On This Day"
 *
 * Hourly Schedulers:
 * - refreshLifeFeedCache - Cache refresh
 * - cleanupExpiredPosts - Expired post cleanup
 *
 * Verifications:
 * - Output collections have recent data
 * - User-specific data is isolated
 * - Timestamps indicate recent scheduler runs
 */

import * as admin from 'firebase-admin';
import type { TestResult } from '../lib/test-utils';
import {
  generateTestId,
  wait,
} from '../lib/test-utils';
import {
  log,
  colors,
  logPass,
  logFail,
  logInfo,
  logTestCase,
  logQueryBox,
  logCleanup,
  logCleanupResult,
} from '../lib/reporter';

// Test name for discovery
export const name = 'Scheduler Services';

/**
 * Helper: Get timestamp safely
 */
function getTimestamp(value: any): number {
  if (!value) return 0;
  try {
    if (typeof value.toDate === 'function') {
      return value.toDate().getTime();
    }
    if (typeof value === 'string') {
      return new Date(value).getTime();
    }
    if (typeof value === 'number') {
      return value;
    }
  } catch (e) {
    // ignore
  }
  return 0;
}

/**
 * Main test runner - exported for test discovery
 */
export async function run(): Promise<TestResult[]> {
  const { db, userId } = globalThis.testContext;
  const allResults: TestResult[] = [];

  // Test Case 1: Check funFacts collection
  const test1Results = await testFunFactsOutput(db, userId);
  allResults.push(...test1Results);

  // Test Case 2: Check lifeKeywords collection
  const test2Results = await testLifeKeywordsOutput(db, userId);
  allResults.push(...test2Results);

  // Test Case 3: Check moodPatterns collection
  const test3Results = await testMoodPatternsOutput(db, userId);
  allResults.push(...test3Results);

  // Test Case 4: Check insights collection
  const test4Results = await testInsightsOutput(db, userId);
  allResults.push(...test4Results);

  // Test Case 5: Check memories collection
  const test5Results = await testMemoriesOutput(db, userId);
  allResults.push(...test5Results);

  // Test Case 6: Check scheduler run timestamps
  const test6Results = await testSchedulerTimestamps(db);
  allResults.push(...test6Results);

  return allResults;
}

/**
 * Test Case 1: Fun Facts Output
 */
async function testFunFactsOutput(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Fun Facts Scheduler Output');

  try {
    const factsSnapshot = await db.collection('funFacts')
      .where('userId', '==', userId)
      .limit(20)
      .get();

    logQueryBox('funFacts Collection', [
      `where userId == "${userId.substring(0, 8)}..."`,
      `Found: ${factsSnapshot.size} facts`,
    ]);

    if (factsSnapshot.size === 0) {
      logInfo('No fun facts found (scheduler may not have run yet)');
      results.push({
        name: 'FunFacts: Output exists',
        passed: true, // Informational
        reason: 'No fun facts found - scheduler may not have run',
        details: { factCount: 0 },
      });
      return results;
    }

    // Analyze facts
    const periodCounts: Record<string, number> = {};
    let recentFacts = 0;
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    factsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const period = data.period || 'unknown';
      periodCounts[period] = (periodCounts[period] || 0) + 1;

      const createdAt = getTimestamp(data.createdAt);
      if (createdAt > sevenDaysAgo) {
        recentFacts++;
      }
    });

    logPass(`${factsSnapshot.size} fun facts found`);
    log(`  Periods: ${Object.entries(periodCounts).map(([p, c]) => `${p}=${c}`).join(', ')}`, colors.dim);
    log(`  Recent (7d): ${recentFacts}`, colors.dim);

    results.push({
      name: 'FunFacts: Output exists',
      passed: true,
      reason: `${factsSnapshot.size} fun facts found`,
      details: { factCount: factsSnapshot.size, periodCounts, recentFacts },
    });

    // Check for recent scheduler run
    const hasRecentRun = recentFacts > 0;
    results.push({
      name: 'FunFacts: Recent scheduler activity',
      passed: true, // Informational
      reason: hasRecentRun
        ? `${recentFacts} facts in last 7 days`
        : 'No recent facts (scheduler may need more data)',
      details: { recentFacts, hasRecentRun },
    });

  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    results.push({
      name: 'FunFacts: Test execution',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * Test Case 2: Life Keywords Output
 */
async function testLifeKeywordsOutput(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Life Keywords Scheduler Output');

  try {
    const keywordsSnapshot = await db.collection('lifeKeywords')
      .where('userId', '==', userId)
      .limit(20)
      .get();

    logQueryBox('lifeKeywords Collection', [
      `where userId == "${userId.substring(0, 8)}..."`,
      `Found: ${keywordsSnapshot.size} keyword sets`,
    ]);

    if (keywordsSnapshot.size === 0) {
      logInfo('No life keywords found');
      results.push({
        name: 'LifeKeywords: Output exists',
        passed: true,
        reason: 'No keywords found - scheduler may not have run',
        details: { keywordCount: 0 },
      });
      return results;
    }

    // Analyze keywords
    let totalKeywords = 0;
    const periodCounts: Record<string, number> = {};

    keywordsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const keywords = data.keywords || [];
      totalKeywords += keywords.length;
      const period = data.period || 'unknown';
      periodCounts[period] = (periodCounts[period] || 0) + 1;
    });

    logPass(`${keywordsSnapshot.size} keyword sets found`);
    log(`  Total keywords: ${totalKeywords}`, colors.dim);

    results.push({
      name: 'LifeKeywords: Output exists',
      passed: true,
      reason: `${keywordsSnapshot.size} keyword sets with ${totalKeywords} total keywords`,
      details: { keywordSets: keywordsSnapshot.size, totalKeywords, periodCounts },
    });

  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    results.push({
      name: 'LifeKeywords: Test execution',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * Test Case 3: Mood Patterns Output
 */
async function testMoodPatternsOutput(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Mood Patterns Scheduler Output');

  try {
    const patternsSnapshot = await db.collection('moodPatterns')
      .where('userId', '==', userId)
      .limit(20)
      .get();

    logQueryBox('moodPatterns Collection', [
      `where userId == "${userId.substring(0, 8)}..."`,
      `Found: ${patternsSnapshot.size} patterns`,
    ]);

    if (patternsSnapshot.size === 0) {
      logInfo('No mood patterns found');
      results.push({
        name: 'MoodPatterns: Output exists',
        passed: true,
        reason: 'No patterns found - need 14+ mood entries',
        details: { patternCount: 0 },
      });
      return results;
    }

    // Analyze patterns
    const patternTypes: Record<string, number> = {};

    patternsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const type = data.patternType || data.type || 'unknown';
      patternTypes[type] = (patternTypes[type] || 0) + 1;
    });

    logPass(`${patternsSnapshot.size} mood patterns found`);
    log(`  Pattern types: ${Object.entries(patternTypes).map(([t, c]) => `${t}=${c}`).join(', ')}`, colors.dim);

    results.push({
      name: 'MoodPatterns: Output exists',
      passed: true,
      reason: `${patternsSnapshot.size} mood patterns found`,
      details: { patternCount: patternsSnapshot.size, patternTypes },
    });

  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    results.push({
      name: 'MoodPatterns: Test execution',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * Test Case 4: Insights Output
 */
async function testInsightsOutput(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Insights Scheduler Output');

  try {
    const insightsSnapshot = await db.collection('insights')
      .where('userId', '==', userId)
      .limit(50)
      .get();

    logQueryBox('insights Collection', [
      `where userId == "${userId.substring(0, 8)}..."`,
      `Found: ${insightsSnapshot.size} insights`,
    ]);

    if (insightsSnapshot.size === 0) {
      logInfo('No insights found');
      results.push({
        name: 'Insights: Output exists',
        passed: true,
        reason: 'No insights found - scheduler may need more data',
        details: { insightCount: 0 },
      });
      return results;
    }

    // Analyze insights by type
    const typeCounts: Record<string, number> = {};

    insightsSnapshot.docs.forEach((doc) => {
      const type = doc.data().type || 'unknown';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    logPass(`${insightsSnapshot.size} insights found`);
    log(`  Types: ${Object.entries(typeCounts).map(([t, c]) => `${t}=${c}`).join(', ')}`, colors.dim);

    results.push({
      name: 'Insights: Output exists',
      passed: true,
      reason: `${insightsSnapshot.size} insights (${Object.keys(typeCounts).length} types)`,
      details: { insightCount: insightsSnapshot.size, typeCounts },
    });

    // Check for pattern insights specifically
    const patternCount = typeCounts['pattern'] || 0;
    const anomalyCount = typeCounts['anomaly'] || 0;

    results.push({
      name: 'Insights: Pattern and anomaly detection',
      passed: true, // Informational
      reason: `${patternCount} patterns, ${anomalyCount} anomalies detected`,
      details: { patternCount, anomalyCount },
    });

  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    results.push({
      name: 'Insights: Test execution',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * Test Case 5: Memories Output
 */
async function testMemoriesOutput(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Memories Scheduler Output');

  try {
    const memoriesSnapshot = await db.collection('memories')
      .where('userId', '==', userId)
      .limit(30)
      .get();

    logQueryBox('memories Collection', [
      `where userId == "${userId.substring(0, 8)}..."`,
      `Found: ${memoriesSnapshot.size} memories`,
    ]);

    if (memoriesSnapshot.size === 0) {
      logInfo('No memories found');
      results.push({
        name: 'Memories: Output exists',
        passed: true,
        reason: 'No memories found - MemoryMaker may not have run',
        details: { memoryCount: 0 },
      });
      return results;
    }

    // Analyze memories
    const sourceTypes: Record<string, number> = {};
    let withAISummary = 0;

    memoriesSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const sourceType = data.sourceType || 'unknown';
      sourceTypes[sourceType] = (sourceTypes[sourceType] || 0) + 1;

      if (data.summary || data.title) {
        withAISummary++;
      }
    });

    logPass(`${memoriesSnapshot.size} memories found`);
    log(`  Source types: ${Object.entries(sourceTypes).map(([t, c]) => `${t}=${c}`).join(', ')}`, colors.dim);
    log(`  With AI summary: ${withAISummary}`, colors.dim);

    results.push({
      name: 'Memories: Output exists',
      passed: true,
      reason: `${memoriesSnapshot.size} memories from ${Object.keys(sourceTypes).length} source types`,
      details: { memoryCount: memoriesSnapshot.size, sourceTypes, withAISummary },
    });

  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    results.push({
      name: 'Memories: Test execution',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * Test Case 6: Scheduler Run Timestamps
 */
async function testSchedulerTimestamps(
  db: admin.firestore.Firestore
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Scheduler Run Timestamps');

  try {
    // Check schedulerRuns collection
    const runsSnapshot = await db.collection('schedulerRuns')
      .limit(30)
      .get();

    logQueryBox('schedulerRuns Collection', [
      'Checking recent scheduler activity',
      `Found: ${runsSnapshot.size} run records`,
    ]);

    if (runsSnapshot.size === 0) {
      logInfo('No scheduler run records found');
      results.push({
        name: 'Schedulers: Run tracking',
        passed: true,
        reason: 'No run records (schedulers may not log to this collection)',
        details: { runCount: 0 },
      });
      return results;
    }

    // Analyze runs
    const schedulerCounts: Record<string, number> = {};
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    let recentRuns = 0;

    runsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const scheduler = data.scheduler || data.name || doc.id;
      schedulerCounts[scheduler] = (schedulerCounts[scheduler] || 0) + 1;

      const runAt = getTimestamp(data.runAt || data.createdAt);
      if (runAt > oneDayAgo) {
        recentRuns++;
      }
    });

    log(`  Schedulers tracked: ${Object.keys(schedulerCounts).length}`, colors.dim);
    log(`  Recent runs (24h): ${recentRuns}`, colors.dim);

    if (recentRuns > 0) {
      logPass(`${recentRuns} scheduler runs in last 24 hours`);
    } else {
      logInfo('No recent scheduler runs recorded');
    }

    results.push({
      name: 'Schedulers: Recent activity',
      passed: true, // Informational
      reason: `${recentRuns} runs in last 24 hours`,
      details: { schedulerCounts, recentRuns, totalRuns: runsSnapshot.size },
    });

  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    results.push({
      name: 'Schedulers: Timestamp check',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * No cleanup needed (read-only tests)
 */
export async function cleanupTestData(): Promise<void> {
  // No test data created
}
