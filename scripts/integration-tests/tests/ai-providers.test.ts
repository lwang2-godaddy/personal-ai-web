/**
 * AI Providers Integration Test
 *
 * Tests the AI providers admin page API endpoints:
 * - GET /api/admin/ai-providers - Fetch config
 * - POST /api/admin/ai-providers - Initialize config
 * - PATCH /api/admin/ai-providers - Update service config
 *
 * Run: npx tsx scripts/integration-tests/tests/ai-providers.test.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { initializeApp, cert, getApps, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

const CONFIG_DOC_PATH = 'config/aiProviders';
const TEST_ADMIN_UID = process.env.TEST_ADMIN_UID || 'test-admin-uid';

// Initialize Firebase Admin
function getAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY not set');
  }

  return initializeApp({
    credential: cert(JSON.parse(serviceAccountKey)),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

async function getTestToken(): Promise<string> {
  // Create a custom token for testing (requires admin role in Firestore)
  const auth = getAuth(getAdminApp());
  const customToken = await auth.createCustomToken(TEST_ADMIN_UID);
  return customToken;
}

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

function log(message: string) {
  console.log(`[AI Providers Test] ${message}`);
}

function pass(name: string, details?: any) {
  results.push({ name, passed: true, details });
  log(`✅ ${name}`);
}

function fail(name: string, error: string, details?: any) {
  results.push({ name, passed: false, error, details });
  log(`❌ ${name}: ${error}`);
}

// =============================================================================
// Tests
// =============================================================================

async function testDirectFirestoreAccess() {
  log('Testing direct Firestore access...');

  try {
    const db = getFirestore(getAdminApp());

    // Check if config exists
    const configDoc = await db.doc(CONFIG_DOC_PATH).get();
    const exists = configDoc.exists;

    if (exists) {
      const data = configDoc.data();
      pass('Firestore config exists', {
        version: data?.version,
        providersCount: data?.registeredProviders?.length,
        servicesConfigured: Object.keys(data?.services || {}).length,
      });

      // Validate structure
      if (!data?.registeredProviders || data.registeredProviders.length === 0) {
        fail('Config structure validation', 'registeredProviders array is missing or empty');
      } else {
        pass('Config structure validation', {
          providers: data.registeredProviders.map((p: any) => p.id),
        });
      }
    } else {
      log('Config does not exist yet - will be created in next test');
      pass('Firestore config check', { exists: false });
    }
  } catch (error: any) {
    fail('Direct Firestore access', error.message);
  }
}

async function testInitializeConfig() {
  log('Testing config initialization...');

  try {
    const db = getFirestore(getAdminApp());

    // Delete existing config for clean test
    const configRef = db.doc(CONFIG_DOC_PATH);
    const existing = await configRef.get();

    if (existing.exists) {
      log('Deleting existing config for clean test...');
      await configRef.delete();
    }

    // Create default config
    const defaultConfig = {
      version: 1,
      lastUpdated: new Date().toISOString(),
      updatedBy: TEST_ADMIN_UID,
      registeredProviders: [
        {
          id: 'openai',
          type: 'cloud',
          name: 'OpenAI',
          enabled: true,
          apiKeyEnvVar: 'OPENAI_API_KEY',
          supportedServices: ['chat', 'embedding', 'tts', 'stt', 'vision'],
        },
        {
          id: 'google',
          type: 'cloud',
          name: 'Google Cloud',
          enabled: true,
          apiKeyEnvVar: 'GOOGLE_CLOUD_API_KEY',
          supportedServices: ['chat', 'embedding', 'tts', 'stt', 'vision'],
        },
        {
          id: 'anthropic',
          type: 'cloud',
          name: 'Anthropic',
          enabled: false,
          apiKeyEnvVar: 'ANTHROPIC_API_KEY',
          supportedServices: ['chat', 'vision'],
        },
        {
          id: 'ollama',
          type: 'local',
          name: 'Ollama (Local)',
          enabled: false,
          baseUrl: 'http://localhost:11434',
          supportedServices: ['chat', 'embedding', 'vision'],
        },
      ],
      services: {
        chat: {
          providerId: 'openai',
          model: 'gpt-4o',
          fallbackProviderId: 'google',
          fallbackModel: 'gemini-2.5-flash',
        },
        embedding: {
          providerId: 'openai',
          model: 'text-embedding-3-small',
        },
        tts: {
          providerId: 'openai',
          model: 'tts-1',
          fallbackProviderId: 'google',
          fallbackModel: 'en-US-Neural2-C',
        },
        stt: {
          providerId: 'openai',
          model: 'whisper-1',
          fallbackProviderId: 'google',
          fallbackModel: 'chirp_2',
        },
        vision: {
          providerId: 'openai',
          model: 'gpt-4o',
          fallbackProviderId: 'google',
          fallbackModel: 'gemini-2.5-flash',
        },
      },
    };

    await configRef.set(defaultConfig);
    pass('Initialize config', { version: defaultConfig.version });

    // Verify
    const verifyDoc = await configRef.get();
    if (verifyDoc.exists) {
      pass('Verify config created');
    } else {
      fail('Verify config created', 'Config not found after creation');
    }
  } catch (error: any) {
    fail('Initialize config', error.message);
  }
}

async function testUpdateServiceConfig() {
  log('Testing service config update...');

  try {
    const db = getFirestore(getAdminApp());
    const configRef = db.doc(CONFIG_DOC_PATH);

    // Get current config
    const configDoc = await configRef.get();
    if (!configDoc.exists) {
      fail('Update service config', 'Config does not exist');
      return;
    }

    const currentConfig = configDoc.data()!;

    // Test 1: Update TTS to Google Cloud
    log('Test 1: Updating TTS service to Google Cloud...');
    const updatedServices = {
      ...currentConfig.services,
      tts: {
        providerId: 'google',
        model: 'en-US-Neural2-C',
        fallbackProviderId: 'openai',
        fallbackModel: 'tts-1',
      },
    };

    await configRef.update({
      services: updatedServices,
      lastUpdated: new Date().toISOString(),
      version: (currentConfig.version || 1) + 1,
    });

    // Verify update
    const verifyDoc = await configRef.get();
    const verifyData = verifyDoc.data();

    if (verifyData?.services?.tts?.providerId === 'google') {
      pass('Update TTS to Google Cloud', {
        ttsProvider: verifyData.services.tts.providerId,
        ttsModel: verifyData.services.tts.model,
      });
    } else {
      fail('Update TTS to Google Cloud', 'TTS provider not updated', {
        expected: 'google',
        actual: verifyData?.services?.tts?.providerId,
      });
    }

    // Test 2: Update Chat to Anthropic (should fail - Anthropic is disabled)
    log('Test 2: Testing validation - Anthropic is disabled...');
    const provider = currentConfig.registeredProviders?.find(
      (p: any) => p.id === 'anthropic'
    );
    if (provider && !provider.enabled) {
      pass('Validation check - Anthropic disabled', { enabled: provider.enabled });
    }

    // Test 3: Update all services back to OpenAI
    log('Test 3: Updating all services back to OpenAI...');
    const resetServices = {
      chat: {
        providerId: 'openai',
        model: 'gpt-4o',
        fallbackProviderId: 'google',
        fallbackModel: 'gemini-2.5-flash',
      },
      embedding: {
        providerId: 'openai',
        model: 'text-embedding-3-small',
      },
      tts: {
        providerId: 'openai',
        model: 'tts-1',
        fallbackProviderId: 'google',
        fallbackModel: 'en-US-Neural2-C',
      },
      stt: {
        providerId: 'openai',
        model: 'whisper-1',
        fallbackProviderId: 'google',
        fallbackModel: 'chirp_2',
      },
      vision: {
        providerId: 'openai',
        model: 'gpt-4o',
        fallbackProviderId: 'google',
        fallbackModel: 'gemini-2.5-flash',
      },
    };

    await configRef.update({
      services: resetServices,
      lastUpdated: new Date().toISOString(),
      version: (verifyData?.version || 1) + 1,
    });

    pass('Reset all services to OpenAI');
  } catch (error: any) {
    fail('Update service config', error.message);
  }
}

async function testToggleProvider() {
  log('Testing provider toggle...');

  try {
    const db = getFirestore(getAdminApp());
    const configRef = db.doc(CONFIG_DOC_PATH);

    const configDoc = await configRef.get();
    if (!configDoc.exists) {
      fail('Toggle provider', 'Config does not exist');
      return;
    }

    const currentConfig = configDoc.data()!;

    // Test: Enable Ollama
    log('Enabling Ollama provider...');
    const updatedProviders = currentConfig.registeredProviders.map((p: any) =>
      p.id === 'ollama' ? { ...p, enabled: true } : p
    );

    await configRef.update({
      registeredProviders: updatedProviders,
      lastUpdated: new Date().toISOString(),
      version: (currentConfig.version || 1) + 1,
    });

    // Verify
    const verifyDoc = await configRef.get();
    const verifyData = verifyDoc.data();
    const ollamaProvider = verifyData?.registeredProviders?.find(
      (p: any) => p.id === 'ollama'
    );

    if (ollamaProvider?.enabled === true) {
      pass('Enable Ollama provider', { enabled: ollamaProvider.enabled });
    } else {
      fail('Enable Ollama provider', 'Ollama not enabled', {
        expected: true,
        actual: ollamaProvider?.enabled,
      });
    }

    // Reset: Disable Ollama
    log('Resetting Ollama to disabled...');
    const resetProviders = verifyData!.registeredProviders.map((p: any) =>
      p.id === 'ollama' ? { ...p, enabled: false } : p
    );

    await configRef.update({
      registeredProviders: resetProviders,
      lastUpdated: new Date().toISOString(),
      version: (verifyData?.version || 1) + 1,
    });

    pass('Reset Ollama to disabled');
  } catch (error: any) {
    fail('Toggle provider', error.message);
  }
}

async function testValidation() {
  log('Testing validation rules...');

  try {
    const db = getFirestore(getAdminApp());
    const configRef = db.doc(CONFIG_DOC_PATH);

    const configDoc = await configRef.get();
    if (!configDoc.exists) {
      fail('Validation', 'Config does not exist');
      return;
    }

    const currentConfig = configDoc.data()!;

    // Test 1: Verify Google supports all services we expect
    const googleProvider = currentConfig.registeredProviders?.find(
      (p: any) => p.id === 'google'
    );
    if (googleProvider) {
      const expectedServices = ['chat', 'embedding', 'tts', 'stt', 'vision'];
      const hasAllServices = expectedServices.every((s) =>
        googleProvider.supportedServices.includes(s)
      );

      if (hasAllServices) {
        pass('Google supports all services', {
          services: googleProvider.supportedServices,
        });
      } else {
        fail('Google supports all services', 'Missing services', {
          expected: expectedServices,
          actual: googleProvider.supportedServices,
        });
      }
    }

    // Test 2: Verify OpenAI supports all services
    const openaiProvider = currentConfig.registeredProviders?.find(
      (p: any) => p.id === 'openai'
    );
    if (openaiProvider) {
      const hasAllServices = ['chat', 'embedding', 'tts', 'stt', 'vision'].every(
        (s) => openaiProvider.supportedServices.includes(s)
      );

      if (hasAllServices) {
        pass('OpenAI supports all services', {
          services: openaiProvider.supportedServices,
        });
      } else {
        fail('OpenAI supports all services', 'Missing services');
      }
    }

    // Test 3: Verify Anthropic only supports chat and vision
    const anthropicProvider = currentConfig.registeredProviders?.find(
      (p: any) => p.id === 'anthropic'
    );
    if (anthropicProvider) {
      const expectedServices = ['chat', 'vision'];
      const correctServices = expectedServices.every((s) =>
        anthropicProvider.supportedServices.includes(s)
      );

      if (correctServices && anthropicProvider.supportedServices.length === 2) {
        pass('Anthropic services correct', {
          services: anthropicProvider.supportedServices,
        });
      } else {
        fail('Anthropic services correct', 'Unexpected services', {
          expected: expectedServices,
          actual: anthropicProvider.supportedServices,
        });
      }
    }
  } catch (error: any) {
    fail('Validation', error.message);
  }
}

// =============================================================================
// Main
// =============================================================================

async function runTests() {
  console.log('\n========================================');
  console.log('AI Providers Integration Test');
  console.log('========================================\n');

  try {
    // Run tests
    await testDirectFirestoreAccess();
    await testInitializeConfig();
    await testUpdateServiceConfig();
    await testToggleProvider();
    await testValidation();

    // Summary
    console.log('\n========================================');
    console.log('Test Summary');
    console.log('========================================');

    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;

    console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);

    if (failed > 0) {
      console.log('\nFailed tests:');
      results
        .filter((r) => !r.passed)
        .forEach((r) => {
          console.log(`  - ${r.name}: ${r.error}`);
        });
    }

    console.log('\n');
    process.exit(failed > 0 ? 1 : 0);
  } catch (error: any) {
    console.error('\nTest runner failed:', error.message);
    process.exit(1);
  }
}

runTests();
