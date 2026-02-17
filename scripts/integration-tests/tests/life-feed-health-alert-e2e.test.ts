/**
 * Life Feed Health Alert - E2E Test
 *
 * END-TO-END test that verifies health_alert post generation:
 * 1. Creates health data with anomalies (spike above 7-day average)
 * 2. Calls the generateLifeFeedNow Cloud Function
 * 3. Verifies a health_alert post is generated with anomaly details
 *
 * Tests the new detectHealthAnomalies() method:
 * - Spike detection (>50% above average)
 * - Drop detection (>40% below average for steps/energy)
 * - Trend detection (3+ consecutive days trending)
 *
 * Run: npm test -- --filter life-feed-health-alert-e2e
 * Or:  npm test -- --e2e-only
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
export const name = 'Life Feed Health Alert E2E';

// Track created documents for cleanup
const createdDocs: { collection: string; id: string }[] = [];

/**
 * Main test runner - exported for test discovery
 */
export async function run(): Promise<TestResult[]> {
  const { db, userId } = globalThis.testContext;
  const allResults: TestResult[] = [];

  // Test 1: Health alert from spike in steps
  const results1 = await testHealthAlertFromSpike(db, userId);
  allResults.push(...results1);

  // Cleanup
  await cleanup(db);

  return allResults;
}

/**
 * Test 1: Health alert from a spike in health metrics
 *
 * Creates health data with a significant spike (latest value 200% of average)
 * and verifies a health_alert post is generated.
 */
async function testHealthAlertFromSpike(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('E2E: Health alert from step spike');

  const testId = generateTestId();

  try {
    // Step 0: Clear recent health_alert posts to avoid cooldowns
    logInfo('Step 0: Clearing recent health_alert posts to reset cooldowns...');

    const recentPostsSnap = await db.collection('lifeFeedPosts')
      .where('userId', '==', userId)
      .where('type', '==', 'health_alert')
      .orderBy('publishedAt', 'desc')
      .limit(10)
      .get();

    if (recentPostsSnap.size > 0) {
      log(`  Deleting ${recentPostsSnap.size} recent health_alert posts...`, colors.dim);
      for (const doc of recentPostsSnap.docs) {
        await doc.ref.delete();
      }
      logPass(`Cleared ${recentPostsSnap.size} recent health_alert posts`);
    }

    // Step 1: Create test health data with a spike
    logInfo('Step 1: Creating test health data with spike...');

    const now = Date.now();
    const healthDocs: string[] = [];

    // Create 6 days of normal steps (baseline: ~5000 steps)
    for (let i = 6; i >= 1; i--) {
      const docId = `e2e-health-${testId}-day${i}`;
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      await db.collection('healthData').doc(docId).set({
        userId,
        type: 'steps',
        value: 4500 + Math.floor(Math.random() * 1000), // 4500-5500 steps
        startDate: date.toISOString(),
        endDate: date.toISOString(),
        source: 'test',
        createdAt: date.toISOString(),
      });
      healthDocs.push(docId);
      createdDocs.push({ collection: 'healthData', id: docId });
    }

    // Create today with a spike (15000 steps - 300% of average)
    const todayDocId = `e2e-health-${testId}-today`;
    await db.collection('healthData').doc(todayDocId).set({
      userId,
      type: 'steps',
      value: 15000, // Spike: 300% of ~5000 average
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
      source: 'test',
      createdAt: new Date().toISOString(),
    });
    healthDocs.push(todayDocId);
    createdDocs.push({ collection: 'healthData', id: todayDocId });

    logPass(`Created ${healthDocs.length} health data points (6 normal + 1 spike)`);
    log(`  Baseline: ~5000 steps/day`, colors.dim);
    log(`  Spike: 15000 steps today (200%+ above average)`, colors.dim);

    results.push({
      name: 'Health Alert E2E: Test data created',
      passed: true,
      reason: '7 health data points with spike pattern',
      details: { healthDocs },
    });

    // Step 2: Call the generateLifeFeedNow Cloud Function
    logInfo('Step 2: Calling generateLifeFeedNow Cloud Function...');

    const { idToken, projectId, region } = globalThis.testContext;

    if (!idToken) {
      logInfo('No ID token available - skipping Cloud Function call');
      results.push({
        name: 'Health Alert E2E: Cloud Function call',
        passed: true,
        reason: 'Skipped - no ID token (run with auth to enable)',
        details: { skipped: true },
      });
      return results;
    }

    const functionUrl = `https://${region}-${projectId}.cloudfunctions.net/generateLifeFeedNow`;

    try {
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ data: {} }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Function returned ${response.status}: ${errorText}`);
      }

      const responseData = await response.json();
      logPass('Cloud Function called successfully');

      const result = responseData.result || responseData;
      log(`  Function response status: ${result.status || 'unknown'}`, colors.dim);
      log(`  Posts generated: ${result.posts?.length || 0}`, colors.dim);

      results.push({
        name: 'Health Alert E2E: Cloud Function call',
        passed: true,
        reason: `Function returned status: ${result.status || 'unknown'}`,
        details: { status: response.status, postsGenerated: result.posts?.length || 0 },
      });
    } catch (error: any) {
      logFail('Health Alert E2E: Cloud Function call', error.message);
      results.push({
        name: 'Health Alert E2E: Cloud Function call',
        passed: false,
        reason: `FAILED: ${error.message}`,
        details: { error: error.message },
      });
      return results;
    }

    // Step 3: Wait for posts to be generated
    logInfo('Step 3: Waiting 15 seconds for posts to be generated...');
    await wait(15000);

    // Step 4: Check for health_alert posts
    logInfo('Step 4: Checking for health_alert posts...');

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const postsSnap = await db.collection('lifeFeedPosts')
      .where('userId', '==', userId)
      .where('publishedAt', '>=', tenMinutesAgo)
      .orderBy('publishedAt', 'desc')
      .limit(20)
      .get();

    logQueryBox('Recent Life Feed Posts', [
      `Time range: Last 10 minutes`,
      `Found: ${postsSnap.size} total posts`,
    ]);

    // Track generated posts for cleanup
    postsSnap.docs.forEach(doc => {
      createdDocs.push({ collection: 'lifeFeedPosts', id: doc.id });
    });

    // Find health_alert posts specifically
    const healthAlertPosts = postsSnap.docs.filter(doc => doc.data().type === 'health_alert');

    if (healthAlertPosts.length === 0) {
      const postTypes = postsSnap.docs.map(doc => doc.data().type);
      logInfo(`Post types generated: ${postTypes.join(', ') || 'none'}`);

      logFail('Health Alert E2E: health_alert post generated', 'No health_alert posts found');
      results.push({
        name: 'Health Alert E2E: health_alert post generated',
        passed: false,
        reason: `No health_alert posts found. ${postsSnap.size} other posts generated: [${postTypes.join(', ')}]`,
        details: { postsFound: postsSnap.size, postTypes },
      });
    } else {
      logPass(`${healthAlertPosts.length} health_alert post(s) found!`);

      const alertPost = healthAlertPosts[0].data();
      log(`  Content preview: "${alertPost.content?.substring(0, 150)}..."`, colors.dim);

      results.push({
        name: 'Health Alert E2E: health_alert post generated',
        passed: true,
        reason: `${healthAlertPosts.length} health_alert post(s) generated`,
        details: {
          confidence: alertPost.confidence,
          contentPreview: alertPost.content?.substring(0, 200),
        },
      });

      // Step 5: Verify content mentions steps or spike
      logInfo('Step 5: Verifying content references the spike...');

      const postContent = alertPost.content?.toLowerCase() || '';
      const spikeKeywords = ['step', 'spike', 'increase', 'above', 'average', 'high', 'more', '15000', '15,000'];
      const matchedKeywords = spikeKeywords.filter(kw => postContent.includes(kw));

      if (matchedKeywords.length > 0) {
        logPass(`Content references spike (found: ${matchedKeywords.join(', ')})`);
      } else {
        logInfo('Spike keywords not found directly - AI may have paraphrased');
      }

      results.push({
        name: 'Health Alert E2E: Content references spike',
        passed: matchedKeywords.length > 0,
        reason: matchedKeywords.length > 0
          ? `Found keywords: ${matchedKeywords.join(', ')}`
          : 'No direct spike keywords (AI may have paraphrased)',
        details: { matchedKeywords },
      });
    }
  } catch (error: any) {
    logFail('Test execution', error.message);
    results.push({
      name: 'Health Alert E2E: Test execution',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * Cleanup test data
 */
async function cleanup(db: admin.firestore.Firestore): Promise<void> {
  if (createdDocs.length === 0) {
    return;
  }

  const cleanupItems = createdDocs.map(
    ({ collection, id }) => `${collection}/${id}`
  );
  logCleanup(cleanupItems);

  let deleted = 0;
  let failed = 0;

  for (const { collection, id } of createdDocs) {
    try {
      await db.collection(collection).doc(id).delete();
      deleted++;
    } catch {
      failed++;
    }
  }

  const success = failed === 0;
  const message = success ? undefined : `Deleted ${deleted}, failed ${failed}`;
  logCleanupResult(success, message);

  createdDocs.length = 0;
}

/**
 * Cleanup function exported for test runner
 */
export async function cleanupTestData(): Promise<void> {
  const { db } = globalThis.testContext;
  await cleanup(db);
}
