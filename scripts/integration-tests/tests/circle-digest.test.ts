/**
 * Circle Digest - Integration Tests
 *
 * Tests the circle insights feature which generates analytics and insights
 * for Close Friend Circles, including shared activity patterns, group
 * achievements, and contribution analysis.
 *
 * Firestore Collections:
 * - circles - Circle metadata
 * - circleMembers - Circle membership records
 * - circleAnalytics - Generated circle analytics/insights
 *
 * Test Cases:
 * 1. Fetch circles for user
 * 2. Verify circle insight types are valid
 * 3. Verify circle analytics has required fields
 * 4. Create test circle with analytics
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
export const name = 'Circle Digest';

// Valid circle insight types from the Circle model
const VALID_INSIGHT_TYPES = ['pattern', 'achievement', 'suggestion'];

// Test data cleanup tracker
const createdDocIds: { collection: string; id: string }[] = [];

/**
 * Main test runner - exported for test discovery
 */
export async function run(): Promise<TestResult[]> {
  const { db, userId } = globalThis.testContext;
  const allResults: TestResult[] = [];

  // Test Case 1: Fetch circles for user
  const test1Results = await testFetchCircles(db, userId);
  allResults.push(...test1Results);

  // Test Case 2: Verify insight types are valid
  const test2Results = await testInsightTypes(db, userId);
  allResults.push(...test2Results);

  // Test Case 3: Verify analytics required fields
  const test3Results = await testAnalyticsRequiredFields(db, userId);
  allResults.push(...test3Results);

  // Test Case 4: Create test circle with analytics
  const test4Results = await testCreateCircleAnalytics(db, userId);
  allResults.push(...test4Results);

  // Cleanup
  await cleanup(db);

  return allResults;
}

/**
 * Test Case 1: Fetch circles for user
 */
async function testFetchCircles(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const testName = 'CircleDigest: Fetch circles for user';
  logTestCase(testName);

  try {
    // Check circles where user is a member (memberIds array contains userId)
    const snapshot = await db.collection('circles')
      .where('memberIds', 'array-contains', userId)
      .limit(10)
      .get();

    logQueryBox('User Circles', [
      'Collection: circles',
      `where memberIds array-contains "${userId.substring(0, 8)}..."`,
      `Found: ${snapshot.size} circles`,
    ]);

    if (snapshot.size === 0) {
      // Also check for circles created by the user
      const createdBySnapshot = await db.collection('circles')
        .where('createdBy', '==', userId)
        .limit(10)
        .get();

      if (createdBySnapshot.size > 0) {
        logPass(`Found ${createdBySnapshot.size} circles created by user`);
        return [{
          name: testName,
          passed: true,
          reason: `Found ${createdBySnapshot.size} circles created by user`,
          details: { memberOfCount: 0, createdByCount: createdBySnapshot.size },
        }];
      }

      logInfo('No circles found for user (feature may not be used)');
      return [{
        name: testName,
        passed: true,
        reason: 'No circles found - feature may not be used yet',
        details: { count: 0 },
      }];
    }

    // Analyze circles
    const circleTypes: Record<string, number> = {};
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const type = data.type || 'unknown';
      circleTypes[type] = (circleTypes[type] || 0) + 1;
    });

    logPass(`Found ${snapshot.size} circles`);
    snapshot.docs.slice(0, 3).forEach((doc) => {
      const data = doc.data();
      log(`  - ${data.name || doc.id} (${data.memberIds?.length || 0} members, type: ${data.type || 'unknown'})`, colors.dim);
    });

    return [{
      name: testName,
      passed: true,
      reason: `Found ${snapshot.size} circles for user`,
      details: { count: snapshot.size, circleTypes },
    }];
  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    return [{
      name: testName,
      passed: false,
      reason: `Error fetching circles: ${error.message}`,
    }];
  }
}

/**
 * Test Case 2: Verify insight types are valid
 */
async function testInsightTypes(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const testName = 'CircleDigest: Insight types are valid';
  logTestCase(testName);

  try {
    // Check circleAnalytics collection
    const analyticsSnapshot = await db.collection('circleAnalytics')
      .limit(10)
      .get();

    logQueryBox('Circle Analytics', [
      'Collection: circleAnalytics',
      `Found: ${analyticsSnapshot.size} analytics docs`,
    ]);

    if (analyticsSnapshot.size === 0) {
      logInfo('No circle analytics found - checking inline insights in circles');

      // Check circles for inline insights
      const circlesSnapshot = await db.collection('circles')
        .where('memberIds', 'array-contains', userId)
        .limit(5)
        .get();

      let insightCount = 0;
      circlesSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (data.insights && Array.isArray(data.insights)) {
          insightCount += data.insights.length;
        }
      });

      if (insightCount === 0) {
        return [{
          name: testName,
          passed: true,
          reason: 'No circle insights generated yet',
          skipped: true,
        }];
      }
    }

    // Validate insight types in analytics
    let validCount = 0;
    let invalidCount = 0;
    const insightTypesFound: Record<string, number> = {};

    analyticsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const insights = data.insights || [];

      insights.forEach((insight: any) => {
        const type = insight.type || 'unknown';
        insightTypesFound[type] = (insightTypesFound[type] || 0) + 1;

        if (VALID_INSIGHT_TYPES.includes(type)) {
          validCount++;
        } else {
          invalidCount++;
        }
      });
    });

    const totalInsights = validCount + invalidCount;

    if (totalInsights === 0) {
      logInfo('No insights in analytics documents');
      return [{
        name: testName,
        passed: true,
        reason: 'No insights found in analytics documents',
        details: { totalInsights: 0 },
      }];
    }

    const passed = invalidCount === 0;

    if (passed) {
      logPass(`All ${validCount} insight types are valid`);
    } else {
      logFail(`${invalidCount} invalid insight types found`);
    }

    log(`  Types: ${Object.entries(insightTypesFound).map(([t, c]) => `${t}=${c}`).join(', ')}`, colors.dim);

    return [{
      name: testName,
      passed,
      reason: passed
        ? `All ${validCount} insights have valid types`
        : `${invalidCount} insights with invalid types`,
      details: { validCount, invalidCount, insightTypesFound },
    }];
  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    return [{
      name: testName,
      passed: false,
      reason: `Error validating insight types: ${error.message}`,
    }];
  }
}

/**
 * Test Case 3: Verify analytics has required fields
 */
async function testAnalyticsRequiredFields(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const testName = 'CircleDigest: Analytics has required fields';
  logTestCase(testName);

  try {
    const analyticsSnapshot = await db.collection('circleAnalytics')
      .limit(5)
      .get();

    if (analyticsSnapshot.size === 0) {
      logInfo('No circle analytics to validate');
      return [{
        name: testName,
        passed: true,
        reason: 'No circle analytics available to validate',
        skipped: true,
      }];
    }

    const requiredFields = ['circleId', 'generatedAt'];
    let validCount = 0;
    let invalidCount = 0;
    const issues: string[] = [];

    analyticsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const missingFields = requiredFields.filter(f => data[f] === undefined || data[f] === null);

      if (missingFields.length === 0) {
        validCount++;
      } else {
        invalidCount++;
        issues.push(`${doc.id}: missing ${missingFields.join(', ')}`);
      }
    });

    const passed = invalidCount === 0;

    if (passed) {
      logPass(`All ${validCount} analytics docs have required fields`);
    } else {
      logFail(`${invalidCount} analytics docs with issues`);
      issues.forEach(i => log(`    ${i}`, colors.dim));
    }

    return [{
      name: testName,
      passed,
      reason: passed
        ? `All ${validCount} analytics documents have required fields`
        : `${invalidCount} analytics documents missing fields`,
      details: { validCount, invalidCount, issues },
    }];
  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    return [{
      name: testName,
      passed: false,
      reason: `Error validating analytics fields: ${error.message}`,
    }];
  }
}

/**
 * Test Case 4: Create a test circle with analytics
 */
async function testCreateCircleAnalytics(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const testName = 'CircleDigest: Create test analytics document';
  logTestCase(testName);

  try {
    const testId = generateTestId();
    const now = new Date().toISOString();

    // Create a test circle first
    const circleDoc = {
      name: `Test Circle ${testId}`,
      description: 'Integration test circle',
      createdBy: userId,
      memberIds: [userId],
      type: 'private',
      dataSharing: {
        shareHealth: true,
        shareLocation: false,
        shareActivities: true,
        shareDiary: false,
        shareVoiceNotes: false,
        sharePhotos: false,
      },
      settings: {
        allowMemberInvites: false,
        allowChallenges: false,
        allowGroupChat: false,
        notifyOnNewMember: false,
        notifyOnActivity: false,
      },
      createdAt: now,
      updatedAt: now,
    };

    const circleRef = await db.collection('circles').add(circleDoc);
    createdDocIds.push({ collection: 'circles', id: circleRef.id });

    // Create analytics for the circle
    const analyticsDoc = {
      circleId: circleRef.id,
      generatedAt: now,
      totalActivities: 25,
      totalMessages: 100,
      activeMemberCount: 1,
      activeChallenges: 0,
      completedChallenges: 0,
      topContributors: [
        { userId, activityCount: 25, messageCount: 100 },
      ],
      insights: [
        { type: 'pattern', title: 'Test Pattern', description: 'Test description', confidence: 85 },
        { type: 'achievement', title: 'Test Achievement', description: 'Test description', confidence: 90 },
        { type: 'suggestion', title: 'Test Suggestion', description: 'Test description', confidence: 75 },
      ],
      peakActivityTimes: [
        { dayOfWeek: 1, hourOfDay: 10, activityCount: 5 },
      ],
    };

    const analyticsRef = await db.collection('circleAnalytics').add(analyticsDoc);
    createdDocIds.push({ collection: 'circleAnalytics', id: analyticsRef.id });

    await wait(500);

    // Read back and verify analytics
    const doc = await analyticsRef.get();
    const data = doc.data();

    if (!data) {
      logFail('Analytics document not found after creation');
      return [{
        name: testName,
        passed: false,
        reason: 'Analytics document not found after creation',
      }];
    }

    const hasCircleId = data.circleId === circleRef.id;
    const hasInsights = Array.isArray(data.insights) && data.insights.length === 3;
    const hasContributors = Array.isArray(data.topContributors) && data.topContributors.length > 0;
    const passed = hasCircleId && hasInsights && hasContributors;

    if (passed) {
      logPass(`Test analytics created: ${analyticsRef.id}`);
      log(`  Circle: ${circleRef.id}`, colors.dim);
      log(`  Insights: ${data.insights.length}`, colors.dim);
      log(`  Contributors: ${data.topContributors.length}`, colors.dim);
    } else {
      logFail('Analytics document missing expected data');
    }

    return [{
      name: testName,
      passed,
      reason: passed
        ? `Analytics created with ${data.insights?.length} insights and ${data.topContributors?.length} contributors`
        : 'Analytics document missing expected data',
      details: {
        circleId: circleRef.id,
        analyticsId: analyticsRef.id,
        hasCircleId,
        hasInsights,
        hasContributors,
      },
    }];
  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    return [{
      name: testName,
      passed: false,
      reason: `Error creating test analytics: ${error.message}`,
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
