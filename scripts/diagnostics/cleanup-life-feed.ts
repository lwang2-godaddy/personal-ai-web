#!/usr/bin/env npx tsx
/**
 * Life Feed Cleanup Script
 *
 * List and delete life feed posts for specific users on specific dates.
 *
 * Usage:
 *   npx tsx scripts/diagnostics/cleanup-life-feed.ts list <userId> [--limit N]
 *   npx tsx scripts/diagnostics/cleanup-life-feed.ts <userId> <date> [options]
 *   npx tsx scripts/diagnostics/cleanup-life-feed.ts <userId> <startDate> <endDate> [options]
 *
 * Commands:
 *   list         List recent posts for a user (see what dates have data)
 *
 * Arguments:
 *   userId       Firebase user ID (default: CzmvxsakLIWyLUlYd4IbLTRZ7Rx1)
 *   date         Single date in YYYY-MM-DD format
 *   startDate    Start of date range (inclusive)
 *   endDate      End of date range (inclusive)
 *
 * Options:
 *   --dry-run    Preview what would be deleted without actually deleting (default)
 *   --confirm    Actually delete the posts
 *   --type <t>   Only delete posts of a specific type (e.g. life_summary, milestone)
 *   --verbose    Show full post content
 *   --limit <n>  Number of posts to list (default: 20, for list command)
 *
 * Examples:
 *   # List recent posts for user (see available dates)
 *   npx tsx scripts/diagnostics/cleanup-life-feed.ts list CzmvxsakLIWyLUlYd4IbLTRZ7Rx1
 *
 *   # List more posts
 *   npx tsx scripts/diagnostics/cleanup-life-feed.ts list CzmvxsakLIWyLUlYd4IbLTRZ7Rx1 --limit 50
 *
 *   # Preview posts for default user on a specific date
 *   npx tsx scripts/diagnostics/cleanup-life-feed.ts CzmvxsakLIWyLUlYd4IbLTRZ7Rx1 2025-02-10
 *
 *   # Preview posts for a date range
 *   npx tsx scripts/diagnostics/cleanup-life-feed.ts CzmvxsakLIWyLUlYd4IbLTRZ7Rx1 2025-02-08 2025-02-10
 *
 *   # Delete posts (requires --confirm)
 *   npx tsx scripts/diagnostics/cleanup-life-feed.ts CzmvxsakLIWyLUlYd4IbLTRZ7Rx1 2025-02-10 --confirm
 *
 *   # Delete only life_summary posts
 *   npx tsx scripts/diagnostics/cleanup-life-feed.ts CzmvxsakLIWyLUlYd4IbLTRZ7Rx1 2025-02-10 --confirm --type life_summary
 *
 *   # Show full content in preview
 *   npx tsx scripts/diagnostics/cleanup-life-feed.ts CzmvxsakLIWyLUlYd4IbLTRZ7Rx1 2025-02-10 --verbose
 */

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

// Colors for terminal output
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

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message: string) {
  log(`✓ ${message}`, colors.green);
}

function logError(message: string) {
  log(`✗ ${message}`, colors.red);
}

function logInfo(message: string) {
  log(`ℹ ${message}`, colors.cyan);
}

function logWarning(message: string) {
  log(`⚠ ${message}`, colors.yellow);
}

// Initialize Firebase Admin
function initFirebase() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

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
    });
  } catch (error) {
    logError(`Error parsing FIREBASE_SERVICE_ACCOUNT_KEY: ${error}`);
    process.exit(1);
  }
}

// Parse date string to start/end of day in UTC
function parseDateRange(dateStr: string): { start: string; end: string } {
  const date = new Date(dateStr + 'T00:00:00.000Z');
  if (isNaN(date.getTime())) {
    logError(`Invalid date format: ${dateStr}. Use YYYY-MM-DD.`);
    process.exit(1);
  }
  const start = date.toISOString();
  const endDate = new Date(dateStr + 'T23:59:59.999Z');
  const end = endDate.toISOString();
  return { start, end };
}

// Truncate string for display
function truncate(str: string, maxLen: number = 80): string {
  if (!str) return '';
  return str.length > maxLen ? str.substring(0, maxLen) + '...' : str;
}

async function listRecentPosts(userId: string, limit: number = 20, verbose: boolean = false) {
  const db = admin.firestore();

  log(`\n📋 Recent Life Feed Posts`, colors.bright);
  log('─'.repeat(50));
  logInfo(`User ID: ${userId}`);
  logInfo(`Limit:   ${limit}`);
  log('');

  const snapshot = await db.collection('lifeFeedPosts')
    .where('userId', '==', userId)
    .orderBy('publishedAt', 'desc')
    .limit(limit)
    .get();

  if (snapshot.empty) {
    logWarning('No life feed posts found for this user.');
    return;
  }

  logSuccess(`Found ${snapshot.size} post(s)\n`);

  // Group by date for summary
  const byDate: Record<string, { count: number; types: Record<string, number> }> = {};

  snapshot.docs.forEach((doc, index) => {
    const data = doc.data();
    const publishedAt = data.publishedAt || 'unknown';
    const type = data.type || 'unknown';
    const emoji = data.emoji || '';
    const content = data.content || '';
    const dateKey = publishedAt.substring(0, 10); // YYYY-MM-DD

    // Accumulate by date
    if (!byDate[dateKey]) {
      byDate[dateKey] = { count: 0, types: {} };
    }
    byDate[dateKey].count++;
    byDate[dateKey].types[type] = (byDate[dateKey].types[type] || 0) + 1;

    log(`${colors.bright}[${index + 1}]${colors.reset} ${colors.cyan}${type}${colors.reset} ${emoji}`);
    log(`    ID:        ${colors.dim}${doc.id}${colors.reset}`);
    log(`    Published: ${publishedAt}`);

    if (verbose) {
      log(`    Content:   ${content}`);
    } else {
      log(`    Content:   ${truncate(content)}`);
    }
    log('');
  });

  // Show date summary
  log(`${colors.bright}Posts by date:${colors.reset}`);
  Object.entries(byDate)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .forEach(([date, info]) => {
      const typeList = Object.entries(info.types)
        .map(([t, c]) => `${t}(${c})`)
        .join(', ');
      log(`  ${colors.cyan}${date}${colors.reset}: ${info.count} post(s) — ${typeList}`);
    });

  log(`\n${colors.dim}To clean up a specific date, run:${colors.reset}`);
  log(`  npx tsx scripts/diagnostics/cleanup-life-feed.ts ${userId} <YYYY-MM-DD>`);
}

interface CleanupOptions {
  userId: string;
  startDate: string;
  endDate: string;
  dryRun: boolean;
  postType?: string;
  verbose: boolean;
}

async function findPosts(db: admin.firestore.Firestore, options: CleanupOptions) {
  const { userId, startDate, endDate, postType } = options;

  const startRange = parseDateRange(startDate);
  const endRange = parseDateRange(endDate);

  let query: admin.firestore.Query = db.collection('lifeFeedPosts')
    .where('userId', '==', userId)
    .where('publishedAt', '>=', startRange.start)
    .where('publishedAt', '<=', endRange.end)
    .orderBy('publishedAt', 'desc');

  const snapshot = await query.get();

  let docs = snapshot.docs;

  // Filter by type client-side (Firestore can't do inequality + equality on different fields easily)
  if (postType) {
    docs = docs.filter(doc => doc.data().type === postType);
  }

  return docs;
}

async function cleanup(options: CleanupOptions) {
  const db = admin.firestore();
  const { userId, startDate, endDate, dryRun, postType, verbose } = options;

  const dateDisplay = startDate === endDate
    ? startDate
    : `${startDate} to ${endDate}`;

  log(`\n🧹 Life Feed Cleanup`, colors.bright);
  log('─'.repeat(50));
  logInfo(`User ID:    ${userId}`);
  logInfo(`Date range: ${dateDisplay}`);
  if (postType) logInfo(`Post type:  ${postType}`);
  logInfo(`Mode:       ${dryRun ? 'DRY RUN (preview only)' : 'DELETE (will remove posts)'}`);
  log('');

  // Find matching posts
  const docs = await findPosts(db, options);

  if (docs.length === 0) {
    logWarning('No matching life feed posts found.');
    return;
  }

  logSuccess(`Found ${docs.length} post(s)\n`);

  // Display posts
  docs.forEach((doc, index) => {
    const data = doc.data();
    const publishedAt = data.publishedAt || 'unknown';
    const type = data.type || 'unknown';
    const emoji = data.emoji || '';
    const content = data.content || '';
    const confidence = data.confidence !== undefined ? `${(data.confidence * 100).toFixed(0)}%` : 'N/A';

    log(`${colors.bright}[${index + 1}]${colors.reset} ${colors.cyan}${type}${colors.reset} ${emoji}`);
    log(`    ID:          ${colors.dim}${doc.id}${colors.reset}`);
    log(`    Published:   ${publishedAt}`);
    log(`    Confidence:  ${confidence}`);

    if (verbose) {
      log(`    Content:     ${content}`);
      if (data.hashtags?.length) {
        log(`    Hashtags:    ${data.hashtags.join(', ')}`);
      }
      if (data.dateRange) {
        log(`    Date Range:  ${data.dateRange.start} → ${data.dateRange.end}`);
      }
      if (data.provenance?.service) {
        log(`    Generated by: ${data.provenance.service} (${data.provenance.model || 'unknown model'})`);
      }
    } else {
      log(`    Content:     ${truncate(content)}`);
    }
    log('');
  });

  // Summary
  const typeCounts: Record<string, number> = {};
  docs.forEach(doc => {
    const type = doc.data().type || 'unknown';
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  });

  log(`${colors.bright}Summary by type:${colors.reset}`);
  Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      log(`  ${colors.cyan}${type}${colors.reset}: ${count}`);
    });
  log('');

  if (dryRun) {
    logWarning(`DRY RUN: No posts were deleted.`);
    logInfo(`To delete these posts, run again with --confirm`);
    return;
  }

  // Delete posts
  log(`${colors.red}Deleting ${docs.length} post(s)...${colors.reset}`);

  const batch = db.batch();
  docs.forEach(doc => {
    batch.delete(doc.ref);
  });

  await batch.commit();

  logSuccess(`Successfully deleted ${docs.length} life feed post(s).`);
}

function printUsage() {
  console.log(`
${colors.bright}Life Feed Cleanup Script${colors.reset}

${colors.cyan}Usage:${colors.reset}
  npx tsx scripts/diagnostics/cleanup-life-feed.ts list <userId> [--limit N] [--verbose]
  npx tsx scripts/diagnostics/cleanup-life-feed.ts <userId> <date> [options]
  npx tsx scripts/diagnostics/cleanup-life-feed.ts <userId> <startDate> <endDate> [options]

${colors.cyan}Commands:${colors.reset}
  ${colors.bright}list${colors.reset}         List recent posts for a user (see what dates have data)

${colors.cyan}Arguments:${colors.reset}
  ${colors.bright}userId${colors.reset}       Firebase user ID
  ${colors.bright}date${colors.reset}         Single date (YYYY-MM-DD)
  ${colors.bright}startDate${colors.reset}    Start of date range (YYYY-MM-DD, inclusive)
  ${colors.bright}endDate${colors.reset}      End of date range (YYYY-MM-DD, inclusive)

${colors.cyan}Options:${colors.reset}
  ${colors.bright}--dry-run${colors.reset}    Preview what would be deleted (default behavior)
  ${colors.bright}--confirm${colors.reset}    Actually delete the posts
  ${colors.bright}--type${colors.reset} <t>   Only delete posts of a specific type
  ${colors.bright}--verbose${colors.reset}    Show full post content
  ${colors.bright}--limit${colors.reset} <n>  Number of posts to list (default: 20)

${colors.cyan}Post types:${colors.reset}
  life_summary, milestone, pattern_prediction, reflective_insight,
  memory_highlight, streak_achievement, comparison, seasonal_reflection,
  activity_pattern, health_alert, category_insight

${colors.cyan}Examples:${colors.reset}
  # List recent posts (see what dates have data)
  npx tsx scripts/diagnostics/cleanup-life-feed.ts list CzmvxsakLIWyLUlYd4IbLTRZ7Rx1

  # List more posts
  npx tsx scripts/diagnostics/cleanup-life-feed.ts list CzmvxsakLIWyLUlYd4IbLTRZ7Rx1 --limit 50

  # Preview posts for a specific date
  npx tsx scripts/diagnostics/cleanup-life-feed.ts CzmvxsakLIWyLUlYd4IbLTRZ7Rx1 2025-02-10

  # Preview a date range
  npx tsx scripts/diagnostics/cleanup-life-feed.ts CzmvxsakLIWyLUlYd4IbLTRZ7Rx1 2025-02-08 2025-02-10

  # Delete posts for a date
  npx tsx scripts/diagnostics/cleanup-life-feed.ts CzmvxsakLIWyLUlYd4IbLTRZ7Rx1 2025-02-10 --confirm

  # Delete only life_summary posts
  npx tsx scripts/diagnostics/cleanup-life-feed.ts CzmvxsakLIWyLUlYd4IbLTRZ7Rx1 2025-02-10 --confirm --type life_summary

  # Verbose preview
  npx tsx scripts/diagnostics/cleanup-life-feed.ts CzmvxsakLIWyLUlYd4IbLTRZ7Rx1 2025-02-10 --verbose
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    printUsage();
    process.exit(0);
  }

  // Parse flags
  const verbose = args.includes('--verbose');
  const limitIndex = args.indexOf('--limit');
  const limit = limitIndex !== -1 && args[limitIndex + 1] ? parseInt(args[limitIndex + 1]) : 20;

  // Handle "list" command
  if (args[0] === 'list') {
    const userId = args.filter(a => !a.startsWith('--') && a !== 'list')[0];
    if (!userId) {
      logError('userId is required for list command.');
      logInfo('Usage: npx tsx scripts/diagnostics/cleanup-life-feed.ts list <userId> [--limit N]');
      process.exit(1);
    }

    initFirebase();
    await listRecentPosts(userId, limit, verbose);
    process.exit(0);
  }

  // Parse positional args (skip flags and flag values)
  const flagValueIndices = new Set<number>();
  args.forEach((a, i) => {
    if (a === '--type' || a === '--limit') {
      flagValueIndices.add(i + 1);
    }
  });
  const positionalArgs = args.filter((a, i) => !a.startsWith('--') && !flagValueIndices.has(i));

  if (positionalArgs.length < 2) {
    logError('At least userId and one date are required.');
    logInfo('Tip: Use "list" command first to see what dates have data:');
    logInfo('  npx tsx scripts/diagnostics/cleanup-life-feed.ts list <userId>');
    printUsage();
    process.exit(1);
  }

  const userId = positionalArgs[0];

  // Determine if second positional arg is a date or date range
  const firstDate = positionalArgs[1];
  let secondDate = positionalArgs[1];

  // Check if there's a second date (date range)
  if (positionalArgs.length >= 3) {
    const maybeDate = positionalArgs[2];
    if (/^\d{4}-\d{2}-\d{2}$/.test(maybeDate)) {
      secondDate = maybeDate;
    }
  }

  // Parse flags
  const confirm = args.includes('--confirm');
  const typeIndex = args.indexOf('--type');
  const postType = typeIndex !== -1 && args[typeIndex + 1] ? args[typeIndex + 1] : undefined;

  initFirebase();

  await cleanup({
    userId,
    startDate: firstDate,
    endDate: secondDate,
    dryRun: !confirm,
    postType,
    verbose,
  });

  process.exit(0);
}

main().catch(error => {
  logError(`Fatal error: ${error.message}`);
  process.exit(1);
});
