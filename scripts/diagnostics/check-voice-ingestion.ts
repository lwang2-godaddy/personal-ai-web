#!/usr/bin/env npx tsx
/**
 * Diagnostic Script: Check data ingestion pipeline
 *
 * Joins Firestore data with Pinecone vectors to show:
 * - Which records exist in Firestore
 * - Which have been embedded (embeddingId present)
 * - Which exist in Pinecone with proper metadata
 *
 * Usage:
 *   cd personal-ai-web
 *   npx tsx scripts/integration-tests/check-voice-ingestion.ts <userId> [type] [limit]
 *
 * Arguments:
 *   userId - Firebase user ID (required)
 *   type   - Data type: voice, location, health, text (default: voice)
 *   limit  - Number of records to fetch (default: 20)
 *
 * Examples:
 *   npx tsx scripts/integration-tests/check-voice-ingestion.ts USER_ID
 *   npx tsx scripts/integration-tests/check-voice-ingestion.ts USER_ID voice 10
 *   npx tsx scripts/integration-tests/check-voice-ingestion.ts USER_ID location 30
 */

import * as admin from 'firebase-admin';
import { Pinecone } from '@pinecone-database/pinecone';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '..', '.env.local') });

const PINECONE_INDEX = process.env.NEXT_PUBLIC_PINECONE_INDEX || 'personal-ai-data';

// Initialize Firebase Admin
function initFirebase() {
  if (admin.apps.length === 0) {
    const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    if (serviceAccountPath) {
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } else if (serviceAccountJson) {
      try {
        const serviceAccount = JSON.parse(serviceAccountJson);
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
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

interface FirestoreVoiceNote {
  id: string;
  transcription: string;
  createdAt: any;
  embeddingId: string | null;
  embeddingError: string | null;
  eventDate: string | null;
  eventTimestampMs: number | null;
}

interface PineconeVector {
  id: string;
  text: string;
  timestampMs: number;
  eventTimestampMs: number | null;
  score?: number;
}

// Map data type to Firestore collection and Pinecone type
const DATA_TYPE_CONFIG: Record<string, { collection: string; pineconeType: string; textField: string }> = {
  voice: { collection: 'voiceNotes', pineconeType: 'voice', textField: 'transcription' },
  location: { collection: 'locationData', pineconeType: 'location', textField: 'description' },
  health: { collection: 'healthData', pineconeType: 'health', textField: 'type' },
  text: { collection: 'textNotes', pineconeType: 'text', textField: 'content' },
};

async function main() {
  const userId = process.argv[2];
  const dataType = process.argv[3] || 'voice';
  const limit = parseInt(process.argv[4] || '20', 10);

  if (!userId) {
    console.error('Usage: npx tsx scripts/integration-tests/check-voice-ingestion.ts <userId> [type] [limit]');
    console.error('');
    console.error('Arguments:');
    console.error('  userId - Firebase user ID (required)');
    console.error('  type   - Data type: voice, location, health, text (default: voice)');
    console.error('  limit  - Number of records to fetch (default: 20)');
    console.error('');
    console.error('Examples:');
    console.error('  npx tsx scripts/integration-tests/check-voice-ingestion.ts USER_ID');
    console.error('  npx tsx scripts/integration-tests/check-voice-ingestion.ts USER_ID voice 10');
    console.error('  npx tsx scripts/integration-tests/check-voice-ingestion.ts USER_ID location 30');
    process.exit(1);
  }

  const typeConfig = DATA_TYPE_CONFIG[dataType];
  if (!typeConfig) {
    console.error(`Invalid data type: ${dataType}`);
    console.error(`Valid types: ${Object.keys(DATA_TYPE_CONFIG).join(', ')}`);
    process.exit(1);
  }

  const apiKey = process.env.PINECONE_API_KEY || process.env.NEXT_PUBLIC_PINECONE_API_KEY;
  if (!apiKey) {
    console.error('PINECONE_API_KEY not found in environment');
    process.exit(1);
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log(`DATA INGESTION DIAGNOSTIC`);
  console.log(`  User: ${userId}`);
  console.log(`  Type: ${dataType} (collection: ${typeConfig.collection})`);
  console.log(`  Limit: ${limit}`);
  console.log(`${'='.repeat(70)}\n`);

  // Initialize services
  const db = initFirebase();
  const pinecone = new Pinecone({ apiKey });
  const index = pinecone.index(PINECONE_INDEX);

  // Step 1: Get Firestore data
  console.log(`📂 STEP 1: Fetching Firestore ${dataType} records...\n`);

  const firestoreSnapshot = await db
    .collection(typeConfig.collection)
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  const firestoreRecords: FirestoreVoiceNote[] = firestoreSnapshot.docs.map(doc => {
    const data = doc.data();
    // Get the text content based on data type
    let textContent = '';
    if (dataType === 'voice') {
      textContent = data.transcription || '';
    } else if (dataType === 'location') {
      textContent = data.description || data.activity || `${data.latitude},${data.longitude}`;
    } else if (dataType === 'health') {
      textContent = `${data.type}: ${data.value} ${data.unit || ''}`;
    } else if (dataType === 'text') {
      textContent = data.content || data.text || '';
    }

    return {
      id: doc.id,
      transcription: textContent,
      createdAt: data.createdAt,
      embeddingId: data.embeddingId || null,
      embeddingError: data.embeddingError || null,
      eventDate: data.eventDate || null,
      eventTimestampMs: data.eventTimestampMs || null,
    };
  });

  console.log(`   Found ${firestoreRecords.length} ${dataType} records in Firestore\n`);

  // Step 2: Get Pinecone vectors
  console.log('🔍 STEP 2: Fetching Pinecone vectors...\n');

  const dummyEmbedding = new Array(1536).fill(0.01);

  const pineconeResponse = await index.query({
    vector: dummyEmbedding,
    topK: Math.max(100, limit * 2),
    filter: {
      $and: [
        { userId: userId },
        { type: typeConfig.pineconeType },
      ],
    },
    includeMetadata: true,
  });

  const pineconeVectors = new Map<string, PineconeVector>();
  (pineconeResponse.matches || []).forEach(match => {
    const meta = match.metadata as Record<string, any>;
    pineconeVectors.set(match.id, {
      id: match.id,
      text: meta?.text || '',
      timestampMs: meta?.timestampMs || 0,
      eventTimestampMs: meta?.eventTimestampMs || null,
      score: match.score,
    });
  });

  console.log(`   Found ${pineconeVectors.size} ${dataType} vectors in Pinecone\n`);

  // Step 3: Join and display
  console.log(`${'='.repeat(70)}`);
  console.log('📋 JOINED RESULTS (Firestore + Pinecone):');
  console.log(`${'='.repeat(70)}\n`);

  let indexed = 0;
  let missingInPinecone = 0;
  let withEventTimestamp = 0;
  let withoutEventTimestamp = 0;
  let errors = 0;
  let pending = 0;

  firestoreRecords.forEach((record, i) => {
    const createdAtStr = record.createdAt?.toDate?.()
      ? record.createdAt.toDate().toISOString()
      : String(record.createdAt);

    const textPreview = record.transcription.substring(0, 60);

    console.log(`${i + 1}. Firestore ID: ${record.id}`);
    console.log(`   Created: ${createdAtStr}`);
    console.log(`   Content: "${textPreview}${record.transcription.length > 60 ? '...' : ''}"`);

    if (record.embeddingError) {
      console.log(`   Firestore Status: ❌ ERROR - ${record.embeddingError}`);
      errors++;
    } else if (!record.embeddingId) {
      console.log(`   Firestore Status: ⏳ PENDING (no embeddingId yet)`);
      pending++;
    } else {
      console.log(`   Firestore Status: ✅ embeddingId = ${record.embeddingId}`);

      // Check Pinecone
      const vector = pineconeVectors.get(record.embeddingId);
      if (vector) {
        indexed++;
        console.log(`   Pinecone Status: ✅ FOUND in Pinecone`);
        console.log(`   Pinecone timestampMs: ${vector.timestampMs} (${new Date(vector.timestampMs).toISOString()})`);

        if (vector.eventTimestampMs) {
          withEventTimestamp++;
          console.log(`   Pinecone eventTimestampMs: ✅ ${vector.eventTimestampMs} (${new Date(vector.eventTimestampMs).toISOString()})`);
        } else {
          withoutEventTimestamp++;
          console.log(`   Pinecone eventTimestampMs: ⚠️  NOT SET - temporal queries won't find this record`);
        }
      } else {
        missingInPinecone++;
        console.log(`   Pinecone Status: ❌ NOT FOUND (embeddingId exists but not in Pinecone)`);
      }
    }

    // Show Firestore eventTimestampMs if set
    if (record.eventTimestampMs) {
      console.log(`   Firestore eventTimestampMs: ${record.eventTimestampMs} (${new Date(record.eventTimestampMs).toISOString()})`);
    }
    if (record.eventDate) {
      console.log(`   Firestore eventDate: ${record.eventDate}`);
    }

    console.log('');
  });

  // Summary
  console.log(`${'='.repeat(70)}`);
  console.log('📊 SUMMARY:');
  console.log(`${'='.repeat(70)}`);
  console.log(`   Total ${dataType} records in Firestore: ${firestoreRecords.length}`);
  console.log(`   ✅ Indexed in Pinecone: ${indexed}`);
  console.log(`   ⏳ Pending (awaiting embedding): ${pending}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   ❌ Missing in Pinecone (embeddingId exists but vector missing): ${missingInPinecone}`);
  console.log('');
  console.log(`   📅 With eventTimestampMs (supports temporal queries): ${withEventTimestamp}`);
  console.log(`   ⚠️  Without eventTimestampMs (won't be found by date queries): ${withoutEventTimestamp}`);

  // Function name mapping for logs
  const functionNameMap: Record<string, string> = {
    voice: 'onVoiceNoteCreated',
    location: 'onLocationDataCreated',
    health: 'onHealthDataCreated',
    text: 'onTextNoteCreated',
  };
  const functionName = functionNameMap[dataType] || 'onDocumentCreated';

  // Recommendations
  console.log(`\n${'='.repeat(70)}`);
  console.log('💡 RECOMMENDATIONS:');
  console.log(`${'='.repeat(70)}`);

  if (pending > 0) {
    console.log(`\n⏳ ${pending} ${dataType} records are pending - check Cloud Function logs:`);
    console.log(`   firebase functions:log --only ${functionName}`);
  }

  if (errors > 0) {
    console.log(`\n❌ ${errors} ${dataType} records have errors - check the embeddingError field above`);
  }

  if (missingInPinecone > 0) {
    console.log(`\n❌ ${missingInPinecone} ${dataType} records have embeddingId but are missing from Pinecone`);
    console.log('   This is unusual - try re-triggering the Cloud Function');
  }

  if (withoutEventTimestamp > 0 && dataType === 'voice') {
    console.log(`\n⚠️  ${withoutEventTimestamp} ${dataType} records are missing eventTimestampMs`);
    console.log('   These won\'t be found by temporal queries like "昨天我做了什么"');
    console.log('   Run the backfill script to fix: npx tsx scripts/integration-tests/backfill-event-timestamps.ts');
  }

  console.log('\n');
}

main().catch(console.error);
