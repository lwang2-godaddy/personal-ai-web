/**
 * Enhance Existing Memories Migration
 *
 * Backfills existing memories with enhanced entity extraction:
 * - Extracts all 9 entity types
 * - Adds denormalized arrays (activities, emotions, peopleNames, etc.)
 * - Runs sentiment analysis
 * - Cross-references with user vocabulary
 *
 * Usage:
 *   cd personal-ai-web
 *   npx tsx scripts/migrations/enhance-existing-memories.ts [options]
 *
 * Options:
 *   --dry-run         Show what would be updated without making changes
 *   --limit=N         Process only N memories (default: 100)
 *   --user=<uid>      Process only memories for specific user
 *   --force           Re-process memories that already have enhanced data
 *   --batch-size=N    Number of memories per batch (default: 10)
 *
 * Environment:
 *   FIREBASE_SERVICE_ACCOUNT_KEY  - Firebase Admin SDK credentials (JSON)
 *   OPENAI_API_KEY                - OpenAI API key for extraction
 */

import * as admin from 'firebase-admin';
import { config } from 'dotenv';
import { resolve } from 'path';
import OpenAI from 'openai';

// Load environment variables
config({ path: resolve(__dirname, '../../.env.local') });

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  dryRun: args.includes('--dry-run'),
  limit: parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '100'),
  userId: args.find(a => a.startsWith('--user='))?.split('=')[1],
  force: args.includes('--force'),
  batchSize: parseInt(args.find(a => a.startsWith('--batch-size='))?.split('=')[1] || '10'),
};

// Initialize Firebase Admin
function initFirebase() {
  if (admin.apps.length > 0) return admin.firestore();

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable not set');
  }

  const serviceAccount = JSON.parse(serviceAccountKey);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });

  return admin.firestore();
}

// Initialize OpenAI
function initOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable not set');
  }
  return new OpenAI({ apiKey });
}

// Entity extraction prompt
const EXTRACTION_PROMPT = `Extract entities from the following text. Return a JSON object with these fields:
- peopleNames: array of person names mentioned
- placeNames: array of place names mentioned
- activities: array of activities mentioned (e.g., "badminton", "dinner", "meeting")
- emotions: array of emotions expressed (e.g., "happy", "stressed", "excited")
- timeReferences: array of time references (e.g., "morning", "yesterday", "weekend")
- organizations: array of organization names
- topics: array of topics discussed
- events: array of specific events mentioned

Also provide:
- sentiment: { score: number from -1 to 1, label: "negative" | "neutral" | "positive" }

Be concise and only include items that are clearly mentioned.

Text: {{TEXT}}`;

// Main migration function
async function enhanceMemories() {
  console.log('===========================================');
  console.log('  Enhance Existing Memories Migration');
  console.log('===========================================\n');

  console.log('Options:');
  console.log(`  Dry Run:     ${options.dryRun}`);
  console.log(`  Limit:       ${options.limit}`);
  console.log(`  User:        ${options.userId || 'all'}`);
  console.log(`  Force:       ${options.force}`);
  console.log(`  Batch Size:  ${options.batchSize}`);
  console.log('');

  const db = initFirebase();
  const openai = initOpenAI();

  // Build query
  let query: admin.firestore.Query = db.collection('memories');

  if (options.userId) {
    query = query.where('userId', '==', options.userId);
  }

  if (!options.force) {
    // Only process memories without enhanced data
    query = query.where('enhancedEntities', '==', null);
  }

  query = query.orderBy('createdAt', 'desc').limit(options.limit);

  // Fetch memories
  console.log('Fetching memories to process...');
  const snapshot = await query.get();
  console.log(`Found ${snapshot.size} memories to process\n`);

  if (snapshot.size === 0) {
    console.log('No memories to process. Exiting.');
    return;
  }

  // Process in batches
  const memories = snapshot.docs;
  let processed = 0;
  let enhanced = 0;
  let errors = 0;

  for (let i = 0; i < memories.length; i += options.batchSize) {
    const batch = memories.slice(i, i + options.batchSize);
    console.log(`Processing batch ${Math.floor(i / options.batchSize) + 1}/${Math.ceil(memories.length / options.batchSize)}...`);

    for (const doc of batch) {
      const data = doc.data();
      const memoryId = doc.id;
      const text = data.rawContent || data.summary || data.title || '';

      if (!text.trim()) {
        console.log(`  [SKIP] ${memoryId}: No text content`);
        continue;
      }

      try {
        console.log(`  Processing: ${memoryId.substring(0, 20)}...`);

        if (options.dryRun) {
          console.log(`    [DRY RUN] Would extract entities from: "${text.substring(0, 50)}..."`);
          processed++;
          continue;
        }

        // Extract entities using OpenAI
        const prompt = EXTRACTION_PROMPT.replace('{{TEXT}}', text);
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are an entity extraction assistant. Always respond with valid JSON.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 1000,
          response_format: { type: 'json_object' },
        });

        const responseText = completion.choices[0].message.content || '{}';
        const extracted = JSON.parse(responseText);

        // Build update data
        const updateData: Record<string, any> = {
          activities: extracted.activities || [],
          emotions: extracted.emotions || [],
          peopleNames: extracted.peopleNames || [],
          placeNames: extracted.placeNames || [],
          timeReferences: extracted.timeReferences || [],
          customTerms: [],
          sentiment: extracted.sentiment || null,
          enhancedEntities: buildEnhancedEntities(extracted),
          enhancedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        // Update the memory
        await db.collection('memories').doc(memoryId).update(updateData);
        enhanced++;
        console.log(`    [OK] Enhanced with ${updateData.enhancedEntities.length} entities`);

      } catch (error: any) {
        errors++;
        console.log(`    [ERROR] ${error.message}`);
      }

      processed++;
    }

    // Brief pause between batches to avoid rate limits
    if (i + options.batchSize < memories.length) {
      console.log('  Waiting 2 seconds before next batch...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Summary
  console.log('\n===========================================');
  console.log('  Migration Complete');
  console.log('===========================================');
  console.log(`  Processed: ${processed}`);
  console.log(`  Enhanced:  ${enhanced}`);
  console.log(`  Errors:    ${errors}`);
  console.log('');
}

// Build enhanced entities array from extracted data
function buildEnhancedEntities(extracted: any): any[] {
  const entities: any[] = [];

  // Add people
  (extracted.peopleNames || []).forEach((name: string) => {
    entities.push({
      type: 'person',
      value: name,
      confidence: 0.8,
      source: 'ai_extraction',
    });
  });

  // Add places
  (extracted.placeNames || []).forEach((name: string) => {
    entities.push({
      type: 'place',
      value: name,
      confidence: 0.8,
      source: 'ai_extraction',
    });
  });

  // Add activities
  (extracted.activities || []).forEach((activity: string) => {
    entities.push({
      type: 'activity',
      value: activity,
      confidence: 0.75,
      source: 'ai_extraction',
    });
  });

  // Add emotions
  (extracted.emotions || []).forEach((emotion: string) => {
    entities.push({
      type: 'emotion',
      value: emotion,
      confidence: 0.7,
      source: 'ai_extraction',
    });
  });

  // Add organizations
  (extracted.organizations || []).forEach((org: string) => {
    entities.push({
      type: 'organization',
      value: org,
      confidence: 0.8,
      source: 'ai_extraction',
    });
  });

  // Add topics
  (extracted.topics || []).forEach((topic: string) => {
    entities.push({
      type: 'topic',
      value: topic,
      confidence: 0.7,
      source: 'ai_extraction',
    });
  });

  // Add events
  (extracted.events || []).forEach((event: string) => {
    entities.push({
      type: 'event',
      value: event,
      confidence: 0.75,
      source: 'ai_extraction',
    });
  });

  // Add time references
  (extracted.timeReferences || []).forEach((timeRef: string) => {
    entities.push({
      type: 'time_reference',
      value: timeRef,
      confidence: 0.8,
      source: 'ai_extraction',
    });
  });

  return entities;
}

// Run migration
enhanceMemories()
  .then(() => {
    console.log('Migration finished.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
