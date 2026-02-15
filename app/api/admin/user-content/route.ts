import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';

/**
 * Serialize Firestore data, converting Timestamps to ISO strings
 */
function serializeData(data: any): any {
  if (!data) return data;

  if (data && typeof data === 'object' && typeof data.toDate === 'function') {
    try {
      return data.toDate().toISOString();
    } catch {
      return null;
    }
  }

  if (Array.isArray(data)) {
    return data.map(serializeData);
  }

  if (typeof data === 'object' && data !== null) {
    const serialized: any = {};
    for (const [key, value] of Object.entries(data)) {
      serialized[key] = serializeData(value);
    }
    return serialized;
  }

  return data;
}

/**
 * GET /api/admin/debug/user-content
 * Admin-only endpoint to fetch user content for debugging
 *
 * Query params:
 * - userId (required): User ID to fetch content for
 * - type: 'textNotes' | 'voiceNotes' | 'photoMemories' | 'all' (default: 'all')
 * - limit: number (default: 50, max: 100)
 */
export async function GET(request: NextRequest) {
  try {
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type') || 'all';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

    if (!userId || !userId.trim()) {
      return NextResponse.json(
        { error: 'userId parameter is required' },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();

    const fetchCollection = async (collectionName: string, orderField: string) => {
      const snapshot = await db
        .collection(collectionName)
        .where('userId', '==', userId)
        .orderBy(orderField, 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...serializeData(doc.data()),
      }));
    };

    const fetchCount = async (collectionName: string) => {
      const snapshot = await db
        .collection(collectionName)
        .where('userId', '==', userId)
        .count()
        .get();
      return snapshot.data().count;
    };

    let textNotes: any[] = [];
    let voiceNotes: any[] = [];
    let photoMemories: any[] = [];
    let counts = { textNotes: 0, voiceNotes: 0, photoMemories: 0 };

    if (type === 'all' || type === 'textNotes') {
      [textNotes, counts.textNotes] = await Promise.all([
        fetchCollection('textNotes', 'createdAt'),
        fetchCount('textNotes'),
      ]);
    }

    if (type === 'all' || type === 'voiceNotes') {
      [voiceNotes, counts.voiceNotes] = await Promise.all([
        fetchCollection('voiceNotes', 'createdAt'),
        fetchCount('voiceNotes'),
      ]);
    }

    if (type === 'all' || type === 'photoMemories') {
      [photoMemories, counts.photoMemories] = await Promise.all([
        fetchCollection('photoMemories', 'takenAt'),
        fetchCount('photoMemories'),
      ]);
    }

    return NextResponse.json({
      textNotes,
      voiceNotes,
      photoMemories,
      counts,
    });
  } catch (error: any) {
    console.error('[Admin Debug API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch user content' },
      { status: 500 }
    );
  }
}
