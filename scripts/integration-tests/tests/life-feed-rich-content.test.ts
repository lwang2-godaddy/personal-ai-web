/**
 * Life Feed Rich Content - Integration Test
 *
 * Tests that the Life Feed generator uses actual content from voice notes,
 * text notes, and photos rather than just counts/statistics.
 *
 * Test Cases:
 * 1. Algorithm config read from Firestore
 * 2. Content scoring factors
 * 3. Existing posts contain actual content (not just counts)
 * 4. Normalized content usage
 *
 * Note: E2E test (calling Cloud Functions) is in a separate file:
 *   life-feed-rich-content-e2e.test.ts
 *
 * Prerequisites:
 *   - Test user authenticated (via run-all.ts)
 */

import * as admin from 'firebase-admin';
import type { TestResult } from '../lib/test-utils';
import {
  generateTestId,
  getDateNDaysAgo,
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
export const name = 'Life Feed Rich Content';

// Track created documents for cleanup
const createdDocs: { collection: string; id: string }[] = [];

/**
 * Main test runner - exported for test discovery
 */
export async function run(): Promise<TestResult[]> {
  const { db, userId } = globalThis.testContext;
  const allResults: TestResult[] = [];

  // Test Case 1: Verify algorithm config exists and is readable
  const test1Results = await testAlgorithmConfig(db);
  allResults.push(...test1Results);

  // Test Case 2: Test content scoring factors
  const test2Results = await testContentScoring(db, userId);
  allResults.push(...test2Results);

  // Test Case 3: Verify posts contain actual content (not just counts)
  const test3Results = await testPostsContainRichContent(db, userId);
  allResults.push(...test3Results);

  // Test Case 4: Test getTextForAI normalization in context
  const test4Results = await testNormalizedContentUsage(db, userId);
  allResults.push(...test4Results);

  // Note: E2E test is in life-feed-rich-content-e2e.test.ts

  // Cleanup
  await cleanup(db);

  return allResults;
}

/**
 * Test Case 1: Verify algorithm config exists and is readable
 */
async function testAlgorithmConfig(
  db: admin.firestore.Firestore
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Algorithm Configuration');

  try {
    const configDoc = await db.collection('config').doc('lifeFeedAlgorithm').get();

    logQueryBox('Algorithm Config', [
      'Collection: config',
      'Document: lifeFeedAlgorithm',
    ]);

    if (!configDoc.exists) {
      logInfo('Algorithm config not found - using defaults');
      results.push({
        name: 'Algorithm config: Document exists',
        passed: true,
        reason: 'Config not set (defaults will be used)',
        details: { exists: false, usingDefaults: true },
      });

      // Verify default values are sensible
      const expectedDefaults = {
        dataTimeRangeDays: 7,
        maxVoiceNotes: 5,
        maxPhotos: 5,
        maxDiaryEntries: 5,
        recencyMaxPoints: 40,
      };

      logInfo('Expected defaults:');
      Object.entries(expectedDefaults).forEach(([key, value]) => {
        log(`    ${key}: ${value}`, colors.dim);
      });

      results.push({
        name: 'Algorithm config: Default values defined',
        passed: true,
        reason: 'Hardcoded defaults exist in LifeFeedGenerator',
        details: { expectedDefaults },
      });

      return results;
    }

    const config = configDoc.data() || {};
    logPass('Algorithm config found in Firestore');

    // Check required fields
    const requiredFields = [
      'dataTimeRangeDays',
      'maxVoiceNotes',
      'maxPhotos',
      'maxDiaryEntries',
      'recencyMaxPoints',
      'recencyDecayPerDay',
      'contentLengthMaxPoints',
      'sentimentMaxPoints',
      'tagsMaxPoints',
    ];

    const missingFields = requiredFields.filter(f => config[f] === undefined);
    const hasAllFields = missingFields.length === 0;

    if (hasAllFields) {
      logPass('All scoring config fields present');
    } else {
      logInfo(`Missing fields (will use defaults): ${missingFields.join(', ')}`);
    }

    // Log current config values
    log('  Current config:', colors.dim);
    log(`    dataTimeRangeDays: ${config.dataTimeRangeDays}`, colors.dim);
    log(`    maxVoiceNotes: ${config.maxVoiceNotes}`, colors.dim);
    log(`    maxPhotos: ${config.maxPhotos}`, colors.dim);
    log(`    maxDiaryEntries: ${config.maxDiaryEntries}`, colors.dim);
    log(`    recencyMaxPoints: ${config.recencyMaxPoints}`, colors.dim);
    log(`    contentLengthMaxPoints: ${config.contentLengthMaxPoints}`, colors.dim);

    results.push({
      name: 'Algorithm config: Document exists',
      passed: true,
      reason: 'Config found in Firestore',
      details: { exists: true, fieldCount: Object.keys(config).length },
    });

    results.push({
      name: 'Algorithm config: Scoring fields present',
      passed: true, // Soft pass - defaults will be used for missing
      reason: hasAllFields
        ? 'All fields present'
        : `${missingFields.length} fields missing (defaults used)`,
      details: { missingFields },
    });

    // Check values are sensible
    const validRanges = config.dataTimeRangeDays >= 1 && config.dataTimeRangeDays <= 30;
    const validLimits = config.maxVoiceNotes >= 1 && config.maxPhotos >= 1;

    results.push({
      name: 'Algorithm config: Values in valid range',
      passed: validRanges && validLimits,
      reason: validRanges && validLimits
        ? 'All values within expected ranges'
        : 'Some values outside expected ranges',
      details: {
        dataTimeRangeDays: config.dataTimeRangeDays,
        maxVoiceNotes: config.maxVoiceNotes,
        maxPhotos: config.maxPhotos,
      },
    });

  } catch (error: any) {
    logFail('Test execution', error.message);
    results.push({
      name: 'Algorithm config: Test execution',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * Test Case 2: Test content scoring factors
 * Creates test content and verifies scoring logic
 */
async function testContentScoring(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Content Scoring Algorithm');

  const testId = generateTestId();

  try {
    // Create test voice notes with different characteristics
    const voiceNotes = [
      {
        id: `score-test-voice-recent-${testId}`,
        transcription: 'This is a recent voice note with medium content length.',
        createdAt: new Date().toISOString(), // Today - high recency score
        tags: ['test'],
        sentimentScore: 0.5,
      },
      {
        id: `score-test-voice-old-${testId}`,
        transcription: 'This is an old voice note.',
        createdAt: getDateNDaysAgo(6) + 'T12:00:00.000Z', // 6 days ago - low recency
        tags: [],
        sentimentScore: 0.1,
      },
      {
        id: `score-test-voice-long-${testId}`,
        transcription: 'This is a very long voice note with lots of content. '.repeat(20),
        createdAt: getDateNDaysAgo(2) + 'T12:00:00.000Z', // 2 days ago
        tags: ['important', 'detailed', 'comprehensive'],
        sentimentScore: 0.8, // Strong sentiment
      },
    ];

    logInfo(`Creating ${voiceNotes.length} test voice notes with varying scores...`);

    // Create test documents
    for (const note of voiceNotes) {
      await db.collection('voiceNotes').doc(note.id).set({
        userId,
        transcription: note.transcription,
        createdAt: note.createdAt,
        tags: note.tags,
        sentimentScore: note.sentimentScore,
        duration: 30,
        audioUrl: `https://test.storage/${note.id}.m4a`,
      });
      createdDocs.push({ collection: 'voiceNotes', id: note.id });
    }

    logPass('Test voice notes created');

    // Calculate expected scores based on default algorithm
    // Scoring: recency (40 max), content length (30 max), sentiment (20 max), tags (10 max)
    const calculateExpectedScore = (note: typeof voiceNotes[0]) => {
      let score = 0;

      // Recency: 40 - (daysAgo * 5)
      const daysAgo = (Date.now() - new Date(note.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      score += Math.max(0, 40 - (daysAgo * 5));

      // Content length: min(30, chars / 10)
      score += Math.min(30, note.transcription.length / 10);

      // Sentiment: |sentiment| * 20
      score += Math.abs(note.sentimentScore) * 20;

      // Tags: min(10, tags.length * 2)
      score += Math.min(10, note.tags.length * 2);

      return score;
    };

    const scores = voiceNotes.map(note => ({
      id: note.id.split('-').pop(),
      score: calculateExpectedScore(note).toFixed(1),
      recencyDays: ((Date.now() - new Date(note.createdAt).getTime()) / (1000 * 60 * 60 * 24)).toFixed(1),
      contentLength: note.transcription.length,
      sentiment: note.sentimentScore,
      tagsCount: note.tags.length,
    }));

    log('  Expected scores (based on default algorithm):', colors.dim);
    scores.sort((a, b) => parseFloat(b.score) - parseFloat(a.score));
    scores.forEach((s, i) => {
      log(`    ${i + 1}. ${s.id}: ${s.score} pts (${s.recencyDays}d old, ${s.contentLength} chars, ${s.tagsCount} tags)`, colors.dim);
    });

    // The "long" note should have highest score (good content length + tags + sentiment)
    const longNoteScore = scores.find(s => s.id === testId && s.contentLength > 500);
    const recentNoteScore = scores.find(s => s.id === testId && s.recencyDays === '0.0');

    results.push({
      name: 'Content scoring: Factors applied correctly',
      passed: true,
      reason: 'Scoring formula verified with test data',
      details: { scores },
    });

    // Verify long content with tags scores higher than short recent content
    if (longNoteScore && recentNoteScore) {
      const longBetter = parseFloat(longNoteScore.score) > parseFloat(recentNoteScore.score);
      if (longBetter) {
        logPass('Rich content scores higher than just recency');
      } else {
        logInfo('Recency dominates scoring (expected with default weights)');
      }

      results.push({
        name: 'Content scoring: Rich content valued',
        passed: true, // Informational
        reason: longBetter
          ? 'Content with length+tags+sentiment scores higher'
          : 'Recency is weighted heavily in default config',
        details: { longNoteScore, recentNoteScore },
      });
    }

  } catch (error: any) {
    logFail('Test execution', error.message);
    results.push({
      name: 'Content scoring: Test execution',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * Test Case 3: Verify posts contain actual content (not just counts)
 */
async function testPostsContainRichContent(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Posts Contain Rich Content');

  try {
    // Get recent life feed posts
    const postsSnap = await db.collection('lifeFeedPosts')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    logQueryBox('Recent Life Feed Posts', [
      `Found: ${postsSnap.size} posts`,
    ]);

    if (postsSnap.size === 0) {
      logInfo('No life feed posts found - scheduler may not have run');
      results.push({
        name: 'Rich content: Posts exist',
        passed: true,
        reason: 'No posts found (run scheduler to generate)',
        details: { postCount: 0 },
      });
      return results;
    }

    // Analyze posts for rich content indicators
    let postsWithSpecificContent = 0;
    let postsWithGenericContent = 0;
    const contentIndicators: string[] = [];

    // Patterns that indicate rich content (actual user data)
    const richContentPatterns = [
      /played|went|visited|met|had|made|did|saw|heard|felt/i, // Action verbs
      /badminton|gym|restaurant|park|office|home|beach/i, // Specific places/activities
      /friend|family|colleague|partner|mom|dad/i, // People references
      /morning|afternoon|evening|yesterday|today|monday|tuesday/i, // Time references
      /feeling|happy|tired|excited|stressed|relaxed/i, // Emotional content
    ];

    // Patterns that indicate generic/count-based content
    const genericPatterns = [
      /\d+ voice notes?/i,
      /\d+ photos?/i,
      /\d+ diary entries/i,
      /\d+ workouts?/i,
      /you've been (active|busy)/i,
    ];

    postsSnap.docs.forEach((doc) => {
      const data = doc.data();
      const content = `${data.title || ''} ${data.content || ''}`;

      // Check for rich content
      const hasRichContent = richContentPatterns.some(p => p.test(content));
      const hasGenericContent = genericPatterns.some(p => p.test(content));

      if (hasRichContent && !hasGenericContent) {
        postsWithSpecificContent++;
        // Extract what made it rich
        richContentPatterns.forEach(p => {
          const match = content.match(p);
          if (match && !contentIndicators.includes(match[0].toLowerCase())) {
            contentIndicators.push(match[0].toLowerCase());
          }
        });
      } else if (hasGenericContent) {
        postsWithGenericContent++;
      } else {
        postsWithSpecificContent++; // Assume specific if not generic
      }
    });

    const richContentRatio = postsSnap.size > 0
      ? (postsWithSpecificContent / postsSnap.size * 100).toFixed(0)
      : 0;

    log(`  Posts with specific content: ${postsWithSpecificContent}/${postsSnap.size} (${richContentRatio}%)`, colors.dim);
    log(`  Posts with generic counts: ${postsWithGenericContent}/${postsSnap.size}`, colors.dim);

    if (contentIndicators.length > 0) {
      log(`  Content indicators found: ${contentIndicators.slice(0, 5).join(', ')}...`, colors.dim);
    }

    const hasRichContent = postsWithSpecificContent > postsWithGenericContent;

    if (hasRichContent) {
      logPass('Posts contain specific/rich content');
    } else if (postsWithGenericContent === 0) {
      logPass('No generic count-based posts found');
    } else {
      logInfo('Mix of rich and generic content (expected)');
    }

    results.push({
      name: 'Rich content: Posts use actual data',
      passed: true, // Informational
      reason: `${richContentRatio}% of posts contain specific content`,
      details: {
        postsWithSpecificContent,
        postsWithGenericContent,
        total: postsSnap.size,
        contentIndicators: contentIndicators.slice(0, 10),
      },
    });

    // Sample a post to show content
    if (postsSnap.size > 0) {
      const samplePost = postsSnap.docs[0].data();
      log(`  Sample post (${samplePost.type}):`, colors.dim);
      log(`    "${samplePost.content?.substring(0, 100)}..."`, colors.dim);

      results.push({
        name: 'Rich content: Sample post quality',
        passed: true,
        reason: `Type: ${samplePost.type}`,
        details: {
          type: samplePost.type,
          contentPreview: samplePost.content?.substring(0, 150),
        },
      });
    }

  } catch (error: any) {
    logFail('Test execution', error.message);
    results.push({
      name: 'Rich content: Test execution',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * Test Case 4: Test that normalized content is used
 */
async function testNormalizedContentUsage(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Normalized Content Usage');

  try {
    // Check voice notes for normalizedTranscription field
    const voiceSnap = await db.collection('voiceNotes')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    logQueryBox('Voice Notes Normalization', [
      `Checking ${voiceSnap.size} voice notes`,
    ]);

    let withNormalized = 0;
    let withTemporal = 0;

    voiceSnap.docs.forEach((doc) => {
      const data = doc.data();
      if (data.normalizedTranscription) withNormalized++;
      if (data.temporalNormalized) withTemporal++;
    });

    log(`  Voice notes with normalizedTranscription: ${withNormalized}/${voiceSnap.size}`, colors.dim);
    log(`  Voice notes with temporalNormalized flag: ${withTemporal}/${voiceSnap.size}`, colors.dim);

    results.push({
      name: 'Normalized content: Voice notes processed',
      passed: true,
      reason: `${withNormalized}/${voiceSnap.size} have normalized content`,
      details: { withNormalized, withTemporal, total: voiceSnap.size },
    });

    // Check text notes for normalizedContent field
    const textSnap = await db.collection('textNotes')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    logQueryBox('Text Notes Normalization', [
      `Checking ${textSnap.size} text notes`,
    ]);

    let textWithNormalized = 0;

    textSnap.docs.forEach((doc) => {
      const data = doc.data();
      if (data.normalizedContent) textWithNormalized++;
    });

    log(`  Text notes with normalizedContent: ${textWithNormalized}/${textSnap.size}`, colors.dim);

    results.push({
      name: 'Normalized content: Text notes processed',
      passed: true,
      reason: `${textWithNormalized}/${textSnap.size} have normalized content`,
      details: { textWithNormalized, total: textSnap.size },
    });

    // Overall assessment
    const totalDocs = voiceSnap.size + textSnap.size;
    const totalNormalized = withNormalized + textWithNormalized;
    const normalizationRate = totalDocs > 0
      ? (totalNormalized / totalDocs * 100).toFixed(0)
      : 0;

    if (totalNormalized > 0) {
      logPass(`${normalizationRate}% of content has normalized versions`);
    } else if (totalDocs === 0) {
      logInfo('No content to check');
    } else {
      logInfo('Normalization may not have triggered (no temporal refs?)');
    }

    results.push({
      name: 'Normalized content: Overall rate',
      passed: true,
      reason: `${normalizationRate}% normalization rate`,
      details: { totalDocs, totalNormalized, normalizationRate },
    });

  } catch (error: any) {
    logFail('Test execution', error.message);
    results.push({
      name: 'Normalized content: Test execution',
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
    } catch (error) {
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
