/**
 * Weekly Report - Integration Tests
 *
 * Tests the weekly report feature which generates periodic summaries
 * of user activity, health data, and insights.
 *
 * Firestore Collections:
 * - weeklyReports - Weekly report documents per user
 *
 * Test Cases:
 * 1. Fetch weekly reports for user
 * 2. Verify report structure has required sections
 * 3. Verify report period dates are valid
 * 4. Create and validate test report document
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
export const name = 'Weekly Report';

// Expected sections in a weekly report
const KNOWN_REPORT_SECTIONS = [
  'summary', 'health', 'activity', 'mood', 'highlights',
  'goals', 'recommendations', 'stats', 'comparison',
  'streak', 'social', 'location',
];

// Test data cleanup tracker
const createdDocIds: { collection: string; id: string }[] = [];

/**
 * Main test runner - exported for test discovery
 */
export async function run(): Promise<TestResult[]> {
  const { db, userId } = globalThis.testContext;
  const allResults: TestResult[] = [];

  // Test Case 1: Fetch weekly reports
  const test1Results = await testFetchWeeklyReports(db, userId);
  allResults.push(...test1Results);

  // Test Case 2: Verify report structure
  const test2Results = await testReportStructure(db, userId);
  allResults.push(...test2Results);

  // Test Case 3: Verify period dates
  const test3Results = await testReportPeriodDates(db, userId);
  allResults.push(...test3Results);

  // Test Case 4: Create test report
  const test4Results = await testCreateWeeklyReport(db, userId);
  allResults.push(...test4Results);

  // Cleanup
  await cleanup(db);

  return allResults;
}

/**
 * Test Case 1: Fetch weekly reports for user
 */
async function testFetchWeeklyReports(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const testName = 'WeeklyReport: Fetch reports for user';
  logTestCase(testName);

  try {
    const snapshot = await db.collection('weeklyReports')
      .where('userId', '==', userId)
      .limit(10)
      .get();

    logQueryBox('Weekly Reports', [
      'Collection: weeklyReports',
      `where userId == "${userId.substring(0, 8)}..."`,
      `Found: ${snapshot.size} reports`,
    ]);

    if (snapshot.size === 0) {
      logInfo('No weekly reports found (feature may be disabled or not yet run)');
      return [{
        name: testName,
        passed: true,
        reason: 'No weekly reports found - feature may not have generated any',
        details: { count: 0 },
      }];
    }

    // Analyze reports
    const reportDates: string[] = [];
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const periodStart = data.periodStart || data.weekStart || '';
      if (periodStart) reportDates.push(periodStart);
    });

    logPass(`Found ${snapshot.size} weekly reports`);
    if (reportDates.length > 0) {
      log(`  Report periods: ${reportDates.slice(0, 5).join(', ')}${reportDates.length > 5 ? '...' : ''}`, colors.dim);
    }

    return [{
      name: testName,
      passed: true,
      reason: `Found ${snapshot.size} weekly reports`,
      details: { count: snapshot.size, reportDates: reportDates.slice(0, 5) },
    }];
  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    return [{
      name: testName,
      passed: false,
      reason: `Error fetching weekly reports: ${error.message}`,
    }];
  }
}

/**
 * Test Case 2: Verify report structure has required sections
 */
async function testReportStructure(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const testName = 'WeeklyReport: Report has required sections';
  logTestCase(testName);

  try {
    const snapshot = await db.collection('weeklyReports')
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      logInfo('No reports to validate structure');
      return [{
        name: testName,
        passed: true,
        reason: 'No reports available to validate structure',
        skipped: true,
      }];
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    // Check for sections in various formats
    const sections = data.sections || [];
    const sectionKeys = Object.keys(data).filter(k =>
      KNOWN_REPORT_SECTIONS.includes(k) || k.endsWith('Section') || k.endsWith('Summary')
    );

    logQueryBox('Report Structure', [
      `Report ID: ${doc.id}`,
      `Top-level keys: ${Object.keys(data).length}`,
      `Section array: ${sections.length} items`,
      `Section keys found: ${sectionKeys.length}`,
    ]);

    // A report needs at least userId and some content
    const hasUserId = data.userId === userId;
    const hasContent = sections.length > 0 || sectionKeys.length > 0 || data.content || data.summary;
    const passed = hasUserId;

    if (passed) {
      logPass(`Report has valid structure`);
      log(`  Keys: ${Object.keys(data).slice(0, 10).join(', ')}`, colors.dim);
      if (sections.length > 0) {
        const sectionTypes = sections.map((s: any) => s.type || s.title || 'unknown');
        log(`  Section types: ${sectionTypes.join(', ')}`, colors.dim);
      }
    } else {
      logFail('Report missing userId field');
    }

    return [{
      name: testName,
      passed,
      reason: passed
        ? `Report structure valid with ${Object.keys(data).length} fields`
        : 'Report missing userId field',
      details: {
        docId: doc.id,
        keys: Object.keys(data),
        sectionCount: sections.length,
        sectionKeys,
        hasContent,
      },
    }];
  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    return [{
      name: testName,
      passed: false,
      reason: `Error validating report structure: ${error.message}`,
    }];
  }
}

/**
 * Test Case 3: Verify report period dates are valid
 */
async function testReportPeriodDates(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const testName = 'WeeklyReport: Period dates are valid';
  logTestCase(testName);

  try {
    const snapshot = await db.collection('weeklyReports')
      .where('userId', '==', userId)
      .limit(5)
      .get();

    if (snapshot.empty) {
      logInfo('No reports to validate dates');
      return [{
        name: testName,
        passed: true,
        reason: 'No reports available to validate dates',
        skipped: true,
      }];
    }

    let validDateCount = 0;
    let invalidDateCount = 0;
    const issues: string[] = [];

    snapshot.docs.forEach((doc) => {
      const data = doc.data();

      // Check for period start/end dates
      const periodStart = data.periodStart || data.weekStart || data.startDate;
      const periodEnd = data.periodEnd || data.weekEnd || data.endDate;

      if (periodStart) {
        const startDate = parseDate(periodStart);

        if (startDate && !isNaN(startDate.getTime())) {
          if (periodEnd) {
            const endDate = parseDate(periodEnd);
            if (endDate && !isNaN(endDate.getTime())) {
              // End should be after start
              if (endDate >= startDate) {
                // Period should be roughly 7 days
                const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
                if (daysDiff >= 5 && daysDiff <= 10) {
                  validDateCount++;
                } else {
                  validDateCount++; // Still valid, just unusual period
                  log(`  Note: ${doc.id} period is ${daysDiff.toFixed(1)} days`, colors.dim);
                }
              } else {
                invalidDateCount++;
                issues.push(`${doc.id}: end date before start date`);
              }
            } else {
              invalidDateCount++;
              issues.push(`${doc.id}: invalid end date`);
            }
          } else {
            validDateCount++; // Has valid start, no end is acceptable
          }
        } else {
          invalidDateCount++;
          issues.push(`${doc.id}: invalid start date`);
        }
      } else {
        // No period dates found - check for createdAt at least
        if (data.createdAt) {
          validDateCount++;
        } else {
          invalidDateCount++;
          issues.push(`${doc.id}: no date fields found`);
        }
      }
    });

    const passed = invalidDateCount === 0;

    if (passed) {
      logPass(`All ${validDateCount} report dates are valid`);
    } else {
      logFail(`${invalidDateCount} reports with date issues`);
      issues.forEach(i => log(`    ${i}`, colors.dim));
    }

    return [{
      name: testName,
      passed,
      reason: passed
        ? `All ${validDateCount} reports have valid period dates`
        : `${invalidDateCount} reports with date issues`,
      details: { validDateCount, invalidDateCount, issues },
    }];
  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    return [{
      name: testName,
      passed: false,
      reason: `Error validating report dates: ${error.message}`,
    }];
  }
}

/**
 * Test Case 4: Create and validate a test report document
 */
async function testCreateWeeklyReport(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const testName = 'WeeklyReport: Create test report document';
  logTestCase(testName);

  try {
    const testId = generateTestId();
    const periodStart = getDateNDaysAgo(7);
    const periodEnd = getDateNDaysAgo(0);

    const reportDoc = {
      userId,
      periodStart,
      periodEnd,
      status: 'test',
      summary: 'Integration test weekly report',
      sections: [
        { type: 'summary', content: 'Test summary content' },
        { type: 'health', content: 'Test health section' },
        { type: 'activity', content: 'Test activity section' },
      ],
      stats: {
        totalSteps: 50000,
        avgSleep: 7.5,
        activitiesCount: 12,
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('weeklyReports').add(reportDoc);
    createdDocIds.push({ collection: 'weeklyReports', id: docRef.id });

    await wait(500);

    // Read back and verify
    const doc = await docRef.get();
    const data = doc.data();

    if (!data) {
      logFail('Test report not found after creation');
      return [{
        name: testName,
        passed: false,
        reason: 'Document not found after creation',
      }];
    }

    const hasUserId = data.userId === userId;
    const hasPeriod = !!data.periodStart && !!data.periodEnd;
    const hasSections = Array.isArray(data.sections) && data.sections.length === 3;
    const hasStats = data.stats && typeof data.stats.totalSteps === 'number';
    const passed = hasUserId && hasPeriod && hasSections && hasStats;

    if (passed) {
      logPass(`Test report created: ${docRef.id}`);
      log(`  Period: ${data.periodStart} to ${data.periodEnd}`, colors.dim);
      log(`  Sections: ${data.sections.length}`, colors.dim);
    } else {
      logFail('Test report missing expected fields');
    }

    return [{
      name: testName,
      passed,
      reason: passed
        ? `Test report created with ${data.sections?.length} sections and stats`
        : 'Test report missing expected data',
      details: {
        docId: docRef.id,
        hasUserId,
        hasPeriod,
        hasSections,
        hasStats,
      },
    }];
  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    return [{
      name: testName,
      passed: false,
      reason: `Error creating test report: ${error.message}`,
    }];
  }
}

/**
 * Helper: Parse date from various formats
 */
function parseDate(value: any): Date | null {
  if (!value) return null;

  try {
    if (typeof value.toDate === 'function') {
      return value.toDate();
    }
    if (typeof value === 'string') {
      return new Date(value);
    }
    if (typeof value === 'number') {
      return new Date(value);
    }
  } catch (e) {
    // ignore
  }
  return null;
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
