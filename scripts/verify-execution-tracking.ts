#!/usr/bin/env npx tsx
/**
 * Verify Prompt Execution Tracking
 *
 * Run with: npx tsx scripts/verify-execution-tracking.ts
 */

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

// Initialize Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

const db = admin.firestore();

async function main() {
  console.log('\n=== Prompt Execution Tracking Verification ===\n');

  // 1. Check total executions
  const totalSnapshot = await db.collection('promptExecutions').count().get();
  console.log(`Total executions in collection: ${totalSnapshot.data().count}`);

  // 2. Get service breakdown
  console.log('\n--- Service Execution Counts (last 1000) ---');
  const recentSnapshot = await db.collection('promptExecutions')
    .orderBy('executedAt', 'desc')
    .limit(1000)
    .get();

  const serviceCounts = new Map<string, number>();
  recentSnapshot.docs.forEach((doc) => {
    const service = doc.data().service;
    serviceCounts.set(service, (serviceCounts.get(service) || 0) + 1);
  });

  Array.from(serviceCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([service, count]) => {
      console.log(`  ${service}: ${count}`);
    });

  // 3. Check specific services we added tracking to
  console.log('\n--- Newly Tracked Services Check ---');

  const newServices = ['KeywordGenerator', 'DailyInsightService', 'LifeConnectionsService'];

  for (const service of newServices) {
    try {
      const snapshot = await db.collection('promptExecutions')
        .where('service', '==', service)
        .orderBy('executedAt', 'desc')
        .limit(3)
        .get();

      if (snapshot.size > 0) {
        console.log(`\n✅ ${service}: ${snapshot.size} recent executions found`);
        const latest = snapshot.docs[0].data();
        console.log(`   Latest: ${latest.promptId} at ${latest.executedAt}`);
        console.log(`   Model: ${latest.model}, Cost: $${latest.estimatedCostUSD?.toFixed(6) || 'N/A'}`);
      } else {
        console.log(`\n⚠️  ${service}: No executions yet (will appear after function runs)`);
      }
    } catch (error: any) {
      if (error.code === 9) {
        console.log(`\n⚠️  ${service}: Index not ready yet`);
      } else {
        console.log(`\n❌ ${service}: Error - ${error.message}`);
      }
    }
  }

  // 4. Check lifeKeywords collection
  console.log('\n--- lifeKeywords Collection ---');
  const keywordsSnapshot = await db.collection('lifeKeywords').limit(10).get();
  console.log(`Total keywords found: ${keywordsSnapshot.size}`);

  if (keywordsSnapshot.size > 0) {
    const keyword = keywordsSnapshot.docs[0].data();
    console.log(`Latest keyword: "${keyword.keyword}" (${keyword.periodType})`);
  }

  // 5. Verify execution document structure
  console.log('\n--- Execution Document Structure ---');
  const sampleDoc = recentSnapshot.docs[0];
  if (sampleDoc) {
    const data = sampleDoc.data();
    const requiredFields = ['userId', 'service', 'promptId', 'language', 'model', 'estimatedCostUSD', 'success', 'executedAt'];
    const presentFields = requiredFields.filter(f => f in data);
    const missingFields = requiredFields.filter(f => !(f in data));

    console.log(`  Present: ${presentFields.join(', ')}`);
    if (missingFields.length > 0) {
      console.log(`  Missing: ${missingFields.join(', ')}`);
    } else {
      console.log('  ✅ All required fields present');
    }
  }

  console.log('\n=== Verification Complete ===\n');
  process.exit(0);
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
