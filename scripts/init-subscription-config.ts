#!/usr/bin/env tsx

/**
 * Initialize Subscription Tier Configuration
 *
 * This script creates the initial subscription tier configuration in Firestore
 * at /config/subscriptionTiers with default values from SUBSCRIPTION_TIERS.
 *
 * Usage:
 *   npm run init-subscription-config
 *   npm run init-subscription-config -- --force  # Overwrite existing config
 *
 * Prerequisites:
 *   - FIREBASE_SERVICE_ACCOUNT_KEY environment variable set in .env.local
 *   - Or: gcloud application-default credentials configured
 */

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Config document paths
const CONFIG_DOC_PATH = 'config/subscriptionTiers';
const VERSIONS_COLLECTION = 'subscriptionTierVersions';

// Default tier quotas (matching mobile app's SUBSCRIPTION_TIERS)
const DEFAULT_FREE_QUOTAS = {
  messagesPerDay: 50,
  photosPerMonth: 15,
  voiceMinutesPerMonth: 30,
  customActivityTypes: 11,
  insightsEnabled: false,
  prioritySupport: false,
  advancedAnalytics: false,
  dataExport: false,
  offlineMode: true,
  // API cost limits
  maxTokensPerDay: 10000, // 10K tokens/day
  maxApiCallsPerDay: 100, // 100 API calls/day
  maxCostPerMonth: 5.0, // $5/month
};

const DEFAULT_PREMIUM_QUOTAS = {
  messagesPerDay: -1, // unlimited
  photosPerMonth: -1,
  voiceMinutesPerMonth: -1,
  customActivityTypes: -1,
  insightsEnabled: true,
  prioritySupport: false,
  advancedAnalytics: false,
  dataExport: false,
  offlineMode: true,
  // API cost limits
  maxTokensPerDay: 100000, // 100K tokens/day
  maxApiCallsPerDay: 1000, // 1000 API calls/day
  maxCostPerMonth: 50.0, // $50/month
};

const DEFAULT_PRO_QUOTAS = {
  messagesPerDay: -1,
  photosPerMonth: -1,
  voiceMinutesPerMonth: -1,
  customActivityTypes: -1,
  insightsEnabled: true,
  prioritySupport: true,
  advancedAnalytics: true,
  dataExport: true,
  offlineMode: true,
  // API cost limits
  maxTokensPerDay: 500000, // 500K tokens/day
  maxApiCallsPerDay: 5000, // 5000 API calls/day
  maxCostPerMonth: 200.0, // $200/month
};

// Initialize Firebase Admin
function initializeFirebase() {
  if (admin.apps.length) {
    return admin.firestore();
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('Using Firebase service account from environment variable\n');
    } catch (error) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY');
      process.exit(1);
    }
  } else {
    console.log('Using application default credentials (gcloud)\n');
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  }

  return admin.firestore();
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');

  console.log('=====================================');
  console.log('Initialize Subscription Configuration');
  console.log('=====================================\n');

  const db = initializeFirebase();

  // Check if config already exists
  const existingConfig = await db.doc(CONFIG_DOC_PATH).get();

  if (existingConfig.exists && !force) {
    console.log('Subscription config already exists!');
    console.log('\nCurrent config:');
    const data = existingConfig.data();
    console.log(`  Version: ${data?.version}`);
    console.log(`  Last Updated: ${data?.lastUpdated}`);
    console.log(`  Dynamic Config: ${data?.enableDynamicConfig ? 'Enabled' : 'Disabled'}`);
    console.log(`  Free Messages/Day: ${data?.tiers?.free?.messagesPerDay}`);
    console.log('\nUse --force to overwrite the existing config.');
    process.exit(0);
  }

  const now = new Date().toISOString();
  const version = existingConfig.exists ? (existingConfig.data()?.version || 0) + 1 : 1;

  // Create the config document
  const config = {
    version,
    lastUpdated: now,
    updatedBy: 'system',
    enableDynamicConfig: true,
    tiers: {
      free: DEFAULT_FREE_QUOTAS,
      premium: DEFAULT_PREMIUM_QUOTAS,
      pro: DEFAULT_PRO_QUOTAS,
    },
  };

  console.log('Creating subscription config...\n');
  console.log('Config to be created:');
  console.log('  Version:', version);
  console.log('  Dynamic Config: Enabled');
  console.log('\n  Free Tier:');
  console.log('    Messages/Day:', DEFAULT_FREE_QUOTAS.messagesPerDay);
  console.log('    Photos/Month:', DEFAULT_FREE_QUOTAS.photosPerMonth);
  console.log('    Voice Min/Month:', DEFAULT_FREE_QUOTAS.voiceMinutesPerMonth);
  console.log('    Insights:', DEFAULT_FREE_QUOTAS.insightsEnabled);
  console.log('\n  Premium Tier:');
  console.log('    Messages/Day: Unlimited');
  console.log('    Photos/Month: Unlimited');
  console.log('    Voice Min/Month: Unlimited');
  console.log('    Insights:', DEFAULT_PREMIUM_QUOTAS.insightsEnabled);
  console.log('\n  Pro Tier:');
  console.log('    Messages/Day: Unlimited');
  console.log('    Photos/Month: Unlimited');
  console.log('    Voice Min/Month: Unlimited');
  console.log('    Insights:', DEFAULT_PRO_QUOTAS.insightsEnabled);
  console.log('    Analytics:', DEFAULT_PRO_QUOTAS.advancedAnalytics);
  console.log('    Data Export:', DEFAULT_PRO_QUOTAS.dataExport);
  console.log('    Priority Support:', DEFAULT_PRO_QUOTAS.prioritySupport);

  // Save the config
  await db.doc(CONFIG_DOC_PATH).set(config);
  console.log('\nConfig saved to Firestore at:', CONFIG_DOC_PATH);

  // Create version history record
  const versionDoc = {
    id: `v${version}`,
    version,
    config,
    changedBy: 'system',
    changedByEmail: 'migration-script',
    changedAt: now,
    changeNotes: force ? 'Re-initialized via migration script' : 'Initial configuration',
    previousVersion: existingConfig.exists ? existingConfig.data()?.version : undefined,
  };

  await db.collection(VERSIONS_COLLECTION).doc(`v${version}`).set(versionDoc);
  console.log('Version history saved to:', `${VERSIONS_COLLECTION}/v${version}`);

  console.log('\n=====================================');
  console.log('Configuration initialized successfully!');
  console.log('=====================================');
  console.log('\nYou can now:');
  console.log('1. View the config in Firebase Console');
  console.log('2. Edit quotas via Admin Portal at /admin/subscriptions');
  console.log('3. Mobile/web apps will fetch this config on startup');
}

main().catch((error) => {
  console.error('\nError:', error.message);
  process.exit(1);
});
