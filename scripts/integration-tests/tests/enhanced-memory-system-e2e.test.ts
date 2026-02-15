/**
 * Enhanced Memory System - End-to-End Tests
 *
 * COMPREHENSIVE E2E test that verifies the full Enhanced Memory pipeline:
 * 1. Creates text notes that trigger Cloud Functions
 * 2. Verifies memories are created from text notes
 * 3. Verifies enhanced entity extraction (9 entity types)
 * 4. Verifies denormalized fields (activities, emotions, peopleNames, placeNames)
 * 5. Verifies sentiment analysis
 *
 * This test requires:
 * - Cloud Functions deployed with MemoryGeneratorService
 * - EnhancedEntityExtractionService enabled in config/memoryBuilderSettings
 * - OpenAI API key configured
 *
 * Run: npm test -- --filter enhanced-memory-system-e2e
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
export const name = 'Enhanced Memory System E2E';

// Track created documents for cleanup
const createdTextNotes: string[] = [];
const createdMemories: string[] = [];

// Test data with rich, identifiable content
const TEST_CONTENT = {
  // Memory 1: Sports activity with people and places
  sportNote: {
    title: 'Badminton Session',
    content: `Had an amazing badminton session with Marcus Chen and Sarah Williams at Sunnyvale Badminton Club this morning. We played doubles for three hours. I felt really excited because my backhand has improved so much lately. Marcus was impressed with my cross-court shots.`,
    expectedPeople: ['Marcus Chen', 'Sarah Williams'],
    expectedPlaces: ['Sunnyvale Badminton Club'],
    expectedActivities: ['badminton'],
    expectedEmotions: ['excited'],
  },
  // Memory 2: Work meeting with organization
  workNote: {
    title: 'Work Meeting',
    content: `Had a tense meeting with Jennifer Rodriguez and Mike Thompson at Google Campus Building 1900. The quarterly review meeting at Google was stressful. We discussed the upcoming product launch deadlines. Feeling stressed about the tight timeline but hopeful we can deliver.`,
    expectedPeople: ['Jennifer Rodriguez', 'Mike Thompson'],
    expectedPlaces: ['Google Campus'],
    expectedActivities: ['meeting'],
    expectedEmotions: ['stressed'],
    expectedOrganizations: ['Google'],
  },
};

/**
 * Main test runner - exported for test discovery
 */
export async function run(): Promise<TestResult[]> {
  const { db, userId, waitTimeMs } = globalThis.testContext;
  const allResults: TestResult[] = [];

  // Test 1: Create text notes to trigger Cloud Functions
  const createResults = await testCreateTextNotes(db, userId);
  allResults.push(...createResults);

  // If creation failed, skip remaining tests
  if (createResults.some(r => !r.passed)) {
    return allResults;
  }

  // Wait for Cloud Function processing (longer wait for memory creation)
  const extendedWait = Math.max(waitTimeMs, 25000);
  logInfo(`Waiting ${extendedWait / 1000}s for Cloud Function processing...`);
  await wait(extendedWait);

  // Test 2: Verify memories were created from text notes
  const memoryResults = await testMemoriesCreated(db, userId);
  allResults.push(...memoryResults);

  // Test 3: Verify enhanced entity extraction
  const extractionResults = await testEnhancedEntityExtraction(db, userId);
  allResults.push(...extractionResults);

  // Test 4: Verify denormalized fields (activities, emotions, etc.)
  const denormalizedResults = await testDenormalizedFields(db, userId);
  allResults.push(...denormalizedResults);

  // Test 5: Verify sentiment analysis
  const sentimentResults = await testSentimentAnalysis(db, userId);
  allResults.push(...sentimentResults);

  // Cleanup
  await cleanup(db);

  return allResults;
}

/**
 * Test 1: Create text notes to trigger Cloud Functions
 */
async function testCreateTextNotes(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('E2E: Create Text Notes to Trigger Memory Creation');

  const testId = generateTestId();

  try {
    // Create text note 1: Sports
    const sportNoteId = `e2e-sport-${testId}`;
    await db.collection('textNotes').doc(sportNoteId).set({
      userId,
      title: TEST_CONTENT.sportNote.title,
      content: TEST_CONTENT.sportNote.content,
      tags: ['badminton', 'exercise'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      location: null,
      embeddingId: null,
    });
    createdTextNotes.push(sportNoteId);
    logInfo(`Created text note: ${sportNoteId}`);

    // Create text note 2: Work
    const workNoteId = `e2e-work-${testId}`;
    await db.collection('textNotes').doc(workNoteId).set({
      userId,
      title: TEST_CONTENT.workNote.title,
      content: TEST_CONTENT.workNote.content,
      tags: ['work', 'meeting'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      location: null,
      embeddingId: null,
    });
    createdTextNotes.push(workNoteId);
    logInfo(`Created text note: ${workNoteId}`);

    logPass(`Created ${createdTextNotes.length} text notes`);

    results.push({
      name: 'E2E: Text notes created',
      passed: true,
      reason: `${createdTextNotes.length} text notes created to trigger Cloud Functions`,
      details: { noteIds: createdTextNotes, testId },
    });

  } catch (error: any) {
    logFail('Text note creation failed', error.message);
    results.push({
      name: 'E2E: Text notes creation',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * Test 2: Verify memories were created from text notes
 */
async function testMemoriesCreated(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('E2E: Verify Memories Created from Text Notes');

  try {
    let memoriesFound = 0;
    const memoryDetails: { noteId: string; memoryId: string; title: string }[] = [];

    for (const noteId of createdTextNotes) {
      // Check if memory was created with this sourceId
      const memoriesSnap = await db.collection('memories')
        .where('userId', '==', userId)
        .where('sourceId', '==', noteId)
        .where('sourceType', '==', 'text')
        .limit(1)
        .get();

      if (!memoriesSnap.empty) {
        const memoryDoc = memoriesSnap.docs[0];
        createdMemories.push(memoryDoc.id);
        memoriesFound++;
        memoryDetails.push({
          noteId,
          memoryId: memoryDoc.id,
          title: memoryDoc.data().title || 'Untitled',
        });
        logInfo(`Found memory for ${noteId}: ${memoryDoc.id}`);
      } else {
        logFail(`Memory creation for ${noteId}`, 'No memory document found');

        // Check for embeddingError on text note
        const noteDoc = await db.collection('textNotes').doc(noteId).get();
        const noteData = noteDoc.data();
        if (noteData?.embeddingError) {
          logInfo(`  Error: ${noteData.embeddingError}`);
        }
      }
    }

    logQueryBox('Memory Creation Results', [
      `Created: ${memoriesFound}/${createdTextNotes.length} memories`,
      ...memoryDetails.map(m => `${m.noteId} → ${m.memoryId}`),
    ]);

    const allCreated = memoriesFound === createdTextNotes.length;

    if (allCreated) {
      logPass(`All ${memoriesFound} memories created successfully`);
    } else {
      logFail('Memory creation incomplete', `Only ${memoriesFound}/${createdTextNotes.length} memories created`);
    }

    results.push({
      name: 'E2E: Memories created from text notes',
      passed: allCreated,
      reason: allCreated
        ? `All ${memoriesFound} memories created`
        : `Only ${memoriesFound}/${createdTextNotes.length} memories created - Cloud Function may have failed`,
      details: { memoriesFound, total: createdTextNotes.length, memoryDetails },
    });

  } catch (error: any) {
    logFail('Memory verification failed', error.message);
    results.push({
      name: 'E2E: Memory creation verification',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * Test 3: Verify enhanced entity extraction
 */
async function testEnhancedEntityExtraction(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('E2E: Verify Enhanced Entity Extraction');

  // Skip if no memories were created
  if (createdMemories.length === 0) {
    logInfo('Skipping - no memories to check');
    results.push({
      name: 'E2E: Enhanced entity extraction',
      passed: false,
      reason: 'No memories created - cannot verify entity extraction',
    });
    return results;
  }

  try {
    let memoriesWithEntities = 0;
    let totalEntities = 0;
    const entityTypesCounts: Record<string, number> = {};

    for (const memoryId of createdMemories) {
      const memoryDoc = await db.collection('memories').doc(memoryId).get();
      const data = memoryDoc.data();

      if (data?.enhancedEntities && data.enhancedEntities.length > 0) {
        memoriesWithEntities++;
        totalEntities += data.enhancedEntities.length;

        data.enhancedEntities.forEach((entity: any) => {
          entityTypesCounts[entity.type] = (entityTypesCounts[entity.type] || 0) + 1;
        });

        logInfo(`Memory ${memoryId}: ${data.enhancedEntities.length} entities`);
      }
    }

    logQueryBox('Enhanced Entity Extraction', [
      `Memories with entities: ${memoriesWithEntities}/${createdMemories.length}`,
      `Total entities: ${totalEntities}`,
      ...Object.entries(entityTypesCounts).map(([type, count]) => `${type}: ${count}`),
    ]);

    // Check for expected entity types
    const expectedTypes = ['person', 'place', 'activity', 'emotion'];
    const foundTypes = Object.keys(entityTypesCounts);
    const missingTypes = expectedTypes.filter(t => !foundTypes.includes(t));

    const hasEntities = memoriesWithEntities > 0 && totalEntities > 0;

    if (hasEntities) {
      logPass(`Found ${totalEntities} entities across ${memoriesWithEntities} memories`);
      if (missingTypes.length > 0) {
        logInfo(`Missing entity types: ${missingTypes.join(', ')}`);
      }
    } else {
      logFail('Enhanced entity extraction', 'No enhanced entities found');
      logInfo('Check if:');
      logInfo('  - EnhancedEntityExtractionService is enabled in config/memoryBuilderSettings');
      logInfo('  - Cloud Functions are deployed with latest code');
    }

    results.push({
      name: 'E2E: Enhanced entity extraction',
      passed: hasEntities,
      reason: hasEntities
        ? `${totalEntities} entities extracted from ${memoriesWithEntities} memories`
        : 'No enhanced entities found - EnhancedEntityExtractionService may not be enabled',
      details: { entityTypesCounts, foundTypes, missingTypes, totalEntities },
    });

  } catch (error: any) {
    logFail('Entity extraction verification failed', error.message);
    results.push({
      name: 'E2E: Enhanced entity extraction',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * Test 4: Verify denormalized fields (activities, emotions, peopleNames, placeNames)
 */
async function testDenormalizedFields(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('E2E: Verify Denormalized Entity Fields');

  // Skip if no memories were created
  if (createdMemories.length === 0) {
    logInfo('Skipping - no memories to check');
    results.push({
      name: 'E2E: Denormalized fields',
      passed: false,
      reason: 'No memories created - cannot verify denormalized fields',
    });
    return results;
  }

  try {
    const fieldCounts = {
      activities: 0,
      emotions: 0,
      peopleNames: 0,
      placeNames: 0,
    };

    const allValues: Record<string, Set<string>> = {
      activities: new Set(),
      emotions: new Set(),
      peopleNames: new Set(),
      placeNames: new Set(),
    };

    for (const memoryId of createdMemories) {
      const memoryDoc = await db.collection('memories').doc(memoryId).get();
      const data = memoryDoc.data();

      if (data && data.activities?.length > 0) {
        fieldCounts.activities += data.activities.length;
        data.activities.forEach((v: string) => allValues.activities.add(v));
      }
      if (data && data.emotions?.length > 0) {
        fieldCounts.emotions += data.emotions.length;
        data.emotions.forEach((v: string) => allValues.emotions.add(v));
      }
      if (data && data.peopleNames?.length > 0) {
        fieldCounts.peopleNames += data.peopleNames.length;
        data.peopleNames.forEach((v: string) => allValues.peopleNames.add(v));
      }
      if (data && data.placeNames?.length > 0) {
        fieldCounts.placeNames += data.placeNames.length;
        data.placeNames.forEach((v: string) => allValues.placeNames.add(v));
      }
    }

    logQueryBox('Denormalized Fields', [
      `activities: ${fieldCounts.activities} (${Array.from(allValues.activities).slice(0, 3).join(', ')})`,
      `emotions: ${fieldCounts.emotions} (${Array.from(allValues.emotions).slice(0, 3).join(', ')})`,
      `peopleNames: ${fieldCounts.peopleNames} (${Array.from(allValues.peopleNames).slice(0, 3).join(', ')})`,
      `placeNames: ${fieldCounts.placeNames} (${Array.from(allValues.placeNames).slice(0, 3).join(', ')})`,
    ]);

    const totalFields = Object.values(fieldCounts).reduce((a, b) => a + b, 0);
    const hasFields = totalFields > 0;

    // Check for expected values from our test content
    const expectedActivities = ['badminton', 'meeting'];
    const foundActivities = expectedActivities.filter(a =>
      Array.from(allValues.activities).some(v => v.toLowerCase().includes(a))
    );

    if (hasFields) {
      logPass(`Found ${totalFields} denormalized field values`);
      logInfo(`Expected activities found: ${foundActivities.join(', ') || 'none'}`);
    } else {
      logFail('Denormalized fields', 'No denormalized fields populated');
      logInfo('Check if EnhancedEntityExtractionService is setting these fields');
    }

    results.push({
      name: 'E2E: Denormalized fields populated',
      passed: hasFields,
      reason: hasFields
        ? `${totalFields} field values found across activities, emotions, people, places`
        : 'No denormalized fields - enhanced extraction may not be enabled',
      details: { fieldCounts, foundActivities, allValues: Object.fromEntries(
        Object.entries(allValues).map(([k, v]) => [k, Array.from(v)])
      )},
    });

  } catch (error: any) {
    logFail('Denormalized fields verification failed', error.message);
    results.push({
      name: 'E2E: Denormalized fields',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * Test 5: Verify sentiment analysis
 */
async function testSentimentAnalysis(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('E2E: Verify Sentiment Analysis');

  // Skip if no memories were created
  if (createdMemories.length === 0) {
    logInfo('Skipping - no memories to check');
    results.push({
      name: 'E2E: Sentiment analysis',
      passed: false,
      reason: 'No memories created - cannot verify sentiment',
    });
    return results;
  }

  try {
    let memoriesWithSentiment = 0;
    const sentimentData: { memoryId: string; label: string; score: number }[] = [];

    for (const memoryId of createdMemories) {
      const memoryDoc = await db.collection('memories').doc(memoryId).get();
      const data = memoryDoc.data();

      if (data?.sentiment) {
        memoriesWithSentiment++;
        sentimentData.push({
          memoryId,
          label: data.sentiment.label,
          score: data.sentiment.score,
        });
      }
    }

    logQueryBox('Sentiment Analysis', [
      `Memories with sentiment: ${memoriesWithSentiment}/${createdMemories.length}`,
      ...sentimentData.map(s => `${s.memoryId}: ${s.label} (${s.score.toFixed(2)})`),
    ]);

    const hasSentiment = memoriesWithSentiment > 0;

    if (hasSentiment) {
      // Validate sentiment scores are in range
      const validScores = sentimentData.every(s => s.score >= -1 && s.score <= 1);
      const validLabels = sentimentData.every(s =>
        ['positive', 'negative', 'neutral'].includes(s.label)
      );

      if (validScores && validLabels) {
        logPass(`Sentiment analysis working for ${memoriesWithSentiment} memories`);
      } else {
        logFail('Sentiment validation', 'Invalid sentiment values detected');
      }

      results.push({
        name: 'E2E: Sentiment analysis',
        passed: validScores && validLabels,
        reason: validScores && validLabels
          ? `Valid sentiment for ${memoriesWithSentiment} memories`
          : 'Invalid sentiment values',
        details: { sentimentData, validScores, validLabels },
      });
    } else {
      logFail('Sentiment analysis', 'No sentiment data found');
      logInfo('Sentiment may not be enabled in enhanced extraction');

      results.push({
        name: 'E2E: Sentiment analysis',
        passed: false,
        reason: 'No sentiment data found in memories',
        details: { memoriesWithSentiment: 0 },
      });
    }

  } catch (error: any) {
    logFail('Sentiment verification failed', error.message);
    results.push({
      name: 'E2E: Sentiment analysis',
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
  const cleanupItems: string[] = [];

  // Add text notes
  createdTextNotes.forEach(id => cleanupItems.push(`textNotes/${id}`));
  // Add memories
  createdMemories.forEach(id => cleanupItems.push(`memories/${id}`));

  if (cleanupItems.length === 0) {
    return;
  }

  logCleanup(cleanupItems);

  let deleted = 0;
  let failed = 0;

  // Delete text notes
  for (const noteId of createdTextNotes) {
    try {
      await db.collection('textNotes').doc(noteId).delete();
      deleted++;
    } catch {
      failed++;
    }
  }

  // Delete memories
  for (const memoryId of createdMemories) {
    try {
      await db.collection('memories').doc(memoryId).delete();
      deleted++;
    } catch {
      failed++;
    }
  }

  const success = failed === 0;
  const message = success ? undefined : `Deleted ${deleted}, failed ${failed}`;
  logCleanupResult(success, message);

  // Clear arrays
  createdTextNotes.length = 0;
  createdMemories.length = 0;
}

/**
 * Cleanup function exported for test runner
 */
export async function cleanupTestData(): Promise<void> {
  const { db } = globalThis.testContext;
  await cleanup(db);
}
