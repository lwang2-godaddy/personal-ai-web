import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';
import type { CostAlert, CostAlertingConfig } from '@/lib/models/CostAlert';
import { DEFAULT_COST_ALERTING_CONFIG } from '@/lib/models/CostAlert';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/alerts
 * Fetch cost alerts with optional filtering
 * Query params: status (active|resolved), limit (default 50)
 */
export async function GET(request: NextRequest) {
  const { user, response: authResponse } = await requireAdmin(request);
  if (authResponse) return authResponse;

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status');
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? parseInt(limitParam, 10) : 50;
  const includeConfig = searchParams.get('includeConfig') === 'true';

  try {
    const db = getAdminFirestore();

    // Build alerts query
    let query = db.collection('costAlerts').orderBy('detectedAt', 'desc');
    if (status) {
      query = query.where('status', '==', status);
    }
    const snapshot = await query.limit(limit).get();

    const alerts: CostAlert[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as CostAlert[];

    // Count active alerts
    const activeCountSnapshot = await db
      .collection('costAlerts')
      .where('status', '==', 'active')
      .count()
      .get();
    const activeCount = activeCountSnapshot.data().count;

    // Optionally include config
    let config: CostAlertingConfig | undefined;
    if (includeConfig) {
      const configDoc = await db.collection('config').doc('costAlerting').get();
      config = configDoc.exists
        ? { ...DEFAULT_COST_ALERTING_CONFIG, ...configDoc.data() }
        : DEFAULT_COST_ALERTING_CONFIG;
    }

    return NextResponse.json({
      alerts,
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
    const alertRef = db.collection('costAlerts').doc(alertId);
    const alertDoc = await alertRef.get();

    if (!alertDoc.exists) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    await alertRef.update({
      status: 'resolved',
      resolvedAt: new Date().toISOString(),
      resolvedBy: user!.uid,
    });

    return NextResponse.json({ success: true, alertId });
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
 * Update cost alerting config: { config: CostAlertingConfig }
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
    await db.collection('config').doc('costAlerting').set(
      {
        ...config,
        updatedAt: new Date().toISOString(),
        updatedBy: user!.uid,
      },
      { merge: true }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Admin Alerts API] PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update config', details: error.message },
      { status: 500 }
    );
  }
}
