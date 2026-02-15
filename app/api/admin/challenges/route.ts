import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/challenges
 * List challenges with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const type = searchParams.get('type') || 'all';
    const limitParam = parseInt(searchParams.get('limit') || '50', 10);

    const db = getAdminFirestore();
    let query: FirebaseFirestore.Query = db.collection('challenges');

    if (status === 'active') {
      query = query.where('isActive', '==', true);
    } else if (status === 'completed') {
      query = query.where('isActive', '==', false);
    }

    if (type !== 'all') {
      query = query.where('type', '==', type);
    }

    query = query.orderBy('createdAt', 'desc').limit(limitParam);

    const snapshot = await query.get();
    const challenges = snapshot.docs.map((doc) => {
      const data = doc.data() as Record<string, any>;
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() || data.updatedAt,
      };
    });

    // Fetch progress summaries for each challenge
    const challengesWithProgress = await Promise.all(
      challenges.map(async (challenge) => {
        const progressSnapshot = await db
          .collection('challengeProgress')
          .where('challengeId', '==', challenge.id)
          .orderBy('currentValue', 'desc')
          .get();

        const participants = progressSnapshot.docs.map((doc) => ({
          userId: doc.data().userId,
          currentValue: doc.data().currentValue || 0,
          rank: doc.data().rank || 0,
        }));

        return {
          ...challenge,
          participantCount: (challenge as any).participantIds?.length || 0,
          progressSummary: participants,
        };
      })
    );

    return NextResponse.json({
      challenges: challengesWithProgress,
      total: challengesWithProgress.length,
    });
  } catch (error: unknown) {
    console.error('[Admin Challenges API] Error listing challenges:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch challenges';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/admin/challenges
 * Create a new challenge
 */
export async function POST(request: NextRequest) {
  try {
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const body = await request.json();
    const { title, description, type, goalValue, goalUnit, startDate, endDate, participantIds } = body;

    // Validate required fields
    if (!title || !type || !goalValue || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required fields: title, type, goalValue, startDate, endDate' },
        { status: 400 }
      );
    }

    const validTypes = ['diary', 'voice', 'photo', 'checkin', 'streak', 'combo'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    const now = new Date().toISOString();

    const challengeData = {
      title,
      description: description || '',
      type,
      goalValue: Number(goalValue),
      goalUnit: goalUnit || 'count',
      startDate,
      endDate,
      isActive: true,
      participantIds: participantIds || [],
      createdBy: user.uid,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await db.collection('challenges').add(challengeData);

    // Initialize progress docs for each participant
    const batch = db.batch();
    for (const participantId of challengeData.participantIds) {
      const progressRef = db.collection('challengeProgress').doc(`${docRef.id}_${participantId}`);
      batch.set(progressRef, {
        challengeId: docRef.id,
        userId: participantId,
        currentValue: 0,
        rank: 0,
        lastUpdated: new Date(),
      });
    }
    await batch.commit();

    return NextResponse.json({
      challenge: { id: docRef.id, ...challengeData, createdAt: now, updatedAt: now },
    });
  } catch (error: unknown) {
    console.error('[Admin Challenges API] Error creating challenge:', error);
    const message = error instanceof Error ? error.message : 'Failed to create challenge';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
