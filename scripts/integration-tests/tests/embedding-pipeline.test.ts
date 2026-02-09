/**
 * Embedding Pipeline - Integration Tests
 *
 * Tests the embedding generation flow for all data types:
 * 1. Text Notes (onTextNoteCreated)
 * 2. Voice Notes (onVoiceNoteCreated)
 * 3. Photo Memories (onPhotoMemoryCreated)
 *
 * Flow: User creates data → Firestore trigger → OpenAI embedding → Pinecone upsert
 *
 * Key Verifications:
 * - embeddingId is set after processing
 * - Pinecone vector exists with correct metadata
 * - userId isolation in Pinecone metadata
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
export const name = 'Embedding Pipeline';

// Test data cleanup tracker
const createdDocIds: { collection: string; id: string }[] = [];
const createdPineconeIds: string[] = [];

/**
 * Main test runner - exported for test discovery
 */
export async function run(): Promise<TestResult[]> {
  const { db, userId, pinecone } = globalThis.testContext;
  const allResults: TestResult[] = [];

  // Test Case 1: Text note embedding
  const test1Results = await testTextNoteEmbedding(db, userId, pinecone);
  allResults.push(...test1Results);

  // Test Case 2: Voice note embedding (checks existing flow)
  const test2Results = await testVoiceNoteEmbedding(db, userId, pinecone);
  allResults.push(...test2Results);

  // Test Case 3: Photo memory embedding
  const test3Results = await testPhotoMemoryEmbedding(db, userId, pinecone);
  allResults.push(...test3Results);

  // Test Case 4: Verify userId isolation in Pinecone
  const test4Results = await testUserIdIsolation(db, userId, pinecone);
  allResults.push(...test4Results);

  // Cleanup
  await cleanup(db, pinecone);

  return allResults;
}

/**
 * Test Case 1: Text Note Embedding Flow
 */
async function testTextNoteEmbedding(
  db: admin.firestore.Firestore,
  userId: string,
  pinecone: any
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Text Note Embedding Flow');

  try {
    const testId = generateTestId();
    const docId = `embedding-test-text-${testId}`;

    // Create a text note
    const textNote = {
      userId,
      type: 'diary',
      title: 'Test Diary Entry',
      content: 'Today I went to the gym and worked out for an hour. Feeling great!',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    logInfo(`Creating text note: ${docId}`);
    await db.collection('textNotes').doc(docId).set(textNote);
    createdDocIds.push({ collection: 'textNotes', id: docId });

    // Wait for Cloud Function to process
    logInfo('Waiting 15s for Cloud Function...');
    await wait(15000);

    // Check if embedding was created
    const doc = await db.collection('textNotes').doc(docId).get();
    const data = doc.data();

    const hasEmbeddingId = !!data?.embeddingId;
    const embeddingId = data?.embeddingId;

    if (hasEmbeddingId) {
      logPass(`embeddingId set: ${embeddingId}`);
      createdPineconeIds.push(embeddingId);
    } else {
      const error = data?.embeddingError || 'No embeddingId set';
      logFail(`Embedding failed: ${error}`);
    }

    results.push({
      name: 'Text Note: embeddingId is set',
      passed: hasEmbeddingId,
      reason: hasEmbeddingId
        ? `Embedding created: ${embeddingId}`
        : `No embedding: ${data?.embeddingError || 'Unknown error'}`,
      details: { docId, embeddingId, embeddingError: data?.embeddingError },
    });

    // Verify Pinecone vector exists
    if (hasEmbeddingId) {
      const pineconeIndex = pinecone.index(process.env.NEXT_PUBLIC_PINECONE_INDEX || 'personal-ai-data');
      const fetchResult = await pineconeIndex.fetch([embeddingId]);

      const vectorExists = fetchResult.records && fetchResult.records[embeddingId];

      if (vectorExists) {
        logPass('Vector found in Pinecone');
        const metadata = fetchResult.records[embeddingId].metadata;
        logInfo(`  Metadata userId: ${metadata?.userId}`);
        logInfo(`  Metadata type: ${metadata?.type}`);
      } else {
        logFail('Vector not found in Pinecone');
      }

      results.push({
        name: 'Text Note: Vector exists in Pinecone',
        passed: !!vectorExists,
        reason: vectorExists
          ? 'Vector successfully stored in Pinecone'
          : 'Vector not found in Pinecone',
        details: { embeddingId, vectorExists: !!vectorExists },
      });
    }

  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    results.push({
      name: 'Text Note: Test execution',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * Test Case 2: Voice Note Embedding Flow
 */
async function testVoiceNoteEmbedding(
  db: admin.firestore.Firestore,
  userId: string,
  pinecone: any
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Voice Note Embedding Flow');

  try {
    const testId = generateTestId();
    const docId = `embedding-test-voice-${testId}`;

    // Create a voice note
    const voiceNote = {
      userId,
      audioUrl: 'https://example.com/test-audio.m4a',
      transcription: 'I played badminton today at the local sports center. Great workout!',
      duration: 10,
      timestampMs: Date.now(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    logInfo(`Creating voice note: ${docId}`);
    await db.collection('voiceNotes').doc(docId).set(voiceNote);
    createdDocIds.push({ collection: 'voiceNotes', id: docId });

    // Wait for Cloud Function to process
    logInfo('Waiting 15s for Cloud Function...');
    await wait(15000);

    // Check if embedding was created
    const doc = await db.collection('voiceNotes').doc(docId).get();
    const data = doc.data();

    const hasEmbeddingId = !!data?.embeddingId;
    const embeddingId = data?.embeddingId;

    if (hasEmbeddingId) {
      logPass(`embeddingId set: ${embeddingId}`);
      createdPineconeIds.push(embeddingId);
    } else {
      const error = data?.embeddingError || 'No embeddingId set';
      logFail(`Embedding failed: ${error}`);
    }

    results.push({
      name: 'Voice Note: embeddingId is set',
      passed: hasEmbeddingId,
      reason: hasEmbeddingId
        ? `Embedding created: ${embeddingId}`
        : `No embedding: ${data?.embeddingError || 'Unknown error'}`,
      details: { docId, embeddingId },
    });

    // Verify timestampMs in metadata
    if (hasEmbeddingId) {
      const pineconeIndex = pinecone.index(process.env.NEXT_PUBLIC_PINECONE_INDEX || 'personal-ai-data');
      const fetchResult = await pineconeIndex.fetch([embeddingId]);

      if (fetchResult.records && fetchResult.records[embeddingId]) {
        const metadata = fetchResult.records[embeddingId].metadata;
        const hasTimestamp = !!metadata?.timestampMs;

        if (hasTimestamp) {
          logPass(`timestampMs in metadata: ${metadata.timestampMs}`);
        } else {
          logFail('timestampMs missing from metadata');
        }

        results.push({
          name: 'Voice Note: timestampMs in Pinecone metadata',
          passed: hasTimestamp,
          reason: hasTimestamp
            ? `timestampMs present: ${metadata.timestampMs}`
            : 'timestampMs missing from metadata',
          details: { embeddingId, hasTimestamp, metadata },
        });
      }
    }

  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    results.push({
      name: 'Voice Note: Test execution',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * Test Case 3: Photo Memory Embedding Flow
 */
async function testPhotoMemoryEmbedding(
  db: admin.firestore.Firestore,
  userId: string,
  pinecone: any
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Photo Memory Embedding Flow');

  try {
    // Check existing photos with embeddings
    const photosSnapshot = await db.collection('photoMemories')
      .where('userId', '==', userId)
      .limit(10)
      .get();

    logQueryBox('Photo Memories Check', [
      'Collection: photoMemories',
      `Found: ${photosSnapshot.size} photos`,
    ]);

    let withEmbedding = 0;
    let withoutEmbedding = 0;
    let withError = 0;

    photosSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.embeddingId) {
        withEmbedding++;
      } else if (data.embeddingError) {
        withError++;
      } else {
        withoutEmbedding++;
      }
    });

    log(`  With embedding: ${withEmbedding}`, colors.dim);
    log(`  Without embedding: ${withoutEmbedding}`, colors.dim);
    log(`  With error: ${withError}`, colors.dim);

    const embeddingRate = photosSnapshot.size > 0
      ? (withEmbedding / photosSnapshot.size * 100).toFixed(1)
      : 'N/A';

    if (withEmbedding > 0) {
      logPass(`${withEmbedding} photos have embeddings (${embeddingRate}%)`);
    } else if (photosSnapshot.size === 0) {
      logInfo('No photos found for user');
    } else {
      logFail('No photos have embeddings');
    }

    results.push({
      name: 'Photo Memory: Embedding status',
      passed: true, // Informational
      reason: photosSnapshot.size > 0
        ? `${withEmbedding}/${photosSnapshot.size} photos embedded (${embeddingRate}%)`
        : 'No photos found',
      details: { total: photosSnapshot.size, withEmbedding, withoutEmbedding, withError },
    });

    // Verify a photo embedding in Pinecone
    if (withEmbedding > 0) {
      const photoWithEmbedding = photosSnapshot.docs.find(d => d.data().embeddingId);
      if (photoWithEmbedding) {
        const embeddingId = photoWithEmbedding.data().embeddingId;
        const pineconeIndex = pinecone.index(process.env.NEXT_PUBLIC_PINECONE_INDEX || 'personal-ai-data');
        const fetchResult = await pineconeIndex.fetch([embeddingId]);

        const vectorExists = fetchResult.records && fetchResult.records[embeddingId];

        if (vectorExists) {
          logPass(`Photo vector found in Pinecone: ${embeddingId.substring(0, 20)}...`);
        } else {
          logFail('Photo vector not found in Pinecone');
        }

        results.push({
          name: 'Photo Memory: Vector exists in Pinecone',
          passed: !!vectorExists,
          reason: vectorExists
            ? 'Photo vector successfully stored'
            : 'Photo vector not found',
          details: { embeddingId },
        });
      }
    }

  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    results.push({
      name: 'Photo Memory: Test execution',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * Test Case 4: Verify userId Isolation in Pinecone
 */
async function testUserIdIsolation(
  db: admin.firestore.Firestore,
  userId: string,
  pinecone: any
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('userId Isolation in Pinecone');

  try {
    const pineconeIndex = pinecone.index(process.env.NEXT_PUBLIC_PINECONE_INDEX || 'personal-ai-data');

    // Query with userId filter
    const queryResult = await pineconeIndex.query({
      vector: new Array(1536).fill(0.1), // Dummy vector
      topK: 10,
      filter: { userId },
      includeMetadata: true,
    });

    logQueryBox('Pinecone userId Filter', [
      `filter: { userId: "${userId.substring(0, 8)}..." }`,
      `Results: ${queryResult.matches?.length || 0}`,
    ]);

    const matchCount = queryResult.matches?.length || 0;

    // Verify all returned vectors have correct userId
    let allMatch = true;
    let mismatchCount = 0;

    queryResult.matches?.forEach((match: any) => {
      if (match.metadata?.userId !== userId) {
        allMatch = false;
        mismatchCount++;
      }
    });

    if (matchCount === 0) {
      logInfo('No vectors returned (may need more data)');
    } else if (allMatch) {
      logPass(`All ${matchCount} vectors have correct userId`);
    } else {
      logFail(`${mismatchCount}/${matchCount} vectors have wrong userId`);
    }

    results.push({
      name: 'Pinecone: userId isolation verified',
      passed: matchCount === 0 || allMatch,
      reason: matchCount === 0
        ? 'No vectors to verify (user needs more data)'
        : allMatch
          ? `All ${matchCount} vectors correctly filtered by userId`
          : `${mismatchCount} vectors have incorrect userId`,
      details: { matchCount, allMatch, mismatchCount },
    });

  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    results.push({
      name: 'Pinecone: userId isolation test',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * Cleanup test data
 */
async function cleanup(
  db: admin.firestore.Firestore,
  pinecone: any
): Promise<void> {
  const totalItems = createdDocIds.length + createdPineconeIds.length;
  if (totalItems === 0) {
    return;
  }

  const cleanupItems = [
    ...createdDocIds.map(({ collection, id }) => `${collection}/${id}`),
    ...createdPineconeIds.map(id => `pinecone:${id}`),
  ];
  logCleanup(cleanupItems);

  let deleted = 0;
  let failed = 0;

  // Delete Firestore docs
  for (const { collection, id } of createdDocIds) {
    try {
      await db.collection(collection).doc(id).delete();
      deleted++;
    } catch (error) {
      failed++;
    }
  }

  // Delete Pinecone vectors
  if (createdPineconeIds.length > 0) {
    try {
      const pineconeIndex = pinecone.index(process.env.NEXT_PUBLIC_PINECONE_INDEX || 'personal-ai-data');
      await pineconeIndex.deleteMany(createdPineconeIds);
      deleted += createdPineconeIds.length;
    } catch (error) {
      failed += createdPineconeIds.length;
    }
  }

  const success = failed === 0;
  const message = success ? undefined : `Deleted ${deleted}, failed ${failed}`;
  logCleanupResult(success, message);
}

/**
 * Cleanup function exported for test runner
 */
export async function cleanupTestData(): Promise<void> {
  const { db, pinecone } = globalThis.testContext;
  await cleanup(db, pinecone);
}
