/**
 * Check for daily_summary notifications in Firestore
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
  console.log('\n🔍 Searching for daily_summary notifications...\n');

  try {
    const snapshot = await db.collection('notifications')
      .where('type', '==', 'daily_summary')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    if (snapshot.empty) {
      console.log('❌ No daily_summary notifications found!\n');
      console.log('This explains why it does not show in the admin portal.');
      console.log('The sendDailySummary function may not have run yet after deployment.\n');

      // Check total notification count
      const totalCount = await db.collection('notifications').count().get();
      console.log(`Total notifications in collection: ${totalCount.data().count}`);

      // Check most recent notification
      const recentSnapshot = await db.collection('notifications')
        .orderBy('createdAt', 'desc')
        .limit(3)
        .get();

      if (!recentSnapshot.empty) {
        console.log('\nMost recent notifications:');
        recentSnapshot.docs.forEach((doc, i) => {
          const data = doc.data();
          console.log(`  ${i + 1}. type=${data.type}, title="${data.title?.substring(0, 40)}"`);
        });
      }
      return;
    }

    console.log(`Found ${snapshot.size} daily_summary notifications:\n`);
    snapshot.docs.forEach((doc, i) => {
      const data = doc.data();
      console.log(`${i + 1}. ID: ${doc.id}`);
      console.log(`   userId: ${data.userId}`);
      console.log(`   title: ${data.title}`);
      console.log(`   body: ${data.body}`);
      console.log(`   status: ${data.status || '(no status field)'}`);
      console.log(`   read: ${data.read !== undefined ? data.read : '(no read field)'}`);
      console.log(`   createdAt: ${data.createdAt?.toDate?.()?.toISOString() || 'unknown'}`);
      console.log('');
    });
  } catch (error: any) {
    if (error.message.includes('index')) {
      console.log('Index not ready, trying without orderBy...');

      const snapshot = await db.collection('notifications')
        .where('type', '==', 'daily_summary')
        .limit(10)
        .get();

      console.log(`Found ${snapshot.size} daily_summary notifications`);
    } else {
      throw error;
    }
  }
}

main().catch(console.error);
