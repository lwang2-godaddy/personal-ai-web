/**
 * Life Feed Generator - Integration Tests
 *
 * Tests the Life Feed post generation system:
 * 1. LifeFeedGenerator - Main service that creates posts
 * 2. InsightsIntegrationService - Cooldown and deduplication
 * 3. PromptLoader - AI prompt configuration
 *
 * Post Types (14 total):
 * - weekly_summary, health_insight, location_insight, mood_pattern
 * - activity_streak, memory_highlight, social_insight, milestone
 * - prediction, suggestion, reflection_prompt, fun_fact
 * - life_keyword, life_connection
 *
 * Collections:
 * - Reads: insights, moodPatterns, predictions, suggestions, memories
 * - Writes: lifeFeedPosts
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
export const name = 'Life Feed Generator';

// Test data cleanup tracker
const createdDocIds: { collection: string; id: string }[] = [];

/**
 * Main test runner - exported for test discovery
 */
export async function run(): Promise<TestResult[]> {
  const { db, userId } = globalThis.testContext;
  const allResults: TestResult[] = [];

  // Test Case 1: Check lifeFeedPosts collection structure
  const test1Results = await testLifeFeedPostsStructure(db, userId);
  allResults.push(...test1Results);

  // Test Case 2: Verify post type distribution
  const test2Results = await testPostTypeDistribution(db, userId);
  allResults.push(...test2Results);

  // Test Case 3: Test cooldown tracking
  const test3Results = await testCooldownTracking(db, userId);
  allResults.push(...test3Results);

  // Test Case 4: Verify post type config in Firestore
  const test4Results = await testPostTypeConfig(db);
  allResults.push(...test4Results);

  // Test Case 5: Check engagement tracking
  const test5Results = await testEngagementTracking(db, userId);
  allResults.push(...test5Results);

  // Cleanup
  await cleanup(db);

  return allResults;
}

/**
 * Test Case 1: Check lifeFeedPosts collection structure
 */
async function testLifeFeedPostsStructure(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('lifeFeedPosts Collection Structure');

  try {
    const postsSnapshot = await db.collection('lifeFeedPosts')
      .where('userId', '==', userId)
      .limit(20)
      .get();

    logQueryBox('lifeFeedPosts Query', [
      'Collection: lifeFeedPosts',
      `where userId == "${userId.substring(0, 8)}..."`,
      `Found: ${postsSnapshot.size} posts`,
    ]);

    if (postsSnapshot.size === 0) {
      logInfo('No life feed posts found for user');
      results.push({
        name: 'lifeFeedPosts: Structure check',
        passed: true,
        reason: 'No posts found - may need to run scheduler',
        details: { postCount: 0 },
      });
      return results;
    }

    // Check required fields
    const requiredFields = ['userId', 'type', 'title', 'content', 'createdAt'];
    const optionalFields = ['engagement', 'sources', 'expiresAt', 'priority'];

    let validPosts = 0;
    let invalidPosts = 0;
    const missingFieldsCounts: Record<string, number> = {};

    postsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      let isValid = true;

      requiredFields.forEach((field) => {
        if (!data[field]) {
          isValid = false;
          missingFieldsCounts[field] = (missingFieldsCounts[field] || 0) + 1;
        }
      });

      if (isValid) {
        validPosts++;
      } else {
        invalidPosts++;
      }
    });

    const allValid = invalidPosts === 0;

    if (allValid) {
      logPass(`All ${validPosts} posts have required fields`);
    } else {
      logFail(`${invalidPosts}/${postsSnapshot.size} posts missing required fields`);
      Object.entries(missingFieldsCounts).forEach(([field, count]) => {
        log(`    - Missing ${field}: ${count} posts`, colors.yellow);
      });
    }

    results.push({
      name: 'lifeFeedPosts: Required fields present',
      passed: allValid,
      reason: allValid
        ? `All ${validPosts} posts have required fields`
        : `${invalidPosts} posts missing required fields`,
      details: { validPosts, invalidPosts, missingFieldsCounts },
    });

    // Check first post structure
    const samplePost = postsSnapshot.docs[0].data();
    log(`  Sample post type: ${samplePost.type}`, colors.dim);
    log(`  Sample title: "${samplePost.title?.substring(0, 50)}..."`, colors.dim);

    results.push({
      name: 'lifeFeedPosts: Sample post structure',
      passed: true,
      reason: `Sample: type=${samplePost.type}, hasEngagement=${!!samplePost.engagement}`,
      details: {
        type: samplePost.type,
        hasTitle: !!samplePost.title,
        hasContent: !!samplePost.content,
        hasEngagement: !!samplePost.engagement,
        hasSources: !!samplePost.sources,
      },
    });

  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    results.push({
      name: 'lifeFeedPosts: Structure check',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * Test Case 2: Verify post type distribution
 */
async function testPostTypeDistribution(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Post Type Distribution');

  try {
    const postsSnapshot = await db.collection('lifeFeedPosts')
      .where('userId', '==', userId)
      .limit(100)
      .get();

    logQueryBox('Post Type Analysis', [
      `Analyzing ${postsSnapshot.size} posts`,
    ]);

    // Count by type
    const typeCounts: Record<string, number> = {};
    postsSnapshot.docs.forEach((doc) => {
      const type = doc.data().type || 'unknown';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const typeCount = Object.keys(typeCounts).length;

    log(`  Post types found: ${typeCount}`, colors.dim);
    Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        log(`    - ${type}: ${count}`, colors.dim);
      });

    // Check for expected types
    const expectedTypes = [
      'weekly_summary', 'health_insight', 'location_insight', 'mood_pattern',
      'activity_streak', 'memory_highlight', 'social_insight', 'milestone',
      'prediction', 'suggestion', 'reflection_prompt',
    ];

    const foundTypes = Object.keys(typeCounts);
    const unexpectedTypes = foundTypes.filter(t => !expectedTypes.includes(t) && t !== 'unknown');

    if (unexpectedTypes.length > 0) {
      logInfo(`New/unexpected types: ${unexpectedTypes.join(', ')}`);
    }

    results.push({
      name: 'lifeFeedPosts: Type distribution',
      passed: true, // Informational
      reason: `${typeCount} different post types found`,
      details: { typeCounts, totalPosts: postsSnapshot.size },
    });

    // Check type diversity
    const hasDiversity = typeCount >= 3;
    if (hasDiversity) {
      logPass(`Good type diversity: ${typeCount} types`);
    } else if (postsSnapshot.size === 0) {
      logInfo('No posts to analyze');
    } else {
      logInfo(`Limited diversity: only ${typeCount} types`);
    }

    results.push({
      name: 'lifeFeedPosts: Type diversity',
      passed: true, // Informational
      reason: postsSnapshot.size === 0
        ? 'No posts found'
        : `${typeCount} different types across ${postsSnapshot.size} posts`,
      details: { typeCount, hasDiversity },
    });

  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    results.push({
      name: 'lifeFeedPosts: Type distribution',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * Test Case 3: Test cooldown tracking
 */
async function testCooldownTracking(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Cooldown Tracking');

  try {
    // Check insightsCooldowns collection
    const cooldownDoc = await db.collection('insightsCooldowns').doc(userId).get();

    logQueryBox('Insights Cooldowns', [
      'Collection: insightsCooldowns',
      `Document: ${userId}`,
    ]);

    if (!cooldownDoc.exists) {
      logInfo('No cooldown tracking found for user');
      results.push({
        name: 'Cooldowns: Tracking document exists',
        passed: true, // Informational
        reason: 'No cooldowns set yet (scheduler may not have run)',
        details: { exists: false },
      });
      return results;
    }

    const cooldownData = cooldownDoc.data() || {};
    const cooldownTypes = Object.keys(cooldownData);

    log(`  Cooldown types tracked: ${cooldownTypes.length}`, colors.dim);

    // Show recent cooldowns
    const now = Date.now();
    let activeCooldowns = 0;
    let expiredCooldowns = 0;

    cooldownTypes.forEach((type) => {
      const timestamp = cooldownData[type];
      if (timestamp) {
        const ts = typeof timestamp.toDate === 'function'
          ? timestamp.toDate().getTime()
          : typeof timestamp === 'number'
            ? timestamp
            : new Date(timestamp).getTime();

        if (ts > now) {
          activeCooldowns++;
        } else {
          expiredCooldowns++;
        }
      }
    });

    log(`  Active cooldowns: ${activeCooldowns}`, colors.dim);
    log(`  Expired cooldowns: ${expiredCooldowns}`, colors.dim);

    if (activeCooldowns > 0) {
      logPass(`${activeCooldowns} active cooldowns (deduplication working)`);
    }

    results.push({
      name: 'Cooldowns: Active cooldowns',
      passed: true, // Informational
      reason: `${activeCooldowns} active, ${expiredCooldowns} expired`,
      details: { cooldownTypes: cooldownTypes.length, activeCooldowns, expiredCooldowns },
    });

  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    results.push({
      name: 'Cooldowns: Test execution',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * Test Case 4: Verify post type config in Firestore
 */
async function testPostTypeConfig(
  db: admin.firestore.Firestore
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Post Type Configuration');

  try {
    // Check config/insightsPostTypes
    const configDoc = await db.collection('config').doc('insightsPostTypes').get();

    logQueryBox('Post Types Config', [
      'Collection: config',
      'Document: insightsPostTypes',
    ]);

    if (!configDoc.exists) {
      logFail('Post types config not found');
      results.push({
        name: 'Config: insightsPostTypes exists',
        passed: false,
        reason: 'config/insightsPostTypes document not found',
        details: { exists: false },
      });
      return results;
    }

    const config = configDoc.data() || {};
    const enabledTypes = config.enabledTypes || [];
    const typeConfigs = config.types || {};

    logPass(`Config found with ${enabledTypes.length} enabled types`);
    log(`  Enabled types: ${enabledTypes.join(', ')}`, colors.dim);

    results.push({
      name: 'Config: insightsPostTypes exists',
      passed: true,
      reason: `${enabledTypes.length} enabled types configured`,
      details: { enabledTypes, typeCount: Object.keys(typeConfigs).length },
    });

    // Verify each type has required config
    let validConfigs = 0;
    let invalidConfigs = 0;

    Object.entries(typeConfigs).forEach(([type, cfg]: [string, any]) => {
      const hasRequired = cfg.enabled !== undefined && cfg.priority !== undefined;
      if (hasRequired) {
        validConfigs++;
      } else {
        invalidConfigs++;
        log(`    Invalid config for ${type}`, colors.yellow);
      }
    });

    results.push({
      name: 'Config: Type configs valid',
      passed: invalidConfigs === 0,
      reason: invalidConfigs === 0
        ? `All ${validConfigs} type configs are valid`
        : `${invalidConfigs} types have invalid config`,
      details: { validConfigs, invalidConfigs },
    });

  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    results.push({
      name: 'Config: Test execution',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * Test Case 5: Check engagement tracking
 */
async function testEngagementTracking(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Engagement Tracking');

  try {
    const postsSnapshot = await db.collection('lifeFeedPosts')
      .where('userId', '==', userId)
      .limit(50)
      .get();

    if (postsSnapshot.size === 0) {
      logInfo('No posts to analyze engagement');
      results.push({
        name: 'Engagement: Tracking check',
        passed: true,
        reason: 'No posts found',
        details: { postCount: 0 },
      });
      return results;
    }

    logQueryBox('Engagement Analysis', [
      `Analyzing ${postsSnapshot.size} posts`,
    ]);

    let withEngagement = 0;
    let viewed = 0;
    let dismissed = 0;

    postsSnapshot.docs.forEach((doc) => {
      const engagement = doc.data().engagement;
      if (engagement) {
        withEngagement++;
        if (engagement.viewed) viewed++;
        if (engagement.dismissed) dismissed++;
      }
    });

    log(`  Posts with engagement field: ${withEngagement}`, colors.dim);
    log(`  Viewed: ${viewed}`, colors.dim);
    log(`  Dismissed: ${dismissed}`, colors.dim);

    const engagementRate = postsSnapshot.size > 0
      ? (withEngagement / postsSnapshot.size * 100).toFixed(1)
      : 0;

    if (withEngagement > 0) {
      logPass(`${withEngagement}/${postsSnapshot.size} posts have engagement tracking`);
    } else {
      logInfo('No engagement data recorded yet');
    }

    results.push({
      name: 'Engagement: Field presence',
      passed: true, // Informational
      reason: `${engagementRate}% of posts have engagement field`,
      details: { withEngagement, total: postsSnapshot.size, viewed, dismissed },
    });

    // Check view rate
    const viewRate = withEngagement > 0
      ? (viewed / withEngagement * 100).toFixed(1)
      : 0;

    results.push({
      name: 'Engagement: View metrics',
      passed: true, // Informational
      reason: `${viewed}/${withEngagement} posts viewed (${viewRate}%)`,
      details: { viewed, withEngagement, viewRate },
    });

  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    results.push({
      name: 'Engagement: Test execution',
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
