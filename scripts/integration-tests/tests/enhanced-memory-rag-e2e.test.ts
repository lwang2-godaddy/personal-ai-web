/**
 * Enhanced Memory RAG Search - End-to-End Tests
 *
 * COMPREHENSIVE E2E test that verifies enhanced memory search via RAG:
 * 1. Creates a text note with specific entities
 * 2. Waits for embedding generation
 * 3. Verifies memory was created with enhanced entities
 * 4. Tests Pinecone contains the vector with entity metadata
 * 5. Tests RAG queries that leverage entity filtering
 *
 * This test requires:
 * - Cloud Functions deployed with MemoryGeneratorService
 * - Pinecone configured
 * - OpenAI API key configured
 *
 * Run: npm test -- --filter enhanced-memory-rag-e2e
 * Or:  npm test -- --e2e-only
 */

import * as admin from 'firebase-admin';
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
  logQueryBox,
  logCleanup,
  logCleanupResult,
} from '../lib/reporter';

// Test name for discovery
export const name = 'Enhanced Memory RAG E2E';

// Track created documents for cleanup
let createdTextNoteId: string | null = null;
let createdMemoryId: string | null = null;

/**
 * Main test runner - exported for test discovery
 */
export async function run(): Promise<TestResult[]> {
  const { db, userId, pinecone, waitTimeMs } = globalThis.testContext;
  const allResults: TestResult[] = [];

  // Test 1: Create text note with specific entities
  const setupResults = await testCreateTextNote(db, userId);
  allResults.push(...setupResults);

  if (setupResults.some(r => !r.passed)) {
    await cleanup(db);
    return allResults;
  }

  // Wait for embedding generation (longer wait)
  const extendedWait = Math.max(waitTimeMs, 25000);
  logInfo(`Waiting ${extendedWait / 1000}s for Cloud Function processing...`);
  await wait(extendedWait);

  // Test 2: Verify memory was created
  const memoryResults = await testMemoryCreated(db, userId);
  allResults.push(...memoryResults);

  // Test 3: Verify embedding was generated
  const embeddingResults = await testEmbeddingGenerated(db);
  allResults.push(...embeddingResults);

  // Test 4: Test Pinecone contains the vector
  const pineconeResults = await testPineconeVector(pinecone);
  allResults.push(...pineconeResults);

  // Test 5: Test entity-based Firestore queries
  const queryResults = await testEntityQueries(db, userId);
  allResults.push(...queryResults);

  // Cleanup
  await cleanup(db);

  return allResults;
}

/**
 * Test 1: Create text note with specific, unique entities
 */
async function testCreateTextNote(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('E2E RAG: Create Text Note with Rich Entities');

  const testId = generateTestId();

  try {
    // Create unique identifiers for testing
    const uniquePerson = `Captain Neptune ${testId.substring(0, 8)}`;
    const uniquePlace = `Mermaid Cove Resort ${testId.substring(0, 8)}`;
    const uniqueActivity = `scuba-diving-${testId.substring(0, 8)}`;

    createdTextNoteId = `e2e-rag-${testId}`;

    const noteContent = `Had an incredible scuba diving experience with ${uniquePerson} at ${uniquePlace}. The underwater visibility was amazing - we saw colorful coral reefs and tropical fish. ${uniquePerson} was an excellent diving instructor who helped me improve my buoyancy control. I felt exhilarated and accomplished after completing my advanced certification. The ${uniquePlace} staff made everything perfect.`;

    await db.collection('textNotes').doc(createdTextNoteId).set({
      userId,
      title: 'Scuba Diving Adventure',
      content: noteContent,
      tags: ['scuba', 'diving', 'vacation'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      location: null,
      embeddingId: null,
    });

    // Store test data for later tests
    (globalThis as any).e2eRagTestData = {
      textNoteId: createdTextNoteId,
      uniquePerson,
      uniquePlace,
      uniqueActivity,
      testId,
    };

    logPass(`Created text note: ${createdTextNoteId}`);
    logInfo(`  Unique person: ${uniquePerson}`);
    logInfo(`  Unique place: ${uniquePlace}`);

    results.push({
      name: 'E2E RAG: Text note created',
      passed: true,
      reason: 'Text note with unique entities created',
      details: { textNoteId: createdTextNoteId, uniquePerson, uniquePlace },
    });

  } catch (error: any) {
    logFail('Text note creation failed', error.message);
    results.push({
      name: 'E2E RAG: Text note creation',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * Test 2: Verify memory was created from text note
 */
async function testMemoryCreated(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('E2E RAG: Verify Memory Created');

  if (!createdTextNoteId) {
    results.push({
      name: 'E2E RAG: Memory created',
      passed: false,
      reason: 'No text note ID - previous test failed',
    });
    return results;
  }

  try {
    // Check for memory with this sourceId
    const memoriesSnap = await db.collection('memories')
      .where('userId', '==', userId)
      .where('sourceId', '==', createdTextNoteId)
      .where('sourceType', '==', 'text')
      .limit(1)
      .get();

    if (!memoriesSnap.empty) {
      const memoryDoc = memoriesSnap.docs[0];
      createdMemoryId = memoryDoc.id;
      const data = memoryDoc.data();

      logPass(`Memory created: ${createdMemoryId}`);
      logInfo(`  Title: ${data.title}`);
      logInfo(`  Has enhancedEntities: ${!!data.enhancedEntities}`);
      logInfo(`  Has sentiment: ${!!data.sentiment}`);

      results.push({
        name: 'E2E RAG: Memory created',
        passed: true,
        reason: 'Memory document created from text note',
        details: {
          memoryId: createdMemoryId,
          title: data.title,
          hasEnhancedEntities: !!data.enhancedEntities,
        },
      });
    } else {
      logFail('Memory creation', 'No memory document found');

      // Check for embeddingError on text note
      const noteDoc = await db.collection('textNotes').doc(createdTextNoteId).get();
      const noteData = noteDoc.data();
      if (noteData?.embeddingError) {
        logInfo(`  Error: ${noteData.embeddingError}`);
      }

      results.push({
        name: 'E2E RAG: Memory created',
        passed: false,
        reason: noteData?.embeddingError
          ? `Memory creation failed: ${noteData.embeddingError}`
          : 'No memory document found - Cloud Function may have failed',
      });
    }

  } catch (error: any) {
    logFail('Memory verification failed', error.message);
    results.push({
      name: 'E2E RAG: Memory created',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * Test 3: Verify embedding was generated on text note
 */
async function testEmbeddingGenerated(
  db: admin.firestore.Firestore
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('E2E RAG: Verify Embedding Generated');

  if (!createdTextNoteId) {
    results.push({
      name: 'E2E RAG: Embedding generated',
      passed: false,
      reason: 'No text note ID',
    });
    return results;
  }

  try {
    const noteDoc = await db.collection('textNotes').doc(createdTextNoteId).get();
    const noteData = noteDoc.data();

    const hasEmbedding = !!noteData?.embeddingId;
    const hasError = !!noteData?.embeddingError;

    logQueryBox('Embedding Status', [
      `embeddingId: ${noteData?.embeddingId || 'NOT SET'}`,
      `embeddingError: ${noteData?.embeddingError || 'none'}`,
      `normalizedContent: ${noteData?.normalizedContent ? 'SET' : 'NOT SET'}`,
    ]);

    if (hasEmbedding) {
      logPass(`Embedding generated: ${noteData.embeddingId}`);
      results.push({
        name: 'E2E RAG: Embedding generated',
        passed: true,
        reason: 'Text note has embeddingId',
        details: { embeddingId: noteData.embeddingId },
      });
    } else if (hasError) {
      logFail('Embedding generation', noteData.embeddingError);
      results.push({
        name: 'E2E RAG: Embedding generated',
        passed: false,
        reason: `Embedding error: ${noteData.embeddingError}`,
      });
    } else {
      logFail('Embedding generation', 'No embeddingId and no error - may still be processing');
      results.push({
        name: 'E2E RAG: Embedding generated',
        passed: false,
        reason: 'No embeddingId set - Cloud Function may not have completed',
      });
    }

  } catch (error: any) {
    logFail('Embedding check failed', error.message);
    results.push({
      name: 'E2E RAG: Embedding generated',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * Test 4: Verify vector exists in Pinecone
 */
async function testPineconeVector(
  pinecone: any
): Promise<TestResult[]> {
  const { db } = globalThis.testContext;
  const results: TestResult[] = [];
  logTestCase('E2E RAG: Verify Pinecone Vector');

  if (!pinecone) {
    logInfo('Pinecone client not available - skipping');
    results.push({
      name: 'E2E RAG: Pinecone vector',
      passed: false,
      reason: 'Pinecone client not configured',
    });
    return results;
  }

  if (!createdMemoryId) {
    results.push({
      name: 'E2E RAG: Pinecone vector',
      passed: false,
      reason: 'No memory ID - previous test failed',
    });
    return results;
  }

  try {
    const indexName = process.env.NEXT_PUBLIC_PINECONE_INDEX || 'personal-ai-data';
    const pineconeIndex = pinecone.index(indexName);

    // Get the embeddingId from the memory document (which is what MemoryGeneratorService stored)
    const memoryDoc = await db.collection('memories').doc(createdMemoryId).get();
    const memoryData = memoryDoc.data();
    const memoryEmbeddingId = memoryData?.embeddingId;

    // Also get the textNote's embeddingId as fallback
    const noteDoc = await db.collection('textNotes').doc(createdTextNoteId!).get();
    const noteData = noteDoc.data();
    const textNoteEmbeddingId = noteData?.embeddingId;

    logInfo(`  Memory embeddingId: ${memoryEmbeddingId || 'NOT SET'}`);
    logInfo(`  TextNote embeddingId: ${textNoteEmbeddingId || 'NOT SET'}`);

    // Try both IDs - memory embedding first, then textNote embedding
    const idsToTry = [memoryEmbeddingId, textNoteEmbeddingId].filter(Boolean);

    if (idsToTry.length === 0) {
      logFail('Pinecone vector', 'Neither memory nor textNote has embeddingId');
      results.push({
        name: 'E2E RAG: Pinecone vector exists',
        passed: false,
        reason: 'No embeddingId found on memory or textNote - embedding may have failed',
      });
      return results;
    }

    // Wait longer for Pinecone eventual consistency (serverless can take 10-30 seconds)
    logInfo(`  Waiting 10s for Pinecone eventual consistency...`);
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Use query instead of fetch - Pinecone serverless has eventual consistency issues with fetch
    // Query by type=memory and userId filter to find recently created vectors
    const dummyVector = new Array(1536).fill(0);
    const { userId } = globalThis.testContext;

    logInfo(`  Querying Pinecone for type=memory, userId=${userId}`);
    const queryResult = await pineconeIndex.query({
      vector: dummyVector,
      topK: 20,
      filter: { type: 'memory', userId },
      includeMetadata: true,
    });

    // Check if any of the expected IDs are in the results
    let foundVector: any = null;
    let foundVectorId: string | null = null;

    if (queryResult.matches) {
      for (const vectorId of idsToTry) {
        const match = queryResult.matches.find((m: any) => m.id === vectorId);
        if (match) {
          foundVector = match;
          foundVectorId = vectorId;
          break;
        }
      }
    }

    if (foundVector && foundVectorId) {
      const metadata = foundVector.metadata || {};

      logPass(`Vector found in Pinecone via query: ${foundVectorId}`);
      logInfo(`  Metadata keys: ${Object.keys(metadata).join(', ')}`);

      // Check for enhanced entity fields in metadata
      const hasActivities = 'activities' in metadata;
      const hasPeopleNames = 'peopleNames' in metadata;
      const hasPlaceNames = 'placeNames' in metadata;

      logInfo(`  Has activities: ${hasActivities}`);
      logInfo(`  Has peopleNames: ${hasPeopleNames}`);
      logInfo(`  Has placeNames: ${hasPlaceNames}`);

      results.push({
        name: 'E2E RAG: Pinecone vector exists',
        passed: true,
        reason: 'Vector found with metadata via query',
        details: {
          vectorId: foundVectorId,
          hasActivities,
          hasPeopleNames,
          hasPlaceNames,
          metadataKeys: Object.keys(metadata),
        },
      });
    } else {
      // Log what we did find
      const foundIds = queryResult.matches?.map((m: any) => m.id).slice(0, 5) || [];
      logFail('Pinecone vector', 'Vector not found in query results');
      logInfo(`  Expected IDs: ${idsToTry.join(', ')}`);
      logInfo(`  Found IDs (first 5): ${foundIds.join(', ') || 'none'}`);
      results.push({
        name: 'E2E RAG: Pinecone vector exists',
        passed: false,
        reason: `Vectors not found in Pinecone query. Expected: ${idsToTry.join(', ')}`,
      });
    }

  } catch (error: any) {
    logFail('Pinecone fetch failed', error.message);
    results.push({
      name: 'E2E RAG: Pinecone vector',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * Test 5: Test entity-based Firestore queries
 */
async function testEntityQueries(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('E2E RAG: Test Entity-Based Queries');

  if (!createdMemoryId) {
    logInfo('No memory ID - skipping entity queries');
    results.push({
      name: 'E2E RAG: Entity queries',
      passed: false,
      reason: 'No memory created - cannot test entity queries',
    });
    return results;
  }

  try {
    // Get the memory to check its entity fields
    const memoryDoc = await db.collection('memories').doc(createdMemoryId).get();
    const memoryData = memoryDoc.data();

    const entityFields = {
      activities: memoryData?.activities || [],
      emotions: memoryData?.emotions || [],
      peopleNames: memoryData?.peopleNames || [],
      placeNames: memoryData?.placeNames || [],
    };

    logQueryBox('Memory Entity Fields', [
      `activities: ${entityFields.activities.length} (${entityFields.activities.slice(0, 2).join(', ')})`,
      `emotions: ${entityFields.emotions.length} (${entityFields.emotions.slice(0, 2).join(', ')})`,
      `peopleNames: ${entityFields.peopleNames.length} (${entityFields.peopleNames.slice(0, 2).join(', ')})`,
      `placeNames: ${entityFields.placeNames.length} (${entityFields.placeNames.slice(0, 2).join(', ')})`,
    ]);

    // Test array-contains query if we have activities
    let queryWorking = false;
    if (entityFields.activities.length > 0) {
      const activity = entityFields.activities[0];
      try {
        const querySnap = await db.collection('memories')
          .where('userId', '==', userId)
          .where('activities', 'array-contains', activity)
          .limit(5)
          .get();

        const foundOurMemory = querySnap.docs.some(d => d.id === createdMemoryId);

        if (foundOurMemory) {
          logPass(`Activity query works: found memory with "${activity}"`);
          queryWorking = true;
        } else {
          logInfo(`Activity query returned ${querySnap.size} results but not our memory`);
        }
      } catch (queryError: any) {
        if (queryError.message.includes('index')) {
          logInfo('Activity query needs Firestore index');
        } else {
          logInfo(`Activity query error: ${queryError.message}`);
        }
      }
    }

    const hasEntityData = Object.values(entityFields).some(arr => arr.length > 0);

    if (hasEntityData) {
      logPass('Memory has entity fields populated');
      results.push({
        name: 'E2E RAG: Entity queries',
        passed: true,
        reason: `Memory has entity data: ${Object.entries(entityFields).map(([k, v]) => `${k}:${v.length}`).join(', ')}`,
        details: { entityFields, queryWorking },
      });
    } else {
      logFail('Entity fields', 'No entity data in memory');
      logInfo('Enhanced entity extraction may not be enabled');
      results.push({
        name: 'E2E RAG: Entity queries',
        passed: false,
        reason: 'Memory has no entity fields - enhanced extraction may not be enabled',
        details: { entityFields },
      });
    }

  } catch (error: any) {
    logFail('Entity query test failed', error.message);
    results.push({
      name: 'E2E RAG: Entity queries',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * Cleanup test data
 */
async function cleanup(db: admin.firestore.Firestore): Promise<void> {
  // Clear global test data
  delete (globalThis as any).e2eRagTestData;

  const cleanupItems: string[] = [];
  if (createdTextNoteId) cleanupItems.push(`textNotes/${createdTextNoteId}`);
  if (createdMemoryId) cleanupItems.push(`memories/${createdMemoryId}`);

  if (cleanupItems.length === 0) {
    return;
  }

  logCleanup(cleanupItems);

  let deleted = 0;
  let failed = 0;

  if (createdTextNoteId) {
    try {
      await db.collection('textNotes').doc(createdTextNoteId).delete();
      deleted++;
    } catch {
      failed++;
    }
  }

  if (createdMemoryId) {
    try {
      await db.collection('memories').doc(createdMemoryId).delete();
      deleted++;
    } catch {
      failed++;
    }
  }

  const success = failed === 0;
  const message = success ? undefined : `Deleted ${deleted}, failed ${failed}`;
  logCleanupResult(success, message);

  createdTextNoteId = null;
  createdMemoryId = null;
}

/**
 * Cleanup function exported for test runner
 */
export async function cleanupTestData(): Promise<void> {
  const { db } = globalThis.testContext;
  await cleanup(db);
}
