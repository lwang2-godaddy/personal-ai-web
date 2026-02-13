#!/usr/bin/env npx tsx
/**
 * Demo Data Seed Script for App Store Screenshots
 *
 * Creates a demo account with realistic data showcasing all major features:
 * health tracking, location visits, voice notes, text notes, photos, and
 * AI-generated life feed posts.
 *
 * Persona: Alex Chen — balanced professional (work, fitness, social, hobbies)
 * based in SF Bay Area.
 *
 * Usage:
 *   npx tsx scripts/diagnostics/seed-demo-data.ts [options]
 *
 * Options:
 *   --photos-dir <path>   Path to folder with demo photos (default: ./demo-photos)
 *   --skip-photos         Skip photo upload phase
 *   --skip-life-feed      Skip life feed generation trigger
 *   --skip-wait           Skip waiting for embeddings
 *   --cleanup-only        Only delete existing demo data, then exit
 */

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

import type { DemoProgressEvent } from '../../lib/services/demo/types';
import { DEMO_EMAIL, DEMO_PASSWORD, DEMO_DISPLAY_NAME } from '../../lib/services/demo/demoData';
import {
  cleanupDemoData,
  createDemoUser,
  seedHealthData,
  seedLocationData,
  seedVoiceNotes,
  seedTextNotes,
  seedPhotos,
  waitForEmbeddings,
  triggerLifeFeed,
} from '../../lib/services/demo/demoOperations';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

dotenv.config({ path: path.join(__dirname, '../../.env.local') });

// ---------------------------------------------------------------------------
// Terminal colors & logging helpers
// ---------------------------------------------------------------------------

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(msg: string, color = colors.reset) {
  console.log(`${color}${msg}${colors.reset}`);
}
function logSuccess(msg: string) { log(`  ✓ ${msg}`, colors.green); }
function logError(msg: string) { log(`  ✗ ${msg}`, colors.red); }
function logInfo(msg: string) { log(`  ℹ ${msg}`, colors.cyan); }
function logPhase(n: number, title: string) {
  log(`\n${'═'.repeat(60)}`, colors.bright);
  log(`  Phase ${n}: ${title}`, colors.bright);
  log(`${'═'.repeat(60)}`, colors.bright);
}

/** Console-logging ProgressCallback adapter */
function cliProgress(event: DemoProgressEvent): void {
  const levelMap: Record<string, (msg: string) => void> = {
    info: (msg) => log(`  ℹ ${msg}`, colors.cyan),
    success: (msg) => log(`  ✓ ${msg}`, colors.green),
    error: (msg) => log(`  ✗ ${msg}`, colors.red),
    warning: (msg) => log(`  ⚠ ${msg}`, colors.yellow),
  };
  // Print phase header on first message per phase
  const printer = levelMap[event.level] || logInfo;
  printer(event.message);
}

// ---------------------------------------------------------------------------
// Firebase initialization
// ---------------------------------------------------------------------------

function initFirebase(): admin.app.App {
  if (admin.apps.length > 0) return admin.app();

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!serviceAccountKey) {
    logError('FIREBASE_SERVICE_ACCOUNT_KEY not found in .env.local');
    process.exit(1);
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountKey);
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  } catch (error) {
    logError(`Error parsing FIREBASE_SERVICE_ACCOUNT_KEY: ${error}`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);

  const skipPhotos = args.includes('--skip-photos');
  const skipLifeFeed = args.includes('--skip-life-feed');
  const skipWait = args.includes('--skip-wait');
  const cleanupOnly = args.includes('--cleanup-only');

  let photosDir = './demo-photos';
  const photosDirIdx = args.indexOf('--photos-dir');
  if (photosDirIdx !== -1 && args[photosDirIdx + 1]) {
    photosDir = args[photosDirIdx + 1];
  }
  photosDir = path.resolve(photosDir);

  log(`\n${colors.bright}╔════════════════════════════════════════╗${colors.reset}`);
  log(`${colors.bright}║  PersonalAI Demo Data Seed Script      ║${colors.reset}`);
  log(`${colors.bright}╚════════════════════════════════════════╝${colors.reset}`);
  log('');
  logInfo(`Photos dir:    ${photosDir}`);
  logInfo(`Skip photos:   ${skipPhotos}`);
  logInfo(`Skip life feed: ${skipLifeFeed}`);
  logInfo(`Skip wait:     ${skipWait}`);
  logInfo(`Cleanup only:  ${cleanupOnly}`);

  initFirebase();
  const db = admin.firestore();

  // Phase 0: Cleanup
  logPhase(0, 'Cleanup existing demo data');
  await cleanupDemoData(db, cliProgress);

  if (cleanupOnly) {
    logSuccess('Cleanup complete. Exiting (--cleanup-only).');
    process.exit(0);
  }

  // Phase 1: Create user
  logPhase(1, 'Create demo user');
  const uid = await createDemoUser(db, cliProgress);

  // Phase 2-5: Seed data
  logPhase(2, 'Seed health data');
  const healthCount = await seedHealthData(db, uid, cliProgress);

  logPhase(3, 'Seed location data');
  const locationCount = await seedLocationData(db, uid, cliProgress);

  logPhase(4, 'Seed voice notes');
  const voiceCount = await seedVoiceNotes(db, uid, cliProgress);

  logPhase(5, 'Seed text notes');
  const textCount = await seedTextNotes(db, uid, cliProgress);

  // Phase 6: Photos
  let photoCount = 0;
  if (!skipPhotos) {
    logPhase(6, 'Upload photos');
    photoCount = await seedPhotos(db, uid, photosDir, cliProgress);
  } else {
    logPhase(6, 'Upload photos (SKIPPED)');
  }

  // Phase 7: Wait for embeddings
  if (!skipWait) {
    logPhase(7, 'Wait for embedding generation');
    await waitForEmbeddings(db, uid, cliProgress);
  } else {
    logPhase(7, 'Wait for embeddings (SKIPPED)');
  }

  // Phase 8: Trigger life feed
  if (!skipLifeFeed) {
    logPhase(8, 'Trigger life feed generation');
    await triggerLifeFeed(uid, cliProgress);
  } else {
    logPhase(8, 'Trigger life feed (SKIPPED)');
  }

  // Phase 9: Summary
  logPhase(9, 'Summary');
  log('');
  log(`  ${'─'.repeat(40)}`, colors.dim);
  log(`  ${colors.bright}Demo Account Credentials${colors.reset}`);
  log(`  ${'─'.repeat(40)}`, colors.dim);
  log(`  Email:    ${colors.cyan}${DEMO_EMAIL}${colors.reset}`);
  log(`  Password: ${colors.cyan}${DEMO_PASSWORD}${colors.reset}`);
  log(`  UID:      ${colors.cyan}${uid}${colors.reset}`);
  log(`  Name:     ${colors.cyan}${DEMO_DISPLAY_NAME}${colors.reset}`);
  log(`  Tier:     ${colors.green}Premium${colors.reset}`);
  log(`  ${'─'.repeat(40)}`, colors.dim);
  log('');
  log(`  ${colors.bright}Data Seeded${colors.reset}`);
  log(`  ${'─'.repeat(40)}`, colors.dim);

  const counts: Record<string, number> = {
    'Health Data': healthCount,
    'Location Visits': locationCount,
    'Voice Notes': voiceCount,
    'Text Notes': textCount,
    'Photos': photoCount,
  };

  for (const [label, count] of Object.entries(counts)) {
    log(`  ${label.padEnd(20)} ${colors.green}${count}${colors.reset}`);
  }

  const lfSnapshot = await db.collection('lifeFeedPosts').where('userId', '==', uid).get();
  log(`  ${'Life Feed Posts'.padEnd(20)} ${colors.green}${lfSnapshot.size}${colors.reset}`);

  log(`  ${'─'.repeat(40)}`, colors.dim);
  log('');
  logSuccess('Demo data seeding complete!');
  log('');

  process.exit(0);
}

main().catch(error => {
  logError(`Fatal error: ${error}`);
  console.error(error);
  process.exit(1);
});
