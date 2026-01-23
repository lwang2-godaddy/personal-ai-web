import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
  FriendInvite,
  AcceptFriendInviteResponse,
  isInviteValid,
  getInvalidReason,
} from '@/lib/models/FriendInvite';

/**
 * POST /api/invites/[token]/accept
 * Accept a friend invite and create friendship
 *
 * Returns:
 * - success: boolean
 * - friendshipId?: string
 * - inviterDisplayName?: string
 * - error?: string
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { user, response: authResponse } = await requireAuth(request);
    if (authResponse) return authResponse;

    const { token } = await context.params;
    const userId = user.uid;
    const db = getAdminFirestore();

    console.log('[Invite Accept API] User', userId, 'accepting invite:', token);

    // Find invite by token
    const inviteSnapshot = await db
      .collection('friendInvites')
      .where('token', '==', token)
      .limit(1)
      .get();

    if (inviteSnapshot.empty) {
      const response: AcceptFriendInviteResponse = {
        success: false,
        error: 'Invite not found.',
      };
      return NextResponse.json(response, { status: 404 });
    }

    const inviteDoc = inviteSnapshot.docs[0];
    const invite = {
      id: inviteDoc.id,
      ...inviteDoc.data(),
    } as FriendInvite;

    // Check if invite is valid
    if (!isInviteValid(invite)) {
      const reason = getInvalidReason(invite);
      const errorMessages: Record<string, string> = {
        expired: 'This invite has expired.',
        revoked: 'This invite has been revoked.',
        exhausted: 'This invite has already been used.',
        not_found: 'Invite not found.',
      };

      const response: AcceptFriendInviteResponse = {
        success: false,
        error: errorMessages[reason || 'expired'] || 'This invite is no longer valid.',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Check if user is trying to accept their own invite
    if (invite.inviterId === userId) {
      const response: AcceptFriendInviteResponse = {
        success: false,
        error: 'You cannot accept your own invite.',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Check if user already accepted this invite
    if (invite.acceptedByUserIds.includes(userId)) {
      const response: AcceptFriendInviteResponse = {
        success: false,
        error: 'You have already accepted this invite.',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Check if friendship already exists
    const existingFriendship1 = await db
      .collection('friends')
      .where('userId', '==', userId)
      .where('friendUid', '==', invite.inviterId)
      .limit(1)
      .get();

    const existingFriendship2 = await db
      .collection('friends')
      .where('userId', '==', invite.inviterId)
      .where('friendUid', '==', userId)
      .limit(1)
      .get();

    if (!existingFriendship1.empty || !existingFriendship2.empty) {
      const response: AcceptFriendInviteResponse = {
        success: false,
        error: 'You are already friends with this user.',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Get accepting user's profile
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    // Create bidirectional friendships in a batch
    const batch = db.batch();
    const now = new Date().toISOString();

    // Default privacy settings
    const defaultPrivacySettings = {
      shareHealth: true,
      shareLocation: true,
      shareActivities: true,
      shareVoiceNotes: false,
      sharePhotos: true,
    };

    // Friendship 1: inviter -> accepter
    const friendship1Id = `${invite.inviterId}_${userId}`;
    const friendship1Ref = db.collection('friends').doc(friendship1Id);
    batch.set(friendship1Ref, {
      userId: invite.inviterId,
      friendUid: userId,
      friendEmail: userData?.email || user.email || '',
      friendDisplayName: userData?.displayName || userData?.email || 'Anonymous',
      friendPhotoURL: userData?.photoURL || null,
      status: 'accepted',
      privacySettings: defaultPrivacySettings,
      createdAt: now,
      updatedAt: now,
    });

    // Friendship 2: accepter -> inviter
    const friendship2Id = `${userId}_${invite.inviterId}`;
    const friendship2Ref = db.collection('friends').doc(friendship2Id);
    batch.set(friendship2Ref, {
      userId: userId,
      friendUid: invite.inviterId,
      friendEmail: invite.inviterEmail,
      friendDisplayName: invite.inviterDisplayName,
      friendPhotoURL: invite.inviterPhotoURL,
      status: 'accepted',
      privacySettings: defaultPrivacySettings,
      createdAt: now,
      updatedAt: now,
    });

    // Update invite
    const newCurrentUses = invite.currentUses + 1;
    const updateData: Record<string, any> = {
      currentUses: newCurrentUses,
      acceptedByUserIds: FieldValue.arrayUnion(userId),
    };

    // Check if invite should be exhausted
    if (invite.type === 'single' || (invite.maxUses !== null && newCurrentUses >= invite.maxUses)) {
      updateData.status = 'exhausted';
    }

    batch.update(inviteDoc.ref, updateData);

    // Commit batch
    await batch.commit();

    console.log('[Invite Accept API] Friendship created:', {
      inviterId: invite.inviterId,
      accepterId: userId,
      friendshipIds: [friendship1Id, friendship2Id],
    });

    const response: AcceptFriendInviteResponse = {
      success: true,
      friendshipId: friendship1Id,
      inviterDisplayName: invite.inviterDisplayName,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error('[Invite Accept API] Error:', error);
    const response: AcceptFriendInviteResponse = {
      success: false,
      error: `Failed to accept invite: ${error.message}`,
    };
    return NextResponse.json(response, { status: 500 });
  }
}
