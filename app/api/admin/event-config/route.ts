import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';
import {
  EventExtractionConfig,
  EventExtractionVersion,
  EventExtractionSettings,
  getDefaultEventExtractionConfig,
  validateEventExtractionSettings,
} from '@/lib/models/EventExtractionConfig';

const CONFIG_DOC_PATH = 'config/eventExtraction';
const VERSIONS_COLLECTION = 'eventExtractionVersions';

/**
 * GET /api/admin/event-config
 * Get current event extraction configuration
 *
 * Returns:
 * - config: EventExtractionConfig (or default if not initialized)
 * - isDefault: boolean (true if returning hardcoded defaults)
 */
export async function GET(request: NextRequest) {
  try {
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const db = getAdminFirestore();
    const configDoc = await db.doc(CONFIG_DOC_PATH).get();

    if (!configDoc.exists) {
      const defaultConfig = getDefaultEventExtractionConfig();
      return NextResponse.json({
        config: defaultConfig,
        isDefault: true,
      });
    }

    const config = configDoc.data() as EventExtractionConfig;
    return NextResponse.json({
      config,
      isDefault: false,
    });
  } catch (error: unknown) {
    console.error('[Admin EventConfig API] Error fetching config:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to fetch event extraction config';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/admin/event-config
 * Initialize event extraction configuration with defaults
 * Only works if config doesn't exist yet
 *
 * Returns:
 * - config: EventExtractionConfig
 */
export async function POST(request: NextRequest) {
  try {
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const db = getAdminFirestore();
    const configRef = db.doc(CONFIG_DOC_PATH);
    const configDoc = await configRef.get();

    if (configDoc.exists) {
      return NextResponse.json(
        { error: 'Event extraction config already exists. Use PATCH to update.' },
        { status: 409 }
      );
    }

    const defaultConfig = getDefaultEventExtractionConfig();
    const now = new Date().toISOString();
    const config: EventExtractionConfig = {
      ...defaultConfig,
      version: 1,
      lastUpdated: now,
      updatedBy: user.uid,
    };

    await configRef.set(config);

    const versionDoc: EventExtractionVersion = {
      id: 'v1',
      version: 1,
      config,
      changedBy: user.uid,
      changedByEmail: user.email || undefined,
      changedAt: now,
      changeNotes: 'Initial configuration',
    };

    await db.collection(VERSIONS_COLLECTION).doc('v1').set(versionDoc);

    return NextResponse.json({ config }, { status: 201 });
  } catch (error: unknown) {
    console.error('[Admin EventConfig API] Error initializing config:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to initialize event extraction config';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/event-config
 * Update event extraction configuration
 *
 * Body:
 * - settings?: Partial<EventExtractionSettings> - Settings updates
 * - enableDynamicConfig?: boolean - Kill switch
 * - changeNotes?: string - Description of changes
 *
 * Returns:
 * - config: EventExtractionConfig (updated)
 */
export async function PATCH(request: NextRequest) {
  try {
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const body = await request.json();
    const { settings, enableDynamicConfig, changeNotes } = body;

    const db = getAdminFirestore();
    const configRef = db.doc(CONFIG_DOC_PATH);
    const configDoc = await configRef.get();

    if (!configDoc.exists) {
      return NextResponse.json(
        { error: 'Event extraction config not initialized. Use POST to initialize first.' },
        { status: 404 }
      );
    }

    const currentConfig = configDoc.data() as EventExtractionConfig;
    const now = new Date().toISOString();
    const newVersion = currentConfig.version + 1;

    const updatedConfig: EventExtractionConfig = {
      ...currentConfig,
      version: newVersion,
      lastUpdated: now,
      updatedBy: user.uid,
      changeNotes: changeNotes || undefined,
    };

    // Update kill switch if provided
    if (typeof enableDynamicConfig === 'boolean') {
      updatedConfig.enableDynamicConfig = enableDynamicConfig;
    }

    // Update settings if provided
    if (settings) {
      const validation = validateEventExtractionSettings(settings);
      if (!validation.isValid) {
        return NextResponse.json(
          { error: `Validation failed: ${validation.errors.join(', ')}` },
          { status: 400 }
        );
      }

      updatedConfig.settings = {
        ...currentConfig.settings,
        ...mergeSettings(currentConfig.settings, settings),
      };
    }

    await configRef.set(updatedConfig);

    const versionDoc: EventExtractionVersion = {
      id: `v${newVersion}`,
      version: newVersion,
      config: updatedConfig,
      changedBy: user.uid,
      changedByEmail: user.email || undefined,
      changedAt: now,
      changeNotes: changeNotes || undefined,
      previousVersion: currentConfig.version,
    };

    await db.collection(VERSIONS_COLLECTION).doc(`v${newVersion}`).set(versionDoc);

    return NextResponse.json({ config: updatedConfig });
  } catch (error: unknown) {
    console.error('[Admin EventConfig API] Error updating config:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to update event extraction config';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Merge settings updates with current settings
 * Only updates fields that are provided and valid
 */
function mergeSettings(
  current: EventExtractionSettings,
  updates: Partial<EventExtractionSettings>
): EventExtractionSettings {
  const merged: EventExtractionSettings = { ...current };

  // OpenAI settings
  if (typeof updates.model === 'string' && updates.model.trim()) {
    merged.model = updates.model.trim();
  }
  if (typeof updates.temperature === 'number') {
    merged.temperature = updates.temperature;
  }
  if (typeof updates.maxTokens === 'number') {
    merged.maxTokens = updates.maxTokens;
  }

  // Time handling
  if (typeof updates.timezone === 'string' && updates.timezone.trim()) {
    merged.timezone = updates.timezone.trim();
  }

  // Toast display
  if (typeof updates.toastEnabled === 'boolean') {
    merged.toastEnabled = updates.toastEnabled;
  }
  if (typeof updates.toastLookbackHours === 'number') {
    merged.toastLookbackHours = updates.toastLookbackHours;
  }
  if (typeof updates.toastDisplayLimit === 'number') {
    merged.toastDisplayLimit = updates.toastDisplayLimit;
  }

  // Confidence filtering
  if (typeof updates.confidenceThreshold === 'number') {
    merged.confidenceThreshold = updates.confidenceThreshold;
  }

  // Event types
  if (Array.isArray(updates.enabledEventTypes)) {
    merged.enabledEventTypes = updates.enabledEventTypes;
  }

  return merged;
}
