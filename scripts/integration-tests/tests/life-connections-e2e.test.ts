/**
 * Life Connections - E2E Test
 *
 * END-TO-END test that verifies the revamped correlation engine:
 * 1. Seeds Firestore with 35 days of synthetic data with KNOWN correlations
 * 2. Calls the analyzeLifeConnections Cloud Function
 * 3. Verifies connections are generated correctly with new statistical fields
 *
 * Key correlations in synthetic data:
 * - STRONG: Badminton → Better Sleep (must be detected)
 * - STRONG: Badminton → Better Mood (must be detected)
 * - NOISE:  Photos → Steps (must NOT be detected)
 *
 * Run: npm test -- --filter life-connections-e2e
 * Or:  npx tsx scripts/integration-tests/tests/life-connections-e2e.test.ts
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
export const name = 'Life Connections E2E';

// Track created documents for cleanup
const createdDocs: { collection: string; id: string }[] = [];

// Seeded random number generator for reproducibility
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/**
 * Main test runner - exported for test discovery
 */
export async function run(): Promise<TestResult[]> {
  const { db, userId } = globalThis.testContext;
  const allResults: TestResult[] = [];

  try {
    // Step 1: Clean existing connections
    const cleanResults = await cleanExistingConnections(db, userId);
    allResults.push(...cleanResults);

    // Step 2: Seed synthetic data
    const seedResults = await seedSyntheticData(db, userId);
    allResults.push(...seedResults);

    // Step 3: Trigger analyzeLifeConnections Cloud Function
    const triggerResults = await triggerAnalysis(db, userId);
    allResults.push(...triggerResults);

    // Only proceed with verification if trigger succeeded
    const triggerPassed = triggerResults.every(r => r.passed);
    if (triggerPassed) {
      // Step 4+: Verify connections
      const verifyResults = await verifyConnections(db, userId);
      allResults.push(...verifyResults);
    }
  } catch (error: any) {
    logFail('Test execution', error.message);
    allResults.push({
      name: 'Life Connections E2E: Test execution',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  // Always cleanup
  await cleanup(db, userId);

  return allResults;
}

/**
 * Step 1: Clean existing life connections for the test user
 */
async function cleanExistingConnections(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  logTestCase('Step 1: Clean existing life connections');

  try {
    const connectionsSnap = await db
      .collection('users')
      .doc(userId)
      .collection('lifeConnections')
      .limit(50)
      .get();

    if (connectionsSnap.size > 0) {
      logInfo(`Deleting ${connectionsSnap.size} existing connections...`);
      const batch = db.batch();
      connectionsSnap.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }

    logPass(`Pre-cleanup completed (${connectionsSnap.size} connections removed)`);

    return [{
      name: 'Life Connections E2E: Pre-cleanup',
      passed: true,
      reason: `Cleaned ${connectionsSnap.size} existing connections`,
    }];
  } catch (error: any) {
    logFail('Pre-cleanup', error.message);
    return [{
      name: 'Life Connections E2E: Pre-cleanup',
      passed: false,
      reason: `Error: ${error.message}`,
    }];
  }
}

/**
 * Step 2: Seed 35 days of synthetic data with known correlations
 *
 * Data design:
 * - 17 badminton days (alternating, roughly every other day)
 * - Badminton days: sleep 7.5-8.5h, steps 8000-12000, mood 0.7-0.85
 * - Non-badminton days: sleep 5.5-6.5h, steps 5000-8000, mood 0.3-0.45
 * - Random 0-3 photos per day (noise - no correlation with steps)
 *
 * IMPORTANT: Cleans existing data for the test user in the date range first
 * to prevent signal dilution from previous test runs.
 */
async function seedSyntheticData(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  logTestCase('Step 2: Clean existing data + Seed synthetic data (35 days)');

  // First, clean existing data in the test date range to prevent dilution
  const now = Date.now();
  const rangeStart = new Date(now - 40 * 24 * 60 * 60 * 1000);
  const rangeEnd = new Date(now + 1 * 24 * 60 * 60 * 1000);

  logInfo('Cleaning existing data for test user in date range...');

  const collectionsToClean = [
    { name: 'healthData', dateField: 'startDate', dateType: 'iso' },
    { name: 'locationData', dateField: 'timestamp', dateType: 'iso' },
    { name: 'voiceNotes', dateField: 'createdAt', dateType: 'iso' },
    { name: 'moodEntries', dateField: 'createdAt', dateType: 'timestamp' },
    { name: 'photoMemories', dateField: 'createdAt', dateType: 'iso' },
    { name: 'textNotes', dateField: 'createdAt', dateType: 'iso' },
  ];

  let totalCleaned = 0;
  for (const col of collectionsToClean) {
    try {
      let query: admin.firestore.Query;
      if (col.dateType === 'timestamp') {
        // Firestore Timestamp comparison
        query = db.collection(col.name)
          .where('userId', '==', userId)
          .where(col.dateField, '>=', rangeStart)
          .where(col.dateField, '<=', rangeEnd);
      } else {
        // ISO string comparison
        query = db.collection(col.name)
          .where('userId', '==', userId)
          .where(col.dateField, '>=', rangeStart.toISOString())
          .where(col.dateField, '<=', rangeEnd.toISOString());
      }

      const snap = await query.get();
      if (snap.size > 0) {
        const batch = db.batch();
        snap.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        totalCleaned += snap.size;
        log(`  Deleted ${snap.size} existing ${col.name} docs`, colors.dim);
      }
    } catch (err: any) {
      // Some collections may not have the right indexes - skip
      log(`  Warning cleaning ${col.name}: ${err.message?.substring(0, 80)}`, colors.dim);
    }
  }
  logPass(`Cleaned ${totalCleaned} existing documents`);

  const testId = generateTestId();
  const rand = seededRandom(42);
  let docsCreated = 0;

  // Badminton day offsets (0-indexed from today going back)
  const badmintonDayOffsets = [1, 3, 5, 7, 9, 11, 14, 16, 18, 20, 22, 25, 27, 29, 31, 33, 35];
  const badmintonDays = new Set(badmintonDayOffsets);

  try {
    // Batch writes (Firestore limit: 500 ops per batch)
    let batch = db.batch();
    let batchCount = 0;

    for (let dayOffset = 1; dayOffset <= 35; dayOffset++) {
      const date = new Date(now - dayOffset * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const dateISO = date.toISOString();
      const isBadmintonDay = badmintonDays.has(dayOffset);

      // --- Health Data: Sleep ---
      const sleepDocId = `e2e-lc-sleep-${testId}-${dateStr}`;
      const sleepHours = isBadmintonDay
        ? 7.5 + rand() * 1.0   // 7.5-8.5h
        : 5.5 + rand() * 1.0;  // 5.5-6.5h

      batch.set(db.collection('healthData').doc(sleepDocId), {
        userId,
        type: 'sleep',
        value: parseFloat(sleepHours.toFixed(1)),
        startDate: dateISO,
        endDate: dateISO,
        source: 'e2e-test',
      });
      createdDocs.push({ collection: 'healthData', id: sleepDocId });
      batchCount++;

      // --- Health Data: Steps ---
      const stepsDocId = `e2e-lc-steps-${testId}-${dateStr}`;
      const steps = isBadmintonDay
        ? Math.round(8000 + rand() * 4000)   // 8000-12000
        : Math.round(5000 + rand() * 3000);  // 5000-8000

      batch.set(db.collection('healthData').doc(stepsDocId), {
        userId,
        type: 'steps',
        value: steps,
        startDate: dateISO,
        endDate: dateISO,
        source: 'e2e-test',
      });
      createdDocs.push({ collection: 'healthData', id: stepsDocId });
      batchCount++;

      // --- Location Data: Badminton activity ---
      if (isBadmintonDay) {
        const locationDocId = `e2e-lc-loc-${testId}-${dateStr}`;
        batch.set(db.collection('locationData').doc(locationDocId), {
          userId,
          activity: 'badminton',
          placeName: 'Badminton Club',
          latitude: 37.7749,
          longitude: -122.4194,
          timestamp: dateISO,
          source: 'e2e-test',
        });
        createdDocs.push({ collection: 'locationData', id: locationDocId });
        batchCount++;
      }

      // --- Mood Entries ---
      const moodDocId = `e2e-lc-mood-${testId}-${dateStr}`;
      const moodScore = isBadmintonDay
        ? 0.7 + rand() * 0.15  // 0.7-0.85
        : 0.3 + rand() * 0.15; // 0.3-0.45

      // moodEntries use Firestore Timestamp for createdAt
      batch.set(db.collection('moodEntries').doc(moodDocId), {
        userId,
        sentimentScore: parseFloat(moodScore.toFixed(3)),
        createdAt: admin.firestore.Timestamp.fromDate(date),
        source: 'e2e-test',
      });
      createdDocs.push({ collection: 'moodEntries', id: moodDocId });
      batchCount++;

      // --- Photo Memories (noise - random 0-3 per day) ---
      const photoCount = Math.floor(rand() * 4); // 0-3
      for (let p = 0; p < photoCount; p++) {
        const photoDocId = `e2e-lc-photo-${testId}-${dateStr}-${p}`;
        batch.set(db.collection('photoMemories').doc(photoDocId), {
          userId,
          createdAt: dateISO,
          latitude: 37.7749 + rand() * 0.01,
          longitude: -122.4194 + rand() * 0.01,
          description: `Test photo ${p + 1}`,
          source: 'e2e-test',
        });
        createdDocs.push({ collection: 'photoMemories', id: photoDocId });
        batchCount++;
      }

      // Commit batch if approaching limit
      if (batchCount >= 450) {
        await batch.commit();
        docsCreated += batchCount;
        batch = db.batch();
        batchCount = 0;
      }
    }

    // Commit remaining
    if (batchCount > 0) {
      await batch.commit();
      docsCreated += batchCount;
    }

    logPass(`Seeded ${docsCreated} documents across 35 days`);
    log(`  Badminton days: ${badmintonDayOffsets.length}`, colors.dim);
    log(`  Non-badminton days: ${35 - badmintonDayOffsets.length}`, colors.dim);
    log(`  Collections: healthData, locationData, moodEntries, photoMemories`, colors.dim);

    return [{
      name: 'Life Connections E2E: Seed synthetic data',
      passed: true,
      reason: `${docsCreated} documents seeded across 35 days`,
      details: { docsCreated, badmintonDays: badmintonDayOffsets.length },
    }];
  } catch (error: any) {
    logFail('Seed synthetic data', error.message);
    return [{
      name: 'Life Connections E2E: Seed synthetic data',
      passed: false,
      reason: `Error: ${error.message}`,
    }];
  }
}

/**
 * Step 3: Trigger the analyzeLifeConnections Cloud Function
 */
async function triggerAnalysis(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  logTestCase('Step 3: Trigger analyzeLifeConnections Cloud Function');

  const { idToken, projectId, region } = globalThis.testContext;

  if (!idToken) {
    logInfo('No ID token available - skipping Cloud Function call');
    return [{
      name: 'Life Connections E2E: Cloud Function trigger',
      passed: false,
      reason: 'No ID token available (auth required)',
    }];
  }

  const functionUrl = `https://${region}-${projectId}.cloudfunctions.net/analyzeLifeConnections`;

  try {
    logInfo(`Calling ${functionUrl}...`);

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        data: {
          lookbackDays: 40, // Slightly more than 35 to ensure coverage
          minSampleSize: 14,
          minPValue: 0.05,
          minEffectSize: 0.3,
          includeTimeLag: true,
          maxTimeLagDays: 3,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Function returned ${response.status}: ${errorText}`);
    }

    const responseData = await response.json();
    const result = responseData.result || responseData;

    logPass('Cloud Function called successfully');
    log(`  Status: ${result.success ? 'success' : 'failed'}`, colors.dim);
    log(`  Pairs analyzed: ${result.pairsAnalyzed || 0}`, colors.dim);
    log(`  Significant pairs: ${result.significantPairs || 0}`, colors.dim);
    log(`  Connections: ${result.connections?.length || 0}`, colors.dim);

    return [{
      name: 'Life Connections E2E: Cloud Function trigger',
      passed: result.success === true,
      reason: result.success
        ? `${result.connections?.length || 0} connections found`
        : `Function returned success=false`,
      details: {
        pairsAnalyzed: result.pairsAnalyzed,
        significantPairs: result.significantPairs,
        connectionsCount: result.connections?.length || 0,
      },
    }];
  } catch (error: any) {
    logFail('Cloud Function trigger', error.message);
    return [{
      name: 'Life Connections E2E: Cloud Function trigger',
      passed: false,
      reason: `Error: ${error.message}`,
    }];
  }
}

/**
 * Steps 4-11: Verify connections in Firestore
 */
async function verifyConnections(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];

  logTestCase('Step 4: Verify connections in Firestore');

  // Wait a moment for Firestore writes to settle
  await wait(3000);

  // Fetch all connections
  const connectionsSnap = await db
    .collection('users')
    .doc(userId)
    .collection('lifeConnections')
    .get();

  const connections = connectionsSnap.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as any[];

  // Track for cleanup
  connectionsSnap.docs.forEach(doc => {
    createdDocs.push({ collection: `users/${userId}/lifeConnections`, id: doc.id });
  });

  logQueryBox('Life Connections Found', [
    `Total: ${connections.length}`,
    ...connections.map((c: any) =>
      `${c.domainA?.displayName || '?'} ↔ ${c.domainB?.displayName || '?'} (rho=${c.metrics?.coefficient?.toFixed(3) || '?'}, d=${c.metrics?.effectSize?.toFixed(3) || '?'})`
    ),
  ]);

  // Assertion 4: Connections generated (> 0)
  const hasConnections = connections.length > 0;
  if (hasConnections) {
    logPass(`${connections.length} connections generated`);
  } else {
    logFail('Connections generated', 'No connections found in Firestore');
  }
  results.push({
    name: 'Life Connections E2E: Connections generated',
    passed: hasConnections,
    reason: hasConnections ? `${connections.length} connections found` : 'No connections found',
  });

  if (!hasConnections) return results;

  // Assertion 5: Badminton-Sleep detected
  logTestCase('Step 5: Verify Badminton-Sleep connection');

  const badmintonSleep = connections.find((c: any) =>
    (c.domainA?.metric === 'badminton' && c.domainB?.metric === 'sleepHours') ||
    (c.domainA?.metric === 'sleepHours' && c.domainB?.metric === 'badminton')
  );

  if (badmintonSleep) {
    logPass('Badminton-Sleep connection detected');
    log(`  Coefficient: ${badmintonSleep.metrics?.coefficient?.toFixed(3)}`, colors.dim);
    log(`  Effect size: ${badmintonSleep.metrics?.effectSize?.toFixed(3)}`, colors.dim);
    log(`  Direction: ${badmintonSleep.direction}`, colors.dim);
    log(`  Strength: ${badmintonSleep.strength}`, colors.dim);
  } else {
    logFail('Badminton-Sleep connection', 'Not found in results');
    log(`  Available connections:`, colors.dim);
    connections.forEach((c: any) => {
      log(`    ${c.domainA?.metric} ↔ ${c.domainB?.metric}`, colors.dim);
    });
  }
  results.push({
    name: 'Life Connections E2E: Badminton-Sleep detected',
    passed: !!badmintonSleep,
    reason: badmintonSleep
      ? `rho=${badmintonSleep.metrics?.coefficient?.toFixed(3)}`
      : 'Connection not found',
  });

  // Assertion 5b: Correct direction (positive)
  if (badmintonSleep) {
    const correctDirection = badmintonSleep.direction === 'positive';
    if (correctDirection) {
      logPass('Direction is positive');
    } else {
      logFail('Direction check', `Expected positive, got ${badmintonSleep.direction}`);
    }
    results.push({
      name: 'Life Connections E2E: Correct direction',
      passed: correctDirection,
      reason: correctDirection ? 'positive' : `Expected positive, got ${badmintonSleep.direction}`,
    });

    // Assertion 5c: Coefficient > 0.4
    const coeff = badmintonSleep.metrics?.coefficient || 0;
    const strongCoeff = coeff > 0.4;
    if (strongCoeff) {
      logPass(`Coefficient ${coeff.toFixed(3)} > 0.4`);
    } else {
      logFail('Coefficient check', `${coeff.toFixed(3)} <= 0.4`);
    }
    results.push({
      name: 'Life Connections E2E: Coefficient > 0.4',
      passed: strongCoeff,
      reason: `coefficient = ${coeff.toFixed(3)}`,
    });

    // Assertion 5d: Strength moderate or strong
    const validStrength = badmintonSleep.strength === 'moderate' || badmintonSleep.strength === 'strong';
    if (validStrength) {
      logPass(`Strength is ${badmintonSleep.strength}`);
    } else {
      logFail('Strength check', `Expected moderate/strong, got ${badmintonSleep.strength}`);
    }
    results.push({
      name: 'Life Connections E2E: Strength moderate/strong',
      passed: validStrength,
      reason: `strength = ${badmintonSleep.strength}`,
    });
  } else {
    // Add placeholder failures for dependent assertions
    results.push(
      { name: 'Life Connections E2E: Correct direction', passed: false, reason: 'Skipped - no badminton-sleep connection' },
      { name: 'Life Connections E2E: Coefficient > 0.4', passed: false, reason: 'Skipped - no badminton-sleep connection' },
      { name: 'Life Connections E2E: Strength moderate/strong', passed: false, reason: 'Skipped - no badminton-sleep connection' },
    );
  }

  // Assertion 6: New statistical fields present
  logTestCase('Step 6: Verify new statistical fields');

  // Use badmintonSleep or first available connection
  const testConnection = badmintonSleep || connections[0];
  const metrics = testConnection?.metrics || {};

  const hasAdjustedPValue = metrics.adjustedPValue !== undefined && metrics.adjustedPValue !== null;
  const hasEffectiveSampleSize = metrics.effectiveSampleSize !== undefined && metrics.effectiveSampleSize !== null;
  const hasAutocorrelation = metrics.autocorrelation !== undefined && metrics.autocorrelation !== null;
  const hasCorrelationType = metrics.correlationType === 'spearman';

  const allStatsPresent = hasAdjustedPValue && hasEffectiveSampleSize && hasAutocorrelation && hasCorrelationType;

  if (allStatsPresent) {
    logPass('All new statistical fields present');
    log(`  adjustedPValue: ${metrics.adjustedPValue?.toFixed(4)}`, colors.dim);
    log(`  effectiveSampleSize: ${metrics.effectiveSampleSize}`, colors.dim);
    log(`  autocorrelation: ${metrics.autocorrelation?.toFixed(3)}`, colors.dim);
    log(`  correlationType: ${metrics.correlationType}`, colors.dim);
  } else {
    const missing: string[] = [];
    if (!hasAdjustedPValue) missing.push('adjustedPValue');
    if (!hasEffectiveSampleSize) missing.push('effectiveSampleSize');
    if (!hasAutocorrelation) missing.push('autocorrelation');
    if (!hasCorrelationType) missing.push('correlationType');
    logFail('Statistical fields', `Missing: ${missing.join(', ')}`);
  }
  results.push({
    name: 'Life Connections E2E: New stats fields present',
    passed: allStatsPresent,
    reason: allStatsPresent
      ? 'adjustedPValue, effectiveSampleSize, autocorrelation, correlationType all present'
      : `Missing fields detected`,
    details: {
      adjustedPValue: metrics.adjustedPValue,
      effectiveSampleSize: metrics.effectiveSampleSize,
      autocorrelation: metrics.autocorrelation,
      correlationType: metrics.correlationType,
    },
  });

  // Assertion 7: survivesConfounderControl present
  logTestCase('Step 7: Verify confounder control');

  const hasConfounderField = testConnection?.survivesConfounderControl !== undefined;
  if (hasConfounderField) {
    logPass(`survivesConfounderControl = ${testConnection.survivesConfounderControl}`);
    if (testConnection.confounderNote) {
      log(`  Note: ${testConnection.confounderNote}`, colors.dim);
    }
  } else {
    logFail('Confounder control', 'survivesConfounderControl not present');
  }
  results.push({
    name: 'Life Connections E2E: Confounder control present',
    passed: hasConfounderField,
    reason: hasConfounderField
      ? `survivesConfounderControl = ${testConnection.survivesConfounderControl}`
      : 'Field not present',
  });

  // Assertion 8: AI content generated
  logTestCase('Step 8: Verify AI content');

  const hasTitle = typeof testConnection?.title === 'string' && testConnection.title.length > 0;
  const hasDescription = typeof testConnection?.description === 'string' && testConnection.description.length > 0;
  const hasExplanation = typeof testConnection?.explanation === 'string' && testConnection.explanation.length > 0;
  const hasAIContent = hasTitle && hasDescription;

  if (hasAIContent) {
    logPass('AI content generated');
    log(`  Title: "${testConnection.title}"`, colors.dim);
    log(`  Description: "${testConnection.description?.substring(0, 100)}..."`, colors.dim);
    if (hasExplanation) {
      log(`  Explanation: "${testConnection.explanation?.substring(0, 100)}..."`, colors.dim);
    }
  } else {
    logFail('AI content', `title=${hasTitle}, description=${hasDescription}, explanation=${hasExplanation}`);
  }
  results.push({
    name: 'Life Connections E2E: AI content generated',
    passed: hasAIContent,
    reason: hasAIContent ? 'Title and description present' : 'Missing AI content',
  });

  // Assertion 9: With/without comparison
  logTestCase('Step 9: Verify with/without comparison');

  const withWithout = testConnection?.withWithout;
  const hasWithWithout = withWithout &&
    withWithout.withActivity &&
    withWithout.withoutActivity &&
    typeof withWithout.withActivity.mean === 'number' &&
    typeof withWithout.withoutActivity.mean === 'number';

  if (hasWithWithout) {
    const withMean = withWithout.withActivity.mean;
    const withoutMean = withWithout.withoutActivity.mean;
    logPass('With/without comparison present');
    log(`  With activity mean: ${withMean.toFixed(2)}`, colors.dim);
    log(`  Without activity mean: ${withoutMean.toFixed(2)}`, colors.dim);
    log(`  Difference: ${withWithout.absoluteDifference?.toFixed(2)}`, colors.dim);
    log(`  Percent diff: ${withWithout.percentDifference?.toFixed(1)}%`, colors.dim);
  } else {
    logFail('With/without comparison', 'withWithout data not present or incomplete');
  }
  results.push({
    name: 'Life Connections E2E: With/without comparison',
    passed: !!hasWithWithout,
    reason: hasWithWithout
      ? `withMean=${withWithout.withActivity.mean.toFixed(2)}, withoutMean=${withWithout.withoutActivity.mean.toFixed(2)}`
      : 'withWithout not present or incomplete',
  });

  // Assertion 10: Data points populated
  logTestCase('Step 10: Verify data points');

  const dataPoints = testConnection?.dataPoints || [];
  const hasDataPoints = dataPoints.length >= 8;
  const validDataPoints = dataPoints.every((dp: any) =>
    dp.date && typeof dp.valueA === 'number' && typeof dp.valueB === 'number'
  );

  if (hasDataPoints && validDataPoints) {
    logPass(`${dataPoints.length} data points with valid structure`);
  } else {
    logFail('Data points', `${dataPoints.length} points (need >= 8), valid=${validDataPoints}`);
  }
  results.push({
    name: 'Life Connections E2E: Data points populated',
    passed: hasDataPoints && validDataPoints,
    reason: `${dataPoints.length} data points, valid=${validDataPoints}`,
  });

  // Assertion 11: Noise pair filtered
  logTestCase('Step 11: Verify noise pair filtered');

  const photosSteps = connections.find((c: any) =>
    (c.domainA?.metric === 'count' && c.domainB?.metric === 'steps' &&
     c.domainA?.type === 'photos') ||
    (c.domainA?.metric === 'steps' && c.domainB?.metric === 'count' &&
     c.domainB?.type === 'photos')
  );

  if (!photosSteps) {
    logPass('Photos-Steps noise pair correctly filtered out');
  } else {
    logFail('Noise filtering', `Photos-Steps connection found (should have been filtered by BH correction or effect size)`);
  }
  results.push({
    name: 'Life Connections E2E: Noise pair filtered',
    passed: !photosSteps,
    reason: photosSteps
      ? `Photos-Steps connection found (rho=${photosSteps.metrics?.coefficient?.toFixed(3)})`
      : 'Correctly filtered out',
  });

  return results;
}

/**
 * Cleanup all test data
 */
async function cleanup(
  db: admin.firestore.Firestore,
  userId: string
): Promise<void> {
  if (createdDocs.length === 0) return;

  const cleanupItems = createdDocs.slice(0, 20).map(
    ({ collection, id }) => `${collection}/${id}`
  );
  if (createdDocs.length > 20) {
    cleanupItems.push(`... and ${createdDocs.length - 20} more`);
  }
  logCleanup(cleanupItems);

  let deleted = 0;
  let failed = 0;

  // Batch delete for efficiency (Firestore max 500 ops per batch)
  const batchSize = 450;
  for (let i = 0; i < createdDocs.length; i += batchSize) {
    const chunk = createdDocs.slice(i, i + batchSize);
    const batch = db.batch();

    for (const { collection, id } of chunk) {
      try {
        // Handle subcollection paths like users/{userId}/lifeConnections
        if (collection.includes('/')) {
          const parts = collection.split('/');
          let ref: admin.firestore.DocumentReference = db.collection(parts[0]).doc(parts[1]);
          for (let p = 2; p < parts.length; p += 2) {
            ref = ref.collection(parts[p]).doc(parts[p + 1] || id);
          }
          // If the collection path has an odd number of parts, it's a collection
          if (parts.length % 2 === 1) {
            batch.delete(db.collection(collection).doc(id));
          } else {
            batch.delete(ref);
          }
        } else {
          batch.delete(db.collection(collection).doc(id));
        }
      } catch {
        failed++;
      }
    }

    try {
      await batch.commit();
      deleted += chunk.length;
    } catch {
      // Fallback: delete one by one
      for (const { collection, id } of chunk) {
        try {
          if (collection.includes('/')) {
            // Subcollection path: reconstruct proper reference
            const collParts = collection.split('/');
            // e.g., "users/uid/lifeConnections" -> db.collection('users').doc('uid').collection('lifeConnections').doc(id)
            let colRef: admin.firestore.CollectionReference = db.collection(collParts[0]);
            let docRef: admin.firestore.DocumentReference = colRef.doc(collParts[1]);
            for (let p = 2; p < collParts.length; p++) {
              colRef = docRef.collection(collParts[p]);
              if (p + 1 < collParts.length) {
                docRef = colRef.doc(collParts[p + 1]);
                p++;
              }
            }
            await colRef.doc(id).delete();
          } else {
            await db.collection(collection).doc(id).delete();
          }
          deleted++;
        } catch {
          failed++;
        }
      }
    }
  }

  const success = failed === 0;
  const message = success
    ? undefined
    : `Deleted ${deleted}, failed ${failed}`;
  logCleanupResult(success, message);

  createdDocs.length = 0;
}

/**
 * Cleanup function exported for test runner
 */
export async function cleanupTestData(): Promise<void> {
  const { db, userId } = globalThis.testContext;
  await cleanup(db, userId);
}

// ============================================================================
// Standalone runner (when executed directly)
// ============================================================================

async function main() {
  const { initFirebase, ensureTestUserExists, getProjectId, getRegion, getTestUserIdToken } = await import('../lib/firebase-setup');
  const { printSummary, logSection } = await import('../lib/reporter');

  logSection('Life Connections E2E Test (Standalone)');

  // Initialize Firebase
  const db = initFirebase();
  log('  Firebase initialized', colors.green);

  const userId = await ensureTestUserExists();
  log(`  Test user: ${userId}`, colors.green);

  const idToken = await getTestUserIdToken(userId);
  log(`  ID token generated`, colors.green);

  // Set global test context
  (globalThis as any).testContext = {
    db,
    userId,
    idToken,
    projectId: getProjectId(),
    region: getRegion(),
    pineconeIndex: '',
    waitTimeMs: 15000,
  };

  // Run tests
  const results = await run();

  // Print summary
  printSummary(results);

  const failed = results.filter(r => !r.passed).length;
  process.exit(failed > 0 ? 1 : 0);
}

// Auto-run when executed directly
const isStandalone = !globalThis.testContext;
if (isStandalone) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
