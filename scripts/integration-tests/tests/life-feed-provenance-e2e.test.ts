/**
 * Life Feed Provenance - E2E Test
 *
 * END-TO-END test that verifies provenance tracking through the full
 * Life Feed generation pipeline:
 * 1. Call generateLifeFeedNow Cloud Function
 * 2. Wait for completion
 * 3. Verify ALL new posts have provenance field
 * 4. Verify execution records exist and link correctly
 *
 * This test is separated from the integration test because:
 * - It requires Cloud Functions to be deployed
 * - It takes longer to run (calls external services)
 * - It may be affected by cooldowns and rate limits
 *
 * Run: npm test -- --filter life-feed-provenance-e2e
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
export const name = 'Life Feed Provenance E2E';

// Track created documents for cleanup
const createdDocs: { collection: string; id: string }[] = [];

/**
 * Main test runner - exported for test discovery
 */
export async function run(): Promise<TestResult[]> {
  const { db, userId } = globalThis.testContext;
  const allResults: TestResult[] = [];

  // Test 1: Generate life feed and verify provenance attached
  const test1Results = await testGenerateAndVerifyProvenance(db, userId);
  allResults.push(...test1Results);

  // Test 2: Verify execution record created with matching ID
  const test2Results = await testExecutionRecordCreated(db, userId);
  allResults.push(...test2Results);

  // Cleanup
  await cleanup(db);

  return allResults;
}

/**
 * Test 1: Generate life feed and verify provenance is attached to ALL new posts
 *
 * Steps:
 * 1. Record the current time as a marker
 * 2. Seed test content to ensure generation has material
 * 3. Call generateLifeFeedNow Cloud Function
 * 4. Query new posts (publishedAt > start time)
 * 5. Verify ALL new posts have provenance field
 */
async function testGenerateAndVerifyProvenance(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('E2E: Generate Life Feed and Verify Provenance');

  const testId = generateTestId();
  const startTime = new Date();

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
    } else {
      logInfo('No recent posts to clear');
    }

    // Step 1: Create test content
    logInfo('Step 1: Creating test content for Life Feed generation...');

    const voiceNoteId = `prov-voice-${testId}`;
    const textNoteId = `prov-diary-${testId}`;

    await db.collection('voiceNotes').doc(voiceNoteId).set({
      userId,
      transcription: `Today I had a wonderful morning yoga session at the park. The weather was perfect and I felt really centered afterwards. Then I grabbed coffee with Elena at that new cafe on Mission Street.`,
      normalizedTranscription: `Today I had a wonderful morning yoga session at the park. The weather was perfect and I felt really centered afterwards. Then I grabbed coffee with Elena at that new cafe on Mission Street.`,
      duration: 35,
      audioUrl: `https://test.storage/${voiceNoteId}.m4a`,
      createdAt: new Date().toISOString(),
      tags: ['yoga', 'exercise', 'social'],
      sentimentScore: 0.85,
      analysis: { sentiment: { score: 0.85, label: 'positive' } },
    });
    createdDocs.push({ collection: 'voiceNotes', id: voiceNoteId });

    await db.collection('textNotes').doc(textNoteId).set({
      userId,
      title: 'Project Milestone',
      content: `Reached a major milestone on the home renovation project today. The kitchen backsplash is complete! Took about two weeks of evening work but the result looks amazing. Ceramic subway tiles with dark grout.`,
      normalizedContent: `Reached a major milestone on the home renovation project today. The kitchen backsplash is complete! Took about two weeks of evening work but the result looks amazing. Ceramic subway tiles with dark grout.`,
      type: 'diary',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      tags: ['project', 'home', 'milestone'],
      sentimentScore: 0.9,
      analysis: { sentiment: { score: 0.9, label: 'positive' } },
    });
    createdDocs.push({ collection: 'textNotes', id: textNoteId });

    logPass('Test content created (1 voice note, 1 diary entry)');

    results.push({
      name: 'E2E Provenance: Test content created',
      passed: true,
      reason: '2 items with provenance-testable content',
      details: { voiceNoteId, textNoteId },
    });

    // Step 2: Call generateLifeFeedNow Cloud Function
    logInfo('Step 2: Calling generateLifeFeedNow Cloud Function...');

    const { idToken, projectId, region } = globalThis.testContext;

    if (!idToken) {
      logInfo('No ID token available - skipping Cloud Function call');
      results.push({
        name: 'E2E Provenance: Cloud Function call',
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

      results.push({
        name: 'E2E Provenance: Cloud Function call',
        passed: true,
        reason: `Status: ${result.status}, Posts: ${result.posts?.length || 0}`,
        details: { status: result.status, postsGenerated: result.posts?.length || 0 },
      });

    } catch (error: any) {
      logFail('Cloud Function call failed', error.message);
      results.push({
        name: 'E2E Provenance: Cloud Function call',
        passed: false,
        reason: `FAILED: ${error.message}`,
      });
      return results;
    }

    // Step 3: Wait for posts to be generated
    logInfo('Step 3: Waiting 10 seconds for posts to be generated...');
    await wait(10000);

    // Step 4: Query new posts generated after start time
    logInfo('Step 4: Checking new posts for provenance...');

    const postsSnap = await db.collection('lifeFeedPosts')
      .where('userId', '==', userId)
      .where('publishedAt', '>=', startTime.toISOString())
      .orderBy('publishedAt', 'desc')
      .limit(10)
      .get();

    // Track for cleanup
    postsSnap.docs.forEach(doc => {
      createdDocs.push({ collection: 'lifeFeedPosts', id: doc.id });
    });

    logQueryBox('New Posts After Generation', [
      `Time range: ${startTime.toISOString()} to now`,
      `Found: ${postsSnap.size} new posts`,
    ]);

    if (postsSnap.size === 0) {
      logFail('No posts generated', 'Cloud Function may not have generated any posts');
      logInfo('Possible causes:');
      logInfo('  - Cooldowns preventing generation');
      logInfo('  - LifeFeedGenerator eligibility check failed');
      logInfo('  - Cloud Function not deployed with latest code');

      results.push({
        name: 'E2E Provenance: New posts generated',
        passed: false,
        reason: 'No posts generated after Cloud Function call',
        details: { postsFound: 0 },
      });
      return results;
    }

    logPass(`${postsSnap.size} new posts found`);

    // Step 5: Verify ALL new posts have provenance
    let postsWithProvenance = 0;
    let postsWithoutProvenance = 0;
    const provenanceDetails: Array<{
      postId: string;
      type: string;
      hasProvenance: boolean;
      service?: string;
      promptId?: string;
      executionId?: string;
    }> = [];

    postsSnap.docs.forEach((doc) => {
      const data = doc.data();
      const provenance = data.provenance;
      const hasProvenance = !!provenance && !!provenance.service;

      if (hasProvenance) {
        postsWithProvenance++;
        provenanceDetails.push({
          postId: doc.id,
          type: data.type || 'unknown',
          hasProvenance: true,
          service: provenance.service,
          promptId: provenance.promptId,
          executionId: provenance.promptExecutionId,
        });
        log(`  Post ${doc.id.substring(0, 15)}... (${data.type}): provenance OK`, colors.green);
        log(`    service=${provenance.service}, promptId=${provenance.promptId}`, colors.dim);
      } else {
        postsWithoutProvenance++;
        provenanceDetails.push({
          postId: doc.id,
          type: data.type || 'unknown',
          hasProvenance: false,
        });
        log(`  Post ${doc.id.substring(0, 15)}... (${data.type}): NO PROVENANCE`, colors.red);
      }
    });

    const allHaveProvenance = postsWithoutProvenance === 0;

    if (allHaveProvenance) {
      logPass(`ALL ${postsSnap.size} new posts have provenance field`);
    } else {
      logFail('Provenance missing', `${postsWithoutProvenance}/${postsSnap.size} posts lack provenance`);
    }

    results.push({
      name: 'E2E Provenance: ALL new posts have provenance',
      passed: allHaveProvenance,
      reason: allHaveProvenance
        ? `All ${postsSnap.size} posts have provenance attached`
        : `${postsWithoutProvenance}/${postsSnap.size} posts missing provenance`,
      details: {
        totalPosts: postsSnap.size,
        postsWithProvenance,
        postsWithoutProvenance,
        posts: provenanceDetails,
      },
    });

    // Store provenance details globally for test 2
    (globalThis as any).__provenanceTestPosts = provenanceDetails;

  } catch (error: any) {
    logFail('Test execution', error.message);
    results.push({
      name: 'E2E Provenance: Test execution',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * Test 2: Verify execution records were created and match post provenance
 *
 * For each new post with provenance.promptExecutionId:
 * - Fetch the execution document from promptExecutions collection
 * - Verify it exists
 * - Verify fields match (service, promptId)
 */
async function testExecutionRecordCreated(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('E2E: Verify Execution Records Match');

  try {
    // Get provenance details from test 1
    const provenanceDetails: Array<{
      postId: string;
      type: string;
      hasProvenance: boolean;
      service?: string;
      promptId?: string;
      executionId?: string;
    }> = (globalThis as any).__provenanceTestPosts || [];

    // Filter to posts with execution IDs
    const postsWithExecutionId = provenanceDetails.filter(
      (p) => p.hasProvenance && p.executionId
    );

    logQueryBox('Execution Record Verification', [
      `Posts with execution IDs: ${postsWithExecutionId.length}`,
      `Total provenance posts: ${provenanceDetails.filter(p => p.hasProvenance).length}`,
    ]);

    if (postsWithExecutionId.length === 0) {
      logFail('No posts with execution IDs to verify');
      logInfo('This may happen if:');
      logInfo('  - Test 1 did not generate any posts');
      logInfo('  - Cloud Functions not deployed with provenance support');
      results.push({
        name: 'E2E Provenance: Execution records exist',
        passed: false,
        reason: 'No posts with execution IDs found - Cloud Functions may not have provenance support deployed',
        details: { postsChecked: 0 },
      });
      return results;
    }

    let validRecords = 0;
    let missingRecords = 0;
    let mismatchedRecords = 0;

    for (const post of postsWithExecutionId) {
      const executionId = post.executionId!;

      try {
        const execDoc = await db.collection('promptExecutions').doc(executionId).get();

        if (!execDoc.exists) {
          missingRecords++;
          log(`  Execution ${executionId.substring(0, 20)}... NOT FOUND`, colors.red);
          continue;
        }

        const execData = execDoc.data()!;
        const serviceMatch = execData.service === 'LifeFeedGenerator';
        const promptMatch = !post.promptId || execData.promptId === post.promptId;

        if (serviceMatch && promptMatch) {
          validRecords++;
          log(`  Execution ${executionId.substring(0, 20)}... VALID`, colors.green);
          log(`    service: ${execData.service}, promptId: ${execData.promptId}`, colors.dim);
          log(`    model: ${execData.model}, cost: $${execData.estimatedCostUSD?.toFixed(6) || 'N/A'}`, colors.dim);
          log(`    tokens: in=${execData.inputTokens}, out=${execData.outputTokens}`, colors.dim);
        } else {
          mismatchedRecords++;
          const issues: string[] = [];
          if (!serviceMatch) issues.push(`service: ${execData.service} (expected LifeFeedGenerator)`);
          if (!promptMatch) issues.push(`promptId: ${execData.promptId} (expected ${post.promptId})`);
          log(`  Execution ${executionId.substring(0, 20)}... MISMATCH: ${issues.join(', ')}`, colors.yellow);
        }
      } catch (error: any) {
        missingRecords++;
        log(`  Execution ${executionId.substring(0, 20)}... ERROR: ${error.message}`, colors.red);
      }
    }

    const allValid = missingRecords === 0 && mismatchedRecords === 0;

    if (allValid) {
      logPass(`All ${validRecords} execution records verified`);
    } else {
      if (missingRecords > 0) {
        logFail('Execution records missing', `${missingRecords} records not found in promptExecutions`);
      }
      if (mismatchedRecords > 0) {
        logFail('Execution records mismatched', `${mismatchedRecords} records have mismatched fields`);
      }
    }

    results.push({
      name: 'E2E Provenance: Execution records valid',
      passed: allValid,
      reason: allValid
        ? `All ${validRecords} execution records exist and match`
        : `${validRecords} valid, ${missingRecords} missing, ${mismatchedRecords} mismatched`,
      details: {
        totalChecked: postsWithExecutionId.length,
        validRecords,
        missingRecords,
        mismatchedRecords,
      },
    });

  } catch (error: any) {
    logFail('Test execution', error.message);
    results.push({
      name: 'E2E Provenance: Execution record check',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  // Clean up global state
  delete (globalThis as any).__provenanceTestPosts;

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
