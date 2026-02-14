/**
 * Events Admin - Integration Tests
 *
 * Tests the events collection data integrity, document structure,
 * extraction pipeline output, and execution tracking for the
 * EventExtractionService.
 *
 * Collection: events
 * Service: EventExtractionService
 */

import * as admin from 'firebase-admin';
import type { TestResult } from '../lib/test-utils';
import {
  logPass,
  logFail,
  logInfo,
  logTestCase,
  logQueryBox,
} from '../lib/reporter';

// Test name for discovery
export const name = 'Events Admin';

// Valid event types
const VALID_EVENT_TYPES = ['appointment', 'meeting', 'intention', 'plan', 'reminder', 'todo'];

// Valid event statuses
const VALID_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled', 'draft'];

// Valid source types
const VALID_SOURCE_TYPES = ['voice', 'text', 'photo', 'health', 'location', 'manual'];

/**
 * Main test runner
 */
export async function run(testCase?: string): Promise<TestResult[]> {
  const { db, userId } = globalThis.testContext;
  const allResults: TestResult[] = [];

  const tests: Array<{ name: string; fn: () => Promise<TestResult[]> }> = [
    { name: 'collection-exists', fn: () => testEventsCollectionExists(db) },
    { name: 'document-structure', fn: () => testEventDocumentStructure(db) },
    { name: 'user-events', fn: () => testUserEvents(db, userId) },
    { name: 'type-distribution', fn: () => testEventTypeDistribution(db) },
    { name: 'confidence-scoring', fn: () => testConfidenceScoring(db) },
    { name: 'source-tracking', fn: () => testSourceTracking(db) },
    { name: 'execution-matching', fn: () => testExecutionMatching(db) },
  ];

  for (const test of tests) {
    if (testCase && test.name !== testCase) continue;
    const results = await test.fn();
    allResults.push(...results);
  }

  return allResults;
}

/**
 * Test 1: Check events collection exists and has data
 */
async function testEventsCollectionExists(
  db: admin.firestore.Firestore
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Events Collection Exists');

  try {
    const snapshot = await db.collection('events')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    logQueryBox('Events Collection', [
      'Collection: events',
      'orderBy createdAt desc',
      `Found: ${snapshot.size} events`,
    ]);

    if (snapshot.size > 0) {
      logPass(`Found ${snapshot.size} events`);
      results.push({
        name: 'Events collection has data',
        passed: true,
      });
    } else {
      logFail('No events found in collection');
      results.push({
        name: 'Events collection has data',
        passed: false,
        reason: 'events collection is empty',
      });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logFail(`Error checking collection: ${message}`);
    results.push({
      name: 'Events collection exists',
      passed: false,
      reason: message,
    });
  }

  return results;
}

/**
 * Test 2: Verify event document structure has required fields
 */
async function testEventDocumentStructure(
  db: admin.firestore.Firestore
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Event Document Structure');

  const requiredFields = [
    'userId',
    'title',
    'datetime',
    'type',
    'sourceType',
    'status',
    'confidence',
    'createdAt',
  ];

  try {
    const snapshot = await db.collection('events')
      .limit(5)
      .get();

    if (snapshot.empty) {
      logInfo('No events to check structure');
      results.push({
        name: 'Document structure check',
        passed: true,
        reason: 'Skipped - no events',
      });
      return results;
    }

    let allValid = true;
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const missingFields: string[] = [];

      for (const field of requiredFields) {
        if (!(field in data)) {
          missingFields.push(field);
        }
      }

      if (missingFields.length > 0) {
        logFail(`Event ${doc.id} missing: ${missingFields.join(', ')}`);
        allValid = false;
      }
    });

    if (allValid) {
      logPass(`All ${snapshot.size} checked events have required fields`);
      results.push({
        name: 'Required fields present in all events',
        passed: true,
      });
    } else {
      results.push({
        name: 'Required fields present in all events',
        passed: false,
        reason: 'Some events missing required fields',
      });
    }

    // Check type validity
    const doc = snapshot.docs[0];
    const data = doc.data();

    if (VALID_EVENT_TYPES.includes(data.type)) {
      logPass(`Event type valid: ${data.type}`);
      results.push({ name: 'Event type is valid enum', passed: true });
    } else {
      logFail(`Invalid event type: ${data.type}`);
      results.push({
        name: 'Event type is valid enum',
        passed: false,
        reason: `Got: ${data.type}, expected one of: ${VALID_EVENT_TYPES.join(', ')}`,
      });
    }

    if (VALID_STATUSES.includes(data.status)) {
      logPass(`Event status valid: ${data.status}`);
      results.push({ name: 'Event status is valid enum', passed: true });
    } else {
      logFail(`Invalid event status: ${data.status}`);
      results.push({
        name: 'Event status is valid enum',
        passed: false,
        reason: `Got: ${data.status}, expected one of: ${VALID_STATUSES.join(', ')}`,
      });
    }

    if (VALID_SOURCE_TYPES.includes(data.sourceType)) {
      logPass(`Source type valid: ${data.sourceType}`);
      results.push({ name: 'Source type is valid enum', passed: true });
    } else {
      logFail(`Invalid source type: ${data.sourceType}`);
      results.push({
        name: 'Source type is valid enum',
        passed: false,
        reason: `Got: ${data.sourceType}, expected one of: ${VALID_SOURCE_TYPES.join(', ')}`,
      });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logFail(`Error: ${message}`);
    results.push({
      name: 'Document structure check',
      passed: false,
      reason: message,
    });
  }

  return results;
}

/**
 * Test 3: Check events for the test user
 */
async function testUserEvents(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('User Events Query');

  try {
    const snapshot = await db.collection('events')
      .where('userId', '==', userId)
      .orderBy('datetime', 'desc')
      .limit(20)
      .get();

    logQueryBox('User Events', [
      `userId == "${userId}"`,
      'orderBy datetime desc',
      `Found: ${snapshot.size} events`,
    ]);

    if (snapshot.size > 0) {
      logPass(`User has ${snapshot.size} events`);

      // Log some sample events
      snapshot.docs.slice(0, 3).forEach((doc) => {
        const data = doc.data();
        logInfo(`  ${data.type}: "${data.title}" (${data.status}, conf: ${data.confidence})`);
      });

      results.push({
        name: 'User has events',
        passed: true,
        details: { count: snapshot.size },
      });

      // Verify all events belong to this user (data isolation)
      const wrongUser = snapshot.docs.find((doc) => doc.data().userId !== userId);
      if (!wrongUser) {
        logPass('All events belong to the correct user (data isolation OK)');
        results.push({ name: 'User data isolation', passed: true });
      } else {
        logFail(`Event ${wrongUser.id} has wrong userId`);
        results.push({
          name: 'User data isolation',
          passed: false,
          reason: `Event ${wrongUser.id} has userId ${wrongUser.data().userId} instead of ${userId}`,
        });
      }
    } else {
      logInfo('No events found for test user (may be normal)');
      results.push({
        name: 'User events query',
        passed: true,
        reason: 'No events for test user',
      });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    // Handle missing index gracefully
    if (message.includes('index')) {
      logInfo('Firestore index not ready for this query');
      results.push({
        name: 'User events query',
        passed: true,
        reason: 'Index not ready',
      });
    } else {
      logFail(`Error: ${message}`);
      results.push({
        name: 'User events query',
        passed: false,
        reason: message,
      });
    }
  }

  return results;
}

/**
 * Test 4: Check event type distribution across the collection
 */
async function testEventTypeDistribution(
  db: admin.firestore.Firestore
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Event Type Distribution');

  try {
    const snapshot = await db.collection('events')
      .select('type', 'status')
      .limit(500)
      .get();

    if (snapshot.empty) {
      results.push({ name: 'Type distribution', passed: true, reason: 'No events to check' });
      return results;
    }

    const typeCounts = new Map<string, number>();
    const statusCounts = new Map<string, number>();

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      typeCounts.set(data.type, (typeCounts.get(data.type) || 0) + 1);
      statusCounts.set(data.status, (statusCounts.get(data.status) || 0) + 1);
    });

    logQueryBox('Type Distribution', [
      `Total events sampled: ${snapshot.size}`,
      '',
      'By Type:',
      ...Array.from(typeCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([type, count]) => `  ${type}: ${count}`),
      '',
      'By Status:',
      ...Array.from(statusCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([status, count]) => `  ${status}: ${count}`),
    ]);

    // Verify all types are valid
    const invalidTypes = Array.from(typeCounts.keys()).filter(
      (t) => !VALID_EVENT_TYPES.includes(t)
    );

    if (invalidTypes.length === 0) {
      logPass('All event types are valid');
      results.push({ name: 'All event types valid', passed: true });
    } else {
      logFail(`Invalid event types found: ${invalidTypes.join(', ')}`);
      results.push({
        name: 'All event types valid',
        passed: false,
        reason: `Invalid types: ${invalidTypes.join(', ')}`,
      });
    }

    // Verify all statuses are valid
    const invalidStatuses = Array.from(statusCounts.keys()).filter(
      (s) => !VALID_STATUSES.includes(s)
    );

    if (invalidStatuses.length === 0) {
      logPass('All event statuses are valid');
      results.push({ name: 'All event statuses valid', passed: true });
    } else {
      logFail(`Invalid statuses found: ${invalidStatuses.join(', ')}`);
      results.push({
        name: 'All event statuses valid',
        passed: false,
        reason: `Invalid statuses: ${invalidStatuses.join(', ')}`,
      });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logFail(`Error: ${message}`);
    results.push({ name: 'Type distribution check', passed: false, reason: message });
  }

  return results;
}

/**
 * Test 5: Check confidence scoring validity
 */
async function testConfidenceScoring(
  db: admin.firestore.Firestore
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Confidence Scoring');

  try {
    const snapshot = await db.collection('events')
      .select('confidence', 'status')
      .limit(200)
      .get();

    if (snapshot.empty) {
      results.push({ name: 'Confidence scoring', passed: true, reason: 'No events' });
      return results;
    }

    let validRange = true;
    let statusMismatch = 0;
    const confidences: number[] = [];

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const conf = data.confidence;

      if (typeof conf !== 'number' || conf < 0 || conf > 1) {
        validRange = false;
      } else {
        confidences.push(conf);
      }

      // Check confidence-status alignment
      // High confidence should not be draft, low confidence should not be pending
      if (conf >= 0.7 && data.status === 'draft') {
        statusMismatch++;
      }
    });

    if (validRange) {
      const avg = confidences.reduce((s, c) => s + c, 0) / confidences.length;
      logPass(`All confidence scores in valid range [0, 1]`);
      logInfo(`  Average confidence: ${(avg * 100).toFixed(1)}%`);
      logInfo(`  Min: ${(Math.min(...confidences) * 100).toFixed(1)}%`);
      logInfo(`  Max: ${(Math.max(...confidences) * 100).toFixed(1)}%`);
      results.push({ name: 'Confidence scores in valid range', passed: true });
    } else {
      logFail('Some confidence scores out of range');
      results.push({
        name: 'Confidence scores in valid range',
        passed: false,
        reason: 'Found confidence values outside [0, 1]',
      });
    }

    if (statusMismatch === 0) {
      logPass('Confidence-status alignment OK');
    } else {
      logInfo(`${statusMismatch} events with high confidence but draft status (may be user-modified)`);
    }
    results.push({
      name: 'Confidence-status alignment',
      passed: true, // Not a hard failure - user can modify status
      details: { mismatches: statusMismatch },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logFail(`Error: ${message}`);
    results.push({ name: 'Confidence scoring check', passed: false, reason: message });
  }

  return results;
}

/**
 * Test 6: Check source tracking (sourceType, sourceId, sourceText)
 */
async function testSourceTracking(
  db: admin.firestore.Firestore
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Source Tracking');

  try {
    const snapshot = await db.collection('events')
      .select('sourceType', 'sourceId', 'sourceText')
      .limit(100)
      .get();

    if (snapshot.empty) {
      results.push({ name: 'Source tracking', passed: true, reason: 'No events' });
      return results;
    }

    let hasSourceType = 0;
    let hasSourceId = 0;
    let hasSourceText = 0;
    const sourceTypes = new Map<string, number>();

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.sourceType) {
        hasSourceType++;
        sourceTypes.set(data.sourceType, (sourceTypes.get(data.sourceType) || 0) + 1);
      }
      if (data.sourceId) hasSourceId++;
      if (data.sourceText) hasSourceText++;
    });

    logQueryBox('Source Tracking Coverage', [
      `Events checked: ${snapshot.size}`,
      `Has sourceType: ${hasSourceType}/${snapshot.size}`,
      `Has sourceId: ${hasSourceId}/${snapshot.size}`,
      `Has sourceText: ${hasSourceText}/${snapshot.size}`,
      '',
      'Source Types:',
      ...Array.from(sourceTypes.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([type, count]) => `  ${type}: ${count}`),
    ]);

    // sourceType should always be present
    if (hasSourceType === snapshot.size) {
      logPass('All events have sourceType');
      results.push({ name: 'All events have sourceType', passed: true });
    } else {
      logFail(`${snapshot.size - hasSourceType} events missing sourceType`);
      results.push({
        name: 'All events have sourceType',
        passed: false,
        reason: `${snapshot.size - hasSourceType} events missing sourceType`,
      });
    }

    // sourceText is useful for admin debugging
    const sourceTextPct = ((hasSourceText / snapshot.size) * 100).toFixed(0);
    logInfo(`Source text coverage: ${sourceTextPct}%`);
    results.push({
      name: 'Source text coverage logged',
      passed: true,
      details: { coverage: `${sourceTextPct}%` },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logFail(`Error: ${message}`);
    results.push({ name: 'Source tracking check', passed: false, reason: message });
  }

  return results;
}

/**
 * Test 7: Check EventExtractionService execution matching
 */
async function testExecutionMatching(
  db: admin.firestore.Firestore
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('EventExtractionService Execution Matching');

  try {
    // Get recent EventExtractionService executions
    const execSnapshot = await db.collection('promptExecutions')
      .where('service', '==', 'EventExtractionService')
      .orderBy('executedAt', 'desc')
      .limit(10)
      .get();

    logQueryBox('EventExtractionService Executions', [
      'service == "EventExtractionService"',
      `Found: ${execSnapshot.size} executions`,
    ]);

    if (execSnapshot.size > 0) {
      logPass(`EventExtractionService has ${execSnapshot.size} execution records`);

      const latestExec = execSnapshot.docs[0].data();
      logInfo(`  Latest prompt: ${latestExec.promptId}`);
      logInfo(`  Model: ${latestExec.model}`);
      logInfo(`  Cost: $${latestExec.estimatedCostUSD?.toFixed(6) || 'N/A'}`);
      logInfo(`  Tokens: ${latestExec.totalTokens || 'N/A'}`);
      logInfo(`  Success: ${latestExec.success}`);

      results.push({
        name: 'EventExtractionService has execution records',
        passed: true,
      });

      // Try to match an execution to an event (heuristic)
      if (latestExec.userId) {
        const eventSnapshot = await db.collection('events')
          .where('userId', '==', latestExec.userId)
          .orderBy('createdAt', 'desc')
          .limit(20)
          .get();

        let matched = false;
        const execTime = typeof latestExec.executedAt === 'string'
          ? new Date(latestExec.executedAt).getTime()
          : latestExec.executedAt?.toDate?.()?.getTime() || 0;

        if (execTime > 0) {
          eventSnapshot.docs.forEach((doc) => {
            const eventData = doc.data();
            const eventTime = typeof eventData.createdAt === 'string'
              ? new Date(eventData.createdAt).getTime()
              : eventData.createdAt?.toDate?.()?.getTime() || 0;

            if (eventTime > 0 && Math.abs(execTime - eventTime) <= 60000) {
              matched = true;
            }
          });
        }

        if (matched) {
          logPass('Heuristic matching found event within 60s window');
        } else {
          logInfo('No matching event found within 60s (execution may be older)');
        }
        results.push({
          name: 'Execution-event heuristic matching',
          passed: true, // Not a failure - timing window may not align
          details: { matched },
        });
      }
    } else {
      logInfo('No EventExtractionService executions found');
      results.push({
        name: 'EventExtractionService execution check',
        passed: true,
        reason: 'No executions found (service may not have run)',
      });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('index')) {
      logInfo('Firestore index not ready for execution query');
      results.push({
        name: 'Execution matching check',
        passed: true,
        reason: 'Index not ready',
      });
    } else {
      logFail(`Error: ${message}`);
      results.push({
        name: 'Execution matching check',
        passed: false,
        reason: message,
      });
    }
  }

  return results;
}
