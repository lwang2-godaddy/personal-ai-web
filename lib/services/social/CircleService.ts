/**
 * CircleService
 *
 * Manages all circle-related operations including CRUD, invitations, members, and messages.
 * Singleton service for Close Friend Circles feature (Web version).
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  writeBatch,
  arrayUnion,
  arrayRemove,
  startAfter,
} from 'firebase/firestore';
import { auth, db } from '../../api/firebase/config';
import {
  Circle,
  CircleMember,
  CircleInvite,
  CircleMessage,
  CircleAnalytics,
  CircleDataSharing,
  CircleSettings,
  getDefaultDataSharing,
  getDefaultCircleSettings,
  generateCircleMemberId,
  calculateInviteExpiration,
} from '../models/Circle';

export class CircleService {
  private static instance: CircleService;

  private constructor() {
    // Private constructor to enforce singleton
  }

  /**
   * Get singleton instance
   */
  static getInstance(): CircleService {
    if (!CircleService.instance) {
      CircleService.instance = new CircleService();
    }
    return CircleService.instance;
  }

  /**
   * Get current user ID
   */
  private getCurrentUserId(): string {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No authenticated user');
    }
    return user.uid;
  }

  // ========================================================================
  // CIRCLE CRUD OPERATIONS
  // ========================================================================

  /**
   * Create a new circle
   * @param circleData Circle data without id and timestamps
   * @returns Created circle with generated id and timestamps
   */
  async createCircle(
    circleData: Omit<Circle, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Circle> {
    const currentUserId = this.getCurrentUserId();

    // Validate that creator is in memberIds
    if (!circleData.memberIds.includes(currentUserId)) {
      throw new Error('Creator must be in memberIds');
    }

    // Validate that creator is the createdBy user
    if (circleData.createdBy !== currentUserId) {
      throw new Error('Creator must match current user');
    }

    // Create circle document
    const circleRef = doc(collection(db, 'circles'));
    const now = new Date().toISOString();

    const circle: Circle = {
      id: circleRef.id,
      ...circleData,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(circleRef, circle);

    // Create CircleMember entry for creator
    const creatorMember: CircleMember = {
      id: generateCircleMemberId(circle.id, currentUserId),
      circleId: circle.id,
      userId: currentUserId,
      role: 'creator',
      joinedAt: now,
      invitedBy: currentUserId,
      status: 'active',
    };

    await setDoc(
      doc(db, 'circles', circle.id, 'members', creatorMember.id),
      creatorMember
    );

    return circle;
  }

  /**
   * Get all circles for a user
   * @param userId User ID
   * @returns Array of circles where user is a member
   */
  async getCircles(userId: string): Promise<Circle[]> {
    const q = query(
      collection(db, 'circles'),
      where('memberIds', 'array-contains', userId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Circle));
  }

  /**
   * Get a specific circle by ID
   * @param circleId Circle ID
   * @returns Circle data
   */
  async getCircle(circleId: string): Promise<Circle> {
    const currentUserId = this.getCurrentUserId();
    const docSnap = await getDoc(doc(db, 'circles', circleId));

    if (!docSnap.exists()) {
      throw new Error('Circle not found');
    }

    const circle = { id: docSnap.id, ...docSnap.data() } as Circle;

    // Validate user is a member
    if (!circle.memberIds.includes(currentUserId)) {
      throw new Error('Not authorized to view this circle');
    }

    return circle;
  }

  /**
   * Update circle details
   * @param circleId Circle ID
   * @param updates Partial circle data to update
   */
  async updateCircle(circleId: string, updates: Partial<Circle>): Promise<void> {
    const currentUserId = this.getCurrentUserId();

    // Fetch circle to validate permissions
    const circle = await this.getCircle(circleId);

    // Validate user is creator or admin
    const isCreator = circle.createdBy === currentUserId;
    const isAdmin = await this.validateCircleAdmin(circleId, currentUserId);

    if (!isCreator && !isAdmin) {
      throw new Error('Only creator or admin can update circle');
    }

    // Prevent changing certain fields
    delete updates.id;
    delete updates.createdBy;
    delete updates.createdAt;

    await updateDoc(doc(db, 'circles', circleId), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Delete a circle (creator only)
   * @param circleId Circle ID
   */
  async deleteCircle(circleId: string): Promise<void> {
    const currentUserId = this.getCurrentUserId();
    const circle = await this.getCircle(circleId);

    // Only creator can delete
    if (circle.createdBy !== currentUserId) {
      throw new Error('Only creator can delete circle');
    }

    const batch = writeBatch(db);

    // Delete circle document
    batch.delete(doc(db, 'circles', circleId));

    // Delete members subcollection
    const membersSnapshot = await getDocs(
      collection(db, 'circles', circleId, 'members')
    );

    membersSnapshot.docs.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });

    // Delete messages subcollection
    const messagesSnapshot = await getDocs(
      collection(db, 'circles', circleId, 'messages')
    );

    messagesSnapshot.docs.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });

    // Delete invites
    const invitesQuery = query(
      collection(db, 'circleInvites'),
      where('circleId', '==', circleId)
    );
    const invitesSnapshot = await getDocs(invitesQuery);

    invitesSnapshot.docs.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });

    // Delete analytics
    batch.delete(doc(db, 'circleAnalytics', circleId));

    await batch.commit();
  }

  // ========================================================================
  // INVITATION MANAGEMENT
  // ========================================================================

  /**
   * Send circle invitation to a friend
   * @param circleId Circle ID
   * @param friendId Friend user ID
   * @param message Optional personal message
   * @returns Created invite
   */
  async inviteToCircle(
    circleId: string,
    friendId: string,
    message?: string
  ): Promise<CircleInvite> {
    const currentUserId = this.getCurrentUserId();

    // Validate current user is circle member
    const circle = await this.getCircle(circleId);

    // Check if circle allows member invites
    if (!circle.settings.allowMemberInvites && circle.createdBy !== currentUserId) {
      throw new Error('Only creator can invite when member invites are disabled');
    }

    // Validate friendId is an existing friend
    const areFriends = await this.validateFriendship(currentUserId, friendId);
    if (!areFriends) {
      throw new Error('Can only invite existing friends');
    }

    // Check if friend already in circle
    if (circle.memberIds.includes(friendId)) {
      throw new Error('User is already a circle member');
    }

    // Check for pending invite
    const existingInviteQuery = query(
      collection(db, 'circleInvites'),
      where('circleId', '==', circleId),
      where('toUserId', '==', friendId),
      where('status', '==', 'pending')
    );
    const existingInvite = await getDocs(existingInviteQuery);

    if (!existingInvite.empty) {
      throw new Error('Invite already pending');
    }

    // Create invite
    const inviteRef = doc(collection(db, 'circleInvites'));
    const now = new Date().toISOString();

    const invite: CircleInvite = {
      id: inviteRef.id,
      circleId,
      fromUserId: currentUserId,
      toUserId: friendId,
      message,
      status: 'pending',
      createdAt: now,
      expiresAt: calculateInviteExpiration(),
    };

    await setDoc(inviteRef, invite);

    return invite;
  }

  /**
   * Get all circle invites for a user
   * @param userId User ID
   * @returns Array of invites where user is recipient
   */
  async getCircleInvites(userId: string): Promise<CircleInvite[]> {
    const q = query(
      collection(db, 'circleInvites'),
      where('toUserId', '==', userId),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as CircleInvite));
  }

  /**
   * Accept a circle invitation
   * @param inviteId Invite ID
   */
  async acceptInvite(inviteId: string): Promise<void> {
    const currentUserId = this.getCurrentUserId();

    const inviteDoc = await getDoc(doc(db, 'circleInvites', inviteId));

    if (!inviteDoc.exists()) {
      throw new Error('Invite not found');
    }

    const invite = { id: inviteDoc.id, ...inviteDoc.data() } as CircleInvite;

    // Validate user is recipient
    if (invite.toUserId !== currentUserId) {
      throw new Error('Not authorized to accept this invite');
    }

    // Check if invite is still pending
    if (invite.status !== 'pending') {
      throw new Error('Invite is no longer pending');
    }

    // Check if invite is not expired
    if (new Date(invite.expiresAt) < new Date()) {
      throw new Error('Invite has expired');
    }

    const now = new Date().toISOString();
    const batch = writeBatch(db);

    // Update invite status
    batch.update(doc(db, 'circleInvites', inviteId), {
      status: 'accepted',
      respondedAt: now,
    });

    // Add user to circle memberIds
    const circleRef = doc(db, 'circles', invite.circleId);
    batch.update(circleRef, {
      memberIds: arrayUnion(currentUserId),
      updatedAt: now,
    });

    // Create CircleMember entry
    const member: CircleMember = {
      id: generateCircleMemberId(invite.circleId, currentUserId),
      circleId: invite.circleId,
      userId: currentUserId,
      role: 'member',
      joinedAt: now,
      invitedBy: invite.fromUserId,
      status: 'active',
    };

    batch.set(
      doc(db, 'circles', invite.circleId, 'members', member.id),
      member
    );

    await batch.commit();
  }

  /**
   * Reject a circle invitation
   * @param inviteId Invite ID
   */
  async rejectInvite(inviteId: string): Promise<void> {
    const currentUserId = this.getCurrentUserId();

    const inviteDoc = await getDoc(doc(db, 'circleInvites', inviteId));

    if (!inviteDoc.exists()) {
      throw new Error('Invite not found');
    }

    const invite = { id: inviteDoc.id, ...inviteDoc.data() } as CircleInvite;

    // Validate user is recipient
    if (invite.toUserId !== currentUserId) {
      throw new Error('Not authorized to reject this invite');
    }

    await updateDoc(doc(db, 'circleInvites', inviteId), {
      status: 'rejected',
      respondedAt: new Date().toISOString(),
    });
  }

  // ========================================================================
  // MEMBER MANAGEMENT
  // ========================================================================

  /**
   * Get all members of a circle
   * @param circleId Circle ID
   * @returns Array of circle members
   */
  async getCircleMembers(circleId: string): Promise<CircleMember[]> {
    // Validate user is member
    await this.getCircle(circleId);

    const q = query(
      collection(db, 'circles', circleId, 'members'),
      where('status', '==', 'active')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as CircleMember));
  }

  /**
   * Update member role (admin only)
   * @param circleId Circle ID
   * @param userId User ID to update
   * @param role New role ('admin' or 'member')
   */
  async updateMemberRole(
    circleId: string,
    userId: string,
    role: 'admin' | 'member'
  ): Promise<void> {
    const currentUserId = this.getCurrentUserId();
    const circle = await this.getCircle(circleId);

    // Only creator can change roles
    if (circle.createdBy !== currentUserId) {
      throw new Error('Only creator can change member roles');
    }

    // Cannot change creator's role
    if (circle.createdBy === userId) {
      throw new Error('Cannot change creator role');
    }

    const memberId = generateCircleMemberId(circleId, userId);
    await updateDoc(
      doc(db, 'circles', circleId, 'members', memberId),
      { role }
    );
  }

  /**
   * Remove a member from circle (admin only)
   * @param circleId Circle ID
   * @param userId User ID to remove
   * @param reason Optional removal reason
   */
  async removeMember(
    circleId: string,
    userId: string,
    reason?: string
  ): Promise<void> {
    const currentUserId = this.getCurrentUserId();
    const circle = await this.getCircle(circleId);

    // Validate current user is creator or admin
    const isCreator = circle.createdBy === currentUserId;
    const isAdmin = await this.validateCircleAdmin(circleId, currentUserId);

    if (!isCreator && !isAdmin) {
      throw new Error('Only creator or admin can remove members');
    }

    // Cannot remove creator
    if (circle.createdBy === userId) {
      throw new Error('Cannot remove creator');
    }

    const now = new Date().toISOString();
    const batch = writeBatch(db);

    // Update member status
    const memberId = generateCircleMemberId(circleId, userId);
    const memberRef = doc(db, 'circles', circleId, 'members', memberId);

    batch.update(memberRef, {
      status: 'removed',
      leftAt: now,
      removedBy: currentUserId,
      removedReason: reason,
    });

    // Remove from circle memberIds
    batch.update(doc(db, 'circles', circleId), {
      memberIds: arrayRemove(userId),
      updatedAt: now,
    });

    await batch.commit();
  }

  /**
   * Leave a circle (member self-removal)
   * @param circleId Circle ID
   * @param userId User ID leaving
   */
  async leaveCircle(circleId: string, userId: string): Promise<void> {
    const currentUserId = this.getCurrentUserId();

    // Validate user is current user
    if (userId !== currentUserId) {
      throw new Error('Can only leave your own circles');
    }

    const circle = await this.getCircle(circleId);

    // Creator cannot leave (must delete or transfer ownership)
    if (circle.createdBy === currentUserId) {
      throw new Error('Creator must delete circle or transfer ownership first');
    }

    const now = new Date().toISOString();
    const batch = writeBatch(db);

    // Update member status
    const memberId = generateCircleMemberId(circleId, currentUserId);
    const memberRef = doc(db, 'circles', circleId, 'members', memberId);

    batch.update(memberRef, {
      status: 'left',
      leftAt: now,
    });

    // Remove from circle memberIds
    batch.update(doc(db, 'circles', circleId), {
      memberIds: arrayRemove(currentUserId),
      updatedAt: now,
    });

    await batch.commit();
  }

  // ========================================================================
  // MESSAGE OPERATIONS
  // ========================================================================

  /**
   * Send a message to circle chat
   * @param circleId Circle ID
   * @param content Message content
   * @param type Message type ('text' | 'voice' | 'system')
   * @returns Created message
   */
  async sendMessage(
    circleId: string,
    content: string,
    type: 'text' | 'voice' | 'system' = 'text'
  ): Promise<CircleMessage> {
    const currentUserId = this.getCurrentUserId();

    // Validate user is circle member
    await this.getCircle(circleId);

    const messageRef = doc(collection(db, 'circles', circleId, 'messages'));
    const now = new Date().toISOString();

    const message: CircleMessage = {
      id: messageRef.id,
      circleId,
      userId: currentUserId,
      content,
      type,
      createdAt: now,
    };

    await setDoc(messageRef, message);

    return message;
  }

  /**
   * Get messages from circle chat
   * @param circleId Circle ID
   * @param limit Maximum number of messages to fetch
   * @param startAfter Message ID to start after (for pagination)
   * @returns Array of messages
   */
  async getMessages(
    circleId: string,
    limit: number = 50,
    startAfterId?: string
  ): Promise<CircleMessage[]> {
    // Validate user is circle member
    await this.getCircle(circleId);

    let q = query(
      collection(db, 'circles', circleId, 'messages'),
      orderBy('createdAt', 'desc'),
      firestoreLimit(limit)
    );

    if (startAfterId) {
      const startDocSnap = await getDoc(
        doc(db, 'circles', circleId, 'messages', startAfterId)
      );

      if (startDocSnap.exists()) {
        q = query(
          collection(db, 'circles', circleId, 'messages'),
          orderBy('createdAt', 'desc'),
          startAfter(startDocSnap),
          firestoreLimit(limit)
        );
      }
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as CircleMessage));
  }

  /**
   * Delete a message (author or admin only)
   * @param circleId Circle ID
   * @param messageId Message ID
   */
  async deleteMessage(circleId: string, messageId: string): Promise<void> {
    const currentUserId = this.getCurrentUserId();

    const messageDoc = await getDoc(
      doc(db, 'circles', circleId, 'messages', messageId)
    );

    if (!messageDoc.exists()) {
      throw new Error('Message not found');
    }

    const message = { id: messageDoc.id, ...messageDoc.data() } as CircleMessage;

    // Validate user is author or admin
    const isAuthor = message.userId === currentUserId;
    const isAdmin = await this.validateCircleAdmin(circleId, currentUserId);

    if (!isAuthor && !isAdmin) {
      throw new Error('Only author or admin can delete message');
    }

    // Soft delete
    await updateDoc(doc(db, 'circles', circleId, 'messages', messageId), {
      deletedAt: new Date().toISOString(),
    });
  }

  /**
   * Add a reaction to a message
   * @param circleId Circle ID
   * @param messageId Message ID
   * @param emoji Emoji reaction
   */
  async addReaction(circleId: string, messageId: string, emoji: string): Promise<void> {
    const currentUserId = this.getCurrentUserId();

    // Validate user is circle member
    await this.getCircle(circleId);

    const messageDoc = await getDoc(
      doc(db, 'circles', circleId, 'messages', messageId)
    );

    if (!messageDoc.exists()) {
      throw new Error('Message not found');
    }

    const message = { id: messageDoc.id, ...messageDoc.data() } as CircleMessage;
    const reactions = message.reactions || [];

    // Remove existing reaction from this user
    const filteredReactions = reactions.filter((r) => r.userId !== currentUserId);

    // Add new reaction
    filteredReactions.push({
      userId: currentUserId,
      emoji,
      createdAt: new Date().toISOString(),
    });

    await updateDoc(doc(db, 'circles', circleId, 'messages', messageId), {
      reactions: filteredReactions,
    });
  }

  // ========================================================================
  // ANALYTICS
  // ========================================================================

  /**
   * Get analytics for a circle
   * @param circleId Circle ID
   * @returns Circle analytics or null if not yet generated
   */
  async getAnalytics(circleId: string): Promise<CircleAnalytics | null> {
    // Validate user is circle member
    await this.getCircle(circleId);

    const docSnap = await getDoc(doc(db, 'circleAnalytics', circleId));

    if (!docSnap.exists()) {
      return null;
    }

    return { id: docSnap.id, ...docSnap.data() } as CircleAnalytics;
  }

  // ========================================================================
  // VALIDATION HELPERS
  // ========================================================================

  /**
   * Validate that two users are friends
   * @param userId1 First user ID
   * @param userId2 Second user ID
   * @returns True if users are friends
   */
  private async validateFriendship(userId1: string, userId2: string): Promise<boolean> {
    const friendship1 = await getDoc(doc(db, 'friends', `${userId1}_${userId2}`));

    if (friendship1.exists()) {
      return true;
    }

    const friendship2 = await getDoc(doc(db, 'friends', `${userId2}_${userId1}`));

    return friendship2.exists();
  }

  /**
   * Validate that user is a member of circle
   * @param circleId Circle ID
   * @param userId User ID
   * @returns True if user is circle member
   */
  private async validateCircleMembership(circleId: string, userId: string): Promise<boolean> {
    try {
      const circle = await this.getCircle(circleId);
      return circle.memberIds.includes(userId);
    } catch {
      return false;
    }
  }

  /**
   * Validate that user is admin of circle
   * @param circleId Circle ID
   * @param userId User ID
   * @returns True if user is creator or admin
   */
  private async validateCircleAdmin(circleId: string, userId: string): Promise<boolean> {
    try {
      const memberId = generateCircleMemberId(circleId, userId);
      const memberDoc = await getDoc(
        doc(db, 'circles', circleId, 'members', memberId)
      );

      if (!memberDoc.exists()) {
        return false;
      }

      const member = { id: memberDoc.id, ...memberDoc.data() } as CircleMember;
      return member.role === 'creator' || member.role === 'admin';
    } catch {
      return false;
    }
  }
}
