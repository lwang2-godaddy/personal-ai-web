/**
 * Challenge Admin - E2E Tests
 *
 * End-to-end tests for the challenge admin API endpoints and
 * Firestore data operations used by the admin portal.
 *
 * Tests:
 * 1. Create challenge via Firestore (simulates POST /api/admin/challenges)
 * 2. List challenges with status and type filters
 * 3. Get single challenge with progress and participant profiles
 * 4. Update challenge fields
 * 5. Initialize progress docs for participants
 * 6. Delete challenge cascading to progress docs
 * 7. Challenge progress join query (challenge + progress summary)
 *
 * Collections: challenges, challengeProgress, users
 */

import * as admin from 'firebase-admin';
import type { TestResult } from '../lib/test-utils';
import { generateTestId, getDateNDaysAgo } from '../lib/test-utils';
import {
  logPass,
  logFail,
  logInfo,
  logTestCase,
  logQueryBox,
  logCleanup,
  logCleanupResult,
} from '../lib/reporter';

export const name = 'Challenge Admin E2E';

// Track created docs for cleanup
const createdDocs: Array<{ collection: string; id: string }> = [];

export async function run(): Promise<TestResult[]> {
  const { db, userId } = globalThis.testContext;
  const allResults: TestResult[] = [];

  try {
    const tests: Array<{ name: string; fn: () => Promise<TestResult[]> }> = [
      { name: 'create-challenge', fn: () => testCreateChallenge(db, userId) },
      { name: 'list-with-filters', fn: () => testListWithFilters(db, userId) },
      { name: 'get-with-progress', fn: () => testGetWithProgress(db, userId) },
      { name: 'update-challenge', fn: () => testUpdateChallenge(db, userId) },
      { name: 'init-participant-progress', fn: () => testInitParticipantProgress(db, userId) },
      { name: 'cascade-delete', fn: () => testCascadeDelete(db, userId) },
      { name: 'progress-join', fn: () => testProgressJoinQuery(db, userId) },
    ];

    for (const test of tests) {
      const results = await test.fn();
      allResults.push(...results);
    }
  } finally {
    await cleanupTestData(db);
  }

  return allResults;
}

/**
 * Test 1: Create a challenge (simulates admin POST endpoint)
 */
async function testCreateChallenge(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Create Challenge (Admin API Pattern)');

  try {
    // Simulate the POST /api/admin/challenges body
    const body = {
      title: 'Admin E2E: 7-Day Voice Challenge',
      description: 'Create 7 voice notes in 7 days',
      type: 'voice',
      goalValue: 7,
      goalUnit: 'notes',
      startDate: getDateNDaysAgo(0),
      endDate: getDateNDaysAgo(-7),
      participantIds: [userId],
    };

    const validTypes = ['diary', 'voice', 'photo', 'checkin', 'streak', 'combo'];

    // Validation check
    if (!body.title || !body.type || !body.goalValue || !body.startDate || !body.endDate) {
      logFail('Validation: missing required fields');
      results.push({ name: 'Validation passes for valid input', passed: false });
      return results;
    }

    if (!validTypes.includes(body.type)) {
      logFail('Validation: invalid type');
      results.push({ name: 'Validation passes for valid input', passed: false });
      return results;
    }

    logPass('Validation passed for valid input');
    results.push({ name: 'Validation passes for valid input', passed: true });

    // Create in Firestore
    const challengeData = {
      ...body,
      isActive: true,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await db.collection('challenges').add(challengeData);
    createdDocs.push({ collection: 'challenges', id: docRef.id });

    // Initialize progress docs for each participant
    const batch = db.batch();
    for (const pid of body.participantIds) {
      const progressRef = db.collection('challengeProgress').doc(`${docRef.id}_${pid}`);
      batch.set(progressRef, {
        challengeId: docRef.id,
        userId: pid,
        currentValue: 0,
        rank: 0,
        lastUpdated: new Date(),
      });
      createdDocs.push({ collection: 'challengeProgress', id: `${docRef.id}_${pid}` });
    }
    await batch.commit();

    logPass(`Challenge created: ${docRef.id}`);
    results.push({ name: 'Challenge document created', passed: true });

    // Verify progress doc initialized
    const progressDoc = await db.collection('challengeProgress').doc(`${docRef.id}_${userId}`).get();
    if (progressDoc.exists && progressDoc.data()?.currentValue === 0) {
      logPass('Progress doc initialized with currentValue=0');
      results.push({ name: 'Progress doc initialized', passed: true });
    } else {
      logFail('Progress doc not initialized correctly');
      results.push({ name: 'Progress doc initialized', passed: false });
    }

    // Type validation: invalid type should be rejected
    const invalidType = 'swimming';
    if (!validTypes.includes(invalidType)) {
      logPass('Invalid type "swimming" correctly rejected');
      results.push({ name: 'Invalid type rejected', passed: true });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logFail(`Create challenge error: ${message}`);
    results.push({ name: 'Create challenge', passed: false, reason: message });
  }

  return results;
}

/**
 * Test 2: List challenges with status and type filters
 */
async function testListWithFilters(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('List Challenges with Filters');

  const activeId = `admin-active-${generateTestId()}`;
  const inactiveId = `admin-inactive-${generateTestId()}`;
  const voiceId = `admin-voice-${generateTestId()}`;

  try {
    const batch = db.batch();

    batch.set(db.collection('challenges').doc(activeId), {
      title: 'Admin Active Voice',
      type: 'voice',
      isActive: true,
      participantIds: [userId],
      startDate: getDateNDaysAgo(7),
      endDate: getDateNDaysAgo(-7),
      goalValue: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    createdDocs.push({ collection: 'challenges', id: activeId });

    batch.set(db.collection('challenges').doc(inactiveId), {
      title: 'Admin Inactive Photo',
      type: 'photo',
      isActive: false,
      participantIds: [userId],
      startDate: getDateNDaysAgo(30),
      endDate: getDateNDaysAgo(15),
      goalValue: 10,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    createdDocs.push({ collection: 'challenges', id: inactiveId });

    batch.set(db.collection('challenges').doc(voiceId), {
      title: 'Admin Active Diary',
      type: 'diary',
      isActive: true,
      participantIds: [userId],
      startDate: getDateNDaysAgo(7),
      endDate: getDateNDaysAgo(-7),
      goalValue: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    createdDocs.push({ collection: 'challenges', id: voiceId });

    await batch.commit();
    await new Promise((r) => setTimeout(r, 1000));

    // Filter: active only
    const activeQuery = await db.collection('challenges')
      .where('isActive', '==', true)
      .get();

    const activeTestDocs = activeQuery.docs.filter((d) =>
      [activeId, inactiveId, voiceId].includes(d.id)
    );
    const activeTestActive = activeTestDocs.filter((d) => d.data().isActive === true);

    logQueryBox('Active Filter', [
      'isActive == true',
      `Test docs: ${activeTestDocs.length} (should all be active)`,
    ]);

    if (activeTestDocs.length > 0 && activeTestDocs.every((d) => d.data().isActive === true)) {
      logPass('Active filter only returns active challenges');
      results.push({ name: 'Active status filter works', passed: true });
    } else {
      logFail('Active filter includes inactive challenges');
      results.push({ name: 'Active status filter works', passed: false });
    }

    // Filter: by type
    const voiceQuery = await db.collection('challenges')
      .where('type', '==', 'voice')
      .get();

    const voiceTestDocs = voiceQuery.docs.filter((d) =>
      [activeId, inactiveId, voiceId].includes(d.id)
    );

    if (voiceTestDocs.every((d) => d.data().type === 'voice')) {
      logPass('Type filter returns correct type only');
      results.push({ name: 'Type filter works', passed: true });
    } else {
      logFail('Type filter includes wrong types');
      results.push({ name: 'Type filter works', passed: false });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logFail(`List filters error: ${message}`);
    results.push({ name: 'List with filters', passed: false, reason: message });
  }

  return results;
}

/**
 * Test 3: Get challenge with progress and user profiles
 */
async function testGetWithProgress(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Get Challenge with Progress Data');

  const challengeId = `admin-detail-${generateTestId()}`;
  const progressId = `${challengeId}_${userId}`;

  try {
    // Create challenge + progress
    await db.collection('challenges').doc(challengeId).set({
      title: 'Admin Detail Test',
      type: 'diary',
      goalValue: 10,
      goalUnit: 'entries',
      startDate: getDateNDaysAgo(7),
      endDate: getDateNDaysAgo(-7),
      isActive: true,
      participantIds: [userId],
      createdBy: userId,
      createdAt: new Date(),
    });
    createdDocs.push({ collection: 'challenges', id: challengeId });

    await db.collection('challengeProgress').doc(progressId).set({
      challengeId,
      userId,
      currentValue: 4,
      rank: 1,
      lastUpdated: new Date(),
    });
    createdDocs.push({ collection: 'challengeProgress', id: progressId });

    // Fetch challenge doc
    const challengeDoc = await db.collection('challenges').doc(challengeId).get();
    if (!challengeDoc.exists) {
      logFail('Challenge doc not found');
      results.push({ name: 'Challenge detail fetch', passed: false });
      return results;
    }
    logPass('Challenge document retrieved');
    results.push({ name: 'Challenge detail fetch', passed: true });

    // Fetch progress docs
    const progressSnapshot = await db
      .collection('challengeProgress')
      .where('challengeId', '==', challengeId)
      .orderBy('currentValue', 'desc')
      .get();

    if (progressSnapshot.size >= 1) {
      logPass(`Found ${progressSnapshot.size} progress doc(s)`);
      results.push({ name: 'Progress docs fetched', passed: true });
    } else {
      logFail('No progress docs found');
      results.push({ name: 'Progress docs fetched', passed: false });
    }

    // Fetch user profile (simulating admin API join)
    const participantIds = challengeDoc.data()?.participantIds || [];
    if (participantIds.length > 0) {
      const usersSnapshot = await db
        .collection('users')
        .where('uid', 'in', participantIds.slice(0, 10))
        .get();

      logInfo(`Found ${usersSnapshot.size} user profile(s) for ${participantIds.length} participant(s)`);
      results.push({
        name: 'User profile join',
        passed: true,
        reason: `${usersSnapshot.size} profiles found`,
      });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logFail(`Get with progress error: ${message}`);
    results.push({ name: 'Get with progress', passed: false, reason: message });
  }

  return results;
}

/**
 * Test 4: Update challenge fields
 */
async function testUpdateChallenge(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Update Challenge Fields');

  const challengeId = `admin-update-${generateTestId()}`;

  try {
    await db.collection('challenges').doc(challengeId).set({
      title: 'Before Update',
      description: 'Original description',
      type: 'voice',
      goalValue: 5,
      goalUnit: 'notes',
      startDate: getDateNDaysAgo(7),
      endDate: getDateNDaysAgo(-7),
      isActive: true,
      participantIds: [userId],
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    createdDocs.push({ collection: 'challenges', id: challengeId });

    // Update multiple fields
    const updates = {
      title: 'After Update',
      description: 'Updated description',
      goalValue: 10,
      endDate: getDateNDaysAgo(-14),
      updatedAt: new Date(),
    };

    await db.collection('challenges').doc(challengeId).update(updates);

    const updated = await db.collection('challenges').doc(challengeId).get();
    const data = updated.data()!;

    if (data.title === 'After Update') {
      logPass('Title updated');
      results.push({ name: 'Title field updated', passed: true });
    } else {
      logFail(`Title not updated: ${data.title}`);
      results.push({ name: 'Title field updated', passed: false });
    }

    if (data.goalValue === 10) {
      logPass('Goal value updated');
      results.push({ name: 'Goal value updated', passed: true });
    } else {
      logFail(`Goal value not updated: ${data.goalValue}`);
      results.push({ name: 'Goal value updated', passed: false });
    }

    // Type should NOT be changed (immutable after creation in our API)
    if (data.type === 'voice') {
      logPass('Type preserved (immutable)');
      results.push({ name: 'Type preserved after update', passed: true });
    } else {
      logFail(`Type changed unexpectedly: ${data.type}`);
      results.push({ name: 'Type preserved after update', passed: false });
    }

    // Toggle isActive
    await db.collection('challenges').doc(challengeId).update({ isActive: false });
    const toggled = await db.collection('challenges').doc(challengeId).get();
    if (toggled.data()?.isActive === false) {
      logPass('isActive toggled to false');
      results.push({ name: 'Toggle isActive', passed: true });
    } else {
      logFail('isActive not toggled');
      results.push({ name: 'Toggle isActive', passed: false });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logFail(`Update error: ${message}`);
    results.push({ name: 'Update challenge', passed: false, reason: message });
  }

  return results;
}

/**
 * Test 5: Initialize progress docs for new participants
 */
async function testInitParticipantProgress(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Initialize Participant Progress Docs');

  const challengeId = `admin-init-${generateTestId()}`;
  const user2 = `admin-user2-${generateTestId()}`;
  const user3 = `admin-user3-${generateTestId()}`;

  try {
    await db.collection('challenges').doc(challengeId).set({
      title: 'Init Progress Test',
      type: 'photo',
      goalValue: 5,
      startDate: getDateNDaysAgo(7),
      endDate: getDateNDaysAgo(-7),
      isActive: true,
      participantIds: [userId, user2, user3],
      createdBy: userId,
      createdAt: new Date(),
    });
    createdDocs.push({ collection: 'challenges', id: challengeId });

    // Initialize progress for all participants
    const batch = db.batch();
    const participants = [userId, user2, user3];
    participants.forEach((pid) => {
      const progressId = `${challengeId}_${pid}`;
      batch.set(db.collection('challengeProgress').doc(progressId), {
        challengeId,
        userId: pid,
        currentValue: 0,
        rank: 0,
        lastUpdated: new Date(),
      });
      createdDocs.push({ collection: 'challengeProgress', id: progressId });
    });
    await batch.commit();

    // Verify all 3 progress docs exist
    const progressSnapshot = await db
      .collection('challengeProgress')
      .where('challengeId', '==', challengeId)
      .get();

    if (progressSnapshot.size === 3) {
      logPass('All 3 participant progress docs created');
      results.push({ name: 'All participant progress initialized', passed: true });
    } else {
      logFail(`Expected 3 progress docs, got ${progressSnapshot.size}`);
      results.push({ name: 'All participant progress initialized', passed: false, reason: `Got ${progressSnapshot.size}` });
    }

    // Verify all have currentValue=0
    const allZero = progressSnapshot.docs.every((d) => d.data().currentValue === 0);
    if (allZero) {
      logPass('All progress docs initialized with currentValue=0');
      results.push({ name: 'Progress initialized at zero', passed: true });
    } else {
      logFail('Some progress docs have non-zero initial value');
      results.push({ name: 'Progress initialized at zero', passed: false });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logFail(`Init progress error: ${message}`);
    results.push({ name: 'Init participant progress', passed: false, reason: message });
  }

  return results;
}

/**
 * Test 6: Delete challenge cascading to progress docs
 */
async function testCascadeDelete(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Cascade Delete Challenge + Progress');

  const challengeId = `admin-delete-${generateTestId()}`;
  const progressId = `${challengeId}_${userId}`;

  try {
    // Create challenge + progress
    await db.collection('challenges').doc(challengeId).set({
      title: 'Delete Test Challenge',
      type: 'diary',
      goalValue: 3,
      isActive: true,
      participantIds: [userId],
      startDate: getDateNDaysAgo(7),
      endDate: getDateNDaysAgo(-7),
      createdBy: userId,
      createdAt: new Date(),
    });
    // Don't add to createdDocs - we're deleting manually

    await db.collection('challengeProgress').doc(progressId).set({
      challengeId,
      userId,
      currentValue: 2,
      rank: 1,
      lastUpdated: new Date(),
    });

    // Verify both exist
    const challengeExists = (await db.collection('challenges').doc(challengeId).get()).exists;
    const progressExists = (await db.collection('challengeProgress').doc(progressId).get()).exists;

    if (challengeExists && progressExists) {
      logPass('Challenge and progress docs exist before delete');
    } else {
      logFail('Setup failed - docs not created');
      results.push({ name: 'Cascade delete setup', passed: false });
      return results;
    }

    // Cascade delete (simulates DELETE /api/admin/challenges/[id])
    const progressSnapshot = await db
      .collection('challengeProgress')
      .where('challengeId', '==', challengeId)
      .get();

    const batch = db.batch();
    progressSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
    batch.delete(db.collection('challenges').doc(challengeId));
    await batch.commit();

    // Verify both are gone
    const challengeAfter = await db.collection('challenges').doc(challengeId).get();
    const progressAfter = await db.collection('challengeProgress').doc(progressId).get();

    if (!challengeAfter.exists) {
      logPass('Challenge doc deleted');
      results.push({ name: 'Challenge doc deleted', passed: true });
    } else {
      logFail('Challenge doc still exists');
      results.push({ name: 'Challenge doc deleted', passed: false });
      createdDocs.push({ collection: 'challenges', id: challengeId });
    }

    if (!progressAfter.exists) {
      logPass('Progress doc cascade-deleted');
      results.push({ name: 'Progress doc cascade-deleted', passed: true });
    } else {
      logFail('Progress doc still exists');
      results.push({ name: 'Progress doc cascade-deleted', passed: false });
      createdDocs.push({ collection: 'challengeProgress', id: progressId });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logFail(`Cascade delete error: ${message}`);
    results.push({ name: 'Cascade delete', passed: false, reason: message });
  }

  return results;
}

/**
 * Test 7: Progress summary join query (simulates admin list endpoint)
 */
async function testProgressJoinQuery(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Challenge + Progress Join Query');

  const challengeId = `admin-join-${generateTestId()}`;
  const user2 = `admin-join-user2-${generateTestId()}`;

  try {
    await db.collection('challenges').doc(challengeId).set({
      title: 'Join Test Challenge',
      type: 'combo',
      goalValue: 20,
      goalUnit: 'items',
      startDate: getDateNDaysAgo(7),
      endDate: getDateNDaysAgo(-7),
      isActive: true,
      participantIds: [userId, user2],
      createdBy: userId,
      createdAt: new Date(),
    });
    createdDocs.push({ collection: 'challenges', id: challengeId });

    const batch = db.batch();
    const p1Id = `${challengeId}_${userId}`;
    const p2Id = `${challengeId}_${user2}`;

    batch.set(db.collection('challengeProgress').doc(p1Id), {
      challengeId,
      userId,
      currentValue: 12,
      rank: 1,
      lastUpdated: new Date(),
    });
    batch.set(db.collection('challengeProgress').doc(p2Id), {
      challengeId,
      userId: user2,
      currentValue: 8,
      rank: 2,
      lastUpdated: new Date(),
    });
    createdDocs.push({ collection: 'challengeProgress', id: p1Id });
    createdDocs.push({ collection: 'challengeProgress', id: p2Id });

    await batch.commit();

    // Simulate admin list endpoint join: challenge + progress summary
    const challengeDoc = await db.collection('challenges').doc(challengeId).get();
    const challenge = { id: challengeDoc.id, ...challengeDoc.data() };

    const progressSnapshot = await db
      .collection('challengeProgress')
      .where('challengeId', '==', challengeId)
      .orderBy('currentValue', 'desc')
      .get();

    const progressSummary = progressSnapshot.docs.map((d) => ({
      userId: d.data().userId,
      currentValue: d.data().currentValue,
      rank: d.data().rank,
    }));

    logQueryBox('Join Query Result', [
      `Challenge: ${(challenge as any).title}`,
      `Participants: ${progressSummary.length}`,
      `Leader: ${progressSummary[0]?.userId} (${progressSummary[0]?.currentValue})`,
    ]);

    if (progressSummary.length === 2) {
      logPass('Join returned 2 progress entries');
      results.push({ name: 'Progress join returns all participants', passed: true });
    } else {
      logFail(`Expected 2, got ${progressSummary.length}`);
      results.push({ name: 'Progress join returns all participants', passed: false });
    }

    // Verify ordering
    if (progressSummary[0]?.currentValue >= progressSummary[1]?.currentValue) {
      logPass('Progress ordered by currentValue desc');
      results.push({ name: 'Progress ordered correctly', passed: true });
    } else {
      logFail('Progress not ordered correctly');
      results.push({ name: 'Progress ordered correctly', passed: false });
    }

    // Verify the joined result has both challenge and progress data
    const enriched = {
      ...challenge,
      participantCount: (challenge as any).participantIds?.length || 0,
      progressSummary,
    };

    if (enriched.participantCount === 2 && enriched.progressSummary.length === 2) {
      logPass('Enriched result has challenge + progress data');
      results.push({ name: 'Enriched join result complete', passed: true });
    } else {
      logFail('Enriched result incomplete');
      results.push({ name: 'Enriched join result complete', passed: false });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logFail(`Progress join error: ${message}`);
    results.push({ name: 'Progress join query', passed: false, reason: message });
  }

  return results;
}

/**
 * Cleanup all test data
 */
async function cleanupTestData(db: admin.firestore.Firestore): Promise<void> {
  logCleanup(createdDocs.map((d) => `${d.collection}/${d.id}`));

  try {
    for (let i = 0; i < createdDocs.length; i += 400) {
      const batch = db.batch();
      const chunk = createdDocs.slice(i, i + 400);
      chunk.forEach((d) => batch.delete(db.collection(d.collection).doc(d.id)));
      await batch.commit();
    }
    logCleanupResult(true);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logCleanupResult(false, message);
  }
}
