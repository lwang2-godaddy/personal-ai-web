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

// Load environment variables from .env.local (two levels up from integration-tests/)
dotenv.config({ path: path.join(__dirname, '..', '..', '.env.local') });

// Configuration - use NEXT_PUBLIC_ prefixed vars from personal-ai-web
const PINECONE_INDEX = process.env.NEXT_PUBLIC_PINECONE_INDEX || process.env.PINECONE_INDEX || 'personal-ai-data';
const WAIT_TIME_MS = 15000; // Wait for Cloud Function to process
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'personal-ai-app';
const FIREBASE_REGION = process.env.FIREBASE_REGION || 'us-central1';

// Integration test user configuration
const INTEGRATION_TEST_EMAIL = 'integration-test@personalai.local';
const INTEGRATION_TEST_DISPLAY_NAME = 'Integration Test User';

// This will be set after ensuring the test user exists
let TEST_USER_ID: string;

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

/**
 * Ensure the integration test user exists in Firebase Auth.
 * Creates the user if it doesn't exist.
 * Returns the user's UID.
 */
async function ensureTestUserExists(): Promise<string> {
  try {
    // Try to get existing user by email
    const existingUser = await admin.auth().getUserByEmail(INTEGRATION_TEST_EMAIL);
    log(`  Using existing test user: ${existingUser.uid}`, colors.dim);
    return existingUser.uid;
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      // Create the test user
      log(`  Creating integration test user...`, colors.dim);
      const newUser = await admin.auth().createUser({
        email: INTEGRATION_TEST_EMAIL,
        displayName: INTEGRATION_TEST_DISPLAY_NAME,
        emailVerified: true,
      });
      log(`  Created test user: ${newUser.uid}`, colors.green);
      return newUser.uid;
    }
    throw error;
  }
}

// Initialize Firebase Admin
function initFirebase() {
  if (admin.apps.length === 0) {
    // Try to use service account from environment
    const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    if (serviceAccountPath) {
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else if (serviceAccountJson) {
      // Try to parse service account from JSON string in env
      try {
        const serviceAccount = JSON.parse(serviceAccountJson);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      } catch (e) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON');
      }
    } else if (projectId) {
      // Fallback: use application default credentials with explicit project ID
      admin.initializeApp({
        projectId,
      });
    } else {
      throw new Error(
        'Firebase credentials required. Set one of:\n' +
        '  - GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json\n' +
        '  - FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}\n' +
        '  - NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id (with gcloud auth)'
      );
    }
  }
  return admin.firestore();
}

// Initialize Pinecone
function initPinecone(): Pinecone {
  const apiKey = process.env.PINECONE_API_KEY || process.env.NEXT_PUBLIC_PINECONE_API_KEY || process.env.PINECONE_KEY;
  if (!apiKey) {
    throw new Error('PINECONE_API_KEY environment variable is required');
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
 * Test Case 1: Voice note with "yesterday" reference - "昨天我煎了牛排"
 *
 * Simulates: User records "昨天我煎了牛排，很好吃" (Yesterday I made steak)
 * Then asks: "我昨天做了什么饭" (What did I cook yesterday?)
 *
 * Verifies:
 * 1. eventTimestampMs is set to yesterday's date (not today/creation date)
 * 2. Query for yesterday finds the note
 * 3. Found note contains "牛排" (steak)
 * 4. Query for today does NOT find the note
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
    // Simulates: "我昨天做了什么饭" (What did I cook yesterday?)
    const yesterdayStart = new Date(yesterdayDate + 'T00:00:00Z').getTime();
    const yesterdayEnd = new Date(yesterdayDate + 'T23:59:59Z').getTime();

    // Create a dummy embedding for query (we just need to test the filter)
    const dummyEmbedding = new Array(1536).fill(0.01);

    const queryFilter = {
      $and: [
        { userId: TEST_USER_ID },
        {
          $or: [
            { eventTimestampMs: { $gte: yesterdayStart, $lte: yesterdayEnd } },
            { timestampMs: { $gte: yesterdayStart, $lte: yesterdayEnd } },
          ],
        },
      ],
    };

    log('', colors.reset);
    log('  ┌─ Query: "我昨天做了什么饭" (What did I cook yesterday?)', colors.cyan);
    log(`  │ Filter: eventTimestampMs OR timestampMs in [${yesterdayDate}]`, colors.dim);
    log(`  │ Date range: ${yesterdayStart} - ${yesterdayEnd}`, colors.dim);

    const yesterdayQuery = await index.query({
      vector: dummyEmbedding,
      topK: 10,
      filter: queryFilter,
      includeMetadata: true,
    });

    log(`  │ Results: ${yesterdayQuery.matches?.length || 0} matches found`, colors.dim);

    const foundMatch = yesterdayQuery.matches?.find(m => m.id === vectorId);

    if (foundMatch) {
      const noteText = (foundMatch.metadata as any)?.text || '';
      log(`  │ Match: ${foundMatch.id}`, colors.dim);
      log(`  │ Text: "${noteText.substring(0, 60)}..."`, colors.dim);
      log('  └─', colors.cyan);

      logPass('Query for yesterday finds the note');
      results.push({ name: 'Query for yesterday finds note', passed: true });

      // Verify the content contains expected keywords (simulates "我昨天做了什么饭" query result)
      const hasCookingContent = noteText.includes('牛排') || noteText.toLowerCase().includes('steak');

      if (hasCookingContent) {
        logPass('Found note contains cooking content (牛排)');
        results.push({ name: 'Found note contains "牛排"', passed: true });
      } else {
        logFail('Found note contains "牛排"', `Text: ${noteText.substring(0, 100)}`);
        results.push({
          name: 'Found note contains "牛排"',
          passed: false,
          reason: 'Note text does not contain expected cooking content',
          details: { text: noteText.substring(0, 200) },
        });
      }
    } else {
      log(`  │ Expected vector ID not found: ${vectorId}`, colors.dim);
      log('  └─', colors.cyan);

      logFail('Query for yesterday finds the note', 'Note not found in yesterday query results');
      results.push({
        name: 'Query for yesterday finds note',
        passed: false,
        reason: 'Note not found in yesterday query results',
        details: { matchCount: yesterdayQuery.matches?.length },
      });
    }

    // Step 7: Query for today only (not yesterday) - should NOT find the note
    // This verifies the note won't appear if user asks "我今天做了什么饭"
    const todayStart = new Date(todayDate + 'T00:00:00Z').getTime();
    const todayEnd = new Date(todayDate + 'T23:59:59Z').getTime();

    log('', colors.reset);
    log('  ┌─ Query: "我今天做了什么饭" (What did I cook today?) - should NOT find note', colors.cyan);
    log(`  │ Filter: eventTimestampMs ONLY in [${todayDate}] (strict)`, colors.dim);

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

    log(`  │ Results: ${todayQueryStrict.matches?.length || 0} matches found`, colors.dim);
    const foundTodayStrict = todayQueryStrict.matches?.some(m => m.id === vectorId);
    log(`  │ Our note found: ${foundTodayStrict ? 'YES (bad!)' : 'NO (correct!)'}`, colors.dim);
    log('  └─', colors.cyan);

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
    // Cleanup: Delete test data from Firestore and Pinecone
    log('', colors.reset);
    log('  ┌─ Cleanup', colors.yellow);
    log(`  │ Deleting Firestore: voiceNotes/${noteId}`, colors.dim);
    log(`  │ Deleting Pinecone: voice_${noteId}`, colors.dim);
    try {
      await db.collection('voiceNotes').doc(noteId).delete();
      const index = pinecone.index(PINECONE_INDEX);
      await index.deleteOne(`voice_${noteId}`);
      log('  └─ ✓ All test data deleted', colors.green);
    } catch (cleanupError) {
      log(`  └─ ⚠ Cleanup warning: ${cleanupError}`, colors.yellow);
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
 * Test Case 4: RAG Query with temporal filter should use lowered minScore
 *
 * This tests the fix for: temporal queries filtering out relevant results
 * because semantic similarity is low (e.g., "什么饭" vs "牛排")
 *
 * The queryRAG function should use a lower minScore (0.25) when a temporal
 * filter is applied, since the date filter already provides relevance.
 */
async function testRAGQueryWithTemporalFilter(
  db: admin.firestore.Firestore,
  pinecone: Pinecone
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const testId = generateTestId();
  const noteId = `regression-voice-${testId}`;

  log('\n📝 Test Case 4: RAG Query with temporal filter (lowered minScore)', colors.yellow);

  const yesterdayDate = getDateNDaysAgo(1);
  logInfo(`Yesterday: ${yesterdayDate}`);
  logInfo(`Creating test voice note: "${noteId}"`);

  try {
    // Step 1: Create a voice note with "yesterday" reference about making pizza
    const voiceNoteData = {
      userId: TEST_USER_ID,
      transcription: '昨天晚上我做了披萨，自己和面发酵做的饼皮，放了很多芝士和培根',
      duration: 8,
      audioUrl: `https://test.storage/${noteId}.m4a`,
      createdAt: new Date().toISOString(),
      location: null,
    };

    await db.collection('voiceNotes').doc(noteId).set(voiceNoteData);
    logInfo(`Voice note created, waiting ${WAIT_TIME_MS / 1000}s for Cloud Function...`);

    await wait(WAIT_TIME_MS);

    // Step 2: Verify embedding was created
    const docSnap = await db.collection('voiceNotes').doc(noteId).get();
    const updatedNote = docSnap.data();

    if (!updatedNote?.embeddingId) {
      results.push({
        name: 'RAG Test: Embedding created',
        passed: false,
        reason: 'embeddingId not found',
        details: { embeddingError: updatedNote?.embeddingError },
      });
      return results;
    }

    logPass('Voice note embedded');
    results.push({ name: 'RAG Test: Embedding created', passed: true });

    // Step 3: Call queryRAG with a temporal query
    // The query "昨天我做了什么饭" has low semantic similarity to "披萨"
    // but should still find the note because of temporal filter + lowered minScore
    const queryRAGUrl = `https://${FIREBASE_REGION}-${FIREBASE_PROJECT_ID}.cloudfunctions.net/queryRAG`;

    log('', colors.reset);
    log('  ┌─ Calling queryRAG Cloud Function', colors.cyan);
    log('  │ Query: "昨天我做了什么饭" (What did I cook yesterday?)', colors.dim);
    log(`  │ URL: ${queryRAGUrl}`, colors.dim);

    const response = await fetch(queryRAGUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: {
          query: '昨天我做了什么饭',
          userId: TEST_USER_ID,
          topK: 10,
          // Don't set minScore - let it use the default (0.5) which should be
          // lowered to 0.25 for temporal queries automatically
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log(`  │ HTTP ${response.status}: ${errorText}`, colors.red);
      log('  └─', colors.cyan);
      results.push({
        name: 'RAG Query execution',
        passed: false,
        reason: `HTTP ${response.status}: ${errorText}`,
      });
      return results;
    }

    const data = await response.json();
    const result = data.result || {};

    log(`  │ Response received`, colors.dim);
    log(`  │ Context items: ${result.contextUsed?.length || 0}`, colors.dim);

    // Step 4: Check if our note was found in the context
    const contextUsed = result.contextUsed || [];
    const foundOurNote = contextUsed.some((ctx: any) =>
      ctx.snippet?.includes('披萨') ||
      ctx.snippet?.includes('pizza') ||
      ctx.text?.includes('披萨') ||
      ctx.id?.includes(noteId)
    );

    if (foundOurNote) {
      log(`  │ ✓ Found pizza note in context!`, colors.green);
      log('  └─', colors.cyan);
      logPass('RAG query with temporal filter found the note (lowered minScore working)');
      results.push({
        name: 'RAG temporal query finds note',
        passed: true,
        details: { contextCount: contextUsed.length },
      });
    } else {
      log(`  │ ✗ Pizza note NOT found in context`, colors.red);
      log(`  │ Context snippets:`, colors.dim);
      contextUsed.slice(0, 3).forEach((ctx: any, i: number) => {
        const snippet = ctx.snippet || ctx.text || '';
        log(`  │   ${i + 1}. ${snippet.substring(0, 50)}...`, colors.dim);
      });
      log('  └─', colors.cyan);

      logFail(
        'RAG temporal query finds note',
        'Note not found - minScore threshold may be filtering it out'
      );
      results.push({
        name: 'RAG temporal query finds note',
        passed: false,
        reason: 'Note not found in RAG context. The lowered minScore for temporal queries may not be working.',
        details: {
          contextCount: contextUsed.length,
          response: result.response?.substring(0, 100),
        },
      });
    }

    // Step 5: Check the AI response mentions pizza/cooking
    const aiResponse = result.response || '';
    log('', colors.reset);
    log('  ┌─ AI Response', colors.cyan);
    log(`  │ "${aiResponse.substring(0, 150)}..."`, colors.dim);
    log('  └─', colors.cyan);

    const mentionsCooking = aiResponse.includes('披萨') ||
      aiResponse.includes('pizza') ||
      aiResponse.includes('做') ||
      aiResponse.includes('cook');

    if (mentionsCooking) {
      logPass('AI response mentions cooking/pizza');
      results.push({ name: 'AI response relevant', passed: true });
    } else {
      logFail('AI response relevant', 'Response does not mention pizza or cooking');
      results.push({
        name: 'AI response relevant',
        passed: false,
        reason: 'AI response does not mention the cooking content',
      });
    }

  } catch (error: any) {
    results.push({
      name: 'RAG Test execution',
      passed: false,
      reason: error.message,
    });
  } finally {
    // Cleanup
    log('', colors.reset);
    log('  ┌─ Cleanup', colors.yellow);
    try {
      await db.collection('voiceNotes').doc(noteId).delete();
      const index = pinecone.index(PINECONE_INDEX);
      await index.deleteOne(`voice_${noteId}`);
      log('  └─ ✓ Test data deleted', colors.green);
    } catch (cleanupError) {
      log(`  └─ ⚠ Cleanup warning: ${cleanupError}`, colors.yellow);
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
  log(`\nPinecone Index: ${PINECONE_INDEX}`);
  log(`Wait Time: ${WAIT_TIME_MS / 1000}s per test`);

  let db: admin.firestore.Firestore;
  let pinecone: Pinecone;

  try {
    db = initFirebase();
    pinecone = initPinecone();
    log('\n✓ Firebase and Pinecone initialized', colors.green);

    // Ensure integration test user exists
    TEST_USER_ID = await ensureTestUserExists();
    log(`✓ Test user ready: ${TEST_USER_ID}`, colors.green);
  } catch (error: any) {
    log(`\n✗ Initialization failed: ${error.message}`, colors.red);
    process.exit(1);
  }

  log(`\nTest User ID: ${TEST_USER_ID}`);

  const allResults: TestResult[] = [];

  // Run test cases
  const test1Results = await testYesterdayReference(db, pinecone);
  allResults.push(...test1Results);

  const test2Results = await testDayBeforeYesterdayReference(db, pinecone);
  allResults.push(...test2Results);

  const test3Results = await testTodayReference(db, pinecone);
  allResults.push(...test3Results);

  const test4Results = await testRAGQueryWithTemporalFilter(db, pinecone);
  allResults.push(...test4Results);

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
