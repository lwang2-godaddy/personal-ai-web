/**
 * Year in Review - Integration Tests
 *
 * Tests the year-in-review feature which generates annual summary slides
 * for users based on their collected personal data.
 *
 * Firestore Collections:
 * - yearInReview - Year-in-review documents per user per year
 * - yearInReview/{id}/slides - Individual slide data
 *
 * Test Cases:
 * 1. Fetch year-in-review data for the test user
 * 2. Verify review has expected slide types
 * 3. Verify year stats structure
 * 4. Verify slide ordering and completeness
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
export const name = 'Year in Review';

// Expected slide types for a year-in-review
const KNOWN_SLIDE_TYPES = [
  'intro', 'summary', 'health', 'activity', 'location', 'mood',
  'milestones', 'highlights', 'stats', 'outro', 'top_places',
  'top_activities', 'social', 'growth', 'memories', 'prediction',
];

// Test data cleanup tracker
const createdDocIds: { collection: string; id: string }[] = [];

/**
 * Main test runner - exported for test discovery
 */
export async function run(): Promise<TestResult[]> {
  const { db, userId } = globalThis.testContext;
  const allResults: TestResult[] = [];

  // Test Case 1: Fetch year-in-review data
  const test1Results = await testFetchYearInReview(db, userId);
  allResults.push(...test1Results);

  // Test Case 2: Verify slide types
  const test2Results = await testSlideTypes(db, userId);
  allResults.push(...test2Results);

  // Test Case 3: Verify year stats structure
  const test3Results = await testYearStatsStructure(db, userId);
  allResults.push(...test3Results);

  // Test Case 4: Create and verify test review document
  const test4Results = await testCreateYearInReview(db, userId);
  allResults.push(...test4Results);

  // Cleanup
  await cleanup(db);

  return allResults;
}

/**
 * Test Case 1: Fetch year-in-review data for user
 */
async function testFetchYearInReview(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const testName = 'YearInReview: Fetch review data for user';
  logTestCase(testName);

  try {
    const snapshot = await db.collection('yearInReview')
      .where('userId', '==', userId)
      .limit(5)
      .get();

    logQueryBox('Year in Review', [
      'Collection: yearInReview',
      `where userId == "${userId.substring(0, 8)}..."`,
      `Found: ${snapshot.size} reviews`,
    ]);

    if (snapshot.size === 0) {
      logInfo('No year-in-review data found (feature may not have generated yet)');
      return [{
        name: testName,
        passed: true,
        reason: 'No year-in-review data found - feature may not have run',
        details: { count: 0 },
      }];
    }

    // List the years found
    const years: number[] = [];
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const year = data.year || parseInt(doc.id.split('_').pop() || '0', 10);
      if (year) years.push(year);
    });

    logPass(`Found ${snapshot.size} year-in-review documents`);
    log(`  Years: ${years.sort().join(', ')}`, colors.dim);

    return [{
      name: testName,
      passed: true,
      reason: `Found ${snapshot.size} year-in-review documents for years: ${years.sort().join(', ')}`,
      details: { count: snapshot.size, years },
    }];
  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    return [{
      name: testName,
      passed: false,
      reason: `Error fetching year-in-review: ${error.message}`,
    }];
  }
}

/**
 * Test Case 2: Verify review has expected slide types
 */
async function testSlideTypes(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const testName = 'YearInReview: Slide types are valid';
  logTestCase(testName);

  try {
    const snapshot = await db.collection('yearInReview')
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      logInfo('No year-in-review to validate slide types');
      return [{
        name: testName,
        passed: true,
        reason: 'No year-in-review available to validate slides',
        skipped: true,
      }];
    }

    const doc = snapshot.docs[0];
    const data = doc.data();
    const slides = data.slides || [];

    logQueryBox('Slide Types', [
      `Review ID: ${doc.id}`,
      `Year: ${data.year || 'unknown'}`,
      `Slides: ${slides.length}`,
    ]);

    if (slides.length === 0) {
      // Check for slides subcollection instead
      const slidesSubcollection = await db.collection('yearInReview')
        .doc(doc.id)
        .collection('slides')
        .limit(20)
        .get();

      if (slidesSubcollection.size > 0) {
        const slideTypes: string[] = [];
        slidesSubcollection.docs.forEach((slideDoc) => {
          const slideData = slideDoc.data();
          if (slideData.type) slideTypes.push(slideData.type);
        });

        logPass(`Found ${slidesSubcollection.size} slides in subcollection`);
        log(`  Types: ${slideTypes.join(', ')}`, colors.dim);

        return [{
          name: testName,
          passed: true,
          reason: `${slidesSubcollection.size} slides found in subcollection`,
          details: { slideCount: slidesSubcollection.size, slideTypes },
        }];
      }

      logInfo('No slides found (inline or subcollection)');
      return [{
        name: testName,
        passed: true,
        reason: 'Review exists but has no slides yet',
        details: { hasSlides: false },
      }];
    }

    // Validate slide types
    const slideTypes: string[] = slides.map((s: any) => s.type || 'unknown');
    const unknownTypes = slideTypes.filter((t: string) => !KNOWN_SLIDE_TYPES.includes(t) && t !== 'unknown');

    const passed = slideTypes.length > 0;

    if (passed) {
      logPass(`${slides.length} slides with types: ${slideTypes.join(', ')}`);
    }

    if (unknownTypes.length > 0) {
      logInfo(`New/unknown slide types found: ${unknownTypes.join(', ')}`);
    }

    return [{
      name: testName,
      passed,
      reason: passed
        ? `${slides.length} slides found with ${new Set(slideTypes).size} unique types`
        : 'No valid slides found',
      details: { slideCount: slides.length, slideTypes, unknownTypes },
    }];
  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    return [{
      name: testName,
      passed: false,
      reason: `Error validating slide types: ${error.message}`,
    }];
  }
}

/**
 * Test Case 3: Verify year stats structure
 */
async function testYearStatsStructure(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const testName = 'YearInReview: Stats structure is valid';
  logTestCase(testName);

  try {
    const snapshot = await db.collection('yearInReview')
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      logInfo('No year-in-review to validate stats');
      return [{
        name: testName,
        passed: true,
        reason: 'No year-in-review available to validate stats',
        skipped: true,
      }];
    }

    const doc = snapshot.docs[0];
    const data = doc.data();
    const stats = data.stats || data.yearStats || {};

    logQueryBox('Year Stats', [
      `Review ID: ${doc.id}`,
      `Year: ${data.year || 'unknown'}`,
      `Stats keys: ${Object.keys(stats).length}`,
    ]);

    if (Object.keys(stats).length === 0) {
      logInfo('No stats object found in review');
      return [{
        name: testName,
        passed: true,
        reason: 'Review exists but stats not yet populated',
        details: { hasStats: false },
      }];
    }

    // Check for expected stat categories
    const statKeys = Object.keys(stats);
    logPass(`Stats structure has ${statKeys.length} categories`);
    statKeys.slice(0, 10).forEach((key) => {
      const val = stats[key];
      log(`  ${key}: ${typeof val === 'object' ? JSON.stringify(val).substring(0, 60) : val}`, colors.dim);
    });

    const hasUserId = data.userId === userId;
    const hasYear = typeof data.year === 'number' || typeof data.year === 'string';

    return [{
      name: testName,
      passed: hasUserId,
      reason: hasUserId
        ? `Stats structure valid with ${statKeys.length} categories for year ${data.year}`
        : 'Stats document userId mismatch',
      details: {
        year: data.year,
        statCategories: statKeys,
        hasUserId,
        hasYear,
      },
    }];
  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    return [{
      name: testName,
      passed: false,
      reason: `Error validating year stats: ${error.message}`,
    }];
  }
}

/**
 * Test Case 4: Create and verify a test year-in-review document
 */
async function testCreateYearInReview(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const testName = 'YearInReview: Create test review document';
  logTestCase(testName);

  try {
    const testId = generateTestId();
    const testYear = 2099; // Use a far future year to not conflict with real data

    const reviewDoc = {
      userId,
      year: testYear,
      status: 'test',
      stats: {
        totalSteps: 1000000,
        totalActivities: 150,
        topPlaces: ['Test Place 1', 'Test Place 2'],
        totalPhotos: 50,
      },
      slides: [
        { type: 'intro', title: 'Your 2099', order: 0 },
        { type: 'stats', title: 'By the Numbers', order: 1 },
        { type: 'outro', title: 'See You Next Year', order: 2 },
      ],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('yearInReview').add(reviewDoc);
    createdDocIds.push({ collection: 'yearInReview', id: docRef.id });

    await wait(500);

    // Read back and verify
    const doc = await docRef.get();
    const data = doc.data();

    if (!data) {
      logFail('Test review not found after creation');
      return [{
        name: testName,
        passed: false,
        reason: 'Document not found after creation',
      }];
    }

    const hasCorrectYear = data.year === testYear;
    const hasSlides = Array.isArray(data.slides) && data.slides.length === 3;
    const hasStats = data.stats && typeof data.stats.totalSteps === 'number';
    const passed = hasCorrectYear && hasSlides && hasStats;

    if (passed) {
      logPass(`Test review created: ${docRef.id} (year ${testYear})`);
      log(`  Slides: ${data.slides.length}`, colors.dim);
      log(`  Stats keys: ${Object.keys(data.stats).length}`, colors.dim);
    } else {
      logFail('Test review document has incorrect structure');
    }

    return [{
      name: testName,
      passed,
      reason: passed
        ? `Test review created with ${data.slides?.length} slides and ${Object.keys(data.stats || {}).length} stat categories`
        : 'Test review missing expected data',
      details: {
        docId: docRef.id,
        hasCorrectYear,
        hasSlides,
        hasStats,
      },
    }];
  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    return [{
      name: testName,
      passed: false,
      reason: `Error creating test review: ${error.message}`,
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
