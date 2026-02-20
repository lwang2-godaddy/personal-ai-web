/**
 * Quick diagnostic: check mood entries format in Firestore
 */
import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Use same initialization pattern as integration tests
if (!admin.apps.length) {
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (serviceAccountPath) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } else if (serviceAccountJson) {
    const serviceAccount = JSON.parse(serviceAccountJson);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } else if (projectId) {
    admin.initializeApp({ projectId });
  } else {
    throw new Error('No Firebase credentials found');
  }
}

const db = admin.firestore();

async function debugMoodData() {
  const userId = 'CzmvxsakLIWyLUlYd4IbLTRZ7Rx1';

  // Query without date filter first - just check if entries exist
  console.log('=== Checking moodEntries for user ===');
  const allEntries = await db.collection('moodEntries')
    .where('userId', '==', userId)
    .limit(5)
    .get();

  console.log(`Total entries found (no date filter): ${allEntries.size}`);

  if (allEntries.size > 0) {
    const firstDoc = allEntries.docs[0].data();
    console.log('\nFirst entry fields:');
    console.log('  id:', allEntries.docs[0].id);
    console.log('  createdAt value:', firstDoc.createdAt);
    console.log('  createdAt type:', typeof firstDoc.createdAt);
    console.log('  createdAt constructor:', firstDoc.createdAt?.constructor?.name);
    console.log('  Has toDate():', typeof firstDoc.createdAt?.toDate === 'function');

    if (firstDoc.createdAt?.toDate) {
      console.log('  createdAt as Date:', firstDoc.createdAt.toDate());
    } else if (typeof firstDoc.createdAt === 'number') {
      console.log('  createdAt as Date:', new Date(firstDoc.createdAt));
    }

    console.log('  primaryEmotion:', firstDoc.primaryEmotion);
    console.log('  sentimentScore:', firstDoc.sentimentScore);
    console.log('  userId:', firstDoc.userId);

    // Now try with Timestamp filter
    console.log('\n=== Testing Timestamp query ===');
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const startTimestamp = admin.firestore.Timestamp.fromDate(startDate);
    const endTimestamp = admin.firestore.Timestamp.fromDate(endDate);

    console.log('Start:', startDate.toISOString(), '→ Timestamp:', startTimestamp);
    console.log('End:', endDate.toISOString(), '→ Timestamp:', endTimestamp);

    try {
      const timestampQuery = await db.collection('moodEntries')
        .where('userId', '==', userId)
        .where('createdAt', '>=', startTimestamp)
        .where('createdAt', '<=', endTimestamp)
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get();
      console.log(`Timestamp query results: ${timestampQuery.size}`);
    } catch (err: any) {
      console.error('Timestamp query ERROR:', err.message);
    }

    // Try with milliseconds
    console.log('\n=== Testing milliseconds query ===');
    try {
      const msQuery = await db.collection('moodEntries')
        .where('userId', '==', userId)
        .where('createdAt', '>=', startDate.getTime())
        .where('createdAt', '<=', endDate.getTime())
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get();
      console.log(`Milliseconds query results: ${msQuery.size}`);
    } catch (err: any) {
      console.error('Milliseconds query ERROR:', err.message);
    }
  } else {
    console.log('No entries found for this user!');

    // Check if there are entries for any user
    const anyEntries = await db.collection('moodEntries').limit(3).get();
    console.log(`\nTotal entries in collection (any user): ${anyEntries.size}`);
    if (anyEntries.size > 0) {
      anyEntries.docs.forEach(doc => {
        console.log(`  userId: ${doc.data().userId}, createdAt type: ${typeof doc.data().createdAt}`);
      });
    }
  }
}

debugMoodData().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
