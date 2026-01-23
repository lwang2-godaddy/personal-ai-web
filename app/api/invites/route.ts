import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth';
import { getAdminFirestore } from '@/lib/api/firebase/admin';
import {
  FriendInvite,
  FriendInviteType,
  generateInviteToken,
  CreateFriendInviteRequest,
} from '@/lib/models/FriendInvite';

/**
 * POST /api/invites
 * Create a new friend invite link
 *
 * Body:
 * - type: 'single' | 'reusable'
 * - message?: string (optional personal message)
 * - maxUses?: number (only for 'reusable' type)
 *
 * Returns:
 * - invite: FriendInvite
 * - inviteUrl: string
 */
export async function POST(request: NextRequest) {
  try {
    const { user, response: authResponse } = await requireAuth(request);
    if (authResponse) return authResponse;

    const userId = user.uid;
    const db = getAdminFirestore();

    // Parse request body
    const body: CreateFriendInviteRequest = await request.json();
    const { type, message, maxUses } = body;

    // Validate type
    if (!type || !['single', 'reusable'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid invite type. Must be "single" or "reusable".' },
        { status: 400 }
      );
    }

    // Validate maxUses
    if (type === 'single' && maxUses !== undefined) {
      return NextResponse.json(
        { error: 'maxUses is only allowed for reusable invites.' },
        { status: 400 }
      );
    }

    // Rate limit: Check if user has created too many invites in last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recentInvitesSnapshot = await db
      .collection('friendInvites')
      .where('inviterId', '==', userId)
      .where('createdAt', '>=', twentyFourHoursAgo)
      .get();

    if (recentInvitesSnapshot.size >= 10) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. You can create up to 10 invites per 24 hours.' },
        { status: 429 }
      );
    }

    // Get user profile for invite
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User profile not found.' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();

    // Generate unique token
    let token: string;
    let attempts = 0;
    const maxAttempts = 5;

    do {
      token = generateInviteToken();
      const existingInvite = await db
        .collection('friendInvites')
        .where('token', '==', token)
        .limit(1)
        .get();

      if (existingInvite.empty) {
        break;
      }

      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      return NextResponse.json(
        { error: 'Failed to generate unique token. Please try again.' },
        { status: 500 }
      );
    }

    // Create invite
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const inviteData: Omit<FriendInvite, 'id'> = {
      token,
      inviterId: userId,
      inviterEmail: userData?.email || user.email || '',
      inviterDisplayName: userData?.displayName || userData?.email || 'Anonymous',
      inviterPhotoURL: userData?.photoURL || null,
      type: type as FriendInviteType,
      maxUses: type === 'reusable' ? (maxUses || null) : 1,
      currentUses: 0,
      message: message || undefined,
      status: 'active',
      acceptedByUserIds: [],
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    // Save to Firestore
    const docRef = await db.collection('friendInvites').add(inviteData);

    const invite: FriendInvite = {
      id: docRef.id,
      ...inviteData,
    };

    const inviteUrl = `https://sircharge.ai/invite/${token}`;

    console.log('[Invites API] Created invite:', {
      id: invite.id,
      token,
      type,
      inviterId: userId,
    });

    return NextResponse.json({ invite, inviteUrl }, { status: 201 });
  } catch (error: any) {
    console.error('[Invites API] Error creating invite:', error);
    return NextResponse.json(
      { error: `Failed to create invite: ${error.message}` },
      { status: 500 }
    );
  }
}

/**
 * GET /api/invites
 * Get all invites created by the authenticated user
 *
 * Returns:
 * - invites: FriendInvite[]
 */
export async function GET(request: NextRequest) {
  try {
    const { user, response: authResponse } = await requireAuth(request);
    if (authResponse) return authResponse;

    const userId = user.uid;
    const db = getAdminFirestore();

    console.log('[Invites API] Fetching invites for user:', userId);

    // Get user's invites
    const invitesSnapshot = await db
      .collection('friendInvites')
      .where('inviterId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    const invites: FriendInvite[] = invitesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as FriendInvite[];

    console.log('[Invites API] Found', invites.length, 'invites');

    return NextResponse.json({ invites }, { status: 200 });
  } catch (error: any) {
    console.error('[Invites API] Error fetching invites:', error);
    return NextResponse.json(
      { error: `Failed to fetch invites: ${error.message}` },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/invites
 * Revoke an invite (set status to 'revoked')
 *
 * Query params:
 * - id: string (invite ID to revoke)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { user, response: authResponse } = await requireAuth(request);
    if (authResponse) return authResponse;

    const userId = user.uid;
    const db = getAdminFirestore();

    // Get invite ID from query params
    const { searchParams } = new URL(request.url);
    const inviteId = searchParams.get('id');

    if (!inviteId) {
      return NextResponse.json(
        { error: 'Missing invite ID.' },
        { status: 400 }
      );
    }

    // Get the invite
    const inviteDoc = await db.collection('friendInvites').doc(inviteId).get();

    if (!inviteDoc.exists) {
      return NextResponse.json(
        { error: 'Invite not found.' },
        { status: 404 }
      );
    }

    const inviteData = inviteDoc.data() as FriendInvite;

    // Verify ownership
    if (inviteData.inviterId !== userId) {
      return NextResponse.json(
        { error: 'Not authorized to revoke this invite.' },
        { status: 403 }
      );
    }

    // Update status to revoked
    await inviteDoc.ref.update({ status: 'revoked' });

    console.log('[Invites API] Revoked invite:', inviteId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('[Invites API] Error revoking invite:', error);
    return NextResponse.json(
      { error: `Failed to revoke invite: ${error.message}` },
      { status: 500 }
    );
  }
}
