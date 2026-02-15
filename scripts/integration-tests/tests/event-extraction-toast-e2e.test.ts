/**
 * Event Extraction Toast - E2E Integration Test
 *
 * Tests the full end-to-end flow:
 * 1. Create a text note with event-containing content
 * 2. Wait for Cloud Function to extract the event
 * 3. Verify extracted event fields
 * 4. Test confirm/cancel actions on extracted events
 * 5. Verify query filters exclude confirmed/cancelled events
 *
 * Test Cases:
 * 1. Text note → Event extraction (core E2E)
 * 2. Confirm extracted event
 * 3. Cancel extracted event
 * 4. Text note without events (negative test)
 * 5. Query only shows unconfirmed events
 */

import type { TestResult } from '../lib/test-utils';
import {
  generateTestId,
  wait,
} from '../lib/test-utils';
import {
  logPass,
  logFail,
  logInfo,
  logTestCase,
  logCleanup,
  logCleanupResult,
} from '../lib/reporter';
import * as admin from 'firebase-admin';

// Test name for discovery
export const name = 'Event Extraction Toast E2E';

// Track all created documents for cleanup
const cleanupIds: { collection: string; docId: string }[] = [];

/**
 * Main test runner
 */
export async function run(): Promise<TestResult[]> {
  const { db, userId, waitTimeMs } = globalThis.testContext;
  const allResults: TestResult[] = [];

  try {
    // Test Case 1: Text note → Event extraction
    const { results: test1Results, eventId: extractedEventId } =
      await testTextNoteEventExtraction(db, userId, waitTimeMs);
    allResults.push(...test1Results);

    // Test Case 2: Confirm extracted event
    if (extractedEventId) {
      const test2Results = await testConfirmEvent(db, extractedEventId);
      allResults.push(...test2Results);
    }

    // Test Case 3: Cancel extracted event (create a second note)
    const { results: test3Results, eventId: cancelledEventId } =
      await testCancelEvent(db, userId, waitTimeMs);
    allResults.push(...test3Results);

    // Test Case 4: Text note without events
    const test4Results = await testTextNoteWithoutEvents(db, userId, waitTimeMs);
    allResults.push(...test4Results);

    // Test Case 5: Query only shows unconfirmed events
    const test5Results = await testUnconfirmedEventsQuery(db, userId);
    allResults.push(...test5Results);
  } finally {
    // Cleanup all test data
    await cleanupTestData(db);
  }

  return allResults;
}

/**
 * Test Case 1: Create text note → Cloud Function extracts event → verify fields
 */
async function testTextNoteEventExtraction(
  db: FirebaseFirestore.Firestore,
  userId: string,
  waitTimeMs: number,
): Promise<{ results: TestResult[]; eventId: string | null }> {
  const results: TestResult[] = [];
  const testId = generateTestId();
  const noteId = `test-note-event-${testId}`;

  logTestCase('Test Case 1: Text note → Event extraction');

  try {
    // Create a text note with clear event content
    logInfo(`Creating text note: ${noteId}`);
    await db.collection('textNotes').doc(noteId).set({
      userId,
      content: 'Meeting with the team tomorrow at 3pm in the conference room to discuss the Q1 roadmap',
      title: 'Work Notes',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      syncStatus: 'synced',
    });
    cleanupIds.push({ collection: 'textNotes', docId: noteId });

    // Wait for Cloud Function processing
    logInfo(`Waiting ${waitTimeMs / 1000}s for Cloud Function...`);
    await wait(waitTimeMs);

    // Query for extracted events
    const eventsSnapshot = await db
      .collection('events')
      .where('sourceId', '==', noteId)
      .where('userId', '==', userId)
      .get();

    if (eventsSnapshot.empty) {
      logFail('Event extraction', 'No event was extracted from the text note');
      results.push({
        name: 'Text note → Event extraction',
        passed: false,
        reason: 'No event document found in events collection',
      });
      return { results, eventId: null };
    }

    const eventDoc = eventsSnapshot.docs[0];
    const eventData = eventDoc.data();
    const eventId = eventDoc.id;
    cleanupIds.push({ collection: 'events', docId: eventId });

    logInfo(`Event extracted: ${eventId} - "${eventData.title}"`);

    // Verify event fields
    const checks = [
      { field: 'title', check: typeof eventData.title === 'string' && eventData.title.length > 0, reason: 'title should be a non-empty string' },
      { field: 'sourceType', check: eventData.sourceType === 'text', reason: `sourceType should be 'text', got '${eventData.sourceType}'` },
      { field: 'sourceId', check: eventData.sourceId === noteId, reason: `sourceId should be '${noteId}', got '${eventData.sourceId}'` },
      { field: 'userConfirmed', check: eventData.userConfirmed === false, reason: `userConfirmed should be false, got ${eventData.userConfirmed}` },
      { field: 'status', check: ['draft', 'pending'].includes(eventData.status), reason: `status should be 'draft' or 'pending', got '${eventData.status}'` },
      { field: 'confidence', check: typeof eventData.confidence === 'number' && eventData.confidence >= 0 && eventData.confidence <= 1, reason: `confidence should be a number between 0 and 1, got ${eventData.confidence}` },
      { field: 'datetime', check: eventData.datetime != null, reason: 'datetime should be set' },
      { field: 'type', check: ['appointment', 'meeting', 'intention', 'plan', 'reminder', 'todo'].includes(eventData.type), reason: `type should be a valid event type, got '${eventData.type}'` },
    ];

    let allPassed = true;
    for (const { field, check, reason } of checks) {
      if (check) {
        logPass(`Event field: ${field}`);
      } else {
        logFail(`Event field: ${field}`, reason);
        allPassed = false;
      }
    }

    results.push({
      name: 'Text note → Event extraction',
      passed: allPassed,
      reason: allPassed ? undefined : 'Some event field checks failed',
      details: {
        eventId,
        title: eventData.title,
        type: eventData.type,
        status: eventData.status,
        confidence: eventData.confidence,
      },
    });

    return { results, eventId };
  } catch (error: any) {
    logFail('Text note → Event extraction', error.message);
    results.push({
      name: 'Text note → Event extraction',
      passed: false,
      reason: error.message,
    });
    return { results, eventId: null };
  }
}

/**
 * Test Case 2: Confirm an extracted event
 */
async function testConfirmEvent(
  db: FirebaseFirestore.Firestore,
  eventId: string,
): Promise<TestResult[]> {
  const results: TestResult[] = [];

  logTestCase('Test Case 2: Confirm extracted event');

  try {
    // Confirm the event
    logInfo(`Confirming event: ${eventId}`);
    await db.collection('events').doc(eventId).update({
      status: 'confirmed',
      userConfirmed: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Re-read and verify
    const doc = await db.collection('events').doc(eventId).get();
    const data = doc.data();

    const statusOk = data?.status === 'confirmed';
    const confirmedOk = data?.userConfirmed === true;
    const passed = statusOk && confirmedOk;

    if (passed) {
      logPass('Event confirmed successfully');
    } else {
      logFail('Event confirmation', `status=${data?.status}, userConfirmed=${data?.userConfirmed}`);
    }

    results.push({
      name: 'Confirm extracted event',
      passed,
      reason: passed ? undefined : `status=${data?.status}, userConfirmed=${data?.userConfirmed}`,
    });
  } catch (error: any) {
    logFail('Confirm extracted event', error.message);
    results.push({ name: 'Confirm extracted event', passed: false, reason: error.message });
  }

  return results;
}

/**
 * Test Case 3: Create another note, extract event, then cancel it
 */
async function testCancelEvent(
  db: FirebaseFirestore.Firestore,
  userId: string,
  waitTimeMs: number,
): Promise<{ results: TestResult[]; eventId: string | null }> {
  const results: TestResult[] = [];
  const testId = generateTestId();
  const noteId = `test-note-cancel-${testId}`;

  logTestCase('Test Case 3: Cancel extracted event');

  try {
    // Create a second text note with event content
    logInfo(`Creating second text note: ${noteId}`);
    await db.collection('textNotes').doc(noteId).set({
      userId,
      content: 'Dentist appointment next Friday at 10am at Dr. Smith clinic',
      title: 'Health Notes',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      syncStatus: 'synced',
    });
    cleanupIds.push({ collection: 'textNotes', docId: noteId });

    // Wait for Cloud Function
    logInfo(`Waiting ${waitTimeMs / 1000}s for Cloud Function...`);
    await wait(waitTimeMs);

    // Query for the extracted event
    const snapshot = await db
      .collection('events')
      .where('sourceId', '==', noteId)
      .where('userId', '==', userId)
      .get();

    if (snapshot.empty) {
      logFail('Cancel event', 'No event extracted from second text note');
      results.push({ name: 'Cancel extracted event', passed: false, reason: 'No event extracted' });
      return { results, eventId: null };
    }

    const eventId = snapshot.docs[0].id;
    cleanupIds.push({ collection: 'events', docId: eventId });

    // Cancel the event
    logInfo(`Cancelling event: ${eventId}`);
    await db.collection('events').doc(eventId).update({
      status: 'cancelled',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Verify
    const doc = await db.collection('events').doc(eventId).get();
    const passed = doc.data()?.status === 'cancelled';

    if (passed) {
      logPass('Event cancelled successfully');
    } else {
      logFail('Cancel event', `status=${doc.data()?.status}`);
    }

    results.push({
      name: 'Cancel extracted event',
      passed,
      reason: passed ? undefined : `status=${doc.data()?.status}`,
    });

    return { results, eventId };
  } catch (error: any) {
    logFail('Cancel extracted event', error.message);
    results.push({ name: 'Cancel extracted event', passed: false, reason: error.message });
    return { results, eventId: null };
  }
}

/**
 * Test Case 4: Text note without events (negative test)
 */
async function testTextNoteWithoutEvents(
  db: FirebaseFirestore.Firestore,
  userId: string,
  waitTimeMs: number,
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const testId = generateTestId();
  const noteId = `test-note-noevents-${testId}`;

  logTestCase('Test Case 4: Text note without events');

  try {
    // Create a text note with no event content
    logInfo(`Creating text note without events: ${noteId}`);
    await db.collection('textNotes').doc(noteId).set({
      userId,
      content: 'Today was a beautiful sunny day and I felt really happy and grateful for everything',
      title: 'Daily Reflection',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      syncStatus: 'synced',
    });
    cleanupIds.push({ collection: 'textNotes', docId: noteId });

    // Wait for Cloud Function
    logInfo(`Waiting ${waitTimeMs / 1000}s for Cloud Function...`);
    await wait(waitTimeMs);

    // Query for extracted events - should be none
    const snapshot = await db
      .collection('events')
      .where('sourceId', '==', noteId)
      .where('userId', '==', userId)
      .get();

    // Clean up any events that were created
    snapshot.docs.forEach((doc) => {
      cleanupIds.push({ collection: 'events', docId: doc.id });
    });

    const passed = snapshot.empty;

    if (passed) {
      logPass('No events extracted from non-event content');
    } else {
      logFail('Negative test', `${snapshot.size} event(s) were extracted`);
    }

    results.push({
      name: 'Text note without events (negative)',
      passed,
      reason: passed ? undefined : `${snapshot.size} event(s) were unexpectedly extracted`,
    });
  } catch (error: any) {
    logFail('Negative test', error.message);
    results.push({ name: 'Text note without events (negative)', passed: false, reason: error.message });
  }

  return results;
}

/**
 * Test Case 5: Query only unconfirmed events
 */
async function testUnconfirmedEventsQuery(
  db: FirebaseFirestore.Firestore,
  userId: string,
): Promise<TestResult[]> {
  const results: TestResult[] = [];

  logTestCase('Test Case 5: Unconfirmed events query');

  try {
    // Query for unconfirmed events (same query as the mobile toast hook)
    const snapshot = await db
      .collection('events')
      .where('userId', '==', userId)
      .where('userConfirmed', '==', false)
      .where('status', 'in', ['draft', 'pending'])
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    // Verify none of the confirmed/cancelled events appear
    let allOk = true;
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.userConfirmed === true) {
        logFail('Unconfirmed query', `Event ${doc.id} has userConfirmed=true`);
        allOk = false;
      }
      if (data.status === 'confirmed' || data.status === 'cancelled') {
        logFail('Unconfirmed query', `Event ${doc.id} has status=${data.status}`);
        allOk = false;
      }
    });

    if (allOk) {
      logPass(`Unconfirmed query returned ${snapshot.size} valid results`);
    }

    results.push({
      name: 'Unconfirmed events query filter',
      passed: allOk,
      reason: allOk ? undefined : 'Query returned confirmed/cancelled events',
    });
  } catch (error: any) {
    logFail('Unconfirmed events query', error.message);
    results.push({ name: 'Unconfirmed events query filter', passed: false, reason: error.message });
  }

  return results;
}

/**
 * Cleanup all test data
 */
async function cleanupTestData(db: FirebaseFirestore.Firestore): Promise<void> {
  logCleanup(cleanupIds.map((c) => `${c.collection}/${c.docId}`));

  let deleted = 0;
  let failed = 0;

  for (const { collection, docId } of cleanupIds) {
    try {
      await db.collection(collection).doc(docId).delete();
      deleted++;
    } catch {
      failed++;
    }
  }

  logCleanupResult(failed === 0, failed > 0 ? `${failed} deletions failed` : undefined);
}
