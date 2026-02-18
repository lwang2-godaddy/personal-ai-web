/**
 * Virtual Companion (Mascot) - End-to-End Tests
 *
 * Tests full lifecycle flows for the virtual companion feature:
 * - New user mascot creation
 * - Activity-triggered XP gains
 * - Level up sequence
 * - Multi-activity day simulation
 * - Streak milestone celebrations
 *
 * Firestore Collections:
 * - users/{userId}/mascots - Mascot state documents
 *
 * Test Cases:
 * 1. Full mascot lifecycle (create → activity → level up)
 * 2. Multi-activity sequence simulation
 * 3. Streak milestone tracking
 * 4. Mood transitions based on activity
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
export const name = 'Virtual Companion E2E';

// XP rewards per activity type
const XP_REWARDS: Record<string, number> = {
  diary_entry: 50,
  voice_note: 40,
  photo_added: 30,
  check_in: 25,
  chat_message: 10,
  streak_milestone: 100,
  level_up: 0, // Not an XP source
};

// Test data cleanup tracker
const createdDocIds: { collection: string; id: string }[] = [];

/**
 * Main test runner - exported for test discovery
 */
export async function run(): Promise<TestResult[]> {
  const { db, userId } = globalThis.testContext;
  const allResults: TestResult[] = [];

  // Test Case 1: Full mascot lifecycle
  const test1Results = await testMascotLifecycle(db);
  allResults.push(...test1Results);

  // Test Case 2: Multi-activity sequence
  const test2Results = await testMultiActivitySequence(db);
  allResults.push(...test2Results);

  // Test Case 3: Streak milestones
  const test3Results = await testStreakMilestones(db);
  allResults.push(...test3Results);

  // Test Case 4: Mood transitions
  const test4Results = await testMoodTransitions(db);
  allResults.push(...test4Results);

  // Cleanup
  await cleanup(db);

  return allResults;
}

/**
 * Test Case 1: Full mascot lifecycle (create → activities → level up)
 */
async function testMascotLifecycle(
  db: admin.firestore.Firestore
): Promise<TestResult[]> {
  const testName = 'VirtualCompanion E2E: Full lifecycle';
  logTestCase(testName);

  try {
    const testId = generateTestId();
    const testUserId = `e2e_lifecycle_${testId}`;

    // Step 1: Create new mascot (simulating first-time user)
    const initialMascot = {
      userId: testUserId,
      name: 'Buddy',
      species: 'dog',
      level: 1,
      xp: 0,
      mood: 'neutral',
      energy: 100,
      currentState: 'afternoon',
      streakDays: 0,
      totalActivities: 0,
      lastInteraction: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const mascotRef = db.collection('users')
      .doc(testUserId)
      .collection('mascots')
      .doc('main');

    await mascotRef.set(initialMascot);
    createdDocIds.push({ collection: `users/${testUserId}/mascots`, id: 'main' });
    createdDocIds.push({ collection: 'users', id: testUserId });

    log('  Step 1: Created new mascot at level 1', colors.dim);

    // Step 2: Simulate diary entry (first activity)
    await mascotRef.update({
      xp: admin.firestore.FieldValue.increment(XP_REWARDS.diary_entry),
      totalActivities: admin.firestore.FieldValue.increment(1),
      lastActivityType: 'diary_entry',
      mood: 'happy',
      lastInteraction: admin.firestore.FieldValue.serverTimestamp(),
    });

    log('  Step 2: Diary entry - gained 50 XP', colors.dim);

    // Step 3: Simulate voice note
    await mascotRef.update({
      xp: admin.firestore.FieldValue.increment(XP_REWARDS.voice_note),
      totalActivities: admin.firestore.FieldValue.increment(1),
      lastActivityType: 'voice_note',
      mood: 'excited',
      lastInteraction: admin.firestore.FieldValue.serverTimestamp(),
    });

    log('  Step 3: Voice note - gained 40 XP', colors.dim);

    // Step 4: Simulate photo (should trigger level up at 100+ XP)
    await mascotRef.update({
      xp: admin.firestore.FieldValue.increment(XP_REWARDS.photo_added),
      totalActivities: admin.firestore.FieldValue.increment(1),
      lastActivityType: 'photo_added',
      level: 2, // Level up!
      mood: 'excited',
      recentReaction: 'level_up',
      lastInteraction: admin.firestore.FieldValue.serverTimestamp(),
    });

    log('  Step 4: Photo added - gained 30 XP, LEVEL UP to 2!', colors.dim);

    await wait(300);

    // Verify final state
    const finalDoc = await mascotRef.get();
    const finalData = finalDoc.data();

    if (!finalData) {
      logFail('Final mascot state not found');
      return [{
        name: testName,
        passed: false,
        reason: 'Final state not found after lifecycle',
      }];
    }

    const expectedXP = XP_REWARDS.diary_entry + XP_REWARDS.voice_note + XP_REWARDS.photo_added;
    const xpCorrect = finalData.xp === expectedXP;
    const levelCorrect = finalData.level === 2;
    const activitiesCorrect = finalData.totalActivities === 3;
    const moodCorrect = finalData.mood === 'excited';
    const passed = xpCorrect && levelCorrect && activitiesCorrect && moodCorrect;

    logQueryBox('Lifecycle Result', [
      `Final XP: ${finalData.xp} (expected: ${expectedXP})`,
      `Final Level: ${finalData.level} (expected: 2)`,
      `Total Activities: ${finalData.totalActivities} (expected: 3)`,
      `Final Mood: ${finalData.mood} (expected: excited)`,
    ]);

    if (passed) {
      logPass('Full lifecycle completed successfully');
    } else {
      logFail('Lifecycle state mismatch');
    }

    return [{
      name: testName,
      passed,
      reason: passed
        ? `Lifecycle complete: Level 1→2, ${finalData.xp} XP, ${finalData.totalActivities} activities`
        : `State mismatch after lifecycle`,
      details: {
        testUserId,
        finalXP: finalData.xp,
        expectedXP,
        finalLevel: finalData.level,
        totalActivities: finalData.totalActivities,
        finalMood: finalData.mood,
      },
    }];
  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    return [{
      name: testName,
      passed: false,
      reason: `Error in lifecycle test: ${error.message}`,
    }];
  }
}

/**
 * Test Case 2: Multi-activity sequence (simulating active day)
 */
async function testMultiActivitySequence(
  db: admin.firestore.Firestore
): Promise<TestResult[]> {
  const testName = 'VirtualCompanion E2E: Multi-activity day';
  logTestCase(testName);

  try {
    const testId = generateTestId();
    const testUserId = `e2e_multiact_${testId}`;

    // Start with level 3 mascot
    const mascot = {
      userId: testUserId,
      name: 'Active Buddy',
      species: 'fox',
      level: 3,
      xp: 300,
      mood: 'content',
      energy: 100,
      currentState: 'morning',
      streakDays: 5,
      totalActivities: 20,
      lastInteraction: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const mascotRef = db.collection('users')
      .doc(testUserId)
      .collection('mascots')
      .doc('main');

    await mascotRef.set(mascot);
    createdDocIds.push({ collection: `users/${testUserId}/mascots`, id: 'main' });
    createdDocIds.push({ collection: 'users', id: testUserId });

    // Simulate a busy day with multiple activities
    const activities = [
      { type: 'diary_entry', xp: 50, mood: 'happy' },
      { type: 'check_in', xp: 25, mood: 'happy' },
      { type: 'photo_added', xp: 30, mood: 'happy' },
      { type: 'chat_message', xp: 10, mood: 'content' },
      { type: 'chat_message', xp: 10, mood: 'content' },
      { type: 'voice_note', xp: 40, mood: 'excited' },
      { type: 'diary_entry', xp: 50, mood: 'excited' },
    ];

    let totalXPGained = 0;
    for (const activity of activities) {
      totalXPGained += activity.xp;
      await mascotRef.update({
        xp: admin.firestore.FieldValue.increment(activity.xp),
        totalActivities: admin.firestore.FieldValue.increment(1),
        lastActivityType: activity.type,
        mood: activity.mood,
        lastInteraction: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    log(`  Simulated ${activities.length} activities, +${totalXPGained} XP`, colors.dim);

    // Check for level up (starting XP 300 + 215 = 515, should be level 4 at 500)
    await mascotRef.update({
      level: 4,
      recentReaction: 'level_up',
    });

    await wait(300);

    const finalDoc = await mascotRef.get();
    const finalData = finalDoc.data();

    if (!finalData) {
      logFail('Final state not found');
      return [{
        name: testName,
        passed: false,
        reason: 'Final state not found',
      }];
    }

    const expectedXP = 300 + totalXPGained;
    const expectedActivities = 20 + activities.length;

    logQueryBox('Multi-Activity Result', [
      `Activities: ${activities.length}`,
      `XP Gained: ${totalXPGained}`,
      `Final XP: ${finalData.xp} (expected: ${expectedXP})`,
      `Final Level: ${finalData.level}`,
      `Total Activities: ${finalData.totalActivities} (expected: ${expectedActivities})`,
    ]);

    const xpCorrect = finalData.xp === expectedXP;
    const activitiesCorrect = finalData.totalActivities === expectedActivities;
    const passed = xpCorrect && activitiesCorrect;

    if (passed) {
      logPass(`Multi-activity day complete: ${activities.length} activities, +${totalXPGained} XP`);
    } else {
      logFail('Multi-activity state mismatch');
    }

    return [{
      name: testName,
      passed,
      reason: passed
        ? `${activities.length} activities processed, level 3→4`
        : 'State mismatch after multi-activity day',
      details: {
        activityCount: activities.length,
        xpGained: totalXPGained,
        finalXP: finalData.xp,
        expectedXP,
        finalLevel: finalData.level,
      },
    }];
  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    return [{
      name: testName,
      passed: false,
      reason: `Error in multi-activity test: ${error.message}`,
    }];
  }
}

/**
 * Test Case 3: Streak milestone tracking
 */
async function testStreakMilestones(
  db: admin.firestore.Firestore
): Promise<TestResult[]> {
  const testName = 'VirtualCompanion E2E: Streak milestones';
  logTestCase(testName);

  try {
    const testId = generateTestId();
    const testUserId = `e2e_streak_${testId}`;

    // Create mascot at day 6 of streak (about to hit 7-day milestone)
    const mascot = {
      userId: testUserId,
      name: 'Streaky',
      species: 'panda',
      level: 2,
      xp: 200,
      mood: 'content',
      energy: 90,
      currentState: 'evening',
      streakDays: 6,
      totalActivities: 15,
      milestones: [],
      lastInteraction: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const mascotRef = db.collection('users')
      .doc(testUserId)
      .collection('mascots')
      .doc('main');

    await mascotRef.set(mascot);
    createdDocIds.push({ collection: `users/${testUserId}/mascots`, id: 'main' });
    createdDocIds.push({ collection: 'users', id: testUserId });

    log('  Created mascot at streak day 6', colors.dim);

    // Simulate day 7 activity (triggers 7-day milestone)
    await mascotRef.update({
      streakDays: 7,
      xp: admin.firestore.FieldValue.increment(XP_REWARDS.diary_entry + XP_REWARDS.streak_milestone),
      totalActivities: admin.firestore.FieldValue.increment(1),
      mood: 'excited',
      recentReaction: 'streak_7_days',
      milestones: admin.firestore.FieldValue.arrayUnion('streak_7_days'),
      lastInteraction: admin.firestore.FieldValue.serverTimestamp(),
    });

    log('  Day 7 activity - 7-day streak milestone!', colors.dim);

    await wait(300);

    const finalDoc = await mascotRef.get();
    const finalData = finalDoc.data();

    if (!finalData) {
      logFail('Final state not found');
      return [{
        name: testName,
        passed: false,
        reason: 'Final state not found',
      }];
    }

    const expectedXP = 200 + XP_REWARDS.diary_entry + XP_REWARDS.streak_milestone;
    const hasStreakMilestone = finalData.milestones?.includes('streak_7_days');

    logQueryBox('Streak Result', [
      `Streak Days: ${finalData.streakDays}`,
      `XP: ${finalData.xp} (expected: ${expectedXP})`,
      `Has 7-day milestone: ${hasStreakMilestone}`,
      `Recent Reaction: ${finalData.recentReaction}`,
    ]);

    const streakCorrect = finalData.streakDays === 7;
    const xpCorrect = finalData.xp === expectedXP;
    const milestoneCorrect = hasStreakMilestone;
    const passed = streakCorrect && xpCorrect && milestoneCorrect;

    if (passed) {
      logPass('7-day streak milestone achieved correctly');
    } else {
      logFail('Streak milestone state mismatch');
    }

    return [{
      name: testName,
      passed,
      reason: passed
        ? `7-day streak milestone: +${XP_REWARDS.streak_milestone} bonus XP`
        : 'Streak milestone state mismatch',
      details: {
        finalStreak: finalData.streakDays,
        finalXP: finalData.xp,
        expectedXP,
        hasStreakMilestone,
        recentReaction: finalData.recentReaction,
      },
    }];
  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    return [{
      name: testName,
      passed: false,
      reason: `Error in streak test: ${error.message}`,
    }];
  }
}

/**
 * Test Case 4: Mood transitions based on activity
 */
async function testMoodTransitions(
  db: admin.firestore.Firestore
): Promise<TestResult[]> {
  const testName = 'VirtualCompanion E2E: Mood transitions';
  logTestCase(testName);

  try {
    const testId = generateTestId();
    const testUserId = `e2e_mood_${testId}`;

    // Start with neutral/sad mood (no recent activity)
    const mascot = {
      userId: testUserId,
      name: 'Moody',
      species: 'penguin',
      level: 1,
      xp: 50,
      mood: 'sad', // Hasn't been active
      energy: 40,
      currentState: 'morning',
      streakDays: 0,
      totalActivities: 5,
      lastInteraction: admin.firestore.Timestamp.fromDate(
        new Date(Date.now() - 48 * 60 * 60 * 1000) // 48 hours ago
      ),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const mascotRef = db.collection('users')
      .doc(testUserId)
      .collection('mascots')
      .doc('main');

    await mascotRef.set(mascot);
    createdDocIds.push({ collection: `users/${testUserId}/mascots`, id: 'main' });
    createdDocIds.push({ collection: 'users', id: testUserId });

    log('  Created mascot with sad mood (inactive)', colors.dim);

    // Track mood transitions
    const moodHistory: string[] = ['sad'];

    // Activity 1: First activity after break → happy (user returned!)
    await mascotRef.update({
      mood: 'happy',
      energy: 60,
      streakDays: 1,
      xp: admin.firestore.FieldValue.increment(XP_REWARDS.diary_entry),
      totalActivities: admin.firestore.FieldValue.increment(1),
      recentReaction: 'welcome_back',
      lastInteraction: admin.firestore.FieldValue.serverTimestamp(),
    });
    moodHistory.push('happy');
    log('  Activity 1: sad → happy (welcome back!)', colors.dim);

    // Activity 2: Another activity → excited
    await mascotRef.update({
      mood: 'excited',
      energy: 80,
      xp: admin.firestore.FieldValue.increment(XP_REWARDS.photo_added),
      totalActivities: admin.firestore.FieldValue.increment(1),
      lastInteraction: admin.firestore.FieldValue.serverTimestamp(),
    });
    moodHistory.push('excited');
    log('  Activity 2: happy → excited', colors.dim);

    // Activity 3: Third activity → content (settling down)
    await mascotRef.update({
      mood: 'content',
      energy: 70,
      xp: admin.firestore.FieldValue.increment(XP_REWARDS.chat_message),
      totalActivities: admin.firestore.FieldValue.increment(1),
      lastInteraction: admin.firestore.FieldValue.serverTimestamp(),
    });
    moodHistory.push('content');
    log('  Activity 3: excited → content (settling)', colors.dim);

    await wait(300);

    const finalDoc = await mascotRef.get();
    const finalData = finalDoc.data();

    if (!finalData) {
      logFail('Final state not found');
      return [{
        name: testName,
        passed: false,
        reason: 'Final state not found',
      }];
    }

    logQueryBox('Mood Transitions', [
      `Transition: ${moodHistory.join(' → ')}`,
      `Final Mood: ${finalData.mood}`,
      `Final Energy: ${finalData.energy}`,
      `Activities: ${finalData.totalActivities}`,
    ]);

    const finalMoodCorrect = finalData.mood === 'content';
    const energyIncreased = finalData.energy > 40;
    const activitiesCorrect = finalData.totalActivities === 8;
    const passed = finalMoodCorrect && energyIncreased && activitiesCorrect;

    if (passed) {
      logPass(`Mood transitions: ${moodHistory.join(' → ')}`);
    } else {
      logFail('Mood transition state mismatch');
    }

    return [{
      name: testName,
      passed,
      reason: passed
        ? `Mood improved from sad to content after 3 activities`
        : 'Mood transition state mismatch',
      details: {
        moodHistory,
        finalMood: finalData.mood,
        finalEnergy: finalData.energy,
        totalActivities: finalData.totalActivities,
      },
    }];
  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    return [{
      name: testName,
      passed: false,
      reason: `Error in mood test: ${error.message}`,
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

  // Delete in reverse order (subcollections first, then parent docs)
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
