#!/usr/bin/env npx tsx
/**
 * Check which Cloud Functions are deployed and their status
 *
 * This is a simple diagnostic that:
 * 1. Lists all deployed functions
 * 2. Shows deployment status (last update time, runtime, etc.)
 * 3. Checks if specific functions exist
 *
 * Usage:
 *   npx tsx scripts/diagnostics/check-functions-deployed.ts
 *   npx tsx scripts/diagnostics/check-functions-deployed.ts --function queryRAG
 *
 * Requirements:
 *   - gcloud CLI installed and authenticated
 *   - OR GOOGLE_APPLICATION_CREDENTIALS set
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { execSync } from 'child_process';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '..', '.env.local') });

const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'personalaiapp-90131';
const FIREBASE_REGION = process.env.FIREBASE_REGION || 'us-central1';

// HTTP functions we can check via endpoint
const HTTP_FUNCTIONS = [
  'queryRAG',
];

// Firestore/Auth triggers (cannot be checked via HTTP - they're event-driven)
const EVENT_TRIGGERS = [
  'onVoiceNoteCreated',
  'onTextNoteCreated',
  'onLocationDataCreated',
  'onHealthDataCreated',
];

interface FunctionInfo {
  name: string;
  status: string;
  updateTime?: string;
  runtime?: string;
  httpsTrigger?: boolean;
  eventTrigger?: string;
}

/**
 * Check function availability via HTTP endpoint
 */
async function checkFunctionEndpoint(functionName: string): Promise<{ exists: boolean; latencyMs: number }> {
  const url = `https://${FIREBASE_REGION}-${FIREBASE_PROJECT_ID}.cloudfunctions.net/${functionName}`;
  const startTime = Date.now();

  try {
    const response = await fetch(url, { method: 'OPTIONS' });
    const latencyMs = Date.now() - startTime;
    // 404 means function doesn't exist, anything else means it exists
    return { exists: response.status !== 404, latencyMs };
  } catch (error) {
    return { exists: false, latencyMs: Date.now() - startTime };
  }
}

/**
 * Get function list using gcloud CLI
 */
function getFunctionsViaGcloud(): FunctionInfo[] {
  try {
    const output = execSync(
      `gcloud functions list --project=${FIREBASE_PROJECT_ID} --region=${FIREBASE_REGION} --format=json`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );

    const functions = JSON.parse(output);
    return functions.map((fn: any) => ({
      name: fn.name.split('/').pop(),
      status: fn.state || fn.status,
      updateTime: fn.updateTime,
      runtime: fn.runtime,
      httpsTrigger: !!fn.httpsTrigger,
      eventTrigger: fn.eventTrigger?.eventType,
    }));
  } catch (error: any) {
    // gcloud not available or not authenticated
    return [];
  }
}

async function main() {
  const args = process.argv.slice(2);
  const specificFunction = args.includes('--function')
    ? args[args.indexOf('--function') + 1]
    : null;

  console.log('\n' + '='.repeat(60));
  console.log('  Cloud Functions Deployment Check');
  console.log('='.repeat(60));
  console.log(`\nProject: ${FIREBASE_PROJECT_ID}`);
  console.log(`Region: ${FIREBASE_REGION}`);

  // Try to get detailed info via gcloud
  console.log('\n--- Checking via gcloud CLI ---');
  const gcloudFunctions = getFunctionsViaGcloud();

  if (gcloudFunctions.length > 0) {
    console.log(`\nFound ${gcloudFunctions.length} deployed functions:\n`);

    const functionsToCheck = specificFunction
      ? gcloudFunctions.filter(f => f.name === specificFunction)
      : gcloudFunctions;

    for (const fn of functionsToCheck) {
      console.log(`  ${fn.name}`);
      console.log(`    Status: ${fn.status}`);
      console.log(`    Runtime: ${fn.runtime}`);
      console.log(`    Updated: ${fn.updateTime ? new Date(fn.updateTime).toLocaleString() : 'Unknown'}`);
      console.log(`    Trigger: ${fn.httpsTrigger ? 'HTTPS' : fn.eventTrigger || 'Unknown'}`);
      console.log('');
    }

    // Check for expected functions
    console.log('--- Expected Functions Status ---\n');
    console.log('  HTTP Functions:');
    for (const fn of HTTP_FUNCTIONS) {
      const found = gcloudFunctions.find(f => f.name === fn);
      if (found) {
        console.log(`    ✅ ${fn} - deployed`);
      } else {
        console.log(`    ❌ ${fn} - NOT FOUND`);
      }
    }
    console.log('\n  Event Triggers:');
    for (const fn of EVENT_TRIGGERS) {
      const found = gcloudFunctions.find(f => f.name === fn);
      if (found) {
        console.log(`    ✅ ${fn} - deployed`);
      } else {
        console.log(`    ❌ ${fn} - NOT FOUND`);
      }
    }
  } else {
    console.log('\n⚠️  gcloud CLI not available or not authenticated.');
    console.log('   Falling back to HTTP endpoint checks...\n');
  }

  // HTTP endpoint checks (works without gcloud)
  console.log('\n--- HTTP Endpoint Checks ---\n');

  const httpFunctionsToCheck = specificFunction
    ? HTTP_FUNCTIONS.filter(f => f === specificFunction)
    : HTTP_FUNCTIONS;

  if (httpFunctionsToCheck.length > 0) {
    for (const functionName of httpFunctionsToCheck) {
      const { exists, latencyMs } = await checkFunctionEndpoint(functionName);
      if (exists) {
        console.log(`  ✅ ${functionName} - responds (${latencyMs}ms)`);
      } else {
        console.log(`  ❌ ${functionName} - NOT responding`);
      }
    }
  }

  if (!specificFunction) {
    console.log(`\n  ℹ️  Event triggers (${EVENT_TRIGGERS.join(', ')}) cannot be checked via HTTP.`);
    console.log('     Use gcloud CLI or Firebase Console to verify their deployment.');
  }

  console.log('\n' + '='.repeat(60));
  console.log('  Notes');
  console.log('='.repeat(60));
  console.log(`
  • HTTP checks only verify the function exists, not its code version
  • To verify TemporalParserService is working, run integration tests:
    npm test -- --filter temporal

  • To deploy functions:
    cd PersonalAIApp/firebase && firebase deploy --only functions

  • To view function logs:
    firebase functions:log --only queryRAG
`);
}

main().catch(error => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
