import { Pinecone, RecordMetadata } from '@pinecone-database/pinecone';
import { PineconeVector, PineconeQueryResult, VectorMetadata } from '@/lib/models/Pinecone';

export class PineconeService {
  private static instance: PineconeService;
  private client: Pinecone | null = null;
  private indexName: string;

  private constructor() {
    // CRITICAL: This service must ONLY run on the server
    // If you see this error in browser, you're importing it in a client component!
    if (typeof window !== 'undefined') {
      throw new Error(
        'PineconeService cannot run in the browser! ' +
        'API keys must stay on the server. ' +
        'Use it only in API routes (app/api/**/route.ts).'
      );
    }

    // Server-side only - API key is NOT exposed to browser
    this.indexName = process.env.PINECONE_INDEX || 'personal-ai-data';
  }

  private getClient(): Pinecone {
    if (!this.client) {
      const apiKey = process.env.PINECONE_API_KEY;
      if (!apiKey) {
        throw new Error(
          'PINECONE_API_KEY is not set - make sure to configure it in environment variables. ' +
          'This variable should NOT have the NEXT_PUBLIC_ prefix.'
        );
      }
      this.client = new Pinecone({ apiKey });
    }
    return this.client;
  }

  static getInstance(): PineconeService {
    if (!PineconeService.instance) {
      PineconeService.instance = new PineconeService();
    }
    return PineconeService.instance;
  }

  /**
   * Initialize Pinecone index
   * Creates index if it doesn't exist
   */
  async initializeIndex(): Promise<void> {
    try {
      const client = this.getClient();
      const indexes = await client.listIndexes();
      const indexExists = indexes.indexes?.some((index) => index.name === this.indexName);

      if (!indexExists) {
        await client.createIndex({
          name: this.indexName,
          dimension: 1024, // text-embedding-3-small with reduced dimensions
          metric: 'cosine',
          spec: {
            serverless: {
              cloud: 'aws',
              region: 'us-east-1',
            },
          },
        });

        console.log(`Created Pinecone index: ${this.indexName}`);
      } else {
        console.log(`Pinecone index already exists: ${this.indexName}`);
      }
    } catch (error) {
      console.error('Pinecone index initialization error:', error);
      throw error;
    }
  }

  /**
   * Upsert a single vector
   */
  async upsertVector(vector: PineconeVector, userId?: string, endpoint?: string): Promise<string> {
    try {
      const client = this.getClient();
      const index = client.Index(this.indexName);

      await index.upsert([
        {
          id: vector.id,
          values: vector.values,
          metadata: vector.metadata as RecordMetadata,
        },
      ]);

      // Track usage if userId provided
      if (userId && typeof window === 'undefined') {
        const UsageTracker = (await import('@/lib/services/usage/UsageTracker')).default;
        await UsageTracker.trackPineconeUpsert(userId, 1, endpoint || 'pinecone_upsert');
      }

      return vector.id;
    } catch (error) {
      console.error('Pinecone upsert error:', error);
      throw error;
    }
  }

  /**
   * Upsert multiple vectors in batch
   */
  async upsertVectorsBatch(vectors: PineconeVector[], userId?: string, endpoint?: string): Promise<void> {
    try {
      const client = this.getClient();
      const index = client.Index(this.indexName);

      // Pinecone recommends batching in groups of 100
      const batchSize = 100;
      for (let i = 0; i < vectors.length; i += batchSize) {
        const batch = vectors.slice(i, i + batchSize);
        await index.upsert(
          batch.map((v) => ({
            id: v.id,
            values: v.values,
            metadata: v.metadata as RecordMetadata,
          })),
        );
      }

      // Track usage if userId provided
      if (userId && typeof window === 'undefined') {
        const UsageTracker = (await import('@/lib/services/usage/UsageTracker')).default;
        await UsageTracker.trackPineconeUpsert(userId, vectors.length, endpoint || 'pinecone_upsert_batch');
      }

      console.log(`Upserted ${vectors.length} vectors in batches of ${batchSize}`);
    } catch (error) {
      console.error('Pinecone batch upsert error:', error);
      throw error;
    }
  }

  /**
   * Query vectors by embedding
   * Returns top K most similar vectors
   */
  async queryVectors(
    queryVector: number[],
    userId: string,
    topK = 10,
    filter?: Record<string, any>,
    endpoint?: string
  ): Promise<PineconeQueryResult[]> {
    try {
      const client = this.getClient();
      const index = client.Index(this.indexName);

      const queryFilter: Record<string, any> = {
        userId: { $eq: userId },
        ...filter,
      };

      const queryResponse = await index.query({
        vector: queryVector,
        topK,
        includeMetadata: true,
        filter: queryFilter,
      });

      // Track usage
      if (typeof window === 'undefined') {
        const UsageTracker = (await import('@/lib/services/usage/UsageTracker')).default;
        await UsageTracker.trackPineconeQuery(userId, topK, endpoint || 'pinecone_query');
      }

      return (
        queryResponse.matches?.map((match) => ({
          id: match.id,
          score: match.score || 0,
          metadata: match.metadata as VectorMetadata,
        })) || []
      );
    } catch (error) {
      console.error('Pinecone query error:', error);
      throw error;
    }
  }

  /**
   * Query vectors by data type
   */
  async queryVectorsByType(
    queryVector: number[],
    userId: string,
    dataType: 'health' | 'location' | 'voice' | 'photo',
    topK = 10,
    endpoint?: string
  ): Promise<PineconeQueryResult[]> {
    return this.queryVectors(queryVector, userId, topK, {
      type: { $eq: dataType },
    }, endpoint || `pinecone_query_${dataType}`);
  }

  /**
   * Query location vectors by activity
   */
  async queryLocationsByActivity(
    queryVector: number[],
    userId: string,
    activity: string,
    topK = 10,
    endpoint?: string
  ): Promise<PineconeQueryResult[]> {
    return this.queryVectors(queryVector, userId, topK, {
      type: { $eq: 'location' },
      activity: { $eq: activity },
    }, endpoint || 'pinecone_query_location_activity');
  }

  /**
   * Query vectors by date range
   */
  async queryVectorsByDateRange(
    queryVector: number[],
    userId: string,
    startDate: string,
    endDate: string,
    topK = 10,
    endpoint?: string
  ): Promise<PineconeQueryResult[]> {
    return this.queryVectors(queryVector, userId, topK, {
      date: {
        $gte: startDate,
        $lte: endDate,
      },
    }, endpoint || 'pinecone_query_date_range');
  }

  /**
   * Delete a single vector
   */
  async deleteVector(vectorId: string, userId?: string, endpoint?: string): Promise<void> {
    try {
      const client = this.getClient();
      const index = client.Index(this.indexName);
      await index.deleteOne(vectorId);

      // Track usage if userId provided
      if (userId && typeof window === 'undefined') {
        const UsageTracker = (await import('@/lib/services/usage/UsageTracker')).default;
        await UsageTracker.trackPineconeDelete(userId, 1, endpoint || 'pinecone_delete');
      }
    } catch (error) {
      console.error('Pinecone delete error:', error);
      throw error;
    }
  }

  /**
   * Delete all vectors for a user
   */
  async deleteUserData(userId: string): Promise<void> {
    try {
      const client = this.getClient();
      const index = client.Index(this.indexName);
      await index.deleteMany({
        userId: { $eq: userId },
      });
      console.log(`Deleted all vectors for user: ${userId}`);
    } catch (error) {
      console.error('Pinecone delete user data error:', error);
      throw error;
    }
  }

  /**
   * Get index stats
   */
  async getIndexStats(): Promise<any> {
    try {
      const client = this.getClient();
      const index = client.Index(this.indexName);
      return await index.describeIndexStats();
    } catch (error) {
      console.error('Pinecone stats error:', error);
      throw error;
    }
  }

  /**
   * Fetch vectors by IDs
   */
  async fetchVectors(ids: string[]): Promise<Record<string, PineconeVector>> {
    try {
      const client = this.getClient();
      const index = client.Index(this.indexName);
      const response = await index.fetch(ids);

      const result: Record<string, PineconeVector> = {};
      if (response.records) {
        Object.entries(response.records).forEach(([id, record]) => {
          if (record && record.values) {
            result[id] = {
              id,
              values: record.values,
              metadata: record.metadata as VectorMetadata,
            };
          }
        });
      }

      return result;
    } catch (error) {
      console.error('Pinecone fetch error:', error);
      throw error;
    }
  }

  /**
   * Query vectors for multiple users (for friend/group queries)
   * Supports querying across multiple user IDs with privacy filtering
   */
  async queryMultiUserVectors(
    queryVector: number[],
    userIds: string[],
    topK = 10,
    additionalFilter?: Record<string, any>,
    requestingUserId?: string,
    endpoint?: string
  ): Promise<PineconeQueryResult[]> {
    try {
      const client = this.getClient();
      const index = client.Index(this.indexName);

      // Build filter for multiple users
      const queryFilter: Record<string, any> = {
        userId: { $in: userIds },
        ...additionalFilter,
      };

      const queryResponse = await index.query({
        vector: queryVector,
        topK,
        includeMetadata: true,
        filter: queryFilter,
      });

      // Track usage if requesting user provided
      if (requestingUserId && typeof window === 'undefined') {
        const UsageTracker = (await import('@/lib/services/usage/UsageTracker')).default;
        await UsageTracker.trackPineconeQuery(
          requestingUserId,
          topK,
          endpoint || 'pinecone_query_multi_user'
        );
      }

      return (
        queryResponse.matches?.map((match) => ({
          id: match.id,
          score: match.score || 0,
          metadata: match.metadata as VectorMetadata,
        })) || []
      );
    } catch (error) {
      console.error('Pinecone multi-user query error:', error);
      throw error;
    }
  }

  /**
   * Query vectors by participants (for shared activities)
   */
  async queryByParticipants(
    queryVector: number[],
    userIds: string[],
    topK = 10,
    additionalFilter?: Record<string, any>,
    requestingUserId?: string,
    endpoint?: string
  ): Promise<PineconeQueryResult[]> {
    try {
      const client = this.getClient();
      const index = client.Index(this.indexName);

      const queryFilter: Record<string, any> = {
        type: { $eq: 'shared_activity' },
        participants: { $in: userIds },
        ...additionalFilter,
      };

      const queryResponse = await index.query({
        vector: queryVector,
        topK,
        includeMetadata: true,
        filter: queryFilter,
      });

      // Track usage if requesting user provided
      if (requestingUserId && typeof window === 'undefined') {
        const UsageTracker = (await import('@/lib/services/usage/UsageTracker')).default;
        await UsageTracker.trackPineconeQuery(
          requestingUserId,
          topK,
          endpoint || 'pinecone_query_participants'
        );
      }

      return (
        queryResponse.matches?.map((match) => ({
          id: match.id,
          score: match.score || 0,
          metadata: match.metadata as VectorMetadata,
        })) || []
      );
    } catch (error) {
      console.error('Pinecone participants query error:', error);
      throw error;
    }
  }

  // ============ VISUAL INDEX METHODS (512D CLIP) ============

  /**
   * Upsert visual embedding to separate visual index (512D)
   * For CLIP visual embeddings from photos
   */
  async upsertVisualVector(
    vector: {
      id: string;
      values: number[];
      metadata: Record<string, any>;
    },
    userId?: string,
    endpoint?: string
  ): Promise<void> {
    try {
      const client = this.getClient();
      const visualIndex = client.Index('personal-ai-visual');
      await visualIndex.upsert([
        {
          id: vector.id,
          values: vector.values,
          metadata: vector.metadata as RecordMetadata,
        },
      ]);

      // Track usage if userId provided
      if (userId && typeof window === 'undefined') {
        const UsageTracker = (await import('@/lib/services/usage/UsageTracker')).default;
        await UsageTracker.trackPineconeUpsert(userId, 1, endpoint || 'pinecone_upsert_visual');
      }

      console.log(`Upserted visual vector: ${vector.id} to visual index`);
    } catch (error) {
      console.error('Error upserting visual vector:', error);
      throw error;
    }
  }

  /**
   * Query visual index for similar images (512D CLIP embeddings)
   */
  async queryVisualVectors(
    queryEmbedding: number[],
    userId: string,
    topK: number = 10,
    endpoint?: string
  ): Promise<PineconeQueryResult[]> {
    try {
      const client = this.getClient();
      const visualIndex = client.Index('personal-ai-visual');
      const queryResponse = await visualIndex.query({
        vector: queryEmbedding,
        topK,
        filter: {
          userId: { $eq: userId },
          type: { $eq: 'photo' },
        },
        includeMetadata: true,
      });

      // Track usage
      if (typeof window === 'undefined') {
        const UsageTracker = (await import('@/lib/services/usage/UsageTracker')).default;
        await UsageTracker.trackPineconeQuery(userId, topK, endpoint || 'pinecone_query_visual');
      }

      return (
        queryResponse.matches?.map((match) => ({
          id: match.id,
          score: match.score || 0,
          metadata: match.metadata as VectorMetadata,
        })) || []
      );
    } catch (error) {
      console.error('Error querying visual vectors:', error);
      throw error;
    }
  }

  /**
   * Delete visual vector (512D)
   */
  async deleteVisualVector(vectorId: string, userId?: string, endpoint?: string): Promise<void> {
    try {
      const client = this.getClient();
      const visualIndex = client.Index('personal-ai-visual');
      await visualIndex.deleteOne(vectorId);

      // Track usage if userId provided
      if (userId && typeof window === 'undefined') {
        const UsageTracker = (await import('@/lib/services/usage/UsageTracker')).default;
        await UsageTracker.trackPineconeDelete(userId, 1, endpoint || 'pinecone_delete_visual');
      }

      console.log(`Deleted visual vector: ${vectorId}`);
    } catch (error) {
      console.error('Error deleting visual vector:', error);
      throw error;
    }
  }

  /**
   * Delete all visual vectors for a user
   */
  async deleteUserVisualData(userId: string): Promise<void> {
    try {
      const client = this.getClient();
      const visualIndex = client.Index('personal-ai-visual');
      await visualIndex.deleteMany({
        userId: { $eq: userId },
      });
      console.log(`Deleted all visual vectors for user: ${userId}`);
    } catch (error) {
      console.error('Error deleting user visual data:', error);
      throw error;
    }
  }
}

// Export singleton instance
export default PineconeService.getInstance();
