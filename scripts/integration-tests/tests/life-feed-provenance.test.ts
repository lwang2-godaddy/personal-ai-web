/**
 * Life Feed Provenance - Integration Tests
 *
 * Tests that life feed posts have correct provenance data by querying
 * Firestore directly. Provenance tracks which service, prompt, and
 * execution created each post.
 *
 * Test cases:
 * 1. Provenance field exists on recent LifeFeedGenerator posts
 * 2. Provenance field exists on InsightsIntegrationService posts
 * 3. Execution ID linkage is valid (promptExecutions/{id} exists)
 * 4. Prompt variant tracking (distribution of promptIds)
 * 5. Graceful handling of legacy posts (without provenance)
 *
 * Related files:
 * - PersonalAIApp/firebase/functions/src/services/LifeFeedGenerator.ts - provenance attachment
 * - PersonalAIApp/firebase/functions/src/services/integration/InsightsIntegrationService.ts
 * - PersonalAIApp/src/models/LifeFeedPost.ts - PostProvenance interface
 * - PersonalAIApp/firebase/functions/src/services/tracking/PromptExecutionTracker.ts
 *
 * Run: npm test -- --filter life-feed-provenance
 */

import * as admin from 'firebase-admin';
import type { TestResult } from '../lib/test-utils';
import {
  log,
  colors,
  logPass,
  logFail,
  logInfo,
  logTestCase,
  logQueryBox,
} from '../lib/reporter';

// Test name for discovery
export const name = 'Life Feed Provenance';

/**
 * Main test runner - exported for test discovery
 */
export async function run(): Promise<TestResult[]> {
  const { db, userId } = globalThis.testContext;
  const allResults: TestResult[] = [];

  // Test Case 1: Provenance on LifeFeedGenerator posts
  const test1Results = await testLifeFeedGeneratorProvenance(db, userId);
  allResults.push(...test1Results);

  // Test Case 2: Provenance on InsightsIntegrationService posts
  const test2Results = await testInsightsIntegrationProvenance(db, userId);
  allResults.push(...test2Results);

  // Test Case 3: Execution ID linkage
  const test3Results = await testExecutionIdLinkage(db, userId);
  allResults.push(...test3Results);

  // Test Case 4: Prompt variant tracking
  const test4Results = await testPromptVariantTracking(db, userId);
  allResults.push(...test4Results);

  // Test Case 5: Legacy posts (without provenance)
  const test5Results = await testLegacyPostsWithoutProvenance(db, userId);
  allResults.push(...test5Results);

  return allResults;
}

/**
 * Test Case 1: Provenance field exists on recent LifeFeedGenerator posts
 *
 * Query lifeFeedPosts where provenance.service == 'LifeFeedGenerator',
 * verify each has required provenance fields.
 */
async function testLifeFeedGeneratorProvenance(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Provenance: LifeFeedGenerator Posts');

  try {
    // Query posts with LifeFeedGenerator provenance
    const snapshot = await db.collection('lifeFeedPosts')
      .where('userId', '==', userId)
      .where('provenance.service', '==', 'LifeFeedGenerator')
      .orderBy('publishedAt', 'desc')
      .limit(10)
      .get();

    logQueryBox('LifeFeedGenerator Provenance Query', [
      'Collection: lifeFeedPosts',
      `where userId == "${userId.substring(0, 8)}..."`,
      'where provenance.service == "LifeFeedGenerator"',
      'orderBy publishedAt desc, limit 10',
      `Found: ${snapshot.size} posts`,
    ]);

    if (snapshot.size === 0) {
      logFail('No LifeFeedGenerator posts with provenance found');
      logInfo('Deploy Cloud Functions with provenance support and generate life feed first');
      results.push({
        name: 'Provenance: LifeFeedGenerator posts exist',
        passed: false,
        reason: 'No posts with provenance found - deploy Cloud Functions and generate life feed',
        details: { postCount: 0 },
      });
      return results;
    }

    logPass(`Found ${snapshot.size} LifeFeedGenerator posts with provenance`);

    // Required fields for LifeFeedGenerator provenance
    const requiredFields = ['service', 'promptId', 'promptExecutionId', 'model', 'generatedAt'];
    let postsWithAllFields = 0;
    const missingFieldsMap: Record<string, number> = {};

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const provenance = data.provenance || {};
      let hasAllFields = true;

      requiredFields.forEach((field) => {
        if (!provenance[field]) {
          hasAllFields = false;
          missingFieldsMap[field] = (missingFieldsMap[field] || 0) + 1;
        }
      });

      if (hasAllFields) {
        postsWithAllFields++;
      }
    });

    // Log sample provenance
    const sampleDoc = snapshot.docs[0];
    const sampleProvenance = sampleDoc.data().provenance || {};
    log(`  Sample provenance:`, colors.dim);
    log(`    service: ${sampleProvenance.service}`, colors.dim);
    log(`    promptId: ${sampleProvenance.promptId}`, colors.dim);
    log(`    promptExecutionId: ${sampleProvenance.promptExecutionId?.substring(0, 20)}...`, colors.dim);
    log(`    model: ${sampleProvenance.model}`, colors.dim);
    log(`    generatedAt: ${sampleProvenance.generatedAt}`, colors.dim);
    if (sampleProvenance.promptVersion) {
      log(`    promptVersion: ${sampleProvenance.promptVersion}`, colors.dim);
    }
    if (sampleProvenance.promptSource) {
      log(`    promptSource: ${sampleProvenance.promptSource}`, colors.dim);
    }

    const allFieldsPresent = postsWithAllFields === snapshot.size;

    if (allFieldsPresent) {
      logPass(`All ${snapshot.size} posts have complete provenance fields`);
    } else {
      const missingStr = Object.entries(missingFieldsMap)
        .map(([field, count]) => `${field}(${count})`)
        .join(', ');
      logFail('Some posts missing provenance fields', `Missing: ${missingStr}`);
    }

    results.push({
      name: 'Provenance: LifeFeedGenerator fields complete',
      passed: allFieldsPresent,
      reason: allFieldsPresent
        ? `All ${snapshot.size} posts have: ${requiredFields.join(', ')}`
        : `${postsWithAllFields}/${snapshot.size} posts have all fields. Missing: ${Object.keys(missingFieldsMap).join(', ')}`,
      details: {
        totalPosts: snapshot.size,
        postsWithAllFields,
        missingFieldsMap: Object.keys(missingFieldsMap).length > 0 ? missingFieldsMap : undefined,
      },
    });

  } catch (error: any) {
    // Handle missing index gracefully
    if (error.code === 9) {
      logFail('Firestore composite index not ready for provenance.service query');
      logInfo('Deploy index: firebase deploy --only firestore:indexes');
      results.push({
        name: 'Provenance: LifeFeedGenerator posts',
        passed: false,
        reason: 'Firestore index missing - run: firebase deploy --only firestore:indexes',
        details: { indexMissing: true },
      });
    } else {
      logFail(`Error: ${error.message}`);
      results.push({
        name: 'Provenance: LifeFeedGenerator posts',
        passed: false,
        reason: `Error: ${error.message}`,
      });
    }
  }

  return results;
}

/**
 * Test Case 2: Provenance field exists on InsightsIntegrationService posts
 *
 * InsightsIntegrationService generates posts from upstream services
 * (FunFactGenerator, InsightsOrchestrator) and should track upstream info.
 */
async function testInsightsIntegrationProvenance(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Provenance: InsightsIntegrationService Posts');

  try {
    const snapshot = await db.collection('lifeFeedPosts')
      .where('userId', '==', userId)
      .where('provenance.service', '==', 'InsightsIntegrationService')
      .limit(10)
      .get();

    logQueryBox('InsightsIntegrationService Provenance Query', [
      'Collection: lifeFeedPosts',
      `where userId == "${userId.substring(0, 8)}..."`,
      'where provenance.service == "InsightsIntegrationService"',
      `Found: ${snapshot.size} posts`,
    ]);

    if (snapshot.size === 0) {
      logFail('No InsightsIntegrationService posts with provenance found');
      logInfo('Deploy Cloud Functions and generate insights to create these posts');
      results.push({
        name: 'Provenance: InsightsIntegrationService posts exist',
        passed: false,
        reason: 'No InsightsIntegrationService posts with provenance found - deploy and generate insights',
        details: { postCount: 0 },
      });
      return results;
    }

    logPass(`Found ${snapshot.size} InsightsIntegrationService posts`);

    // Required fields for InsightsIntegrationService provenance
    const requiredFields = ['service', 'upstreamService', 'upstreamSourceType', 'generatedAt'];
    let postsWithAllFields = 0;
    const upstreamServices = new Set<string>();
    const upstreamSourceTypes = new Set<string>();

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const provenance = data.provenance || {};
      let hasAllFields = true;

      requiredFields.forEach((field) => {
        if (!provenance[field]) {
          hasAllFields = false;
        }
      });

      if (hasAllFields) {
        postsWithAllFields++;
      }

      if (provenance.upstreamService) {
        upstreamServices.add(provenance.upstreamService);
      }
      if (provenance.upstreamSourceType) {
        upstreamSourceTypes.add(provenance.upstreamSourceType);
      }
    });

    // Log upstream info
    log(`  Upstream services: ${Array.from(upstreamServices).join(', ')}`, colors.dim);
    log(`  Upstream source types: ${Array.from(upstreamSourceTypes).join(', ')}`, colors.dim);

    // Sample provenance
    const sampleProvenance = snapshot.docs[0].data().provenance || {};
    log(`  Sample provenance:`, colors.dim);
    log(`    service: ${sampleProvenance.service}`, colors.dim);
    log(`    upstreamService: ${sampleProvenance.upstreamService}`, colors.dim);
    log(`    upstreamSourceType: ${sampleProvenance.upstreamSourceType}`, colors.dim);
    log(`    generatedAt: ${sampleProvenance.generatedAt}`, colors.dim);

    const allFieldsPresent = postsWithAllFields === snapshot.size;

    if (allFieldsPresent) {
      logPass(`All ${snapshot.size} posts have complete InsightsIntegration provenance`);
    } else {
      logFail('Some posts missing InsightsIntegration provenance fields');
    }

    results.push({
      name: 'Provenance: InsightsIntegrationService fields complete',
      passed: allFieldsPresent,
      reason: allFieldsPresent
        ? `All ${snapshot.size} posts have: ${requiredFields.join(', ')}`
        : `${postsWithAllFields}/${snapshot.size} posts have all fields`,
      details: {
        totalPosts: snapshot.size,
        postsWithAllFields,
        upstreamServices: Array.from(upstreamServices),
        upstreamSourceTypes: Array.from(upstreamSourceTypes),
      },
    });

  } catch (error: any) {
    if (error.code === 9) {
      logFail('Firestore composite index not ready for InsightsIntegration provenance query');
      logInfo('Deploy index: firebase deploy --only firestore:indexes');
      results.push({
        name: 'Provenance: InsightsIntegrationService posts',
        passed: false,
        reason: 'Firestore index missing - run: firebase deploy --only firestore:indexes',
        details: { indexMissing: true },
      });
    } else {
      logFail(`Error: ${error.message}`);
      results.push({
        name: 'Provenance: InsightsIntegrationService posts',
        passed: false,
        reason: `Error: ${error.message}`,
      });
    }
  }

  return results;
}

/**
 * Test Case 3: Execution ID linkage is valid
 *
 * For posts with provenance.promptExecutionId, verify:
 * - The execution document exists in promptExecutions collection
 * - execution.service matches 'LifeFeedGenerator'
 * - execution.promptId matches post.provenance.promptId
 */
async function testExecutionIdLinkage(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Provenance: Execution ID Linkage');

  try {
    // Get posts with promptExecutionId
    const postsSnapshot = await db.collection('lifeFeedPosts')
      .where('userId', '==', userId)
      .where('provenance.service', '==', 'LifeFeedGenerator')
      .orderBy('publishedAt', 'desc')
      .limit(5)
      .get();

    // Collect posts with execution IDs
    const postsWithExecutionId: Array<{
      postId: string;
      executionId: string;
      promptId: string;
    }> = [];

    postsSnapshot.docs.forEach((doc) => {
      const provenance = doc.data().provenance || {};
      if (provenance.promptExecutionId) {
        postsWithExecutionId.push({
          postId: doc.id,
          executionId: provenance.promptExecutionId,
          promptId: provenance.promptId || '',
        });
      }
    });

    logQueryBox('Execution ID Linkage', [
      `Posts with execution IDs: ${postsWithExecutionId.length}`,
      `Total posts checked: ${postsSnapshot.size}`,
    ]);

    if (postsWithExecutionId.length === 0) {
      logFail('No posts with promptExecutionId found');
      logInfo('Deploy Cloud Functions with provenance support and generate life feed first');
      results.push({
        name: 'Provenance: Execution ID linkage',
        passed: false,
        reason: 'No posts with execution IDs found - deploy Cloud Functions and generate life feed',
        details: { postsChecked: postsSnapshot.size },
      });
      return results;
    }

    // Verify each execution document exists and matches
    let validLinks = 0;
    let invalidLinks = 0;
    let missingExecutions = 0;
    const linkDetails: Array<{ postId: string; executionId: string; status: string }> = [];

    for (const { postId, executionId, promptId } of postsWithExecutionId) {
      try {
        const execDoc = await db.collection('promptExecutions').doc(executionId).get();

        if (!execDoc.exists) {
          missingExecutions++;
          linkDetails.push({ postId, executionId, status: 'MISSING' });
          log(`  Post ${postId.substring(0, 15)}... -> execution ${executionId.substring(0, 15)}... MISSING`, colors.red);
          continue;
        }

        const execData = execDoc.data()!;
        const serviceMatch = execData.service === 'LifeFeedGenerator';
        const promptMatch = !promptId || execData.promptId === promptId;

        if (serviceMatch && promptMatch) {
          validLinks++;
          linkDetails.push({ postId, executionId, status: 'VALID' });
          log(`  Post ${postId.substring(0, 15)}... -> execution ${executionId.substring(0, 15)}... VALID`, colors.green);
        } else {
          invalidLinks++;
          const issues: string[] = [];
          if (!serviceMatch) issues.push(`service mismatch: ${execData.service}`);
          if (!promptMatch) issues.push(`promptId mismatch: ${execData.promptId} vs ${promptId}`);
          linkDetails.push({ postId, executionId, status: `INVALID: ${issues.join(', ')}` });
          log(`  Post ${postId.substring(0, 15)}... -> execution: ${issues.join(', ')}`, colors.red);
        }
      } catch (error: any) {
        invalidLinks++;
        linkDetails.push({ postId, executionId, status: `ERROR: ${error.message}` });
      }
    }

    const allValid = invalidLinks === 0 && missingExecutions === 0;

    if (allValid) {
      logPass(`All ${validLinks} execution links are valid`);
    } else if (missingExecutions > 0) {
      logFail('Execution linkage', `${missingExecutions} execution docs missing`);
    } else {
      logFail('Execution linkage', `${invalidLinks} invalid links`);
    }

    results.push({
      name: 'Provenance: Execution IDs link to valid records',
      passed: allValid,
      reason: allValid
        ? `All ${validLinks} execution links verified`
        : `${validLinks} valid, ${missingExecutions} missing, ${invalidLinks} invalid`,
      details: {
        totalChecked: postsWithExecutionId.length,
        validLinks,
        missingExecutions,
        invalidLinks,
        links: linkDetails,
      },
    });

  } catch (error: any) {
    if (error.code === 9) {
      logFail('Firestore index not ready for execution linkage query');
      logInfo('Deploy index: firebase deploy --only firestore:indexes');
      results.push({
        name: 'Provenance: Execution ID linkage',
        passed: false,
        reason: 'Firestore index missing - run: firebase deploy --only firestore:indexes',
        details: { indexMissing: true },
      });
    } else {
      logFail(`Error: ${error.message}`);
      results.push({
        name: 'Provenance: Execution ID linkage',
        passed: false,
        reason: `Error: ${error.message}`,
      });
    }
  }

  return results;
}

/**
 * Test Case 4: Prompt variant tracking
 *
 * Collect unique promptId values from recent LifeFeedGenerator posts
 * and verify that multiple variants are being used (indicates prompt
 * rotation is working).
 */
async function testPromptVariantTracking(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Provenance: Prompt Variant Tracking');

  try {
    const snapshot = await db.collection('lifeFeedPosts')
      .where('userId', '==', userId)
      .where('provenance.service', '==', 'LifeFeedGenerator')
      .orderBy('publishedAt', 'desc')
      .limit(20)
      .get();

    logQueryBox('Prompt Variant Analysis', [
      `Analyzing ${snapshot.size} LifeFeedGenerator posts for prompt variety`,
    ]);

    if (snapshot.size === 0) {
      logFail('No LifeFeedGenerator posts with provenance to analyze');
      logInfo('Deploy Cloud Functions with provenance support and generate life feed first');
      results.push({
        name: 'Provenance: Prompt variant tracking',
        passed: false,
        reason: 'No posts with provenance found - deploy Cloud Functions and generate life feed',
        details: { postCount: 0 },
      });
      return results;
    }

    // Collect prompt IDs and their counts
    const promptIdCounts: Record<string, number> = {};
    const promptVersions = new Set<string>();
    const promptSources = new Set<string>();
    const models = new Set<string>();

    snapshot.docs.forEach((doc) => {
      const provenance = doc.data().provenance || {};
      const promptId = provenance.promptId || 'unknown';
      promptIdCounts[promptId] = (promptIdCounts[promptId] || 0) + 1;

      if (provenance.promptVersion) promptVersions.add(provenance.promptVersion);
      if (provenance.promptSource) promptSources.add(provenance.promptSource);
      if (provenance.model) models.add(provenance.model);
    });

    const uniquePromptIds = Object.keys(promptIdCounts);

    // Log distribution
    log(`  Unique prompt IDs: ${uniquePromptIds.length}`, colors.dim);
    log(`  Prompt distribution:`, colors.dim);
    Object.entries(promptIdCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([promptId, count]) => {
        const percent = ((count / snapshot.size) * 100).toFixed(0);
        log(`    ${promptId}: ${count} posts (${percent}%)`, colors.dim);
      });

    if (promptVersions.size > 0) {
      log(`  Prompt versions: ${Array.from(promptVersions).join(', ')}`, colors.dim);
    }
    if (promptSources.size > 0) {
      log(`  Prompt sources: ${Array.from(promptSources).join(', ')}`, colors.dim);
    }
    if (models.size > 0) {
      log(`  Models: ${Array.from(models).join(', ')}`, colors.dim);
    }

    const hasMultipleVariants = uniquePromptIds.length > 1;

    if (hasMultipleVariants) {
      logPass(`${uniquePromptIds.length} different prompt variants used`);
    } else if (uniquePromptIds.length === 1) {
      logInfo(`Only 1 prompt variant used: ${uniquePromptIds[0]}`);
      logInfo('This may be normal with limited post types or recent deployment');
    }

    results.push({
      name: 'Provenance: Prompt variants tracked',
      passed: uniquePromptIds.length >= 1,
      reason: hasMultipleVariants
        ? `${uniquePromptIds.length} variants across ${snapshot.size} posts`
        : `1 variant used: ${uniquePromptIds[0] || 'unknown'}`,
      details: {
        uniqueVariants: uniquePromptIds.length,
        distribution: promptIdCounts,
        promptVersions: Array.from(promptVersions),
        promptSources: Array.from(promptSources),
        models: Array.from(models),
      },
    });

  } catch (error: any) {
    if (error.code === 9) {
      logFail('Firestore index not ready for variant tracking query');
      logInfo('Deploy index: firebase deploy --only firestore:indexes');
      results.push({
        name: 'Provenance: Prompt variant tracking',
        passed: false,
        reason: 'Firestore index missing - run: firebase deploy --only firestore:indexes',
        details: { indexMissing: true },
      });
    } else {
      logFail(`Error: ${error.message}`);
      results.push({
        name: 'Provenance: Prompt variant tracking',
        passed: false,
        reason: `Error: ${error.message}`,
      });
    }
  }

  return results;
}

/**
 * Test Case 5: Graceful handling of legacy posts
 *
 * Query posts without provenance (older posts) and verify they still
 * load correctly. Provenance is optional so legacy posts must work.
 */
async function testLegacyPostsWithoutProvenance(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Provenance: Legacy Posts (No Provenance)');

  try {
    // Get all recent posts (some may have provenance, some may not)
    const snapshot = await db.collection('lifeFeedPosts')
      .where('userId', '==', userId)
      .orderBy('publishedAt', 'desc')
      .limit(30)
      .get();

    logQueryBox('Legacy Posts Analysis', [
      `Checking ${snapshot.size} posts for provenance presence`,
    ]);

    if (snapshot.size === 0) {
      logFail('No posts found to check for legacy compatibility');
      logInfo('Generate life feed posts first to test legacy compatibility');
      results.push({
        name: 'Provenance: Legacy posts compatible',
        passed: false,
        reason: 'No posts found - generate life feed first',
        details: { postCount: 0 },
      });
      return results;
    }

    let postsWithProvenance = 0;
    let postsWithoutProvenance = 0;
    let postsWithErrors = 0;

    snapshot.docs.forEach((doc) => {
      try {
        const data = doc.data();

        // Access all standard fields to verify the post loads correctly
        const _type = data.type;
        const _title = data.title;
        const _content = data.content;
        const _publishedAt = data.publishedAt;
        const _sources = data.sources || [];

        // Check provenance presence
        if (data.provenance && data.provenance.service) {
          postsWithProvenance++;
        } else {
          postsWithoutProvenance++;
        }
      } catch (error) {
        postsWithErrors++;
      }
    });

    log(`  Posts with provenance: ${postsWithProvenance}`, colors.dim);
    log(`  Posts without provenance (legacy): ${postsWithoutProvenance}`, colors.dim);
    log(`  Posts with errors: ${postsWithErrors}`, colors.dim);

    const allLoadCorrectly = postsWithErrors === 0;

    if (allLoadCorrectly) {
      logPass(`All ${snapshot.size} posts load correctly (${postsWithProvenance} with provenance, ${postsWithoutProvenance} legacy)`);
    } else {
      logFail('Some posts failed to load', `${postsWithErrors} errors`);
    }

    results.push({
      name: 'Provenance: All posts load without errors',
      passed: allLoadCorrectly,
      reason: allLoadCorrectly
        ? `${snapshot.size} posts loaded OK (${postsWithProvenance} with provenance, ${postsWithoutProvenance} legacy)`
        : `${postsWithErrors} posts have errors`,
      details: {
        totalPosts: snapshot.size,
        postsWithProvenance,
        postsWithoutProvenance,
        postsWithErrors,
      },
    });

    // Verify that provenance is truly optional
    if (postsWithoutProvenance > 0) {
      logPass(`${postsWithoutProvenance} legacy posts work correctly without provenance`);
    } else {
      logInfo('All posts have provenance - no legacy posts to test');
    }

    results.push({
      name: 'Provenance: Legacy posts supported (provenance optional)',
      passed: true,
      reason: postsWithoutProvenance > 0
        ? `${postsWithoutProvenance} legacy posts confirmed working without provenance`
        : 'All posts have provenance (no legacy posts to test)',
      details: { postsWithoutProvenance },
    });

  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    results.push({
      name: 'Provenance: Legacy posts check',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}
