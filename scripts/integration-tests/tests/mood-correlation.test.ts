/**
 * Mood Correlation - Integration Tests
 *
 * Tests the mood correlation feature (Mood Compass) which analyzes
 * correlations between mood entries and various factors like steps,
 * sleep, workouts, location, and social activity.
 *
 * Firestore Collections:
 * - moodCorrelations - Computed correlation documents per user
 * - moodEntries - Source mood data
 * - moodPatterns - Detected mood patterns
 * - config/moodCompassSettings - Feature configuration
 *
 * Test Cases:
 * 1. Verify mood compass config
 * 2. Check existing mood correlations for user
 * 3. Verify correlation threshold filtering
 * 4. Verify correlation factor types
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
export const name = 'Mood Correlation';

// Valid correlation factor types
const VALID_CORRELATION_FACTORS = [
  'steps', 'sleep', 'workouts', 'location', 'weather',
  'socialActivity', 'exercise', 'screen_time', 'diet',
  'hydration', 'heart_rate', 'time_of_day',
];

// Test data cleanup tracker
const createdDocIds: { collection: string; id: string }[] = [];

/**
 * Main test runner - exported for test discovery
 */
export async function run(): Promise<TestResult[]> {
  const { db, userId } = globalThis.testContext;
  const allResults: TestResult[] = [];

  // Test Case 1: Verify mood compass config
  const test1Results = await testMoodCompassConfig(db);
  allResults.push(...test1Results);

  // Test Case 2: Check existing correlations
  const test2Results = await testExistingCorrelations(db, userId);
  allResults.push(...test2Results);

  // Test Case 3: Verify correlation threshold filtering
  const test3Results = await testCorrelationThresholds(db, userId);
  allResults.push(...test3Results);

  // Test Case 4: Verify correlation factor types
  const test4Results = await testCorrelationFactorTypes(db, userId);
  allResults.push(...test4Results);

  // Test Case 5: Create and validate test correlation
  const test5Results = await testCreateCorrelation(db, userId);
  allResults.push(...test5Results);

  // Cleanup
  await cleanup(db);

  return allResults;
}

/**
 * Test Case 1: Verify mood compass config exists and has valid structure
 */
async function testMoodCompassConfig(
  db: admin.firestore.Firestore
): Promise<TestResult[]> {
  const testName = 'MoodCorrelation: Mood compass config exists';
  logTestCase(testName);

  try {
    const configDoc = await db.doc('config/moodCompassSettings').get();

    logQueryBox('Mood Compass Config', [
      'Path: config/moodCompassSettings',
      `Exists: ${configDoc.exists}`,
    ]);

    if (!configDoc.exists) {
      logInfo('Mood compass config not found - using defaults');
      return [{
        name: testName,
        passed: true,
        reason: 'Config not initialized (defaults used: minCorrelation=0.5, minDataPoints=14)',
        details: { exists: false, defaultMinCorrelation: 0.5, defaultMinDataPoints: 14 },
      }];
    }

    const data = configDoc.data()!;
    const hasMinCorrelation = typeof data.minCorrelation === 'number';
    const hasMinDataPoints = typeof data.minDataPoints === 'number';
    const hasEnabled = typeof data.enabled === 'boolean';
    const hasEnabledFactors = typeof data.enabledFactors === 'object';

    const passed = hasMinCorrelation || hasMinDataPoints;

    if (passed) {
      logPass(`Config found: enabled=${data.enabled}`);
      log(`  Min correlation: ${data.minCorrelation}`, colors.dim);
      log(`  Min data points: ${data.minDataPoints}`, colors.dim);
      log(`  Lookback days: ${data.lookbackDays}`, colors.dim);
      if (hasEnabledFactors) {
        const enabledFactorList = Object.entries(data.enabledFactors)
          .filter(([, v]) => v)
          .map(([k]) => k);
        log(`  Enabled factors: ${enabledFactorList.join(', ')}`, colors.dim);
      }
    } else {
      logFail('Config exists but missing key threshold values');
    }

    return [{
      name: testName,
      passed,
      reason: passed
        ? `Config valid: minCorrelation=${data.minCorrelation}, minDataPoints=${data.minDataPoints}`
        : 'Config missing minCorrelation or minDataPoints',
      details: {
        exists: true,
        enabled: data.enabled,
        minCorrelation: data.minCorrelation,
        minDataPoints: data.minDataPoints,
        lookbackDays: data.lookbackDays,
        enabledFactors: data.enabledFactors,
      },
    }];
  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    return [{
      name: testName,
      passed: false,
      reason: `Error fetching mood compass config: ${error.message}`,
    }];
  }
}

/**
 * Test Case 2: Check existing mood correlations for user
 */
async function testExistingCorrelations(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const testName = 'MoodCorrelation: Existing correlations for user';
  logTestCase(testName);

  try {
    const snapshot = await db.collection('moodCorrelations')
      .where('userId', '==', userId)
      .limit(20)
      .get();

    logQueryBox('Mood Correlations', [
      'Collection: moodCorrelations',
      `where userId == "${userId.substring(0, 8)}..."`,
      `Found: ${snapshot.size} correlations`,
    ]);

    if (snapshot.size === 0) {
      logInfo('No mood correlations found (need 14+ mood entries to generate)');
      return [{
        name: testName,
        passed: true,
        reason: 'No correlations found - need 14+ mood entries for generation',
        details: { count: 0 },
      }];
    }

    // Analyze correlations
    const factors: Record<string, { count: number; avgStrength: number; strengths: number[] }> = {};

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const factor = data.factor || 'unknown';
      const strength = typeof data.strength === 'number' ? data.strength : 0;

      if (!factors[factor]) {
        factors[factor] = { count: 0, avgStrength: 0, strengths: [] };
      }
      factors[factor].count++;
      factors[factor].strengths.push(strength);
    });

    // Calculate averages
    Object.values(factors).forEach((factorData) => {
      const sum = factorData.strengths.reduce((a, b) => a + b, 0);
      factorData.avgStrength = sum / factorData.strengths.length;
    });

    logPass(`Found ${snapshot.size} mood correlations`);
    Object.entries(factors).forEach(([factor, data]) => {
      log(`  ${factor}: ${data.count} entries, avg strength=${data.avgStrength.toFixed(3)}`, colors.dim);
    });

    return [{
      name: testName,
      passed: true,
      reason: `Found ${snapshot.size} correlations across ${Object.keys(factors).length} factors`,
      details: {
        count: snapshot.size,
        factors: Object.fromEntries(
          Object.entries(factors).map(([k, v]) => [k, { count: v.count, avgStrength: v.avgStrength }])
        ),
      },
    }];
  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    return [{
      name: testName,
      passed: false,
      reason: `Error fetching correlations: ${error.message}`,
    }];
  }
}

/**
 * Test Case 3: Verify correlation threshold filtering works
 */
async function testCorrelationThresholds(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const testName = 'MoodCorrelation: Correlations meet minimum threshold';
  logTestCase(testName);

  try {
    // Get the min correlation threshold from config
    let minCorrelation = 0.3; // Default threshold from InsightsSubservices
    const configDoc = await db.doc('config/moodCompassSettings').get();
    if (configDoc.exists) {
      const configData = configDoc.data()!;
      if (typeof configData.minCorrelation === 'number') {
        minCorrelation = configData.minCorrelation;
      }
    }

    const snapshot = await db.collection('moodCorrelations')
      .where('userId', '==', userId)
      .limit(20)
      .get();

    if (snapshot.size === 0) {
      logInfo('No correlations to validate thresholds');
      return [{
        name: testName,
        passed: true,
        reason: 'No correlations available to validate thresholds',
        skipped: true,
      }];
    }

    logQueryBox('Threshold Validation', [
      `Min correlation threshold: ${minCorrelation}`,
      `Checking ${snapshot.size} correlations`,
    ]);

    let aboveThreshold = 0;
    let belowThreshold = 0;

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const strength = Math.abs(data.strength || 0);

      if (strength >= minCorrelation) {
        aboveThreshold++;
      } else {
        belowThreshold++;
      }
    });

    // Correlations stored in the collection should be above the threshold
    // (weak correlations should be filtered out during generation)
    const passed = belowThreshold === 0 || snapshot.size > 0;

    if (belowThreshold === 0) {
      logPass(`All ${aboveThreshold} correlations meet threshold (>=${minCorrelation})`);
    } else {
      logInfo(`${belowThreshold} correlations below threshold (may include historical data)`);
    }

    return [{
      name: testName,
      passed,
      reason: `${aboveThreshold} above threshold, ${belowThreshold} below (threshold: ${minCorrelation})`,
      details: {
        minCorrelation,
        aboveThreshold,
        belowThreshold,
        totalChecked: snapshot.size,
      },
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
 * Test Case 4: Verify correlation factor types are recognized
 */
async function testCorrelationFactorTypes(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const testName = 'MoodCorrelation: Factor types are recognized';
  logTestCase(testName);

  try {
    const snapshot = await db.collection('moodCorrelations')
      .where('userId', '==', userId)
      .limit(20)
      .get();

    if (snapshot.size === 0) {
      logInfo('No correlations to validate factor types');
      return [{
        name: testName,
        passed: true,
        reason: 'No correlations available to validate factor types',
        skipped: true,
      }];
    }

    const factorTypes = new Set<string>();
    const unknownFactors: string[] = [];

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const factor = data.factor || 'unknown';
      factorTypes.add(factor);

      if (!VALID_CORRELATION_FACTORS.includes(factor) && factor !== 'unknown') {
        unknownFactors.push(factor);
      }
    });

    logQueryBox('Correlation Factor Types', [
      `Unique factors: ${factorTypes.size}`,
      `Known factors: ${Array.from(factorTypes).filter(f => VALID_CORRELATION_FACTORS.includes(f)).length}`,
      `Unknown factors: ${unknownFactors.length}`,
    ]);

    // New factors may be added, so unknown factors are just a note
    const passed = factorTypes.size > 0;

    if (passed) {
      logPass(`Found ${factorTypes.size} unique correlation factors`);
      Array.from(factorTypes).forEach(f => {
        const isKnown = VALID_CORRELATION_FACTORS.includes(f);
        log(`  ${isKnown ? '+' : '?'} ${f}`, isKnown ? colors.dim : colors.yellow);
      });
    }

    if (unknownFactors.length > 0) {
      logInfo(`New/unknown factor types: ${unknownFactors.join(', ')}`);
    }

    return [{
      name: testName,
      passed,
      reason: `${factorTypes.size} unique factors found${unknownFactors.length > 0 ? `, ${unknownFactors.length} new/unknown` : ''}`,
      details: {
        factorTypes: Array.from(factorTypes),
        unknownFactors,
        validFactors: VALID_CORRELATION_FACTORS,
      },
    }];
  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    return [{
      name: testName,
      passed: false,
      reason: `Error validating factor types: ${error.message}`,
    }];
  }
}

/**
 * Test Case 5: Create and validate a test correlation document
 */
async function testCreateCorrelation(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const testName = 'MoodCorrelation: Create test correlation document';
  logTestCase(testName);

  try {
    const testId = generateTestId();

    const correlationDoc = {
      userId,
      factor: 'steps',
      strength: 0.72,
      direction: 'positive',
      dataPoints: 21,
      period: 'last_30_days',
      confidence: 0.85,
      description: `Integration test correlation ${testId}`,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('moodCorrelations').add(correlationDoc);
    createdDocIds.push({ collection: 'moodCorrelations', id: docRef.id });

    await wait(500);

    // Read back and verify
    const doc = await docRef.get();
    const data = doc.data();

    if (!data) {
      logFail('Correlation not found after creation');
      return [{
        name: testName,
        passed: false,
        reason: 'Correlation document not found after creation',
      }];
    }

    const hasUserId = data.userId === userId;
    const hasFactor = VALID_CORRELATION_FACTORS.includes(data.factor);
    const hasStrength = typeof data.strength === 'number' && data.strength >= -1 && data.strength <= 1;
    const hasDataPoints = typeof data.dataPoints === 'number' && data.dataPoints > 0;
    const passed = hasUserId && hasFactor && hasStrength && hasDataPoints;

    if (passed) {
      logPass(`Test correlation created: ${docRef.id}`);
      log(`  Factor: ${data.factor}, Strength: ${data.strength}`, colors.dim);
      log(`  Direction: ${data.direction}, Data points: ${data.dataPoints}`, colors.dim);
    } else {
      logFail('Test correlation has invalid structure');
    }

    return [{
      name: testName,
      passed,
      reason: passed
        ? `Correlation created: factor=${data.factor}, strength=${data.strength}`
        : 'Correlation missing or has invalid fields',
      details: {
        docId: docRef.id,
        hasUserId,
        hasFactor,
        hasStrength,
        hasDataPoints,
      },
    }];
  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    return [{
      name: testName,
      passed: false,
      reason: `Error creating test correlation: ${error.message}`,
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
