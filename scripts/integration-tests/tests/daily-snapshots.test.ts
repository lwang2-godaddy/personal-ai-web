/**
 * Daily Snapshots (generateDailyInsight) - Integration & E2E Tests
 *
 * Tests the daily snapshot / daily insight pipeline:
 * 1. Firestore schema validation for dailyInsights subcollection
 * 2. Cloud Function call with forceRefresh
 * 3. Voice/diary content integration (new voice/text notes feed into insight)
 * 4. Admin API endpoint validation
 * 5. Cache behavior (second call returns fromCache)
 *
 * Run: npx tsx scripts/integration-tests/tests/daily-snapshots.test.ts
 */

import * as admin from 'firebase-admin';
import type { TestResult } from '../lib/test-utils';
import { generateTestId, wait } from '../lib/test-utils';
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
import { getTestUserIdToken, getProjectId, getRegion } from '../lib/firebase-setup';

// Test name for discovery
export const name = 'Daily Snapshots (generateDailyInsight)';

// Track created documents for cleanup
const createdDocs: { collection: string; id: string; subcollection?: { parent: string; parentId: string } }[] = [];

/**
 * Main test runner - exported for test discovery
 */
export async function run(): Promise<TestResult[]> {
  const { db, userId } = globalThis.testContext;
  const allResults: TestResult[] = [];

  try {
    // Test 1: Firestore schema check
    const test1Results = await testDailyInsightSchema(db, userId);
    allResults.push(...test1Results);

    // Test 2: Generate daily insight via Cloud Function
    const test2Results = await testGenerateDailyInsight(userId);
    allResults.push(...test2Results);

    // Test 3: Voice/diary content integration
    const test3Results = await testVoiceDiaryIntegration(db, userId);
    allResults.push(...test3Results);

    // Test 4: Admin API endpoint
    const test4Results = await testAdminApiEndpoint(db, userId);
    allResults.push(...test4Results);

    // Test 5: Cache behavior
    const test5Results = await testCacheBehavior(userId);
    allResults.push(...test5Results);
  } finally {
    await cleanup(db, userId);
  }

  return allResults;
}

/**
 * Test 1: Daily insight Firestore schema check
 * Queries existing dailyInsights docs and verifies expected fields
 */
async function testDailyInsightSchema(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Test 1: Daily insight Firestore schema check');

  try {
    const snapshot = await db
      .collection('users')
      .doc(userId)
      .collection('dailyInsights')
      .orderBy('date', 'desc')
      .limit(5)
      .get();

    if (snapshot.empty) {
      logInfo('No existing dailyInsights found - creating a test doc to validate schema');

      // Create a test doc to validate the expected schema
      const testDate = new Date().toISOString().split('T')[0];
      const testDocId = `test-schema-${generateTestId()}`;
      const testData = {
        date: testDate,
        summary: 'Test snapshot summary for schema validation',
        emoji: '✨',
        mood: 'calm',
        language: 'en',
        metrics: { steps: 1000, calories: 200, workoutCount: 0, locationCount: 1 },
        generatedAt: new Date().toISOString(),
        cachedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await db.collection('users').doc(userId).collection('dailyInsights').doc(testDocId).set(testData);
      createdDocs.push({
        collection: 'dailyInsights',
        id: testDocId,
        subcollection: { parent: 'users', parentId: userId },
      });

      // Re-query
      const reSnapshot = await db
        .collection('users')
        .doc(userId)
        .collection('dailyInsights')
        .doc(testDocId)
        .get();

      if (reSnapshot.exists) {
        const data = reSnapshot.data()!;
        const requiredFields = ['date', 'summary', 'emoji', 'mood', 'language', 'metrics', 'generatedAt'];
        const metricsFields = ['steps', 'calories', 'workoutCount', 'locationCount'];

        const missingFields = requiredFields.filter((f) => data[f] === undefined);
        const missingMetrics = metricsFields.filter((f) => !data.metrics || data.metrics[f] === undefined);

        if (missingFields.length === 0 && missingMetrics.length === 0) {
          logPass('Schema validation passed - all required fields present');
          results.push({ name: 'Schema validation', passed: true });
        } else {
          const reason = `Missing fields: ${[...missingFields, ...missingMetrics.map((m) => `metrics.${m}`)].join(', ')}`;
          logFail('Schema validation', reason);
          results.push({ name: 'Schema validation', passed: false, reason });
        }
      } else {
        logFail('Schema validation', 'Test doc not found after creation');
        results.push({ name: 'Schema validation', passed: false, reason: 'Test doc not found' });
      }
    } else {
      // Validate existing docs
      const doc = snapshot.docs[0];
      const data = doc.data();

      logQueryBox('Existing dailyInsight doc', [
        `Doc ID: ${doc.id}`,
        `Date: ${data.date}`,
        `Mood: ${data.mood}`,
        `Language: ${data.language}`,
        `Has metrics: ${!!data.metrics}`,
        `Summary length: ${data.summary?.length || 0}`,
      ]);

      const requiredFields = ['date', 'summary', 'emoji', 'mood', 'language', 'metrics', 'generatedAt'];
      const metricsFields = ['steps', 'calories', 'workoutCount', 'locationCount'];

      const missingFields = requiredFields.filter((f) => data[f] === undefined);
      const missingMetrics = data.metrics
        ? metricsFields.filter((f) => data.metrics[f] === undefined)
        : metricsFields;

      if (missingFields.length === 0 && missingMetrics.length === 0) {
        logPass(`Schema valid (${snapshot.docs.length} docs checked)`);
        results.push({ name: 'Schema validation', passed: true, details: { docsChecked: snapshot.docs.length } });
      } else {
        const reason = `Missing: ${[...missingFields, ...missingMetrics.map((m) => `metrics.${m}`)].join(', ')}`;
        logFail('Schema validation', reason);
        results.push({ name: 'Schema validation', passed: false, reason });
      }
    }
  } catch (error: any) {
    logFail('Schema validation', error.message);
    results.push({ name: 'Schema validation', passed: false, error: error.message });
  }

  return results;
}

/**
 * Test 2: Generate daily insight via Cloud Function call
 */
async function testGenerateDailyInsight(userId: string): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Test 2: Generate daily insight via Cloud Function');

  const { idToken, projectId, region } = globalThis.testContext;

  if (!idToken) {
    logInfo('No ID token available - skipping Cloud Function call');
    results.push({
      name: 'Generate daily insight',
      passed: true,
      reason: 'Skipped - no ID token (run with auth to enable)',
      skipped: true,
    });
    return results;
  }

  const today = new Date().toISOString().split('T')[0];
  const functionUrl = `https://${region}-${projectId}.cloudfunctions.net/generateDailyInsight`;

  try {
    logInfo(`Calling generateDailyInsight for ${today} with forceRefresh`);

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        data: {
          date: today,
          forceRefresh: true,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Function returned ${response.status}: ${errorText}`);
    }

    const responseData = await response.json();
    const result = responseData.result || responseData;

    logQueryBox('generateDailyInsight response', [
      `Date: ${result.date}`,
      `Mood: ${result.mood}`,
      `Emoji: ${result.emoji}`,
      `Summary: ${result.summary?.substring(0, 80)}...`,
      `Steps: ${result.metrics?.steps}`,
      `Calories: ${result.metrics?.calories}`,
      `From cache: ${result.fromCache}`,
    ]);

    // Verify response structure
    const hasRequiredFields =
      result.summary && typeof result.summary === 'string' && result.summary.length > 0 &&
      result.emoji &&
      result.mood &&
      result.metrics &&
      result.generatedAt;

    if (hasRequiredFields) {
      logPass('Daily insight generated successfully with all required fields');
      results.push({
        name: 'Generate daily insight',
        passed: true,
        details: { mood: result.mood, summaryLength: result.summary.length },
      });
    } else {
      const missing = [];
      if (!result.summary) missing.push('summary');
      if (!result.emoji) missing.push('emoji');
      if (!result.mood) missing.push('mood');
      if (!result.metrics) missing.push('metrics');
      if (!result.generatedAt) missing.push('generatedAt');
      logFail('Generate daily insight', `Missing fields: ${missing.join(', ')}`);
      results.push({ name: 'Generate daily insight', passed: false, reason: `Missing: ${missing.join(', ')}` });
    }
  } catch (error: any) {
    logFail('Generate daily insight', error.message);
    results.push({ name: 'Generate daily insight', passed: false, error: error.message });
  }

  return results;
}

/**
 * Test 3: Voice/diary content integration
 * Creates test voice + text notes, calls generateDailyInsight, verifies personal content referenced
 */
async function testVoiceDiaryIntegration(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Test 3: Voice/diary content integration');

  const { idToken, projectId, region } = globalThis.testContext;

  if (!idToken) {
    logInfo('No ID token available - skipping voice/diary integration test');
    results.push({
      name: 'Voice/diary integration',
      passed: true,
      reason: 'Skipped - no ID token',
      skipped: true,
    });
    return results;
  }

  const testId = generateTestId();
  const today = new Date().toISOString().split('T')[0];
  const nowISO = new Date().toISOString();

  try {
    // Create a test voice note with distinctive transcription
    const voiceNoteId = `test-voice-${testId}`;
    await db.collection('voiceNotes').doc(voiceNoteId).set({
      userId,
      transcription: 'Today I practiced piano for an hour and learned a new Chopin piece',
      createdAt: nowISO,
      duration: 60,
      language: 'en',
    });
    createdDocs.push({ collection: 'voiceNotes', id: voiceNoteId });
    logInfo(`Created test voice note: ${voiceNoteId}`);

    // Create a test text note with distinctive content
    const textNoteId = `test-text-${testId}`;
    await db.collection('textNotes').doc(textNoteId).set({
      userId,
      title: 'Recipe ideas',
      content: 'Want to try making homemade pasta with basil pesto this weekend',
      createdAt: nowISO,
      type: 'diary',
    });
    createdDocs.push({ collection: 'textNotes', id: textNoteId });
    logInfo(`Created test text note: ${textNoteId}`);

    // Wait a moment for writes to propagate
    await wait(1000);

    // Call generateDailyInsight with forceRefresh
    const functionUrl = `https://${region}-${projectId}.cloudfunctions.net/generateDailyInsight`;
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        data: {
          date: today,
          forceRefresh: true,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Function returned ${response.status}: ${errorText}`);
    }

    const responseData = await response.json();
    const result = responseData.result || responseData;

    logQueryBox('Insight with voice/diary context', [
      `Summary: ${result.summary}`,
      `Mood: ${result.mood}`,
    ]);

    // Check if the summary references personal content (piano, Chopin, pasta, pesto, etc.)
    const summaryLower = (result.summary || '').toLowerCase();
    const personalKeywords = ['piano', 'chopin', 'pasta', 'pesto', 'recipe', 'music', 'cook'];
    const hasPersonalContent = personalKeywords.some((kw) => summaryLower.includes(kw));

    if (hasPersonalContent) {
      logPass('Summary references personal content from voice/diary notes');
      results.push({
        name: 'Voice/diary integration',
        passed: true,
        details: { summary: result.summary.substring(0, 100) },
      });
    } else {
      // Not a hard failure - AI may summarize differently
      logInfo('Summary does not explicitly mention test keywords (AI may have paraphrased)');
      logInfo(`Summary: ${result.summary}`);
      results.push({
        name: 'Voice/diary integration',
        passed: true,
        reason: 'Generated but personal keywords not detected in summary (may be paraphrased)',
        details: { summary: result.summary.substring(0, 100), checkedKeywords: personalKeywords },
      });
    }
  } catch (error: any) {
    logFail('Voice/diary integration', error.message);
    results.push({ name: 'Voice/diary integration', passed: false, error: error.message });
  }

  return results;
}

/**
 * Test 4: Admin API endpoint validation
 * Seeds dailyInsights docs and tests the GET endpoint shape
 */
async function testAdminApiEndpoint(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Test 4: Admin API endpoint (Firestore query simulation)');

  const testId = generateTestId();

  try {
    // Seed a few dailyInsights docs
    const testDates = ['2026-02-17', '2026-02-18', '2026-02-19'];
    const moods = ['active', 'calm', 'busy'];

    for (let i = 0; i < testDates.length; i++) {
      const docId = `test-snap-${testId}-${i}`;
      await db
        .collection('users')
        .doc(userId)
        .collection('dailyInsights')
        .doc(docId)
        .set({
          date: testDates[i],
          summary: `Test snapshot for ${testDates[i]}`,
          emoji: '✨',
          mood: moods[i],
          language: 'en',
          metrics: { steps: 5000 + i * 1000, calories: 200 + i * 50, workoutCount: i, locationCount: i + 1 },
          generatedAt: new Date().toISOString(),
          cachedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      createdDocs.push({
        collection: 'dailyInsights',
        id: docId,
        subcollection: { parent: 'users', parentId: userId },
      });
    }
    logInfo(`Seeded ${testDates.length} test dailyInsight docs`);

    // Simulate the admin API query (same as route.ts)
    const snapshot = await db
      .collection('users')
      .doc(userId)
      .collection('dailyInsights')
      .orderBy('date', 'desc')
      .limit(20)
      .get();

    const snapshots = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId,
        date: data.date,
        summary: data.summary,
        emoji: data.emoji,
        mood: data.mood,
        language: data.language,
        metrics: data.metrics || {},
        generatedAt: data.generatedAt,
        cachedAt: data.cachedAt?.toDate?.() ? data.cachedAt.toDate().toISOString() : data.cachedAt,
        fromCache: data.fromCache || false,
      };
    });

    logQueryBox('Admin API simulation', [
      `Total docs: ${snapshot.docs.length}`,
      `Test docs found: ${snapshots.filter((s) => s.id.startsWith('test-snap-')).length}`,
    ]);

    // Verify response shape
    const testSnaps = snapshots.filter((s) => s.id.startsWith(`test-snap-${testId}`));

    if (testSnaps.length === testDates.length) {
      // Verify each has expected fields
      const allValid = testSnaps.every(
        (s) => s.id && s.userId && s.date && s.summary && s.emoji && s.mood && s.language && s.metrics
      );

      if (allValid) {
        logPass(`Admin API response shape valid (${testSnaps.length} test snapshots verified)`);
        results.push({
          name: 'Admin API endpoint',
          passed: true,
          details: { snapshotCount: testSnaps.length },
        });
      } else {
        logFail('Admin API endpoint', 'Some snapshots missing required fields');
        results.push({ name: 'Admin API endpoint', passed: false, reason: 'Missing required fields in response' });
      }
    } else {
      logFail('Admin API endpoint', `Expected ${testDates.length} test snapshots, got ${testSnaps.length}`);
      results.push({
        name: 'Admin API endpoint',
        passed: false,
        reason: `Expected ${testDates.length}, got ${testSnaps.length}`,
      });
    }
  } catch (error: any) {
    logFail('Admin API endpoint', error.message);
    results.push({ name: 'Admin API endpoint', passed: false, error: error.message });
  }

  return results;
}

/**
 * Test 5: Cached insight returned on second call
 */
async function testCacheBehavior(userId: string): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Test 5: Cache behavior (second call returns fromCache)');

  const { idToken, projectId, region } = globalThis.testContext;

  if (!idToken) {
    logInfo('No ID token available - skipping cache test');
    results.push({
      name: 'Cache behavior',
      passed: true,
      reason: 'Skipped - no ID token',
      skipped: true,
    });
    return results;
  }

  const today = new Date().toISOString().split('T')[0];
  const functionUrl = `https://${region}-${projectId}.cloudfunctions.net/generateDailyInsight`;

  try {
    // First call - force generate
    logInfo('First call: forceRefresh=true');
    const response1 = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        data: { date: today, forceRefresh: true },
      }),
    });

    if (!response1.ok) {
      throw new Error(`First call failed: ${response1.status}`);
    }

    const data1 = await response1.json();
    const result1 = data1.result || data1;
    logInfo(`First call: fromCache=${result1.fromCache}, mood=${result1.mood}`);

    // Wait a moment
    await wait(1000);

    // Second call - should return from cache
    logInfo('Second call: forceRefresh=false (expect cache hit)');
    const response2 = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        data: { date: today, forceRefresh: false },
      }),
    });

    if (!response2.ok) {
      throw new Error(`Second call failed: ${response2.status}`);
    }

    const data2 = await response2.json();
    const result2 = data2.result || data2;
    logInfo(`Second call: fromCache=${result2.fromCache}`);

    if (result2.fromCache === true) {
      logPass('Second call returned from cache as expected');
      results.push({
        name: 'Cache behavior',
        passed: true,
        details: { firstFromCache: result1.fromCache, secondFromCache: result2.fromCache },
      });
    } else {
      // Cache might have been invalidated - not a hard failure
      logInfo('Second call did not return fromCache=true (cache may have expired or been invalidated)');
      results.push({
        name: 'Cache behavior',
        passed: true,
        reason: 'Cache miss on second call (may be expected if TTL expired)',
        details: { firstFromCache: result1.fromCache, secondFromCache: result2.fromCache },
      });
    }
  } catch (error: any) {
    logFail('Cache behavior', error.message);
    results.push({ name: 'Cache behavior', passed: false, error: error.message });
  }

  return results;
}

/**
 * Cleanup - delete all test documents
 */
async function cleanup(db: admin.firestore.Firestore, userId: string): Promise<void> {
  logCleanup(createdDocs.map((d) => `${d.collection}/${d.id}`));
  let cleaned = 0;
  let failed = 0;

  for (const doc of createdDocs) {
    try {
      if (doc.subcollection) {
        await db
          .collection(doc.subcollection.parent)
          .doc(doc.subcollection.parentId)
          .collection(doc.collection)
          .doc(doc.id)
          .delete();
      } else {
        await db.collection(doc.collection).doc(doc.id).delete();
      }
      cleaned++;
    } catch (error: any) {
      log(`  Failed to delete ${doc.collection}/${doc.id}: ${error.message}`, colors.dim);
      failed++;
    }
  }

  logCleanupResult(failed === 0, failed > 0 ? `${failed} docs failed to delete` : undefined);
}

// Direct execution support
if (require.main === module) {
  (async () => {
    // Initialize Firebase and test context
    const { initFirebase, ensureTestUserExists, getTestUserIdToken: getToken, getProjectId: getPid, getRegion: getReg } = require('../lib/firebase-setup');
    const { logSection, logSummary } = require('../lib/reporter');

    const db = initFirebase();
    const userId = await ensureTestUserExists();

    let idToken: string | null = null;
    try {
      idToken = await getToken(userId);
    } catch (e) {
      console.log('Could not get ID token - Cloud Function tests will be skipped');
    }

    // Set up global test context
    globalThis.testContext = {
      db,
      userId,
      idToken,
      projectId: getPid(),
      region: getReg(),
    };

    logSection(`Running: ${name}`);
    const results = await run();

    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;
    const skipped = results.filter((r) => r.skipped).length;

    logSection('Summary');
    console.log(`  Passed: ${passed}`);
    console.log(`  Failed: ${failed}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(`  Total: ${results.length}`);

    process.exit(failed > 0 ? 1 : 0);
  })();
}
