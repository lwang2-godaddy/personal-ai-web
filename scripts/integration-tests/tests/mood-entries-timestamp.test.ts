/**
 * MoodEntries Timestamp Query - Integration Test
 *
 * Tests the fix for generateMoodPatterns scheduler query.
 *
 * BUG (Fixed Feb 2026):
 * - moodEntries.createdAt is stored as Firestore Timestamp (serverTimestamp())
 * - generateMoodPatterns was querying with: .where('createdAt', '>=', thirtyDaysAgo.getTime())
 * - getTime() returns a number (ms), but createdAt is Timestamp object
 * - Result: Type mismatch → 0 users found
 *
 * FIX:
 * - Changed to: .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
 *
 * Test Cases:
 * 1. Verify moodEntries.createdAt is stored as Firestore Timestamp (not number)
 * 2. Verify query with Timestamp.fromDate() returns results
 * 3. Verify query with getTime() returns 0 results (demonstrating the bug)
 * 4. Test the actual generateMoodPatterns query pattern
 */

import * as admin from 'firebase-admin';
import type { TestResult } from '../lib/test-utils';
import {
  generateTestId,
  getDateNDaysAgo,
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
export const name = 'MoodEntries Timestamp Query Fix';

// Test data cleanup tracker
const createdDocIds: { collection: string; id: string }[] = [];

/**
 * Main test runner - exported for test discovery
 */
export async function run(): Promise<TestResult[]> {
  const { db, userId } = globalThis.testContext;
  const allResults: TestResult[] = [];

  // Test Case 1: Check existing moodEntries createdAt format
  const test1Results = await testMoodEntriesDateFormat(db, userId);
  allResults.push(...test1Results);

  // Test Case 2: Create test moodEntry with serverTimestamp
  const test2Results = await testCreateMoodEntryWithTimestamp(db, userId);
  allResults.push(...test2Results);

  // Test Case 3: Query with Timestamp.fromDate (CORRECT - should find results)
  const test3Results = await testQueryWithTimestampFromDate(db, userId);
  allResults.push(...test3Results);

  // Test Case 4: Query with getTime() (BUG - should find 0 results)
  const test4Results = await testQueryWithGetTime(db, userId);
  allResults.push(...test4Results);

  // Test Case 5: Simulate generateMoodPatterns query pattern
  const test5Results = await testGenerateMoodPatternsQuery(db, userId);
  allResults.push(...test5Results);

  // Cleanup
  await cleanup(db);

  return allResults;
}

/**
 * Test Case 1: Check if existing moodEntries have Timestamp createdAt
 */
async function testMoodEntriesDateFormat(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const testName = 'moodEntries createdAt is Firestore Timestamp';
  logTestCase(testName);

  try {
    // Get a sample moodEntry
    const snapshot = await db.collection('moodEntries')
      .where('userId', '==', userId)
      .limit(5)
      .get();

    if (snapshot.empty) {
      logInfo('No moodEntries found for user - will create test data');
      return [{
        name: testName,
        passed: true,
        reason: 'No existing moodEntries to check - will test with created data',
        details: { existingEntries: 0 },
      }];
    }

    let timestampCount = 0;
    let numberCount = 0;
    let otherCount = 0;

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt;

      if (createdAt && typeof createdAt.toDate === 'function') {
        timestampCount++;
      } else if (typeof createdAt === 'number') {
        numberCount++;
      } else {
        otherCount++;
      }
    });

    const passed = timestampCount > 0 && numberCount === 0;

    if (passed) {
      logPass(`Found ${timestampCount} entries with Timestamp createdAt`);
    } else {
      logFail(`Found ${timestampCount} Timestamp, ${numberCount} number, ${otherCount} other`);
    }

    return [{
      name: testName,
      passed,
      reason: passed
        ? `All ${timestampCount} checked entries use Timestamp`
        : `Found ${numberCount} entries with number createdAt (should be Timestamp)`,
      details: {
        totalChecked: snapshot.size,
        timestampCount,
        numberCount,
        otherCount,
      },
    }];
  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    return [{
      name: testName,
      passed: false,
      reason: `Error checking moodEntries: ${error.message}`,
    }];
  }
}

/**
 * Test Case 2: Create a test moodEntry with serverTimestamp
 */
async function testCreateMoodEntryWithTimestamp(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const testName = 'Create moodEntry with serverTimestamp() creates Timestamp';
  logTestCase(testName);

  try {
    const testId = generateTestId();
    const moodEntry = {
      userId,
      sourceType: 'test',
      sourceId: testId,
      primaryEmotion: 'neutral',
      secondaryEmotions: [],
      intensity: 3,
      sentimentScore: 0,
      analysisConfidence: 1.0,
      extractedThemes: ['test'],
      contextualFactors: {
        timeOfDay: 'afternoon',
        dayOfWeek: new Date().getDay(),
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      analyzedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('moodEntries').add(moodEntry);
    createdDocIds.push({ collection: 'moodEntries', id: docRef.id });

    // Wait for write to complete
    await wait(500);

    // Read back and verify
    const doc = await docRef.get();
    const data = doc.data();

    if (!data) {
      logFail('Document not found after creation');
      return [{
        name: testName,
        passed: false,
        reason: 'Document not found after creation',
      }];
    }

    const createdAt = data.createdAt;
    const isTimestamp = createdAt && typeof createdAt.toDate === 'function';

    if (isTimestamp) {
      logPass(`createdAt is Timestamp: ${createdAt.toDate().toISOString()}`);
    } else {
      logFail(`createdAt is ${typeof createdAt}, expected Timestamp`);
    }

    return [{
      name: testName,
      passed: isTimestamp,
      reason: isTimestamp
        ? 'serverTimestamp() correctly creates Firestore Timestamp'
        : `Expected Timestamp but got ${typeof createdAt}`,
      details: {
        docId: docRef.id,
        createdAtType: typeof createdAt,
        isTimestamp,
      },
    }];
  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    return [{
      name: testName,
      passed: false,
      reason: `Error creating test moodEntry: ${error.message}`,
    }];
  }
}

/**
 * Test Case 3: Query with Timestamp.fromDate (CORRECT method)
 */
async function testQueryWithTimestampFromDate(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const testName = 'Query with Timestamp.fromDate() finds results';
  logTestCase(testName);

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    logQueryBox('moodEntries', [
      `where createdAt >= Timestamp.fromDate(${thirtyDaysAgo.toISOString()})`,
    ]);

    const snapshot = await db.collection('moodEntries')
      .where('userId', '==', userId)
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
      .limit(10)
      .get();

    const passed = snapshot.size > 0;

    if (passed) {
      logPass(`Found ${snapshot.size} moodEntries using Timestamp.fromDate()`);
    } else {
      logFail('No results found - may need more test data');
    }

    return [{
      name: testName,
      passed,
      reason: passed
        ? `Query with Timestamp.fromDate() found ${snapshot.size} results`
        : 'No moodEntries found in last 30 days',
      details: {
        resultCount: snapshot.size,
        queryDate: thirtyDaysAgo.toISOString(),
        queryMethod: 'Timestamp.fromDate()',
      },
    }];
  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    return [{
      name: testName,
      passed: false,
      reason: `Query error: ${error.message}`,
    }];
  }
}

/**
 * Test Case 4: Query with getTime() (BUG - demonstrates the issue)
 */
async function testQueryWithGetTime(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const testName = 'Query with getTime() returns 0 results (demonstrating bug)';
  logTestCase(testName);

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoMs = thirtyDaysAgo.getTime();

    logQueryBox('moodEntries', [
      `where createdAt >= ${thirtyDaysAgoMs} (number in ms)`,
    ]);

    const snapshot = await db.collection('moodEntries')
      .where('userId', '==', userId)
      .where('createdAt', '>=', thirtyDaysAgoMs)
      .limit(10)
      .get();

    // This SHOULD return 0 because of type mismatch (Timestamp vs number)
    const passed = snapshot.size === 0;

    if (passed) {
      logPass('Correctly returned 0 results (type mismatch: Timestamp vs number)');
    } else {
      logFail(`Unexpectedly found ${snapshot.size} results`);
    }

    return [{
      name: testName,
      passed,
      reason: passed
        ? 'Type mismatch correctly causes 0 results (this is the bug we fixed)'
        : `Expected 0 results but got ${snapshot.size} (unexpected)`,
      details: {
        resultCount: snapshot.size,
        queryValue: thirtyDaysAgoMs,
        queryValueType: 'number (ms)',
        expectedBehavior: '0 results due to type mismatch',
      },
    }];
  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    return [{
      name: testName,
      passed: false,
      reason: `Query error: ${error.message}`,
    }];
  }
}

/**
 * Test Case 5: Simulate the exact generateMoodPatterns query pattern
 */
async function testGenerateMoodPatternsQuery(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const testName = 'generateMoodPatterns query pattern (fixed version)';
  logTestCase(testName);

  try {
    // This is the FIXED query pattern from generateMoodPatterns
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    logInfo('Simulating generateMoodPatterns scheduler query...');
    logQueryBox('moodEntries', [
      'where createdAt >= Timestamp.fromDate(thirtyDaysAgo)',
      'select userId',
      'limit 100',
    ]);

    // Fixed query using Timestamp.fromDate()
    const usersWithMoodData = await db
      .collection('moodEntries')
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
      .select('userId')
      .limit(100)
      .get();

    const uniqueUserIds = new Set<string>();
    usersWithMoodData.forEach((doc) => {
      const docUserId = doc.data().userId;
      if (docUserId) uniqueUserIds.add(docUserId);
    });

    const userCount = uniqueUserIds.size;
    const passed = userCount > 0;

    if (passed) {
      logPass(`Found ${userCount} unique users with recent mood data`);
    } else {
      logFail('No users found - scheduler would skip processing');
    }

    return [{
      name: testName,
      passed,
      reason: passed
        ? `Fixed query found ${userCount} users with mood data in last 30 days`
        : 'No users found (may need more data or longer time window)',
      details: {
        uniqueUserCount: userCount,
        totalMoodEntries: usersWithMoodData.size,
        queryWindow: '30 days',
        fixApplied: 'Timestamp.fromDate() instead of getTime()',
      },
    }];
  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    return [{
      name: testName,
      passed: false,
      reason: `Query simulation error: ${error.message}`,
    }];
  }
}

/**
 * Cleanup test data
 */
async function cleanup(db: admin.firestore.Firestore): Promise<void> {
  if (createdDocIds.length === 0) {
    return;
  }

  // Build array of strings describing items to cleanup
  const cleanupItems = createdDocIds.map(
    ({ collection, id }) => `${collection}/${id}`
  );
  logCleanup(cleanupItems);

  let deleted = 0;
  let failed = 0;

  for (const { collection, id } of createdDocIds) {
    try {
      await db.collection(collection).doc(id).delete();
      deleted++;
    } catch (error) {
      failed++;
    }
  }

  // logCleanupResult expects (success: boolean, message?: string)
  const success = failed === 0;
  const message = success
    ? undefined
    : `Deleted ${deleted}, failed ${failed}`;
  logCleanupResult(success, message);
}

/**
 * Cleanup function exported for test runner
 */
export async function cleanupTestData(): Promise<void> {
  const { db } = globalThis.testContext;
  await cleanup(db);
}
