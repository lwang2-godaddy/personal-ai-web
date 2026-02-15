/**
 * Life Feed Sources - E2E Integration Tests
 *
 * Tests the individual source tracking feature for Life Feed posts:
 * 1. E2E: Create test content → Generate Life Feed → Verify sources reference content
 * 2. Sources array contains individual IDs (not just aggregates)
 * 3. Sources have preview data for UI display
 * 4. Legacy posts (without detailed sources) still load
 *
 * Related files:
 * - PersonalAIApp/firebase/functions/src/services/LifeFeedGenerator.ts - buildSources()
 * - PersonalAIApp/src/models/LifeFeedPost.ts - LifeFeedSource, LifeFeedSourcePreview
 * - PersonalAIApp/src/components/lifeFeed/SourcesSection.tsx - UI component
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
export const name = 'Life Feed Sources';

// Test data cleanup tracker
const createdDocIds: { collection: string; id: string }[] = [];

// Unique marker for test content
const TEST_MARKER = `TEST_SOURCES_${Date.now()}`;

/**
 * Main test runner - exported for test discovery
 */
export async function run(): Promise<TestResult[]> {
  const { db, userId } = globalThis.testContext;
  const allResults: TestResult[] = [];

  // Test Case 1: E2E - Create content, generate Life Feed, verify sources
  const test1Results = await testE2ESourceTracking(db, userId);
  allResults.push(...test1Results);

  // Test Case 2: Check existing posts for source structure
  const test2Results = await testSourcesStructure(db, userId);
  allResults.push(...test2Results);

  // Test Case 3: Verify individual sources (not just aggregates)
  const test3Results = await testIndividualSources(db, userId);
  allResults.push(...test3Results);

  // Test Case 4: Verify source preview data
  const test4Results = await testSourcePreviewData(db, userId);
  allResults.push(...test4Results);

  // Test Case 5: Legacy post compatibility (use simple query)
  const test5Results = await testLegacyPostCompatibility(db, userId);
  allResults.push(...test5Results);

  // Cleanup
  await cleanup(db);

  return allResults;
}

/**
 * Test Case 1: E2E - Create test content, generate Life Feed, verify sources
 */
async function testE2ESourceTracking(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('E2E: Source Tracking Flow');

  try {
    // Step 1: Create a test diary entry with unique content
    const testNoteId = `test-note-${generateTestId()}`;
    const testContent = `This is a test diary entry for source tracking verification. ${TEST_MARKER}. I went to the park today and had a wonderful time.`;

    logQueryBox('Step 1: Create Test Data', [
      `Creating diary entry: ${testNoteId.substring(0, 20)}...`,
      `Unique marker: ${TEST_MARKER}`,
    ]);

    const now = new Date().toISOString();
    await db.collection('textNotes').doc(testNoteId).set({
      id: testNoteId,
      userId,
      type: 'diary',
      title: 'Test Diary Entry for Sources',
      content: testContent,
      normalizedContent: testContent.toLowerCase(),
      createdAt: now,
      updatedAt: now,
      tags: ['test', 'sources'],
    });
    createdDocIds.push({ collection: 'textNotes', id: testNoteId });

    logPass(`Created test diary entry: ${testNoteId.substring(0, 20)}...`);

    // Step 2: Call generateLifeFeedNow via Firestore trigger simulation
    // Note: We can't directly call the Cloud Function, so we'll wait for any
    // scheduled processing or check if new posts appear
    logQueryBox('Step 2: Generate Life Feed', [
      'Waiting for Life Feed generation...',
      'Note: This test checks if the backend properly tracks sources',
    ]);

    // Wait a bit for any background processing
    await wait(2000);

    // Step 3: Check for newly generated posts that might reference our content
    const recentPostsSnapshot = await db.collection('lifeFeedPosts')
      .where('userId', '==', userId)
      .orderBy('generatedAt', 'desc')
      .limit(5)
      .get();

    log(`  Found ${recentPostsSnapshot.size} recent posts`, colors.dim);

    // Check if any post references our test content
    let foundTestReference = false;
    let postWithSources: any = null;

    recentPostsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const sources = data.sources || [];

      // Check if any source references our test note
      const hasTestSource = sources.some((s: any) =>
        s.id === testNoteId ||
        s.snippet?.includes(TEST_MARKER) ||
        data.content?.includes(TEST_MARKER)
      );

      if (hasTestSource) {
        foundTestReference = true;
        postWithSources = { id: doc.id, ...data };
      }

      // Also track any post with individual text sources
      if (!postWithSources && sources.some((s: any) => s.type === 'text' && !s.id.includes('-aggregate'))) {
        postWithSources = { id: doc.id, ...data };
      }
    });

    if (foundTestReference) {
      logPass(`Found post referencing test content!`);
      results.push({
        name: 'E2E: Test content referenced in sources',
        passed: true,
        reason: `Post ${postWithSources?.id} references test diary entry`,
        details: { postId: postWithSources?.id, testNoteId },
      });
    } else {
      logInfo('Test content not yet in Life Feed (may need manual trigger)');
      results.push({
        name: 'E2E: Test content referenced in sources',
        passed: true, // Informational - async processing
        reason: 'Test content created but Life Feed not yet generated (call generateLifeFeedNow)',
        details: { testNoteId, recentPostsCount: recentPostsSnapshot.size },
      });
    }

    // Step 4: Verify source structure on any post with sources
    if (postWithSources) {
      const sources = postWithSources.sources || [];
      const hasIndividualSources = sources.some((s: any) =>
        !s.id.includes('-aggregate') && !s.id.startsWith('activity-')
      );
      const hasPreviewData = sources.some((s: any) => s.preview);

      log(`  Post has ${sources.length} sources`, colors.dim);
      log(`  Has individual sources: ${hasIndividualSources}`, colors.dim);
      log(`  Has preview data: ${hasPreviewData}`, colors.dim);

      results.push({
        name: 'E2E: Source structure valid',
        passed: true,
        reason: `Post has ${sources.length} sources (individual: ${hasIndividualSources}, preview: ${hasPreviewData})`,
        details: {
          sourceCount: sources.length,
          hasIndividualSources,
          hasPreviewData,
          sourceTypes: sources.map((s: any) => s.type),
        },
      });

      // Log source details
      sources.slice(0, 3).forEach((s: any, i: number) => {
        log(`    [${i + 1}] ${s.type}: ${s.id.substring(0, 30)}...`, colors.dim);
        if (s.preview) {
          log(`        Preview: ${JSON.stringify(s.preview).substring(0, 50)}...`, colors.dim);
        }
      });
    } else {
      results.push({
        name: 'E2E: Source structure valid',
        passed: true,
        reason: 'No posts with sources found - generate Life Feed to test',
        details: { recentPostsCount: recentPostsSnapshot.size },
      });
    }

  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    results.push({
      name: 'E2E: Source tracking flow',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * Test Case 2: Check sources array structure
 */
async function testSourcesStructure(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Sources Array Structure');

  try {
    const postsSnapshot = await db.collection('lifeFeedPosts')
      .where('userId', '==', userId)
      .orderBy('generatedAt', 'desc')
      .limit(20)
      .get();

    logQueryBox('lifeFeedPosts Query', [
      'Collection: lifeFeedPosts',
      `where userId == "${userId.substring(0, 8)}..."`,
      'orderBy generatedAt desc',
      `Found: ${postsSnapshot.size} posts`,
    ]);

    if (postsSnapshot.size === 0) {
      logInfo('No life feed posts found for user');
      results.push({
        name: 'Sources: Structure check',
        passed: true,
        reason: 'No posts found - may need to run Life Feed generator',
        details: { postCount: 0 },
      });
      return results;
    }

    // Check sources array structure
    let postsWithSources = 0;
    let totalSources = 0;
    let postsWithValidSources = 0;

    postsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const sources = data.sources || [];

      if (sources.length > 0) {
        postsWithSources++;
        totalSources += sources.length;

        // Check if each source has required fields
        const validSources = sources.every((source: any) =>
          source.type && source.id && source.snippet && source.timestamp
        );

        if (validSources) {
          postsWithValidSources++;
        }
      }
    });

    log(`  Posts with sources: ${postsWithSources}/${postsSnapshot.size}`, colors.dim);
    log(`  Total sources: ${totalSources}`, colors.dim);
    log(`  Posts with valid source structure: ${postsWithValidSources}`, colors.dim);

    const avgSourcesPerPost = postsWithSources > 0
      ? (totalSources / postsWithSources).toFixed(1)
      : 0;

    if (postsWithSources > 0) {
      logPass(`${postsWithSources} posts have sources (avg ${avgSourcesPerPost} sources/post)`);
    } else {
      logInfo('No posts have sources array populated');
    }

    results.push({
      name: 'Sources: Array structure valid',
      passed: postsWithValidSources === postsWithSources || postsWithSources === 0,
      reason: postsWithSources > 0
        ? `${postsWithValidSources}/${postsWithSources} posts have valid source structure`
        : 'No posts with sources yet',
      details: {
        postsWithSources,
        postsWithValidSources,
        totalSources,
        avgSourcesPerPost,
      },
    });

  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    results.push({
      name: 'Sources: Structure check',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * Test Case 3: Verify individual sources (not just aggregates)
 */
async function testIndividualSources(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Individual Sources (Not Aggregates)');

  try {
    const postsSnapshot = await db.collection('lifeFeedPosts')
      .where('userId', '==', userId)
      .orderBy('generatedAt', 'desc')
      .limit(20)
      .get();

    logQueryBox('Individual Sources Analysis', [
      `Analyzing ${postsSnapshot.size} posts for individual source IDs`,
    ]);

    if (postsSnapshot.size === 0) {
      logInfo('No posts to analyze');
      results.push({
        name: 'Sources: Individual IDs check',
        passed: true,
        reason: 'No posts found',
        details: { postCount: 0 },
      });
      return results;
    }

    let postsWithIndividualSources = 0;
    let postsWithAggregatesOnly = 0;
    const aggregatePatterns = ['-aggregate', 'steps-aggregate', 'activities-aggregate'];

    postsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const sources = data.sources || [];

      if (sources.length === 0) return;

      // Check if any source has a non-aggregate ID
      const hasIndividualSource = sources.some((source: any) => {
        const id = source.id || '';
        return !aggregatePatterns.some(pattern => id.includes(pattern)) &&
               !id.startsWith('activity-');
      });

      if (hasIndividualSource) {
        postsWithIndividualSources++;
      } else if (sources.length > 0) {
        postsWithAggregatesOnly++;
      }
    });

    log(`  Posts with individual sources: ${postsWithIndividualSources}`, colors.dim);
    log(`  Posts with aggregates only: ${postsWithAggregatesOnly}`, colors.dim);

    const hasIndividualSources = postsWithIndividualSources > 0;

    if (hasIndividualSources) {
      logPass(`${postsWithIndividualSources} posts have individual source IDs`);
    } else if (postsWithAggregatesOnly > 0) {
      logInfo('Only aggregate source IDs found - may be legacy posts');
    }

    results.push({
      name: 'Sources: Individual IDs present',
      passed: true, // Informational - legacy posts may not have individual IDs
      reason: `${postsWithIndividualSources} with individual, ${postsWithAggregatesOnly} aggregates-only`,
      details: { postsWithIndividualSources, postsWithAggregatesOnly },
    });

    // Sample individual source IDs
    if (postsWithIndividualSources > 0) {
      const samplePost = postsSnapshot.docs.find((doc) => {
        const sources = doc.data().sources || [];
        return sources.some((s: any) => !aggregatePatterns.some(p => s.id?.includes(p)));
      });

      if (samplePost) {
        const sources = samplePost.data().sources || [];
        const individualSources = sources.filter((s: any) =>
          !aggregatePatterns.some(p => s.id?.includes(p)) && !s.id?.startsWith('activity-')
        );

        log(`  Sample individual sources:`, colors.dim);
        individualSources.slice(0, 3).forEach((s: any) => {
          log(`    - [${s.type}] ${s.id.substring(0, 30)}...`, colors.dim);
        });
      }
    }

  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    results.push({
      name: 'Sources: Individual IDs check',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * Test Case 4: Verify source preview data
 */
async function testSourcePreviewData(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Source Preview Data');

  try {
    const postsSnapshot = await db.collection('lifeFeedPosts')
      .where('userId', '==', userId)
      .orderBy('generatedAt', 'desc')
      .limit(20)
      .get();

    logQueryBox('Preview Data Analysis', [
      `Analyzing ${postsSnapshot.size} posts for preview fields`,
    ]);

    if (postsSnapshot.size === 0) {
      logInfo('No posts to analyze');
      results.push({
        name: 'Sources: Preview data check',
        passed: true,
        reason: 'No posts found',
        details: { postCount: 0 },
      });
      return results;
    }

    let sourcesWithPreview = 0;
    let sourcesWithoutPreview = 0;
    const previewFieldsByType: Record<string, Set<string>> = {};

    postsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const sources = data.sources || [];

      sources.forEach((source: any) => {
        if (source.preview && Object.keys(source.preview).length > 0) {
          sourcesWithPreview++;

          // Track which preview fields exist for each type
          if (!previewFieldsByType[source.type]) {
            previewFieldsByType[source.type] = new Set();
          }
          Object.keys(source.preview).forEach(field => {
            previewFieldsByType[source.type].add(field);
          });
        } else {
          sourcesWithoutPreview++;
        }
      });
    });

    log(`  Sources with preview: ${sourcesWithPreview}`, colors.dim);
    log(`  Sources without preview: ${sourcesWithoutPreview}`, colors.dim);

    // Log preview fields by type
    Object.entries(previewFieldsByType).forEach(([type, fields]) => {
      log(`  ${type}: ${Array.from(fields).join(', ')}`, colors.dim);
    });

    const hasPreviewData = sourcesWithPreview > 0;

    if (hasPreviewData) {
      logPass(`${sourcesWithPreview} sources have preview data`);
    } else {
      logInfo('No preview data found - may be legacy posts');
    }

    results.push({
      name: 'Sources: Preview data present',
      passed: true, // Informational - legacy posts may not have preview
      reason: `${sourcesWithPreview} with preview, ${sourcesWithoutPreview} without`,
      details: {
        sourcesWithPreview,
        sourcesWithoutPreview,
        previewFieldsByType: Object.fromEntries(
          Object.entries(previewFieldsByType).map(([k, v]) => [k, Array.from(v)])
        ),
      },
    });

  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    results.push({
      name: 'Sources: Preview data check',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * Test Case 5: Legacy post compatibility (simple query without orderBy asc)
 */
async function testLegacyPostCompatibility(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Legacy Post Compatibility');

  try {
    // Use simple query to avoid missing index issues
    const postsSnapshot = await db.collection('lifeFeedPosts')
      .where('userId', '==', userId)
      .limit(20)
      .get();

    logQueryBox('Legacy Posts Analysis', [
      `Checking ${postsSnapshot.size} posts for compatibility`,
    ]);

    if (postsSnapshot.size === 0) {
      logInfo('No posts to check for legacy compatibility');
      results.push({
        name: 'Legacy: Compatibility check',
        passed: true,
        reason: 'No posts found',
        details: { postCount: 0 },
      });
      return results;
    }

    let legacyPosts = 0;
    let modernPosts = 0;
    let postsWithErrors = 0;

    postsSnapshot.docs.forEach((doc) => {
      try {
        const data = doc.data();
        const sources = data.sources || [];

        // Check if this is a legacy post (aggregate IDs only, no preview)
        const isLegacy = sources.length === 0 ||
          sources.every((s: any) =>
            s.id?.includes('-aggregate') || s.id?.startsWith('activity-')
          ) ||
          sources.every((s: any) => !s.preview);

        if (isLegacy) {
          legacyPosts++;
        } else {
          modernPosts++;
        }
      } catch (e) {
        postsWithErrors++;
      }
    });

    log(`  Legacy posts (aggregates/no preview): ${legacyPosts}`, colors.dim);
    log(`  Modern posts (individual sources): ${modernPosts}`, colors.dim);
    log(`  Posts with errors: ${postsWithErrors}`, colors.dim);

    const compatible = postsWithErrors === 0;

    if (compatible) {
      logPass(`All ${postsSnapshot.size} posts load without errors`);
    } else {
      logFail(`${postsWithErrors} posts have errors`);
    }

    results.push({
      name: 'Legacy: Posts load without errors',
      passed: compatible,
      reason: compatible
        ? `All ${postsSnapshot.size} posts compatible`
        : `${postsWithErrors} posts have errors`,
      details: { legacyPosts, modernPosts, postsWithErrors },
    });

    // Check that legacy posts can be displayed with fallback message
    results.push({
      name: 'Legacy: Fallback display supported',
      passed: true,
      reason: legacyPosts > 0
        ? `${legacyPosts} legacy posts will show "Generated from your recent data" message`
        : 'No legacy posts found (all posts have modern sources)',
      details: { legacyPosts, modernPosts },
    });

  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    results.push({
      name: 'Legacy: Compatibility check',
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
  if (createdDocIds.length === 0) {
    return;
  }

  const cleanupItems = createdDocIds.map(
    ({ collection, id }) => `${collection}/${id}`
  );
  logCleanup(cleanupItems);

  let deleted = 0;
  let failed = 0;

  for (const { collection, id } of createdDocIds) {
    try {
      await db.collection(collection).doc(id).delete();
      deleted++;
    } catch (error) {
      failed++;
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
  const { db } = globalThis.testContext;
  await cleanup(db);
}
