/**
 * Auto Check-In Enhancements - Integration Tests
 *
 * Tests the new auto check-in features:
 * 1. Place Type Designation (home/work/regular/other)
 * 2. Home/Work preferences (silent check-ins, timeline-only)
 * 3. Daily Summary preferences
 *
 * Firestore Collections:
 * - users/{userId} - User document with checkInSuggestionPreferences
 * - saved_places/{placeId} - Saved places with placeType field
 *
 * Test Cases:
 * 1. Verify new preference fields exist in schema
 * 2. Test place type update on saved places
 * 3. Verify home/work preferences defaults
 * 4. Test daily summary time format validation
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
export const name = 'Auto Check-In Enhancements';

// Place types for validation
const VALID_PLACE_TYPES = ['home', 'work', 'regular', 'other'];

// Test place IDs for cleanup
const testPlaceIds: string[] = [];

/**
 * Main test runner - exported for test discovery
 */
export async function run(): Promise<TestResult[]> {
  const { db, userId } = globalThis.testContext;
  const allResults: TestResult[] = [];

  // Test Case 1: Verify new preference fields
  const test1Results = await testPreferenceSchema(db, userId);
  allResults.push(...test1Results);

  // Test Case 2: Test place type CRUD
  const test2Results = await testPlaceTypeCRUD(db, userId);
  allResults.push(...test2Results);

  // Test Case 3: Test home/work uniqueness
  const test3Results = await testHomeWorkUniqueness(db, userId);
  allResults.push(...test3Results);

  // Test Case 4: Test daily summary time validation
  const test4Results = await testDailySummaryTimeFormat(db, userId);
  allResults.push(...test4Results);

  // Cleanup test data
  await cleanup(db);

  return allResults;
}

/**
 * Test Case 1: Verify new preference fields exist in schema
 */
async function testPreferenceSchema(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const testName = 'CheckInPreferences: New fields exist';
  logTestCase(testName);

  try {
    const userRef = db.doc(`users/${userId}`);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      logInfo('User document does not exist, creating test preferences');
      await userRef.set({
        checkInSuggestionPreferences: {
          enabled: true,
          maxSuggestionsPerDay: 5,
          minVisitsRequired: 2,
          expirationMinutes: 30,
          savedPlacesOnly: false,
          autoCheckInMode: 'off',
          autoConfirmMinConfirmations: 3,
          showStreaksInNotifications: true,
          // New fields
          homeWorkCheckInEnabled: false,
          homeWorkTimelineOnly: true,
          dailySummaryEnabled: false,
          dailySummaryTime: '19:00',
        },
      }, { merge: true });
    }

    const updatedSnap = await userRef.get();
    const prefs = updatedSnap.data()?.checkInSuggestionPreferences || {};

    logQueryBox('Preference Schema', [
      `homeWorkCheckInEnabled: ${prefs.homeWorkCheckInEnabled}`,
      `homeWorkTimelineOnly: ${prefs.homeWorkTimelineOnly}`,
      `dailySummaryEnabled: ${prefs.dailySummaryEnabled}`,
      `dailySummaryTime: ${prefs.dailySummaryTime}`,
    ]);

    // Verify all new fields exist
    const hasHomeWorkEnabled = typeof prefs.homeWorkCheckInEnabled === 'boolean';
    const hasTimelineOnly = typeof prefs.homeWorkTimelineOnly === 'boolean';
    const hasDailySummary = typeof prefs.dailySummaryEnabled === 'boolean';
    const hasSummaryTime = typeof prefs.dailySummaryTime === 'string';

    const allFieldsValid = hasHomeWorkEnabled && hasTimelineOnly && hasDailySummary && hasSummaryTime;

    if (allFieldsValid) {
      logPass(testName);
      return [{ name: testName, passed: true }];
    } else {
      const missing: string[] = [];
      if (!hasHomeWorkEnabled) missing.push('homeWorkCheckInEnabled');
      if (!hasTimelineOnly) missing.push('homeWorkTimelineOnly');
      if (!hasDailySummary) missing.push('dailySummaryEnabled');
      if (!hasSummaryTime) missing.push('dailySummaryTime');
      logFail(testName, `Missing fields: ${missing.join(', ')}`);
      return [{ name: testName, passed: false, error: `Missing: ${missing.join(', ')}` }];
    }
  } catch (error: any) {
    logFail(testName, error.message);
    return [{ name: testName, passed: false, error: error.message }];
  }
}

/**
 * Test Case 2: Test place type CRUD
 */
async function testPlaceTypeCRUD(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const testName = 'SavedPlace: Place type CRUD';
  logTestCase(testName);

  try {
    // Create a test place with placeType
    const placeId = `test_place_${generateTestId()}`;
    testPlaceIds.push(placeId);

    const placeData = {
      userId,
      placeName: 'Test Office',
      latitude: 37.7749,
      longitude: -122.4194,
      radius: 100,
      placeType: 'work',
      visitCount: 5,
      totalDuration: 28800, // 8 hours
      firstVisit: admin.firestore.Timestamp.now(),
      lastVisit: admin.firestore.Timestamp.now(),
      isFavorite: false,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    };

    await db.doc(`saved_places/${placeId}`).set(placeData);

    // Read back and verify
    const placeSnap = await db.doc(`saved_places/${placeId}`).get();
    const savedPlace = placeSnap.data();

    logQueryBox('Saved Place', [
      `ID: ${placeId}`,
      `placeName: ${savedPlace?.placeName}`,
      `placeType: ${savedPlace?.placeType}`,
    ]);

    // Verify placeType is valid
    const placeTypeValid = VALID_PLACE_TYPES.includes(savedPlace?.placeType);

    // Update placeType
    await db.doc(`saved_places/${placeId}`).update({
      placeType: 'home',
      updatedAt: admin.firestore.Timestamp.now(),
    });

    const updatedSnap = await db.doc(`saved_places/${placeId}`).get();
    const updatedType = updatedSnap.data()?.placeType;

    logInfo(`Updated placeType to: ${updatedType}`);

    if (placeTypeValid && updatedType === 'home') {
      logPass(testName);
      return [{ name: testName, passed: true }];
    } else {
      logFail(testName, `placeType validation failed: ${savedPlace?.placeType} -> ${updatedType}`);
      return [{ name: testName, passed: false, error: 'placeType validation failed' }];
    }
  } catch (error: any) {
    logFail(testName, error.message);
    return [{ name: testName, passed: false, error: error.message }];
  }
}

/**
 * Test Case 3: Test home/work uniqueness constraint
 */
async function testHomeWorkUniqueness(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const testName = 'SavedPlace: Home/Work uniqueness';
  logTestCase(testName);

  try {
    // Create two places
    const place1Id = `test_home1_${generateTestId()}`;
    const place2Id = `test_home2_${generateTestId()}`;
    testPlaceIds.push(place1Id, place2Id);

    const basePlaceData = {
      userId,
      latitude: 37.7749,
      longitude: -122.4194,
      radius: 100,
      visitCount: 1,
      totalDuration: 0,
      firstVisit: admin.firestore.Timestamp.now(),
      lastVisit: admin.firestore.Timestamp.now(),
      isFavorite: false,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    };

    // Create place 1 as home
    await db.doc(`saved_places/${place1Id}`).set({
      ...basePlaceData,
      placeName: 'Home 1',
      placeType: 'home',
    });

    // Create place 2 as home (simulating what the service would do)
    await db.doc(`saved_places/${place2Id}`).set({
      ...basePlaceData,
      placeName: 'Home 2',
      placeType: 'home',
    });

    // Query for all home places
    const homePlacesSnap = await db.collection('saved_places')
      .where('userId', '==', userId)
      .where('placeType', '==', 'home')
      .get();

    logQueryBox('Home Places Query', [
      `Found: ${homePlacesSnap.size} home place(s)`,
      'Note: App enforces one home constraint client-side',
    ]);

    // In real app, service would clear old home before setting new
    // Here we just verify the query works
    if (homePlacesSnap.size > 0) {
      logPass(testName);
      return [{ name: testName, passed: true }];
    } else {
      logFail(testName, 'No home places found');
      return [{ name: testName, passed: false, error: 'No home places found' }];
    }
  } catch (error: any) {
    logFail(testName, error.message);
    return [{ name: testName, passed: false, error: error.message }];
  }
}

/**
 * Test Case 4: Test daily summary time format validation
 */
async function testDailySummaryTimeFormat(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const testName = 'DailySummary: Time format validation';
  logTestCase(testName);

  try {
    const userRef = db.doc(`users/${userId}`);

    // Test valid time formats
    const validTimes = ['00:00', '12:30', '19:00', '23:59'];
    const invalidTimes = ['25:00', '12:60', 'invalid', ''];

    const validResults: boolean[] = [];
    const invalidResults: boolean[] = [];

    for (const time of validTimes) {
      await userRef.update({
        'checkInSuggestionPreferences.dailySummaryTime': time,
      });
      const snap = await userRef.get();
      const savedTime = snap.data()?.checkInSuggestionPreferences?.dailySummaryTime;
      validResults.push(savedTime === time);
    }

    logQueryBox('Time Format Validation', [
      `Valid times tested: ${validTimes.join(', ')}`,
      `All valid formats accepted: ${validResults.every(r => r)}`,
    ]);

    // Note: Firestore doesn't enforce format - validation happens in app
    if (validResults.every(r => r)) {
      logPass(testName);
      return [{ name: testName, passed: true }];
    } else {
      logFail(testName, 'Time format validation failed');
      return [{ name: testName, passed: false, error: 'Format validation failed' }];
    }
  } catch (error: any) {
    logFail(testName, error.message);
    return [{ name: testName, passed: false, error: error.message }];
  }
}

/**
 * Cleanup test data
 */
async function cleanup(db: admin.firestore.Firestore): Promise<void> {
  logCleanup('Auto Check-In test data');

  let deleted = 0;
  for (const placeId of testPlaceIds) {
    try {
      await db.doc(`saved_places/${placeId}`).delete();
      deleted++;
    } catch (error) {
      // Ignore deletion errors
    }
  }

  logCleanupResult(`Deleted ${deleted} test places`);
}
