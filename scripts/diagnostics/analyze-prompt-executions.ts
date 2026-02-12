#!/usr/bin/env npx tsx
/**
 * Analyze promptExecutions collection for cost optimization
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

async function analyze() {
  console.log('=== PROMPT EXECUTIONS ANALYSIS ===\n');

  // Total count
  const totalSnap = await db.collection('promptExecutions').count().get();
  const total = totalSnap.data().count;
  console.log('Total documents:', total.toLocaleString());

  // Get sample to understand size
  const sample = await db.collection('promptExecutions').limit(1).get();
  if (!sample.empty) {
    const sampleData = sample.docs[0].data();
    const jsonStr = JSON.stringify(sampleData);
    console.log('Avg document size:', jsonStr.length, 'bytes');
    console.log('Estimated storage:', ((total * jsonStr.length) / 1024 / 1024).toFixed(2), 'MB');
  }

  // Count by service
  console.log('\n=== COUNT BY SERVICE ===');
  const services = [
    'EmbeddingService',
    'LifeFeedGenerator',
    'RAGService',
    'ChatService',
    'VoiceTranscriptionService',
    'InsightsService',
    'CarouselInsightsService',
    'CategorySuggestionService',
    'ChatSuggestionService',
    'AnomalyDetectionService',
    'QuestionExtractor',
    'TemporalQueryService'
  ];

  const serviceCounts: { service: string; count: number }[] = [];
  for (const svc of services) {
    const countSnap = await db.collection('promptExecutions')
      .where('service', '==', svc)
      .count()
      .get();
    const count = countSnap.data().count;
    if (count > 0) {
      serviceCounts.push({ service: svc, count });
    }
  }

  // Sort by count
  serviceCounts.sort((a, b) => b.count - a.count);
  for (const { service, count } of serviceCounts) {
    const pct = ((count / total) * 100).toFixed(1);
    console.log(`  ${service}: ${count.toLocaleString()} (${pct}%)`);
  }

  // Date range
  console.log('\n=== DATE RANGE ===');
  const oldest = await db.collection('promptExecutions')
    .orderBy('executedAt', 'asc')
    .limit(1)
    .get();

  if (!oldest.empty) {
    const oldestData = oldest.docs[0].data();
    const oldestDate = oldestData.executedAt;
    console.log('Oldest:', typeof oldestDate === 'string' ? oldestDate : oldestDate?.toDate?.().toISOString() || 'N/A');
  }

  const newest = await db.collection('promptExecutions')
    .orderBy('executedAt', 'desc')
    .limit(1)
    .get();

  if (!newest.empty) {
    const newestData = newest.docs[0].data();
    const newestDate = newestData.executedAt;
    console.log('Newest:', typeof newestDate === 'string' ? newestDate : newestDate?.toDate?.().toISOString() || 'N/A');
  }

  // Recent velocity
  console.log('\n=== VELOCITY ===');
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const last24h = await db.collection('promptExecutions')
    .where('executedAt', '>=', oneDayAgo.toISOString())
    .count()
    .get();
  console.log('Last 24 hours:', last24h.data().count.toLocaleString());

  const lastWeek = await db.collection('promptExecutions')
    .where('executedAt', '>=', oneWeekAgo.toISOString())
    .count()
    .get();
  console.log('Last 7 days:', lastWeek.data().count.toLocaleString());

  const lastMonth = await db.collection('promptExecutions')
    .where('executedAt', '>=', oneMonthAgo.toISOString())
    .count()
    .get();
  console.log('Last 30 days:', lastMonth.data().count.toLocaleString());

  // Cost analysis
  console.log('\n=== COST ANALYSIS ===');

  // Sample 1000 docs to estimate total cost
  const costSample = await db.collection('promptExecutions')
    .orderBy('executedAt', 'desc')
    .limit(1000)
    .get();

  let totalCost = 0;
  let totalTokens = 0;
  const costByService: Record<string, { cost: number; count: number; tokens: number }> = {};

  costSample.docs.forEach(doc => {
    const data = doc.data();
    const cost = data.estimatedCostUSD || 0;
    const tokens = data.totalTokens || 0;
    const service = data.service || 'Unknown';

    totalCost += cost;
    totalTokens += tokens;

    if (!costByService[service]) {
      costByService[service] = { cost: 0, count: 0, tokens: 0 };
    }
    costByService[service].cost += cost;
    costByService[service].count += 1;
    costByService[service].tokens += tokens;
  });

  console.log('Sample size: 1000 recent executions');
  console.log('Sample total cost: $' + totalCost.toFixed(4));
  console.log('Sample total tokens:', totalTokens.toLocaleString());
  console.log('\nCost by service (sample):');

  const sortedServices = Object.entries(costByService).sort((a, b) => b[1].cost - a[1].cost);
  for (const [svc, data] of sortedServices) {
    console.log(`  ${svc}: $${data.cost.toFixed(4)} (${data.count} calls, ${data.tokens.toLocaleString()} tokens)`);
  }

  // Firestore cost estimation
  console.log('\n=== FIRESTORE COST ESTIMATE ===');
  // Firestore pricing: $0.18 per 100K reads, $0.18 per 100K writes, $0.18/GB storage
  const estimatedStorageGB = (total * 500) / 1024 / 1024 / 1024; // Assume 500 bytes avg
  const storageCostPerMonth = estimatedStorageGB * 0.18;
  console.log('Estimated storage:', estimatedStorageGB.toFixed(3), 'GB');
  console.log('Storage cost/month: $' + storageCostPerMonth.toFixed(2));
  console.log('');
  console.log('Note: Each write to promptExecutions costs ~$0.0000018');
  console.log('At current velocity, monthly write cost for this collection:');
  const monthlyWrites = lastMonth.data().count;
  const writeCost = (monthlyWrites / 100000) * 0.18;
  console.log('  ' + monthlyWrites.toLocaleString() + ' writes = $' + writeCost.toFixed(2));

  // Recommendations
  console.log('\n=== RECOMMENDATIONS ===');
  console.log('1. RETENTION POLICY: Consider deleting records older than 30-90 days');
  console.log('   - Current data spans multiple months');
  console.log('   - Old execution logs rarely needed');

  console.log('\n2. HIGH-VOLUME SERVICES:');
  const topService = serviceCounts[0];
  if (topService) {
    console.log(`   - ${topService.service} accounts for ${((topService.count / total) * 100).toFixed(1)}% of records`);
    console.log('   - Consider batching or reducing logging frequency');
  }

  console.log('\n3. TTL (Time-To-Live) OPTIONS:');
  console.log('   a) Cloud Function scheduled cleanup (recommended)');
  console.log('   b) Firestore TTL policy (if available in your region)');
  console.log('   c) Archive to BigQuery before deletion for analytics');

  console.log('\n4. SAMPLING STRATEGY:');
  console.log('   - For EmbeddingService: log every 10th call instead of all');
  console.log('   - Keep full logs only for errors or high-value calls');

  process.exit(0);
}

analyze().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
