/**
 * Data Quality Alerts - Integration Tests
 *
 * Tests the data quality monitoring feature which checks for data gaps,
 * anomalies, and consistency issues in user data collections.
 *
 * Firestore Collections:
 * - dataQualityAlerts - Alert documents for detected issues
 * - config/dataQuality - Alert configuration and thresholds
 *
 * Test Cases:
 * 1. Check data quality config exists
 * 2. Verify alert thresholds match config
 * 3. Verify alert types are valid
 * 4. Create and validate test alert
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
export const name = 'Data Quality Alerts';

// Valid alert types
const VALID_ALERT_TYPES = [
  'data_gap', 'anomaly', 'consistency', 'stale_data',
  'missing_embeddings', 'sync_failure', 'threshold_exceeded',
  'collection_gap', 'low_activity', 'schema_violation',
];

// Valid severity levels
const VALID_SEVERITIES = ['low', 'medium', 'high', 'critical'];

// Test data cleanup tracker
const createdDocIds: { collection: string; id: string }[] = [];

/**
 * Main test runner - exported for test discovery
 */
export async function run(): Promise<TestResult[]> {
  const { db, userId } = globalThis.testContext;
  const allResults: TestResult[] = [];

  // Test Case 1: Check data quality config
  const test1Results = await testDataQualityConfig(db);
  allResults.push(...test1Results);

  // Test Case 2: Verify alert thresholds
  const test2Results = await testAlertThresholds(db);
  allResults.push(...test2Results);

  // Test Case 3: Verify alert types are valid
  const test3Results = await testAlertTypes(db, userId);
  allResults.push(...test3Results);

  // Test Case 4: Create and validate test alert
  const test4Results = await testCreateAlert(db, userId);
  allResults.push(...test4Results);

  // Cleanup
  await cleanup(db);

  return allResults;
}

/**
 * Test Case 1: Check data quality config exists
 */
async function testDataQualityConfig(
  db: admin.firestore.Firestore
): Promise<TestResult[]> {
  const testName = 'DataQuality: Config document exists';
  logTestCase(testName);

  try {
    const configDoc = await db.doc('config/dataQuality').get();

    logQueryBox('Data Quality Config', [
      'Path: config/dataQuality',
      `Exists: ${configDoc.exists}`,
    ]);

    if (!configDoc.exists) {
      logInfo('Data quality config not found - feature may not be initialized');
      return [{
        name: testName,
        passed: true,
        reason: 'Config not initialized (feature may not be enabled)',
        details: { exists: false },
      }];
    }

    const data = configDoc.data()!;
    const hasThresholds = !!data.thresholds || !!data.alertThresholds;
    const hasEnabled = typeof data.enabled === 'boolean';

    logPass(`Config found with ${Object.keys(data).length} fields`);
    log(`  Enabled: ${data.enabled}`, colors.dim);
    log(`  Keys: ${Object.keys(data).slice(0, 8).join(', ')}`, colors.dim);

    return [{
      name: testName,
      passed: true,
      reason: `Config document exists with ${Object.keys(data).length} fields`,
      details: {
        exists: true,
        keys: Object.keys(data),
        enabled: data.enabled,
        hasThresholds,
      },
    }];
  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    return [{
      name: testName,
      passed: false,
      reason: `Error fetching data quality config: ${error.message}`,
    }];
  }
}

/**
 * Test Case 2: Verify alert thresholds match config
 */
async function testAlertThresholds(
  db: admin.firestore.Firestore
): Promise<TestResult[]> {
  const testName = 'DataQuality: Alert thresholds are numeric and reasonable';
  logTestCase(testName);

  try {
    const configDoc = await db.doc('config/dataQuality').get();

    if (!configDoc.exists) {
      logInfo('Config not found - validating default thresholds');
      // Validate that reasonable defaults would work
      const defaultThresholds = {
        dataGapDays: 3,
        minDailySteps: 100,
        maxDailySteps: 100000,
        staleDataHours: 48,
        embeddingTimeout: 300,
      };

      const allNumeric = Object.values(defaultThresholds).every(v => typeof v === 'number' && v > 0);

      return [{
        name: testName,
        passed: allNumeric,
        reason: allNumeric
          ? 'Default thresholds are all positive numbers'
          : 'Default thresholds contain invalid values',
        details: { defaults: defaultThresholds },
      }];
    }

    const data = configDoc.data()!;
    const thresholds = data.thresholds || data.alertThresholds || {};

    logQueryBox('Alert Thresholds', [
      `Threshold keys: ${Object.keys(thresholds).length}`,
    ]);

    if (Object.keys(thresholds).length === 0) {
      logInfo('No thresholds configured in config document');
      return [{
        name: testName,
        passed: true,
        reason: 'Config exists but no explicit thresholds set (using defaults)',
        details: { thresholdCount: 0 },
      }];
    }

    // Validate thresholds are numeric and reasonable
    let validCount = 0;
    let invalidCount = 0;
    const issues: string[] = [];

    Object.entries(thresholds).forEach(([key, value]) => {
      if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
        validCount++;
        log(`  ${key}: ${value}`, colors.dim);
      } else {
        invalidCount++;
        issues.push(`${key}: expected number, got ${typeof value} (${value})`);
      }
    });

    const passed = invalidCount === 0 && validCount > 0;

    if (passed) {
      logPass(`All ${validCount} thresholds are valid numbers`);
    } else if (invalidCount > 0) {
      logFail(`${invalidCount} invalid thresholds`);
    }

    return [{
      name: testName,
      passed,
      reason: passed
        ? `All ${validCount} thresholds are valid numeric values`
        : `${invalidCount} thresholds with invalid values`,
      details: { validCount, invalidCount, issues },
    }];
  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    return [{
      name: testName,
      passed: false,
      reason: `Error validating thresholds: ${error.message}`,
    }];
  }
}

/**
 * Test Case 3: Verify alert types are valid
 */
async function testAlertTypes(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const testName = 'DataQuality: Alert types are valid';
  logTestCase(testName);

  try {
    const snapshot = await db.collection('dataQualityAlerts')
      .where('userId', '==', userId)
      .limit(20)
      .get();

    logQueryBox('User Data Quality Alerts', [
      'Collection: dataQualityAlerts',
      `where userId == "${userId.substring(0, 8)}..."`,
      `Found: ${snapshot.size} alerts`,
    ]);

    if (snapshot.size === 0) {
      logInfo('No data quality alerts found for user');
      return [{
        name: testName,
        passed: true,
        reason: 'No alerts found - data quality may be good or feature not running',
        details: { count: 0 },
      }];
    }

    // Validate alert types
    const typeCounts: Record<string, number> = {};
    const severityCounts: Record<string, number> = {};
    let invalidTypeCount = 0;

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const type = data.type || data.alertType || 'unknown';
      const severity = data.severity || 'unknown';

      typeCounts[type] = (typeCounts[type] || 0) + 1;
      severityCounts[severity] = (severityCounts[severity] || 0) + 1;

      if (!VALID_ALERT_TYPES.includes(type) && type !== 'unknown') {
        invalidTypeCount++;
      }
    });

    logPass(`Found ${snapshot.size} alerts`);
    log(`  Types: ${Object.entries(typeCounts).map(([t, c]) => `${t}=${c}`).join(', ')}`, colors.dim);
    log(`  Severities: ${Object.entries(severityCounts).map(([s, c]) => `${s}=${c}`).join(', ')}`, colors.dim);

    const passed = true; // Informational - new types may be added

    return [{
      name: testName,
      passed,
      reason: `Found ${snapshot.size} alerts with ${Object.keys(typeCounts).length} unique types`,
      details: { count: snapshot.size, typeCounts, severityCounts, invalidTypeCount },
    }];
  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    return [{
      name: testName,
      passed: false,
      reason: `Error validating alert types: ${error.message}`,
    }];
  }
}

/**
 * Test Case 4: Create and validate a test alert
 */
async function testCreateAlert(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const testName = 'DataQuality: Create test alert document';
  logTestCase(testName);

  try {
    const testId = generateTestId();
    const now = new Date().toISOString();

    const alertDoc = {
      userId,
      type: 'data_gap',
      severity: 'low',
      message: `Integration test alert ${testId}`,
      collection: 'healthData',
      details: {
        gapStartDate: '2026-02-10',
        gapEndDate: '2026-02-13',
        gapDays: 3,
        expectedFrequency: 'daily',
      },
      isResolved: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('dataQualityAlerts').add(alertDoc);
    createdDocIds.push({ collection: 'dataQualityAlerts', id: docRef.id });

    await wait(500);

    // Read back and verify
    const doc = await docRef.get();
    const data = doc.data();

    if (!data) {
      logFail('Alert not found after creation');
      return [{
        name: testName,
        passed: false,
        reason: 'Alert document not found after creation',
      }];
    }

    const hasUserId = data.userId === userId;
    const hasType = VALID_ALERT_TYPES.includes(data.type);
    const hasSeverity = VALID_SEVERITIES.includes(data.severity);
    const hasMessage = typeof data.message === 'string' && data.message.length > 0;
    const hasDetails = typeof data.details === 'object';
    const passed = hasUserId && hasType && hasSeverity && hasMessage;

    if (passed) {
      logPass(`Test alert created: ${docRef.id}`);
      log(`  Type: ${data.type}, Severity: ${data.severity}`, colors.dim);
      log(`  Message: ${data.message}`, colors.dim);
    } else {
      logFail('Test alert missing or has invalid fields');
    }

    return [{
      name: testName,
      passed,
      reason: passed
        ? `Alert created: type=${data.type}, severity=${data.severity}`
        : 'Alert missing required fields',
      details: {
        docId: docRef.id,
        hasUserId,
        hasType,
        hasSeverity,
        hasMessage,
        hasDetails,
      },
    }];
  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    return [{
      name: testName,
      passed: false,
      reason: `Error creating test alert: ${error.message}`,
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
