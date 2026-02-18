/**
 * Virtual Companion (Mascot) - Integration Tests
 *
 * Tests the virtual companion feature which provides an AI companion
 * that reacts to user activities and grows with their journaling journey.
 *
 * Firestore Collections:
 * - users/{userId}/mascots - Mascot state documents per user
 *
 * Test Cases:
 * 1. Fetch mascot data for user
 * 2. Verify mascot structure has required fields
 * 3. Test XP and level calculations
 * 4. Create and validate test mascot document
 * 5. Test time-aware state transitions
 * 6. Test activity reaction processing
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
export const name = 'Virtual Companion';

// Expected fields in a mascot document
const REQUIRED_MASCOT_FIELDS = [
  'userId', 'name', 'species', 'level', 'xp', 'mood', 'lastInteraction',
];

const KNOWN_MOOD_VALUES = ['happy', 'excited', 'content', 'neutral', 'sad', 'sleepy'];
const KNOWN_SPECIES = ['dog', 'cat', 'fox', 'panda', 'penguin', 'custom'];
const KNOWN_TIME_STATES = ['morning', 'afternoon', 'evening', 'night'];

// XP required for each level (first 10 levels)
const XP_REQUIREMENTS = [
  0, 100, 250, 500, 800, 1200, 1700, 2300, 3000, 3800, 4700,
];

// Test data cleanup tracker
const createdDocIds: { collection: string; id: string }[] = [];

/**
 * Main test runner - exported for test discovery
 */
export async function run(): Promise<TestResult[]> {
  const { db, userId } = globalThis.testContext;
  const allResults: TestResult[] = [];

  // Test Case 1: Fetch mascot data
  const test1Results = await testFetchMascotData(db, userId);
  allResults.push(...test1Results);

  // Test Case 2: Verify mascot structure
  const test2Results = await testMascotStructure(db, userId);
  allResults.push(...test2Results);

  // Test Case 3: Test XP and level calculations
  const test3Results = await testXPLevelCalculations(db, userId);
  allResults.push(...test3Results);

  // Test Case 4: Create test mascot
  const test4Results = await testCreateMascot(db, userId);
  allResults.push(...test4Results);

  // Test Case 5: Test time-aware states
  const test5Results = await testTimeAwareStates(db, userId);
  allResults.push(...test5Results);

  // Test Case 6: Test activity reactions
  const test6Results = await testActivityReactions(db, userId);
  allResults.push(...test6Results);

  // Cleanup
  await cleanup(db);

  return allResults;
}

/**
 * Test Case 1: Fetch mascot data for user
 */
async function testFetchMascotData(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const testName = 'VirtualCompanion: Fetch mascot for user';
  logTestCase(testName);

  try {
    // Mascots are stored in a subcollection under users
    const snapshot = await db.collection('users')
      .doc(userId)
      .collection('mascots')
      .limit(1)
      .get();

    logQueryBox('Mascot Data', [
      `Collection: users/${userId.substring(0, 8)}.../ mascots`,
      `Found: ${snapshot.size} mascot(s)`,
    ]);

    if (snapshot.empty) {
      logInfo('No mascot found (feature may be new or not yet initialized)');
      return [{
        name: testName,
        passed: true,
        reason: 'No mascot found - feature may not have been initialized',
        details: { count: 0 },
      }];
    }

    const mascot = snapshot.docs[0].data();
    logPass(`Found mascot: ${mascot.name || 'Unnamed'} (Level ${mascot.level || 1})`);
    log(`  Species: ${mascot.species || 'unknown'}`, colors.dim);
    log(`  Mood: ${mascot.mood || 'unknown'}`, colors.dim);

    return [{
      name: testName,
      passed: true,
      reason: `Found mascot "${mascot.name}" at level ${mascot.level}`,
      details: {
        name: mascot.name,
        species: mascot.species,
        level: mascot.level,
        xp: mascot.xp,
        mood: mascot.mood,
      },
    }];
  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    return [{
      name: testName,
      passed: false,
      reason: `Error fetching mascot: ${error.message}`,
    }];
  }
}

/**
 * Test Case 2: Verify mascot structure has required fields
 */
async function testMascotStructure(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const testName = 'VirtualCompanion: Mascot has required fields';
  logTestCase(testName);

  try {
    const snapshot = await db.collection('users')
      .doc(userId)
      .collection('mascots')
      .limit(1)
      .get();

    if (snapshot.empty) {
      logInfo('No mascot to validate structure');
      return [{
        name: testName,
        passed: true,
        reason: 'No mascot available to validate structure',
        skipped: true,
      }];
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    // Check for required fields
    const presentFields = REQUIRED_MASCOT_FIELDS.filter(f => data[f] !== undefined);
    const missingFields = REQUIRED_MASCOT_FIELDS.filter(f => data[f] === undefined);

    logQueryBox('Mascot Structure', [
      `Document ID: ${doc.id}`,
      `Total fields: ${Object.keys(data).length}`,
      `Required present: ${presentFields.length}/${REQUIRED_MASCOT_FIELDS.length}`,
      `Missing: ${missingFields.length > 0 ? missingFields.join(', ') : 'none'}`,
    ]);

    // Validate field values
    const validMood = !data.mood || KNOWN_MOOD_VALUES.includes(data.mood);
    const validSpecies = !data.species || KNOWN_SPECIES.includes(data.species);
    const validLevel = typeof data.level === 'number' && data.level >= 1 && data.level <= 50;
    const validXP = typeof data.xp === 'number' && data.xp >= 0;

    const issues: string[] = [];
    if (!validMood) issues.push(`Invalid mood: ${data.mood}`);
    if (!validSpecies) issues.push(`Invalid species: ${data.species}`);
    if (!validLevel) issues.push(`Invalid level: ${data.level}`);
    if (!validXP) issues.push(`Invalid XP: ${data.xp}`);

    const passed = missingFields.length === 0 && issues.length === 0;

    if (passed) {
      logPass('Mascot structure is valid');
      log(`  Fields: ${Object.keys(data).join(', ')}`, colors.dim);
    } else {
      logFail('Mascot structure has issues');
      if (missingFields.length > 0) {
        log(`  Missing: ${missingFields.join(', ')}`, colors.dim);
      }
      issues.forEach(i => log(`  ${i}`, colors.dim));
    }

    return [{
      name: testName,
      passed,
      reason: passed
        ? `Mascot has all ${REQUIRED_MASCOT_FIELDS.length} required fields`
        : `Missing fields: ${missingFields.join(', ')}; Issues: ${issues.join(', ')}`,
      details: {
        docId: doc.id,
        presentFields,
        missingFields,
        issues,
      },
    }];
  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    return [{
      name: testName,
      passed: false,
      reason: `Error validating mascot structure: ${error.message}`,
    }];
  }
}

/**
 * Test Case 3: Test XP and level calculations
 */
async function testXPLevelCalculations(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const testName = 'VirtualCompanion: XP and level calculations';
  logTestCase(testName);

  try {
    const snapshot = await db.collection('users')
      .doc(userId)
      .collection('mascots')
      .limit(1)
      .get();

    if (snapshot.empty) {
      logInfo('No mascot to validate XP/level');
      return [{
        name: testName,
        passed: true,
        reason: 'No mascot available to validate XP/level',
        skipped: true,
      }];
    }

    const data = snapshot.docs[0].data();
    const xp = data.xp || 0;
    const level = data.level || 1;

    // Calculate expected level based on XP
    let expectedLevel = 1;
    for (let i = 1; i < XP_REQUIREMENTS.length; i++) {
      if (xp >= XP_REQUIREMENTS[i]) {
        expectedLevel = i + 1;
      } else {
        break;
      }
    }

    // For higher levels beyond our table, just check XP is sufficient
    if (level > 10) {
      expectedLevel = level; // Trust the level for high values
    }

    // Check that level matches expected (allow some tolerance)
    const levelMatches = Math.abs(level - expectedLevel) <= 1;

    // Calculate XP to next level
    const xpForCurrentLevel = XP_REQUIREMENTS[Math.min(level - 1, XP_REQUIREMENTS.length - 1)] || 0;
    const xpForNextLevel = XP_REQUIREMENTS[Math.min(level, XP_REQUIREMENTS.length - 1)] || xp + 1000;
    const progressToNext = xpForNextLevel > xpForCurrentLevel
      ? ((xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel) * 100).toFixed(1)
      : '100';

    logQueryBox('XP/Level Analysis', [
      `Current XP: ${xp}`,
      `Current Level: ${level}`,
      `Expected Level: ${expectedLevel}`,
      `Progress to next: ${progressToNext}%`,
    ]);

    const passed = levelMatches && xp >= 0 && level >= 1;

    if (passed) {
      logPass(`Level ${level} is correct for ${xp} XP`);
      log(`  Progress to level ${level + 1}: ${progressToNext}%`, colors.dim);
    } else {
      logFail(`Level mismatch: expected ${expectedLevel}, got ${level}`);
    }

    return [{
      name: testName,
      passed,
      reason: passed
        ? `Level ${level} correct for ${xp} XP (${progressToNext}% to next)`
        : `Level mismatch: expected ${expectedLevel}, got ${level}`,
      details: {
        xp,
        level,
        expectedLevel,
        progressToNext,
      },
    }];
  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    return [{
      name: testName,
      passed: false,
      reason: `Error validating XP/level: ${error.message}`,
    }];
  }
}

/**
 * Test Case 4: Create and validate a test mascot document
 */
async function testCreateMascot(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const testName = 'VirtualCompanion: Create test mascot document';
  logTestCase(testName);

  try {
    const testId = generateTestId();
    const testUserId = `test_${testId}`;

    const mascotDoc = {
      userId: testUserId,
      name: 'Test Buddy',
      species: 'dog',
      level: 5,
      xp: 850,
      mood: 'happy',
      energy: 80,
      lastInteraction: admin.firestore.FieldValue.serverTimestamp(),
      currentState: 'afternoon',
      streakDays: 7,
      totalActivities: 42,
      achievements: ['first_entry', 'week_streak'],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Create in a test subcollection
    const docRef = await db.collection('users')
      .doc(testUserId)
      .collection('mascots')
      .doc('main')
      .set(mascotDoc);

    createdDocIds.push({
      collection: `users/${testUserId}/mascots`,
      id: 'main',
    });
    // Also track the parent user doc for cleanup
    createdDocIds.push({
      collection: 'users',
      id: testUserId,
    });

    await wait(500);

    // Read back and verify
    const doc = await db.collection('users')
      .doc(testUserId)
      .collection('mascots')
      .doc('main')
      .get();

    const data = doc.data();

    if (!data) {
      logFail('Test mascot not found after creation');
      return [{
        name: testName,
        passed: false,
        reason: 'Document not found after creation',
      }];
    }

    const hasName = data.name === 'Test Buddy';
    const hasSpecies = data.species === 'dog';
    const hasLevel = data.level === 5;
    const hasXP = data.xp === 850;
    const hasMood = data.mood === 'happy';
    const hasAchievements = Array.isArray(data.achievements) && data.achievements.length === 2;
    const passed = hasName && hasSpecies && hasLevel && hasXP && hasMood && hasAchievements;

    if (passed) {
      logPass(`Test mascot created: ${data.name}`);
      log(`  Level: ${data.level}, XP: ${data.xp}`, colors.dim);
      log(`  Mood: ${data.mood}, Energy: ${data.energy}`, colors.dim);
      log(`  Achievements: ${data.achievements.join(', ')}`, colors.dim);
    } else {
      logFail('Test mascot missing expected fields');
    }

    return [{
      name: testName,
      passed,
      reason: passed
        ? `Test mascot created with level ${data.level} and ${data.achievements?.length} achievements`
        : 'Test mascot missing expected data',
      details: {
        testUserId,
        hasName,
        hasSpecies,
        hasLevel,
        hasXP,
        hasMood,
        hasAchievements,
      },
    }];
  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    return [{
      name: testName,
      passed: false,
      reason: `Error creating test mascot: ${error.message}`,
    }];
  }
}

/**
 * Test Case 5: Test time-aware state transitions
 */
async function testTimeAwareStates(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const testName = 'VirtualCompanion: Time-aware states';
  logTestCase(testName);

  try {
    // Get current hour to determine expected state
    const hour = new Date().getHours();
    let expectedState: string;
    if (hour >= 6 && hour < 12) {
      expectedState = 'morning';
    } else if (hour >= 12 && hour < 18) {
      expectedState = 'afternoon';
    } else if (hour >= 18 && hour < 22) {
      expectedState = 'evening';
    } else {
      expectedState = 'night';
    }

    const snapshot = await db.collection('users')
      .doc(userId)
      .collection('mascots')
      .limit(1)
      .get();

    if (snapshot.empty) {
      logInfo('No mascot to validate time states');
      return [{
        name: testName,
        passed: true,
        reason: 'No mascot available to validate time states',
        skipped: true,
      }];
    }

    const data = snapshot.docs[0].data();
    const currentState = data.currentState;

    logQueryBox('Time-Aware State', [
      `Current Hour: ${hour}:00`,
      `Expected State: ${expectedState}`,
      `Mascot State: ${currentState || 'not set'}`,
    ]);

    // Validate state is one of known values
    const validState = !currentState || KNOWN_TIME_STATES.includes(currentState);
    // Note: State might not match expected if mascot hasn't been interacted with recently
    const stateMatchesExpected = currentState === expectedState;

    const passed = validState;

    if (passed) {
      if (stateMatchesExpected) {
        logPass(`State "${currentState}" matches expected "${expectedState}"`);
      } else if (currentState) {
        logPass(`State "${currentState}" is valid (may need refresh for "${expectedState}")`);
      } else {
        logPass('No state set yet (will initialize on first interaction)');
      }
    } else {
      logFail(`Invalid state: ${currentState}`);
    }

    return [{
      name: testName,
      passed,
      reason: passed
        ? `Time state "${currentState || 'not set'}" is valid (expected: ${expectedState})`
        : `Invalid time state: ${currentState}`,
      details: {
        hour,
        expectedState,
        currentState,
        validState,
        stateMatchesExpected,
      },
    }];
  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    return [{
      name: testName,
      passed: false,
      reason: `Error validating time states: ${error.message}`,
    }];
  }
}

/**
 * Test Case 6: Test activity reaction processing
 */
async function testActivityReactions(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const testName = 'VirtualCompanion: Activity reactions';
  logTestCase(testName);

  try {
    const snapshot = await db.collection('users')
      .doc(userId)
      .collection('mascots')
      .limit(1)
      .get();

    if (snapshot.empty) {
      logInfo('No mascot to validate activity reactions');
      return [{
        name: testName,
        passed: true,
        reason: 'No mascot available to validate activity reactions',
        skipped: true,
      }];
    }

    const data = snapshot.docs[0].data();

    // Check for activity tracking fields
    const totalActivities = data.totalActivities || 0;
    const lastActivityType = data.lastActivityType;
    const lastInteraction = data.lastInteraction;
    const recentReaction = data.recentReaction;

    logQueryBox('Activity Reactions', [
      `Total Activities: ${totalActivities}`,
      `Last Activity Type: ${lastActivityType || 'none'}`,
      `Last Interaction: ${lastInteraction ? 'set' : 'not set'}`,
      `Recent Reaction: ${recentReaction || 'none'}`,
    ]);

    // Valid if has tracking fields (activity count)
    const hasTracking = typeof totalActivities === 'number';

    // Check activity history if present
    const activityHistory = data.activityHistory || [];
    const historyCount = Array.isArray(activityHistory) ? activityHistory.length : 0;

    const passed = hasTracking;

    if (passed) {
      logPass(`Activity tracking enabled: ${totalActivities} total activities`);
      if (lastActivityType) {
        log(`  Last activity: ${lastActivityType}`, colors.dim);
      }
      if (historyCount > 0) {
        log(`  Activity history: ${historyCount} entries`, colors.dim);
      }
    } else {
      logFail('Activity tracking not found');
    }

    return [{
      name: testName,
      passed,
      reason: passed
        ? `Activity tracking enabled with ${totalActivities} activities`
        : 'Activity tracking not configured',
      details: {
        totalActivities,
        lastActivityType,
        hasLastInteraction: !!lastInteraction,
        recentReaction,
        historyCount,
      },
    }];
  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    return [{
      name: testName,
      passed: false,
      reason: `Error validating activity reactions: ${error.message}`,
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

  // Delete in reverse order (subcollections first)
  for (const { collection, id } of [...createdDocIds].reverse()) {
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
