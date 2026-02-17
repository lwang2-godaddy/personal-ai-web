/**
 * Conversation Threads - Integration Tests
 *
 * Tests the conversation threads feature which allows users to have
 * persistent chat conversations with the AI assistant.
 *
 * Firestore Collections:
 * - conversations - Conversation thread metadata
 * - conversations/{id}/messages - Messages within a conversation
 *
 * Test Cases:
 * 1. Create a test conversation document
 * 2. Fetch conversations for the test user
 * 3. Verify conversation has required fields
 * 4. Test conversation message subcollection
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
export const name = 'Conversation Threads';

// Test data cleanup tracker
const createdDocIds: { collection: string; id: string; subcollections?: { collection: string; id: string }[] }[] = [];

/**
 * Main test runner - exported for test discovery
 */
export async function run(): Promise<TestResult[]> {
  const { db, userId } = globalThis.testContext;
  const allResults: TestResult[] = [];

  // Test Case 1: Create a test conversation
  const test1Results = await testCreateConversation(db, userId);
  allResults.push(...test1Results);

  // Test Case 2: Fetch conversations for user
  const test2Results = await testFetchUserConversations(db, userId);
  allResults.push(...test2Results);

  // Test Case 3: Verify conversation required fields
  const test3Results = await testConversationRequiredFields(db, userId);
  allResults.push(...test3Results);

  // Test Case 4: Test message subcollection
  const test4Results = await testConversationMessages(db, userId);
  allResults.push(...test4Results);

  // Cleanup
  await cleanup(db);

  return allResults;
}

/**
 * Test Case 1: Create a test conversation document
 */
async function testCreateConversation(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const testName = 'Conversations: Create conversation document';
  logTestCase(testName);

  try {
    const testId = generateTestId();
    const now = new Date().toISOString();

    const conversation = {
      userId,
      title: `Integration Test Conversation ${testId}`,
      lastMessageAt: now,
      messageCount: 0,
      isArchived: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('conversations').add(conversation);
    createdDocIds.push({ collection: 'conversations', id: docRef.id });

    // Wait for write to complete
    await wait(500);

    // Read back and verify
    const doc = await docRef.get();
    const data = doc.data();

    if (!data) {
      logFail('Document not found after creation');
      return [{
        name: testName,
        passed: false,
        reason: 'Document not found after creation',
      }];
    }

    const hasUserId = data.userId === userId;
    const hasTitle = typeof data.title === 'string' && data.title.length > 0;
    const hasCreatedAt = data.createdAt && typeof data.createdAt.toDate === 'function';
    const passed = hasUserId && hasTitle && hasCreatedAt;

    if (passed) {
      logPass(`Created conversation: ${docRef.id}`);
      log(`  Title: ${data.title}`, colors.dim);
    } else {
      logFail('Created document missing required fields');
    }

    return [{
      name: testName,
      passed,
      reason: passed
        ? `Successfully created conversation ${docRef.id}`
        : 'Created conversation missing required fields',
      details: {
        docId: docRef.id,
        hasUserId,
        hasTitle,
        hasCreatedAt,
      },
    }];
  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    return [{
      name: testName,
      passed: false,
      reason: `Error creating conversation: ${error.message}`,
    }];
  }
}

/**
 * Test Case 2: Fetch conversations for user
 */
async function testFetchUserConversations(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const testName = 'Conversations: Fetch user conversations';
  logTestCase(testName);

  try {
    const snapshot = await db.collection('conversations')
      .where('userId', '==', userId)
      .limit(20)
      .get();

    logQueryBox('User Conversations', [
      'Collection: conversations',
      `where userId == "${userId.substring(0, 8)}..."`,
      `Found: ${snapshot.size} conversations`,
    ]);

    // Should have at least the one we created in test 1
    const passed = snapshot.size > 0;

    if (passed) {
      logPass(`Found ${snapshot.size} conversations for user`);
      snapshot.docs.slice(0, 3).forEach((doc) => {
        const data = doc.data();
        log(`  - ${doc.id}: "${data.title || '(untitled)'}" (${data.messageCount || 0} msgs)`, colors.dim);
      });
    } else {
      logFail('No conversations found for user');
    }

    return [{
      name: testName,
      passed,
      reason: passed
        ? `Found ${snapshot.size} conversations for user`
        : 'No conversations found (expected at least the test conversation)',
      details: {
        count: snapshot.size,
        conversations: snapshot.docs.slice(0, 5).map(d => ({
          id: d.id,
          title: d.data().title,
          messageCount: d.data().messageCount,
        })),
      },
    }];
  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    return [{
      name: testName,
      passed: false,
      reason: `Error fetching conversations: ${error.message}`,
    }];
  }
}

/**
 * Test Case 3: Verify conversation has required fields
 */
async function testConversationRequiredFields(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const testName = 'Conversations: Required fields present';
  logTestCase(testName);

  try {
    const snapshot = await db.collection('conversations')
      .where('userId', '==', userId)
      .limit(5)
      .get();

    if (snapshot.size === 0) {
      logInfo('No conversations to validate');
      return [{
        name: testName,
        passed: true,
        reason: 'No conversations available to validate',
        skipped: true,
      }];
    }

    const requiredFields = ['userId', 'createdAt'];
    let validCount = 0;
    let invalidCount = 0;
    const issues: string[] = [];

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const missingFields = requiredFields.filter(f => data[f] === undefined || data[f] === null);

      if (missingFields.length === 0) {
        // Validate userId matches
        if (data.userId === userId) {
          validCount++;
        } else {
          invalidCount++;
          issues.push(`${doc.id}: userId mismatch`);
        }
      } else {
        invalidCount++;
        issues.push(`${doc.id}: missing ${missingFields.join(', ')}`);
      }
    });

    const passed = invalidCount === 0;

    if (passed) {
      logPass(`All ${validCount} conversations have required fields`);
    } else {
      logFail(`${invalidCount} conversations with issues`);
      issues.forEach(i => log(`    ${i}`, colors.dim));
    }

    return [{
      name: testName,
      passed,
      reason: passed
        ? `All ${validCount} conversations have valid required fields`
        : `${invalidCount} conversations with structural issues`,
      details: { validCount, invalidCount, issues },
    }];
  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    return [{
      name: testName,
      passed: false,
      reason: `Error validating conversation fields: ${error.message}`,
    }];
  }
}

/**
 * Test Case 4: Test conversation message subcollection
 */
async function testConversationMessages(
  db: admin.firestore.Firestore,
  userId: string
): Promise<TestResult[]> {
  const testName = 'Conversations: Message subcollection works';
  logTestCase(testName);

  try {
    // Find our test conversation (the one we created)
    const testConvSnapshot = await db.collection('conversations')
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (testConvSnapshot.empty) {
      logInfo('No conversation found to test messages');
      return [{
        name: testName,
        passed: true,
        reason: 'No conversation available to test messages',
        skipped: true,
      }];
    }

    const convId = testConvSnapshot.docs[0].id;

    // Add a test message to the subcollection
    const testMessage = {
      role: 'user',
      content: 'Integration test message',
      timestamp: new Date().toISOString(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const msgRef = await db.collection('conversations').doc(convId)
      .collection('messages').add(testMessage);

    // Track for cleanup
    const convEntry = createdDocIds.find(d => d.id === convId && d.collection === 'conversations');
    if (convEntry) {
      convEntry.subcollections = convEntry.subcollections || [];
      convEntry.subcollections.push({ collection: 'messages', id: msgRef.id });
    }

    await wait(500);

    // Read back message
    const msgDoc = await msgRef.get();
    const msgData = msgDoc.data();

    if (!msgData) {
      logFail('Message not found after creation');
      return [{
        name: testName,
        passed: false,
        reason: 'Message document not found after creation',
      }];
    }

    const hasRole = typeof msgData.role === 'string';
    const hasContent = typeof msgData.content === 'string';
    const passed = hasRole && hasContent;

    logQueryBox('Conversation Messages', [
      `Conversation: ${convId}`,
      `Message: ${msgRef.id}`,
      `Role: ${msgData.role}`,
      `Content length: ${msgData.content?.length || 0}`,
    ]);

    if (passed) {
      logPass(`Message created and retrieved successfully`);
    } else {
      logFail('Message missing required fields (role or content)');
    }

    return [{
      name: testName,
      passed,
      reason: passed
        ? 'Message subcollection write/read works correctly'
        : 'Message missing required fields',
      details: {
        conversationId: convId,
        messageId: msgRef.id,
        hasRole,
        hasContent,
      },
    }];
  } catch (error: any) {
    logFail(`Error: ${error.message}`);
    return [{
      name: testName,
      passed: false,
      reason: `Error testing messages: ${error.message}`,
    }];
  }
}

/**
 * Cleanup test data
 */
async function cleanup(db: admin.firestore.Firestore): Promise<void> {
  if (createdDocIds.length === 0) {
    return;
  }

  const cleanupItems: string[] = [];
  createdDocIds.forEach(({ collection, id, subcollections }) => {
    if (subcollections) {
      subcollections.forEach(sub => {
        cleanupItems.push(`${collection}/${id}/${sub.collection}/${sub.id}`);
      });
    }
    cleanupItems.push(`${collection}/${id}`);
  });
  logCleanup(cleanupItems);

  let deleted = 0;
  let failed = 0;

  // Delete subcollection documents first
  for (const { collection, id, subcollections } of createdDocIds) {
    if (subcollections) {
      for (const sub of subcollections) {
        try {
          await db.collection(collection).doc(id).collection(sub.collection).doc(sub.id).delete();
          deleted++;
        } catch (error) {
          failed++;
        }
      }
    }
  }

  // Then delete parent documents
  for (const { collection, id } of createdDocIds) {
    try {
      await db.collection(collection).doc(id).delete();
      deleted++;
    } catch (error) {
      failed++;
    }
  }

  const success = failed === 0;
  const message = success
    ? undefined
    : `Deleted ${deleted}, failed ${failed}`;
  logCleanupResult(success, message);
}

/**
 * Cleanup function exported for test runner
 */
export async function cleanupTestData(): Promise<void> {
  const { db } = globalThis.testContext;
  await cleanup(db);
}
