import OpenAIService from '@/lib/api/openai/client';
import PineconeService from '@/lib/api/pinecone/client';
import FirestoreService from '@/lib/api/firebase/firestore';
import { ChatMessage, PineconeQueryResult, ContextReference, Circle, CircleDataSharing, AIProviderInfo, estimateCost } from '@/lib/models';
import { FriendPrivacySettings } from '@/lib/models/Friend';
import { computeEffectiveSharing } from '@/lib/utils/privacyUtils';

// Constants (adapted from mobile APP_CONSTANTS)
const RAG_TOP_K_RESULTS = 10;
const RAG_TOP_K_COUNT_QUERY = 50; // Higher topK for counting queries to get all relevant results
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
   * - Query intent analysis (counting, data type, activity)
   * - Temporal query detection (yesterday, last week, etc.) - supports English + Chinese
   * - Date-filtered Pinecone search
   * - Higher topK for counting queries
   * - Firestore events integration
   * - Unified context building from vectors + events
   * - Provider/model tracking for auditing
   */
  async query(userMessage: string, userId: string): Promise<{
    response: string;
    contextUsed: ContextReference[];
    providerInfo: AIProviderInfo;
  }> {
    try {
      console.log(`[RAGEngine] Query from user ${userId}: "${userMessage}"`);

      // 0. Analyze query intent (counting, data type, activity)
      console.log('[RAGEngine] Step 0: Analyzing query intent...');
      const queryAnalysis = this.analyzeQuery(userMessage);
      console.log(`[RAGEngine] ✓ Query analysis: isCountQuery=${queryAnalysis.isCountQuery}, dataType=${queryAnalysis.suggestedDataType || 'none'}, activity=${queryAnalysis.suggestedActivity || 'none'}`);

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

      // 3. Query Pinecone for relevant vectors (with optional filters)
      console.log('[RAGEngine] Step 3: Querying Pinecone vector database...');
      const pineconeStart = Date.now();

      // Build Pinecone filter based on query analysis
      let pineconeFilter: Record<string, any> | undefined = undefined;

      // Apply data type filter if detected
      if (queryAnalysis.suggestedDataType) {
        pineconeFilter = {
          type: { $eq: queryAnalysis.suggestedDataType }
        };
        console.log(`[RAGEngine] ✓ Applying data type filter: ${queryAnalysis.suggestedDataType}`);
      }

      // NOTE: Date filtering in Pinecone requires numeric timestamps in metadata.
      // Current metadata stores dates as ISO strings, which don't support $gte/$lte.
      // For now, we rely on semantic search + GPT to filter by date.
      // TODO: Add createdAtEpoch (number) to metadata for proper date filtering.
      if (temporalIntent.hasTemporalIntent && temporalIntent.dateRange) {
        console.log(`[RAGEngine] ✓ Temporal intent detected: ${temporalIntent.dateRange.start.toISOString()} to ${temporalIntent.dateRange.end.toISOString()}`);
        console.log(`[RAGEngine] ⚠ Date filter skipped (metadata uses ISO strings, not numeric timestamps)`);
      }

      // Use higher topK for counting queries to get all relevant results
      const topK = queryAnalysis.isCountQuery ? RAG_TOP_K_COUNT_QUERY : RAG_TOP_K_RESULTS;
      console.log(`[RAGEngine] ✓ Using topK=${topK} (counting query: ${queryAnalysis.isCountQuery})`);
      console.log(`[RAGEngine] ✓ Pinecone filter:`, JSON.stringify(pineconeFilter, null, 2));

      const relevantVectors = await this.pineconeService.queryVectors(
        queryEmbedding,
        userId,
        topK,
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
      let context = relevantEvents.length > 0
        ? this.buildContextWithEvents(relevantVectors, relevantEvents)
        : this.buildContext(relevantVectors);

      // Add counting instruction to context if it's a counting query
      if (queryAnalysis.isCountQuery && relevantVectors.length > 0) {
        const dataTypeLabel = queryAnalysis.suggestedDataType || 'items';
        context = `IMPORTANT: This is a COUNTING query. Count the exact number of ${dataTypeLabel} in the context below and provide the specific count in your answer.\n\nTotal ${dataTypeLabel} found: ${relevantVectors.length}\n\n${context}`;
        console.log(`[RAGEngine] ✓ Added counting instruction to context (found ${relevantVectors.length} ${dataTypeLabel})`);
      }
      console.log(`[RAGEngine] ✓ Context built (length: ${context.length} chars, ${relevantVectors.length} vectors, ${relevantEvents.length} events)`);

      // 6. Generate response with GPT-4o (with usage tracking)
      console.log(`[RAGEngine] Step ${temporalIntent.hasTemporalIntent ? '6' : '5'}: Calling OpenAI GPT-4o for response...`);
      const gptStart = Date.now();
      const chatResult = await this.openAIService.chatCompletionWithUsage(
        [{ role: 'user', content: userMessage, timestamp: new Date().toISOString() }],
        context,
        {
          userId,
          endpoint: 'rag_chat_completion'
        }
      );
      const latencyMs = Date.now() - gptStart;
      console.log(`[RAGEngine] ✓ GPT-4o responded in ${latencyMs}ms (length: ${chatResult.content.length} chars, tokens: ${chatResult.inputTokens}+${chatResult.outputTokens})`);

      // 7. Create context references for UI
      const contextUsed: ContextReference[] = relevantVectors.map((vector) => ({
        id: vector.id,
        score: vector.score,
        type: vector.metadata.type as any,
        snippet: vector.metadata.text,
      }));

      // 8. Build provider info for tracking
      const providerInfo: AIProviderInfo = {
        providerId: 'openai',
        providerType: 'cloud',
        model: chatResult.model,
        usedFallback: false,
        inputTokens: chatResult.inputTokens,
        outputTokens: chatResult.outputTokens,
        latencyMs,
        estimatedCostUSD: estimateCost('openai', chatResult.model, chatResult.inputTokens, chatResult.outputTokens),
      };

      console.log(`[RAGEngine] Query complete. Used ${contextUsed.length} context references${temporalIntent.hasTemporalIntent ? ` (temporal: ${temporalIntent.timeReference})` : ''}${queryAnalysis.isCountQuery ? ' (counting query)' : ''}, cost: $${providerInfo.estimatedCostUSD.toFixed(4)}`);

      return {
        response: chatResult.content,
        contextUsed,
        providerInfo,
      };
    } catch (error) {
      console.error('[RAGEngine] Error:', error);
      throw error;
    }
  }

  /**
   * Query with conversation history for context
   * Supports counting queries with higher topK and explicit counting instructions
   */
  async queryWithHistory(
    userMessage: string,
    userId: string,
    conversationHistory: ChatMessage[],
  ): Promise<{
    response: string;
    contextUsed: ContextReference[];
    providerInfo: AIProviderInfo;
  }> {
    try {
      // Analyze query intent
      const queryAnalysis = this.analyzeQuery(userMessage);
      console.log(`[RAGEngine-History] Query analysis: isCountQuery=${queryAnalysis.isCountQuery}, dataType=${queryAnalysis.suggestedDataType || 'none'}`);

      // Parse temporal intent
      const temporalIntent = this.parseTemporalIntent(userMessage);

      // Generate embedding for user query
      const queryEmbedding = await this.openAIService.generateEmbedding(
        userMessage,
        userId,
        'rag_query_history_embedding'
      );

      // Build filter based on query analysis
      let pineconeFilter: Record<string, any> | undefined = undefined;

      // Apply data type filter if detected
      if (queryAnalysis.suggestedDataType) {
        pineconeFilter = { type: { $eq: queryAnalysis.suggestedDataType } };
      }

      // Apply date filter if temporal intent detected
      if (temporalIntent.hasTemporalIntent && temporalIntent.dateRange) {
        const dateFilter = {
          $or: [
            { date: { $gte: temporalIntent.dateRange.start.toISOString(), $lte: temporalIntent.dateRange.end.toISOString() } },
            { createdAt: { $gte: temporalIntent.dateRange.start.toISOString(), $lte: temporalIntent.dateRange.end.toISOString() } },
            { timestamp: { $gte: temporalIntent.dateRange.start.toISOString(), $lte: temporalIntent.dateRange.end.toISOString() } }
          ]
        };
        pineconeFilter = pineconeFilter ? { $and: [pineconeFilter, dateFilter] } : dateFilter;
      }

      // Use higher topK for counting queries
      const topK = queryAnalysis.isCountQuery ? RAG_TOP_K_COUNT_QUERY : RAG_TOP_K_RESULTS;

      // Query Pinecone for relevant vectors
      const relevantVectors = await this.pineconeService.queryVectors(
        queryEmbedding,
        userId,
        topK,
        pineconeFilter,
        'rag_query_history_vector'
      );

      // Build context
      let context = this.buildContext(relevantVectors);

      // Add counting instruction if it's a counting query
      if (queryAnalysis.isCountQuery && relevantVectors.length > 0) {
        const dataTypeLabel = queryAnalysis.suggestedDataType || 'items';
        context = `IMPORTANT: This is a COUNTING query. Count the exact number of ${dataTypeLabel} in the context below and provide the specific count in your answer.\n\nTotal ${dataTypeLabel} found: ${relevantVectors.length}\n\n${context}`;
      }

      // Include conversation history in the chat
      const messages = [
        ...conversationHistory,
        { role: 'user' as const, content: userMessage, timestamp: new Date().toISOString() },
      ];

      // Generate response with usage tracking
      const gptStart = Date.now();
      const chatResult = await this.openAIService.chatCompletionWithUsage(messages, context, {
        userId,
        endpoint: 'rag_chat_history_completion'
      });
      const latencyMs = Date.now() - gptStart;

      const contextUsed: ContextReference[] = relevantVectors.map((vector) => ({
        id: vector.id,
        score: vector.score,
        type: vector.metadata.type as any,
        snippet: vector.metadata.text,
      }));

      // Build provider info for tracking
      const providerInfo: AIProviderInfo = {
        providerId: 'openai',
        providerType: 'cloud',
        model: chatResult.model,
        usedFallback: false,
        inputTokens: chatResult.inputTokens,
        outputTokens: chatResult.outputTokens,
        latencyMs,
        estimatedCostUSD: estimateCost('openai', chatResult.model, chatResult.inputTokens, chatResult.outputTokens),
      };

      return {
        response: chatResult.content,
        contextUsed,
        providerInfo,
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
   * Supports 9 languages: English, Chinese, Japanese, Korean, Spanish, French, German, Italian, Portuguese
   */
  analyzeQuery(userMessage: string): {
    suggestedDataType?: 'health' | 'location' | 'voice' | 'photo';
    suggestedActivity?: string;
    isCountQuery: boolean;
    isAverageQuery: boolean;
    isComparisonQuery: boolean;
  } {
    const messageLower = userMessage.toLowerCase();

    // Detect counting patterns (all 9 languages)
    // en: how many, number of, count, times, how often
    // zh: 几个, 几次, 多少, 数量, 多少张 (张=counter for photos)
    // ja: いくつ, 何個, 何回, 何度, 回数, 何枚 (枚=counter for photos)
    // ko: 몇 개, 몇 번, 몇 장, 얼마나, 횟수
    // es: cuántos, cuántas, número de, veces
    // fr: combien, nombre de, fois
    // de: wie viele, wieviel, wie oft, anzahl, mal
    // it: quanti, quante, numero di, volte
    // pt: quantos, quantas, número de, vezes
    const isCountQuery = /how many|number of|count|times|how often|几个|几次|多少个|多少次|多少张|有几|数量|统计|いくつ|何個|何回|何度|何枚|回数|몇\s?개|몇\s?번|몇\s?장|얼마나|횟수|cuántos|cuántas|número de|cantidad|veces|combien|nombre de|fois|wie viele|wieviel|wie oft|anzahl|mal|quanti|quante|numero di|volte|quantos|quantas|número de|vezes/i.test(userMessage);

    // Detect average patterns (all 9 languages)
    // en: average, mean, typical
    // zh: 平均, 均值
    // ja: 平均, 平均値
    // ko: 평균
    // es: promedio, media
    // fr: moyenne
    // de: durchschnitt, mittel
    // it: media, medio
    // pt: média
    const isAverageQuery = /average|mean|typical|平均|均值|平均値|평균|promedio|media|moyenne|durchschnitt|mittel|medio|média/i.test(userMessage);

    // Detect comparison patterns (all 9 languages)
    // en: more than, less than, compare
    // zh: 比较, 超过, 少于
    // ja: より多い, より少ない, 比較
    // ko: 보다 많은, 보다 적은, 비교
    // es: más que, menos que, comparar
    // fr: plus que, moins que, comparer
    // de: mehr als, weniger als, vergleichen
    // it: più di, meno di, confrontare
    // pt: mais que, menos que, comparar
    const isComparisonQuery = /more than|less than|compare|versus|比较|超过|少于|对比|より多い|より少ない|比較|보다\s?많|보다\s?적|비교|más que|menos que|comparar|plus que|moins que|comparer|mehr als|weniger als|vergleichen|più di|meno di|confrontare|mais que|menos que|comparar/i.test(userMessage);

    // Detect data type (all 9 languages)
    let suggestedDataType: 'health' | 'location' | 'voice' | 'photo' | undefined;

    // Photo keywords (all 9 languages)
    // en: photo, picture, image
    // zh: 照片, 图片, 相片
    // ja: 写真, 画像, フォト
    // ko: 사진, 이미지
    // es: foto, fotografía, imagen
    // fr: photo, image
    // de: foto, bild
    // it: foto, immagine
    // pt: foto, imagem
    if (/photo|picture|image|took|captured|show me|visual|照片|图片|相片|拍照|拍摄|写真|画像|フォト|사진|이미지|foto|fotografía|imagen|bild|immagine|imagem/i.test(userMessage)) {
      suggestedDataType = 'photo';
    }
    // Health keywords (all 9 languages)
    // en: steps, walk, heart, sleep, workout, exercise, fitness, train
    // zh: 步数, 走路, 心率, 睡眠, 运动, 健身
    // ja: 歩数, 睡眠, 運動, 心拍, ヘルス, トレーニング
    // ko: 걸음, 수면, 운동, 심박, 건강, 트레이닝
    // es: pasos, sueño, ejercicio, ritmo cardíaco, salud, entrenar
    // fr: pas, sommeil, exercice, rythme cardiaque, santé, entraîner
    // de: schritte, schlaf, übung, herzfrequenz, gesundheit, trainiert, training
    // it: passi, sonno, esercizio, frequenza cardiaca, salute, allenamento
    // pt: passos, sono, exercício, frequência cardíaca, saúde
    else if (/steps|walk|heart|sleep|workout|exercise|fitness|health|train|步数|走路|心率|睡眠|运动|健身|锻炼|歩数|運動|心拍|ヘルス|トレーニング|걸음|수면|운동|심박|건강|트레이닝|pasos|sueño|ejercicio|ritmo cardíaco|salud|entrenar|pas|sommeil|exercice|rythme cardiaque|santé|entraîner|schritte|schlaf|übung|herzfrequenz|gesundheit|trainiert|training|passi|sonno|esercizio|frequenza cardiaca|salute|allenamento|passos|sono|exercício|frequência cardíaca|saúde/i.test(userMessage)) {
      suggestedDataType = 'health';
    }
    // Location keywords (all 9 languages)
    // en: location, place, where, visit
    // zh: 位置, 地点, 去了, 到过
    // ja: 場所, 位置, 訪問, どこ
    // ko: 장소, 위치, 방문, 어디
    // es: lugar, ubicación, visita, dónde
    // fr: lieu, endroit, visite, où
    // de: ort, standort, besuch, wo
    // it: luogo, posizione, visita, dove
    // pt: lugar, local, visita, onde
    else if (/location|place|where|visit|go|been to|位置|地点|去了|到过|去过|場所|訪問|どこ|장소|위치|방문|어디|lugar|ubicación|visita|dónde|lieu|endroit|visite|où|ort|standort|besuch|wo|luogo|posizione|dove|local|onde/i.test(userMessage)) {
      suggestedDataType = 'location';
    }
    // Voice keywords (all 9 languages)
    // en: voice, note, said, recorded, audio
    // zh: 语音, 录音, 音频, 语音信息
    // ja: 音声, ボイス, 録音, メモ
    // ko: 음성, 녹음, 메모, 오디오
    // es: voz, nota de voz, grabación, audio
    // fr: voix, note vocale, enregistrement, audio
    // de: stimme, sprachnotiz, aufnahme, audio
    // it: voce, nota vocale, registrazione, audio
    // pt: voz, nota de voz, gravação, áudio
    else if (/voice|note|said|recorded|audio|语音|录音|音频|记录|语音信息|语音笔记|音声|ボイス|メモ|음성|녹음|메모|오디오|voz|nota de voz|grabación|voix|note vocale|enregistrement|stimme|sprachnotiz|aufnahme|voce|nota vocale|registrazione|gravação|áudio/i.test(userMessage)) {
      suggestedDataType = 'voice';
    }

    // Detect activity mentions (all 9 languages)
    // Common activities: badminton, gym, running, swimming, yoga, cycling
    const activityMatches = messageLower.match(/badminton|gym|work|restaurant|running|cycling|swimming|yoga|羽毛球|健身房|跑步|游泳|瑜伽|骑行|バドミントン|ジム|ランニング|水泳|ヨガ|배드민턴|헬스장|달리기|수영|요가|bádminton|gimnasio|correr|natación|natation|gymnastique|courir|nager|schwimmen|laufen|nuoto|correre|nuotando|corrida|natação/i);
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

    // Detect "today" (all 9 languages)
    // en: today | zh: 今天 | ja: 今日 | ko: 오늘 | es: hoy | fr: aujourd'hui | de: heute | it: oggi | pt: hoje
    if (/\btoday\b|今天|今日|오늘|hoy|aujourd'hui|heute|oggi|hoje/i.test(userMessage)) {
      return {
        hasTemporalIntent: true,
        dateRange: { start: startOfDay(today), end: endOfDay(today) },
        timeReference: 'today'
      };
    }

    // Detect "yesterday" (all 9 languages)
    // en: yesterday | zh: 昨天 | ja: 昨日 | ko: 어제 | es: ayer | fr: hier | de: gestern | it: ieri | pt: ontem
    if (/\byesterday\b|昨天|昨日|어제|ayer|hier|gestern|ieri|ontem/i.test(userMessage)) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        hasTemporalIntent: true,
        dateRange: { start: startOfDay(yesterday), end: endOfDay(yesterday) },
        timeReference: 'yesterday'
      };
    }

    // Detect "day before yesterday" / "2 days ago" (all 9 languages)
    // en: day before yesterday | zh: 前天 | ja: 一昨日/おととい | ko: 그저께/그제 | es: anteayer | fr: avant-hier | de: vorgestern | it: l'altro ieri | pt: anteontem
    if (/day before yesterday|2 days ago|前天|一昨日|おととい|그저께|그제|anteayer|avant-hier|vorgestern|l'altro ieri|ieri l'altro|anteontem/i.test(userMessage)) {
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      return {
        hasTemporalIntent: true,
        dateRange: { start: startOfDay(twoDaysAgo), end: endOfDay(twoDaysAgo) },
        timeReference: 'day before yesterday'
      };
    }

    // Detect "N days ago" (all 9 languages)
    // en: N days ago | zh: N天前 | ja: N日前 | ko: N일 전 | es: hace N días | fr: il y a N jours | de: vor N Tagen | it: N giorni fa | pt: há N dias
    const daysAgoMatch =
      messageLower.match(/(\d+)\s+days?\s+ago/) ||           // English
      userMessage.match(/(\d+)天前/) ||                       // Chinese
      userMessage.match(/(\d+)日前/) ||                       // Japanese
      userMessage.match(/(\d+)일\s*전/) ||                    // Korean
      messageLower.match(/hace\s+(\d+)\s+días?/) ||           // Spanish
      messageLower.match(/il y a\s+(\d+)\s+jours?/) ||        // French
      messageLower.match(/vor\s+(\d+)\s+tagen?/i) ||          // German
      messageLower.match(/(\d+)\s+giorni?\s+fa/) ||           // Italian
      messageLower.match(/há\s+(\d+)\s+dias?/);               // Portuguese
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

    // Detect "this week" (all 9 languages)
    // en: this week | zh: 这周/本周/这个星期 | ja: 今週 | ko: 이번 주/이번주 | es: esta semana | fr: cette semaine | de: diese woche | it: questa settimana | pt: esta semana
    if (/\bthis week\b|这周|本周|这个星期|今週|이번\s*주|esta semana|cette semaine|diese woche|questa settimana/i.test(userMessage)) {
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - today.getDay()); // Sunday
      return {
        hasTemporalIntent: true,
        dateRange: { start: startOfDay(weekStart), end: endOfDay(today) },
        timeReference: 'this week'
      };
    }

    // Detect "last week" (all 9 languages)
    // en: last week | zh: 上周/上星期 | ja: 先週 | ko: 지난 주/지난주 | es: la semana pasada | fr: la semaine dernière | de: letzte woche | it: la settimana scorsa | pt: semana passada
    if (/\blast week\b|上周|上星期|先週|지난\s*주|la semana pasada|semana passada|la semaine dernière|semaine dernière|letzte woche|la settimana scorsa|settimana scorsa/i.test(userMessage)) {
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

    // Detect "this month" (all 9 languages)
    // en: this month | zh: 这个月/本月 | ja: 今月 | ko: 이번 달/이번달 | es: este mes | fr: ce mois | de: diesen monat/dieser monat | it: questo mese | pt: este mês
    if (/\bthis month\b|这个月|本月|今月|이번\s*달|este mes|ce mois|ce mois-ci|diesen monat|dieser monat|questo mese|este mês/i.test(userMessage)) {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        hasTemporalIntent: true,
        dateRange: { start: startOfDay(monthStart), end: endOfDay(today) },
        timeReference: 'this month'
      };
    }

    // Detect "last month" (all 9 languages)
    // en: last month | zh: 上个月/上月 | ja: 先月 | ko: 지난 달/지난달 | es: el mes pasado | fr: le mois dernier | de: letzten monat | it: il mese scorso | pt: mês passado
    if (/\blast month\b|上个月|上月|先月|지난\s*달|el mes pasado|mes pasado|le mois dernier|mois dernier|letzten monat|letzter monat|il mese scorso|mese scorso|mês passado/i.test(userMessage)) {
      const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0); // Last day of previous month
      return {
        hasTemporalIntent: true,
        dateRange: { start: startOfDay(lastMonthStart), end: endOfDay(lastMonthEnd) },
        timeReference: 'last month'
      };
    }

    // Detect "this year" (all 9 languages)
    // en: this year | zh: 今年 | ja: 今年 | ko: 올해 | es: este año | fr: cette année | de: dieses jahr | it: quest'anno | pt: este ano
    if (/\bthis year\b|今年|올해|este año|cette année|dieses jahr|quest'anno|questo anno|este ano/i.test(userMessage)) {
      const yearStart = new Date(today.getFullYear(), 0, 1);
      return {
        hasTemporalIntent: true,
        dateRange: { start: startOfDay(yearStart), end: endOfDay(today) },
        timeReference: 'this year'
      };
    }

    // Detect "last year" (all 9 languages)
    // en: last year | zh: 去年 | ja: 去年/昨年 | ko: 작년 | es: el año pasado | fr: l'année dernière | de: letztes jahr | it: l'anno scorso | pt: ano passado
    if (/\blast year\b|去年|昨年|작년|el año pasado|año pasado|l'année dernière|année dernière|letztes jahr|l'anno scorso|anno scorso|ano passado/i.test(userMessage)) {
      const lastYearStart = new Date(today.getFullYear() - 1, 0, 1);
      const lastYearEnd = new Date(today.getFullYear() - 1, 11, 31);
      return {
        hasTemporalIntent: true,
        dateRange: { start: startOfDay(lastYearStart), end: endOfDay(lastYearEnd) },
        timeReference: 'last year'
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

      // 2. Fetch per-friend settings for all circle members (excluding self)
      const memberIdsExcludingSelf = circle.memberIds.filter((id: string) => id !== currentUserId);
      const perFriendSettings = await this.firestoreService.getPrivacySettingsForFriends(
        currentUserId,
        memberIdsExcludingSelf
      );
      console.log(`[RAGEngine] Fetched per-friend settings for ${perFriendSettings.size} friends`);

      // 3. Generate query embedding
      console.log('[RAGEngine] Generating embedding for circle query...');
      const queryEmbedding = await this.openAIService.generateEmbedding(
        userMessage,
        currentUserId,
        'rag_circle_query_embedding'
      );

      // 4. Build data type filter based on circle sharing rules
      const dataTypeFilter = this.buildCircleDataFilter(circle.dataSharing);

      // 5. Query Pinecone with multi-user filter + data type filter
      console.log(`[RAGEngine] Querying Pinecone for ${circle.memberIds.length} circle members...`);
      const relevantVectors = await this.pineconeService.queryMultiUserVectors(
        queryEmbedding,
        circle.memberIds,
        20, // Get more results for circle queries
        dataTypeFilter,
        'rag_circle_query_vector'
      );

      console.log(`[RAGEngine] Found ${relevantVectors.length} relevant data points across circle members`);

      // 6. Filter results by effective sharing (circle AND per-friend settings intersection)
      const filteredVectors = this.filterByEffectiveSharing(
        relevantVectors,
        currentUserId,
        circle.dataSharing,
        perFriendSettings
      );
      console.log(`[RAGEngine] After per-friend filtering: ${filteredVectors.length} results remain`);

      // 7. Build context with member attribution
      const context = await this.buildCircleContext(filteredVectors, circle, currentUserId);

      // 8. System prompt for circle context
      const systemPrompt = `You are analyzing data for a friend circle called "${circle.name}" with ${circle.memberIds.length} members.
When referencing data, mention which member it's from by name.
Be conversational and friendly - this is a private circle of close friends.
Respect the data sharing settings - only data types enabled for this circle are included.`;

      // 9. Generate response
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

      // 10. Return response with attributed context
      const contextUsed: ContextReference[] = filteredVectors.map((vector) => ({
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
   * Filter vectors by effective sharing (circle AND per-friend settings intersection)
   *
   * This implements the key privacy rule: per-friend settings define the MAXIMUM
   * you're willing to share with that friend. Circle settings can only request
   * UP TO that limit.
   *
   * @param vectors - Vectors returned from Pinecone query
   * @param currentUserId - The user making the query
   * @param circleSharing - The circle's data sharing configuration
   * @param perFriendSettings - Map of friendId -> FriendPrivacySettings
   * @returns Filtered vectors respecting both circle and per-friend settings
   */
  private filterByEffectiveSharing(
    vectors: PineconeQueryResult[],
    currentUserId: string,
    circleSharing: CircleDataSharing,
    perFriendSettings: Map<string, FriendPrivacySettings>
  ): PineconeQueryResult[] {
    return vectors.filter(vector => {
      const ownerId = vector.metadata.userId;

      // Current user always sees their own data
      if (ownerId === currentUserId) {
        return true;
      }

      // Get per-friend settings (default to all-false if no friendship exists)
      const friendSettings = perFriendSettings.get(ownerId) ?? {
        shareHealth: false,
        shareLocation: false,
        shareActivities: false,
        shareDiary: false,
        shareVoiceNotes: false,
        sharePhotos: false,
      };

      // Compute effective sharing (intersection of circle and per-friend settings)
      const effective = computeEffectiveSharing(circleSharing, friendSettings);

      // Apply filter based on data type
      const dataType = vector.metadata.type;
      switch (dataType) {
        case 'health':
          return effective.shareHealth;
        case 'location':
          return effective.shareLocation;
        case 'voice':
          return effective.shareVoiceNotes;
        case 'photo':
          return effective.sharePhotos;
        case 'shared_activity':
          return effective.shareActivities;
        default:
          // Unknown data type - deny access by default for security
          return false;
      }
    });
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
