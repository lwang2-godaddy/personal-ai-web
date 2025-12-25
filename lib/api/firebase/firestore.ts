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

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as T;
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

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as T[];
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
  }

  /**
   * Delete a document
   */
  async deleteDocument(collectionName: string, documentId: string): Promise<void> {
    const docRef = doc(db, collectionName, documentId);
    await deleteDoc(docRef);
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
}

// Export singleton instance
export default FirestoreService.getInstance();
