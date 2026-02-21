/**
 * Release Notes Generator
 *
 * Generates AI-polished release notes from git commit history
 * and stores them in Firestore.
 *
 * Usage:
 *   npx tsx scripts/release/generate-release-notes.ts \
 *     --version 1.1.0 \
 *     --build-number 2 \
 *     --git-dir /path/to/PersonalAIApp \
 *     [--since-tag v1.0.0 | --since 2026-02-17T22:49:00-08:00]
 */

import { execSync } from 'child_process';
import * as admin from 'firebase-admin';
import { config } from 'dotenv';
import { resolve } from 'path';
import OpenAI from 'openai';

// Load environment variables
config({ path: resolve(__dirname, '../../.env.local') });

// ============================================================================
// Argument Parsing
// ============================================================================

interface Args {
  version: string;
  buildNumber: string;
  gitDir: string;
  sinceTag?: string;
  since?: string;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const parsed: Partial<Args> = {};

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--version':
        parsed.version = args[++i];
        break;
      case '--build-number':
        parsed.buildNumber = args[++i];
        break;
      case '--git-dir':
        parsed.gitDir = args[++i];
        break;
      case '--since-tag':
        parsed.sinceTag = args[++i];
        break;
      case '--since':
        parsed.since = args[++i];
        break;
      default:
        console.error(`Unknown argument: ${args[i]}`);
        process.exit(1);
    }
  }

  if (!parsed.version) {
    console.error('Missing required argument: --version');
    process.exit(1);
  }

  if (!parsed.buildNumber) {
    parsed.buildNumber = '1';
  }

  if (!parsed.gitDir) {
    // Default to PersonalAIApp relative to this script
    parsed.gitDir = resolve(__dirname, '../../../PersonalAIApp');
  }

  return parsed as Args;
}

// ============================================================================
// Git Operations
// ============================================================================

function getCommits(gitDir: string, sinceTag?: string, sinceDate?: string): string[] {
  let range = '';

  if (sinceTag) {
    range = `${sinceTag}..HEAD`;
  } else if (sinceDate) {
    // Use --after for date-based filtering
    const cmd = `git -C "${gitDir}" log --oneline --no-merges --after="${sinceDate}"`;
    try {
      const output = execSync(cmd, { encoding: 'utf-8' }).trim();
      return output ? output.split('\n') : [];
    } catch {
      console.warn('Failed to get commits by date, returning empty list');
      return [];
    }
  }

  const cmd = `git -C "${gitDir}" log --oneline --no-merges ${range}`;
  try {
    const output = execSync(cmd, { encoding: 'utf-8' }).trim();
    return output ? output.split('\n') : [];
  } catch {
    console.warn('Failed to get commits, returning empty list');
    return [];
  }
}

interface GroupedCommits {
  features: string[];
  fixes: string[];
  improvements: string[];
  chores: string[];
  other: string[];
}

function groupCommits(commits: string[]): GroupedCommits {
  const grouped: GroupedCommits = {
    features: [],
    fixes: [],
    improvements: [],
    chores: [],
    other: [],
  };

  for (const commit of commits) {
    // Remove the short hash prefix (first word)
    const message = commit.replace(/^[a-f0-9]+ /, '');
    const lower = message.toLowerCase();

    if (lower.startsWith('feat') || lower.includes('add ') || lower.includes('implement') || lower.includes('new ')) {
      grouped.features.push(message);
    } else if (lower.startsWith('fix') || lower.includes('bug') || lower.includes('patch')) {
      grouped.fixes.push(message);
    } else if (lower.startsWith('refactor') || lower.startsWith('improve') || lower.startsWith('perf') || lower.startsWith('update') || lower.startsWith('enhance')) {
      grouped.improvements.push(message);
    } else if (lower.startsWith('chore') || lower.startsWith('ci') || lower.startsWith('build') || lower.startsWith('docs') || lower.startsWith('style') || lower.startsWith('test')) {
      grouped.chores.push(message);
    } else {
      grouped.other.push(message);
    }
  }

  return grouped;
}

// ============================================================================
// AI Release Notes Generation
// ============================================================================

async function generatePolishedNotes(grouped: GroupedCommits, version: string): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.warn('No OpenAI API key found, using raw commit summary instead');
    return formatRawNotes(grouped);
  }

  const openai = new OpenAI({ apiKey });

  const commitSummary = [
    grouped.features.length > 0 ? `Features:\n${grouped.features.map(c => `- ${c}`).join('\n')}` : '',
    grouped.fixes.length > 0 ? `Bug Fixes:\n${grouped.fixes.map(c => `- ${c}`).join('\n')}` : '',
    grouped.improvements.length > 0 ? `Improvements:\n${grouped.improvements.map(c => `- ${c}`).join('\n')}` : '',
    grouped.chores.length > 0 ? `Maintenance:\n${grouped.chores.map(c => `- ${c}`).join('\n')}` : '',
    grouped.other.length > 0 ? `Other:\n${grouped.other.map(c => `- ${c}`).join('\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  if (!commitSummary.trim()) {
    return 'Bug fixes and performance improvements.';
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a mobile app release notes writer for SirCharge, a personal AI assistant app. Generate concise, user-friendly App Store release notes from developer commit messages.

Rules:
- Write in a friendly, professional tone
- Focus on user-facing changes (skip internal/technical details)
- Use bullet points
- Keep it concise (max 300 words)
- Start with a brief summary sentence
- Group into "What's New", "Improvements", and "Bug Fixes" sections (only include sections with content)
- Do NOT include version numbers or dates in the notes
- Write for end users, not developers`,
        },
        {
          role: 'user',
          content: `Generate App Store release notes for version ${version} from these developer commits:\n\n${commitSummary}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    return response.choices[0]?.message?.content?.trim() || formatRawNotes(grouped);
  } catch (error) {
    console.warn('Failed to generate AI notes, using raw summary:', error);
    return formatRawNotes(grouped);
  }
}

function formatRawNotes(grouped: GroupedCommits): string {
  const sections: string[] = [];

  if (grouped.features.length > 0) {
    sections.push(`What's New:\n${grouped.features.map(c => `- ${c}`).join('\n')}`);
  }
  if (grouped.improvements.length > 0) {
    sections.push(`Improvements:\n${grouped.improvements.map(c => `- ${c}`).join('\n')}`);
  }
  if (grouped.fixes.length > 0) {
    sections.push(`Bug Fixes:\n${grouped.fixes.map(c => `- ${c}`).join('\n')}`);
  }

  return sections.join('\n\n') || 'Bug fixes and performance improvements.';
}

// ============================================================================
// Firestore Storage
// ============================================================================

function initFirebaseAdmin(): admin.firestore.Firestore {
  if (admin.apps.length > 0) {
    return admin.firestore();
  }

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (serviceAccountKey) {
    const serviceAccount = JSON.parse(serviceAccountKey);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
  } else {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
    if (!projectId) {
      throw new Error('Missing Firebase project ID');
    }
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId,
    });
  }

  return admin.firestore();
}

interface ReleaseDocument {
  version: string;
  buildNumber: string;
  releaseDate: admin.firestore.Timestamp;
  status: 'submitted' | 'in-review' | 'approved' | 'released' | 'rejected';
  releaseNotes: string;
  rawCommits: string[];
  commitRange: { from: string; to: string };
  previousVersion: string;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

async function saveToFirestore(
  db: admin.firestore.Firestore,
  version: string,
  buildNumber: string,
  releaseNotes: string,
  rawCommits: string[],
  previousTag: string
): Promise<void> {
  const docId = `v${version}`;
  const now = admin.firestore.Timestamp.now();

  const data: ReleaseDocument = {
    version,
    buildNumber,
    releaseDate: now,
    status: 'submitted',
    releaseNotes,
    rawCommits,
    commitRange: {
      from: previousTag || 'baseline-2026-02-17',
      to: `v${version}`,
    },
    previousVersion: previousTag || '',
    createdAt: now,
    updatedAt: now,
  };

  await db.collection('appStoreReleases').doc(docId).set(data, { merge: true });
  console.log(`  Saved release document: appStoreReleases/${docId}`);
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = parseArgs();

  console.log('');
  console.log('  Release Notes Generator');
  console.log('  =======================');
  console.log(`  Version: ${args.version}`);
  console.log(`  Build: ${args.buildNumber}`);
  console.log(`  Git dir: ${args.gitDir}`);
  console.log('');

  // Step 1: Get commits
  console.log('  [1/4] Extracting commits...');
  const commits = getCommits(args.gitDir, args.sinceTag, args.since);
  console.log(`  Found ${commits.length} commits`);

  if (commits.length === 0) {
    console.log('  No commits found. Creating minimal release notes.');
  }

  // Step 2: Group commits
  console.log('  [2/4] Grouping commits...');
  const grouped = groupCommits(commits);
  console.log(`  Features: ${grouped.features.length}, Fixes: ${grouped.fixes.length}, Improvements: ${grouped.improvements.length}, Other: ${grouped.chores.length + grouped.other.length}`);

  // Step 3: Generate AI-polished notes
  console.log('  [3/4] Generating AI-polished release notes...');
  const releaseNotes = await generatePolishedNotes(grouped, args.version);
  console.log('');
  console.log('  --- Release Notes ---');
  console.log(releaseNotes);
  console.log('  --- End Release Notes ---');
  console.log('');

  // Step 4: Save to Firestore
  console.log('  [4/4] Saving to Firestore...');
  try {
    const db = initFirebaseAdmin();
    await saveToFirestore(
      db,
      args.version,
      args.buildNumber,
      releaseNotes,
      commits,
      args.sinceTag || ''
    );
    console.log('  Done! View at: https://www.sircharge.ai/admin/app-store-releases');
  } catch (error) {
    console.error('  Failed to save to Firestore:', error);
    console.log('  Release notes were printed above but not saved.');
  }

  console.log('');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
