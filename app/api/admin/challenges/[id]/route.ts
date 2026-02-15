import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/challenges/[id]
 * Get a single challenge with full progress and participant details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const { id } = await params;
    const db = getAdminFirestore();

    const challengeDoc = await db.collection('challenges').doc(id).get();
    if (!challengeDoc.exists) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }

    const challengeData = challengeDoc.data()!;
    const challenge = {
      id: challengeDoc.id,
      ...challengeData,
      createdAt: challengeData.createdAt?.toDate?.()?.toISOString?.() || challengeData.createdAt,
      updatedAt: challengeData.updatedAt?.toDate?.()?.toISOString?.() || challengeData.updatedAt,
    };

    // Fetch all progress docs for this challenge
    const progressSnapshot = await db
      .collection('challengeProgress')
      .where('challengeId', '==', id)
      .orderBy('currentValue', 'desc')
      .get();

    // Fetch participant user profiles
    const participantIds = challengeData.participantIds || [];
    const userProfiles: Record<string, { displayName: string; email: string; photoURL: string | null }> = {};

    if (participantIds.length > 0) {
      // Fetch in batches of 10 (Firestore 'in' query limit)
      for (let i = 0; i < participantIds.length; i += 10) {
        const batch = participantIds.slice(i, i + 10);
        const usersSnapshot = await db
          .collection('users')
          .where('uid', 'in', batch)
          .get();

        usersSnapshot.docs.forEach((doc) => {
          const data = doc.data();
          userProfiles[doc.id] = {
            displayName: data.displayName || data.email || 'Unknown',
            email: data.email || '',
            photoURL: data.photoURL || null,
          };
        });
      }
    }

    const progress = progressSnapshot.docs.map((doc) => {
      const data = doc.data();
      const profile = userProfiles[data.userId] || { displayName: 'Unknown', email: '', photoURL: null };
      return {
        userId: data.userId,
        currentValue: data.currentValue || 0,
        rank: data.rank || 0,
        lastUpdated: data.lastUpdated?.toDate?.()?.toISOString?.() || data.lastUpdated,
        displayName: profile.displayName,
        email: profile.email,
        photoURL: profile.photoURL,
      };
    });

    return NextResponse.json({
      challenge,
      progress,
      userProfiles,
    });
  } catch (error: unknown) {
    console.error('[Admin Challenges API] Error fetching challenge:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch challenge';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PUT /api/admin/challenges/[id]
 * Update a challenge
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const { id } = await params;
    const body = await request.json();
    const { title, description, goalValue, goalUnit, endDate, isActive, participantIds } = body;

    const db = getAdminFirestore();

    const challengeDoc = await db.collection('challenges').doc(id).get();
    if (!challengeDoc.exists) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (goalValue !== undefined) updates.goalValue = Number(goalValue);
    if (goalUnit !== undefined) updates.goalUnit = goalUnit;
    if (endDate !== undefined) updates.endDate = endDate;
    if (isActive !== undefined) updates.isActive = isActive;
    if (participantIds !== undefined) updates.participantIds = participantIds;

    await db.collection('challenges').doc(id).update(updates);

    // If new participants were added, initialize their progress docs
    if (participantIds) {
      const existingData = challengeDoc.data()!;
      const existingParticipants = new Set(existingData.participantIds || []);
      const newParticipants = participantIds.filter((pid: string) => !existingParticipants.has(pid));

      if (newParticipants.length > 0) {
        const batch = db.batch();
        for (const participantId of newParticipants) {
          const progressRef = db.collection('challengeProgress').doc(`${id}_${participantId}`);
          batch.set(progressRef, {
            challengeId: id,
            userId: participantId,
            currentValue: 0,
            rank: 0,
            lastUpdated: new Date(),
          });
        }
        await batch.commit();
      }
    }

    const updatedDoc = await db.collection('challenges').doc(id).get();
    const updatedData = updatedDoc.data()!;

    return NextResponse.json({
      challenge: {
        id: updatedDoc.id,
        ...updatedData,
        createdAt: updatedData.createdAt?.toDate?.()?.toISOString?.() || updatedData.createdAt,
        updatedAt: updatedData.updatedAt?.toDate?.()?.toISOString?.() || updatedData.updatedAt,
      },
    });
  } catch (error: unknown) {
    console.error('[Admin Challenges API] Error updating challenge:', error);
    const message = error instanceof Error ? error.message : 'Failed to update challenge';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/challenges/[id]
 * Delete a challenge and all associated progress docs
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, response: authResponse } = await requireAdmin(request);
    if (authResponse) return authResponse;

    const { id } = await params;
    const db = getAdminFirestore();

    const challengeDoc = await db.collection('challenges').doc(id).get();
    if (!challengeDoc.exists) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }

    // Delete all associated progress docs
    const progressSnapshot = await db
      .collection('challengeProgress')
      .where('challengeId', '==', id)
      .get();

    const batch = db.batch();
    progressSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    batch.delete(db.collection('challenges').doc(id));
    await batch.commit();

    return NextResponse.json({ success: true, deletedProgressDocs: progressSnapshot.size });
  } catch (error: unknown) {
    console.error('[Admin Challenges API] Error deleting challenge:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete challenge';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
