/**
 * Quick script to check Pinecone vectors
 */

import * as dotenv from 'dotenv';
import { Pinecone } from '@pinecone-database/pinecone';

dotenv.config({ path: '.env.local' });

async function check() {
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  });

  const indexName = process.env.PINECONE_INDEX || 'personal-ai-data';
  const index = pinecone.index(indexName);

  console.log(`\nChecking Pinecone index: ${indexName}\n`);

  // Get index stats
  const stats = await index.describeIndexStats();
  console.log('Index stats:', JSON.stringify(stats, null, 2));

  // Try to fetch some recent memory vectors
  const testIds = [
    'memory_text_e2e-rag-test-1770786808829-0l8h52nce', // Latest test
    'memory_voice_regression-voice-test-1770610859700-d3ebn8fou', // Known working
  ];

  console.log('\nFetching test vectors:');
  for (const id of testIds) {
    try {
      const result = await index.fetch([id]);
      // Use 'records' for newer Pinecone SDK versions
      const records = (result as { records?: Record<string, unknown> }).records || {};
      if (records[id]) {
        console.log(`  ✓ ${id} - FOUND`);
        console.log(`    Metadata keys: ${Object.keys((records[id] as { metadata?: Record<string, unknown> }).metadata || {}).join(', ')}`);
      } else {
        console.log(`  ✗ ${id} - NOT FOUND`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`  ✗ ${id} - ERROR: ${message}`);
    }
  }

  // Query for recent vectors with type=memory
  console.log('\nQuerying for recent memory vectors...');
  try {
    // Create a dummy query vector (all zeros) just to list vectors
    const dummyVector = new Array(1536).fill(0);
    const queryResult = await index.query({
      vector: dummyVector,
      topK: 5,
      filter: { type: 'memory' },
      includeMetadata: true,
    });

    if (queryResult.matches && queryResult.matches.length > 0) {
      console.log(`Found ${queryResult.matches.length} memory vectors:`);
      queryResult.matches.forEach((match) => {
        console.log(`  - ${match.id} (score: ${match.score?.toFixed(4)})`);
      });

      // Try to fetch the first vector found by query
      const firstId = queryResult.matches[0].id;
      console.log(`\nTrying to fetch first query result: ${firstId}`);
      const fetchResult = await index.fetch([firstId]);
      const fetchRecords = (fetchResult as { records?: Record<string, unknown> }).records || {};
      if (fetchRecords[firstId]) {
        console.log(`  ✓ ${firstId} - FETCH WORKS`);
        console.log(`    Metadata: ${JSON.stringify((fetchRecords[firstId] as { metadata?: unknown }).metadata, null, 2).substring(0, 200)}...`);
      } else {
        console.log(`  ✗ ${firstId} - FETCH FAILED (but query found it!)`);
      }
    } else {
      console.log('No memory vectors found with type=memory filter');
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`Query error: ${message}`);
  }
}

check().catch(console.error);
