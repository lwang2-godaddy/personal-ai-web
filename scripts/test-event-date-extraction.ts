#!/usr/bin/env npx tsx
/**
 * Regression Test: Event Date Extraction
 *
 * Tests that voice notes with past temporal references (e.g., "yesterday I did X")
 * are correctly indexed with eventTimestampMs and can be found by temporal queries.
 *
 * Usage:
 *   cd personal-ai-web
 *   npm run test:event-date
 *
 * Prerequisites:
 *   - Firebase Admin SDK credentials (GOOGLE_APPLICATION_CREDENTIALS or service account)
 *   - Deployed Cloud Functions with event date extraction
 *   - Environment variables in .env.local
 */

import * as admin from 'firebase-admin';
import { Pinecone } from '@pinecone-database/pinecone';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Configuration - use NEXT_PUBLIC_ prefixed vars from personal-ai-web
const TEST_USER_ID = process.env.TEST_USER_ID || 'test-regression-user';
const PINECONE_INDEX = process.env.NEXT_PUBLIC_PINECONE_INDEX || process.env.PINECONE_INDEX || 'personal-ai-data';
const WAIT_TIME_MS = 15000; // Wait for Cloud Function to process

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logPass(testName: string) {
  log(`  ✓ ${testName}`, colors.green);
}

function logFail(testName: string, reason: string) {
  log(`  ✗ ${testName}`, colors.red);
  log(`    Reason: ${reason}`, colors.dim);
}

function logInfo(message: string) {
  log(`  ℹ ${message}`, colors.cyan);
}

// Initialize Firebase Admin
function initFirebase() {
  if (admin.apps.length === 0) {
    // Try to use service account from environment
    const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (serviceAccountPath) {
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      // Use default credentials (for Cloud Shell or local emulator)
      admin.initializeApp();
    }
  }
  return admin.firestore();
}

// Initialize Pinecone
function initPinecone(): Pinecone {
  const apiKey = process.env.NEXT_PUBLIC_PINECONE_API_KEY || process.env.PINECONE_KEY;
  if (!apiKey) {
    throw new Error('NEXT_PUBLIC_PINECONE_API_KEY or PINECONE_KEY environment variable is required');
  }
  return new Pinecone({ apiKey });
}

// Helper: Get date string for N days ago
function getDateNDaysAgo(n: number): string {
  const date = new Date();
  date.setDate(date.getDate() - n);
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

// Helper: Get timestamp for a date
function getTimestampForDate(dateStr: string): number {
  return new Date(dateStr + 'T12:00:00Z').getTime();
}

// Helper: Wait for a specified time
function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper: Generate a unique test ID
function generateTestId(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

interface TestResult {
  name: string;
  passed: boolean;
  reason?: string;
  details?: any;
}

/**
 * Test Case 1: Voice note with "yesterday" reference
 *
 * Creates a voice note saying "yesterday I did X", verifies:
 * 1. eventTimestampMs is set to yesterday's date (not today)
 * 2. Query for yesterday finds the note
 * 3. Query for today does NOT find the note
 */
async function testYesterdayReference(
  db: admin.firestore.Firestore,
  pinecone: Pinecone
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const testId = generateTestId();
  const noteId = `regression-voice-${testId}`;

  log('\n📝 Test Case 1: Voice note with "yesterday" reference', colors.yellow);

  const yesterdayDate = getDateNDaysAgo(1);
  const todayDate = getDateNDaysAgo(0);
  const yesterdayTimestamp = getTimestampForDate(yesterdayDate);
  const todayTimestamp = getTimestampForDate(todayDate);

  logInfo(`Today: ${todayDate}, Yesterday: ${yesterdayDate}`);
  logInfo(`Creating test voice note: "${noteId}"`);

  try {
    // Step 1: Create a test voice note with "yesterday" reference
    const voiceNoteData = {
      userId: TEST_USER_ID,
      transcription: '昨天我煎了牛排，很好吃', // Yesterday I made steak, it was delicious
      duration: 5,
      audioUrl: `https://test.storage/${noteId}.m4a`,
      createdAt: new Date().toISOString(),
      location: null,
    };

    await db.collection('voiceNotes').doc(noteId).set(voiceNoteData);
    logInfo(`Voice note created, waiting ${WAIT_TIME_MS / 1000}s for Cloud Function...`);

    // Step 2: Wait for Cloud Function to process
    await wait(WAIT_TIME_MS);

    // Step 3: Check Firestore for embeddingId
    const docSnap = await db.collection('voiceNotes').doc(noteId).get();
    const updatedNote = docSnap.data();

    if (!updatedNote?.embeddingId) {
      results.push({
        name: 'Embedding created',
        passed: false,
        reason: 'embeddingId not found in Firestore document',
        details: { embeddingError: updatedNote?.embeddingError },
      });
      return results;
    }

    logPass('Embedding created');
    results.push({ name: 'Embedding created', passed: true });

    // Step 4: Check Pinecone for eventTimestampMs
    const index = pinecone.index(PINECONE_INDEX);
    const vectorId = `voice_${noteId}`;

    const fetchResult = await index.fetch([vectorId]);
    const vector = fetchResult.records?.[vectorId];

    if (!vector) {
      results.push({
        name: 'Vector stored in Pinecone',
        passed: false,
        reason: 'Vector not found in Pinecone',
      });
      return results;
    }

    logPass('Vector stored in Pinecone');
    results.push({ name: 'Vector stored in Pinecone', passed: true });

    const metadata = vector.metadata as Record<string, any>;
    const eventTimestampMs = metadata?.eventTimestampMs;
    const timestampMs = metadata?.timestampMs;

    logInfo(`timestampMs (creation): ${timestampMs} (${new Date(timestampMs).toISOString()})`);
    logInfo(`eventTimestampMs (event): ${eventTimestampMs} (${new Date(eventTimestampMs).toISOString()})`);

    // Step 5: Verify eventTimestampMs is yesterday, not today
    const eventDate = new Date(eventTimestampMs).toISOString().split('T')[0];
    const creationDate = new Date(timestampMs).toISOString().split('T')[0];

    if (eventDate === yesterdayDate) {
      logPass(`eventTimestampMs correctly set to yesterday (${eventDate})`);
      results.push({
        name: 'eventTimestampMs set to yesterday',
        passed: true,
        details: { eventDate, yesterdayDate },
      });
    } else {
      logFail(`eventTimestampMs set to yesterday`, `Expected ${yesterdayDate}, got ${eventDate}`);
      results.push({
        name: 'eventTimestampMs set to yesterday',
        passed: false,
        reason: `Expected ${yesterdayDate}, got ${eventDate}`,
      });
    }

    // Step 6: Query for yesterday - should find the note
    const yesterdayStart = new Date(yesterdayDate + 'T00:00:00Z').getTime();
    const yesterdayEnd = new Date(yesterdayDate + 'T23:59:59Z').getTime();

    // Create a dummy embedding for query (we just need to test the filter)
    const dummyEmbedding = new Array(1536).fill(0.01);

    const yesterdayQuery = await index.query({
      vector: dummyEmbedding,
      topK: 10,
      filter: {
        $and: [
          { userId: TEST_USER_ID },
          {
            $or: [
              { eventTimestampMs: { $gte: yesterdayStart, $lte: yesterdayEnd } },
              { timestampMs: { $gte: yesterdayStart, $lte: yesterdayEnd } },
            ],
          },
        ],
      },
      includeMetadata: true,
    });

    const foundYesterday = yesterdayQuery.matches?.some(m => m.id === vectorId);

    if (foundYesterday) {
      logPass('Query for yesterday finds the note');
      results.push({ name: 'Query for yesterday finds note', passed: true });
    } else {
      logFail('Query for yesterday finds the note', 'Note not found in yesterday query results');
      results.push({
        name: 'Query for yesterday finds note',
        passed: false,
        reason: 'Note not found in yesterday query results',
        details: { matchCount: yesterdayQuery.matches?.length },
      });
    }

    // Step 7: Query for today only (not yesterday) - should NOT find the note
    const todayStart = new Date(todayDate + 'T00:00:00Z').getTime();
    const todayEnd = new Date(todayDate + 'T23:59:59Z').getTime();

    // Query with ONLY eventTimestampMs (strict event date matching)
    const todayQueryStrict = await index.query({
      vector: dummyEmbedding,
      topK: 10,
      filter: {
        $and: [
          { userId: TEST_USER_ID },
          { eventTimestampMs: { $gte: todayStart, $lte: todayEnd } },
        ],
      },
      includeMetadata: true,
    });

    const foundTodayStrict = todayQueryStrict.matches?.some(m => m.id === vectorId);

    if (!foundTodayStrict) {
      logPass('Query for today (strict eventTimestampMs) does NOT find the note');
      results.push({ name: 'Query for today excludes note (strict)', passed: true });
    } else {
      logFail('Query for today (strict) excludes note', 'Note incorrectly found in today query');
      results.push({
        name: 'Query for today excludes note (strict)',
        passed: false,
        reason: 'Note incorrectly found in today query (eventTimestampMs should be yesterday)',
      });
    }

  } catch (error: any) {
    results.push({
      name: 'Test execution',
      passed: false,
      reason: error.message,
    });
  } finally {
    // Cleanup: Delete test data
    logInfo('Cleaning up test data...');
    try {
      await db.collection('voiceNotes').doc(noteId).delete();
      const index = pinecone.index(PINECONE_INDEX);
      await index.deleteOne(`voice_${noteId}`);
      logInfo('Cleanup complete');
    } catch (cleanupError) {
      logInfo(`Cleanup warning: ${cleanupError}`);
    }
  }

  return results;
}

/**
 * Test Case 2: Voice note with "前天" (day before yesterday) reference
 */
async function testDayBeforeYesterdayReference(
  db: admin.firestore.Firestore,
  pinecone: Pinecone
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const testId = generateTestId();
  const noteId = `regression-voice-${testId}`;

  log('\n📝 Test Case 2: Voice note with "前天" (day before yesterday) reference', colors.yellow);

  const dayBeforeYesterday = getDateNDaysAgo(2);

  logInfo(`Day before yesterday: ${dayBeforeYesterday}`);
  logInfo(`Creating test voice note: "${noteId}"`);

  try {
    // Create voice note with "前天" reference
    const voiceNoteData = {
      userId: TEST_USER_ID,
      transcription: '前天我去健身房锻炼了两个小时', // Day before yesterday I went to gym for 2 hours
      duration: 4,
      audioUrl: `https://test.storage/${noteId}.m4a`,
      createdAt: new Date().toISOString(),
      location: null,
    };

    await db.collection('voiceNotes').doc(noteId).set(voiceNoteData);
    logInfo(`Voice note created, waiting ${WAIT_TIME_MS / 1000}s for Cloud Function...`);

    await wait(WAIT_TIME_MS);

    // Check Pinecone
    const index = pinecone.index(PINECONE_INDEX);
    const vectorId = `voice_${noteId}`;

    const fetchResult = await index.fetch([vectorId]);
    const vector = fetchResult.records?.[vectorId];

    if (!vector) {
      results.push({
        name: 'Vector created for 前天 reference',
        passed: false,
        reason: 'Vector not found in Pinecone',
      });
      return results;
    }

    const metadata = vector.metadata as Record<string, any>;
    const eventTimestampMs = metadata?.eventTimestampMs;
    const eventDate = new Date(eventTimestampMs).toISOString().split('T')[0];

    logInfo(`eventTimestampMs: ${eventTimestampMs} (${eventDate})`);

    if (eventDate === dayBeforeYesterday) {
      logPass(`eventTimestampMs correctly set to day before yesterday (${eventDate})`);
      results.push({
        name: 'eventTimestampMs set to day before yesterday',
        passed: true,
      });
    } else {
      logFail('eventTimestampMs set to day before yesterday', `Expected ${dayBeforeYesterday}, got ${eventDate}`);
      results.push({
        name: 'eventTimestampMs set to day before yesterday',
        passed: false,
        reason: `Expected ${dayBeforeYesterday}, got ${eventDate}`,
      });
    }

  } catch (error: any) {
    results.push({
      name: 'Test execution',
      passed: false,
      reason: error.message,
    });
  } finally {
    // Cleanup
    try {
      await db.collection('voiceNotes').doc(noteId).delete();
      const index = pinecone.index(PINECONE_INDEX);
      await index.deleteOne(`voice_${noteId}`);
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
  }

  return results;
}

/**
 * Test Case 3: Voice note with "today" reference (should use creation date)
 */
async function testTodayReference(
  db: admin.firestore.Firestore,
  pinecone: Pinecone
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const testId = generateTestId();
  const noteId = `regression-voice-${testId}`;

  log('\n📝 Test Case 3: Voice note with "today" reference', colors.yellow);

  const todayDate = getDateNDaysAgo(0);

  logInfo(`Today: ${todayDate}`);
  logInfo(`Creating test voice note: "${noteId}"`);

  try {
    // Create voice note with "今天" reference
    const voiceNoteData = {
      userId: TEST_USER_ID,
      transcription: '今天天气很好，我去公园散步了', // Today the weather is nice, I went for a walk in the park
      duration: 3,
      audioUrl: `https://test.storage/${noteId}.m4a`,
      createdAt: new Date().toISOString(),
      location: null,
    };

    await db.collection('voiceNotes').doc(noteId).set(voiceNoteData);
    logInfo(`Voice note created, waiting ${WAIT_TIME_MS / 1000}s for Cloud Function...`);

    await wait(WAIT_TIME_MS);

    // Check Pinecone
    const index = pinecone.index(PINECONE_INDEX);
    const vectorId = `voice_${noteId}`;

    const fetchResult = await index.fetch([vectorId]);
    const vector = fetchResult.records?.[vectorId];

    if (!vector) {
      results.push({
        name: 'Vector created for today reference',
        passed: false,
        reason: 'Vector not found in Pinecone',
      });
      return results;
    }

    const metadata = vector.metadata as Record<string, any>;
    const eventTimestampMs = metadata?.eventTimestampMs;
    const timestampMs = metadata?.timestampMs;
    const eventDate = new Date(eventTimestampMs).toISOString().split('T')[0];

    logInfo(`eventTimestampMs: ${eventTimestampMs} (${eventDate})`);
    logInfo(`timestampMs: ${timestampMs}`);

    // For "today" reference, eventTimestampMs should equal timestampMs (both today)
    if (eventDate === todayDate) {
      logPass(`eventTimestampMs correctly set to today (${eventDate})`);
      results.push({
        name: 'eventTimestampMs set to today',
        passed: true,
      });
    } else {
      logFail('eventTimestampMs set to today', `Expected ${todayDate}, got ${eventDate}`);
      results.push({
        name: 'eventTimestampMs set to today',
        passed: false,
        reason: `Expected ${todayDate}, got ${eventDate}`,
      });
    }

  } catch (error: any) {
    results.push({
      name: 'Test execution',
      passed: false,
      reason: error.message,
    });
  } finally {
    // Cleanup
    try {
      await db.collection('voiceNotes').doc(noteId).delete();
      const index = pinecone.index(PINECONE_INDEX);
      await index.deleteOne(`voice_${noteId}`);
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
  }

  return results;
}

/**
 * Main test runner
 */
async function runTests() {
  log('\n' + '='.repeat(60), colors.cyan);
  log('  Event Date Extraction - Regression Tests', colors.cyan);
  log('='.repeat(60), colors.cyan);
  log(`\nTest User ID: ${TEST_USER_ID}`);
  log(`Pinecone Index: ${PINECONE_INDEX}`);
  log(`Wait Time: ${WAIT_TIME_MS / 1000}s per test`);

  let db: admin.firestore.Firestore;
  let pinecone: Pinecone;

  try {
    db = initFirebase();
    pinecone = initPinecone();
    log('\n✓ Firebase and Pinecone initialized', colors.green);
  } catch (error: any) {
    log(`\n✗ Initialization failed: ${error.message}`, colors.red);
    process.exit(1);
  }

  const allResults: TestResult[] = [];

  // Run test cases
  const test1Results = await testYesterdayReference(db, pinecone);
  allResults.push(...test1Results);

  const test2Results = await testDayBeforeYesterdayReference(db, pinecone);
  allResults.push(...test2Results);

  const test3Results = await testTodayReference(db, pinecone);
  allResults.push(...test3Results);

  // Summary
  const passed = allResults.filter(r => r.passed).length;
  const failed = allResults.filter(r => !r.passed).length;

  log('\n' + '='.repeat(60), colors.cyan);
  log('  Test Summary', colors.cyan);
  log('='.repeat(60), colors.cyan);
  log(`\n  Total: ${allResults.length}`);
  log(`  Passed: ${passed}`, passed > 0 ? colors.green : colors.reset);
  log(`  Failed: ${failed}`, failed > 0 ? colors.red : colors.reset);

  if (failed > 0) {
    log('\n  Failed Tests:', colors.red);
    allResults.filter(r => !r.passed).forEach(r => {
      log(`    - ${r.name}: ${r.reason}`, colors.red);
    });
  }

  log('\n');

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  log(`\nFatal error: ${error.message}`, colors.red);
  process.exit(1);
});
