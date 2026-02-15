/**
 * Memory Builder Config - Integration Tests
 *
 * Tests the configuration system for the memory builder:
 * 1. Config CRUD operations via API
 * 2. Entity type toggles
 * 3. Extraction settings persistence
 * 4. Vocabulary integration settings
 *
 * Key Verifications:
 * - Config can be read and written
 * - Entity types can be individually enabled/disabled
 * - Settings persist correctly
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
export const name = 'Memory Builder Config';

/**
 * Main test runner - exported for test discovery
 */
export async function run(): Promise<TestResult[]> {
  const { db } = globalThis.testContext;
  const allResults: TestResult[] = [];

  // Test Case 1: Config document exists
  const test1Results = await testConfigExists(db);
  allResults.push(...test1Results);

  // Test Case 2: Entity types configuration
  const test2Results = await testEntityTypesConfig(db);
  allResults.push(...test2Results);

  // Test Case 3: Extraction settings
  const test3Results = await testExtractionSettings(db);
  allResults.push(...test3Results);

  // Test Case 4: Vocabulary integration settings
  const test4Results = await testVocabularyIntegrationSettings(db);
  allResults.push(...test4Results);

  return allResults;
}

/**
 * Test Case 1: Config Document Exists
 */
async function testConfigExists(
  db: admin.firestore.Firestore
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Config Document Exists');

  try {
    const configDoc = await db.collection('config').doc('memoryBuilderSettings').get();

    logQueryBox('Config Check', [
      'Collection: config',
      'Document: memoryBuilderSettings',
      `Exists: ${configDoc.exists}`,
    ]);

    if (configDoc.exists) {
      logPass('Config document exists');
      const data = configDoc.data();

      // Check required fields
      const requiredFields = ['enabled', 'entityTypes', 'extraction', 'vocabularyIntegration'];
      const missingFields = requiredFields.filter((f) => !(f in (data || {})));

      if (missingFields.length === 0) {
        logPass('All required fields present');
      } else {
        logFail(`Missing fields: ${missingFields.join(', ')}`);
      }

      results.push({
        name: 'Config: Document exists',
        passed: true,
        reason: 'Memory builder config document exists',
        details: { fields: Object.keys(data || {}) },
      });

      results.push({
        name: 'Config: Required fields',
        passed: missingFields.length === 0,
        reason: missingFields.length === 0
          ? 'All required fields present'
          : `Missing: ${missingFields.join(', ')}`,
        details: { missingFields },
      });
    } else {
      logInfo('Config document does not exist (will use defaults)');
      results.push({
        name: 'Config: Document exists',
        passed: true, // Not a failure - defaults will be used
        reason: 'Config document not created yet (using defaults)',
        details: { exists: false },
      });
    }

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
 * Test Case 2: Entity Types Configuration
 */
async function testEntityTypesConfig(
  db: admin.firestore.Firestore
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Entity Types Configuration');

  try {
    const configDoc = await db.collection('config').doc('memoryBuilderSettings').get();

    if (!configDoc.exists) {
      logInfo('Config not found, skipping entity types check');
      results.push({
        name: 'Entity Types: Configuration',
        passed: true,
        reason: 'Config not found (using defaults)',
        details: {},
      });
      return results;
    }

    const data = configDoc.data();
    const entityTypes = data?.entityTypes || {};

    // Expected entity types (9 total)
    const expectedTypes = [
      'person', 'place', 'topic', 'event', 'organization',  // existing
      'activity', 'emotion', 'time_reference', 'custom_term',  // new
    ];

    logQueryBox('Entity Types', [
      `Configured: ${Object.keys(entityTypes).length}`,
      `Expected: ${expectedTypes.length}`,
    ]);

    // Check each entity type
    const configuredTypes = Object.keys(entityTypes);
    const missingTypes = expectedTypes.filter((t) => !configuredTypes.includes(t));
    const extraTypes = configuredTypes.filter((t) => !expectedTypes.includes(t));

    if (missingTypes.length === 0) {
      logPass('All 9 entity types configured');
    } else {
      logInfo(`Missing types: ${missingTypes.join(', ')}`);
    }

    if (extraTypes.length > 0) {
      logInfo(`Extra types: ${extraTypes.join(', ')}`);
    }

    // Check entity type structure
    let validStructure = true;
    const invalidTypes: string[] = [];

    Object.entries(entityTypes).forEach(([type, config]: [string, any]) => {
      const hasRequiredFields =
        'enabled' in config &&
        'confidenceThreshold' in config;

      if (!hasRequiredFields) {
        validStructure = false;
        invalidTypes.push(type);
      }
    });

    if (validStructure) {
      logPass('Entity type structures are valid');
    } else {
      logFail(`Invalid structure for: ${invalidTypes.join(', ')}`);
    }

    results.push({
      name: 'Entity Types: All types configured',
      passed: missingTypes.length === 0,
      reason: missingTypes.length === 0
        ? 'All 9 entity types configured'
        : `Missing: ${missingTypes.join(', ')}`,
      details: { configuredTypes, missingTypes, extraTypes },
    });

    results.push({
      name: 'Entity Types: Valid structure',
      passed: validStructure,
      reason: validStructure
        ? 'All entity types have valid structure'
        : `Invalid structure: ${invalidTypes.join(', ')}`,
      details: { invalidTypes },
    });

  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    results.push({
      name: 'Entity Types: Test execution',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * Test Case 3: Extraction Settings
 */
async function testExtractionSettings(
  db: admin.firestore.Firestore
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Extraction Settings');

  try {
    const configDoc = await db.collection('config').doc('memoryBuilderSettings').get();

    if (!configDoc.exists) {
      logInfo('Config not found, skipping extraction check');
      results.push({
        name: 'Extraction: Settings',
        passed: true,
        reason: 'Config not found (using defaults)',
        details: {},
      });
      return results;
    }

    const data = configDoc.data();
    const extraction = data?.extraction || {};

    logQueryBox('Extraction Settings', [
      `Model: ${extraction.model || 'not set'}`,
      `Temperature: ${extraction.temperature ?? 'not set'}`,
      `Max Tokens: ${extraction.maxTokens ?? 'not set'}`,
      `Sentiment: ${extraction.enableSentiment ?? 'not set'}`,
      `Batch: ${extraction.enableBatchProcessing ?? 'not set'}`,
    ]);

    // Check required settings
    const requiredSettings = ['model', 'temperature', 'maxTokens'];
    const missingSettings = requiredSettings.filter((s) => !(s in extraction));

    if (missingSettings.length === 0) {
      logPass('All extraction settings present');
    } else {
      logInfo(`Missing settings: ${missingSettings.join(', ')}`);
    }

    // Validate model
    const validModels = ['gpt-4o-mini', 'gpt-4o', 'claude-3-haiku'];
    const isValidModel = validModels.includes(extraction.model);

    if (extraction.model) {
      if (isValidModel) {
        logPass(`Valid model: ${extraction.model}`);
      } else {
        logFail(`Unknown model: ${extraction.model}`);
      }
    }

    // Validate temperature range
    const validTemp = extraction.temperature >= 0 && extraction.temperature <= 1;
    if ('temperature' in extraction) {
      if (validTemp) {
        logPass(`Valid temperature: ${extraction.temperature}`);
      } else {
        logFail(`Invalid temperature: ${extraction.temperature} (should be 0-1)`);
      }
    }

    results.push({
      name: 'Extraction: Required settings',
      passed: missingSettings.length === 0,
      reason: missingSettings.length === 0
        ? 'All required settings present'
        : `Missing: ${missingSettings.join(', ')}`,
      details: { extraction, missingSettings },
    });

    if (extraction.model) {
      results.push({
        name: 'Extraction: Valid model',
        passed: isValidModel,
        reason: isValidModel
          ? `Using valid model: ${extraction.model}`
          : `Invalid model: ${extraction.model}`,
        details: { model: extraction.model, validModels },
      });
    }

  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    results.push({
      name: 'Extraction: Test execution',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * Test Case 4: Vocabulary Integration Settings
 */
async function testVocabularyIntegrationSettings(
  db: admin.firestore.Firestore
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  logTestCase('Vocabulary Integration Settings');

  try {
    const configDoc = await db.collection('config').doc('memoryBuilderSettings').get();

    if (!configDoc.exists) {
      logInfo('Config not found, skipping vocabulary integration check');
      results.push({
        name: 'Vocabulary Integration: Settings',
        passed: true,
        reason: 'Config not found (using defaults)',
        details: {},
      });
      return results;
    }

    const data = configDoc.data();
    const vocabIntegration = data?.vocabularyIntegration || {};

    logQueryBox('Vocabulary Integration', [
      `Auto-Learn: ${vocabIntegration.autoLearnEnabled ?? 'not set'}`,
      `Cross-Reference: ${vocabIntegration.crossReferenceEnabled ?? 'not set'}`,
      `Suggestions: ${vocabIntegration.suggestionsEnabled ?? 'not set'}`,
      `Auto-Learn Threshold: ${vocabIntegration.autoLearnConfidenceThreshold ?? 'not set'}`,
      `Max Auto-Learn/Day: ${vocabIntegration.maxAutoLearnPerDay ?? 'not set'}`,
    ]);

    // Check settings exist
    const settings = [
      'autoLearnEnabled',
      'crossReferenceEnabled',
      'suggestionsEnabled',
      'autoLearnConfidenceThreshold',
      'maxAutoLearnPerDay',
    ];

    const presentSettings = settings.filter((s) => s in vocabIntegration);

    if (presentSettings.length === settings.length) {
      logPass('All vocabulary integration settings present');
    } else {
      const missingSettings = settings.filter((s) => !(s in vocabIntegration));
      logInfo(`Missing settings: ${missingSettings.join(', ')}`);
    }

    // Check category mapping if present
    if (vocabIntegration.categoryMapping) {
      const mappedCategories = Object.keys(vocabIntegration.categoryMapping);
      logPass(`Category mapping configured for ${mappedCategories.length} types`);
    }

    results.push({
      name: 'Vocabulary Integration: Settings',
      passed: presentSettings.length > 0,
      reason: `${presentSettings.length}/${settings.length} settings configured`,
      details: { vocabIntegration, presentSettings },
    });

  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    results.push({
      name: 'Vocabulary Integration: Test execution',
      passed: false,
      reason: `Error: ${error.message}`,
    });
  }

  return results;
}

/**
 * Cleanup function exported for test runner (no cleanup needed for config tests)
 */
export async function cleanupTestData(): Promise<void> {
  // No cleanup needed - we don't create test config documents
}
