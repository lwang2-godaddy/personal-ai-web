import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';

const COLLECTION = 'appStoreReleases';

/**
 * GET /api/admin/app-store-releases
 * List all App Store releases ordered by date desc
 */
export async function GET(request: NextRequest) {
  try {
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const db = getAdminFirestore();
    const snapshot = await db
      .collection(COLLECTION)
      .orderBy('releaseDate', 'desc')
      .get();

    const releases = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        releaseDate: data.releaseDate?.toDate?.()?.toISOString() || null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
      };
    });

    return NextResponse.json({ releases });
  } catch (error: unknown) {
    console.error('[App Store Releases API] Error fetching releases:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch releases';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/admin/app-store-releases
 * Create a new release entry
 */
export async function POST(request: NextRequest) {
  try {
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const body = await request.json();
    const { version, buildNumber, releaseNotes, rawCommits, status } = body;

    if (!version) {
      return NextResponse.json({ error: 'version is required' }, { status: 400 });
    }

    const db = getAdminFirestore();
    const docId = `v${version}`;
    const now = new Date().toISOString();

    const data = {
      version,
      buildNumber: buildNumber || '1',
      releaseDate: new Date(),
      status: status || 'submitted',
      releaseNotes: releaseNotes || '',
      rawCommits: rawCommits || [],
      commitRange: { from: '', to: `v${version}` },
      previousVersion: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection(COLLECTION).doc(docId).set(data);

    return NextResponse.json({
      id: docId,
      ...data,
      releaseDate: now,
      createdAt: now,
      updatedAt: now,
    });
  } catch (error: unknown) {
    console.error('[App Store Releases API] Error creating release:', error);
    const message = error instanceof Error ? error.message : 'Failed to create release';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/app-store-releases
 * Update a release (status, notes)
 * Body: { id: string, status?: string, releaseNotes?: string }
 */
export async function PATCH(request: NextRequest) {
  try {
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const body = await request.json();
    const { id, status, releaseNotes } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const db = getAdminFirestore();
    const docRef = db.collection(COLLECTION).doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Release not found' }, { status: 404 });
    }

    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (status !== undefined) {
      const validStatuses = ['submitted', 'in-review', 'approved', 'released', 'rejected'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }
      updates.status = status;
    }

    if (releaseNotes !== undefined) {
      updates.releaseNotes = releaseNotes;
    }

    await docRef.update(updates);

    return NextResponse.json({ success: true, id, updates });
  } catch (error: unknown) {
    console.error('[App Store Releases API] Error updating release:', error);
    const message = error instanceof Error ? error.message : 'Failed to update release';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
