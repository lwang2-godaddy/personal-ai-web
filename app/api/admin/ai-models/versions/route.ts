import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';
import {
  AIModelsConfig,
  AIModelsConfigVersion,
} from '@/lib/models/AIModels';

const CONFIG_DOC_PATH = 'config/aiModels';
const VERSIONS_COLLECTION = 'aiModelsVersions';

/**
 * GET /api/admin/ai-models/versions
 * Get version history for AI models configuration
 *
 * Query params:
 * - limit?: number (default: 20)
 *
 * Returns:
 * - versions: AIModelsConfigVersion[]
 * - total: number
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin role
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

    const db = getAdminFirestore();
    const versionsSnapshot = await db
      .collection(VERSIONS_COLLECTION)
      .orderBy('version', 'desc')
      .limit(limit)
      .get();

    const versions: AIModelsConfigVersion[] = versionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as AIModelsConfigVersion));

    return NextResponse.json({
      versions,
      total: versions.length,
    });
  } catch (error: unknown) {
    console.error('[Admin AI Models Versions API] Error fetching versions:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch version history';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/ai-models/versions
 * Rollback to a specific version
 *
 * Body:
 * - versionId: string (e.g., "v3")
 * - changeNotes?: string
 *
 * Returns:
 * - config: AIModelsConfig (rolled back config)
 * - rolledBackFrom: number (previous version)
 * - rolledBackTo: number (target version)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin role
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const body = await request.json();
    const { versionId, changeNotes } = body;

    if (!versionId) {
      return NextResponse.json(
        { error: 'versionId is required' },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();

    // Get the target version to roll back to
    const targetVersionDoc = await db.collection(VERSIONS_COLLECTION).doc(versionId).get();
    if (!targetVersionDoc.exists) {
      return NextResponse.json(
        { error: `Version ${versionId} not found` },
        { status: 404 }
      );
    }

    const targetVersion = targetVersionDoc.data() as AIModelsConfigVersion;

    // Get current config
    const configRef = db.doc(CONFIG_DOC_PATH);
    const currentConfigDoc = await configRef.get();

    if (!currentConfigDoc.exists) {
      return NextResponse.json(
        { error: 'No current config exists to roll back from' },
        { status: 404 }
      );
    }

    const currentConfig = currentConfigDoc.data() as AIModelsConfig;
    const now = new Date().toISOString();
    const newVersion = currentConfig.version + 1;

    // Create rolled back config (copy services and settings from target, but new version/timestamp)
    const rolledBackConfig: AIModelsConfig = {
      ...targetVersion.config,
      version: newVersion,
      lastUpdated: now,
      updatedBy: user.uid,
    };

    // Save rolled back config
    await configRef.set(rolledBackConfig);

    // Create version record for the rollback
    const versionDoc: AIModelsConfigVersion = {
      id: `v${newVersion}`,
      version: newVersion,
      config: rolledBackConfig,
      changedBy: user.uid,
      changedByEmail: user.email || undefined,
      changedAt: now,
      changeNotes: changeNotes || `Rolled back to version ${targetVersion.version}`,
      previousVersion: currentConfig.version,
    };

    await db.collection(VERSIONS_COLLECTION).doc(`v${newVersion}`).set(versionDoc);

    return NextResponse.json({
      config: rolledBackConfig,
      rolledBackFrom: currentConfig.version,
      rolledBackTo: targetVersion.version,
    });
  } catch (error: unknown) {
    console.error('[Admin AI Models Versions API] Error rolling back:', error);
    const message = error instanceof Error ? error.message : 'Failed to rollback version';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
