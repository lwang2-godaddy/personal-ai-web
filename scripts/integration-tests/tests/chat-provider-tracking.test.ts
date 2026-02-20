/**
 * Chat Provider Tracking Integration Test
 *
 * Tests that provider/model information is correctly stored with chat messages
 * and returned in the admin chat history API.
 *
 * Run: npx tsx scripts/integration-tests/tests/chat-provider-tracking.test.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

const TEST_USER_ID = process.env.TEST_USER_ID || 'test-provider-tracking-user';

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

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

function log(message: string) {
  console.log(`[Chat Provider Tracking Test] ${message}`);
}

function pass(name: string, details?: any) {
  results.push({ name, passed: true, details });
  log(`\u2705 ${name}`);
}

function fail(name: string, error: string, details?: any) {
  results.push({ name, passed: false, error, details });
  log(`\u274C ${name}: ${error}`);
}

// =============================================================================
// Tests
// =============================================================================

async function testChatMessageSchema() {
  log('Testing chat message schema has provider fields...');

  try {
    const db = getFirestore(getAdminApp());

    // Create a test message with provider tracking fields
    const testMsgRef = db.collection('chat_messages').doc('test_provider_tracking_msg');
    const testMessage = {
      userId: TEST_USER_ID,
      conversationId: 'test_conversation_provider',
      role: 'assistant',
      content: 'Test response with provider tracking',
      timestamp: new Date().toISOString(),
      contextUsed: [],
      // Provider tracking fields
      provider: 'openai',
      model: 'gpt-4o',
      inputTokens: 100,
      outputTokens: 50,
      latencyMs: 500,
      estimatedCostUSD: 0.0025,
      promptExecutionId: 'exec_test_12345',
    };

    await testMsgRef.set(testMessage);
    pass('Created test message with provider fields');

    // Verify message was saved correctly
    const savedDoc = await testMsgRef.get();
    const savedData = savedDoc.data();

    if (!savedData) {
      fail('Verify message saved', 'Message not found');
      return;
    }

    // Check all provider fields exist
    const requiredFields = ['provider', 'model', 'inputTokens', 'outputTokens', 'latencyMs', 'estimatedCostUSD'];
    const missingFields = requiredFields.filter(field => savedData[field] === undefined);

    if (missingFields.length === 0) {
      pass('All provider fields saved', {
        provider: savedData.provider,
        model: savedData.model,
        tokens: `${savedData.inputTokens}+${savedData.outputTokens}`,
        latencyMs: savedData.latencyMs,
        cost: savedData.estimatedCostUSD,
      });
    } else {
      fail('Provider fields saved', `Missing fields: ${missingFields.join(', ')}`);
    }

    // Cleanup
    await testMsgRef.delete();
    pass('Cleaned up test message');
  } catch (error: any) {
    fail('Chat message schema test', error.message);
  }
}

async function testBackwardCompatibility() {
  log('Testing backward compatibility with messages without provider fields...');

  try {
    const db = getFirestore(getAdminApp());

    // Create a legacy message without provider fields
    const legacyMsgRef = db.collection('chat_messages').doc('test_legacy_msg');
    const legacyMessage = {
      userId: TEST_USER_ID,
      conversationId: 'test_conversation_legacy',
      role: 'assistant',
      content: 'Legacy message without provider tracking',
      timestamp: new Date().toISOString(),
      contextUsed: [],
      // No provider fields - simulating old messages
    };

    await legacyMsgRef.set(legacyMessage);

    // Verify message can be read and provider fields are undefined/missing
    const savedDoc = await legacyMsgRef.get();
    const savedData = savedDoc.data();

    if (!savedData) {
      fail('Read legacy message', 'Message not found');
      return;
    }

    if (savedData.provider === undefined && savedData.model === undefined) {
      pass('Legacy message without provider fields works', {
        hasProvider: savedData.provider !== undefined,
        hasModel: savedData.model !== undefined,
      });
    } else {
      fail('Legacy message test', 'Unexpected provider fields on legacy message');
    }

    // Cleanup
    await legacyMsgRef.delete();
    pass('Cleaned up legacy test message');
  } catch (error: any) {
    fail('Backward compatibility test', error.message);
  }
}

async function testProviderStatsAggregation() {
  log('Testing provider stats aggregation from multiple messages...');

  try {
    const db = getFirestore(getAdminApp());
    const conversationId = 'test_conversation_stats';

    // Create multiple messages with different providers
    const messages = [
      {
        userId: TEST_USER_ID,
        conversationId,
        role: 'user',
        content: 'Question 1',
        timestamp: new Date(Date.now() - 4000).toISOString(),
      },
      {
        userId: TEST_USER_ID,
        conversationId,
        role: 'assistant',
        content: 'Answer 1',
        timestamp: new Date(Date.now() - 3000).toISOString(),
        provider: 'openai',
        model: 'gpt-4o',
        inputTokens: 100,
        outputTokens: 50,
        latencyMs: 500,
        estimatedCostUSD: 0.0025,
      },
      {
        userId: TEST_USER_ID,
        conversationId,
        role: 'user',
        content: 'Question 2',
        timestamp: new Date(Date.now() - 2000).toISOString(),
      },
      {
        userId: TEST_USER_ID,
        conversationId,
        role: 'assistant',
        content: 'Answer 2',
        timestamp: new Date(Date.now() - 1000).toISOString(),
        provider: 'openai',
        model: 'gpt-4o-mini',
        inputTokens: 80,
        outputTokens: 40,
        latencyMs: 300,
        estimatedCostUSD: 0.0001,
      },
    ];

    const msgRefs: any[] = [];
    for (const msg of messages) {
      const ref = db.collection('chat_messages').doc();
      await ref.set(msg);
      msgRefs.push(ref);
    }

    pass('Created test messages for aggregation');

    // Query messages and aggregate stats
    const snapshot = await db.collection('chat_messages')
      .where('conversationId', '==', conversationId)
      .get();

    const assistantMsgs = snapshot.docs
      .map(doc => doc.data())
      .filter(msg => msg.role === 'assistant');

    // Calculate aggregated stats
    const providerBreakdown: Record<string, number> = {};
    let totalCost = 0;
    let totalTokens = 0;

    assistantMsgs.forEach(msg => {
      if (msg.provider) {
        providerBreakdown[msg.provider] = (providerBreakdown[msg.provider] || 0) + 1;
      }
      if (msg.estimatedCostUSD) {
        totalCost += msg.estimatedCostUSD;
      }
      if (msg.inputTokens || msg.outputTokens) {
        totalTokens += (msg.inputTokens || 0) + (msg.outputTokens || 0);
      }
    });

    if (providerBreakdown['openai'] === 2 && totalTokens === 270 && Math.abs(totalCost - 0.0026) < 0.0001) {
      pass('Provider stats aggregation', {
        providerBreakdown,
        totalCost: totalCost.toFixed(4),
        totalTokens,
      });
    } else {
      fail('Provider stats aggregation', 'Stats mismatch', {
        expected: { openai: 2, totalTokens: 270, totalCost: 0.0026 },
        actual: { providerBreakdown, totalTokens, totalCost },
      });
    }

    // Cleanup
    for (const ref of msgRefs) {
      await ref.delete();
    }
    pass('Cleaned up aggregation test messages');
  } catch (error: any) {
    fail('Provider stats aggregation test', error.message);
  }
}

async function testPromptExecutionIdLink() {
  log('Testing promptExecutionId links to promptExecutions collection...');

  try {
    const db = getFirestore(getAdminApp());

    // Create a prompt execution record
    const executionId = `exec_${Date.now()}_test`;
    const executionRef = db.collection('promptExecutions').doc(executionId);
    const executionData = {
      userId: TEST_USER_ID,
      service: 'queryRAG',
      providerId: 'openai',
      providerType: 'cloud',
      model: 'gpt-4o',
      inputTokens: 150,
      outputTokens: 75,
      latencyMs: 600,
      success: true,
      timestamp: new Date().toISOString(),
    };
    await executionRef.set(executionData);

    // Create a chat message linking to the execution
    const msgRef = db.collection('chat_messages').doc('test_linked_msg');
    const messageData = {
      userId: TEST_USER_ID,
      conversationId: 'test_conversation_linked',
      role: 'assistant',
      content: 'Response with linked execution',
      timestamp: new Date().toISOString(),
      provider: 'openai',
      model: 'gpt-4o',
      inputTokens: 150,
      outputTokens: 75,
      latencyMs: 600,
      estimatedCostUSD: 0.003,
      promptExecutionId: executionId,
    };
    await msgRef.set(messageData);

    // Verify the link works
    const savedMsg = await msgRef.get();
    const savedMsgData = savedMsg.data();

    if (savedMsgData?.promptExecutionId) {
      const linkedExecution = await db.collection('promptExecutions').doc(savedMsgData.promptExecutionId).get();
      if (linkedExecution.exists) {
        const linkedData = linkedExecution.data();
        if (linkedData?.model === savedMsgData.model) {
          pass('PromptExecutionId link verified', {
            executionId: savedMsgData.promptExecutionId,
            linkedModel: linkedData.model,
            msgModel: savedMsgData.model,
          });
        } else {
          fail('PromptExecutionId link', 'Model mismatch between message and execution');
        }
      } else {
        fail('PromptExecutionId link', 'Linked execution not found');
      }
    } else {
      fail('PromptExecutionId link', 'promptExecutionId not saved in message');
    }

    // Cleanup
    await msgRef.delete();
    await executionRef.delete();
    pass('Cleaned up linked message test');
  } catch (error: any) {
    fail('PromptExecutionId link test', error.message);
  }
}

async function testQueryMessagesByProvider() {
  log('Testing querying messages by provider...');

  try {
    const db = getFirestore(getAdminApp());
    const conversationId = 'test_conversation_query_provider';

    // Create messages with different providers
    const messages = [
      {
        userId: TEST_USER_ID,
        conversationId,
        role: 'assistant',
        content: 'OpenAI response',
        timestamp: new Date(Date.now() - 2000).toISOString(),
        provider: 'openai',
        model: 'gpt-4o',
      },
      {
        userId: TEST_USER_ID,
        conversationId,
        role: 'assistant',
        content: 'Google response',
        timestamp: new Date(Date.now() - 1000).toISOString(),
        provider: 'google',
        model: 'gemini-2.5-flash',
      },
    ];

    const msgRefs: any[] = [];
    for (const msg of messages) {
      const ref = db.collection('chat_messages').doc();
      await ref.set(msg);
      msgRefs.push(ref);
    }

    // Query only OpenAI messages
    const openaiSnapshot = await db.collection('chat_messages')
      .where('conversationId', '==', conversationId)
      .where('provider', '==', 'openai')
      .get();

    if (openaiSnapshot.size === 1) {
      const openaiMsg = openaiSnapshot.docs[0].data();
      if (openaiMsg.model === 'gpt-4o') {
        pass('Query messages by provider', {
          provider: 'openai',
          count: openaiSnapshot.size,
          model: openaiMsg.model,
        });
      } else {
        fail('Query messages by provider', 'Wrong model in result');
      }
    } else {
      fail('Query messages by provider', `Expected 1 result, got ${openaiSnapshot.size}`);
    }

    // Cleanup
    for (const ref of msgRefs) {
      await ref.delete();
    }
    pass('Cleaned up query test messages');
  } catch (error: any) {
    fail('Query messages by provider test', error.message);
  }
}

// =============================================================================
// Main
// =============================================================================

async function runTests() {
  console.log('\n========================================');
  console.log('Chat Provider Tracking Integration Test');
  console.log('========================================\n');

  try {
    // Initialize Firebase
    getAdminApp();
    pass('Firebase Admin initialized');

    // Run tests
    await testChatMessageSchema();
    await testBackwardCompatibility();
    await testProviderStatsAggregation();
    await testPromptExecutionIdLink();
    await testQueryMessagesByProvider();

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
