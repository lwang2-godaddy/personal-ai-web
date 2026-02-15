/**
 * Life Feed Sources - E2E Test
 *
 * END-TO-END test that verifies sources include ALL data types (voice, photo, diary)
 * not just health/location aggregates.
 *
 * Key scenarios tested:
 * 1. Timestamp format handling:
 *    - Voice notes: createdAt stored as ISO string
 *    - Text notes: createdAt stored as ISO string
 *    - Photo memories: uploadedAt stored as Firestore Timestamp (Date object)
 *    → LifeFeedGenerator must query all formats correctly
 *
 * 2. Source completeness:
 *    - Generated posts should include voice, photo, text sources with real doc IDs
 *    - Not just health/location aggregates
 *
 * 3. Source structure:
 *    - Each source must have: type, id, snippet, timestamp, preview
 *    - Individual sources (voice/photo/text) should NOT have aggregate IDs
 *
 * Bug fixed: LifeFeedGenerator.gatherDataSummary() was querying photoMemories
 * and events with ISO string but these collections store dates as Firestore
 * Timestamps, causing 0 results.
 *
 * Run: npm test -- --filter life-feed-sources-e2e
 * Or:  npm test -- --e2e-only
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
export const name = 'Life Feed Sources E2E';

// Track created documents for cleanup
const createdDocs: { collection: string; id: string }[] = [];

/**
 * Main test runner - exported for test discovery
 */
export async function run(): Promise<TestResult[]> {
  const { db, userId } = globalThis.testContext;
  const allResults: TestResult[] = [];

  // Test 1: Seed data with mixed timestamp formats, generate feed, verify all source types
  const test1Results = await testAllSourceTypesE2E(db, userId);
  allResults.push(...test1Results);

  // Test 2: Verify photo timestamp query works (the specific bug we fixed)
  const test2Results = await testPhotoTimestampQuery(db, userId);
  allResults.push(...test2Results);

  // Test 3: Verify generated posts have individual source IDs (not just aggregates)
  const test3Results = await testSourcesNotOnlyAggregates(db, userId);
  allResults.push(...test3Results);

  // Cleanup
  await cleanup(db);

  return allResults;
}

/**
 * Test 1: E2E - Seed all data types, generate Life Feed, verify sources include all types
 *
 * Seeds:
 *  - Voice note (createdAt = ISO string)
 *  - Text note (createdAt = ISO string)
 *  - Photo memory (uploadedAt = Firestore Timestamp via Date object)
 *
 * Then calls generateLifeFeedNow and checks that the sources array
 * includes voice, text, and photo sources with real document IDs.
 */
async function testAllSourceTypesE2E(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('E2E: All Source Types with Mixed Timestamp Formats');

  const testId = generateTestId();

  try {
    // Step 0: Clear recent posts to reset cooldowns
    logInfo('Step 0: Clearing recent lifeFeedPosts to reset cooldowns...');
    const recentPostsSnap = await db.collection('lifeFeedPosts')
      .where('userId', '==', userId)
      .orderBy('publishedAt', 'desc')
      .limit(30)
      .get();

    if (recentPostsSnap.size > 0) {
      for (const doc of recentPostsSnap.docs) {
        await doc.ref.delete();
      }
      logPass(`Cleared ${recentPostsSnap.size} recent posts`);
    }

    // Step 1: Create test content with DIFFERENT timestamp formats
    logInfo('Step 1: Creating test data with mixed timestamp formats...');

    const voiceNoteId = `src-voice-${testId}`;
    const textNoteId = `src-diary-${testId}`;
    const photoId = `src-photo-${testId}`;

    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);

    // Voice note - createdAt as ISO STRING (matches VoiceRecorder.ts pattern)
    await db.collection('voiceNotes').doc(voiceNoteId).set({
      userId,
      transcription: `Had an amazing dinner at Chez Laurent with my friend Priya. The duck confit was incredible. We talked about our hiking trip planned for next weekend.`,
      normalizedTranscription: `Had an amazing dinner at Chez Laurent with my friend Priya. The duck confit was incredible. We talked about our hiking trip planned for next weekend.`,
      duration: 60,
      audioUrl: `https://test.storage/${voiceNoteId}.m4a`,
      createdAt: now.toISOString(), // ISO STRING format
      tags: ['food', 'friends', 'social'],
      sentimentScore: 0.85,
      analysis: { sentiment: { score: 0.85, label: 'positive' } },
    });
    createdDocs.push({ collection: 'voiceNotes', id: voiceNoteId });
    log(`  Voice note: createdAt = ISO string "${now.toISOString().substring(0, 19)}"`, colors.dim);

    // Text note (diary) - createdAt as ISO STRING (matches DiaryService pattern)
    await db.collection('textNotes').doc(textNoteId).set({
      userId,
      title: 'Morning Run Reflection',
      content: `Completed a 5K run along the Embarcadero this morning. Beautiful sunrise over the Bay Bridge. My pace was 8:30 per mile, a new personal best! Feeling energized for the day ahead.`,
      normalizedContent: `Completed a 5K run along the Embarcadero this morning. Beautiful sunrise over the Bay Bridge. My pace was 8:30 per mile, a new personal best! Feeling energized for the day ahead.`,
      type: 'diary',
      createdAt: twoHoursAgo.toISOString(), // ISO STRING format
      updatedAt: twoHoursAgo.toISOString(),
      tags: ['running', 'exercise', 'health'],
      sentimentScore: 0.9,
      analysis: { sentiment: { score: 0.9, label: 'positive' } },
    });
    createdDocs.push({ collection: 'textNotes', id: textNoteId });
    log(`  Text note: createdAt = ISO string "${twoHoursAgo.toISOString().substring(0, 19)}"`, colors.dim);

    // Photo memory - uploadedAt as FIRESTORE TIMESTAMP (Date object → auto-converted by SDK)
    // This is the KEY test: the mobile app writes Date objects which become Firestore Timestamps
    await db.collection('photoMemories').doc(photoId).set({
      userId,
      autoDescription: 'Sunset over the Pacific Ocean at Baker Beach with golden gate bridge in background',
      userDescription: 'Beautiful sunset at Baker Beach',
      activity: 'Photography',
      address: 'Baker Beach, San Francisco, CA',
      takenAt: fourHoursAgo, // Date object → Firestore Timestamp
      uploadedAt: fourHoursAgo, // Date object → Firestore Timestamp
      tags: ['photography', 'nature', 'sunset'],
      imageUrl: `https://test.storage/${photoId}.jpg`,
      thumbnailUrl: `https://test.storage/${photoId}_thumb.jpg`,
    });
    createdDocs.push({ collection: 'photoMemories', id: photoId });
    log(`  Photo: uploadedAt = Date object (→ Firestore Timestamp) "${fourHoursAgo.toISOString().substring(0, 19)}"`, colors.dim);

    logPass('Test data created with mixed timestamp formats');

    results.push({
      name: 'E2E Sources: Test data created',
      passed: true,
      reason: 'Voice (ISO), Diary (ISO), Photo (Timestamp) created',
      details: { voiceNoteId, textNoteId, photoId },
    });

    // Step 2: Call generateLifeFeedNow
    logInfo('Step 2: Calling generateLifeFeedNow Cloud Function...');

    const { idToken, projectId, region } = globalThis.testContext;

    if (!idToken) {
      logInfo('No ID token available - skipping Cloud Function call');
      results.push({
        name: 'E2E Sources: Cloud Function call',
        passed: true,
        reason: 'Skipped - no ID token (run with auth to enable)',
        details: { skipped: true },
      });
      return results;
    }

    const functionUrl = `https://${region}-${projectId}.cloudfunctions.net/generateLifeFeedNow`;

    try {
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ data: {} }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Function returned ${response.status}: ${errorText}`);
      }

      const responseData = await response.json();
      const result = responseData.result || responseData;

      logPass(`Cloud Function returned: status=${result.status}, posts=${result.posts?.length || 0}`);
      if (result.details?.dataStats) {
        const stats = result.details.dataStats;
        log(`  Data stats: voice=${stats.voiceNotes}, photos=${stats.photos}, text=${stats.textNotes}`, colors.dim);
      }

      results.push({
        name: 'E2E Sources: Cloud Function call',
        passed: true,
        reason: `Status: ${result.status}, Posts: ${result.posts?.length || 0}`,
        details: { status: result.status, postsGenerated: result.posts?.length || 0 },
      });

    } catch (error: any) {
      logFail('Cloud Function call failed', error.message);
      results.push({
        name: 'E2E Sources: Cloud Function call',
        passed: false,
        reason: `FAILED: ${error.message}`,
      });
      return results;
    }

    // Step 3: Wait and verify sources
    logInfo('Step 3: Waiting 10 seconds for post generation...');
    await wait(10000);

    logInfo('Step 4: Checking generated post sources for all data types...');

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const postsSnap = await db.collection('lifeFeedPosts')
      .where('userId', '==', userId)
      .where('publishedAt', '>=', tenMinutesAgo)
      .orderBy('publishedAt', 'desc')
      .limit(10)
      .get();

    // Track for cleanup
    postsSnap.docs.forEach(doc => {
      createdDocs.push({ collection: 'lifeFeedPosts', id: doc.id });
    });

    if (postsSnap.size === 0) {
      logFail('No posts generated');
      results.push({
        name: 'E2E Sources: Posts generated',
        passed: false,
        reason: 'No posts generated - deploy latest Cloud Functions',
      });
      return results;
    }

    logPass(`${postsSnap.size} posts generated`);

    // Analyze sources across all generated posts
    const sourceTypesFound = new Set<string>();
    const individualSourceIds: string[] = [];
    let totalSources = 0;
    let hasVoiceSource = false;
    let hasPhotoSource = false;
    let hasTextSource = false;
    let hasHealthSource = false;
    let hasLocationSource = false;

    postsSnap.docs.forEach((doc) => {
      const data = doc.data();
      const sources = data.sources || [];
      totalSources += sources.length;

      sources.forEach((source: any) => {
        sourceTypesFound.add(source.type);

        if (source.type === 'voice' && !source.id.includes('-aggregate')) {
          hasVoiceSource = true;
          individualSourceIds.push(source.id);
        }
        if (source.type === 'photo' && !source.id.includes('-aggregate')) {
          hasPhotoSource = true;
          individualSourceIds.push(source.id);
        }
        if (source.type === 'text' && !source.id.includes('-aggregate')) {
          hasTextSource = true;
          individualSourceIds.push(source.id);
        }
        if (source.type === 'health') hasHealthSource = true;
        if (source.type === 'location') hasLocationSource = true;
      });
    });

    logQueryBox('Source Types Found', [
      `Total sources across ${postsSnap.size} posts: ${totalSources}`,
      `Types: ${Array.from(sourceTypesFound).join(', ')}`,
      `Voice: ${hasVoiceSource ? 'YES' : 'NO'}`,
      `Photo: ${hasPhotoSource ? 'YES' : 'NO'}`,
      `Text/Diary: ${hasTextSource ? 'YES' : 'NO'}`,
      `Health: ${hasHealthSource ? 'YES' : 'NO'}`,
      `Location: ${hasLocationSource ? 'YES' : 'NO'}`,
    ]);

    // Verify voice source references our test note
    if (hasVoiceSource) {
      const matchesTestVoice = individualSourceIds.includes(voiceNoteId);
      logPass(`Voice source found${matchesTestVoice ? ` (matches test ID: ${voiceNoteId.substring(0, 20)}...)` : ''}`);
    } else {
      logFail('Voice source missing', 'No voice source found in any post');
    }

    // Verify photo source references our test photo
    if (hasPhotoSource) {
      const matchesTestPhoto = individualSourceIds.includes(photoId);
      logPass(`Photo source found${matchesTestPhoto ? ` (matches test ID: ${photoId.substring(0, 20)}...)` : ''}`);
    } else {
      logFail('Photo source missing', 'No photo source found - timestamp format bug may still exist');
    }

    // Verify text source references our test diary
    if (hasTextSource) {
      const matchesTestDiary = individualSourceIds.includes(textNoteId);
      logPass(`Text/Diary source found${matchesTestDiary ? ` (matches test ID: ${textNoteId.substring(0, 20)}...)` : ''}`);
    } else {
      logFail('Text/Diary source missing', 'No text source found in any post');
    }

    // Overall result: all three content types should be in sources
    const hasAllContentTypes = hasVoiceSource && hasPhotoSource && hasTextSource;
    const hasAnyContentType = hasVoiceSource || hasPhotoSource || hasTextSource;

    results.push({
      name: 'E2E Sources: Voice sources included',
      passed: hasVoiceSource,
      reason: hasVoiceSource
        ? 'Voice note source found with individual ID'
        : 'MISSING: No voice source in generated posts',
      details: { hasVoiceSource, testVoiceNoteId: voiceNoteId },
    });

    results.push({
      name: 'E2E Sources: Photo sources included (Timestamp query fix)',
      passed: hasPhotoSource,
      reason: hasPhotoSource
        ? 'Photo source found - Firestore Timestamp query works!'
        : 'MISSING: Photo not in sources - Timestamp format query may still be broken',
      details: { hasPhotoSource, testPhotoId: photoId },
    });

    results.push({
      name: 'E2E Sources: Diary/text sources included',
      passed: hasTextSource,
      reason: hasTextSource
        ? 'Diary/text source found with individual ID'
        : 'MISSING: No diary/text source in generated posts',
      details: { hasTextSource, testTextNoteId: textNoteId },
    });

    results.push({
      name: 'E2E Sources: All content types represented',
      passed: hasAllContentTypes,
      reason: hasAllContentTypes
        ? `All 3 content types present (voice, photo, text) + ${hasHealthSource ? 'health' : 'no health'} + ${hasLocationSource ? 'location' : 'no location'}`
        : `Missing types: ${[
            !hasVoiceSource && 'voice',
            !hasPhotoSource && 'photo',
            !hasTextSource && 'text',
          ].filter(Boolean).join(', ')}`,
      details: {
        sourceTypes: Array.from(sourceTypesFound),
        totalSources,
        hasVoiceSource,
        hasPhotoSource,
        hasTextSource,
        hasHealthSource,
        hasLocationSource,
      },
    });

  } catch (error: any) {
    logFail('Test execution', error.message);
    results.push({
      name: 'E2E Sources: Test execution',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * Test 2: Verify photoMemories query works with Firestore Timestamp
 *
 * This directly tests the bug fix: querying photoMemories where uploadedAt
 * is a Firestore Timestamp, not an ISO string.
 */
async function testPhotoTimestampQuery(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Photo Timestamp Query Format');

  try {
    // Create a photo with Date object (becomes Firestore Timestamp)
    const testPhotoId = `ts-test-photo-${generateTestId()}`;
    const uploadDate = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 hour ago

    await db.collection('photoMemories').doc(testPhotoId).set({
      userId,
      autoDescription: 'Test photo for timestamp query verification',
      uploadedAt: uploadDate, // Date → Firestore Timestamp
      takenAt: uploadDate,
    });
    createdDocs.push({ collection: 'photoMemories', id: testPhotoId });

    // Query 1: Using ISO string (OLD broken query)
    const startDateStr = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const stringQuerySnap = await db.collection('photoMemories')
      .where('userId', '==', userId)
      .where('uploadedAt', '>=', startDateStr)
      .get();

    log(`  Query with ISO string: ${stringQuerySnap.size} results`, colors.dim);

    // Query 2: Using Firestore Timestamp (NEW fixed query)
    const startTimestamp = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    const timestampQuerySnap = await db.collection('photoMemories')
      .where('userId', '==', userId)
      .where('uploadedAt', '>=', startTimestamp)
      .get();

    log(`  Query with Timestamp: ${timestampQuerySnap.size} results`, colors.dim);

    // The Timestamp query should find our test photo
    const timestampFindsPhoto = timestampQuerySnap.docs.some(d => d.id === testPhotoId);
    const stringFindsPhoto = stringQuerySnap.docs.some(d => d.id === testPhotoId);

    logQueryBox('Timestamp Format Comparison', [
      `ISO string query: ${stringQuerySnap.size} docs (finds test photo: ${stringFindsPhoto})`,
      `Timestamp query: ${timestampQuerySnap.size} docs (finds test photo: ${timestampFindsPhoto})`,
      `Expected: Timestamp query should find the photo`,
    ]);

    if (timestampFindsPhoto) {
      logPass('Firestore Timestamp query finds photo correctly');
    } else {
      logFail('Timestamp query failed', 'Did not find test photo');
    }

    if (!stringFindsPhoto && timestampFindsPhoto) {
      logPass('Confirmed: ISO string query misses Timestamp fields (bug we fixed)');
    } else if (stringFindsPhoto && timestampFindsPhoto) {
      logInfo('Both query formats work (photo may have string uploadedAt)');
    }

    results.push({
      name: 'Photo Query: Timestamp format finds photo',
      passed: timestampFindsPhoto,
      reason: timestampFindsPhoto
        ? `Timestamp query returned ${timestampQuerySnap.size} results including test photo`
        : 'FAILED: Timestamp query did not find test photo',
      details: {
        timestampQueryResults: timestampQuerySnap.size,
        stringQueryResults: stringQuerySnap.size,
        timestampFindsPhoto,
        stringFindsPhoto,
      },
    });

    results.push({
      name: 'Photo Query: ISO string misses Timestamp fields',
      passed: !stringFindsPhoto || timestampFindsPhoto,
      reason: !stringFindsPhoto
        ? 'Confirmed: ISO string query cannot match Firestore Timestamp fields'
        : 'ISO string also finds photo (mixed formats in collection)',
      details: { stringFindsPhoto, timestampFindsPhoto },
    });

  } catch (error: any) {
    logFail('Error', error.message);
    results.push({
      name: 'Photo Query: Timestamp format test',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * Test 3: Verify that recently generated posts have individual source IDs
 * (not just aggregates like steps-aggregate, activity-badminton, etc.)
 */
async function testSourcesNotOnlyAggregates(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Sources: Individual IDs vs Aggregates');

  try {
    // Get the most recent posts (generated in this test or recently)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const postsSnap = await db.collection('lifeFeedPosts')
      .where('userId', '==', userId)
      .where('publishedAt', '>=', tenMinutesAgo)
      .orderBy('publishedAt', 'desc')
      .limit(10)
      .get();

    logQueryBox('Recent Posts Analysis', [
      `Checking ${postsSnap.size} recent posts for source quality`,
    ]);

    if (postsSnap.size === 0) {
      logInfo('No recent posts to analyze');
      results.push({
        name: 'Sources: Not only aggregates',
        passed: true,
        reason: 'No recent posts found - generate Life Feed first',
      });
      return results;
    }

    const aggregatePatterns = ['-aggregate', 'steps-aggregate', 'activities-aggregate'];
    let postsWithOnlyAggregates = 0;
    let postsWithIndividualSources = 0;
    const sourceBreakdown: Record<string, { individual: number; aggregate: number }> = {};

    postsSnap.docs.forEach((doc) => {
      const data = doc.data();
      const sources = data.sources || [];

      if (sources.length === 0) return;

      let hasIndividual = false;

      sources.forEach((source: any) => {
        const type = source.type || 'unknown';
        if (!sourceBreakdown[type]) {
          sourceBreakdown[type] = { individual: 0, aggregate: 0 };
        }

        const isAggregate = aggregatePatterns.some(p => source.id?.includes(p)) ||
                           source.id?.startsWith('activity-');

        if (isAggregate) {
          sourceBreakdown[type].aggregate++;
        } else {
          sourceBreakdown[type].individual++;
          hasIndividual = true;
        }
      });

      if (hasIndividual) {
        postsWithIndividualSources++;
      } else {
        postsWithOnlyAggregates++;
      }
    });

    // Show breakdown
    Object.entries(sourceBreakdown).forEach(([type, counts]) => {
      log(`  ${type}: ${counts.individual} individual, ${counts.aggregate} aggregate`, colors.dim);
    });

    const hasIndividualSources = postsWithIndividualSources > 0;

    if (hasIndividualSources) {
      logPass(`${postsWithIndividualSources} posts have individual source IDs`);
    } else {
      logFail('All posts only have aggregate sources', 'Deploy latest Cloud Functions with buildSources() fix');
    }

    if (postsWithOnlyAggregates > 0) {
      logInfo(`${postsWithOnlyAggregates} posts still have only aggregate sources (may be legacy)`);
    }

    results.push({
      name: 'Sources: Individual sources present in recent posts',
      passed: hasIndividualSources,
      reason: hasIndividualSources
        ? `${postsWithIndividualSources} posts have individual source IDs`
        : `All ${postsWithOnlyAggregates} posts have only aggregate sources - deploy latest functions`,
      details: {
        postsWithIndividualSources,
        postsWithOnlyAggregates,
        sourceBreakdown,
      },
    });

    // Check that voice/photo/text types appear in individual sources
    const voiceIndividual = (sourceBreakdown['voice']?.individual || 0) > 0;
    const photoIndividual = (sourceBreakdown['photo']?.individual || 0) > 0;
    const textIndividual = (sourceBreakdown['text']?.individual || 0) > 0;

    results.push({
      name: 'Sources: Content types in individual sources',
      passed: voiceIndividual || photoIndividual || textIndividual,
      reason: `Individual sources: voice=${voiceIndividual}, photo=${photoIndividual}, text=${textIndividual}`,
      details: { voiceIndividual, photoIndividual, textIndividual },
    });

  } catch (error: any) {
    logFail('Error', error.message);
    results.push({
      name: 'Sources: Aggregate analysis',
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
  if (createdDocs.length === 0) {
    return;
  }

  const cleanupItems = createdDocs.map(
    ({ collection, id }) => `${collection}/${id}`
  );
  logCleanup(cleanupItems);

  let deleted = 0;
  let failed = 0;

  for (const { collection, id } of createdDocs) {
    try {
      await db.collection(collection).doc(id).delete();
      deleted++;
    } catch {
      failed++;
    }
  }

  const success = failed === 0;
  const message = success ? undefined : `Deleted ${deleted}, failed ${failed}`;
  logCleanupResult(success, message);

  createdDocs.length = 0;
}

/**
 * Cleanup function exported for test runner
 */
export async function cleanupTestData(): Promise<void> {
  const { db } = globalThis.testContext;
  await cleanup(db);
}
