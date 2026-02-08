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
 *
 * Prerequisites:
 *   - Firebase Admin SDK credentials (GOOGLE_APPLICATION_CREDENTIALS or service account)
 *   - Deployed Cloud Functions
 *   - Environment variables in .env.local
 */

import * as admin from 'firebase-admin';
import { Pinecone } from '@pinecone-database/pinecone';
import { initFirebase, ensureTestUserExists, getProjectId, getRegion } from './lib/firebase-setup';
import { initPinecone, getPineconeIndex } from './lib/pinecone-setup';
import { runAllTests, parseArgs } from './lib/test-runner';
import { log, colors, logSection, printSummary } from './lib/reporter';

// Declare global test context type
declare global {
  var testContext: {
    db: admin.firestore.Firestore;
    pinecone: Pinecone;
    userId: string;
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

  try {
    db = initFirebase();
    pinecone = initPinecone();
    log('\n\u2713 Firebase and Pinecone initialized', colors.green);

    // Ensure integration test user exists
    userId = await ensureTestUserExists();
    log(`\u2713 Test user ready: ${userId}`, colors.green);
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
    projectId: getProjectId(),
    region: getRegion(),
    pineconeIndex: getPineconeIndex(),
    waitTimeMs: WAIT_TIME_MS,
  };

  // Run all tests
  const { passed, failed, results } = await runAllTests({
    filter: args.filter,
    verbose: args.verbose,
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
