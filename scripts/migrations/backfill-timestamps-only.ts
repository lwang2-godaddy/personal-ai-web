/**
 * Backfill timestampMs to existing Pinecone vectors (metadata only, no re-embedding)
 *
 * This is a FAST script that only adds the timestampMs field to existing vectors.
 * Use this for data types that don't need text normalization (health, location, events).
 *
 * For voice notes and text notes that contain temporal references like "昨天",
 * use backfill-pinecone-timestamps.ts instead to re-normalize and re-embed.
 *
 * Usage:
 *   npx tsx scripts/backfill-timestamps-only.ts [options]
 *
 * Options:
 *   --dry-run          Preview changes without updating Pinecone
 *   --user <userId>    Only process data for specific user
 *   --type <type>      Only process specific type (health, location, event)
 *   --limit <n>        Limit number of documents to process
 *   --verbose          Show detailed progress
 */

import * as admin from 'firebase-admin';
import { Pinecone } from '@pinecone-database/pinecone';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '../../PersonalAIApp/firebase/functions/.env') });

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'personalaiapp-90131',
  });
}

const db = admin.firestore();

// Initialize Pinecone
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_KEY || process.env.NEXT_PUBLIC_PINECONE_API_KEY || '',
});

const indexName = process.env.PINECONE_INDEX || process.env.NEXT_PUBLIC_PINECONE_INDEX || 'personal-ai-data';

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const verbose = args.includes('--verbose');
const userIdArg = args.includes('--user') ? args[args.indexOf('--user') + 1] : null;
const typeArg = args.includes('--type') ? args[args.indexOf('--type') + 1] : null;
const limitArg = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : null;

// Stats tracking
const stats = {
  processed: 0,
  updated: 0,
  skipped: 0,
  notInPinecone: 0,
  errors: 0,
  byType: {} as Record<string, number>,
};

// Batch size for Pinecone operations
const BATCH_SIZE = 100;

/**
 * Process health data - add timestampMs only
 */
async function processHealthData(index: any): Promise<void> {
  console.log('\n❤️  Processing health data (metadata only)...');

  let query: admin.firestore.Query = db.collection('healthData');

  if (userIdArg) {
    query = query.where('userId', '==', userIdArg);
  }

  query = query.orderBy('startDate', 'desc');

  if (limitArg) {
    query = query.limit(limitArg);
  }

  const snapshot = await query.get();
  console.log(`   Found ${snapshot.size} health records`);

  const updates: Array<{ id: string; metadata: Record<string, any> }> = [];

  for (const doc of snapshot.docs) {
    try {
      const data = doc.data();
      const vectorId = `health_${doc.id}`;

      // Get timestamp from startDate
      const startDate = data.startDate?.toDate?.() || new Date(data.startDate);
      const timestampMs = startDate.getTime();

      if (verbose) {
        console.log(`   📄 ${vectorId}: timestampMs=${timestampMs} (${startDate.toISOString().split('T')[0]})`);
      }

      updates.push({
        id: vectorId,
        metadata: { timestampMs },
      });

      stats.processed++;
      stats.byType['health'] = (stats.byType['health'] || 0) + 1;

      // Process in batches
      if (updates.length >= BATCH_SIZE) {
        await processBatch(index, updates);
        updates.length = 0;
      }

    } catch (error) {
      console.error(`   ❌ Error processing health ${doc.id}:`, error);
      stats.errors++;
    }
  }

  // Process remaining
  if (updates.length > 0) {
    await processBatch(index, updates);
  }
}

/**
 * Process location data - add timestampMs only
 */
async function processLocationData(index: any): Promise<void> {
  console.log('\n📍 Processing location data (metadata only)...');

  let query: admin.firestore.Query = db.collection('locationData');

  if (userIdArg) {
    query = query.where('userId', '==', userIdArg);
  }

  query = query.orderBy('timestamp', 'desc');

  if (limitArg) {
    query = query.limit(limitArg);
  }

  const snapshot = await query.get();
  console.log(`   Found ${snapshot.size} location records`);

  const updates: Array<{ id: string; metadata: Record<string, any> }> = [];

  for (const doc of snapshot.docs) {
    try {
      const data = doc.data();
      const vectorId = `location_${doc.id}`;

      // Get timestamp
      const timestamp = data.timestamp?.toDate?.() || new Date(data.timestamp);
      const timestampMs = timestamp.getTime();

      if (verbose) {
        console.log(`   📄 ${vectorId}: timestampMs=${timestampMs}`);
      }

      updates.push({
        id: vectorId,
        metadata: { timestampMs },
      });

      stats.processed++;
      stats.byType['location'] = (stats.byType['location'] || 0) + 1;

      if (updates.length >= BATCH_SIZE) {
        await processBatch(index, updates);
        updates.length = 0;
      }

    } catch (error) {
      console.error(`   ❌ Error processing location ${doc.id}:`, error);
      stats.errors++;
    }
  }

  if (updates.length > 0) {
    await processBatch(index, updates);
  }
}

/**
 * Process events - add timestampMs only
 */
async function processEvents(index: any): Promise<void> {
  console.log('\n📅 Processing events (metadata only)...');

  let query: admin.firestore.Query = db.collection('events');

  if (userIdArg) {
    query = query.where('userId', '==', userIdArg);
  }

  query = query.orderBy('datetime', 'desc');

  if (limitArg) {
    query = query.limit(limitArg);
  }

  const snapshot = await query.get();
  console.log(`   Found ${snapshot.size} events`);

  const updates: Array<{ id: string; metadata: Record<string, any> }> = [];

  for (const doc of snapshot.docs) {
    try {
      const data = doc.data();
      const vectorId = `event_${doc.id}`;

      // Get timestamp
      const datetime = data.datetime?.toDate?.() || new Date(data.datetime);
      const timestampMs = datetime.getTime();

      if (verbose) {
        console.log(`   📄 ${vectorId}: timestampMs=${timestampMs}`);
      }

      updates.push({
        id: vectorId,
        metadata: { timestampMs },
      });

      stats.processed++;
      stats.byType['event'] = (stats.byType['event'] || 0) + 1;

      if (updates.length >= BATCH_SIZE) {
        await processBatch(index, updates);
        updates.length = 0;
      }

    } catch (error) {
      console.error(`   ❌ Error processing event ${doc.id}:`, error);
      stats.errors++;
    }
  }

  if (updates.length > 0) {
    await processBatch(index, updates);
  }
}

/**
 * Process a batch of updates
 * Pinecone doesn't have a direct metadata update API, so we need to:
 * 1. Fetch existing vectors
 * 2. Update metadata
 * 3. Upsert back
 */
async function processBatch(
  index: any,
  updates: Array<{ id: string; metadata: Record<string, any> }>
): Promise<void> {
  if (dryRun) {
    console.log(`   🔍 [DRY RUN] Would update ${updates.length} vectors`);
    stats.updated += updates.length;
    return;
  }

  try {
    // Fetch existing vectors
    const ids = updates.map(u => u.id);
    const fetchResult = await index.fetch(ids);

    const upserts: Array<{ id: string; values: number[]; metadata: Record<string, any> }> = [];

    for (const update of updates) {
      const existing = fetchResult.records?.[update.id];

      if (!existing) {
        if (verbose) {
          console.log(`   ⏭️  ${update.id} not found in Pinecone, skipping`);
        }
        stats.notInPinecone++;
        continue;
      }

      // Merge metadata
      const mergedMetadata = {
        ...existing.metadata,
        ...update.metadata,
      };

      upserts.push({
        id: update.id,
        values: existing.values,
        metadata: mergedMetadata,
      });
    }

    if (upserts.length > 0) {
      await index.upsert(upserts);
      stats.updated += upserts.length;
      console.log(`   ✅ Updated ${upserts.length} vectors`);
    }

  } catch (error) {
    console.error(`   ❌ Batch update error:`, error);
    stats.errors += updates.length;
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  console.log('🚀 Pinecone Timestamp Backfill (Metadata Only)');
  console.log('==============================================');
  console.log(`Mode: ${dryRun ? '🔍 DRY RUN (no changes)' : '✏️  LIVE (will update Pinecone)'}`);
  if (userIdArg) console.log(`User filter: ${userIdArg}`);
  if (typeArg) console.log(`Type filter: ${typeArg}`);
  if (limitArg) console.log(`Limit: ${limitArg} documents per type`);
  console.log('');
  console.log('ℹ️  This script only adds timestampMs - no re-embedding (fast & free!)');
  console.log('   For voice/text notes that need temporal normalization,');
  console.log('   use backfill-pinecone-timestamps.ts instead.');
  console.log('');

  // Verify credentials
  if (!process.env.PINECONE_KEY && !process.env.NEXT_PUBLIC_PINECONE_API_KEY) {
    console.error('❌ PINECONE_KEY not found in environment');
    process.exit(1);
  }

  // Get Pinecone index
  const index = pinecone.index(indexName);
  console.log(`✅ Connected to Pinecone index: ${indexName}`);

  // Process each type (only structured data types)
  const types = typeArg ? [typeArg] : ['health', 'location', 'event'];

  for (const type of types) {
    switch (type) {
      case 'health':
        await processHealthData(index);
        break;
      case 'location':
        await processLocationData(index);
        break;
      case 'event':
        await processEvents(index);
        break;
      default:
        console.log(`⚠️  Type "${type}" not supported by this script.`);
        console.log(`   Use backfill-pinecone-timestamps.ts for voice/text notes.`);
    }
  }

  // Print summary
  console.log('\n📊 Summary');
  console.log('==========');
  console.log(`Processed:      ${stats.processed}`);
  console.log(`Updated:        ${stats.updated}`);
  console.log(`Not in Pinecone: ${stats.notInPinecone}`);
  console.log(`Skipped:        ${stats.skipped}`);
  console.log(`Errors:         ${stats.errors}`);
  console.log('\nBy type:');
  for (const [type, count] of Object.entries(stats.byType)) {
    console.log(`  ${type}: ${count}`);
  }

  if (dryRun) {
    console.log('\n⚠️  DRY RUN - No changes were made. Run without --dry-run to apply changes.');
  } else {
    console.log('\n✅ Backfill complete!');
  }
}

// Run
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
