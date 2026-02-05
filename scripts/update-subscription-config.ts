/**
 * update-subscription-config.ts
 *
 * Script to update the subscription tier configuration in Firestore
 * Run with: npx tsx scripts/update-subscription-config.ts
 *
 * This updates /config/subscriptionTiers with the new tier structure:
 * - Basic (formerly Free): 50 msg/mo, 10 photos, 30 min voice, 30s max recording
 * - Premium: 250 msg/mo, 100 photos, 250 min voice, 120s max recording
 * - Pro: 1000 msg/mo, 200 photos, 1000 min voice, 300s max recording, web access
 */

import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

// Initialize Firebase Admin
// Look for service account in common locations
const possiblePaths = [
  path.join(__dirname, '../serviceAccountKey.json'),
  path.join(__dirname, '../../personalaiapp-90131-firebase-adminsdk-fbsvc-b6aeb012ec.json'),
  path.join(__dirname, '../../PersonalAIApp/firebase/functions/serviceAccountKey.json'),
];

let serviceAccountPath: string | null = null;
for (const p of possiblePaths) {
  if (fs.existsSync(p)) {
    serviceAccountPath = p;
    console.log(`Found service account at: ${p}`);
    break;
  }
}

if (!serviceAccountPath) {
  console.error('ERROR: No service account file found. Checked:');
  possiblePaths.forEach(p => console.error(`  - ${p}`));
  console.error('\nPlease ensure a Firebase service account JSON file exists.');
  process.exit(1);
}

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
  });
  console.log('Firebase Admin initialized successfully.\n');
}

const db = admin.firestore();

interface TierQuotas {
  messagesPerMonth: number; // -1 = unlimited
  photosPerMonth: number;
  voiceMinutesPerMonth: number;
  maxVoiceRecordingSeconds: number;
  customActivityTypes: number; // -1 = unlimited
  offlineMode: boolean;
  webAccess: boolean;
}

interface SubscriptionTierConfig {
  version: number;
  lastUpdated: string;
  updatedBy: string;
  enableDynamicConfig: boolean;
  tiers: {
    basic: TierQuotas;
    premium: TierQuotas;
    pro: TierQuotas;
  };
}

const NEW_SUBSCRIPTION_CONFIG: SubscriptionTierConfig = {
  version: 2, // Increment from previous version
  lastUpdated: new Date().toISOString(),
  updatedBy: 'migration-script',
  enableDynamicConfig: true,
  tiers: {
    basic: {
      messagesPerMonth: 50,
      photosPerMonth: 10,
      voiceMinutesPerMonth: 30,
      maxVoiceRecordingSeconds: 30, // 30 seconds
      customActivityTypes: 11, // Preset activities only
      offlineMode: true,
      webAccess: false,
    },
    premium: {
      messagesPerMonth: 250,
      photosPerMonth: 100,
      voiceMinutesPerMonth: 250,
      maxVoiceRecordingSeconds: 120, // 2 minutes
      customActivityTypes: -1, // Unlimited
      offlineMode: true,
      webAccess: false,
    },
    pro: {
      messagesPerMonth: 1000,
      photosPerMonth: 200,
      voiceMinutesPerMonth: 1000,
      maxVoiceRecordingSeconds: 300, // 5 minutes
      customActivityTypes: -1, // Unlimited
      offlineMode: true,
      webAccess: true, // Pro only feature
    },
  },
};

async function updateSubscriptionConfig(): Promise<void> {
  console.log('Updating subscription tier configuration...\n');

  const configRef = db.collection('config').doc('subscriptionTiers');

  // Check if config exists
  const existingDoc = await configRef.get();
  if (existingDoc.exists) {
    const existingConfig = existingDoc.data() as SubscriptionTierConfig;
    console.log('Existing config found:');
    console.log(`  Version: ${existingConfig.version}`);
    console.log(`  Last Updated: ${existingConfig.lastUpdated}`);
    console.log('');
  } else {
    console.log('No existing config found. Creating new one.\n');
  }

  // Update the config
  await configRef.set(NEW_SUBSCRIPTION_CONFIG);

  console.log('New configuration applied:');
  console.log(`  Version: ${NEW_SUBSCRIPTION_CONFIG.version}`);
  console.log(`  Last Updated: ${NEW_SUBSCRIPTION_CONFIG.lastUpdated}`);
  console.log('');
  console.log('Tier limits:');
  console.log('  Basic:');
  console.log(`    - Messages: ${NEW_SUBSCRIPTION_CONFIG.tiers.basic.messagesPerMonth}/month`);
  console.log(`    - Photos: ${NEW_SUBSCRIPTION_CONFIG.tiers.basic.photosPerMonth}/month`);
  console.log(`    - Voice: ${NEW_SUBSCRIPTION_CONFIG.tiers.basic.voiceMinutesPerMonth} min/month`);
  console.log(`    - Max Recording: ${NEW_SUBSCRIPTION_CONFIG.tiers.basic.maxVoiceRecordingSeconds}s`);
  console.log(`    - Web Access: ${NEW_SUBSCRIPTION_CONFIG.tiers.basic.webAccess}`);
  console.log('');
  console.log('  Premium:');
  console.log(`    - Messages: ${NEW_SUBSCRIPTION_CONFIG.tiers.premium.messagesPerMonth}/month`);
  console.log(`    - Photos: ${NEW_SUBSCRIPTION_CONFIG.tiers.premium.photosPerMonth}/month`);
  console.log(`    - Voice: ${NEW_SUBSCRIPTION_CONFIG.tiers.premium.voiceMinutesPerMonth} min/month`);
  console.log(`    - Max Recording: ${NEW_SUBSCRIPTION_CONFIG.tiers.premium.maxVoiceRecordingSeconds}s`);
  console.log(`    - Web Access: ${NEW_SUBSCRIPTION_CONFIG.tiers.premium.webAccess}`);
  console.log('');
  console.log('  Pro:');
  console.log(`    - Messages: ${NEW_SUBSCRIPTION_CONFIG.tiers.pro.messagesPerMonth}/month`);
  console.log(`    - Photos: ${NEW_SUBSCRIPTION_CONFIG.tiers.pro.photosPerMonth}/month`);
  console.log(`    - Voice: ${NEW_SUBSCRIPTION_CONFIG.tiers.pro.voiceMinutesPerMonth} min/month`);
  console.log(`    - Max Recording: ${NEW_SUBSCRIPTION_CONFIG.tiers.pro.maxVoiceRecordingSeconds}s`);
  console.log(`    - Web Access: ${NEW_SUBSCRIPTION_CONFIG.tiers.pro.webAccess}`);
  console.log('');

  // Save version history
  const versionRef = db.collection('subscriptionTierVersions').doc(`v${NEW_SUBSCRIPTION_CONFIG.version}`);
  await versionRef.set({
    id: `v${NEW_SUBSCRIPTION_CONFIG.version}`,
    version: NEW_SUBSCRIPTION_CONFIG.version,
    config: NEW_SUBSCRIPTION_CONFIG,
    changedBy: 'migration-script',
    changedAt: new Date().toISOString(),
    changeNotes: 'Subscription tier restructure: renamed free->basic, daily->monthly limits, added maxVoiceRecordingSeconds, added webAccess',
    previousVersion: existingDoc.exists ? (existingDoc.data() as SubscriptionTierConfig).version : null,
  });

  console.log('Version history saved.\n');
  console.log('Subscription config update complete!');
}

// Run the update
updateSubscriptionConfig()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error updating subscription config:', error);
    process.exit(1);
  });
