#!/usr/bin/env npx tsx
/**
 * Check event_embedding costs in promptExecutions
 */
import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountKey) {
  console.error('FIREBASE_SERVICE_ACCOUNT_KEY not found');
  process.exit(1);
}

const serviceAccount = JSON.parse(serviceAccountKey);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});
const db = admin.firestore();

async function check() {
  // Count event_embedding executions
  const countSnap = await db.collection('promptExecutions')
    .where('sourceType', '==', 'event_embedding')
    .count().get();
  console.log('event_embedding tracked executions:', countSnap.data().count);

  // Get samples (no orderBy to avoid needing composite index)
  console.log('\nSample event_embedding executions (first 10):');
  const snap = await db.collection('promptExecutions')
    .where('sourceType', '==', 'event_embedding')
    .limit(10)
    .get();

  snap.forEach(doc => {
    const d = doc.data();
    console.log(`  ${d.executedAt} | service=${d.service} | cost=$${(d.estimatedCostUSD || 0).toFixed(6)} | tokens=${d.totalTokens} | model=${d.model || 'N/A'} | samplingRate=${d.samplingRate || 'N/A'} | docId=${d.sourceDocId || 'N/A'}`);
  });

  // Check how many events exist
  const eventsCount = await db.collection('events').count().get();
  console.log(`\nEvents in Firestore: ${eventsCount.data().count}`);

  // Check service field distribution
  const serviceMap: Record<string, number> = {};
  const samplingRateMap: Record<string, number> = {};
  // Only sample 500 to avoid downloading all 200k docs
  const sampleSnap = await db.collection('promptExecutions')
    .where('sourceType', '==', 'event_embedding')
    .limit(500)
    .get();

  let sampleCost = 0;
  let sampleTokens = 0;
  const sourceDocIds = new Set<string>();

  sampleSnap.forEach(doc => {
    const d = doc.data();
    sampleCost += d.estimatedCostUSD || 0;
    sampleTokens += d.totalTokens || 0;

    const svc = d.service || 'unknown';
    serviceMap[svc] = (serviceMap[svc] || 0) + 1;

    const sr = String(d.samplingRate || 'none');
    samplingRateMap[sr] = (samplingRateMap[sr] || 0) + 1;

    if (d.sourceDocId) sourceDocIds.add(d.sourceDocId);
  });

  console.log(`\nSample of 500 docs:`);
  console.log(`  Total cost: $${sampleCost.toFixed(6)}`);
  console.log(`  Total tokens: ${sampleTokens}`);
  console.log(`  Avg cost per doc: $${(sampleCost / 500).toFixed(6)}`);
  console.log(`  Unique sourceDocIds: ${sourceDocIds.size}`);

  console.log('\nService field breakdown (500 sample):');
  for (const [svc, count] of Object.entries(serviceMap)) {
    console.log(`  ${svc}: ${count}`);
  }

  console.log('\nSampling rate breakdown (500 sample):');
  for (const [sr, count] of Object.entries(samplingRateMap)) {
    console.log(`  samplingRate=${sr}: ${count}`);
  }

  // Extrapolate
  const totalCount = countSnap.data().count;
  const extrapolatedCost = (sampleCost / 500) * totalCount;
  console.log(`\n--- Extrapolated Totals ---`);
  console.log(`Total tracked docs: ${totalCount}`);
  console.log(`Extrapolated raw cost: $${extrapolatedCost.toFixed(4)}`);
  console.log(`85 events / ${totalCount} tracking docs = ${(totalCount / 85).toFixed(0)}x ratio`);
  console.log(`This means each event was embedded ~${(totalCount / 85).toFixed(0)} times!`);

  process.exit(0);
}

check().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
