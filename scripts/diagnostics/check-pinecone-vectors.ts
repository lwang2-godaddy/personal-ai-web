#!/usr/bin/env npx tsx
/**
 * Diagnostic Script: Check Pinecone vectors for a user
 *
 * Usage:
 *   cd personal-ai-web
 *   npx tsx scripts/integration-tests/check-pinecone-vectors.ts <userId>
 */

import { Pinecone } from '@pinecone-database/pinecone';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '..', '.env.local') });

const PINECONE_INDEX = process.env.NEXT_PUBLIC_PINECONE_INDEX || 'personal-ai-data';

async function main() {
  const userId = process.argv[2];

  if (!userId) {
    console.error('Usage: npx tsx scripts/integration-tests/check-pinecone-vectors.ts <userId>');
    console.error('Example: npx tsx scripts/integration-tests/check-pinecone-vectors.ts CzmvxsakLIWyLUlYd4IbLTRZ7Rx1');
    process.exit(1);
  }

  const apiKey = process.env.PINECONE_API_KEY || process.env.NEXT_PUBLIC_PINECONE_API_KEY;
  if (!apiKey) {
    console.error('PINECONE_API_KEY not found in environment');
    process.exit(1);
  }

  console.log(`\n🔍 Checking Pinecone vectors for user: ${userId}`);
  console.log(`   Index: ${PINECONE_INDEX}\n`);

  const pinecone = new Pinecone({ apiKey });
  const index = pinecone.index(PINECONE_INDEX);

  // Query for recent voice notes
  const dummyEmbedding = new Array(1536).fill(0.01);

  // Query for vectors from the last 24 hours to get the latest
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);

  const allResults = await index.query({
    vector: dummyEmbedding,
    topK: 50,
    filter: {
      $and: [
        { userId: userId },
        { type: 'voice' },
        { timestampMs: { $gte: oneDayAgo } },
      ],
    },
    includeMetadata: true,
  });

  console.log(`📅 Filtering for vectors created in the last 24 hours (since ${new Date(oneDayAgo).toISOString()})\n`);

  // Sort by timestampMs descending (most recent first)
  const sortedMatches = (allResults.matches || []).sort((a, b) => {
    const tsA = (a.metadata as any)?.timestampMs || 0;
    const tsB = (b.metadata as any)?.timestampMs || 0;
    return tsB - tsA; // Descending
  });

  console.log(`📋 Found ${sortedMatches.length} vectors (sorted by most recent):\n`);

  if (sortedMatches.length > 0) {
    // Show only the 20 most recent
    sortedMatches.slice(0, 20).forEach((match, i) => {
      const meta = match.metadata as Record<string, any>;
      const timestampMs = meta?.timestampMs;
      const eventTimestampMs = meta?.eventTimestampMs;
      const text = meta?.text || '';
      const type = meta?.type || 'unknown';

      console.log(`${i + 1}. ID: ${match.id}`);
      console.log(`   Type: ${type}`);
      console.log(`   Text: "${text.substring(0, 80)}${text.length > 80 ? '...' : ''}"`);
      console.log(`   timestampMs: ${timestampMs} (${timestampMs ? new Date(timestampMs).toISOString() : 'N/A'})`);
      console.log(`   eventTimestampMs: ${eventTimestampMs} (${eventTimestampMs ? new Date(eventTimestampMs).toISOString() : '⚠️  NOT SET'})`);
      console.log('');
    });

    // Check how many have eventTimestampMs
    const voiceVectors = sortedMatches.filter(m => (m.metadata as any)?.type === 'voice');
    const withEventTs = sortedMatches.filter(m => (m.metadata as any)?.eventTimestampMs);

    console.log(`\n📊 Summary:`);
    console.log(`   Total vectors: ${sortedMatches.length}`);
    console.log(`   Voice vectors: ${voiceVectors.length}`);
    console.log(`   With eventTimestampMs: ${withEventTs.length}`);
    console.log(`   Missing eventTimestampMs: ${sortedMatches.length - withEventTs.length}`);

    if (withEventTs.length < voiceVectors.length) {
      console.log(`\n⚠️  Some voice vectors are missing eventTimestampMs!`);
      console.log(`   These won't be found by temporal queries like "5号我做了什么"`);
    }
  } else {
    console.log('   No vectors found for this user.');
  }

  // Also check for any vectors from today/yesterday to see date distribution
  console.log('\n\n📅 Date distribution of vectors:');
  const now = new Date();
  for (let daysAgo = 0; daysAgo <= 7; daysAgo++) {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    const dateStr = date.toISOString().split('T')[0];
    const dayStart = new Date(dateStr + 'T00:00:00Z').getTime();
    const dayEnd = new Date(dateStr + 'T23:59:59Z').getTime();

    const dayResults = await index.query({
      vector: dummyEmbedding,
      topK: 100,
      filter: {
        $and: [
          { userId: userId },
          {
            $or: [
              { eventTimestampMs: { $gte: dayStart, $lte: dayEnd } },
              { timestampMs: { $gte: dayStart, $lte: dayEnd } },
            ],
          },
        ],
      },
      includeMetadata: true,
    });

    const count = dayResults.matches?.length || 0;
    const label = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo} days ago`;
    console.log(`   ${dateStr} (${label}): ${count} vectors`);
  }

  console.log('\n');
}

main().catch(console.error);
