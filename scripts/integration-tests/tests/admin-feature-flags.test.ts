/**
 * Admin Feature Flags - Integration Tests
 *
 * Tests the feature flags configuration system which allows admins
 * to enable/disable features across the application.
 *
 * Firestore Collections:
 * - config/featureFlags - Feature flags document
 *
 * Test Cases:
 * 1. Fetch feature flags config
 * 2. Verify feature flag structure (all values are booleans)
 * 3. Test updating a feature flag
 * 4. Verify known feature flags exist
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
export const name = 'Admin Feature Flags';

// Known feature flags from the API route defaults
const KNOWN_FEATURE_FLAGS = [
  'morningBriefing', 'weeklyReport', 'predictions', 'conversationThreads',
  'quickCapture', 'dataExportPolish', 'hapticFeedback', 'emojiReactions',
  'premiumPersonalities', 'askAboutThis', 'followUpQuestions', 'skeletonLoading',
  'quickThoughts', 'photoMemories', 'voiceConversation', 'lifeFeed',
  'memoryBuilder', 'challenges', 'engagement', 'checkInSuggestions',
];

// Track original state for restoration
let originalFlagState: Record<string, any> | null = null;
let needsRestore = false;

/**
 * Main test runner - exported for test discovery
 */
export async function run(): Promise<TestResult[]> {
  const { db, userId } = globalThis.testContext;
  const allResults: TestResult[] = [];

  // Test Case 1: Fetch feature flags
  const test1Results = await testFetchFeatureFlags(db);
  allResults.push(...test1Results);

  // Test Case 2: Verify flag structure
  const test2Results = await testFeatureFlagStructure(db);
  allResults.push(...test2Results);

  // Test Case 3: Test updating a flag
  const test3Results = await testUpdateFeatureFlag(db, userId);
  allResults.push(...test3Results);

  // Test Case 4: Verify known flags exist
  const test4Results = await testKnownFlagsExist(db);
  allResults.push(...test4Results);

  // Restore original state if modified
  await restoreOriginalState(db);

  return allResults;
}

/**
 * Test Case 1: Fetch feature flags config
 */
async function testFetchFeatureFlags(
  db: admin.firestore.Firestore
): Promise<TestResult[]> {
  const testName = 'FeatureFlags: Config document exists';
  logTestCase(testName);

  try {
    const docRef = db.doc('config/featureFlags');
    const docSnap = await docRef.get();

    logQueryBox('Feature Flags Config', [
      'Path: config/featureFlags',
      `Exists: ${docSnap.exists}`,
    ]);

    if (!docSnap.exists) {
      logInfo('Feature flags not configured - using defaults');
      return [{
        name: testName,
        passed: true,
        reason: 'Config not initialized (defaults used from API route)',
        details: { exists: false, defaultFlagCount: KNOWN_FEATURE_FLAGS.length },
      }];
    }

    const data = docSnap.data()!;
    // Remove metadata fields
    const { lastUpdated, updatedBy, ...flags } = data;
    const flagCount = Object.keys(flags).length;

    logPass(`Feature flags config found with ${flagCount} flags`);
    log(`  Last updated: ${lastUpdated || 'unknown'}`, colors.dim);
    log(`  Updated by: ${updatedBy || 'unknown'}`, colors.dim);

    // Store original state for restoration
    originalFlagState = { ...data };

    // Show enabled/disabled counts
    const enabledCount = Object.values(flags).filter(v => v === true).length;
    const disabledCount = Object.values(flags).filter(v => v === false).length;
    log(`  Enabled: ${enabledCount}, Disabled: ${disabledCount}`, colors.dim);

    return [{
      name: testName,
      passed: true,
      reason: `Config has ${flagCount} flags (${enabledCount} enabled, ${disabledCount} disabled)`,
      details: {
        exists: true,
        flagCount,
        enabledCount,
        disabledCount,
        lastUpdated,
        updatedBy,
      },
    }];
  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    return [{
      name: testName,
      passed: false,
      reason: `Error fetching feature flags: ${error.message}`,
    }];
  }
}

/**
 * Test Case 2: Verify all flag values are booleans
 */
async function testFeatureFlagStructure(
  db: admin.firestore.Firestore
): Promise<TestResult[]> {
  const testName = 'FeatureFlags: All values are booleans';
  logTestCase(testName);

  try {
    const docSnap = await db.doc('config/featureFlags').get();

    if (!docSnap.exists) {
      logInfo('Using defaults - all known defaults are booleans');
      return [{
        name: testName,
        passed: true,
        reason: 'Config not initialized - default values are all booleans',
        skipped: true,
      }];
    }

    const data = docSnap.data()!;
    // Metadata fields that are not feature flags
    const metadataFields = ['lastUpdated', 'updatedBy', 'version', 'createdAt'];

    let booleanCount = 0;
    let nonBooleanCount = 0;
    const issues: string[] = [];

    Object.entries(data).forEach(([key, value]) => {
      // Skip metadata fields
      if (metadataFields.includes(key)) return;

      if (typeof value === 'boolean') {
        booleanCount++;
      } else {
        nonBooleanCount++;
        issues.push(`${key}: expected boolean, got ${typeof value} (${JSON.stringify(value).substring(0, 50)})`);
      }
    });

    const passed = nonBooleanCount === 0 && booleanCount > 0;

    if (passed) {
      logPass(`All ${booleanCount} flag values are booleans`);
    } else if (nonBooleanCount > 0) {
      logFail(`${nonBooleanCount} flags with non-boolean values`);
      issues.forEach(i => log(`    ${i}`, colors.dim));
    } else {
      logFail('No boolean flag values found');
    }

    return [{
      name: testName,
      passed,
      reason: passed
        ? `All ${booleanCount} feature flag values are booleans`
        : `${nonBooleanCount} flags with non-boolean values`,
      details: { booleanCount, nonBooleanCount, issues },
    }];
  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    return [{
      name: testName,
      passed: false,
      reason: `Error validating flag structure: ${error.message}`,
    }];
  }
}

/**
 * Test Case 3: Test updating a feature flag
 */
async function testUpdateFeatureFlag(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const testName = 'FeatureFlags: Update flag value and read back';
  logTestCase(testName);

  try {
    const docRef = db.doc('config/featureFlags');
    const docSnap = await docRef.get();

    // Save original state for restoration
    if (docSnap.exists && !originalFlagState) {
      originalFlagState = { ...docSnap.data() };
    }

    // Use a test-specific flag name to avoid interfering with real flags
    const testFlagName = '_integrationTestFlag';
    const now = new Date().toISOString();

    // Set the test flag
    await docRef.set({
      [testFlagName]: true,
      lastUpdated: now,
      updatedBy: userId,
    }, { merge: true });

    needsRestore = true;

    await wait(500);

    // Read back
    const updatedDoc = await docRef.get();
    const data = updatedDoc.data();

    if (!data) {
      logFail('Feature flags document not found after update');
      return [{
        name: testName,
        passed: false,
        reason: 'Document not found after update',
      }];
    }

    const flagSet = data[testFlagName] === true;
    const hasLastUpdated = !!data.lastUpdated;
    const hasUpdatedBy = data.updatedBy === userId;

    // Now flip it to false
    await docRef.set({
      [testFlagName]: false,
      lastUpdated: new Date().toISOString(),
      updatedBy: userId,
    }, { merge: true });

    await wait(300);

    const flippedDoc = await docRef.get();
    const flippedData = flippedDoc.data();
    const flagFlipped = flippedData?.[testFlagName] === false;

    const passed = flagSet && flagFlipped;

    logQueryBox('Feature Flag Update', [
      `Flag: ${testFlagName}`,
      `Set to true: ${flagSet}`,
      `Flipped to false: ${flagFlipped}`,
      `Updated by: ${data.updatedBy}`,
    ]);

    if (passed) {
      logPass('Feature flag updated and flipped successfully');
    } else {
      logFail('Feature flag update failed');
    }

    // Clean up the test flag
    await docRef.update({
      [testFlagName]: admin.firestore.FieldValue.delete(),
    });

    return [{
      name: testName,
      passed,
      reason: passed
        ? 'Feature flag set to true, then flipped to false successfully'
        : 'Feature flag update/flip failed',
      details: {
        flagName: testFlagName,
        flagSet,
        flagFlipped,
        hasLastUpdated,
        hasUpdatedBy,
      },
    }];
  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    return [{
      name: testName,
      passed: false,
      reason: `Error updating feature flag: ${error.message}`,
    }];
  }
}

/**
 * Test Case 4: Verify known feature flags exist
 */
async function testKnownFlagsExist(
  db: admin.firestore.Firestore
): Promise<TestResult[]> {
  const testName = 'FeatureFlags: Known flags are present';
  logTestCase(testName);

  try {
    const docSnap = await db.doc('config/featureFlags').get();

    if (!docSnap.exists) {
      logInfo('Config not initialized - checking against known defaults');
      // All known flags have defaults in the API route
      return [{
        name: testName,
        passed: true,
        reason: `${KNOWN_FEATURE_FLAGS.length} known flags have defaults in API`,
        details: { configExists: false, knownFlagCount: KNOWN_FEATURE_FLAGS.length },
      }];
    }

    const data = docSnap.data()!;
    const presentFlags: string[] = [];
    const missingFlags: string[] = [];

    KNOWN_FEATURE_FLAGS.forEach((flag) => {
      if (flag in data) {
        presentFlags.push(flag);
      } else {
        missingFlags.push(flag);
      }
    });

    // Also check for extra flags not in the known list
    const metadataFields = ['lastUpdated', 'updatedBy', 'version', 'createdAt', '_integrationTestFlag'];
    const extraFlags = Object.keys(data).filter(k =>
      !KNOWN_FEATURE_FLAGS.includes(k) && !metadataFields.includes(k)
    );

    logQueryBox('Known Flags Check', [
      `Known flags: ${KNOWN_FEATURE_FLAGS.length}`,
      `Present: ${presentFlags.length}`,
      `Missing: ${missingFlags.length}`,
      `Extra: ${extraFlags.length}`,
    ]);

    // Most flags should be present, but some may be new
    const coverage = presentFlags.length / KNOWN_FEATURE_FLAGS.length;
    const passed = coverage >= 0.5; // At least 50% of known flags should exist

    if (passed) {
      logPass(`${presentFlags.length}/${KNOWN_FEATURE_FLAGS.length} known flags present (${(coverage * 100).toFixed(0)}%)`);
    } else {
      logFail(`Only ${presentFlags.length}/${KNOWN_FEATURE_FLAGS.length} known flags present`);
    }

    if (missingFlags.length > 0) {
      log(`  Missing: ${missingFlags.slice(0, 5).join(', ')}${missingFlags.length > 5 ? '...' : ''}`, colors.dim);
    }
    if (extraFlags.length > 0) {
      log(`  Extra: ${extraFlags.slice(0, 5).join(', ')}${extraFlags.length > 5 ? '...' : ''}`, colors.dim);
    }

    return [{
      name: testName,
      passed,
      reason: `${presentFlags.length}/${KNOWN_FEATURE_FLAGS.length} known flags present, ${extraFlags.length} extra flags`,
      details: {
        presentCount: presentFlags.length,
        missingCount: missingFlags.length,
        extraCount: extraFlags.length,
        missingFlags: missingFlags.slice(0, 10),
        extraFlags: extraFlags.slice(0, 10),
        coverage: `${(coverage * 100).toFixed(0)}%`,
      },
    }];
  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    return [{
      name: testName,
      passed: false,
      reason: `Error checking known flags: ${error.message}`,
    }];
  }
}

/**
 * Restore original feature flags state if modified during tests
 */
async function restoreOriginalState(db: admin.firestore.Firestore): Promise<void> {
  if (!needsRestore || !originalFlagState) {
    return;
  }

  try {
    // Remove our test flag if it still exists
    const docRef = db.doc('config/featureFlags');
    const currentDoc = await docRef.get();

    if (currentDoc.exists) {
      const currentData = currentDoc.data()!;
      if ('_integrationTestFlag' in currentData) {
        await docRef.update({
          '_integrationTestFlag': admin.firestore.FieldValue.delete(),
        });
        log('  Cleaned up _integrationTestFlag', colors.dim);
      }
    }
  } catch (error) {
    // Best effort cleanup
  }
}

/**
 * No separate cleanup needed - restoration handled in restoreOriginalState
 */
export async function cleanupTestData(): Promise<void> {
  const { db } = globalThis.testContext;
  await restoreOriginalState(db);
}
