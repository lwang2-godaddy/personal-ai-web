import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/api/firebase/admin';
import {
  FriendInvite,
  FriendInvitePreview,
  isInviteValid,
  getInvalidReason,
} from '@/lib/models/FriendInvite';

/**
 * GET /api/invites/[token]/preview
 * Get public preview of an invite (no authentication required)
 *
 * This allows users to see invite details before signing in
 *
 * Returns:
 * - preview: FriendInvitePreview
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const db = getAdminFirestore();

    console.log('[Invite Preview API] Looking up token:', token);

    // Find invite by token
    const inviteSnapshot = await db
      .collection('friendInvites')
      .where('token', '==', token)
      .limit(1)
      .get();

    if (inviteSnapshot.empty) {
      const preview: FriendInvitePreview = {
        token,
        inviterDisplayName: '',
        inviterPhotoURL: null,
        isValid: false,
        invalidReason: 'not_found',
      };

      return NextResponse.json({ preview }, { status: 200 });
    }

    const inviteDoc = inviteSnapshot.docs[0];
    const invite = {
      id: inviteDoc.id,
      ...inviteDoc.data(),
    } as FriendInvite;

    // Build preview
    const valid = isInviteValid(invite);
    const preview: FriendInvitePreview = {
      token: invite.token,
      inviterDisplayName: invite.inviterDisplayName,
      inviterPhotoURL: invite.inviterPhotoURL,
      message: invite.message,
      isValid: valid,
      invalidReason: valid ? undefined : getInvalidReason(invite),
    };

    console.log('[Invite Preview API] Returning preview:', {
      token,
      isValid: valid,
      inviterDisplayName: invite.inviterDisplayName,
    });

    return NextResponse.json({ preview }, { status: 200 });
  } catch (error: any) {
    console.error('[Invite Preview API] Error:', error);
    return NextResponse.json(
      { error: `Failed to get invite preview: ${error.message}` },
      { status: 500 }
    );
  }
}
