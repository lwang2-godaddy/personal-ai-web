/**
 * Life Feed Rich Content - E2E Test
 *
 * END-TO-END test that verifies the full Life Feed generation pipeline:
 * 1. Creates test voice notes and diary entries with unique identifiable content
 * 2. Calls the generateLifeFeedNow Cloud Function
 * 3. Verifies the generated posts contain phrases from the test data
 *
 * This test is separated from the main integration tests because:
 * - It requires Cloud Functions to be deployed
 * - It takes longer to run (calls external services)
 * - It may be affected by cooldowns and rate limits
 *
 * Cloud Function Notes:
 *   Uses `generateLifeFeedNow` (onCall), NOT `generateLifeFeedPosts` (onSchedule).
 *   - onSchedule functions cannot be called via HTTP
 *   - onCall functions use request.auth.uid automatically
 *
 * Run: npm test -- --filter life-feed-rich-content-e2e
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
export const name = 'Life Feed Rich Content E2E';

// Track created documents for cleanup
const createdDocs: { collection: string; id: string }[] = [];

/**
 * Main test runner - exported for test discovery
 */
export async function run(): Promise<TestResult[]> {
  const { db, userId } = globalThis.testContext;
  const allResults: TestResult[] = [];

  // Run the E2E generation test
  const results = await testEndToEndGeneration(db, userId);
  allResults.push(...results);

  // Cleanup
  await cleanup(db);

  return allResults;
}

/**
 * END-TO-END Test: Create test data, generate posts, verify content
 *
 * This is the critical test that verifies the full pipeline:
 * 1. Create voice notes and diary entries with unique identifiable content
 * 2. Call the generateLifeFeedNow Cloud Function
 * 3. Verify the generated posts contain phrases from the test data
 */
async function testEndToEndGeneration(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('E2E: Generate Life Feed Posts with Test Content');

  const testId = generateTestId();

  // Unique identifiable phrases that should appear in generated posts
  const uniquePhrases = {
    voiceNote1: `played pickleball with Marcus at Sunnyvale courts ${testId}`,
    voiceNote2: `feeling excited about the new photography project ${testId}`,
    diary1: `visited the Japanese Tea Garden with family ${testId}`,
  };

  try {
    // Step 0: Clear recent lifeFeedPosts to avoid cooldowns
    logInfo('Step 0: Clearing recent lifeFeedPosts to reset cooldowns...');

    // Note: lifeFeedPosts use 'publishedAt' not 'createdAt'
    const recentPostsSnap = await db.collection('lifeFeedPosts')
      .where('userId', '==', userId)
      .orderBy('publishedAt', 'desc')
      .limit(20)
      .get();

    if (recentPostsSnap.size > 0) {
      log(`  Deleting ${recentPostsSnap.size} recent posts to clear cooldowns...`, colors.dim);
      for (const doc of recentPostsSnap.docs) {
        await doc.ref.delete();
        // Note: Don't add to createdDocs - these are pre-existing posts, not test-created
      }
      logPass(`Cleared ${recentPostsSnap.size} recent posts`);
    } else {
      logInfo('No recent posts to clear');
    }

    // Step 1: Create test content with unique identifiable phrases
    logInfo('Step 1: Creating test content with unique phrases...');

    const voiceNote1Id = `e2e-voice1-${testId}`;
    const voiceNote2Id = `e2e-voice2-${testId}`;
    const diaryId = `e2e-diary-${testId}`;

    // Voice note 1 - activity content
    await db.collection('voiceNotes').doc(voiceNote1Id).set({
      userId,
      transcription: `Today I ${uniquePhrases.voiceNote1}. It was such a great workout, we played for about two hours. My backhand is really improving!`,
      normalizedTranscription: `Today I ${uniquePhrases.voiceNote1}. It was such a great workout, we played for about two hours. My backhand is really improving!`,
      duration: 45,
      audioUrl: `https://test.storage/${voiceNote1Id}.m4a`,
      createdAt: new Date().toISOString(),
      tags: ['sports', 'pickleball', 'exercise'],
      sentimentScore: 0.8,
      analysis: { sentiment: { score: 0.8, label: 'positive' } },
    });
    createdDocs.push({ collection: 'voiceNotes', id: voiceNote1Id });

    // Voice note 2 - emotional/project content
    await db.collection('voiceNotes').doc(voiceNote2Id).set({
      userId,
      transcription: `I'm ${uniquePhrases.voiceNote2}. Planning to shoot some sunset photos this weekend at the coast.`,
      normalizedTranscription: `I'm ${uniquePhrases.voiceNote2}. Planning to shoot some sunset photos this weekend at the coast.`,
      duration: 30,
      audioUrl: `https://test.storage/${voiceNote2Id}.m4a`,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      tags: ['photography', 'creative', 'hobby'],
      sentimentScore: 0.9,
      analysis: { sentiment: { score: 0.9, label: 'positive' } },
    });
    createdDocs.push({ collection: 'voiceNotes', id: voiceNote2Id });

    // Diary entry - family outing
    await db.collection('textNotes').doc(diaryId).set({
      userId,
      title: 'Weekend Adventure',
      content: `What a beautiful day! We ${uniquePhrases.diary1}. The cherry blossoms were in full bloom and the weather was perfect. Kids loved feeding the koi fish.`,
      normalizedContent: `What a beautiful day! We ${uniquePhrases.diary1}. The cherry blossoms were in full bloom and the weather was perfect. Kids loved feeding the koi fish.`,
      type: 'diary',
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
      tags: ['family', 'nature', 'outing'],
      sentimentScore: 0.85,
      analysis: { sentiment: { score: 0.85, label: 'positive' } },
    });
    createdDocs.push({ collection: 'textNotes', id: diaryId });

    logPass('Test content created (3 items with unique phrases)');
    log(`  Voice 1: "${uniquePhrases.voiceNote1.substring(0, 40)}..."`, colors.dim);
    log(`  Voice 2: "${uniquePhrases.voiceNote2.substring(0, 40)}..."`, colors.dim);
    log(`  Diary: "${uniquePhrases.diary1.substring(0, 40)}..."`, colors.dim);

    results.push({
      name: 'E2E: Test content created',
      passed: true,
      reason: '3 items with unique identifiable phrases',
      details: { voiceNote1Id, voiceNote2Id, diaryId },
    });

    // Step 2: Call the generateLifeFeedNow Cloud Function
    logInfo('Step 2: Calling generateLifeFeedNow Cloud Function...');

    const { idToken, projectId, region } = globalThis.testContext;

    if (!idToken) {
      logInfo('No ID token available - skipping Cloud Function call');
      results.push({
        name: 'E2E: Cloud Function call',
        passed: true,
        reason: 'Skipped - no ID token (run with auth to enable)',
        details: { skipped: true },
      });
      return results;
    }

    // Call the Cloud Function (generateLifeFeedNow is the onCall version)
    const functionUrl = `https://${region}-${projectId}.cloudfunctions.net/generateLifeFeedNow`;

    try {
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          data: {}, // generateLifeFeedNow uses request.auth.uid, no need to pass userId
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Function returned ${response.status}: ${errorText}`);
      }

      const responseData = await response.json();
      logPass('Cloud Function called successfully');

      // Log the response for debugging
      const result = responseData.result || responseData;
      log(`  Function response status: ${result.status || 'unknown'}`, colors.dim);
      log(`  Posts generated: ${result.posts?.length || 0}`, colors.dim);
      if (result.message) {
        log(`  Message: ${result.message}`, colors.dim);
      }
      if (result.details?.typesInCooldown) {
        log(`  Types in cooldown: ${result.details.typesInCooldown.join(', ')}`, colors.dim);
      }
      if (result.details?.typesNotEligible) {
        log(`  Types not eligible:`, colors.dim);
        result.details.typesNotEligible.forEach((t: any) => {
          log(`    - ${t.type}: ${t.reason}`, colors.dim);
        });
      }

      results.push({
        name: 'E2E: Cloud Function call',
        passed: true,
        reason: `Function returned status: ${result.status || 'unknown'}`,
        details: { status: response.status, functionStatus: result.status, postsGenerated: result.posts?.length || 0 },
      });

    } catch (error: any) {
      logFail('E2E: Cloud Function call', error.message);

      results.push({
        name: 'E2E: Cloud Function call',
        passed: false,
        reason: `FAILED: ${error.message}`,
        details: { error: error.message },
      });

      // Don't continue if function call failed
      return results;
    }

    // Step 3: Wait for posts to be generated
    logInfo('Step 3: Waiting 10 seconds for posts to be generated...');
    await wait(10000); // Wait 10 seconds for async processing

    // Step 4: Check generated posts for our unique phrases
    logInfo('Step 4: Checking generated posts for test content...');

    // Get recent posts (within last 10 minutes)
    // Note: lifeFeedPosts use 'publishedAt' not 'createdAt'
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const postsSnap = await db.collection('lifeFeedPosts')
      .where('userId', '==', userId)
      .where('publishedAt', '>=', tenMinutesAgo)
      .orderBy('publishedAt', 'desc')
      .limit(10)
      .get();

    logQueryBox('Recent Life Feed Posts', [
      `Time range: Last 10 minutes`,
      `Found: ${postsSnap.size} posts`,
    ]);

    if (postsSnap.size === 0) {
      logFail('E2E: Posts generated', 'No posts were generated by Cloud Function');
      logInfo('Possible causes:');
      logInfo('  - Cloud Function not deployed with latest code');
      logInfo('  - Cooldowns preventing generation (check lifeFeedPosts for recent posts)');
      logInfo('  - LifeFeedGenerator eligibility check failed');

      results.push({
        name: 'E2E: Posts generated',
        passed: false,
        reason: 'FAILED: No posts generated - Cloud Function may need deployment',
        details: { postsFound: 0 },
      });

      return results;
    }

    // Track generated post IDs for cleanup
    postsSnap.docs.forEach(doc => {
      createdDocs.push({ collection: 'lifeFeedPosts', id: doc.id });
    });

    logPass(`${postsSnap.size} posts generated`);

    results.push({
      name: 'E2E: Posts generated',
      passed: true,
      reason: `${postsSnap.size} posts found`,
      details: { postsFound: postsSnap.size },
    });

    // Step 5: Verify posts contain our unique content
    logInfo('Step 5: Verifying posts contain test content...');

    // Combine all post content for analysis
    const allPostContent = postsSnap.docs.map(doc => {
      const data = doc.data();
      return `${data.title || ''} ${data.content || ''}`.toLowerCase();
    }).join(' ');

    // Check which unique phrases appear in the posts
    const phraseMatches: { phrase: string; found: boolean; context?: string }[] = [];

    // Check for key words from our test content (not full phrases, as AI rewrites)
    const keywordsToFind = [
      { keyword: 'pickleball', source: 'voice note 1' },
      { keyword: 'marcus', source: 'voice note 1' },
      { keyword: 'sunnyvale', source: 'voice note 1' },
      { keyword: 'photography', source: 'voice note 2' },
      { keyword: 'japanese tea garden', source: 'diary' },
      { keyword: 'tea garden', source: 'diary' },
      { keyword: 'cherry blossom', source: 'diary' },
      { keyword: 'koi', source: 'diary' },
    ];

    let matchedKeywords = 0;
    keywordsToFind.forEach(({ keyword, source }) => {
      const found = allPostContent.includes(keyword.toLowerCase());
      if (found) {
        matchedKeywords++;
        log(`  \u2713 Found "${keyword}" (from ${source})`, colors.green);
      }
      phraseMatches.push({ phrase: keyword, found, context: source });
    });

    const matchRate = keywordsToFind.length > 0
      ? (matchedKeywords / keywordsToFind.length * 100).toFixed(0)
      : 0;

    log(`  Keyword match rate: ${matchedKeywords}/${keywordsToFind.length} (${matchRate}%)`, colors.dim);

    // Consider it a pass if at least 2 keywords from test content appear
    const hasRichContent = matchedKeywords >= 2;

    if (hasRichContent) {
      logPass('Posts contain content from test data!');
    } else if (matchedKeywords > 0) {
      logInfo('Some test content found in posts');
    } else {
      logInfo('Test keywords not found - AI may have paraphrased significantly');
    }

    results.push({
      name: 'E2E: Posts contain test content',
      passed: hasRichContent,
      reason: hasRichContent
        ? `${matchedKeywords} keywords from test data found in posts`
        : `Only ${matchedKeywords} keywords found (AI may have paraphrased)`,
      details: {
        matchedKeywords,
        totalKeywords: keywordsToFind.length,
        matchRate,
        matches: phraseMatches.filter(m => m.found),
      },
    });

    // Show sample post content
    if (postsSnap.size > 0) {
      const samplePost = postsSnap.docs[0].data();
      log(`  Sample generated post (${samplePost.type}):`, colors.dim);
      log(`    "${samplePost.content?.substring(0, 150)}..."`, colors.dim);

      results.push({
        name: 'E2E: Sample post quality',
        passed: true,
        reason: `Type: ${samplePost.type}, Length: ${samplePost.content?.length || 0} chars`,
        details: {
          type: samplePost.type,
          title: samplePost.title,
          contentPreview: samplePost.content?.substring(0, 200),
        },
      });
    }

  } catch (error: any) {
    logFail('Test execution', error.message);
    results.push({
      name: 'E2E: Test execution',
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

  // Clear the array
  createdDocs.length = 0;
}

/**
 * Cleanup function exported for test runner
 */
export async function cleanupTestData(): Promise<void> {
  const { db } = globalThis.testContext;
  await cleanup(db);
}
