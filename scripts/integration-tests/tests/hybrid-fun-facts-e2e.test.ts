/**
 * Hybrid Fun Facts - E2E Test
 *
 * END-TO-END test that verifies the full hybrid fun facts pipeline:
 * 1. Seeds test data (health, location, photo) into Firestore
 * 2. Calls the manualGenerateFunFacts Cloud Function
 * 3. Verifies response structure (all GeneratedFunFact fields)
 * 4. Verifies generated facts reference real seeded data (KEY hybrid test)
 * 5. Verifies Firestore persistence (funFacts collection)
 * 6. Cleans up all test data
 *
 * This test validates that the hybrid pipeline (template-based + AI-generated)
 * produces facts grounded in actual user data, not generic AI filler.
 *
 * Run: npm test -- --filter hybrid-fun-facts
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
  logSection,
  logQueryBox,
  logCleanup,
  logCleanupResult,
} from '../lib/reporter';

// Test name for discovery
export const name = 'Hybrid Fun Facts E2E';

// Track created documents for cleanup
const createdDocs: { collection: string; id: string }[] = [];

// Store response for cross-phase verification
let funFactsResponse: any = null;

/**
 * Main test runner - exported for test discovery
 */
export async function run(): Promise<TestResult[]> {
  const { db, userId } = globalThis.testContext;
  const allResults: TestResult[] = [];

  try {
    // Phase 1: Seed test data
    const seedResults = await seedTestData(db, userId);
    allResults.push(...seedResults);

    // Phase 2: Call Cloud Function
    const callResults = await callManualGenerateFunFacts(userId);
    allResults.push(...callResults);

    // Only continue if function call succeeded
    const callPassed = callResults.some(r => r.passed && r.name.includes('Cloud Function call'));
    if (!callPassed) {
      logInfo('Skipping remaining phases - Cloud Function call failed or skipped');
      return allResults;
    }

    // Phase 3: Verify response structure
    const structureResults = verifyResponseStructure();
    allResults.push(...structureResults);

    // Phase 4: Verify facts reference real data
    const dataRefResults = verifyFactsReferenceData();
    allResults.push(...dataRefResults);

    // Phase 5: Verify Firestore persistence
    const persistResults = await verifyFirestorePersistence(db, userId);
    allResults.push(...persistResults);

  } catch (error: any) {
    logFail('Test execution', error.message);
    allResults.push({
      name: 'E2E: Test execution',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  } finally {
    // Phase 6: Cleanup
    await cleanup(db, userId);
  }

  return allResults;
}

// ==========================================================================
// Phase 1: Seed Test Data
// ==========================================================================

async function seedTestData(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Phase 1: Seed Test Data');

  const testId = generateTestId();

  try {
    const batch = db.batch();

    // --- 5 healthData docs (steps with distinctive values) ---
    const stepValues = [8750, 12340, 6500, 15200, 9800];
    const healthIds: string[] = [];

    stepValues.forEach((value, i) => {
      const id = `e2e-health-${testId}-${i}`;
      healthIds.push(id);
      const date = new Date();
      date.setDate(date.getDate() - i);

      batch.set(db.collection('healthData').doc(id), {
        userId,
        type: 'steps',
        value,
        startDate: date.toISOString(),
        source: 'test',
      });
      createdDocs.push({ collection: 'healthData', id });
    });

    logInfo(`Creating 5 healthData docs: steps = ${stepValues.join(', ')}`);

    // --- 3 locationData docs ---
    const locationDocs = [
      {
        activity: 'badminton',
        placeName: 'SF Badminton Club',
        latitude: 37.7749,
        longitude: -122.4194,
        visitCount: 12,
        hoursAgo: 2,
      },
      {
        activity: 'badminton',
        placeName: 'SF Badminton Club',
        latitude: 37.7749,
        longitude: -122.4194,
        visitCount: 13,
        hoursAgo: 48,
      },
      {
        activity: 'gym',
        placeName: 'FitLife Gym',
        latitude: 37.7849,
        longitude: -122.4094,
        visitCount: 5,
        hoursAgo: 24,
      },
    ];

    const locationIds: string[] = [];
    locationDocs.forEach((loc, i) => {
      const id = `e2e-location-${testId}-${i}`;
      locationIds.push(id);
      const timestamp = new Date(Date.now() - loc.hoursAgo * 60 * 60 * 1000);

      batch.set(db.collection('locationData').doc(id), {
        userId,
        latitude: loc.latitude,
        longitude: loc.longitude,
        timestamp: timestamp.toISOString(),
        activity: loc.activity,
        placeName: loc.placeName,
        visitCount: loc.visitCount,
      });
      createdDocs.push({ collection: 'locationData', id });
    });

    logInfo('Creating 3 locationData docs: 2x badminton @ SF Badminton Club, 1x gym @ FitLife Gym');

    // --- 1 photoMemories doc ---
    const photoId = `e2e-photo-${testId}`;
    batch.set(db.collection('photoMemories').doc(photoId), {
      userId,
      imageUrl: `https://test.storage/${photoId}.jpg`,
      description: 'Sunset at Baker Beach',
      uploadedAt: new Date().toISOString(),
      location: {
        latitude: 37.7936,
        longitude: -122.4835,
        placeName: 'Baker Beach',
      },
    });
    createdDocs.push({ collection: 'photoMemories', id: photoId });

    logInfo('Creating 1 photoMemories doc: "Sunset at Baker Beach"');

    // Commit batch
    await batch.commit();

    logPass('All seed data created (5 health + 3 location + 1 photo)');
    results.push({
      name: 'Phase 1: Seed healthData (5 docs)',
      passed: true,
      reason: `Steps: ${stepValues.join(', ')}`,
      details: { healthIds },
    });
    results.push({
      name: 'Phase 1: Seed locationData (3 docs)',
      passed: true,
      reason: '2x badminton (SF Badminton Club), 1x gym (FitLife Gym)',
      details: { locationIds },
    });
    results.push({
      name: 'Phase 1: Seed photoMemories (1 doc)',
      passed: true,
      reason: 'Sunset at Baker Beach',
      details: { photoId },
    });

  } catch (error: any) {
    logFail('Phase 1: Seed data', error.message);
    results.push({
      name: 'Phase 1: Seed test data',
      passed: false,
      reason: `FAILED: ${error.message}`,
    });
  }

  return results;
}

// ==========================================================================
// Phase 2: Call manualGenerateFunFacts
// ==========================================================================

async function callManualGenerateFunFacts(userId: string): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Phase 2: Call manualGenerateFunFacts Cloud Function');

  const { idToken, projectId, region } = globalThis.testContext;

  if (!idToken) {
    logInfo('No ID token available - skipping Cloud Function call');
    results.push({
      name: 'Phase 2: Cloud Function call',
      passed: true,
      reason: 'Skipped - no ID token (run with auth to enable)',
      details: { skipped: true },
    });
    return results;
  }

  const functionUrl = `https://${region}-${projectId}.cloudfunctions.net/manualGenerateFunFacts`;

  try {
    logInfo(`Calling ${functionUrl}`);

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        data: {
          userId,
          periodTypes: ['weekly'],
          language: 'en',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Function returned ${response.status}: ${errorText}`);
    }

    const responseData = await response.json();
    funFactsResponse = responseData.result || responseData;

    logPass('Cloud Function called successfully');
    log(`  Response status: ${funFactsResponse.status || 'unknown'}`, colors.dim);
    log(`  Generated count: ${funFactsResponse.generatedCount || 0}`, colors.dim);
    log(`  Fun facts: ${funFactsResponse.funFacts?.length || 0}`, colors.dim);

    if (funFactsResponse.message) {
      log(`  Message: ${funFactsResponse.message}`, colors.dim);
    }

    // Log each fact for debugging
    if (funFactsResponse.funFacts?.length > 0) {
      logInfo('Generated facts:');
      funFactsResponse.funFacts.forEach((fact: any, i: number) => {
        log(`  ${i + 1}. ${fact.emoji || ''} [${fact.insightType}] ${fact.text?.substring(0, 80)}...`, colors.dim);
      });
    }

    results.push({
      name: 'Phase 2: Cloud Function call',
      passed: true,
      reason: `Status: ${funFactsResponse.status}, count: ${funFactsResponse.generatedCount || 0}`,
      details: {
        status: response.status,
        functionStatus: funFactsResponse.status,
        generatedCount: funFactsResponse.generatedCount,
      },
    });

    // Wait for Firestore writes to complete
    logInfo('Waiting 3 seconds for Firestore writes...');
    await wait(3000);

  } catch (error: any) {
    logFail('Phase 2: Cloud Function call', error.message);
    results.push({
      name: 'Phase 2: Cloud Function call',
      passed: false,
      reason: `FAILED: ${error.message}`,
      details: { error: error.message },
    });
  }

  return results;
}

// ==========================================================================
// Phase 3: Verify Response Structure
// ==========================================================================

function verifyResponseStructure(): TestResult[] {
  const results: TestResult[] = [];
  logTestCase('Phase 3: Verify Response Structure');

  if (!funFactsResponse) {
    logFail('Phase 3: No response to verify');
    results.push({
      name: 'Phase 3: Response available',
      passed: false,
      reason: 'No response from Cloud Function',
    });
    return results;
  }

  // Check success fields
  const isSuccess = funFactsResponse.success === true;
  const statusOk = funFactsResponse.status === 'success';
  const hasCount = (funFactsResponse.generatedCount || 0) >= 1;
  const hasFacts = Array.isArray(funFactsResponse.funFacts) && funFactsResponse.funFacts.length > 0;

  if (isSuccess && statusOk) {
    logPass('result.success === true && result.status === "success"');
  } else {
    logFail('Success/status check', `success=${funFactsResponse.success}, status=${funFactsResponse.status}`);
  }
  results.push({
    name: 'Phase 3: success and status fields',
    passed: isSuccess && statusOk,
    reason: isSuccess && statusOk
      ? 'Both success=true and status=success'
      : `success=${funFactsResponse.success}, status=${funFactsResponse.status}`,
  });

  if (hasCount) {
    logPass(`generatedCount >= 1 (got ${funFactsResponse.generatedCount})`);
  } else {
    logFail('generatedCount', `Expected >= 1, got ${funFactsResponse.generatedCount}`);
  }
  results.push({
    name: 'Phase 3: generatedCount >= 1',
    passed: hasCount,
    reason: `generatedCount = ${funFactsResponse.generatedCount}`,
  });

  if (!hasFacts) {
    logFail('funFacts array', 'Empty or missing');
    results.push({
      name: 'Phase 3: funFacts is non-empty array',
      passed: false,
      reason: 'funFacts array is empty or missing',
    });
    return results;
  }

  logPass(`funFacts has ${funFactsResponse.funFacts.length} items`);
  results.push({
    name: 'Phase 3: funFacts is non-empty array',
    passed: true,
    reason: `${funFactsResponse.funFacts.length} facts returned`,
  });

  // Check each fact has all required fields
  const requiredFields = [
    'id', 'userId', 'text', 'category', 'insightType', 'confidence',
    'emoji', 'periodType', 'periodStart', 'periodEnd', 'periodLabel',
    'generatedAt', 'dataPointCount',
  ];

  let allFieldsPresent = true;
  const missingFields: string[] = [];

  funFactsResponse.funFacts.forEach((fact: any, i: number) => {
    requiredFields.forEach(field => {
      if (fact[field] === undefined || fact[field] === null) {
        allFieldsPresent = false;
        missingFields.push(`fact[${i}].${field}`);
      }
    });
  });

  if (allFieldsPresent) {
    logPass('All facts have all required fields');
  } else {
    logFail('Required fields', `Missing: ${missingFields.join(', ')}`);
  }
  results.push({
    name: 'Phase 3: All facts have required fields',
    passed: allFieldsPresent,
    reason: allFieldsPresent
      ? `All ${requiredFields.length} fields present on all facts`
      : `Missing: ${missingFields.join(', ')}`,
  });

  // Check all 3 insight types present
  const insightTypes = new Set(funFactsResponse.funFacts.map((f: any) => f.insightType));
  const expectedTypes = ['patterns', 'surprising', 'recommendation'];
  const allTypesPresent = expectedTypes.every(t => insightTypes.has(t));

  if (allTypesPresent) {
    logPass('All 3 insight types present: patterns, surprising, recommendation');
  } else {
    const missing = expectedTypes.filter(t => !insightTypes.has(t));
    logFail('Insight types', `Missing: ${missing.join(', ')}`);
  }
  results.push({
    name: 'Phase 3: All 3 insight types present',
    passed: allTypesPresent,
    reason: allTypesPresent
      ? 'patterns, surprising, recommendation all present'
      : `Found: ${Array.from(insightTypes).join(', ')}`,
  });

  // Check periodType === 'weekly' for all facts
  const allWeekly = funFactsResponse.funFacts.every((f: any) => f.periodType === 'weekly');
  if (allWeekly) {
    logPass('All facts have periodType === "weekly"');
  } else {
    const nonWeekly = funFactsResponse.funFacts.filter((f: any) => f.periodType !== 'weekly');
    logFail('periodType', `${nonWeekly.length} facts have non-weekly periodType`);
  }
  results.push({
    name: 'Phase 3: All facts periodType === "weekly"',
    passed: allWeekly,
    reason: allWeekly ? 'All weekly' : 'Some facts have wrong periodType',
  });

  return results;
}

// ==========================================================================
// Phase 4: Verify Facts Reference Real Data (KEY TEST)
// ==========================================================================

function verifyFactsReferenceData(): TestResult[] {
  const results: TestResult[] = [];
  logTestCase('Phase 4: Verify Facts Reference Real Data');

  if (!funFactsResponse?.funFacts?.length) {
    logInfo('No facts to verify');
    results.push({
      name: 'Phase 4: Facts available',
      passed: false,
      reason: 'No facts to check',
    });
    return results;
  }

  // Combine all fact text for analysis
  const allFactText = funFactsResponse.funFacts
    .map((f: any) => f.text || '')
    .join(' ')
    .toLowerCase();

  log(`  Combined fact text (${allFactText.length} chars)`, colors.dim);

  // Precise data indicators (case-insensitive)
  const dataIndicators = [
    { keyword: 'badminton', source: 'location activity' },
    { keyword: 'gym', source: 'location activity' },
    { keyword: 'sf badminton', source: 'place name' },
    { keyword: 'fitlife', source: 'place name' },
    { keyword: 'baker beach', source: 'photo location' },
    { keyword: 'sunset', source: 'photo description' },
    { keyword: 'photo', source: 'photo memory' },
    { keyword: '8750', source: 'step value' },
    { keyword: '8,750', source: 'step value (comma)' },
    { keyword: '12340', source: 'step value' },
    { keyword: '12,340', source: 'step value (comma)' },
    { keyword: '15200', source: 'step value' },
    { keyword: '15,200', source: 'step value (comma)' },
    { keyword: '52590', source: 'total steps' },
    { keyword: '52,590', source: 'total steps (comma)' },
    { keyword: '10518', source: 'average steps' },
    { keyword: '10,518', source: 'average steps (comma)' },
  ];

  let matchedKeywords = 0;
  dataIndicators.forEach(({ keyword, source }) => {
    const found = allFactText.includes(keyword.toLowerCase());
    if (found) {
      matchedKeywords++;
      log(`  \u2713 Found "${keyword}" (from ${source})`, colors.green);
    }
  });

  log(`  Keyword matches: ${matchedKeywords}/${dataIndicators.length}`, colors.dim);

  // Test 1: Activity reference
  const hasActivityRef = allFactText.includes('badminton') || allFactText.includes('gym');
  if (hasActivityRef) {
    logPass('At least 1 fact mentions badminton or gym');
  } else {
    logInfo('No activity name found in facts (AI may have paraphrased)');
  }
  results.push({
    name: 'Phase 4: Activity reference in facts',
    passed: hasActivityRef,
    reason: hasActivityRef
      ? 'Activity name found in fact text'
      : 'No activity name found (AI may have paraphrased)',
  });

  // Test 2: Numeric reference (4+ digit number)
  const hasNumericRef = /\b\d{4,5}\b/.test(allFactText) || /\b\d{1,3}(,\d{3})+\b/.test(allFactText);
  if (hasNumericRef) {
    logPass('At least 1 fact contains a 4+ digit number');
  } else {
    logInfo('No specific numeric values found in facts');
  }
  results.push({
    name: 'Phase 4: Numeric reference in facts',
    passed: hasNumericRef,
    reason: hasNumericRef
      ? 'Numeric data found in fact text'
      : 'No 4+ digit numbers found',
  });

  // Test 3: Text quality - each fact 10-500 chars
  let allQualityOk = true;
  funFactsResponse.funFacts.forEach((fact: any, i: number) => {
    const len = (fact.text || '').length;
    if (len < 10 || len > 500) {
      allQualityOk = false;
      log(`  \u2717 Fact ${i} text length ${len} out of range [10-500]`, colors.red);
    }
  });
  if (allQualityOk) {
    logPass('All facts have text length 10-500 chars');
  }
  results.push({
    name: 'Phase 4: Text quality (10-500 chars)',
    passed: allQualityOk,
    reason: allQualityOk
      ? 'All facts within range'
      : 'Some facts outside 10-500 char range',
  });

  // Test 4: Emoji present
  let allHaveEmoji = true;
  funFactsResponse.funFacts.forEach((fact: any, i: number) => {
    if (!fact.emoji || fact.emoji.trim().length === 0) {
      allHaveEmoji = false;
      log(`  \u2717 Fact ${i} missing emoji`, colors.red);
    }
  });
  if (allHaveEmoji) {
    logPass('All facts have non-empty emoji');
  }
  results.push({
    name: 'Phase 4: Emoji present on all facts',
    passed: allHaveEmoji,
    reason: allHaveEmoji ? 'All facts have emoji' : 'Some facts missing emoji',
  });

  // Test 5: Core hybrid verification - at least 1 fact references precise data
  // (activity name OR 4+ digit number OR place name)
  const placeNames = ['sf badminton', 'fitlife', 'baker beach'];
  const hasPlaceRef = placeNames.some(p => allFactText.includes(p));
  const hasAnyPreciseRef = hasActivityRef || hasNumericRef || hasPlaceRef;

  if (hasAnyPreciseRef) {
    logPass('CORE HYBRID TEST: At least 1 fact references precise data');
  } else {
    logFail('CORE HYBRID TEST', 'No facts reference precise seeded data (activity, number, or place)');
  }
  results.push({
    name: 'Phase 4: CORE - Hybrid facts reference real data',
    passed: hasAnyPreciseRef,
    reason: hasAnyPreciseRef
      ? `Precise data found: activity=${hasActivityRef}, numeric=${hasNumericRef}, place=${hasPlaceRef}`
      : 'No precise data references found - facts may be generic AI output',
    details: {
      hasActivityRef,
      hasNumericRef,
      hasPlaceRef,
      matchedKeywords,
      totalIndicators: dataIndicators.length,
    },
  });

  return results;
}

// ==========================================================================
// Phase 5: Verify Firestore Persistence
// ==========================================================================

async function verifyFirestorePersistence(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Phase 5: Verify Firestore Persistence');

  try {
    const funFactsSnap = await db.collection('funFacts')
      .where('userId', '==', userId)
      .orderBy('generatedAt', 'desc')
      .limit(10)
      .get();

    logQueryBox('Firestore funFacts Query', [
      `userId: ${userId}`,
      `Found: ${funFactsSnap.size} documents`,
    ]);

    // Check documents exist
    const docsExist = funFactsSnap.size >= 1;
    if (docsExist) {
      logPass(`${funFactsSnap.size} funFacts documents found`);
    } else {
      logFail('Firestore persistence', 'No funFacts documents found');
    }
    results.push({
      name: 'Phase 5: funFacts documents exist',
      passed: docsExist,
      reason: `${funFactsSnap.size} documents found`,
    });

    if (!docsExist) return results;

    // Track found IDs for cleanup
    funFactsSnap.docs.forEach(doc => {
      createdDocs.push({ collection: 'funFacts', id: doc.id });
    });

    // Verify each doc has expected fields
    let allDocsValid = true;
    let hiddenViewedOk = true;
    let periodTypeOk = true;
    let userIdOk = true;

    funFactsSnap.docs.forEach(doc => {
      const data = doc.data();

      // hidden === false, viewed === false
      if (data.hidden !== false || data.viewed !== false) {
        hiddenViewedOk = false;
      }

      // periodType === 'weekly'
      if (data.periodType !== 'weekly') {
        periodTypeOk = false;
      }

      // userId matches
      if (data.userId !== userId) {
        userIdOk = false;
      }

      // All GeneratedFunFact fields present
      const requiredFields = [
        'id', 'userId', 'text', 'category', 'insightType', 'confidence',
        'emoji', 'periodType', 'periodStart', 'periodEnd', 'periodLabel',
        'generatedAt', 'dataPointCount',
      ];
      requiredFields.forEach(field => {
        if (data[field] === undefined) {
          allDocsValid = false;
        }
      });
    });

    if (hiddenViewedOk) {
      logPass('All docs have hidden=false, viewed=false');
    } else {
      logFail('hidden/viewed flags', 'Some docs have incorrect hidden/viewed values');
    }
    results.push({
      name: 'Phase 5: hidden=false, viewed=false',
      passed: hiddenViewedOk,
      reason: hiddenViewedOk ? 'Correct' : 'Some docs have wrong values',
    });

    if (allDocsValid) {
      logPass('All docs have all GeneratedFunFact fields');
    } else {
      logFail('Document fields', 'Some docs missing required fields');
    }
    results.push({
      name: 'Phase 5: All GeneratedFunFact fields present',
      passed: allDocsValid,
      reason: allDocsValid ? 'All fields present' : 'Some fields missing',
    });

    if (periodTypeOk) {
      logPass('All docs have periodType="weekly"');
    }
    results.push({
      name: 'Phase 5: periodType matches',
      passed: periodTypeOk,
      reason: periodTypeOk ? 'All weekly' : 'Some non-weekly',
    });

    if (userIdOk) {
      logPass('All docs have correct userId');
    }
    results.push({
      name: 'Phase 5: userId matches',
      passed: userIdOk,
      reason: userIdOk ? 'All match' : 'Some userId mismatch',
    });

  } catch (error: any) {
    logFail('Phase 5: Firestore query', error.message);
    results.push({
      name: 'Phase 5: Firestore persistence',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

// ==========================================================================
// Phase 6: Cleanup
// ==========================================================================

async function cleanup(db: admin.firestore.Firestore, userId: string): Promise<void> {
  // Also find any generated funFacts from the last 5 minutes
  try {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const recentFunFacts = await db.collection('funFacts')
      .where('userId', '==', userId)
      .where('generatedAt', '>=', fiveMinutesAgo)
      .get();

    recentFunFacts.docs.forEach(doc => {
      // Avoid duplicates
      if (!createdDocs.some(d => d.collection === 'funFacts' && d.id === doc.id)) {
        createdDocs.push({ collection: 'funFacts', id: doc.id });
      }
    });
  } catch {
    // Ignore query errors during cleanup
  }

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

  // Clear the array
  createdDocs.length = 0;
}

/**
 * Cleanup function exported for test runner
 */
export async function cleanupTestData(): Promise<void> {
  const { db, userId } = globalThis.testContext;
  await cleanup(db, userId);
}
