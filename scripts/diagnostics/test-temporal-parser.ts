#!/usr/bin/env npx tsx
/**
 * Test the temporal parser directly via Cloud Function
 */

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '..', '.env.local') });

const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'personal-ai-app';
const FIREBASE_REGION = process.env.FIREBASE_REGION || 'us-central1';

async function main() {
  const userId = process.argv[2] || 'test-user';
  const query = process.argv[3] || '昨天我做了什么饭';

  console.log(`\n🔍 Testing temporal query parsing`);
  console.log(`   User ID: ${userId}`);
  console.log(`   Query: "${query}"`);
  console.log(`   Calling queryRAG Cloud Function...\n`);

  const queryRAGUrl = `https://${FIREBASE_REGION}-${FIREBASE_PROJECT_ID}.cloudfunctions.net/queryRAG`;

  try {
    const response = await fetch(queryRAGUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          query: query,
          userId: userId,
          topK: 10,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ HTTP ${response.status}: ${errorText}`);
      return;
    }

    const data = await response.json();
    const result = data.result || {};

    console.log(`📋 Response:`);
    console.log(`   AI Response: "${(result.response || '').substring(0, 100)}..."`);
    console.log(`   Context items: ${result.contextUsed?.length || 0}`);

    if (result.contextUsed && result.contextUsed.length > 0) {
      console.log(`\n📚 Context used:`);
      result.contextUsed.forEach((ctx: any, i: number) => {
        console.log(`   ${i + 1}. ${ctx.text?.substring(0, 80)}...`);
      });
    } else {
      console.log(`\n⚠️  No context found! Check:`);
      console.log(`   1. Firebase Functions logs: firebase functions:log --only queryRAG`);
      console.log(`   2. Voice notes have eventTimestampMs set`);
      console.log(`   3. Temporal parser detected the date reference`);
    }

    // Also show debug info if available
    if (result.debug) {
      console.log(`\n🔧 Debug info:`, JSON.stringify(result.debug, null, 2));
    }

  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
  }

  console.log('\n');
}

main().catch(console.error);
