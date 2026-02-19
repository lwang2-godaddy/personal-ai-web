import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';

const FEATURE_FLAGS_DOC_PATH = 'config/featureFlags';

/**
 * Default feature flags
 * These are used when the Firestore document doesn't exist yet
 */
const DEFAULT_FEATURE_FLAGS: Record<string, boolean> = {
  morningBriefing: false,
  weeklyReport: false,
  predictions: false,
  conversationThreads: false,
  quickCapture: false,
  dataExportPolish: true,
  hapticFeedback: true,
  emojiReactions: true,
  premiumPersonalities: true,
  askAboutThis: true,
  followUpQuestions: true,
  skeletonLoading: true,
  quickThoughts: true,
  photoMemories: true,
  voiceConversation: true,
  lifeFeed: true,
  memoryBuilder: true,
  challenges: true,
  engagement: true,
  checkInSuggestions: true,
  dailySummary: false,
  homeWorkCheckIn: false,
  autoCheckInSmart: true,
};

/**
 * GET /api/admin/features
 * Read feature flags from Firestore config/featureFlags
 *
 * Returns:
 * - flags: Record<string, boolean>
 * - isDefault: boolean (true if no Firestore doc exists)
 * - lastUpdated: string | null
 * - updatedBy: string | null
 */
export async function GET(request: NextRequest) {
  try {
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const db = getAdminFirestore();
    const docRef = db.doc(FEATURE_FLAGS_DOC_PATH);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({
        flags: DEFAULT_FEATURE_FLAGS,
        isDefault: true,
        lastUpdated: null,
        updatedBy: null,
      });
    }

    const data = docSnap.data()!;
    const { lastUpdated, updatedBy, ...flags } = data;

    return NextResponse.json({
      flags,
      isDefault: false,
      lastUpdated: lastUpdated || null,
      updatedBy: updatedBy || null,
    });
  } catch (error: unknown) {
    console.error('[Admin Features API] Error fetching feature flags:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to fetch feature flags';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PUT /api/admin/features
 * Update feature flags in Firestore config/featureFlags
 *
 * Body:
 * - flags: Record<string, boolean> - The feature flags to set
 *
 * Returns:
 * - flags: Record<string, boolean>
 * - lastUpdated: string
 * - updatedBy: string
 */
export async function PUT(request: NextRequest) {
  try {
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const body = await request.json();
    const { flags } = body;

    if (!flags || typeof flags !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body. Expected { flags: Record<string, boolean> }' },
        { status: 400 }
      );
    }

    // Validate that all values are booleans
    for (const [key, value] of Object.entries(flags)) {
      if (typeof value !== 'boolean') {
        return NextResponse.json(
          { error: `Invalid value for flag "${key}": expected boolean, got ${typeof value}` },
          { status: 400 }
        );
      }
    }

    const now = new Date().toISOString();
    const db = getAdminFirestore();
    const docRef = db.doc(FEATURE_FLAGS_DOC_PATH);

    const dataToSave = {
      ...flags,
      lastUpdated: now,
      updatedBy: user.uid,
    };

    await docRef.set(dataToSave, { merge: false });

    return NextResponse.json({
      flags,
      lastUpdated: now,
      updatedBy: user.uid,
    });
  } catch (error: unknown) {
    console.error('[Admin Features API] Error updating feature flags:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to update feature flags';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
