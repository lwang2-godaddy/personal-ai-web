import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';
import { DataSelectionInfo } from '@/lib/models/Prompt';

export const dynamic = 'force-dynamic';

/**
 * Algorithm Configuration Document Structure
 * Stored in: config/lifeFeedAlgorithm
 */
export interface LifeFeedAlgorithmConfig {
  // Data fetching
  dataTimeRangeDays: number;           // How far back to fetch data (default: 7)

  // Item selection
  maxVoiceNotes: number;               // Max voice notes to select (default: 5)
  maxPhotos: number;                   // Max photos to select (default: 5)
  maxDiaryEntries: number;             // Max diary entries to select (default: 5)

  // Scoring factors (max points)
  recencyMaxPoints: number;            // Points for recency (default: 40)
  recencyDecayPerDay: number;          // Points lost per day old (default: 5)
  contentLengthMaxPoints: number;      // Points for content length (default: 30)
  contentLengthCharsPerPoint: number;  // Characters per point (default: 10)
  sentimentMaxPoints: number;          // Points for sentiment strength (default: 20)
  tagsMaxPoints: number;               // Points for tags (default: 10)
  tagsPointsPerTag: number;            // Points per tag (default: 2)

  // Summarization
  summarizationWordThreshold: number;  // Words above which to summarize (default: 150)

  // Post generation
  confidenceThreshold: number;         // Min confidence for posts (default: 0.5)
  maxPostsPerRun: number;              // Max posts per generation run (default: 3)

  // Metadata
  lastUpdated: string;
  lastUpdatedBy: string;
}

/**
 * Default algorithm configuration
 */
const DEFAULT_CONFIG: LifeFeedAlgorithmConfig = {
  dataTimeRangeDays: 7,
  maxVoiceNotes: 5,
  maxPhotos: 5,
  maxDiaryEntries: 5,
  recencyMaxPoints: 40,
  recencyDecayPerDay: 5,
  contentLengthMaxPoints: 30,
  contentLengthCharsPerPoint: 10,
  sentimentMaxPoints: 20,
  tagsMaxPoints: 10,
  tagsPointsPerTag: 2,
  summarizationWordThreshold: 150,
  confidenceThreshold: 0.5,
  maxPostsPerRun: 3,
  lastUpdated: new Date().toISOString(),
  lastUpdatedBy: 'system',
};

/**
 * GET /api/admin/prompts/algorithm
 * Get the current algorithm configuration
 */
export async function GET(request: NextRequest) {
  const { user, response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    const db = getAdminFirestore();
    const docRef = db.collection('config').doc('lifeFeedAlgorithm');
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      // Return default config if not set
      return NextResponse.json({
        config: DEFAULT_CONFIG,
        isDefault: true,
      });
    }

    const config = docSnap.data() as LifeFeedAlgorithmConfig;
    return NextResponse.json({
      config,
      isDefault: false,
    });
  } catch (error: unknown) {
    console.error('Failed to fetch algorithm config:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch algorithm config';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/prompts/algorithm
 * Update the algorithm configuration
 */
export async function PATCH(request: NextRequest) {
  const { user, response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    const body = await request.json();
    const updates = body.updates as Partial<LifeFeedAlgorithmConfig>;

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json({ error: 'Updates object required' }, { status: 400 });
    }

    // Validate numeric fields are positive
    const numericFields = [
      'dataTimeRangeDays', 'maxVoiceNotes', 'maxPhotos', 'maxDiaryEntries',
      'recencyMaxPoints', 'recencyDecayPerDay', 'contentLengthMaxPoints',
      'contentLengthCharsPerPoint', 'sentimentMaxPoints', 'tagsMaxPoints',
      'tagsPointsPerTag', 'summarizationWordThreshold', 'maxPostsPerRun',
    ];

    for (const field of numericFields) {
      if (field in updates) {
        const value = (updates as Record<string, unknown>)[field];
        if (typeof value !== 'number' || value < 0) {
          return NextResponse.json({
            error: `${field} must be a non-negative number`
          }, { status: 400 });
        }
      }
    }

    // Validate confidence threshold (0-1)
    if ('confidenceThreshold' in updates) {
      if (typeof updates.confidenceThreshold !== 'number' ||
          updates.confidenceThreshold < 0 || updates.confidenceThreshold > 1) {
        return NextResponse.json({
          error: 'confidenceThreshold must be between 0 and 1'
        }, { status: 400 });
      }
    }

    const db = getAdminFirestore();
    const docRef = db.collection('config').doc('lifeFeedAlgorithm');

    // Get current config or use defaults
    const docSnap = await docRef.get();
    const currentConfig = docSnap.exists
      ? docSnap.data() as LifeFeedAlgorithmConfig
      : DEFAULT_CONFIG;

    // Merge updates with current config
    const newConfig: LifeFeedAlgorithmConfig = {
      ...currentConfig,
      ...updates,
      lastUpdated: new Date().toISOString(),
      lastUpdatedBy: user.email || user.uid,
    };

    await docRef.set(newConfig);

    return NextResponse.json({
      success: true,
      config: newConfig,
    });
  } catch (error: unknown) {
    console.error('Failed to update algorithm config:', error);
    const message = error instanceof Error ? error.message : 'Failed to update algorithm config';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/admin/prompts/algorithm/reset
 * Reset to default configuration
 */
export async function POST(request: NextRequest) {
  const { user, response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    const body = await request.json();

    if (body.action !== 'reset') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const db = getAdminFirestore();
    const docRef = db.collection('config').doc('lifeFeedAlgorithm');

    const resetConfig: LifeFeedAlgorithmConfig = {
      ...DEFAULT_CONFIG,
      lastUpdated: new Date().toISOString(),
      lastUpdatedBy: user.email || user.uid,
    };

    await docRef.set(resetConfig);

    return NextResponse.json({
      success: true,
      config: resetConfig,
    });
  } catch (error: unknown) {
    console.error('Failed to reset algorithm config:', error);
    const message = error instanceof Error ? error.message : 'Failed to reset algorithm config';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
