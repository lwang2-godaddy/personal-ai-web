import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';
import type { AdminAlert, AlertingConfig, AlertCategory } from '@/lib/models/AdminAlert';
import { DEFAULT_ALERTING_CONFIG, costAlertToAdminAlert } from '@/lib/models/AdminAlert';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/alerts
 * Fetch alerts from both adminAlerts (new) and costAlerts (legacy) collections.
 * Query params: status (active|resolved), category (cost|behavior|system), limit (default 50), includeConfig
 */
export async function GET(request: NextRequest) {
  const { user, response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status');
  const category = searchParams.get('category') as AlertCategory | null;
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? parseInt(limitParam, 10) : 50;
  const includeConfig = searchParams.get('includeConfig') === 'true';

  try {
    const db = getAdminFirestore();
    const allAlerts: AdminAlert[] = [];
    const seenIds = new Set<string>();

    // 1. Query adminAlerts (primary collection)
    let adminQuery: FirebaseFirestore.Query = db.collection('adminAlerts').orderBy('detectedAt', 'desc');
    if (status) {
      adminQuery = adminQuery.where('status', '==', status);
    }
    if (category) {
      adminQuery = adminQuery.where('category', '==', category);
    }
    const adminSnapshot = await adminQuery.limit(limit).get();

    adminSnapshot.docs.forEach(doc => {
      const data = doc.data();
      allAlerts.push({
        id: doc.id,
        category: data.category || 'cost',
        type: data.type,
        severity: data.severity,
        status: data.status,
        title: data.title || '',
        details: data.details || '',
        currentValue: data.currentValue || 0,
        expectedValue: data.expectedValue || 0,
        multiplier: data.multiplier || 0,
        userId: data.userId,
        service: data.service,
        metadata: data.metadata,
        detectedAt: data.detectedAt || '',
        resolvedAt: data.resolvedAt,
        resolvedBy: data.resolvedBy,
      });
      seenIds.add(doc.id);
    });

    // 2. Query costAlerts (legacy collection) - only if not filtering to non-cost category
    if (!category || category === 'cost') {
      let legacyQuery: FirebaseFirestore.Query = db.collection('costAlerts').orderBy('detectedAt', 'desc');
      if (status) {
        legacyQuery = legacyQuery.where('status', '==', status);
      }
      const legacySnapshot = await legacyQuery.limit(limit).get();

      legacySnapshot.docs.forEach(doc => {
        if (seenIds.has(doc.id)) return; // skip duplicates
        allAlerts.push(costAlertToAdminAlert({ id: doc.id, ...doc.data() }));
      });
    }

    // Sort merged results by detectedAt descending, then trim to limit
    allAlerts.sort((a, b) => {
      const dateA = a.detectedAt ? new Date(a.detectedAt).getTime() : 0;
      const dateB = b.detectedAt ? new Date(b.detectedAt).getTime() : 0;
      return dateB - dateA;
    });
    const trimmedAlerts = allAlerts.slice(0, limit);

    // 3. Count active alerts across both collections
    const [adminActiveSnap, legacyActiveSnap] = await Promise.all([
      db.collection('adminAlerts').where('status', '==', 'active').count().get(),
      db.collection('costAlerts').where('status', '==', 'active').count().get(),
    ]);
    const activeCount = adminActiveSnap.data().count + legacyActiveSnap.data().count;

    // 4. Optionally include unified config
    let config: AlertingConfig | undefined;
    if (includeConfig) {
      const [alertingDoc, costAlertingDoc] = await Promise.all([
        db.collection('config').doc('alerting').get(),
        db.collection('config').doc('costAlerting').get(),
      ]);

      if (alertingDoc.exists) {
        const data = alertingDoc.data()!;
        config = {
          cost: { ...DEFAULT_ALERTING_CONFIG.cost, ...data.cost },
          behavior: { ...DEFAULT_ALERTING_CONFIG.behavior, ...data.behavior },
          system: { ...DEFAULT_ALERTING_CONFIG.system, ...data.system },
        };
      } else if (costAlertingDoc.exists) {
        // Fallback: build unified config from legacy cost-only config
        const legacy = costAlertingDoc.data()!;
        config = {
          ...DEFAULT_ALERTING_CONFIG,
          cost: {
            ...DEFAULT_ALERTING_CONFIG.cost,
            enabled: legacy.enabled ?? true,
            perUserDailyCostThreshold: legacy.perUserHourlyCostThreshold ?? DEFAULT_ALERTING_CONFIG.cost.perUserDailyCostThreshold,
            systemDailyCostThreshold: legacy.systemDailyCostThreshold ?? DEFAULT_ALERTING_CONFIG.cost.systemDailyCostThreshold,
            spikeMultiplierThreshold: legacy.spikeMultiplierThreshold ?? DEFAULT_ALERTING_CONFIG.cost.spikeMultiplierThreshold,
            serviceDominanceThreshold: legacy.serviceDominanceThreshold ?? DEFAULT_ALERTING_CONFIG.cost.serviceDominanceThreshold,
            alertCooldownHours: legacy.alertCooldownHours ?? DEFAULT_ALERTING_CONFIG.cost.alertCooldownHours,
            adminEmails: legacy.adminEmails ?? [],
          },
        };
      } else {
        config = DEFAULT_ALERTING_CONFIG;
      }
    }

    return NextResponse.json({
      alerts: trimmedAlerts,
      activeCount,
      config,
    });
  } catch (error: any) {
    console.error('[Admin Alerts API] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/alerts
 * Resolve an alert: { action: 'resolve', alertId: string }
 * Tries adminAlerts first, falls back to costAlerts
 */
export async function POST(request: NextRequest) {
  const { user, response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    const body = await request.json();
    const { action, alertId } = body;

    if (action !== 'resolve' || !alertId) {
      return NextResponse.json(
        { error: 'Invalid request. Expected { action: "resolve", alertId: string }' },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    const updateData = {
      status: 'resolved',
      resolvedAt: new Date().toISOString(),
      resolvedBy: user!.uid,
    };

    // Try adminAlerts first
    const adminRef = db.collection('adminAlerts').doc(alertId);
    const adminDoc = await adminRef.get();
    if (adminDoc.exists) {
      await adminRef.update(updateData);
      return NextResponse.json({ success: true, alertId });
    }

    // Fall back to costAlerts
    const legacyRef = db.collection('costAlerts').doc(alertId);
    const legacyDoc = await legacyRef.get();
    if (legacyDoc.exists) {
      await legacyRef.update(updateData);
      return NextResponse.json({ success: true, alertId });
    }

    return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
  } catch (error: any) {
    console.error('[Admin Alerts API] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to resolve alert', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/alerts
 * Save unified alerting config: { config: AlertingConfig }
 * Also mirrors cost section to config/costAlerting for backward compat
 */
export async function PUT(request: NextRequest) {
  const { user, response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    const body = await request.json();
    const { config } = body;

    if (!config) {
      return NextResponse.json(
        { error: 'Missing config in request body' },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    const now = new Date().toISOString();

    // Write unified config
    await db.collection('config').doc('alerting').set(
      {
        ...config,
        updatedAt: now,
        updatedBy: user!.uid,
      },
      { merge: true }
    );

    // Mirror cost section to legacy config/costAlerting for backward compat with existing CF
    if (config.cost) {
      await db.collection('config').doc('costAlerting').set(
        {
          enabled: config.cost.enabled,
          perUserHourlyCostThreshold: config.cost.perUserDailyCostThreshold,
          systemDailyCostThreshold: config.cost.systemDailyCostThreshold,
          spikeMultiplierThreshold: config.cost.spikeMultiplierThreshold,
          serviceDominanceThreshold: config.cost.serviceDominanceThreshold,
          alertCooldownHours: config.cost.alertCooldownHours,
          adminEmails: config.cost.adminEmails,
          updatedAt: now,
          updatedBy: user!.uid,
        },
        { merge: true }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Admin Alerts API] PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update config', details: error.message },
      { status: 500 }
    );
  }
}
