import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';
import {
  AppSettingsConfig,
  AppSettingsVersion,
  AppSettings,
  getDefaultAppSettingsConfig,
  validateAppSettings,
} from '@/lib/models/AppSettings';

const CONFIG_DOC_PATH = 'config/appSettings';
const VERSIONS_COLLECTION = 'appSettingsVersions';

/**
 * GET /api/admin/app-settings
 * Get current app settings configuration
 *
 * Returns:
 * - config: AppSettingsConfig (or default if not initialized)
 * - isDefault: boolean (true if returning hardcoded defaults)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin role
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const db = getAdminFirestore();
    const configDoc = await db.doc(CONFIG_DOC_PATH).get();

    if (!configDoc.exists) {
      // Return default config if not initialized
      const defaultConfig = getDefaultAppSettingsConfig();
      return NextResponse.json({
        config: defaultConfig,
        isDefault: true,
      });
    }

    const config = configDoc.data() as AppSettingsConfig;
    return NextResponse.json({
      config,
      isDefault: false,
    });
  } catch (error: unknown) {
    console.error('[Admin AppSettings API] Error fetching config:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to fetch app settings config';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/admin/app-settings
 * Initialize app settings configuration with defaults
 * Only works if config doesn't exist yet
 *
 * Returns:
 * - config: AppSettingsConfig
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin role
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const db = getAdminFirestore();
    const configRef = db.doc(CONFIG_DOC_PATH);
    const configDoc = await configRef.get();

    if (configDoc.exists) {
      return NextResponse.json(
        { error: 'App settings config already exists. Use PATCH to update.' },
        { status: 409 }
      );
    }

    // Initialize with defaults
    const defaultConfig = getDefaultAppSettingsConfig();
    const now = new Date().toISOString();
    const config: AppSettingsConfig = {
      ...defaultConfig,
      version: 1,
      lastUpdated: now,
      updatedBy: user.uid,
    };

    await configRef.set(config);

    // Create initial version record
    const versionDoc: AppSettingsVersion = {
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
    console.error('[Admin AppSettings API] Error initializing config:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to initialize app settings config';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/app-settings
 * Update app settings configuration
 *
 * Body:
 * - settings?: Partial<AppSettings> - Settings updates
 * - enableDynamicConfig?: boolean - Kill switch
 * - changeNotes?: string - Description of changes
 *
 * Returns:
 * - config: AppSettingsConfig (updated)
 */
export async function PATCH(request: NextRequest) {
  try {
    // Verify admin role
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const body = await request.json();
    const { settings, enableDynamicConfig, changeNotes } = body;

    const db = getAdminFirestore();
    const configRef = db.doc(CONFIG_DOC_PATH);
    const configDoc = await configRef.get();

    if (!configDoc.exists) {
      return NextResponse.json(
        { error: 'App settings config not initialized. Use POST to initialize first.' },
        { status: 404 }
      );
    }

    const currentConfig = configDoc.data() as AppSettingsConfig;
    const now = new Date().toISOString();
    const newVersion = currentConfig.version + 1;

    // Build updated config
    const updatedConfig: AppSettingsConfig = {
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
      // Validate settings updates
      const validation = validateAppSettings(settings);
      if (!validation.isValid) {
        return NextResponse.json(
          { error: `Validation failed: ${validation.errors.join(', ')}` },
          { status: 400 }
        );
      }

      // Merge settings
      updatedConfig.settings = {
        ...currentConfig.settings,
        ...mergeSettings(currentConfig.settings, settings),
      };
    }

    // Save updated config
    await configRef.set(updatedConfig);

    // Create version record for audit trail
    const versionDoc: AppSettingsVersion = {
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
    console.error('[Admin AppSettings API] Error updating config:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to update app settings config';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Merge settings updates with current settings
 * Only updates fields that are provided and valid
 */
function mergeSettings(
  current: AppSettings,
  updates: Partial<AppSettings>
): AppSettings {
  const merged: AppSettings = { ...current };

  // Email fields
  if (typeof updates.supportEmail === 'string' && updates.supportEmail.trim()) {
    merged.supportEmail = updates.supportEmail.trim();
  }
  if (typeof updates.feedbackEmail === 'string') {
    merged.feedbackEmail = updates.feedbackEmail.trim() || undefined;
  }
  if (typeof updates.bugReportEmail === 'string') {
    merged.bugReportEmail = updates.bugReportEmail.trim() || undefined;
  }

  // Documentation URLs
  if (typeof updates.docsBaseUrl === 'string' && updates.docsBaseUrl.trim()) {
    merged.docsBaseUrl = updates.docsBaseUrl.trim();
  }
  if (typeof updates.gettingStartedUrl === 'string' && updates.gettingStartedUrl.trim()) {
    merged.gettingStartedUrl = updates.gettingStartedUrl.trim();
  }
  if (typeof updates.featuresUrl === 'string' && updates.featuresUrl.trim()) {
    merged.featuresUrl = updates.featuresUrl.trim();
  }
  if (typeof updates.faqUrl === 'string' && updates.faqUrl.trim()) {
    merged.faqUrl = updates.faqUrl.trim();
  }
  if (typeof updates.supportCenterUrl === 'string' && updates.supportCenterUrl.trim()) {
    merged.supportCenterUrl = updates.supportCenterUrl.trim();
  }

  // Legal URLs
  if (typeof updates.privacyPolicyUrl === 'string' && updates.privacyPolicyUrl.trim()) {
    merged.privacyPolicyUrl = updates.privacyPolicyUrl.trim();
  }
  if (typeof updates.termsOfServiceUrl === 'string' && updates.termsOfServiceUrl.trim()) {
    merged.termsOfServiceUrl = updates.termsOfServiceUrl.trim();
  }
  if (typeof updates.licensesUrl === 'string' && updates.licensesUrl.trim()) {
    merged.licensesUrl = updates.licensesUrl.trim();
  }

  // App Metadata
  if (typeof updates.appName === 'string' && updates.appName.trim()) {
    merged.appName = updates.appName.trim();
  }
  if (typeof updates.companyName === 'string' && updates.companyName.trim()) {
    merged.companyName = updates.companyName.trim();
  }
  if (typeof updates.copyrightYear === 'number') {
    merged.copyrightYear = updates.copyrightYear;
  }

  return merged;
}
