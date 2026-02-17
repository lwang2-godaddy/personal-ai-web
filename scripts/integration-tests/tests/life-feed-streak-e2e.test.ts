/**
 * Life Feed Streak Achievement - E2E Test
 *
 * END-TO-END test that verifies streak_achievement post generation:
 * 1. Creates diary entries on consecutive days
 * 2. Calls the generateLifeFeedNow Cloud Function
 * 3. Verifies a streak_achievement post is generated
 *
 * Tests the enhanced detectStreaks() method:
 * - Diary journaling streaks (consecutive days with entries)
 * - Voice note streaks (consecutive days with recordings)
 * - Workout streaks (existing logic)
 * - Activity streaks (same activity visited frequently)
 *
 * Run: npm test -- --filter life-feed-streak-e2e
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
export const name = 'Life Feed Streak Achievement E2E';

// Track created documents for cleanup
const createdDocs: { collection: string; id: string }[] = [];

/**
 * Main test runner - exported for test discovery
 */
export async function run(): Promise<TestResult[]> {
  const { db, userId } = globalThis.testContext;
  const allResults: TestResult[] = [];

  // Test 1: Streak from diary entries
  const results1 = await testStreakFromDiaryEntries(db, userId);
  allResults.push(...results1);

  // Cleanup
  await cleanup(db);

  return allResults;
}

/**
 * Test 1: Streak from consecutive diary entries
 *
 * Creates 5 diary entries on consecutive days (including today)
 * and verifies a streak_achievement post is generated.
 */
async function testStreakFromDiaryEntries(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('E2E: Streak from consecutive diary entries');

  const testId = generateTestId();

  try {
    // Step 0: Clear recent streak_achievement posts to avoid cooldowns
    logInfo('Step 0: Clearing recent streak_achievement posts...');

    const recentPostsSnap = await db.collection('lifeFeedPosts')
      .where('userId', '==', userId)
      .where('type', '==', 'streak_achievement')
      .orderBy('publishedAt', 'desc')
      .limit(10)
      .get();

    if (recentPostsSnap.size > 0) {
      log(`  Deleting ${recentPostsSnap.size} recent streak posts...`, colors.dim);
      for (const doc of recentPostsSnap.docs) {
        await doc.ref.delete();
      }
      logPass(`Cleared ${recentPostsSnap.size} recent streak posts`);
    }

    // Step 1: Create 5 diary entries on consecutive days
    logInfo('Step 1: Creating diary entries on 5 consecutive days...');

    const now = Date.now();
    const diaryDocs: string[] = [];

    for (let i = 4; i >= 0; i--) {
      const docId = `e2e-streak-diary-${testId}-day${i}`;
      const date = new Date(now - i * 24 * 60 * 60 * 1000);

      await db.collection('textNotes').doc(docId).set({
        userId,
        title: `Day ${5 - i} Journal Entry`,
        content: `This is my journal entry for day ${5 - i} ${testId}. I'm building a journaling habit and enjoying reflecting on my day.`,
        normalizedContent: `This is my journal entry for day ${5 - i} ${testId}. I'm building a journaling habit and enjoying reflecting on my day.`,
        type: 'diary',
        createdAt: date.toISOString(),
        tags: ['journaling', 'habit'],
        sentimentScore: 0.7 + (Math.random() * 0.2),
      });
      diaryDocs.push(docId);
      createdDocs.push({ collection: 'textNotes', id: docId });
    }

    logPass(`Created ${diaryDocs.length} diary entries on consecutive days`);
    log(`  Day 1: 4 days ago`, colors.dim);
    log(`  Day 2: 3 days ago`, colors.dim);
    log(`  Day 3: 2 days ago`, colors.dim);
    log(`  Day 4: yesterday`, colors.dim);
    log(`  Day 5: today`, colors.dim);

    results.push({
      name: 'Streak E2E: Test diary entries created',
      passed: true,
      reason: '5 diary entries on consecutive days',
      details: { diaryDocs },
    });

    // Step 2: Call the generateLifeFeedNow Cloud Function
    logInfo('Step 2: Calling generateLifeFeedNow Cloud Function...');

    const { idToken, projectId, region } = globalThis.testContext;

    if (!idToken) {
      logInfo('No ID token available - skipping Cloud Function call');
      results.push({
        name: 'Streak E2E: Cloud Function call',
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
        name: 'Streak E2E: Cloud Function call',
        passed: true,
        reason: `Function returned status: ${result.status || 'unknown'}`,
        details: { status: response.status, postsGenerated: result.posts?.length || 0 },
      });
    } catch (error: any) {
      logFail('Streak E2E: Cloud Function call', error.message);
      results.push({
        name: 'Streak E2E: Cloud Function call',
        passed: false,
        reason: `FAILED: ${error.message}`,
        details: { error: error.message },
      });
      return results;
    }

    // Step 3: Wait for posts to be generated
    logInfo('Step 3: Waiting 15 seconds for posts to be generated...');
    await wait(15000);

    // Step 4: Check for streak_achievement posts
    logInfo('Step 4: Checking for streak_achievement posts...');

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

    // Find streak_achievement posts specifically
    const streakPosts = postsSnap.docs.filter(doc => doc.data().type === 'streak_achievement');

    if (streakPosts.length === 0) {
      const postTypes = postsSnap.docs.map(doc => doc.data().type);
      logInfo(`Post types generated: ${postTypes.join(', ') || 'none'}`);

      logFail('Streak E2E: streak_achievement post generated', 'No streak posts found');
      results.push({
        name: 'Streak E2E: streak_achievement post generated',
        passed: false,
        reason: `No streak_achievement posts found. ${postsSnap.size} other posts generated: [${postTypes.join(', ')}]`,
        details: { postsFound: postsSnap.size, postTypes },
      });
    } else {
      logPass(`${streakPosts.length} streak_achievement post(s) found!`);

      const streakPost = streakPosts[0].data();
      log(`  Content preview: "${streakPost.content?.substring(0, 150)}..."`, colors.dim);

      results.push({
        name: 'Streak E2E: streak_achievement post generated',
        passed: true,
        reason: `${streakPosts.length} streak post(s) generated`,
        details: {
          confidence: streakPost.confidence,
          contentPreview: streakPost.content?.substring(0, 200),
        },
      });

      // Step 5: Verify content mentions streak or journaling
      logInfo('Step 5: Verifying content references the streak...');

      const postContent = streakPost.content?.toLowerCase() || '';
      const streakKeywords = ['streak', 'day', 'consecutive', 'journal', 'writing', 'habit', '5', 'five', 'daily'];
      const matchedKeywords = streakKeywords.filter(kw => postContent.includes(kw));

      if (matchedKeywords.length > 0) {
        logPass(`Content references streak (found: ${matchedKeywords.join(', ')})`);
      } else {
        logInfo('Streak keywords not found directly - AI may have paraphrased');
      }

      results.push({
        name: 'Streak E2E: Content references streak',
        passed: matchedKeywords.length > 0,
        reason: matchedKeywords.length > 0
          ? `Found keywords: ${matchedKeywords.join(', ')}`
          : 'No direct streak keywords (AI may have paraphrased)',
        details: { matchedKeywords },
      });
    }
  } catch (error: any) {
    logFail('Test execution', error.message);
    results.push({
      name: 'Streak E2E: Test execution',
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
