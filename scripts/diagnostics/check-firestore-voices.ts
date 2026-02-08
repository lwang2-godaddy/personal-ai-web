#!/usr/bin/env npx tsx
/**
 * Diagnostic Script: Check voice notes in Firestore
 *
 * Shows voice notes and their embedding status (processed or not)
 *
 * Usage:
 *   npx tsx scripts/integration-tests/check-firestore-voices.ts <userId>
 */

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '..', '.env.local') });

// Initialize Firebase Admin
function initFirebase() {
  if (admin.apps.length === 0) {
    const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    if (serviceAccountPath) {
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else if (serviceAccountJson) {
      try {
        const serviceAccount = JSON.parse(serviceAccountJson);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      } catch (e) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON');
      }
    } else if (projectId) {
      admin.initializeApp({ projectId });
    } else {
      throw new Error('Firebase credentials required');
    }
  }
  return admin.firestore();
}

async function main() {
  const userId = process.argv[2];

  if (!userId) {
    console.error('Usage: npx tsx scripts/integration-tests/check-firestore-voices.ts <userId>');
    process.exit(1);
  }

  console.log(`\n🔍 Checking Firestore voice notes for user: ${userId}\n`);

  const db = initFirebase();

  // Query voice notes, sorted by createdAt descending
  const snapshot = await db
    .collection('voiceNotes')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(20)
    .get();

  console.log(`📋 Found ${snapshot.size} voice notes in Firestore (most recent first):\n`);

  snapshot.docs.forEach((doc, i) => {
    const data = doc.data();
    const createdAt = data.createdAt;
    const transcription = data.transcription || '';
    const embeddingId = data.embeddingId;
    const embeddingError = data.embeddingError;
    const eventDate = data.eventDate;
    const eventTimestampMs = data.eventTimestampMs;

    const status = embeddingId
      ? '✅ Indexed'
      : embeddingError
        ? '❌ Error'
        : '⏳ Pending';

    console.log(`${i + 1}. ID: ${doc.id}`);
    console.log(`   Created: ${createdAt}`);
    console.log(`   Transcription: "${transcription.substring(0, 60)}${transcription.length > 60 ? '...' : ''}"`);
    console.log(`   Status: ${status}`);

    if (embeddingId) {
      console.log(`   embeddingId: ${embeddingId}`);
    }
    if (embeddingError) {
      console.log(`   embeddingError: ${embeddingError}`);
    }
    if (eventDate) {
      console.log(`   eventDate: ${eventDate}`);
    }
    if (eventTimestampMs) {
      console.log(`   eventTimestampMs: ${eventTimestampMs} (${new Date(eventTimestampMs).toISOString()})`);
    }
    console.log('');
  });

  // Summary
  const indexed = snapshot.docs.filter(d => d.data().embeddingId).length;
  const errors = snapshot.docs.filter(d => d.data().embeddingError).length;
  const pending = snapshot.docs.filter(d => !d.data().embeddingId && !d.data().embeddingError).length;

  console.log(`\n📊 Summary:`);
  console.log(`   Total: ${snapshot.size}`);
  console.log(`   ✅ Indexed: ${indexed}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   ⏳ Pending: ${pending}`);

  if (pending > 0) {
    console.log(`\n⚠️  ${pending} voice notes are pending - Cloud Function may not have triggered`);
    console.log(`   Check Cloud Function logs: firebase functions:log --only voiceNoteCreated`);
  }

  if (errors > 0) {
    console.log(`\n❌ ${errors} voice notes have errors - check embeddingError field above`);
  }

  console.log('\n');
}

main().catch(console.error);
