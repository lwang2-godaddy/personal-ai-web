import OpenAIService from '@/lib/api/openai/client';
import PineconeService from '@/lib/api/pinecone/client';
import FirestoreService from '@/lib/api/firebase/firestore';
import { ChatMessage, PineconeQueryResult, ContextReference, Circle, CircleDataSharing } from '@/lib/models';

// Constants (adapted from mobile APP_CONSTANTS)
const RAG_TOP_K_RESULTS = 10;
const RAG_CONTEXT_MAX_LENGTH = 8000;

/**
 * CRITICAL SERVICE: RAG Engine
 * Implements Retrieval-Augmented Generation for intelligent personal data queries
 *
 * Flow:
 * 1. User asks a question
 * 2. Generate embedding for the question
 * 3. Query Pinecone for most relevant personal data
 * 4. Build context from retrieved data
 * 5. Send to GPT-4 with context
 * 6. Return AI response
 */
export class RAGEngine {
  private static instance: RAGEngine;
  private openAIService: typeof OpenAIService;
  private pineconeService: typeof PineconeService;
  private firestoreService: typeof FirestoreService;

  private constructor() {
    this.openAIService = OpenAIService;
    this.pineconeService = PineconeService;
    this.firestoreService = FirestoreService;
  }

  static getInstance(): RAGEngine {
    if (!RAGEngine.instance) {
      RAGEngine.instance = new RAGEngine();
    }
    return RAGEngine.instance;
  }

  /**
   * Main query method: User asks a question, returns AI answer with personal context
   *
   * Features:
   * - Temporal query detection (yesterday, last week, etc.)
   * - Date-filtered Pinecone search
   * - Firestore events integration
   * - Unified context building from vectors + events
   */
  async query(userMessage: string, userId: string): Promise<{
    response: string;
    contextUsed: ContextReference[];
  }> {
    try {
      console.log(`[RAGEngine] Query from user ${userId}: "${userMessage}"`);

      // 1. Parse temporal intent from query
      console.log('[RAGEngine] Step 1: Parsing temporal intent...');
      const temporalIntent = this.parseTemporalIntent(userMessage);
      if (temporalIntent.hasTemporalIntent) {
        console.log(`[RAGEngine] ✓ Detected temporal query: "${temporalIntent.timeReference}" (${temporalIntent.dateRange?.start.toLocaleDateString()} - ${temporalIntent.dateRange?.end.toLocaleDateString()})`);
      } else {
        console.log('[RAGEngine] ✓ No temporal intent detected');
      }

      // 2. Generate embedding for user query
      console.log('[RAGEngine] Step 2: Calling OpenAI to generate embedding...');
      const embeddingStart = Date.now();
      const queryEmbedding = await this.openAIService.generateEmbedding(
        userMessage,
        userId,
        'rag_query_embedding'
      );
      console.log(`[RAGEngine] ✓ Embedding generated in ${Date.now() - embeddingStart}ms (dimension: ${queryEmbedding.length})`);

      // 3. Query Pinecone for relevant vectors (with optional date filter)
      console.log('[RAGEngine] Step 3: Querying Pinecone vector database...');
      const pineconeStart = Date.now();

      // Apply date filter if temporal intent detected
      let pineconeFilter: Record<string, any> | undefined = undefined;
      if (temporalIntent.hasTemporalIntent && temporalIntent.dateRange) {
        pineconeFilter = {
          // Filter by date range (supports multiple date field names)
          $or: [
            {
              date: {
                $gte: temporalIntent.dateRange.start.toISOString(),
                $lte: temporalIntent.dateRange.end.toISOString()
              }
            },
            {
              createdAt: {
                $gte: temporalIntent.dateRange.start.toISOString(),
                $lte: temporalIntent.dateRange.end.toISOString()
              }
            },
            {
              timestamp: {
                $gte: temporalIntent.dateRange.start.toISOString(),
                $lte: temporalIntent.dateRange.end.toISOString()
              }
            }
          ]
        };
        console.log(`[RAGEngine] ✓ Applying date filter to Pinecone query`);
      }

      const relevantVectors = await this.pineconeService.queryVectors(
        queryEmbedding,
        userId,
        RAG_TOP_K_RESULTS,
        pineconeFilter,
        'rag_query_vector'
      );
      console.log(`[RAGEngine] ✓ Pinecone returned ${relevantVectors.length} relevant data points in ${Date.now() - pineconeStart}ms`);

      // 4. Query Firestore for extracted events (if temporal intent detected)
      let relevantEvents: any[] = [];
      if (temporalIntent.hasTemporalIntent && temporalIntent.dateRange) {
        console.log('[RAGEngine] Step 4: Querying Firestore for extracted events...');
        const eventsStart = Date.now();
        try {
          relevantEvents = await this.getEventsByDateRange(
            userId,
            temporalIntent.dateRange.start,
            temporalIntent.dateRange.end
          );
          console.log(`[RAGEngine] ✓ Firestore returned ${relevantEvents.length} events in ${Date.now() - eventsStart}ms`);
        } catch (error) {
          console.warn('[RAGEngine] Warning: Failed to retrieve events from Firestore:', error);
          // Continue without events if query fails
        }
      }

      // 5. Build context from retrieved data (merge vectors + events)
      console.log(`[RAGEngine] Step ${temporalIntent.hasTemporalIntent ? '5' : '4'}: Building context from retrieved data...`);
      const context = relevantEvents.length > 0
        ? this.buildContextWithEvents(relevantVectors, relevantEvents)
        : this.buildContext(relevantVectors);
      console.log(`[RAGEngine] ✓ Context built (length: ${context.length} chars, ${relevantVectors.length} vectors, ${relevantEvents.length} events)`);

      // 6. Generate response with GPT-4o
      console.log(`[RAGEngine] Step ${temporalIntent.hasTemporalIntent ? '6' : '5'}: Calling OpenAI GPT-4o for response...`);
      const gptStart = Date.now();
      const response = await this.openAIService.chatCompletion(
        [{ role: 'user', content: userMessage, timestamp: new Date().toISOString() }],
        context,
        {
          userId,
          endpoint: 'rag_chat_completion'
        }
      );
      console.log(`[RAGEngine] ✓ GPT-4o responded in ${Date.now() - gptStart}ms (length: ${response.length} chars)`);

      // 7. Create context references for UI
      const contextUsed: ContextReference[] = relevantVectors.map((vector) => ({
        id: vector.id,
        score: vector.score,
        type: vector.metadata.type as any,
        snippet: vector.metadata.text,
      }));

      console.log(`[RAGEngine] Query complete. Used ${contextUsed.length} context references${temporalIntent.hasTemporalIntent ? ` (temporal: ${temporalIntent.timeReference})` : ''}`);

      return {
        response,
        contextUsed,
      };
    } catch (error) {
      console.error('[RAGEngine] Error:', error);
      throw error;
    }
  }

  /**
   * Query with conversation history for context
   */
  async queryWithHistory(
    userMessage: string,
    userId: string,
    conversationHistory: ChatMessage[],
  ): Promise<{
    response: string;
    contextUsed: ContextReference[];
  }> {
    try {
      // Generate embedding for user query
      const queryEmbedding = await this.openAIService.generateEmbedding(
        userMessage,
        userId,
        'rag_query_history_embedding'
      );

      // Query Pinecone for relevant vectors
      const relevantVectors = await this.pineconeService.queryVectors(
        queryEmbedding,
        userId,
        RAG_TOP_K_RESULTS,
        undefined,
        'rag_query_history_vector'
      );

      // Build context
      const context = this.buildContext(relevantVectors);

      // Include conversation history in the chat
      const messages = [
        ...conversationHistory,
        { role: 'user' as const, content: userMessage, timestamp: new Date().toISOString() },
      ];

      // Generate response
      const response = await this.openAIService.chatCompletion(messages, context, {
        userId,
        endpoint: 'rag_chat_history_completion'
      });

      const contextUsed: ContextReference[] = relevantVectors.map((vector) => ({
        id: vector.id,
        score: vector.score,
        type: vector.metadata.type as any,
        snippet: vector.metadata.text,
      }));

      return {
        response,
        contextUsed,
      };
    } catch (error) {
      console.error('RAG query with history error:', error);
      throw error;
    }
  }

  /**
   * Query specific data type (health, location, voice, or photo)
   */
  async queryByDataType(
    userMessage: string,
    userId: string,
    dataType: 'health' | 'location' | 'voice' | 'photo',
  ): Promise<{
    response: string;
    contextUsed: ContextReference[];
  }> {
    try {
      const queryEmbedding = await this.openAIService.generateEmbedding(
        userMessage,
        userId,
        'rag_query_datatype_embedding'
      );

      const relevantVectors = await this.pineconeService.queryVectorsByType(
        queryEmbedding,
        userId,
        dataType,
        RAG_TOP_K_RESULTS,
        `rag_query_datatype_${dataType}`
      );

      const context = this.buildContext(relevantVectors);
      const response = await this.openAIService.chatCompletion(
        [{ role: 'user', content: userMessage, timestamp: new Date().toISOString() }],
        context,
        {
          userId,
          endpoint: 'rag_chat_datatype_completion'
        }
      );

      const contextUsed: ContextReference[] = relevantVectors.map((vector) => ({
        id: vector.id,
        score: vector.score,
        type: vector.metadata.type as any,
        snippet: vector.metadata.text,
      }));

      return {
        response,
        contextUsed,
      };
    } catch (error) {
      console.error('RAG query by data type error:', error);
      throw error;
    }
  }

  /**
   * Query for specific activity (e.g., "badminton")
   */
  async queryByActivity(
    userMessage: string,
    userId: string,
    activity: string,
  ): Promise<{
    response: string;
    contextUsed: ContextReference[];
  }> {
    try {
      const queryEmbedding = await this.openAIService.generateEmbedding(
        userMessage,
        userId,
        'rag_query_activity_embedding'
      );

      const relevantVectors = await this.pineconeService.queryLocationsByActivity(
        queryEmbedding,
        userId,
        activity,
        20, // Get more results for activity queries
        'rag_query_activity_location'
      );

      const context = this.buildContext(relevantVectors);
      const response = await this.openAIService.chatCompletion(
        [{ role: 'user', content: userMessage, timestamp: new Date().toISOString() }],
        context,
        {
          userId,
          endpoint: 'rag_chat_activity_completion'
        }
      );

      const contextUsed: ContextReference[] = relevantVectors.map((vector) => ({
        id: vector.id,
        score: vector.score,
        type: vector.metadata.type as any,
        snippet: vector.metadata.text,
      }));

      return {
        response,
        contextUsed,
      };
    } catch (error) {
      console.error('RAG query by activity error:', error);
      throw error;
    }
  }

  /**
   * Build context string from relevant vectors
   * Formats the data in a way that's useful for GPT-4
   */
  private buildContext(vectors: PineconeQueryResult[]): string {
    if (vectors.length === 0) {
      return 'No relevant data found in the user\'s personal history. Let the user know you need more data to answer their question.';
    }

    // Sort by relevance score
    const sortedVectors = [...vectors].sort((a, b) => b.score - a.score);

    // Build context parts with special formatting for photos
    const contextParts = sortedVectors.map((vector, index) => {
      const metadata = vector.metadata;
      const relevancePercent = (vector.score * 100).toFixed(1);

      // Extract date from metadata (support multiple field names)
      let datePrefix = '';
      const dateField = metadata.date || metadata.createdAt || metadata.timestamp;
      if (dateField) {
        try {
          const date = new Date(dateField);
          if (!isNaN(date.getTime())) {
            datePrefix = `[${date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}] `;
          }
        } catch (e) {
          // If date parsing fails, skip the date prefix
        }
      }

      // Special formatting for photos
      if (metadata.type === 'photo') {
        return `[${index + 1}] (${relevancePercent}% relevant) ${datePrefix}📸 Photo: ${metadata.text}`;
      }

      // Standard formatting for other data types
      return `[${index + 1}] (${relevancePercent}% relevant) ${datePrefix}${metadata.text}`;
    });

    // Limit context length
    let context = `Relevant information from the user's personal data (${sortedVectors.length} items):\n\n${contextParts.join('\n\n')}`;

    if (context.length > RAG_CONTEXT_MAX_LENGTH) {
      context = context.substring(0, RAG_CONTEXT_MAX_LENGTH) + '...';
    }

    return context;
  }

  /**
   * Analyze query to detect intent and suggest query type
   */
  async analyzeQuery(userMessage: string): Promise<{
    suggestedDataType?: 'health' | 'location' | 'voice' | 'photo';
    suggestedActivity?: string;
    isCountQuery: boolean;
    isAverageQuery: boolean;
    isComparisonQuery: boolean;
  }> {
    const messageLower = userMessage.toLowerCase();

    // Detect query patterns
    const isCountQuery = /how many|number of|count|times/i.test(userMessage);
    const isAverageQuery = /average|mean|typical/i.test(userMessage);
    const isComparisonQuery = /more than|less than|compare|versus/i.test(userMessage);

    // Detect data type
    let suggestedDataType: 'health' | 'location' | 'voice' | 'photo' | undefined;
    if (/photo|picture|image|took|captured|show me|visual/i.test(userMessage)) {
      suggestedDataType = 'photo';
    } else if (/steps|walk|heart|sleep|workout|exercise|fitness/i.test(userMessage)) {
      suggestedDataType = 'health';
    } else if (/location|place|where|visit|go|been to/i.test(userMessage)) {
      suggestedDataType = 'location';
    } else if (/voice|note|said|recorded/i.test(userMessage)) {
      suggestedDataType = 'voice';
    }

    // Detect activity mentions
    const activityMatches = messageLower.match(/badminton|gym|work|restaurant|running|cycling|swimming|yoga/i);
    const suggestedActivity = activityMatches ? activityMatches[0] : undefined;

    return {
      suggestedDataType,
      suggestedActivity,
      isCountQuery,
      isAverageQuery,
      isComparisonQuery,
    };
  }

  // ==================== TEMPORAL REASONING METHODS ====================

  /**
   * Parse temporal intent from user query
   * Converts relative time references to absolute date ranges
   *
   * @param userMessage - User's query message
   * @returns Temporal intent object with date range if detected
   *
   * @example
   * parseTemporalIntent("what did I do yesterday")
   * // Returns: { hasTemporalIntent: true, dateRange: { start: yesterday 00:00, end: yesterday 23:59 } }
   */
  private parseTemporalIntent(userMessage: string): {
    hasTemporalIntent: boolean;
    dateRange?: { start: Date; end: Date };
    timeReference?: string;
  } {
    const today = new Date();
    const messageLower = userMessage.toLowerCase();

    // Helper to get start/end of day
    const startOfDay = (date: Date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d;
    };
    const endOfDay = (date: Date) => {
      const d = new Date(date);
      d.setHours(23, 59, 59, 999);
      return d;
    };

    // Detect "today"
    if (/\btoday\b/i.test(userMessage)) {
      return {
        hasTemporalIntent: true,
        dateRange: { start: startOfDay(today), end: endOfDay(today) },
        timeReference: 'today'
      };
    }

    // Detect "yesterday"
    if (/\byesterday\b/i.test(userMessage)) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        hasTemporalIntent: true,
        dateRange: { start: startOfDay(yesterday), end: endOfDay(yesterday) },
        timeReference: 'yesterday'
      };
    }

    // Detect "day before yesterday" / "2 days ago"
    if (/day before yesterday|2 days ago/i.test(userMessage)) {
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      return {
        hasTemporalIntent: true,
        dateRange: { start: startOfDay(twoDaysAgo), end: endOfDay(twoDaysAgo) },
        timeReference: 'day before yesterday'
      };
    }

    // Detect "N days ago"
    const daysAgoMatch = messageLower.match(/(\d+)\s+days?\s+ago/);
    if (daysAgoMatch) {
      const daysAgo = parseInt(daysAgoMatch[1]);
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() - daysAgo);
      return {
        hasTemporalIntent: true,
        dateRange: { start: startOfDay(targetDate), end: endOfDay(targetDate) },
        timeReference: `${daysAgo} days ago`
      };
    }

    // Detect "this week"
    if (/\bthis week\b/i.test(userMessage)) {
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - today.getDay()); // Sunday
      return {
        hasTemporalIntent: true,
        dateRange: { start: startOfDay(weekStart), end: endOfDay(today) },
        timeReference: 'this week'
      };
    }

    // Detect "last week"
    if (/\blast week\b/i.test(userMessage)) {
      const lastWeekEnd = new Date(today);
      lastWeekEnd.setDate(lastWeekEnd.getDate() - today.getDay() - 1); // Last Saturday
      const lastWeekStart = new Date(lastWeekEnd);
      lastWeekStart.setDate(lastWeekStart.getDate() - 6); // Previous Sunday
      return {
        hasTemporalIntent: true,
        dateRange: { start: startOfDay(lastWeekStart), end: endOfDay(lastWeekEnd) },
        timeReference: 'last week'
      };
    }

    // Detect "this month"
    if (/\bthis month\b/i.test(userMessage)) {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        hasTemporalIntent: true,
        dateRange: { start: startOfDay(monthStart), end: endOfDay(today) },
        timeReference: 'this month'
      };
    }

    // Detect "last month"
    if (/\blast month\b/i.test(userMessage)) {
      const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0); // Last day of previous month
      return {
        hasTemporalIntent: true,
        dateRange: { start: startOfDay(lastMonthStart), end: endOfDay(lastMonthEnd) },
        timeReference: 'last month'
      };
    }

    // Detect "this year"
    if (/\bthis year\b/i.test(userMessage)) {
      const yearStart = new Date(today.getFullYear(), 0, 1);
      return {
        hasTemporalIntent: true,
        dateRange: { start: startOfDay(yearStart), end: endOfDay(today) },
        timeReference: 'this year'
      };
    }

    // No temporal intent detected
    return { hasTemporalIntent: false };
  }

  /**
   * Get events from Firestore within a date range
   * Uses the extracted events collection with AI-parsed datetimes
   *
   * @param userId - User ID
   * @param startDate - Start of date range (inclusive)
   * @param endDate - End of date range (inclusive)
   * @returns Array of extracted events
   */
  private async getEventsByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    return await this.firestoreService.getEvents(userId, {
      startDate,
      endDate,
      limit: 50
    });
  }

  /**
   * Build unified context from both Pinecone vectors and Firestore events
   * Merges semantic search results with extracted temporal events
   *
   * @param vectors - Pinecone query results
   * @param events - Extracted events from Firestore
   * @returns Formatted context string for GPT-4
   */
  private buildContextWithEvents(
    vectors: PineconeQueryResult[],
    events: any[]
  ): string {
    if (vectors.length === 0 && events.length === 0) {
      return 'No relevant data found in the user\'s personal history. Let the user know you need more data to answer their question.';
    }

    // Build context parts from vectors (with existing date display logic)
    const vectorParts: string[] = [];
    if (vectors.length > 0) {
      const sortedVectors = [...vectors].sort((a, b) => b.score - a.score);
      vectorParts.push(...sortedVectors.map((vector, index) => {
        const metadata = vector.metadata;
        const relevancePercent = (vector.score * 100).toFixed(1);

        // Extract date from metadata
        let datePrefix = '';
        const dateField = metadata.date || metadata.createdAt || metadata.timestamp;
        if (dateField) {
          try {
            const date = new Date(dateField);
            if (!isNaN(date.getTime())) {
              datePrefix = `[${date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}] `;
            }
          } catch (e) {
            // Skip date prefix if parsing fails
          }
        }

        // Special formatting for photos
        if (metadata.type === 'photo') {
          return `[${index + 1}] (${relevancePercent}% relevant) ${datePrefix}📸 Photo: ${metadata.text}`;
        }

        return `[${index + 1}] (${relevancePercent}% relevant) ${datePrefix}${metadata.text}`;
      }));
    }

    // Build context parts from events
    const eventParts: string[] = [];
    if (events.length > 0) {
      eventParts.push(...events.map((event, index) => {
        const eventDate = new Date(event.datetime);
        const dateStr = eventDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        const confidencePercent = ((event.confidence || 0.7) * 100).toFixed(0);
        return `[Event ${index + 1}] (${confidencePercent}% confidence) [${dateStr}] ${event.title}${event.description ? ': ' + event.description : ''}`;
      }));
    }

    // Combine all parts
    const allParts = [...vectorParts, ...eventParts];
    let context = `Relevant information from the user's personal data (${vectors.length} items) and extracted events (${events.length} events):\n\n${allParts.join('\n\n')}`;

    // Limit context length
    if (context.length > RAG_CONTEXT_MAX_LENGTH) {
      context = context.substring(0, RAG_CONTEXT_MAX_LENGTH) + '...';
    }

    return context;
  }

  // ==================== CIRCLE RAG METHODS ====================

  /**
   * Query with circle context (respects per-circle data sharing rules)
   *
   * Used for Close Friend Circles feature to enable group intelligence while maintaining privacy.
   */
  async queryCircleContext(
    userMessage: string,
    circleId: string,
    currentUserId: string,
  ): Promise<{
    response: string;
    contextUsed: ContextReference[];
  }> {
    try {
      console.log(`[RAGEngine] Circle query from user ${currentUserId} in circle ${circleId}: "${userMessage}"`);

      // 1. Fetch circle and validate membership
      const circle = await this.firestoreService.getCircle(circleId);
      if (!circle.memberIds.includes(currentUserId)) {
        throw new Error('Not authorized to access this circle');
      }

      // 2. Generate query embedding
      console.log('[RAGEngine] Generating embedding for circle query...');
      const queryEmbedding = await this.openAIService.generateEmbedding(
        userMessage,
        currentUserId,
        'rag_circle_query_embedding'
      );

      // 3. Build data type filter based on circle sharing rules
      const dataTypeFilter = this.buildCircleDataFilter(circle.dataSharing);

      // 4. Query Pinecone with multi-user filter + data type filter
      console.log(`[RAGEngine] Querying Pinecone for ${circle.memberIds.length} circle members...`);
      const relevantVectors = await this.pineconeService.queryMultiUserVectors(
        queryEmbedding,
        circle.memberIds,
        20, // Get more results for circle queries
        dataTypeFilter,
        'rag_circle_query_vector'
      );

      console.log(`[RAGEngine] Found ${relevantVectors.length} relevant data points across circle members`);

      // 5. Build context with member attribution
      const context = await this.buildCircleContext(relevantVectors, circle, currentUserId);

      // 6. System prompt for circle context
      const systemPrompt = `You are analyzing data for a friend circle called "${circle.name}" with ${circle.memberIds.length} members.
When referencing data, mention which member it's from by name.
Be conversational and friendly - this is a private circle of close friends.
Respect the data sharing settings - only data types enabled for this circle are included.`;

      // 7. Generate response
      console.log('[RAGEngine] Generating GPT-4 response with circle context...');
      const response = await this.openAIService.chatCompletionWithSystemPrompt(
        [{ role: 'user', content: userMessage, timestamp: new Date().toISOString() }],
        context,
        systemPrompt,
        {
          userId: currentUserId,
          endpoint: 'rag_circle_chat_completion'
        }
      );

      // 8. Return response with attributed context
      const contextUsed: ContextReference[] = relevantVectors.map((vector) => ({
        id: vector.id,
        type: vector.metadata.type as any,
        snippet: vector.metadata.text,
        score: vector.score,
        userId: vector.metadata.userId, // Include for attribution
      }));

      console.log(`[RAGEngine] Circle query complete with ${contextUsed.length} context references`);

      return {
        response,
        contextUsed,
      };
    } catch (error) {
      console.error('[RAGEngine] Circle query error:', error);
      throw error;
    }
  }

  /**
   * Build Pinecone filter based on circle data sharing rules
   */
  private buildCircleDataFilter(dataSharing: CircleDataSharing): Record<string, any> {
    const allowedTypes: string[] = [];

    if (dataSharing.shareHealth) {
      allowedTypes.push('health');
    }
    if (dataSharing.shareLocation) {
      allowedTypes.push('location');
    }
    if (dataSharing.shareActivities) {
      allowedTypes.push('shared_activity');
    }
    if (dataSharing.shareVoiceNotes) {
      allowedTypes.push('voice');
    }
    if (dataSharing.sharePhotos) {
      allowedTypes.push('photo');
    }

    // If no types allowed, return filter that matches nothing
    if (allowedTypes.length === 0) {
      return { type: { $eq: 'none' } };
    }

    // Return filter for allowed types
    return { type: { $in: allowedTypes } };
  }

  /**
   * Build context with member attribution
   */
  private async buildCircleContext(
    vectors: PineconeQueryResult[],
    circle: Circle,
    currentUserId: string,
  ): Promise<string> {
    if (vectors.length === 0) {
      return `No relevant data found in circle "${circle.name}". Circle members may not have this type of data, or it may not be shared.`;
    }

    // Fetch user display names for attribution
    const userIds = [...new Set(vectors.map((v) => v.metadata.userId))];
    const userNames = await this.fetchUserNames(userIds);

    // Sort by relevance score
    const sortedVectors = [...vectors].sort((a, b) => b.score - a.score);

    // Build context parts with member attribution
    const contextParts = sortedVectors.map((vector, index) => {
      const metadata = vector.metadata;
      const vectorUserId = metadata.userId;
      const userName = userNames.get(vectorUserId) || 'Circle Member';
      const isCurrentUser = vectorUserId === currentUserId;
      const userLabel = isCurrentUser ? 'You' : userName;
      const relevancePercent = (vector.score * 100).toFixed(1);

      // Special formatting for photos
      if (metadata.type === 'photo') {
        return `[${index + 1}] (${relevancePercent}% relevant) [${userLabel}] 📸 Photo: ${metadata.text}`;
      }

      return `[${index + 1}] (${relevancePercent}% relevant) [${userLabel}] ${metadata.text}`;
    });

    let context = `Circle "${circle.name}" Data (${circle.memberIds.length} members, ${sortedVectors.length} items):\n\n${contextParts.join('\n\n')}`;

    // Limit context length
    if (context.length > RAG_CONTEXT_MAX_LENGTH) {
      context = context.substring(0, RAG_CONTEXT_MAX_LENGTH) + '...';
    }

    return context;
  }

  /**
   * Fetch user display names from Firestore
   */
  private async fetchUserNames(userIds: string[]): Promise<Map<string, string>> {
    const userNames = new Map<string, string>();

    try {
      const userDocs = await Promise.all(
        userIds.map((uid) => this.firestoreService.getUserData(uid)),
      );

      userDocs.forEach((user, index) => {
        if (user && user.displayName) {
          userNames.set(userIds[index], user.displayName);
        } else {
          userNames.set(userIds[index], 'Circle Member');
        }
      });
    } catch (error) {
      console.error('[RAGEngine] Error fetching user names:', error);
      // Return map with generic names
      userIds.forEach((uid) => {
        if (!userNames.has(uid)) {
          userNames.set(uid, 'Circle Member');
        }
      });
    }

    return userNames;
  }
}

// Export singleton instance
export default RAGEngine.getInstance();
