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
  Timestamp,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from './config';

/**
 * Infrastructure cost tracking helper
 * Only tracks on server-side; no-op on client-side
 */
const trackFirestoreOp = async (type: 'read' | 'write' | 'delete', count: number = 1) => {
  // Only track on server-side (avoid browser errors)
  if (typeof window !== 'undefined') return;

  try {
    const { getInfrastructureCostTracker } = await import('@/lib/services/usage/InfrastructureCostTracker');
    const tracker = getInfrastructureCostTracker();

    switch (type) {
      case 'read':
        tracker.trackFirestoreRead(count);
        break;
      case 'write':
        tracker.trackFirestoreWrite(count);
        break;
      case 'delete':
        tracker.trackFirestoreDelete(count);
        break;
    }
  } catch (error) {
    // Silently ignore tracking errors to not break operations
    console.debug('[Firestore] Tracking skipped:', error);
  }
};

/**
 * Helper to convert Firestore Timestamps to ISO strings for Redux serialization
 */
function serializeFirestoreData(data: any): any {
  if (!data) return data;

  // Check for Firestore Timestamp (has toDate method)
  if (data && typeof data === 'object' && typeof data.toDate === 'function') {
    try {
      return data.toDate().toISOString();
    } catch (e) {
      console.warn('Failed to convert timestamp:', data);
      return null;
    }
  }

  if (Array.isArray(data)) {
    return data.map(serializeFirestoreData);
  }

  if (typeof data === 'object' && data !== null) {
    const serialized: any = {};
    for (const [key, value] of Object.entries(data)) {
      serialized[key] = serializeFirestoreData(value);
    }
    return serialized;
  }

  return data;
}

/**
 * Firestore service for web
 * Provides basic CRUD operations
 * More specific methods will be added as services are ported
 */
export class FirestoreService {
  private static instance: FirestoreService;

  static getInstance(): FirestoreService {
    if (!FirestoreService.instance) {
      FirestoreService.instance = new FirestoreService();
    }
    return FirestoreService.instance;
  }

  /**
   * Get a document by ID
   */
  async getDocument<T>(collectionName: string, documentId: string): Promise<T | null> {
    const docRef = doc(db, collectionName, documentId);
    const docSnap = await getDoc(docRef);

    // Track read operation
    trackFirestoreOp('read', 1);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...serializeFirestoreData(data)
      } as T;
    }
    return null;
  }

  /**
   * Get documents with query constraints
   */
  async getDocuments<T>(
    collectionName: string,
    constraints: QueryConstraint[] = []
  ): Promise<T[]> {
    const q = query(collection(db, collectionName), ...constraints);
    const querySnapshot = await getDocs(q);

    // Track read operations (1 per document returned)
    trackFirestoreOp('read', querySnapshot.size);

    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...serializeFirestoreData(data),
      };
    }) as T[];
  }

  /**
   * Query collection with custom where clauses and ordering
   */
  async queryCollection<T>(
    collectionName: string,
    whereClauses: Array<{ field: string; operator: any; value: any }> = [],
    orderByClause?: { field: string; direction: 'asc' | 'desc' }
  ): Promise<T[]> {
    const constraints: QueryConstraint[] = [];

    // Add where clauses
    whereClauses.forEach(clause => {
      constraints.push(where(clause.field, clause.operator, clause.value));
    });

    // Add orderBy if provided
    if (orderByClause) {
      constraints.push(orderBy(orderByClause.field, orderByClause.direction));
    }

    return this.getDocuments<T>(collectionName, constraints);
  }

  /**
   * Add a new document with auto-generated ID
   */
  async addDocument(collectionName: string, data: any): Promise<string> {
    const collectionRef = collection(db, collectionName);
    const docRef = doc(collectionRef);
    await setDoc(docRef, data);

    // Track write operation
    trackFirestoreOp('write', 1);

    return docRef.id;
  }

  /**
   * Create or update a document
   */
  async setDocument(
    collectionName: string,
    documentId: string,
    data: any
  ): Promise<void> {
    const docRef = doc(db, collectionName, documentId);
    await setDoc(docRef, data, { merge: true });

    // Track write operation
    trackFirestoreOp('write', 1);
  }

  /**
   * Update a document
   */
  async updateDocument(
    collectionName: string,
    documentId: string,
    data: any
  ): Promise<void> {
    const docRef = doc(db, collectionName, documentId);
    await updateDoc(docRef, data);

    // Track write operation
    trackFirestoreOp('write', 1);
  }

  /**
   * Delete a document
   */
  async deleteDocument(collectionName: string, documentId: string): Promise<void> {
    const docRef = doc(db, collectionName, documentId);
    await deleteDoc(docRef);

    // Track delete operation
    trackFirestoreOp('delete', 1);
  }

  /**
   * Get user data
   */
  async getUserData(userId: string): Promise<any> {
    return this.getDocument('users', userId);
  }

  /**
   * Update user data
   */
  async updateUserData(userId: string, data: any): Promise<void> {
    await this.setDocument('users', userId, data);
  }

  /**
   * Get health data for a user
   */
  async getHealthData(userId: string, limitCount: number = 50): Promise<any[]> {
    return this.getDocuments('healthData', [
      where('userId', '==', userId),
      orderBy('startDate', 'desc'),
      firestoreLimit(limitCount),
    ]);
  }

  /**
   * Get location data for a user
   */
  async getLocationData(userId: string, limitCount: number = 50): Promise<any[]> {
    return this.getDocuments('locationData', [
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      firestoreLimit(limitCount),
    ]);
  }

  /**
   * Create a voice note
   */
  async createVoiceNote(noteId: string, voiceNote: any): Promise<void> {
    await this.setDocument('voiceNotes', noteId, voiceNote);
  }

  /**
   * Get voice notes for a user
   */
  async getVoiceNotes(userId: string, limitCount: number = 50): Promise<any[]> {
    return this.getDocuments('voiceNotes', [
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      firestoreLimit(limitCount),
    ]);
  }

  /**
   * Create a photo memory
   */
  async createPhotoMemory(photoId: string, photoMemory: any): Promise<void> {
    await this.setDocument('photoMemories', photoId, photoMemory);
  }

  /**
   * Get photo memories for a user
   */
  async getPhotoMemories(userId: string, limitCount: number = 50): Promise<any[]> {
    return this.getDocuments('photoMemories', [
      where('userId', '==', userId),
      orderBy('takenAt', 'desc'),
      firestoreLimit(limitCount),
    ]);
  }

  /**
   * Get text notes (diary entries) for a user
   */
  async getTextNotes(userId: string, limitCount: number = 50): Promise<any[]> {
    return this.getDocuments('textNotes', [
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      firestoreLimit(limitCount),
    ]);
  }

  /**
   * Create a text note (diary entry)
   */
  async createTextNote(noteId: string, textNote: any): Promise<void> {
    await this.setDocument('textNotes', noteId, textNote);
  }

  /**
   * Update a text note (diary entry)
   */
  async updateTextNote(noteId: string, updates: any): Promise<void> {
    await this.updateDocument('textNotes', noteId, updates);
  }

  /**
   * Delete a text note (diary entry)
   */
  async deleteTextNote(noteId: string): Promise<void> {
    await this.deleteDocument('textNotes', noteId);
  }

  /**
   * Get a single text note by ID
   */
  async getTextNoteById(noteId: string): Promise<any> {
    return this.getDocument('textNotes', noteId);
  }

  /**
   * Get data statistics for dashboard
   */
  async getDataStats(userId: string): Promise<{
    healthCount: number;
    locationCount: number;
    voiceCount: number;
    photoCount: number;
    textNoteCount: number;
  }> {
    const [health, locations, voice, photos, textNotes] = await Promise.all([
      this.getDocuments('healthData', [where('userId', '==', userId)]),
      this.getDocuments('locationData', [where('userId', '==', userId)]),
      this.getDocuments('voiceNotes', [where('userId', '==', userId)]),
      this.getDocuments('photoMemories', [where('userId', '==', userId)]),
      this.getDocuments('textNotes', [where('userId', '==', userId)]),
    ]);

    return {
      healthCount: health.length,
      locationCount: locations.length,
      voiceCount: voice.length,
      photoCount: photos.length,
      textNoteCount: textNotes.length,
    };
  }

  /**
   * Get extracted events for a user with optional date range filtering
   * Used by RAGEngine for temporal reasoning
   *
   * @param userId - User ID
   * @param options - Query options
   * @param options.startDate - Filter events after this date (inclusive)
   * @param options.endDate - Filter events before this date (inclusive)
   * @param options.limit - Maximum number of events to return (default: 50)
   * @returns Array of extracted events sorted by datetime (newest first)
   */
  async getEvents(
    userId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<any[]> {
    const constraints: QueryConstraint[] = [where('userId', '==', userId)];

    // Add date range filters if provided
    if (options?.startDate) {
      constraints.push(where('datetime', '>=', Timestamp.fromDate(options.startDate)));
    }
    if (options?.endDate) {
      constraints.push(where('datetime', '<=', Timestamp.fromDate(options.endDate)));
    }

    // Order by datetime (newest first for RAG relevance)
    constraints.push(orderBy('datetime', 'desc'));

    // Apply limit
    constraints.push(firestoreLimit(options?.limit || 50));

    return this.getDocuments('events', constraints);
  }

  /**
   * Get circle by ID (for RAG circle queries)
   */
  async getCircle(circleId: string): Promise<any> {
    return this.getDocument('circles', circleId);
  }

  /**
   * Get privacy settings for multiple friends (batch fetch)
   *
   * Used by RAGEngine to efficiently fetch per-friend settings when
   * processing circle queries. This allows computing effective sharing
   * (intersection of circle settings and per-friend settings).
   *
   * @param userId - Current user's ID
   * @param friendIds - Array of friend user IDs to fetch settings for
   * @returns Map of friendId -> FriendPrivacySettings
   */
  async getPrivacySettingsForFriends(
    userId: string,
    friendIds: string[]
  ): Promise<Map<string, { shareHealth: boolean; shareLocation: boolean; shareActivities: boolean; shareVoiceNotes: boolean; sharePhotos: boolean }>> {
    console.log('[Firestore] Fetching privacy settings for', friendIds.length, 'friends');
    const result = new Map<string, { shareHealth: boolean; shareLocation: boolean; shareActivities: boolean; shareVoiceNotes: boolean; sharePhotos: boolean }>();

    if (friendIds.length === 0) {
      return result;
    }

    // Fetch friendship documents in parallel
    const friendshipPromises = friendIds.map(friendId =>
      this.getDocuments('friends', [
        where('userId', '==', userId),
        where('friendUid', '==', friendId),
        firestoreLimit(1),
      ])
    );

    const friendshipResults = await Promise.all(friendshipPromises);

    friendshipResults.forEach((docs, index) => {
      if (docs.length > 0) {
        const data = docs[0] as any;
        if (data.privacySettings) {
          result.set(friendIds[index], data.privacySettings);
        }
      }
    });

    console.log('[Firestore] Retrieved privacy settings for', result.size, 'friends');
    return result;
  }
}

// Export singleton instance
export default FirestoreService.getInstance();
