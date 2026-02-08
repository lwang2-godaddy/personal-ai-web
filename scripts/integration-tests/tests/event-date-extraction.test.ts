/**
 * Event Date Extraction - Integration Test
 *
 * Tests that voice notes with past temporal references (e.g., "yesterday I did X")
 * are correctly indexed with eventTimestampMs and can be found by temporal queries.
 *
 * Test Cases:
 * 1. Voice note with "昨天" (yesterday) → eventTimestampMs should be yesterday
 * 2. Voice note with "前天" (day before yesterday) → eventTimestampMs should be 2 days ago
 * 3. Voice note with "今天" (today) → eventTimestampMs should be today
 * 4. RAG Query with temporal filter → should use lowered minScore
 */

import type { TestResult } from '../lib/test-utils';
import {
  generateTestId,
  getDateNDaysAgo,
  getTimestampForDate,
  getStartOfDay,
  getEndOfDay,
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
export const name = 'Event Date Extraction';

/**
 * Main test runner - exported for test discovery
 */
export async function run(): Promise<TestResult[]> {
  const { db, pinecone, userId, projectId, region, pineconeIndex, waitTimeMs } = globalThis.testContext;
  const allResults: TestResult[] = [];

  // Test Case 1: Yesterday reference
  const test1Results = await testYesterdayReference(db, pinecone, userId, pineconeIndex, waitTimeMs);
  allResults.push(...test1Results);

  // Test Case 2: Day before yesterday reference
  const test2Results = await testDayBeforeYesterdayReference(db, pinecone, userId, pineconeIndex, waitTimeMs);
  allResults.push(...test2Results);

  // Test Case 3: Today reference
  const test3Results = await testTodayReference(db, pinecone, userId, pineconeIndex, waitTimeMs);
  allResults.push(...test3Results);

  // Test Case 4: RAG Query with temporal filter
  const test4Results = await testRAGQueryWithTemporalFilter(db, pinecone, userId, projectId, region, pineconeIndex, waitTimeMs);
  allResults.push(...test4Results);

  return allResults;
}

/**
 * Test Case 1: Voice note with "yesterday" reference - "昨天我煎了牛排"
 */
async function testYesterdayReference(
  db: FirebaseFirestore.Firestore,
  pinecone: any,
  userId: string,
  pineconeIndex: string,
  waitTimeMs: number
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const testId = generateTestId();
  const noteId = `regression-voice-${testId}`;

  logTestCase('Test Case 1: Voice note with "yesterday" reference');

  const yesterdayDate = getDateNDaysAgo(1);
  const todayDate = getDateNDaysAgo(0);

  logInfo(`Today: ${todayDate}, Yesterday: ${yesterdayDate}`);
  logInfo(`Creating test voice note: "${noteId}"`);

  try {
    // Step 1: Create a test voice note with "yesterday" reference
    const voiceNoteData = {
      userId,
      transcription: '昨天我煎了牛排，很好吃', // Yesterday I made steak, it was delicious
      duration: 5,
      audioUrl: `https://test.storage/${noteId}.m4a`,
      createdAt: new Date().toISOString(),
      location: null,
    };

    await db.collection('voiceNotes').doc(noteId).set(voiceNoteData);
    logInfo(`Voice note created, waiting ${waitTimeMs / 1000}s for Cloud Function...`);

    // Step 2: Wait for Cloud Function to process
    await wait(waitTimeMs);

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
    const index = pinecone.index(pineconeIndex);
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
    const yesterdayStart = getStartOfDay(yesterdayDate);
    const yesterdayEnd = getEndOfDay(yesterdayDate);
    const dummyEmbedding = new Array(1536).fill(0.01);

    const queryFilter = {
      $and: [
        { userId },
        {
          $or: [
            { eventTimestampMs: { $gte: yesterdayStart, $lte: yesterdayEnd } },
            { timestampMs: { $gte: yesterdayStart, $lte: yesterdayEnd } },
          ],
        },
      ],
    };

    logQueryBox('Query: "我昨天做了什么饭" (What did I cook yesterday?)', [
      `Filter: eventTimestampMs OR timestampMs in [${yesterdayDate}]`,
      `Date range: ${yesterdayStart} - ${yesterdayEnd}`,
    ]);

    const yesterdayQuery = await index.query({
      vector: dummyEmbedding,
      topK: 10,
      filter: queryFilter,
      includeMetadata: true,
    });

    log(`  \u2502 Results: ${yesterdayQuery.matches?.length || 0} matches found`, colors.dim);

    const foundMatch = yesterdayQuery.matches?.find((m: any) => m.id === vectorId);

    if (foundMatch) {
      const noteText = (foundMatch.metadata as any)?.text || '';
      log(`  \u2502 Match: ${foundMatch.id}`, colors.dim);
      log(`  \u2502 Text: "${noteText.substring(0, 60)}..."`, colors.dim);
      log('  \u2514\u2500', colors.cyan);

      logPass('Query for yesterday finds the note');
      results.push({ name: 'Query for yesterday finds note', passed: true });

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
      log(`  \u2502 Expected vector ID not found: ${vectorId}`, colors.dim);
      log('  \u2514\u2500', colors.cyan);

      logFail('Query for yesterday finds the note', 'Note not found in yesterday query results');
      results.push({
        name: 'Query for yesterday finds note',
        passed: false,
        reason: 'Note not found in yesterday query results',
        details: { matchCount: yesterdayQuery.matches?.length },
      });
    }

    // Step 7: Query for today only (not yesterday) - should NOT find the note
    const todayStart = getStartOfDay(todayDate);
    const todayEnd = getEndOfDay(todayDate);

    logQueryBox('Query: "我今天做了什么饭" (What did I cook today?) - should NOT find note', [
      `Filter: eventTimestampMs ONLY in [${todayDate}] (strict)`,
    ]);

    const todayQueryStrict = await index.query({
      vector: dummyEmbedding,
      topK: 10,
      filter: {
        $and: [
          { userId },
          { eventTimestampMs: { $gte: todayStart, $lte: todayEnd } },
        ],
      },
      includeMetadata: true,
    });

    log(`  \u2502 Results: ${todayQueryStrict.matches?.length || 0} matches found`, colors.dim);
    const foundTodayStrict = todayQueryStrict.matches?.some((m: any) => m.id === vectorId);
    log(`  \u2502 Our note found: ${foundTodayStrict ? 'YES (bad!)' : 'NO (correct!)'}`, colors.dim);
    log('  \u2514\u2500', colors.cyan);

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
    // Cleanup
    logCleanup([
      `Deleting Firestore: voiceNotes/${noteId}`,
      `Deleting Pinecone: voice_${noteId}`,
    ]);
    try {
      await db.collection('voiceNotes').doc(noteId).delete();
      const index = pinecone.index(pineconeIndex);
      await index.deleteOne(`voice_${noteId}`);
      logCleanupResult(true);
    } catch (cleanupError: any) {
      logCleanupResult(false, cleanupError.message);
    }
  }

  return results;
}

/**
 * Test Case 2: Voice note with "前天" (day before yesterday) reference
 */
async function testDayBeforeYesterdayReference(
  db: FirebaseFirestore.Firestore,
  pinecone: any,
  userId: string,
  pineconeIndex: string,
  waitTimeMs: number
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const testId = generateTestId();
  const noteId = `regression-voice-${testId}`;

  logTestCase('Test Case 2: Voice note with "前天" (day before yesterday) reference');

  const dayBeforeYesterday = getDateNDaysAgo(2);

  logInfo(`Day before yesterday: ${dayBeforeYesterday}`);
  logInfo(`Creating test voice note: "${noteId}"`);

  try {
    const voiceNoteData = {
      userId,
      transcription: '前天我去健身房锻炼了两个小时', // Day before yesterday I went to gym for 2 hours
      duration: 4,
      audioUrl: `https://test.storage/${noteId}.m4a`,
      createdAt: new Date().toISOString(),
      location: null,
    };

    await db.collection('voiceNotes').doc(noteId).set(voiceNoteData);
    logInfo(`Voice note created, waiting ${waitTimeMs / 1000}s for Cloud Function...`);

    await wait(waitTimeMs);

    // Check Pinecone
    const index = pinecone.index(pineconeIndex);
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
      const index = pinecone.index(pineconeIndex);
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
  db: FirebaseFirestore.Firestore,
  pinecone: any,
  userId: string,
  pineconeIndex: string,
  waitTimeMs: number
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const testId = generateTestId();
  const noteId = `regression-voice-${testId}`;

  logTestCase('Test Case 3: Voice note with "today" reference');

  const todayDate = getDateNDaysAgo(0);

  logInfo(`Today: ${todayDate}`);
  logInfo(`Creating test voice note: "${noteId}"`);

  try {
    const voiceNoteData = {
      userId,
      transcription: '今天天气很好，我去公园散步了', // Today the weather is nice, I went for a walk in the park
      duration: 3,
      audioUrl: `https://test.storage/${noteId}.m4a`,
      createdAt: new Date().toISOString(),
      location: null,
    };

    await db.collection('voiceNotes').doc(noteId).set(voiceNoteData);
    logInfo(`Voice note created, waiting ${waitTimeMs / 1000}s for Cloud Function...`);

    await wait(waitTimeMs);

    // Check Pinecone
    const index = pinecone.index(pineconeIndex);
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
      const index = pinecone.index(pineconeIndex);
      await index.deleteOne(`voice_${noteId}`);
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
  }

  return results;
}

/**
 * Test Case 4: RAG Query with temporal filter should use lowered minScore
 */
async function testRAGQueryWithTemporalFilter(
  db: FirebaseFirestore.Firestore,
  pinecone: any,
  userId: string,
  projectId: string,
  region: string,
  pineconeIndex: string,
  waitTimeMs: number
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const testId = generateTestId();
  const noteId = `regression-voice-${testId}`;

  logTestCase('Test Case 4: RAG Query with temporal filter (lowered minScore)');

  const yesterdayDate = getDateNDaysAgo(1);
  logInfo(`Yesterday: ${yesterdayDate}`);
  logInfo(`Creating test voice note: "${noteId}"`);

  try {
    // Step 1: Create a voice note with "yesterday" reference about making pizza
    const voiceNoteData = {
      userId,
      transcription: '昨天晚上我做了披萨，自己和面发酵做的饼皮，放了很多芝士和培根',
      duration: 8,
      audioUrl: `https://test.storage/${noteId}.m4a`,
      createdAt: new Date().toISOString(),
      location: null,
    };

    await db.collection('voiceNotes').doc(noteId).set(voiceNoteData);
    logInfo(`Voice note created, waiting ${waitTimeMs / 1000}s for Cloud Function...`);

    await wait(waitTimeMs);

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
    const queryRAGUrl = `https://${region}-${projectId}.cloudfunctions.net/queryRAG`;

    logQueryBox('Calling queryRAG Cloud Function', [
      'Query: "昨天我做了什么饭" (What did I cook yesterday?)',
      `URL: ${queryRAGUrl}`,
    ]);

    const { idToken } = globalThis.testContext;
    const response = await fetch(queryRAGUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        data: {
          query: '昨天我做了什么饭',
          userId,
          topK: 10,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log(`  \u2502 HTTP ${response.status}: ${errorText}`, colors.red);
      log('  \u2514\u2500', colors.cyan);
      results.push({
        name: 'RAG Query execution',
        passed: false,
        reason: `HTTP ${response.status}: ${errorText}`,
      });
      return results;
    }

    const data = await response.json();
    const result = data.result || {};

    log(`  \u2502 Response received`, colors.dim);
    log(`  \u2502 Context items: ${result.contextUsed?.length || 0}`, colors.dim);

    // Step 4: Check if our note was found in the context
    const contextUsed = result.contextUsed || [];
    const foundOurNote = contextUsed.some((ctx: any) =>
      ctx.snippet?.includes('披萨') ||
      ctx.snippet?.includes('pizza') ||
      ctx.text?.includes('披萨') ||
      ctx.id?.includes(noteId)
    );

    if (foundOurNote) {
      log(`  \u2502 \u2713 Found pizza note in context!`, colors.green);
      log('  \u2514\u2500', colors.cyan);
      logPass('RAG query with temporal filter found the note (lowered minScore working)');
      results.push({
        name: 'RAG temporal query finds note',
        passed: true,
        details: { contextCount: contextUsed.length },
      });
    } else {
      log(`  \u2502 \u2717 Pizza note NOT found in context`, colors.red);
      log(`  \u2502 Context snippets:`, colors.dim);
      contextUsed.slice(0, 3).forEach((ctx: any, i: number) => {
        const snippet = ctx.snippet || ctx.text || '';
        log(`  \u2502   ${i + 1}. ${snippet.substring(0, 50)}...`, colors.dim);
      });
      log('  \u2514\u2500', colors.cyan);

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
    logQueryBox('AI Response', [
      `"${aiResponse.substring(0, 150)}..."`,
    ]);

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
    logCleanup([
      `Deleting Firestore: voiceNotes/${noteId}`,
      `Deleting Pinecone: voice_${noteId}`,
    ]);
    try {
      await db.collection('voiceNotes').doc(noteId).delete();
      const index = pinecone.index(pineconeIndex);
      await index.deleteOne(`voice_${noteId}`);
      logCleanupResult(true);
    } catch (cleanupError: any) {
      logCleanupResult(false, cleanupError.message);
    }
  }

  return results;
}
