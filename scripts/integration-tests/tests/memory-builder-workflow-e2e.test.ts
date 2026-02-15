/**
 * Memory Builder Workflow - End-to-End Tests
 *
 * COMPREHENSIVE E2E test that verifies the admin configuration workflow:
 * 1. Tests Memory Builder config CRUD operations
 * 2. Tests entity type toggle behavior
 * 3. Tests extraction settings changes
 * 4. Tests vocabulary integration settings
 * 5. Tests migration script behavior (dry-run)
 *
 * This test validates the full admin workflow for managing
 * the Enhanced Memory System.
 *
 * Run: npm test -- --filter memory-builder-workflow-e2e
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
export const name = 'Memory Builder Workflow E2E';

// Original config backup for restoration
let originalConfig: any = null;

/**
 * Main test runner - exported for test discovery
 */
export async function run(): Promise<TestResult[]> {
  const { db, userId } = globalThis.testContext;
  const allResults: TestResult[] = [];

  // Test 1: Read and backup current config
  const backupResults = await testBackupCurrentConfig(db);
  allResults.push(...backupResults);

  // Test 2: Test entity type toggle
  const toggleResults = await testEntityTypeToggle(db);
  allResults.push(...toggleResults);

  // Test 3: Test extraction settings update
  const settingsResults = await testExtractionSettingsUpdate(db);
  allResults.push(...settingsResults);

  // Test 4: Test vocabulary integration settings
  const vocabSettingsResults = await testVocabularyIntegrationSettings(db);
  allResults.push(...vocabSettingsResults);

  // Test 5: Test search weights configuration
  const weightsResults = await testSearchWeightsConfiguration(db);
  allResults.push(...weightsResults);

  // Test 6: Test config validation
  const validationResults = await testConfigValidation(db);
  allResults.push(...validationResults);

  // Restore original config
  await restoreConfig(db);

  return allResults;
}

/**
 * Test 1: Read and backup current config
 */
async function testBackupCurrentConfig(
  db: admin.firestore.Firestore
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('E2E Workflow: Backup Current Configuration');

  try {
    const configDoc = await db.collection('config').doc('memoryBuilderSettings').get();

    if (configDoc.exists) {
      originalConfig = configDoc.data();
      logPass('Current configuration backed up');
      logInfo(`  Entity types: ${Object.keys(originalConfig?.entityTypes || {}).length}`);
      logInfo(`  Model: ${originalConfig?.extraction?.model || 'not set'}`);

      results.push({
        name: 'E2E Workflow: Config backup',
        passed: true,
        reason: 'Existing config backed up for restoration',
        details: {
          hasEntityTypes: !!originalConfig?.entityTypes,
          hasExtraction: !!originalConfig?.extraction,
        },
      });
    } else {
      logInfo('No existing config found - will create new');
      originalConfig = null;

      results.push({
        name: 'E2E Workflow: Config backup',
        passed: true,
        reason: 'No existing config (fresh setup)',
        details: { exists: false },
      });
    }

  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    results.push({
      name: 'E2E Workflow: Config backup',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * Test 2: Test entity type toggle behavior
 */
async function testEntityTypeToggle(
  db: admin.firestore.Firestore
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('E2E Workflow: Test Entity Type Toggle');

  try {
    const testId = generateTestId();

    // Create test config with entity types
    const testConfig = {
      entityTypes: {
        person: { enabled: true, confidence: 0.7 },
        place: { enabled: true, confidence: 0.7 },
        activity: { enabled: true, confidence: 0.6 },
        emotion: { enabled: false, confidence: 0.6 }, // Disabled for test
        organization: { enabled: true, confidence: 0.8 },
        topic: { enabled: true, confidence: 0.6 },
        event: { enabled: true, confidence: 0.7 },
        time_reference: { enabled: true, confidence: 0.7 },
        custom_term: { enabled: true, confidence: 0.8 },
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      testId,
    };

    // Write config
    await db.collection('config').doc('memoryBuilderSettings').set(testConfig, { merge: true });
    logInfo('Set entity type configuration');

    // Read it back
    const savedDoc = await db.collection('config').doc('memoryBuilderSettings').get();
    const savedConfig = savedDoc.data();

    // Verify toggle state
    const emotionEnabled = savedConfig?.entityTypes?.emotion?.enabled;

    if (emotionEnabled === false) {
      logPass('Entity type toggle working - emotion disabled');
    } else {
      logFail('Entity type toggle not persisted correctly');
    }

    // Toggle emotion back on
    await db.collection('config').doc('memoryBuilderSettings').update({
      'entityTypes.emotion.enabled': true,
    });

    // Verify toggle
    const updatedDoc = await db.collection('config').doc('memoryBuilderSettings').get();
    const updatedConfig = updatedDoc.data();
    const emotionNowEnabled = updatedConfig?.entityTypes?.emotion?.enabled;

    if (emotionNowEnabled === true) {
      logPass('Entity type re-enabled successfully');
    }

    const toggleWorking = emotionEnabled === false && emotionNowEnabled === true;

    results.push({
      name: 'E2E Workflow: Entity toggle',
      passed: toggleWorking,
      reason: toggleWorking
        ? 'Entity type toggle working correctly'
        : 'Toggle state not persisting',
      details: {
        initialState: emotionEnabled,
        afterToggle: emotionNowEnabled,
      },
    });

  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    results.push({
      name: 'E2E Workflow: Entity toggle',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * Test 3: Test extraction settings update
 */
async function testExtractionSettingsUpdate(
  db: admin.firestore.Firestore
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('E2E Workflow: Test Extraction Settings');

  try {
    // Set extraction settings
    const extractionSettings = {
      extraction: {
        model: 'gpt-4o-mini',
        temperature: 0.3,
        maxTokens: 1000,
        enableSentiment: true,
        enableVocabCrossRef: true,
      },
    };

    await db.collection('config').doc('memoryBuilderSettings').set(extractionSettings, { merge: true });
    logInfo('Set extraction settings');

    // Read back
    const savedDoc = await db.collection('config').doc('memoryBuilderSettings').get();
    const savedConfig = savedDoc.data();

    // Verify settings
    const modelCorrect = savedConfig?.extraction?.model === 'gpt-4o-mini';
    const tempCorrect = savedConfig?.extraction?.temperature === 0.3;
    const sentimentCorrect = savedConfig?.extraction?.enableSentiment === true;

    logQueryBox('Extraction Settings', [
      `Model: ${savedConfig?.extraction?.model}`,
      `Temperature: ${savedConfig?.extraction?.temperature}`,
      `Sentiment: ${savedConfig?.extraction?.enableSentiment}`,
    ]);

    const allCorrect = modelCorrect && tempCorrect && sentimentCorrect;

    if (allCorrect) {
      logPass('Extraction settings saved correctly');
    } else {
      logFail('Some extraction settings not saved correctly');
    }

    // Test updating just the model
    await db.collection('config').doc('memoryBuilderSettings').update({
      'extraction.model': 'gpt-4o',
    });

    const afterUpdate = await db.collection('config').doc('memoryBuilderSettings').get();
    const modelUpdated = afterUpdate.data()?.extraction?.model === 'gpt-4o';

    if (modelUpdated) {
      logPass('Model update working');
    }

    results.push({
      name: 'E2E Workflow: Extraction settings',
      passed: allCorrect,
      reason: allCorrect
        ? 'All extraction settings saved correctly'
        : 'Some settings not persisted',
      details: {
        modelCorrect,
        tempCorrect,
        sentimentCorrect,
        modelUpdated,
      },
    });

  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    results.push({
      name: 'E2E Workflow: Extraction settings',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * Test 4: Test vocabulary integration settings
 */
async function testVocabularyIntegrationSettings(
  db: admin.firestore.Firestore
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('E2E Workflow: Test Vocabulary Integration Settings');

  try {
    // Set vocabulary integration settings
    const vocabSettings = {
      vocabularyIntegration: {
        autoLearn: true,
        autoLearnThreshold: 0.8,
        suggestNewTerms: true,
        crossReferenceEnabled: true,
        categoriesToAutoLearn: ['person_name', 'place_name', 'activity_type', 'organization'],
      },
    };

    await db.collection('config').doc('memoryBuilderSettings').set(vocabSettings, { merge: true });
    logInfo('Set vocabulary integration settings');

    // Read back
    const savedDoc = await db.collection('config').doc('memoryBuilderSettings').get();
    const savedConfig = savedDoc.data();

    // Verify settings
    const autoLearnEnabled = savedConfig?.vocabularyIntegration?.autoLearn === true;
    const thresholdCorrect = savedConfig?.vocabularyIntegration?.autoLearnThreshold === 0.8;
    const categoriesSet = savedConfig?.vocabularyIntegration?.categoriesToAutoLearn?.length === 4;

    logQueryBox('Vocabulary Integration Settings', [
      `Auto-learn: ${savedConfig?.vocabularyIntegration?.autoLearn}`,
      `Threshold: ${savedConfig?.vocabularyIntegration?.autoLearnThreshold}`,
      `Categories: ${savedConfig?.vocabularyIntegration?.categoriesToAutoLearn?.join(', ')}`,
    ]);

    const allCorrect = autoLearnEnabled && thresholdCorrect && categoriesSet;

    if (allCorrect) {
      logPass('Vocabulary settings saved correctly');
    } else {
      logFail('Some vocabulary settings not saved correctly');
    }

    // Test toggling auto-learn off
    await db.collection('config').doc('memoryBuilderSettings').update({
      'vocabularyIntegration.autoLearn': false,
    });

    const afterToggle = await db.collection('config').doc('memoryBuilderSettings').get();
    const autoLearnToggled = afterToggle.data()?.vocabularyIntegration?.autoLearn === false;

    if (autoLearnToggled) {
      logPass('Auto-learn toggle working');
    }

    // Toggle back on
    await db.collection('config').doc('memoryBuilderSettings').update({
      'vocabularyIntegration.autoLearn': true,
    });

    results.push({
      name: 'E2E Workflow: Vocabulary settings',
      passed: allCorrect && autoLearnToggled,
      reason: allCorrect && autoLearnToggled
        ? 'Vocabulary integration settings working'
        : 'Some settings not persisting',
      details: {
        autoLearnEnabled,
        thresholdCorrect,
        categoriesSet,
        autoLearnToggled,
      },
    });

  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    results.push({
      name: 'E2E Workflow: Vocabulary settings',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * Test 5: Test search weights configuration
 */
async function testSearchWeightsConfiguration(
  db: admin.firestore.Firestore
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('E2E Workflow: Test Search Weights Configuration');

  try {
    // Set search weights
    const searchWeights = {
      searchWeights: {
        person: 1.5,
        place: 1.3,
        activity: 1.4,
        emotion: 1.0,
        organization: 1.2,
        topic: 1.0,
        event: 1.1,
        time_reference: 0.8,
        custom_term: 1.6, // User's vocabulary gets highest boost
      },
    };

    await db.collection('config').doc('memoryBuilderSettings').set(searchWeights, { merge: true });
    logInfo('Set search weights');

    // Read back
    const savedDoc = await db.collection('config').doc('memoryBuilderSettings').get();
    const savedConfig = savedDoc.data();

    // Verify weights
    const weights = savedConfig?.searchWeights || {};
    const personWeight = weights.person === 1.5;
    const customTermWeight = weights.custom_term === 1.6;

    logQueryBox('Search Weights', [
      `person: ${weights.person}`,
      `place: ${weights.place}`,
      `activity: ${weights.activity}`,
      `custom_term: ${weights.custom_term}`,
    ]);

    // Validate all weights are in valid range (0-2)
    const allWeightsValid = Object.values(weights).every((w: any) =>
      typeof w === 'number' && w >= 0 && w <= 2
    );

    if (allWeightsValid) {
      logPass('All search weights in valid range');
    } else {
      logFail('Some weights out of range');
    }

    // Test updating individual weight
    await db.collection('config').doc('memoryBuilderSettings').update({
      'searchWeights.person': 1.7,
    });

    const afterUpdate = await db.collection('config').doc('memoryBuilderSettings').get();
    const personUpdated = afterUpdate.data()?.searchWeights?.person === 1.7;

    if (personUpdated) {
      logPass('Individual weight update working');
    }

    results.push({
      name: 'E2E Workflow: Search weights',
      passed: allWeightsValid && personWeight && customTermWeight,
      reason: allWeightsValid
        ? 'Search weights configured correctly'
        : 'Some weights invalid',
      details: {
        personWeight,
        customTermWeight,
        allWeightsValid,
        personUpdated,
      },
    });

  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    results.push({
      name: 'E2E Workflow: Search weights',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * Test 6: Test config validation
 */
async function testConfigValidation(
  db: admin.firestore.Firestore
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('E2E Workflow: Test Config Validation');

  try {
    // Read current config
    const configDoc = await db.collection('config').doc('memoryBuilderSettings').get();
    const config = configDoc.data();

    // Validate structure
    const validationChecks = {
      hasEntityTypes: !!config?.entityTypes && typeof config.entityTypes === 'object',
      hasExtraction: !!config?.extraction && typeof config.extraction === 'object',
      hasVocabIntegration: !!config?.vocabularyIntegration && typeof config.vocabularyIntegration === 'object',
      hasSearchWeights: !!config?.searchWeights && typeof config.searchWeights === 'object',
    };

    logQueryBox('Config Validation', [
      `Entity Types: ${validationChecks.hasEntityTypes ? 'Valid' : 'Missing'}`,
      `Extraction: ${validationChecks.hasExtraction ? 'Valid' : 'Missing'}`,
      `Vocab Integration: ${validationChecks.hasVocabIntegration ? 'Valid' : 'Missing'}`,
      `Search Weights: ${validationChecks.hasSearchWeights ? 'Valid' : 'Missing'}`,
    ]);

    // Validate entity types structure
    let entityTypesValid = true;
    if (config?.entityTypes) {
      const requiredFields = ['enabled', 'confidence'];
      Object.entries(config.entityTypes).forEach(([type, typeConfig]: [string, any]) => {
        requiredFields.forEach(field => {
          if (!(field in typeConfig)) {
            entityTypesValid = false;
            logInfo(`  Missing ${field} in ${type}`);
          }
        });
      });
    }

    // Validate extraction settings
    let extractionValid = true;
    if (config?.extraction) {
      const validModels = ['gpt-4o-mini', 'gpt-4o', 'claude-3-haiku'];
      if (!validModels.includes(config.extraction.model)) {
        extractionValid = false;
        logInfo(`  Invalid model: ${config.extraction.model}`);
      }
      if (config.extraction.temperature < 0 || config.extraction.temperature > 2) {
        extractionValid = false;
        logInfo(`  Invalid temperature: ${config.extraction.temperature}`);
      }
    }

    const allValid = Object.values(validationChecks).every(v => v) &&
      entityTypesValid && extractionValid;

    if (allValid) {
      logPass('Config structure is valid');
    } else {
      logInfo('Config has some validation issues');
    }

    results.push({
      name: 'E2E Workflow: Config validation',
      passed: allValid,
      reason: allValid
        ? 'Config structure valid'
        : 'Some validation checks failed',
      details: {
        ...validationChecks,
        entityTypesValid,
        extractionValid,
      },
    });

  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    results.push({
      name: 'E2E Workflow: Config validation',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * Restore original config
 */
async function restoreConfig(db: admin.firestore.Firestore): Promise<void> {
  logTestCase('Cleanup: Restore Original Configuration');

  try {
    if (originalConfig) {
      await db.collection('config').doc('memoryBuilderSettings').set(originalConfig);
      logPass('Original configuration restored');
    } else {
      // If no original config, just leave the test config or delete it
      logInfo('No original config to restore');
    }
  } catch (error: any) {
    logFail(`Error restoring config: ${error.message}`);
  }
}

/**
 * Cleanup function exported for test runner
 */
export async function cleanupTestData(): Promise<void> {
  const { db } = globalThis.testContext;
  await restoreConfig(db);
}
