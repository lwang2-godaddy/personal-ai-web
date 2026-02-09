#!/usr/bin/env npx tsx
/**
 * Integration Test Runner
 *
 * Runs all integration tests in the tests/ directory.
 *
 * Usage:
 *   npm test                          # Run all tests
 *   npm test -- --filter event-date   # Run tests matching "event-date"
 *   npm test -- --verbose             # Run with verbose output
 *   npm test -- --skip-e2e            # Skip E2E tests (faster)
 *   npm test -- --e2e-only            # Run only E2E tests
 *
 * E2E Test Convention:
 *   Files ending with '-e2e.test.ts' are considered E2E tests.
 *   These tests call Cloud Functions and require full backend setup.
 *
 * Prerequisites:
 *   - Firebase Admin SDK credentials (GOOGLE_APPLICATION_CREDENTIALS or service account)
 *   - Deployed Cloud Functions
 *   - Environment variables in .env.local
 */

import * as admin from 'firebase-admin';
import { Pinecone } from '@pinecone-database/pinecone';
import { initFirebase, ensureTestUserExists, getProjectId, getRegion, getTestUserIdToken } from './lib/firebase-setup';
import { initPinecone, getPineconeIndex } from './lib/pinecone-setup';
import { runAllTests, parseArgs } from './lib/test-runner';
import { log, colors, logSection, printSummary } from './lib/reporter';

// Declare global test context type
declare global {
  var testContext: {
    db: admin.firestore.Firestore;
    pinecone: Pinecone;
    userId: string;
    idToken: string;
    projectId: string;
    region: string;
    pineconeIndex: string;
    waitTimeMs: number;
  };
}

// Configuration
const WAIT_TIME_MS = 15000; // Wait for Cloud Function to process

async function main() {
  const args = parseArgs(process.argv.slice(2));

  logSection('Integration Test Runner');
  log(`\nPinecone Index: ${getPineconeIndex()}`);
  log(`Wait Time: ${WAIT_TIME_MS / 1000}s per test`);

  // Initialize services
  let db: admin.firestore.Firestore;
  let pinecone: Pinecone;
  let userId: string;

  let idToken: string;

  try {
    db = initFirebase();
    pinecone = initPinecone();
    log('\n\u2713 Firebase and Pinecone initialized', colors.green);

    // Ensure integration test user exists
    userId = await ensureTestUserExists();
    log(`\u2713 Test user ready: ${userId}`, colors.green);

    // Generate ID token for the test user
    idToken = await getTestUserIdToken(userId);
    log(`\u2713 ID token generated for test user`, colors.green);
  } catch (error: any) {
    log(`\n\u2717 Initialization failed: ${error.message}`, colors.red);
    process.exit(1);
  }

  log(`\nTest User ID: ${userId}`);

  // Set global test context for tests to use
  globalThis.testContext = {
    db,
    pinecone,
    userId,
    idToken,
    projectId: getProjectId(),
    region: getRegion(),
    pineconeIndex: getPineconeIndex(),
    waitTimeMs: WAIT_TIME_MS,
  };

  // Run all tests
  const { passed, failed, results } = await runAllTests({
    filter: args.filter,
    verbose: args.verbose,
    skipE2E: args.skipE2E,
    e2eOnly: args.e2eOnly,
  });

  // Print summary
  printSummary(results);

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run main
main().catch(error => {
  log(`\nFatal error: ${error.message}`, colors.red);
  console.error(error);
  process.exit(1);
});
