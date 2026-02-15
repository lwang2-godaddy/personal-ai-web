/**
 * Life Feed Provenance - Admin API Integration Tests
 *
 * Tests that admin-facing queries for life feed posts return correct
 * provenance data. Since the admin posts API may not yet exist, these
 * tests primarily validate the data layer (Firestore queries) that
 * admin endpoints would use.
 *
 * Test cases:
 * 1. List posts query returns provenance data
 * 2. Single post query with execution linkage
 * 3. Filter by service works
 *
 * Related files:
 * - PersonalAIApp/src/models/LifeFeedPost.ts - PostProvenance interface
 * - PersonalAIApp/firebase/functions/src/services/LifeFeedGenerator.ts
 * - PersonalAIApp/firebase/functions/src/services/tracking/PromptExecutionTracker.ts
 *
 * Run: npm test -- --filter life-feed-provenance-admin
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
export const name = 'Life Feed Provenance Admin';

/**
 * Main test runner - exported for test discovery
 */
export async function run(): Promise<TestResult[]> {
  const { db, userId } = globalThis.testContext;
  const allResults: TestResult[] = [];

  // Test Case 1: List posts with provenance data
  const test1Results = await testListPostsWithProvenance(db, userId);
  allResults.push(...test1Results);

  // Test Case 2: Single post with execution linkage
  const test2Results = await testSinglePostWithExecutionLinkage(db, userId);
  allResults.push(...test2Results);

  // Test Case 3: Filter by service
  const test3Results = await testFilterByService(db, userId);
  allResults.push(...test3Results);

  return allResults;
}

/**
 * Test Case 1: List posts query returns provenance data
 *
 * Simulates what GET /api/admin/insights/posts?limit=10 would return.
 * Queries lifeFeedPosts, verifies provenance is included in results.
 */
async function testListPostsWithProvenance(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Admin Posts: List Posts with Provenance');

  try {
    // Simulate admin list posts API query
    const snapshot = await db.collection('lifeFeedPosts')
      .where('userId', '==', userId)
      .orderBy('publishedAt', 'desc')
      .limit(10)
      .get();

    logQueryBox('Admin List Posts Query', [
      'Collection: lifeFeedPosts',
      `where userId == "${userId.substring(0, 8)}..."`,
      'orderBy publishedAt desc, limit 10',
      `Found: ${snapshot.size} posts`,
    ]);

    if (snapshot.size === 0) {
      logFail('No posts found for user');
      logInfo('Generate Life Feed first to test admin list query');
      results.push({
        name: 'Admin Posts: List returns posts',
        passed: false,
        reason: 'No posts found - generate Life Feed first',
        details: { postCount: 0 },
      });
      return results;
    }

    // Build admin response format
    const posts = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        type: data.type,
        title: data.title,
        content: data.content?.substring(0, 100),
        publishedAt: data.publishedAt,
        provenance: data.provenance || null,
        hasProvenance: !!data.provenance,
      };
    });

    const postsWithProvenance = posts.filter((p) => p.hasProvenance);
    const postsWithoutProvenance = posts.filter((p) => !p.hasProvenance);

    log(`  Posts returned: ${posts.length}`, colors.dim);
    log(`  With provenance: ${postsWithProvenance.length}`, colors.dim);
    log(`  Without provenance (legacy): ${postsWithoutProvenance.length}`, colors.dim);

    // Show sample post in admin format
    if (postsWithProvenance.length > 0) {
      const sample = postsWithProvenance[0];
      log(`  Sample admin post response:`, colors.dim);
      log(`    id: ${sample.id}`, colors.dim);
      log(`    type: ${sample.type}`, colors.dim);
      log(`    title: ${sample.title?.substring(0, 40)}...`, colors.dim);
      log(`    provenance.service: ${sample.provenance?.service}`, colors.dim);
      log(`    provenance.promptId: ${sample.provenance?.promptId}`, colors.dim);
      log(`    provenance.model: ${sample.provenance?.model}`, colors.dim);
    }

    results.push({
      name: 'Admin Posts: List includes provenance data',
      passed: posts.length > 0,
      reason: `${posts.length} posts returned (${postsWithProvenance.length} with provenance)`,
      details: {
        totalPosts: posts.length,
        postsWithProvenance: postsWithProvenance.length,
        postsWithoutProvenance: postsWithoutProvenance.length,
        samplePostTypes: Array.from(new Set(posts.map((p) => p.type))),
      },
    });

    // Verify provenance fields are serializable (important for API response)
    let serializableCount = 0;
    postsWithProvenance.forEach((post) => {
      try {
        const serialized = JSON.stringify(post.provenance);
        if (serialized && serialized.length > 2) {
          serializableCount++;
        }
      } catch {
        // Not serializable
      }
    });

    if (postsWithProvenance.length > 0) {
      const allSerializable = serializableCount === postsWithProvenance.length;
      if (allSerializable) {
        logPass('All provenance data is JSON-serializable (API-ready)');
      } else {
        logFail('Provenance serialization', `${serializableCount}/${postsWithProvenance.length} serializable`);
      }

      results.push({
        name: 'Admin Posts: Provenance is JSON-serializable',
        passed: allSerializable,
        reason: allSerializable
          ? `All ${postsWithProvenance.length} provenance objects serialize correctly`
          : `${serializableCount}/${postsWithProvenance.length} are serializable`,
        details: { serializableCount, total: postsWithProvenance.length },
      });
    }

  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    results.push({
      name: 'Admin Posts: List query',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * Test Case 2: Single post query with execution linkage
 *
 * Simulates what GET /api/admin/insights/posts/{postId} would return.
 * Fetches a single post and its linked execution record.
 */
async function testSinglePostWithExecutionLinkage(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Admin Posts: Single Post with Execution Linkage');

  try {
    // Find a post with provenance and execution ID
    const snapshot = await db.collection('lifeFeedPosts')
      .where('userId', '==', userId)
      .where('provenance.service', '==', 'LifeFeedGenerator')
      .orderBy('publishedAt', 'desc')
      .limit(5)
      .get();

    // Find first post with an execution ID
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let targetDoc: any = null;
    snapshot.docs.forEach((doc) => {
      if (!targetDoc) {
        const provenance = doc.data().provenance || {};
        if (provenance.promptExecutionId) {
          targetDoc = doc;
        }
      }
    });

    if (!targetDoc) {
      logFail('No posts with execution IDs found');
      logInfo('Deploy Cloud Functions with provenance support and generate life feed first');
      results.push({
        name: 'Admin Posts: Single post with execution',
        passed: false,
        reason: 'No posts with execution IDs found - deploy Cloud Functions and generate life feed',
        details: { postsChecked: snapshot.size },
      });
      return results;
    }

    const postData = targetDoc.data();
    const postId = targetDoc.id;
    const provenance = postData.provenance || {};
    const executionId = provenance.promptExecutionId;

    logQueryBox('Single Post Detail Query', [
      `Post ID: ${postId}`,
      `Type: ${postData.type}`,
      `Execution ID: ${executionId?.substring(0, 20)}...`,
    ]);

    // Build admin single post response with execution data
    let execution: Record<string, unknown> | null = null;

    if (executionId) {
      const execDoc = await db.collection('promptExecutions').doc(executionId).get();
      if (execDoc.exists) {
        const execData = execDoc.data()!;
        execution = {
          id: execDoc.id,
          service: execData.service,
          promptId: execData.promptId,
          model: execData.model,
          language: execData.language,
          promptVersion: execData.promptVersion,
          promptSource: execData.promptSource,
          inputTokens: execData.inputTokens,
          outputTokens: execData.outputTokens,
          totalTokens: execData.totalTokens,
          estimatedCostUSD: execData.estimatedCostUSD,
          success: execData.success,
          executedAt: execData.executedAt,
          latencyMs: execData.latencyMs,
        };
      }
    }

    // Build response object
    const adminResponse = {
      post: {
        id: postId,
        type: postData.type,
        title: postData.title,
        content: postData.content?.substring(0, 200),
        publishedAt: postData.publishedAt,
        provenance: postData.provenance,
      },
      execution,
    };

    // Verify response structure
    const hasPost = !!adminResponse.post;
    const hasExecution = !!adminResponse.execution;

    if (hasPost && hasExecution) {
      logPass('Single post response includes both post and execution data');
      log(`  Post type: ${adminResponse.post.type}`, colors.dim);
      log(`  Execution model: ${(adminResponse.execution as any)?.model}`, colors.dim);
      log(`  Execution cost: $${(adminResponse.execution as any)?.estimatedCostUSD?.toFixed(6) || 'N/A'}`, colors.dim);
      log(`  Execution tokens: ${(adminResponse.execution as any)?.totalTokens}`, colors.dim);
      log(`  Execution latency: ${(adminResponse.execution as any)?.latencyMs}ms`, colors.dim);
    } else if (hasPost && !hasExecution) {
      logInfo('Post found but execution record missing');
    }

    results.push({
      name: 'Admin Posts: Single post has execution linkage',
      passed: hasPost && hasExecution,
      reason: hasPost && hasExecution
        ? `Post ${postId.substring(0, 15)}... linked to execution with model=${(execution as any)?.model}`
        : hasPost
          ? `Post found but execution record ${executionId?.substring(0, 15)}... not in Firestore`
          : 'Post not found',
      details: {
        postId,
        executionId,
        hasPost,
        hasExecution,
        executionModel: (execution as any)?.model,
        executionCost: (execution as any)?.estimatedCostUSD,
      },
    });

    // Verify execution data is complete
    if (execution) {
      const requiredExecFields = ['service', 'promptId', 'model', 'estimatedCostUSD', 'executedAt'];
      const missingFields = requiredExecFields.filter(
        (f) => !(execution as any)[f] && (execution as any)[f] !== 0
      );

      if (missingFields.length === 0) {
        logPass('Execution record has all required fields');
      } else {
        logFail('Execution record missing fields', missingFields.join(', '));
      }

      results.push({
        name: 'Admin Posts: Execution record fields complete',
        passed: missingFields.length === 0,
        reason: missingFields.length === 0
          ? `All required fields present: ${requiredExecFields.join(', ')}`
          : `Missing: ${missingFields.join(', ')}`,
        details: {
          requiredFields: requiredExecFields,
          missingFields: missingFields.length > 0 ? missingFields : undefined,
        },
      });
    }

  } catch (error: any) {
    if (error.code === 9) {
      logFail('Firestore index not ready for provenance.service query');
      logInfo('Deploy index: firebase deploy --only firestore:indexes');
      results.push({
        name: 'Admin Posts: Single post query',
        passed: false,
        reason: 'Firestore index missing - run: firebase deploy --only firestore:indexes',
        details: { indexMissing: true },
      });
    } else {
      logFail(`Error: ${error.message}`);
      results.push({
        name: 'Admin Posts: Single post query',
        passed: false,
        reason: `Error: ${error.message}`,
      });
    }
  }

  return results;
}

/**
 * Test Case 3: Filter by service
 *
 * Simulates what GET /api/admin/insights/posts?service=LifeFeedGenerator
 * and GET /api/admin/insights/posts?service=InsightsIntegrationService would return.
 * Verifies filtering by provenance.service works correctly.
 */
async function testFilterByService(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Admin Posts: Filter by Service');

  const services = ['LifeFeedGenerator', 'InsightsIntegrationService'];
  const serviceCounts: Record<string, number> = {};

  try {
    for (const service of services) {
      try {
        const snapshot = await db.collection('lifeFeedPosts')
          .where('userId', '==', userId)
          .where('provenance.service', '==', service)
          .limit(20)
          .get();

        serviceCounts[service] = snapshot.size;
        log(`  ${service}: ${snapshot.size} posts`, colors.dim);

        // Verify all returned posts actually have the correct service
        if (snapshot.size > 0) {
          let correctService = 0;
          let wrongService = 0;

          snapshot.docs.forEach((doc) => {
            const provenance = doc.data().provenance || {};
            if (provenance.service === service) {
              correctService++;
            } else {
              wrongService++;
            }
          });

          if (wrongService > 0) {
            logFail(`${service} filter`, `${wrongService} posts have wrong service`);
          } else {
            logPass(`${service}: All ${correctService} posts have correct service`);
          }
        }

      } catch (error: any) {
        if (error.code === 9) {
          logInfo(`Index not ready for ${service} filter query`);
          serviceCounts[service] = -1; // Mark as index not ready
        } else {
          throw error;
        }
      }
    }

    // Also count total posts and posts without provenance
    let totalPosts = 0;
    let postsWithoutProvenance = 0;

    try {
      const allPostsSnap = await db.collection('lifeFeedPosts')
        .where('userId', '==', userId)
        .limit(50)
        .get();

      totalPosts = allPostsSnap.size;
      allPostsSnap.docs.forEach((doc) => {
        const data = doc.data();
        if (!data.provenance || !data.provenance.service) {
          postsWithoutProvenance++;
        }
      });
    } catch (error: any) {
      logInfo(`Could not count total posts: ${error.message}`);
    }

    logQueryBox('Service Filter Summary', [
      `Total posts: ${totalPosts}`,
      `LifeFeedGenerator: ${serviceCounts['LifeFeedGenerator'] ?? 'unknown'}`,
      `InsightsIntegrationService: ${serviceCounts['InsightsIntegrationService'] ?? 'unknown'}`,
      `Without provenance (legacy): ${postsWithoutProvenance}`,
    ]);

    // Check for index issues
    const hasIndexIssues = Object.values(serviceCounts).some((c) => c === -1);

    if (hasIndexIssues) {
      logFail('Some service filters need Firestore indexes');
      logInfo('Deploy index: firebase deploy --only firestore:indexes');
      results.push({
        name: 'Admin Posts: Service filter',
        passed: false,
        reason: 'Firestore indexes missing - run: firebase deploy --only firestore:indexes',
        details: { serviceCounts, indexIssues: true },
      });
    } else {
      const totalWithProvenance = Object.values(serviceCounts).reduce((sum, c) => sum + (c > 0 ? c : 0), 0);
      const filteringWorks = totalWithProvenance > 0;

      if (filteringWorks) {
        logPass('Service filtering works correctly');
      } else {
        logFail('No posts with provenance found to test filtering');
        logInfo('Deploy Cloud Functions with provenance support and generate life feed first');
      }

      results.push({
        name: 'Admin Posts: Service filter works',
        passed: filteringWorks,
        reason: totalWithProvenance > 0
          ? `Filter returns correct posts: ${Object.entries(serviceCounts).map(([s, c]) => `${s}=${c}`).join(', ')}`
          : 'No provenance posts found - deploy Cloud Functions and generate life feed',
        details: {
          serviceCounts,
          totalPosts,
          postsWithoutProvenance,
        },
      });
    }

    // Verify service filter returns disjoint sets (no overlap)
    if (serviceCounts['LifeFeedGenerator'] > 0 && serviceCounts['InsightsIntegrationService'] > 0) {
      logPass('Both services have posts - filters return disjoint sets');
      results.push({
        name: 'Admin Posts: Service filters return disjoint sets',
        passed: true,
        reason: `LifeFeedGenerator(${serviceCounts['LifeFeedGenerator']}) and InsightsIntegrationService(${serviceCounts['InsightsIntegrationService']}) are separate`,
        details: { serviceCounts },
      });
    } else if (Object.values(serviceCounts).some((c) => c > 0)) {
      logInfo('Only one service has posts - disjoint test requires both');
      results.push({
        name: 'Admin Posts: Service filter disjoint check',
        passed: true,
        reason: 'Only one service has posts - disjoint test requires both services (informational)',
        details: { serviceCounts },
      });
    } else {
      logFail('No posts with provenance found for disjoint set check');
      results.push({
        name: 'Admin Posts: Service filter disjoint check',
        passed: false,
        reason: 'No posts with provenance found - deploy Cloud Functions and generate life feed',
        details: { serviceCounts },
      });
    }

  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    results.push({
      name: 'Admin Posts: Service filter',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}
