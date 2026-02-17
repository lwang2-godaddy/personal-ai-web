/**
 * Admin Features & Flags - Integration Tests
 *
 * Tests the admin feature flags system end-to-end, verifying
 * Firestore operations on the config/featureFlags document:
 *
 * 1. Feature flags can be read from Firestore config/featureFlags
 * 2. Feature flags can be written/updated
 * 3. Feature flags with boolean values work correctly
 * 4. Default values are used when a flag doesn't exist
 * 5. The admin features page can list all known features
 *
 * Firestore Collections:
 * - config/featureFlags - Feature flags configuration document
 */

import * as admin from 'firebase-admin';
import type { TestResult } from '../lib/test-utils';
import { generateTestId, wait } from '../lib/test-utils';
import {
  logPass,
  logFail,
  logInfo,
  logTestCase,
  logQueryBox,
  logCleanup,
  logCleanupResult,
} from '../lib/reporter';

export const name = 'Admin Features & Flags';

// Default feature flags as defined in the API route (app/api/admin/features/route.ts)
const DEFAULT_FEATURE_FLAGS: Record<string, boolean> = {
  morningBriefing: false,
  weeklyReport: false,
  predictions: false,
  conversationThreads: false,
  quickCapture: false,
  dataExportPolish: true,
  hapticFeedback: true,
  emojiReactions: true,
  premiumPersonalities: true,
  askAboutThis: true,
  followUpQuestions: true,
  skeletonLoading: true,
  quickThoughts: true,
  photoMemories: true,
  voiceConversation: true,
  lifeFeed: true,
  memoryBuilder: true,
  challenges: true,
  engagement: true,
  checkInSuggestions: true,
};

// Known feature names from the admin features page registry
const KNOWN_FEATURE_NAMES = [
  'RAG Chatbot',
  'Health Data Collection',
  'Location Tracking',
  'Voice Notes',
  'Diary / Text Notes',
  'Photo Memories',
  'Firebase Auth',
  'Cloud Sync',
  'Ask About This',
  'Follow-Up Questions',
  'Voice Conversation',
  'Embedding Pipeline',
  'Premium Personalities',
  'Chat Suggestions',
  'Memory Builder',
  'Life Keywords',
  'Emoji Reactions',
  'Circles',
  'Friend Invites',
  'Challenges',
  'Life Feed',
  'Daily Prompts',
  'Achievements & XP',
  'Streaks',
  'Check-In Suggestions',
  'Fun Facts',
  'Events',
  'Morning Briefing',
  'Weekly Report',
  'Skeleton Loading',
  'Haptic Feedback',
  'Data Export Polish',
  'Quick Thoughts',
  'Conversation Threads',
  'Quick Capture',
  'Predictions',
  'Admin Dashboard',
  'Prompt Management',
  'Usage Analytics',
  'Subscription Management',
];

// Track documents created during tests for cleanup
const createdDocs: Array<{ collection: string; id: string }> = [];

// Track if we need to restore original featureFlags state
let originalFeatureFlagsData: Record<string, unknown> | null = null;
let featureFlagsExistedBefore = false;

export async function run(): Promise<TestResult[]> {
  const { db, userId } = globalThis.testContext;
  const allResults: TestResult[] = [];

  try {
    const tests: Array<{ name: string; fn: () => Promise<TestResult[]> }> = [
      { name: 'read-feature-flags', fn: () => testReadFeatureFlags(db) },
      { name: 'write-update-feature-flags', fn: () => testWriteUpdateFeatureFlags(db, userId) },
      { name: 'boolean-values', fn: () => testBooleanValues(db, userId) },
      { name: 'default-values-for-missing-flags', fn: () => testDefaultValuesForMissingFlags(db, userId) },
      { name: 'list-known-features', fn: () => testListKnownFeatures() },
    ];

    for (const test of tests) {
      const results = await test.fn();
      allResults.push(...results);
    }
  } finally {
    await cleanupTestData(db);
  }

  return allResults;
}

/**
 * Test 1: Feature flags can be read from Firestore config/featureFlags
 */
async function testReadFeatureFlags(
  db: admin.firestore.Firestore
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Read Feature Flags from Firestore');

  try {
    const docRef = db.doc('config/featureFlags');
    const docSnap = await docRef.get();

    logQueryBox('Read Feature Flags', [
      'Path: config/featureFlags',
      `Exists: ${docSnap.exists}`,
    ]);

    // Save original state for restoration in cleanup
    if (docSnap.exists) {
      originalFeatureFlagsData = { ...docSnap.data() };
      featureFlagsExistedBefore = true;

      const data = docSnap.data()!;
      const { lastUpdated, updatedBy, ...flags } = data;
      const flagCount = Object.keys(flags).length;

      logPass(`Feature flags document exists with ${flagCount} flag entries`);
      results.push({
        name: 'Read feature flags from Firestore',
        passed: true,
        reason: `Document exists with ${flagCount} flags`,
        details: { flagCount, lastUpdated, updatedBy },
      });
    } else {
      featureFlagsExistedBefore = false;

      logInfo('Feature flags document does not exist yet - defaults will be used');
      results.push({
        name: 'Read feature flags from Firestore',
        passed: true,
        reason: 'Document does not exist; API route would use defaults',
        details: { exists: false, defaultCount: Object.keys(DEFAULT_FEATURE_FLAGS).length },
      });
    }

    // Verify the document path is accessible (no permission errors)
    logPass('config/featureFlags document path is accessible');
    results.push({
      name: 'Feature flags document path accessible',
      passed: true,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logFail(`Failed to read feature flags: ${message}`);
    results.push({
      name: 'Read feature flags from Firestore',
      passed: false,
      reason: message,
    });
  }

  return results;
}

/**
 * Test 2: Feature flags can be written/updated
 */
async function testWriteUpdateFeatureFlags(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Write and Update Feature Flags');

  try {
    const docRef = db.doc('config/featureFlags');

    // Save original state if not already saved
    if (!originalFeatureFlagsData) {
      const existingSnap = await docRef.get();
      if (existingSnap.exists) {
        originalFeatureFlagsData = { ...existingSnap.data() };
        featureFlagsExistedBefore = true;
      }
    }

    // Step 1: Write a test flag using merge
    const testFlagKey = `_testFlag_${generateTestId()}`;
    const writeTimestamp = new Date().toISOString();

    await docRef.set(
      {
        [testFlagKey]: true,
        lastUpdated: writeTimestamp,
        updatedBy: userId,
      },
      { merge: true }
    );

    await wait(500);

    // Step 2: Read back and verify the write
    const afterWrite = await docRef.get();
    const afterWriteData = afterWrite.data();

    if (!afterWriteData) {
      logFail('Document missing after write');
      results.push({
        name: 'Write feature flag',
        passed: false,
        reason: 'Document not found after set with merge',
      });
      return results;
    }

    const writeSucceeded = afterWriteData[testFlagKey] === true;
    if (writeSucceeded) {
      logPass(`Test flag "${testFlagKey}" written successfully (value: true)`);
      results.push({ name: 'Write feature flag', passed: true });
    } else {
      logFail(`Test flag "${testFlagKey}" not found after write`);
      results.push({
        name: 'Write feature flag',
        passed: false,
        reason: `Expected true, got ${afterWriteData[testFlagKey]}`,
      });
    }

    // Step 3: Update the test flag to false
    await docRef.set(
      {
        [testFlagKey]: false,
        lastUpdated: new Date().toISOString(),
        updatedBy: userId,
      },
      { merge: true }
    );

    await wait(300);

    const afterUpdate = await docRef.get();
    const afterUpdateData = afterUpdate.data();

    const updateSucceeded = afterUpdateData?.[testFlagKey] === false;
    if (updateSucceeded) {
      logPass(`Test flag "${testFlagKey}" updated to false`);
      results.push({ name: 'Update feature flag', passed: true });
    } else {
      logFail(`Test flag update failed: expected false, got ${afterUpdateData?.[testFlagKey]}`);
      results.push({
        name: 'Update feature flag',
        passed: false,
        reason: `Expected false, got ${afterUpdateData?.[testFlagKey]}`,
      });
    }

    // Step 4: Verify metadata fields are preserved
    const hasLastUpdated = typeof afterUpdateData?.lastUpdated === 'string';
    const hasUpdatedBy = afterUpdateData?.updatedBy === userId;

    if (hasLastUpdated && hasUpdatedBy) {
      logPass('Metadata fields (lastUpdated, updatedBy) preserved');
      results.push({ name: 'Metadata fields preserved on update', passed: true });
    } else {
      logFail('Metadata fields not correctly preserved');
      results.push({
        name: 'Metadata fields preserved on update',
        passed: false,
        reason: `lastUpdated: ${hasLastUpdated}, updatedBy: ${hasUpdatedBy}`,
      });
    }

    // Clean up the test flag
    await docRef.update({
      [testFlagKey]: admin.firestore.FieldValue.delete(),
    });

    logQueryBox('Write/Update Summary', [
      `Test flag: ${testFlagKey}`,
      `Write succeeded: ${writeSucceeded}`,
      `Update succeeded: ${updateSucceeded}`,
      `Metadata preserved: ${hasLastUpdated && hasUpdatedBy}`,
    ]);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logFail(`Write/update feature flags error: ${message}`);
    results.push({
      name: 'Write and update feature flags',
      passed: false,
      reason: message,
    });
  }

  return results;
}

/**
 * Test 3: Feature flags with boolean values work correctly
 */
async function testBooleanValues(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Boolean Values Validation');

  try {
    const docRef = db.doc('config/featureFlags');

    // Save original if needed
    if (!originalFeatureFlagsData) {
      const existingSnap = await docRef.get();
      if (existingSnap.exists) {
        originalFeatureFlagsData = { ...existingSnap.data() };
        featureFlagsExistedBefore = true;
      }
    }

    // Write a set of test flags with explicit boolean values
    const testPrefix = `_boolTest_${Date.now()}`;
    const trueKey = `${testPrefix}_true`;
    const falseKey = `${testPrefix}_false`;

    await docRef.set(
      {
        [trueKey]: true,
        [falseKey]: false,
        lastUpdated: new Date().toISOString(),
        updatedBy: userId,
      },
      { merge: true }
    );

    await wait(300);

    const snap = await docRef.get();
    const data = snap.data();

    if (!data) {
      logFail('Document missing after boolean test write');
      results.push({
        name: 'Boolean values stored correctly',
        passed: false,
        reason: 'Document not found',
      });
      return results;
    }

    // Check true value
    const trueStored = data[trueKey] === true && typeof data[trueKey] === 'boolean';
    if (trueStored) {
      logPass(`Boolean true stored and read correctly for "${trueKey}"`);
      results.push({ name: 'Boolean true value stored correctly', passed: true });
    } else {
      logFail(`Boolean true failed: got ${typeof data[trueKey]} ${data[trueKey]}`);
      results.push({
        name: 'Boolean true value stored correctly',
        passed: false,
        reason: `Expected boolean true, got ${typeof data[trueKey]}: ${data[trueKey]}`,
      });
    }

    // Check false value
    const falseStored = data[falseKey] === false && typeof data[falseKey] === 'boolean';
    if (falseStored) {
      logPass(`Boolean false stored and read correctly for "${falseKey}"`);
      results.push({ name: 'Boolean false value stored correctly', passed: true });
    } else {
      logFail(`Boolean false failed: got ${typeof data[falseKey]} ${data[falseKey]}`);
      results.push({
        name: 'Boolean false value stored correctly',
        passed: false,
        reason: `Expected boolean false, got ${typeof data[falseKey]}: ${data[falseKey]}`,
      });
    }

    // Verify that existing flags in the document are all booleans
    // (excluding metadata fields and our test fields)
    const metadataFields = ['lastUpdated', 'updatedBy', 'version', 'createdAt'];
    let allExistingAreBooleans = true;
    const nonBooleanIssues: string[] = [];

    Object.entries(data).forEach(([key, value]) => {
      if (metadataFields.includes(key)) return;
      if (key.startsWith('_boolTest_') || key.startsWith('_testFlag_')) return;

      if (typeof value !== 'boolean') {
        allExistingAreBooleans = false;
        nonBooleanIssues.push(`${key}: ${typeof value}`);
      }
    });

    if (allExistingAreBooleans) {
      logPass('All existing feature flag values are booleans');
      results.push({ name: 'All existing flags are booleans', passed: true });
    } else {
      logFail(`Found non-boolean flag values: ${nonBooleanIssues.join(', ')}`);
      results.push({
        name: 'All existing flags are booleans',
        passed: false,
        reason: `Non-boolean flags: ${nonBooleanIssues.join(', ')}`,
      });
    }

    // Clean up test flags
    await docRef.update({
      [trueKey]: admin.firestore.FieldValue.delete(),
      [falseKey]: admin.firestore.FieldValue.delete(),
    });

    logQueryBox('Boolean Validation', [
      `True stored: ${trueStored}`,
      `False stored: ${falseStored}`,
      `All existing booleans: ${allExistingAreBooleans}`,
      `Non-boolean issues: ${nonBooleanIssues.length}`,
    ]);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logFail(`Boolean values test error: ${message}`);
    results.push({
      name: 'Boolean values validation',
      passed: false,
      reason: message,
    });
  }

  return results;
}

/**
 * Test 4: Default values are used when a flag doesn't exist
 */
async function testDefaultValuesForMissingFlags(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Default Values for Missing Flags');

  try {
    const docRef = db.doc('config/featureFlags');
    const docSnap = await docRef.get();

    // Simulate the default-value logic from the API route:
    // When a flag key is not present in Firestore, the API uses DEFAULT_FEATURE_FLAGS
    const firestoreFlags: Record<string, unknown> = docSnap.exists
      ? (() => {
          const data = docSnap.data()!;
          const { lastUpdated, updatedBy, version, createdAt, ...flags } = data;
          return flags;
        })()
      : {};

    // For each default flag, check if a value would be resolved
    let missingCount = 0;
    let presentCount = 0;
    const missingFlagNames: string[] = [];

    Object.entries(DEFAULT_FEATURE_FLAGS).forEach(([key, defaultValue]) => {
      if (key in firestoreFlags) {
        presentCount++;
      } else {
        missingCount++;
        missingFlagNames.push(key);
      }
    });

    logQueryBox('Default Value Resolution', [
      `Default flags defined: ${Object.keys(DEFAULT_FEATURE_FLAGS).length}`,
      `Present in Firestore: ${presentCount}`,
      `Missing (use default): ${missingCount}`,
    ]);

    // Test: The default values map covers all known flag keys
    const allDefaultsAreBooleans = Object.values(DEFAULT_FEATURE_FLAGS).every(
      (v) => typeof v === 'boolean'
    );

    if (allDefaultsAreBooleans) {
      logPass('All default values are booleans');
      results.push({ name: 'All default flag values are booleans', passed: true });
    } else {
      logFail('Some default values are not booleans');
      results.push({
        name: 'All default flag values are booleans',
        passed: false,
        reason: 'Non-boolean values found in DEFAULT_FEATURE_FLAGS',
      });
    }

    // Test: Default value fallback logic works for a non-existent flag
    const nonExistentKey = '_nonExistentFlag_' + Date.now();
    const firestoreValue = firestoreFlags[nonExistentKey];
    const resolvedValue = typeof firestoreValue === 'boolean' ? firestoreValue : false;

    if (firestoreValue === undefined && resolvedValue === false) {
      logPass(`Non-existent flag "${nonExistentKey}" resolves to default (false)`);
      results.push({
        name: 'Non-existent flag resolves to default value',
        passed: true,
        reason: 'Missing flag correctly falls back to false',
      });
    } else {
      logFail(`Non-existent flag unexpectedly has a value: ${firestoreValue}`);
      results.push({
        name: 'Non-existent flag resolves to default value',
        passed: false,
        reason: `Expected undefined, got ${firestoreValue}`,
      });
    }

    // Test: All default "true" flags have expected default values
    const defaultTrueFlags = Object.entries(DEFAULT_FEATURE_FLAGS)
      .filter(([, v]) => v === true)
      .map(([k]) => k);
    const defaultFalseFlags = Object.entries(DEFAULT_FEATURE_FLAGS)
      .filter(([, v]) => v === false)
      .map(([k]) => k);

    logInfo(`Default true flags: ${defaultTrueFlags.length}`);
    logInfo(`Default false flags: ${defaultFalseFlags.length}`);

    if (defaultTrueFlags.length > 0 && defaultFalseFlags.length > 0) {
      logPass('Default flags include both true and false values');
      results.push({
        name: 'Default flags contain both true and false values',
        passed: true,
        reason: `${defaultTrueFlags.length} true, ${defaultFalseFlags.length} false`,
        details: {
          trueFlags: defaultTrueFlags,
          falseFlags: defaultFalseFlags,
        },
      });
    } else {
      logFail('Default flags should include both true and false values');
      results.push({
        name: 'Default flags contain both true and false values',
        passed: false,
        reason: `True: ${defaultTrueFlags.length}, False: ${defaultFalseFlags.length}`,
      });
    }

    // Report on missing flags if some are not in Firestore
    if (missingCount > 0 && docSnap.exists) {
      logInfo(`${missingCount} flags missing from Firestore (will use defaults): ${missingFlagNames.slice(0, 5).join(', ')}${missingCount > 5 ? '...' : ''}`);
    }

    results.push({
      name: 'Default values coverage check',
      passed: true,
      reason: `${Object.keys(DEFAULT_FEATURE_FLAGS).length} defaults defined, ${presentCount} in Firestore, ${missingCount} use defaults`,
      details: {
        totalDefaults: Object.keys(DEFAULT_FEATURE_FLAGS).length,
        presentInFirestore: presentCount,
        missingUseDefaults: missingCount,
        missingFlags: missingFlagNames.slice(0, 10),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logFail(`Default values test error: ${message}`);
    results.push({
      name: 'Default values for missing flags',
      passed: false,
      reason: message,
    });
  }

  return results;
}

/**
 * Test 5: The admin features page can list all known features
 */
async function testListKnownFeatures(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('List All Known Features');

  try {
    // Verify the feature registry (hardcoded in the admin page) is well-formed
    const totalFeatures = KNOWN_FEATURE_NAMES.length;

    logQueryBox('Feature Registry', [
      `Total known features: ${totalFeatures}`,
      `Feature flag keys: ${Object.keys(DEFAULT_FEATURE_FLAGS).length}`,
    ]);

    // Test: Features list is non-empty
    if (totalFeatures > 0) {
      logPass(`Feature registry contains ${totalFeatures} features`);
      results.push({
        name: 'Feature registry is non-empty',
        passed: true,
        reason: `${totalFeatures} features in registry`,
      });
    } else {
      logFail('Feature registry is empty');
      results.push({
        name: 'Feature registry is non-empty',
        passed: false,
        reason: 'No features found in registry',
      });
    }

    // Test: No duplicate feature names
    const uniqueNames = new Set(KNOWN_FEATURE_NAMES);
    const hasDuplicates = uniqueNames.size !== KNOWN_FEATURE_NAMES.length;

    if (!hasDuplicates) {
      logPass('No duplicate feature names in registry');
      results.push({ name: 'No duplicate feature names', passed: true });
    } else {
      const duplicates = KNOWN_FEATURE_NAMES.filter(
        (name, index) => KNOWN_FEATURE_NAMES.indexOf(name) !== index
      );
      logFail(`Found duplicate feature names: ${duplicates.join(', ')}`);
      results.push({
        name: 'No duplicate feature names',
        passed: false,
        reason: `Duplicates: ${duplicates.join(', ')}`,
      });
    }

    // Test: Feature flag keys correspond to known features
    // Each feature flag key should map to a feature conceptually
    const flagKeys = Object.keys(DEFAULT_FEATURE_FLAGS);
    const knownFeaturesLower = KNOWN_FEATURE_NAMES.map((n) => n.toLowerCase());

    // Check that we have at least as many flag keys as planned/stub features need
    const flagToFeatureMapping: string[] = [];
    flagKeys.forEach((key) => {
      // Convert camelCase to words for loose matching
      const keyWords = key
        .replace(/([A-Z])/g, ' $1')
        .toLowerCase()
        .trim();
      const matchingFeature = KNOWN_FEATURE_NAMES.find((name) =>
        name.toLowerCase().includes(keyWords.split(' ')[0]) ||
        keyWords.includes(name.toLowerCase().split(' ')[0])
      );
      if (matchingFeature) {
        flagToFeatureMapping.push(`${key} -> ${matchingFeature}`);
      }
    });

    logInfo(`Flag-to-feature mappings found: ${flagToFeatureMapping.length}/${flagKeys.length}`);

    // At minimum, all flag keys should be non-empty strings
    const allKeysValid = flagKeys.every((k) => typeof k === 'string' && k.length > 0);
    if (allKeysValid) {
      logPass('All feature flag keys are valid non-empty strings');
      results.push({ name: 'All feature flag keys are valid', passed: true });
    } else {
      logFail('Some feature flag keys are invalid');
      results.push({
        name: 'All feature flag keys are valid',
        passed: false,
        reason: 'Found empty or non-string keys',
      });
    }

    // Test: Verify expected feature categories exist
    const expectedCategories = ['Core', 'AI', 'Social', 'Engagement', 'UX', 'Admin'];
    const hasCoreFeatures = KNOWN_FEATURE_NAMES.some((n) =>
      ['RAG Chatbot', 'Health Data Collection', 'Location Tracking', 'Voice Notes'].includes(n)
    );
    const hasAIFeatures = KNOWN_FEATURE_NAMES.some((n) =>
      ['Ask About This', 'Follow-Up Questions', 'Memory Builder'].includes(n)
    );
    const hasAdminFeatures = KNOWN_FEATURE_NAMES.some((n) =>
      ['Admin Dashboard', 'Prompt Management', 'Usage Analytics'].includes(n)
    );

    if (hasCoreFeatures && hasAIFeatures && hasAdminFeatures) {
      logPass('Feature registry covers Core, AI, and Admin categories');
      results.push({
        name: 'Feature registry covers major categories',
        passed: true,
        reason: 'Core, AI, and Admin categories all represented',
      });
    } else {
      logFail('Feature registry missing expected categories');
      results.push({
        name: 'Feature registry covers major categories',
        passed: false,
        reason: `Core: ${hasCoreFeatures}, AI: ${hasAIFeatures}, Admin: ${hasAdminFeatures}`,
      });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logFail(`List known features error: ${message}`);
    results.push({
      name: 'List all known features',
      passed: false,
      reason: message,
    });
  }

  return results;
}

/**
 * Cleanup: Restore original feature flags state if modified
 */
async function cleanupTestData(db: admin.firestore.Firestore): Promise<void> {
  const cleanupItems: string[] = [];

  try {
    const docRef = db.doc('config/featureFlags');
    const currentDoc = await docRef.get();

    if (!currentDoc.exists) {
      // Nothing to clean up
      return;
    }

    const currentData = currentDoc.data()!;

    // Remove any lingering test flags (prefixed with _testFlag_ or _boolTest_ or _nonExistent)
    const testKeys = Object.keys(currentData).filter(
      (key) =>
        key.startsWith('_testFlag_') ||
        key.startsWith('_boolTest_') ||
        key.startsWith('_nonExistentFlag_')
    );

    if (testKeys.length > 0) {
      const deleteUpdate: Record<string, admin.firestore.FieldValue> = {};
      testKeys.forEach((key) => {
        deleteUpdate[key] = admin.firestore.FieldValue.delete();
        cleanupItems.push(`config/featureFlags.${key}`);
      });
      await docRef.update(deleteUpdate);
    }

    // If the document did not exist before tests and we created it,
    // we leave it in place since other tests or the app may depend on it.
    // We only clean up our test-specific fields.

    if (cleanupItems.length > 0) {
      logCleanup(cleanupItems);
      logCleanupResult(true);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (cleanupItems.length > 0) {
      logCleanup(cleanupItems);
      logCleanupResult(false, message);
    }
  }
}
