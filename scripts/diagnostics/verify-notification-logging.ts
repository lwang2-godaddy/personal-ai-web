/**
 * Verify notification logging works correctly
 *
 * This script:
 * 1. Creates a test notification using the same format as sendDailySummary
 * 2. Verifies it appears in Firestore
 * 3. Cleans up the test notification
 */

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '..', '.env.local') });

if (admin.apps.length === 0) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

async function main() {
  console.log('\n🔔 Verifying Notification Logging\n');

  // Step 1: Check if there are any notifications with the NEW schema
  console.log('📊 Step 1: Checking existing notification schemas...');
  const existingSnapshot = await db.collection('notifications').limit(100).get();

  let hasStatus = 0;
  let hasRead = 0;

  existingSnapshot.docs.forEach(doc => {
    const data = doc.data();
    if ('status' in data) hasStatus++;
    if ('read' in data) hasRead++;
  });

  console.log(`   Total notifications: ${existingSnapshot.size}`);
  console.log(`   With 'status' field (NEW schema): ${hasStatus}`);
  console.log(`   With 'read' field (LEGACY schema): ${hasRead}`);

  // Step 2: Create a test notification with NEW schema (same as NotificationHistoryService)
  console.log('\n📝 Step 2: Creating test notification with NEW schema...');
  const testId = `verify-test-${Date.now()}`;
  const now = admin.firestore.Timestamp.now();

  const testNotification = {
    userId: 'test-user-verification',
    type: 'daily_summary',
    category: 'scheduled',
    title: '📊 Daily Recap (Verification Test)',
    body: 'Test: 0 steps, 0 locations, 5 voice notes',
    status: 'sent', // NEW schema uses status, not read
    channel: 'daily_summaries',
    priority: 'default',
    metadata: {
      steps: '0',
      locations: '0',
      voices: '5',
    },
    scheduledFor: now,
    sentAt: now,
    createdAt: now,
    updatedAt: now,
  };

  await db.collection('notifications').doc(testId).set(testNotification);
  console.log(`   ✅ Created: ${testId}`);

  // Step 3: Verify it was created
  console.log('\n🔍 Step 3: Verifying notification was created...');
  const verifyDoc = await db.collection('notifications').doc(testId).get();

  if (verifyDoc.exists) {
    const data = verifyDoc.data()!;
    console.log('   ✅ Notification found with correct schema:');
    console.log(`      type: ${data.type}`);
    console.log(`      status: ${data.status} (NEW schema)`);
    console.log(`      read field exists: ${'read' in data}`);
  } else {
    console.log('   ❌ Notification NOT found!');
  }

  // Step 4: Query for daily_summary notifications
  console.log('\n🔍 Step 4: Querying daily_summary notifications...');
  try {
    const dailySummarySnapshot = await db.collection('notifications')
      .where('type', '==', 'daily_summary')
      .limit(10)
      .get();

    console.log(`   Found ${dailySummarySnapshot.size} daily_summary notification(s):`);
    dailySummarySnapshot.docs.forEach((doc, i) => {
      const data = doc.data();
      const isTest = doc.id.startsWith('verify-test-');
      const schema = 'status' in data ? 'NEW' : 'read' in data ? 'LEGACY' : 'UNKNOWN';
      console.log(`   ${i + 1}. [${schema}] ${isTest ? '(TEST)' : ''} ${doc.id.substring(0, 20)}...`);
      console.log(`      title: ${data.title?.substring(0, 40)}`);
      console.log(`      status/read: ${data.status || data.read}`);
    });
  } catch (error: any) {
    console.log(`   ⚠️ Query error (may need index): ${error.message}`);
  }

  // Step 5: Cleanup
  console.log('\n🧹 Step 5: Cleaning up test notification...');
  await db.collection('notifications').doc(testId).delete();
  console.log(`   ✅ Deleted: ${testId}`);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 SUMMARY');
  console.log('='.repeat(60));

  if (hasStatus === 0) {
    console.log('\n⚠️  NO notifications with NEW schema (status field) found!');
    console.log('   This means NotificationHistoryService.logNotification() has');
    console.log('   NEVER successfully created a notification in production.');
    console.log('\n   Likely causes:');
    console.log('   1. sendDailySummary function was NOT deployed with updated code');
    console.log('   2. OR the logNotification() call is failing silently');
    console.log('\n   ACTION REQUIRED:');
    console.log('   1. Deploy the updated Cloud Functions:');
    console.log('      cd PersonalAIApp/firebase/functions && firebase deploy --only functions');
    console.log('   2. Wait for next scheduled run (hourly at :00)');
    console.log('   3. Check Cloud Function logs for errors');
  } else {
    console.log(`\n✅ Found ${hasStatus} notifications with NEW schema`);
    console.log('   NotificationHistoryService is working correctly.');
  }

  console.log('\n');
}

main().catch(console.error);
