/**
 * Infrastructure Cost Tracker Service
 * Tracks Firestore, Storage, Functions, and Pinecone storage costs
 *
 * Uses aggregated tracking (batch counts, flush periodically) to minimize overhead.
 * Firestore operations are batched and flushed every 60 seconds to reduce writes.
 *
 * IMPORTANT: This service should only be used server-side (API routes, Cloud Functions)
 */

import {
  calculateFirestoreCost,
  calculateFunctionCost,
  calculateStorageCost,
  calculatePineconeStorageCost,
  FIRESTORE_PRICING,
  FUNCTIONS_PRICING,
} from '@/lib/config/pricing';
import type {
  InfrastructureCostEvent,
  InfrastructureService,
  InfrastructureOperation,
} from '@/lib/models/InfrastructureCost';

/**
 * Aggregated Firestore operation counts
 */
interface FirestoreCounts {
  reads: number;
  writes: number;
  deletes: number;
}

/**
 * Aggregated Storage operation counts
 */
interface StorageCounts {
  uploadBytes: number;
  downloadBytes: number;
}

/**
 * InfrastructureCostTracker Singleton Service
 * Logs infrastructure cost events to Firestore
 */
class InfrastructureCostTracker {
  private static instance: InfrastructureCostTracker;

  // Aggregated counters (flushed periodically to reduce Firestore writes)
  private firestoreCounts: FirestoreCounts = { reads: 0, writes: 0, deletes: 0 };
  private storageCounts: StorageCounts = { uploadBytes: 0, downloadBytes: 0 };
  private lastFlushTime: number = Date.now();
  private flushIntervalMs: number = 60000; // 60 seconds
  private isEnabled: boolean = true;

  private constructor() {
    // Prevent direct construction
    if (typeof window !== 'undefined') {
      throw new Error('InfrastructureCostTracker cannot be instantiated in the browser!');
    }
  }

  /**
   * Get singleton instance
   */
  static getInstance(): InfrastructureCostTracker {
    if (!InfrastructureCostTracker.instance) {
      InfrastructureCostTracker.instance = new InfrastructureCostTracker();
    }
    return InfrastructureCostTracker.instance;
  }

  /**
   * Enable or disable tracking (useful for testing)
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Track Firestore read operations
   * @param count - Number of reads (default: 1)
   */
  trackFirestoreRead(count: number = 1): void {
    if (!this.isEnabled) return;
    this.firestoreCounts.reads += count;
    this.checkAndFlush();
  }

  /**
   * Track Firestore write operations
   * @param count - Number of writes (default: 1)
   */
  trackFirestoreWrite(count: number = 1): void {
    if (!this.isEnabled) return;
    this.firestoreCounts.writes += count;
    this.checkAndFlush();
  }

  /**
   * Track Firestore delete operations
   * @param count - Number of deletes (default: 1)
   */
  trackFirestoreDelete(count: number = 1): void {
    if (!this.isEnabled) return;
    this.firestoreCounts.deletes += count;
    this.checkAndFlush();
  }

  /**
   * Track Storage upload
   * @param bytes - Number of bytes uploaded
   * @param userId - Optional user ID
   */
  trackStorageUpload(bytes: number, userId?: string): void {
    if (!this.isEnabled) return;
    this.storageCounts.uploadBytes += bytes;
    this.checkAndFlush();
  }

  /**
   * Track Storage download
   * @param bytes - Number of bytes downloaded
   * @param userId - Optional user ID
   */
  trackStorageDownload(bytes: number, userId?: string): void {
    if (!this.isEnabled) return;
    this.storageCounts.downloadBytes += bytes;
    this.checkAndFlush();
  }

  /**
   * Track Cloud Function execution
   * This is called directly (not aggregated) since function executions are less frequent
   */
  async trackFunctionExecution(
    functionName: string,
    durationMs: number,
    memoryMB: number = 256,
    success: boolean = true,
    userId?: string
  ): Promise<void> {
    if (!this.isEnabled) return;

    const gbSeconds = (memoryMB / 1024) * (durationMs / 1000);
    const cost = calculateFunctionCost(1, gbSeconds);

    await this.logInfrastructureEvent({
      service: 'functions',
      operation: 'invocation',
      quantity: 1,
      unit: 'invocations',
      estimatedCostUSD: cost,
      userId,
      metadata: {
        functionName,
        durationMs,
        memoryMB,
        gbSeconds,
        success,
      },
    });

    console.log(
      `[InfrastructureCostTracker] Function ${functionName}: ${durationMs}ms, $${cost.toFixed(8)}`
    );
  }

  /**
   * Track Pinecone storage snapshot (called by scheduled function)
   * @param mainIndexVectors - Number of vectors in main index
   * @param mainIndexDimensions - Dimensions in main index (default: 1536)
   * @param visualIndexVectors - Number of vectors in visual index (optional)
   * @param visualIndexDimensions - Dimensions in visual index (default: 512)
   */
  async trackPineconeStorageSnapshot(
    mainIndexVectors: number,
    mainIndexDimensions: number = 1536,
    visualIndexVectors: number = 0,
    visualIndexDimensions: number = 512
  ): Promise<void> {
    if (!this.isEnabled) return;

    // Calculate storage in GB
    const mainStorageGB = (mainIndexVectors * mainIndexDimensions * 4) / (1024 ** 3);
    const visualStorageGB = (visualIndexVectors * visualIndexDimensions * 4) / (1024 ** 3);
    const totalStorageGB = mainStorageGB + visualStorageGB;

    // Calculate daily cost (monthly / 30)
    const dailyCost = calculatePineconeStorageCost(totalStorageGB) / 30;

    await this.logInfrastructureEvent({
      service: 'pinecone_storage',
      operation: 'storage_snapshot',
      quantity: totalStorageGB,
      unit: 'gb',
      estimatedCostUSD: dailyCost,
      metadata: {
        mainIndexVectors,
        mainIndexStorageGB: mainStorageGB,
        visualIndexVectors,
        visualIndexStorageGB: visualStorageGB,
        totalStorageGB,
      },
    });

    console.log(
      `[InfrastructureCostTracker] Pinecone Storage: ${totalStorageGB.toFixed(4)} GB, $${dailyCost.toFixed(6)}/day`
    );
  }

  /**
   * Force flush all aggregated counts to Firestore
   * Call this when shutting down or when you need immediate persistence
   */
  async forceFlush(): Promise<void> {
    await this.flushCounts();
  }

  /**
   * Check if it's time to flush and flush if needed
   */
  private async checkAndFlush(): Promise<void> {
    const now = Date.now();
    if (now - this.lastFlushTime >= this.flushIntervalMs) {
      await this.flushCounts();
    }
  }

  /**
   * Flush aggregated counts to Firestore
   */
  private async flushCounts(): Promise<void> {
    this.lastFlushTime = Date.now();

    // Capture current counts and reset
    const firestore = { ...this.firestoreCounts };
    const storage = { ...this.storageCounts };

    this.firestoreCounts = { reads: 0, writes: 0, deletes: 0 };
    this.storageCounts = { uploadBytes: 0, downloadBytes: 0 };

    // Log Firestore operations if any
    const firestoreTotal = firestore.reads + firestore.writes + firestore.deletes;
    if (firestoreTotal > 0) {
      const cost = calculateFirestoreCost(firestore.reads, firestore.writes, firestore.deletes);

      // Log reads
      if (firestore.reads > 0) {
        await this.logInfrastructureEvent({
          service: 'firestore',
          operation: 'read',
          quantity: firestore.reads,
          unit: 'operations',
          estimatedCostUSD: (firestore.reads / 1000) * FIRESTORE_PRICING.readsPerK,
          metadata: {
            aggregationPeriod: `${this.flushIntervalMs / 1000}s`,
          },
        });
      }

      // Log writes
      if (firestore.writes > 0) {
        await this.logInfrastructureEvent({
          service: 'firestore',
          operation: 'write',
          quantity: firestore.writes,
          unit: 'operations',
          estimatedCostUSD: (firestore.writes / 1000) * FIRESTORE_PRICING.writesPerK,
          metadata: {
            aggregationPeriod: `${this.flushIntervalMs / 1000}s`,
          },
        });
      }

      // Log deletes
      if (firestore.deletes > 0) {
        await this.logInfrastructureEvent({
          service: 'firestore',
          operation: 'delete',
          quantity: firestore.deletes,
          unit: 'operations',
          estimatedCostUSD: (firestore.deletes / 1000) * FIRESTORE_PRICING.deletesPerK,
          metadata: {
            aggregationPeriod: `${this.flushIntervalMs / 1000}s`,
          },
        });
      }

      console.log(
        `[InfrastructureCostTracker] Firestore: ${firestore.reads}R/${firestore.writes}W/${firestore.deletes}D, $${cost.toFixed(8)}`
      );
    }

    // Log Storage operations if any
    const storageTotal = storage.uploadBytes + storage.downloadBytes;
    if (storageTotal > 0) {
      const downloadGB = storage.downloadBytes / (1024 ** 3);
      const cost = calculateStorageCost(0, downloadGB); // Upload is free

      if (storage.downloadBytes > 0) {
        await this.logInfrastructureEvent({
          service: 'storage',
          operation: 'download',
          quantity: storage.downloadBytes,
          unit: 'bytes',
          estimatedCostUSD: cost,
          metadata: {
            aggregationPeriod: `${this.flushIntervalMs / 1000}s`,
          },
        });
      }

      // Note: Upload is free but we still track it for visibility
      if (storage.uploadBytes > 0) {
        await this.logInfrastructureEvent({
          service: 'storage',
          operation: 'upload',
          quantity: storage.uploadBytes,
          unit: 'bytes',
          estimatedCostUSD: 0, // Upload is free
          metadata: {
            aggregationPeriod: `${this.flushIntervalMs / 1000}s`,
          },
        });
      }

      console.log(
        `[InfrastructureCostTracker] Storage: ${(storage.uploadBytes / 1024).toFixed(1)}KB up, ${(storage.downloadBytes / 1024).toFixed(1)}KB down, $${cost.toFixed(8)}`
      );
    }
  }

  /**
   * Log infrastructure cost event to Firestore
   */
  private async logInfrastructureEvent(
    event: Omit<InfrastructureCostEvent, 'id' | 'timestamp'>
  ): Promise<void> {
    try {
      // Import Firebase Admin helper dynamically (only on server)
      const { getAdminFirestore } = await import('@/lib/api/firebase/admin');

      // Get Firestore instance using the admin helper
      const db = getAdminFirestore();

      // Create document in infrastructureCosts collection
      const costEvent: Omit<InfrastructureCostEvent, 'id'> = {
        ...event,
        timestamp: new Date().toISOString(),
      };

      await db.collection('infrastructureCosts').add(costEvent);
    } catch (error) {
      console.error('[InfrastructureCostTracker] Error logging infrastructure event:', error);
      // Don't throw error - we don't want tracking failures to break operations
    }
  }

  /**
   * Get current aggregated counts (for debugging)
   */
  getCurrentCounts(): { firestore: FirestoreCounts; storage: StorageCounts } {
    return {
      firestore: { ...this.firestoreCounts },
      storage: { ...this.storageCounts },
    };
  }
}

// Export singleton getter function (not instance, to avoid initialization issues)
export function getInfrastructureCostTracker(): InfrastructureCostTracker {
  return InfrastructureCostTracker.getInstance();
}

// Also export the class for type checking
export { InfrastructureCostTracker };
