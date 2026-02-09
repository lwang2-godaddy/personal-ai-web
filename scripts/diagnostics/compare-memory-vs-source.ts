#!/usr/bin/env npx tsx
/**
 * Compare Memory vs Original Source
 *
 * Shows the difference between AI-generated memories and their original source content.
 *
 * Usage:
 *   npx tsx scripts/diagnostics/compare-memory-vs-source.ts
 */

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../.env.local') });

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountKey) {
  console.error('No FIREBASE_SERVICE_ACCOUNT_KEY found');
  process.exit(1);
}

const serviceAccount = JSON.parse(serviceAccountKey);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});

const db = admin.firestore();

async function main() {
  const memories = await db.collection('memories').orderBy('createdAt', 'desc').limit(20).get();

  console.log('\n╔══════════════════════════════════════════════════════════════════════════╗');
  console.log('║           COMPARING MEMORIES vs ORIGINAL SOURCES                          ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════╝\n');

  let count = 0;
  for (const doc of memories.docs) {
    const data = doc.data();

    // Skip very short memories
    if (!data.title || data.title.length < 15) continue;
    if (count >= 3) break;
    count++;

    console.log('┌──────────────────────────────────────────────────────────────────────────┐');
    console.log('│                              MEMORY                                      │');
    console.log('├──────────────────────────────────────────────────────────────────────────┤');
    console.log('  Title:      ', data.title?.trim());
    console.log('  Summary:    ', data.summary?.trim().substring(0, 120) + (data.summary?.length > 120 ? '...' : ''));

    if (data.entities?.length > 0) {
      console.log('  Entities:   ', data.entities.map((e: any) => `[${e.type}] ${e.value}`).join(', '));
    } else {
      console.log('  Entities:    None extracted');
    }

    console.log('  Triggers:   ', data.triggerTypes?.join(', ') || 'None');
    console.log('  Relevance:  ', data.relevanceScore);
    console.log('  Source:     ', data.sourceType, '/', data.sourceId.substring(0, 20) + '...');

    // Fetch original source
    let col = '';
    if (data.sourceType === 'voice') col = 'voiceNotes';
    if (data.sourceType === 'text') col = 'textNotes';
    if (data.sourceType === 'photo') col = 'photoMemories';

    if (col) {
      const src = await db.collection(col).doc(data.sourceId).get();
      if (src.exists) {
        const s = src.data()!;
        console.log('\n├──────────────────────────────────────────────────────────────────────────┤');
        console.log(`│                         ORIGINAL ${data.sourceType.toUpperCase()} NOTE                              │`);
        console.log('├──────────────────────────────────────────────────────────────────────────┤');

        const content = s.transcription || s.content || s.description || '';
        console.log('  Content:    ', content.trim().substring(0, 200) + (content.length > 200 ? '...' : ''));
        console.log('  Location:   ', s.location?.address || 'None');
        console.log('  Tags:       ', s.tags?.length > 0 ? s.tags.join(', ') : 'None');
        console.log('  Topic:      ', s.topicCategory || 'None');
      }
    }
    console.log('└──────────────────────────────────────────────────────────────────────────┘\n');
  }

  console.log('\n💡 KEY DIFFERENCES:');
  console.log('   • Memory has AI-generated title/summary (cleaned up from raw content)');
  console.log('   • Memory has extracted entities (people, places, topics)');
  console.log('   • Memory has trigger types for proactive surfacing');
  console.log('   • Memory has relevance score for prioritization');
  console.log('   • Original has raw transcription/content (unprocessed)');
  console.log('   • Original has location data, tags, audio URL, etc.\n');
}

main().catch(e => console.error('Error:', e.message));
