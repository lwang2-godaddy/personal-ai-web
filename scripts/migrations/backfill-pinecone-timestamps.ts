/**
 * Backfill Pinecone Vectors with Normalized Text and Timestamps
 *
 * This script:
 * 1. Fetches all existing data from Firestore (voice notes, locations, health, text notes, events)
 * 2. Re-normalizes text with actual dates (converts "昨天" to "2026-02-06")
 * 3. Re-generates embeddings with normalized text
 * 4. Updates Pinecone vectors with:
 *    - Normalized text
 *    - timestampMs field for date filtering
 *
 * Usage:
 *   npx tsx scripts/backfill-pinecone-timestamps.ts [options]
 *
 * Options:
 *   --dry-run          Preview changes without updating Pinecone
 *   --user <userId>    Only process data for specific user
 *   --type <type>      Only process specific type (voice, location, health, text, event)
 *   --limit <n>        Limit number of documents to process
 *   --verbose          Show detailed progress
 */

import * as admin from 'firebase-admin';
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

// Also try loading from firebase functions .env
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

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY || '',
});

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
  errors: 0,
  byType: {} as Record<string, number>,
};

/**
 * Normalize temporal references in text
 * Converts relative dates like "昨天", "今天", "last week" to actual dates
 */
function normalizeTemporalReferences(text: string, referenceDate: Date): string {
  const refDate = new Date(referenceDate);

  // Helper to format date as YYYY-MM-DD
  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  // Helper to get date offset
  const getOffsetDate = (days: number) => {
    const d = new Date(refDate);
    d.setDate(d.getDate() + days);
    return formatDate(d);
  };

  let normalized = text;

  // Chinese temporal references
  normalized = normalized.replace(/今天/g, formatDate(refDate));
  normalized = normalized.replace(/昨天/g, getOffsetDate(-1));
  normalized = normalized.replace(/前天/g, getOffsetDate(-2));
  normalized = normalized.replace(/明天/g, getOffsetDate(1));
  normalized = normalized.replace(/后天/g, getOffsetDate(2));
  normalized = normalized.replace(/上周/g, `the week of ${getOffsetDate(-7)}`);
  normalized = normalized.replace(/这周/g, `the week of ${formatDate(refDate)}`);
  normalized = normalized.replace(/上个月/g, `last month from ${formatDate(refDate)}`);
  normalized = normalized.replace(/这个月/g, `this month (${formatDate(refDate)})`);

  // English temporal references
  normalized = normalized.replace(/\btoday\b/gi, formatDate(refDate));
  normalized = normalized.replace(/\byesterday\b/gi, getOffsetDate(-1));
  normalized = normalized.replace(/\btomorrow\b/gi, getOffsetDate(1));
  normalized = normalized.replace(/\blast week\b/gi, `the week of ${getOffsetDate(-7)}`);
  normalized = normalized.replace(/\bthis week\b/gi, `the week of ${formatDate(refDate)}`);
  normalized = normalized.replace(/\blast month\b/gi, `last month from ${formatDate(refDate)}`);
  normalized = normalized.replace(/\bthis month\b/gi, `this month (${formatDate(refDate)})`);

  return normalized;
}

/**
 * Generate embedding using OpenAI
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

/**
 * Convert voice note to searchable text
 */
function voiceNoteToText(voiceNote: any, normalizedTranscription: string): string {
  const date = voiceNote.createdAt?.toDate?.() || new Date(voiceNote.createdAt);
  const dateStr = date.toISOString().split('T')[0];
  const timeStr = date.toTimeString().split(' ')[0].substring(0, 5);

  let text = `On ${dateStr} at ${timeStr}, I recorded a voice note: "${normalizedTranscription}"`;

  if (voiceNote.location?.address) {
    text += ` Location: ${voiceNote.location.address}.`;
  }

  if (voiceNote.topicCategory) {
    text += ` Topic: ${voiceNote.topicCategory}.`;
  }

  return text;
}

/**
 * Convert location data to searchable text
 */
function locationToText(location: any): string {
  const timestamp = location.timestamp?.toDate?.() || new Date(location.timestamp);
  const dateStr = timestamp.toISOString().split('T')[0];
  const timeStr = timestamp.toTimeString().split(' ')[0].substring(0, 5);

  let text = `On ${dateStr} at ${timeStr}`;

  if (location.placeName) {
    text += `, I was at ${location.placeName}`;
  } else if (location.address) {
    text += `, I was at ${location.address}`;
  } else {
    text += `, I was at coordinates ${location.latitude?.toFixed(4)}, ${location.longitude?.toFixed(4)}`;
  }

  if (location.activity) {
    text += ` doing ${location.activity}`;
  }

  if (location.visitCount && location.visitCount > 1) {
    text += `. Visit #${location.visitCount}`;
  }

  text += '.';
  return text;
}

/**
 * Convert health data to searchable text
 */
function healthDataToText(health: any): string {
  const startDate = health.startDate?.toDate?.() || new Date(health.startDate);
  const dateStr = startDate.toISOString().split('T')[0];

  let text = `On ${dateStr}, `;

  switch (health.type) {
    case 'steps':
      text += `I took ${health.value} steps`;
      break;
    case 'heartRate':
      text += `my heart rate was ${health.value} ${health.unit || 'bpm'}`;
      break;
    case 'sleep':
      const hours = (health.value / 60).toFixed(1);
      text += `I slept for ${hours} hours`;
      break;
    case 'workout':
      text += `I did a ${health.workoutType || 'workout'} for ${health.duration || health.value} minutes`;
      break;
    case 'activeEnergy':
      text += `I burned ${health.value} ${health.unit || 'kcal'} of active energy`;
      break;
    default:
      text += `my ${health.type} was ${health.value} ${health.unit || ''}`;
  }

  if (health.source) {
    text += ` (source: ${health.source})`;
  }

  text += '.';
  return text;
}

/**
 * Convert text note to searchable text
 */
function textNoteToText(note: any, normalizedContent: string): string {
  const date = note.createdAt?.toDate?.() || new Date(note.createdAt);
  const dateStr = date.toISOString().split('T')[0];

  let text = `On ${dateStr}`;

  if (note.title) {
    text += `, I wrote a note titled "${note.title}"`;
  } else {
    text += `, I wrote a note`;
  }

  text += `: "${normalizedContent}"`;

  if (note.tags && note.tags.length > 0) {
    text += ` Tags: ${note.tags.join(', ')}.`;
  }

  if (note.location?.address) {
    text += ` Location: ${note.location.address}.`;
  }

  return text;
}

/**
 * Convert event to searchable text
 */
function eventToText(event: any): string {
  const datetime = event.datetime?.toDate?.() || new Date(event.datetime);
  const dateStr = datetime.toISOString().split('T')[0];
  const timeStr = datetime.toTimeString().split(' ')[0].substring(0, 5);

  let text = `On ${dateStr} at ${timeStr}, `;

  if (event.type === 'reminder') {
    text += `I have a reminder: "${event.title}"`;
  } else {
    text += `I have an event: "${event.title}"`;
  }

  if (event.description) {
    text += `. Details: ${event.description}`;
  }

  if (event.location) {
    text += `. Location: ${event.location}`;
  }

  if (event.participants && event.participants.length > 0) {
    text += `. Participants: ${event.participants.join(', ')}`;
  }

  text += `. Status: ${event.status || 'pending'}.`;
  return text;
}

/**
 * Process voice notes
 */
async function processVoiceNotes(index: any): Promise<void> {
  console.log('\n📝 Processing voice notes...');

  let query = db.collection('voiceNotes').orderBy('createdAt', 'desc');

  if (userIdArg) {
    query = query.where('userId', '==', userIdArg) as any;
  }

  if (limitArg) {
    query = query.limit(limitArg) as any;
  }

  const snapshot = await query.get();
  console.log(`   Found ${snapshot.size} voice notes`);

  for (const doc of snapshot.docs) {
    try {
      const data = doc.data();
      const transcription = data.transcription;

      if (!transcription) {
        if (verbose) console.log(`   ⏭️  Skipping ${doc.id} - no transcription`);
        stats.skipped++;
        continue;
      }

      // Get reference date from createdAt
      const createdAt = data.createdAt?.toDate?.() || new Date(data.createdAt);
      const timestampMs = createdAt.getTime();

      // Normalize temporal references
      const normalizedTranscription = normalizeTemporalReferences(transcription, createdAt);
      const text = voiceNoteToText(data, normalizedTranscription);

      if (verbose) {
        console.log(`   📄 ${doc.id}:`);
        console.log(`      Original: "${transcription.substring(0, 50)}..."`);
        console.log(`      Normalized: "${normalizedTranscription.substring(0, 50)}..."`);
      }

      if (!dryRun) {
        // Generate new embedding
        const embedding = await generateEmbedding(text);

        // Update Pinecone
        await index.upsert([{
          id: `voice_${doc.id}`,
          values: embedding,
          metadata: {
            userId: data.userId,
            type: 'voice',
            duration: data.duration,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
            audioUrl: data.audioUrl,
            text: text,
            timestampMs,
          },
        }]);

        stats.updated++;
      }

      stats.processed++;
      stats.byType['voice'] = (stats.byType['voice'] || 0) + 1;

      // Rate limiting
      await new Promise(r => setTimeout(r, 100));

    } catch (error) {
      console.error(`   ❌ Error processing voice note ${doc.id}:`, error);
      stats.errors++;
    }
  }
}

/**
 * Process location data
 */
async function processLocationData(index: any): Promise<void> {
  console.log('\n📍 Processing location data...');

  let query = db.collection('locationData').orderBy('timestamp', 'desc');

  if (userIdArg) {
    query = query.where('userId', '==', userIdArg) as any;
  }

  if (limitArg) {
    query = query.limit(limitArg) as any;
  }

  const snapshot = await query.get();
  console.log(`   Found ${snapshot.size} location records`);

  for (const doc of snapshot.docs) {
    try {
      const data = doc.data();

      // Get timestamp
      const timestamp = data.timestamp?.toDate?.() || new Date(data.timestamp);
      const timestampMs = timestamp.getTime();

      // Generate text
      const text = locationToText(data);

      if (verbose) {
        console.log(`   📄 ${doc.id}: ${text.substring(0, 60)}...`);
      }

      if (!dryRun) {
        // Generate embedding
        const embedding = await generateEmbedding(text);

        // Update Pinecone
        await index.upsert([{
          id: `location_${doc.id}`,
          values: embedding,
          metadata: {
            userId: data.userId,
            type: 'location',
            latitude: data.latitude,
            longitude: data.longitude,
            activity: data.activity,
            activityConfidence: data.activityConfidence,
            visitCount: data.visitCount,
            timestamp: data.timestamp?.toDate?.()?.toISOString() || data.timestamp,
            text: text,
            timestampMs,
          },
        }]);

        stats.updated++;
      }

      stats.processed++;
      stats.byType['location'] = (stats.byType['location'] || 0) + 1;

      await new Promise(r => setTimeout(r, 100));

    } catch (error) {
      console.error(`   ❌ Error processing location ${doc.id}:`, error);
      stats.errors++;
    }
  }
}

/**
 * Process health data
 */
async function processHealthData(index: any): Promise<void> {
  console.log('\n❤️ Processing health data...');

  let query = db.collection('healthData').orderBy('startDate', 'desc');

  if (userIdArg) {
    query = query.where('userId', '==', userIdArg) as any;
  }

  if (limitArg) {
    query = query.limit(limitArg) as any;
  }

  const snapshot = await query.get();
  console.log(`   Found ${snapshot.size} health records`);

  for (const doc of snapshot.docs) {
    try {
      const data = doc.data();

      // Get timestamp
      const startDate = data.startDate?.toDate?.() || new Date(data.startDate);
      const timestampMs = startDate.getTime();

      // Generate text
      const text = healthDataToText(data);

      if (verbose) {
        console.log(`   📄 ${doc.id}: ${text.substring(0, 60)}...`);
      }

      if (!dryRun) {
        // Generate embedding
        const embedding = await generateEmbedding(text);

        // Update Pinecone
        await index.upsert([{
          id: `health_${doc.id}`,
          values: embedding,
          metadata: {
            userId: data.userId,
            type: 'health',
            healthType: data.type,
            value: data.value,
            unit: data.unit,
            startDate: data.startDate?.toDate?.()?.toISOString() || data.startDate,
            endDate: data.endDate?.toDate?.()?.toISOString() || data.endDate,
            source: data.source,
            text: text,
            timestampMs,
          },
        }]);

        stats.updated++;
      }

      stats.processed++;
      stats.byType['health'] = (stats.byType['health'] || 0) + 1;

      await new Promise(r => setTimeout(r, 100));

    } catch (error) {
      console.error(`   ❌ Error processing health data ${doc.id}:`, error);
      stats.errors++;
    }
  }
}

/**
 * Process text notes
 */
async function processTextNotes(index: any): Promise<void> {
  console.log('\n📓 Processing text notes...');

  let query = db.collection('textNotes').orderBy('createdAt', 'desc');

  if (userIdArg) {
    query = query.where('userId', '==', userIdArg) as any;
  }

  if (limitArg) {
    query = query.limit(limitArg) as any;
  }

  const snapshot = await query.get();
  console.log(`   Found ${snapshot.size} text notes`);

  for (const doc of snapshot.docs) {
    try {
      const data = doc.data();
      const content = data.content;

      if (!content) {
        if (verbose) console.log(`   ⏭️  Skipping ${doc.id} - no content`);
        stats.skipped++;
        continue;
      }

      // Get reference date
      const createdAt = data.createdAt?.toDate?.() || new Date(data.createdAt);
      const timestampMs = createdAt.getTime();

      // Normalize temporal references
      const normalizedContent = normalizeTemporalReferences(content, createdAt);
      const text = textNoteToText(data, normalizedContent);

      if (verbose) {
        console.log(`   📄 ${doc.id}: ${text.substring(0, 60)}...`);
      }

      if (!dryRun) {
        // Generate embedding
        const embedding = await generateEmbedding(text);

        // Update Pinecone
        await index.upsert([{
          id: `text_${doc.id}`,
          values: embedding,
          metadata: {
            userId: data.userId,
            type: 'text',
            title: data.title,
            tags: data.tags || [],
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
            text: text,
            timestampMs,
          },
        }]);

        stats.updated++;
      }

      stats.processed++;
      stats.byType['text'] = (stats.byType['text'] || 0) + 1;

      await new Promise(r => setTimeout(r, 100));

    } catch (error) {
      console.error(`   ❌ Error processing text note ${doc.id}:`, error);
      stats.errors++;
    }
  }
}

/**
 * Process events
 */
async function processEvents(index: any): Promise<void> {
  console.log('\n📅 Processing events...');

  let query = db.collection('events').orderBy('datetime', 'desc');

  if (userIdArg) {
    query = query.where('userId', '==', userIdArg) as any;
  }

  if (limitArg) {
    query = query.limit(limitArg) as any;
  }

  const snapshot = await query.get();
  console.log(`   Found ${snapshot.size} events`);

  for (const doc of snapshot.docs) {
    try {
      const data = doc.data();

      // Get timestamp
      const datetime = data.datetime?.toDate?.() || new Date(data.datetime);
      const timestampMs = datetime.getTime();

      // Generate text
      const text = eventToText(data);

      if (verbose) {
        console.log(`   📄 ${doc.id}: ${text.substring(0, 60)}...`);
      }

      if (!dryRun) {
        // Generate embedding
        const embedding = await generateEmbedding(text);

        // Update Pinecone
        await index.upsert([{
          id: `event_${doc.id}`,
          values: embedding,
          metadata: {
            userId: data.userId,
            type: 'event',
            eventType: data.type,
            title: data.title,
            datetime: data.datetime?.toDate?.()?.toISOString() || data.datetime,
            status: data.status,
            location: data.location || null,
            participants: data.participants || [],
            text: text,
            timestampMs,
          },
        }]);

        stats.updated++;
      }

      stats.processed++;
      stats.byType['event'] = (stats.byType['event'] || 0) + 1;

      await new Promise(r => setTimeout(r, 100));

    } catch (error) {
      console.error(`   ❌ Error processing event ${doc.id}:`, error);
      stats.errors++;
    }
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  console.log('🚀 Pinecone Backfill Script');
  console.log('===========================');
  console.log(`Mode: ${dryRun ? '🔍 DRY RUN (no changes)' : '✏️  LIVE (will update Pinecone)'}`);
  if (userIdArg) console.log(`User filter: ${userIdArg}`);
  if (typeArg) console.log(`Type filter: ${typeArg}`);
  if (limitArg) console.log(`Limit: ${limitArg} documents per type`);
  console.log('');

  // Verify credentials
  if (!process.env.PINECONE_KEY && !process.env.NEXT_PUBLIC_PINECONE_API_KEY) {
    console.error('❌ PINECONE_KEY not found in environment');
    process.exit(1);
  }

  if (!process.env.OPENAI_KEY && !process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
    console.error('❌ OPENAI_KEY not found in environment');
    process.exit(1);
  }

  // Get Pinecone index
  const index = pinecone.index(indexName);
  console.log(`✅ Connected to Pinecone index: ${indexName}`);

  // Process each type
  const types = typeArg ? [typeArg] : ['voice', 'location', 'health', 'text', 'event'];

  for (const type of types) {
    switch (type) {
      case 'voice':
        await processVoiceNotes(index);
        break;
      case 'location':
        await processLocationData(index);
        break;
      case 'health':
        await processHealthData(index);
        break;
      case 'text':
        await processTextNotes(index);
        break;
      case 'event':
        await processEvents(index);
        break;
      default:
        console.log(`⚠️  Unknown type: ${type}`);
    }
  }

  // Print summary
  console.log('\n📊 Summary');
  console.log('==========');
  console.log(`Processed: ${stats.processed}`);
  console.log(`Updated:   ${stats.updated}`);
  console.log(`Skipped:   ${stats.skipped}`);
  console.log(`Errors:    ${stats.errors}`);
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
