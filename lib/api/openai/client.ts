import OpenAI from 'openai';
import { ChatMessage } from '@/lib/models';

export class OpenAIService {
  private static instance: OpenAIService;
  private client: OpenAI;
  private embeddingCache: Map<string, number[]>;

  private constructor() {
    this.client = new OpenAI({
      apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
      dangerouslyAllowBrowser: true, // Required for client-side usage in Next.js
    });
    this.embeddingCache = new Map();
  }

  static getInstance(): OpenAIService {
    if (!OpenAIService.instance) {
      OpenAIService.instance = new OpenAIService();
    }
    return OpenAIService.instance;
  }

  /**
   * Generate embedding for text
   * Uses text-embedding-3-small model (1536 dimensions)
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Check cache first
      const cacheKey = this.getCacheKey(text);
      if (this.embeddingCache.has(cacheKey)) {
        return this.embeddingCache.get(cacheKey)!;
      }

      const response = await this.client.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });

      const embedding = response.data[0].embedding;

      // Cache the embedding
      this.embeddingCache.set(cacheKey, embedding);

      // Limit cache size to 1000 entries
      if (this.embeddingCache.size > 1000) {
        const firstKey = this.embeddingCache.keys().next().value;
        if (firstKey !== undefined) {
          this.embeddingCache.delete(firstKey);
        }
      }

      return embedding;
    } catch (error) {
      console.error('OpenAI embedding error:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings in batch
   */
  async generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    try {
      const response = await this.client.embeddings.create({
        model: 'text-embedding-3-small',
        input: texts,
      });

      return response.data.map((item) => item.embedding);
    } catch (error) {
      console.error('OpenAI batch embedding error:', error);
      throw error;
    }
  }

  /**
   * Transcribe audio file using Whisper (Web version)
   */
  async transcribeAudio(audioFile: File, language?: string): Promise<string> {
    try {
      const response = await this.client.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: language || 'en',
        response_format: 'text',
      });

      return response as unknown as string;
    } catch (error) {
      console.error('OpenAI transcription error:', error);
      throw error;
    }
  }

  /**
   * Generate speech from text using OpenAI TTS
   * @param text Text to convert to speech
   * @param voice Voice to use (alloy, echo, fable, onyx, nova, shimmer)
   * @returns Blob of audio data
   */
  async textToSpeech(
    text: string,
    voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' = 'alloy',
  ): Promise<Blob> {
    try {
      const response = await this.client.audio.speech.create({
        model: 'tts-1', // Use tts-1-hd for higher quality
        voice: voice,
        input: text,
      });

      // Convert response to Blob for web playback
      const arrayBuffer = await response.arrayBuffer();
      return new Blob([arrayBuffer], { type: 'audio/mpeg' });
    } catch (error) {
      console.error('[OpenAI] TTS error:', error);
      throw new Error('Failed to generate speech');
    }
  }

  /**
   * Generate chat completion with GPT-4
   */
  async chatCompletion(
    messages: ChatMessage[],
    context?: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
    },
  ): Promise<string> {
    try {
      const systemMessage = context
        ? {
            role: 'system' as const,
            content: `You are a personal AI assistant with access to the user's health, location, and voice data. Use the following context from the user's personal data to answer their question:\n\n${context}\n\nProvide helpful, accurate answers based on this data. If the data doesn't contain enough information to answer the question, say so clearly.`,
          }
        : {
            role: 'system' as const,
            content: 'You are a helpful personal AI assistant.',
          };

      const formattedMessages = [
        systemMessage,
        ...messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      ];

      const response = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages: formattedMessages as any,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 500,
        stream: false,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('OpenAI chat completion error:', error);
      throw error;
    }
  }

  /**
   * Generate chat completion with custom system prompt
   * Allows full control over the system message for specialized queries
   */
  async chatCompletionWithSystemPrompt(
    messages: ChatMessage[],
    context: string,
    systemPrompt: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
    },
  ): Promise<string> {
    try {
      const systemMessage = {
        role: 'system' as const,
        content: `${systemPrompt}\n\nContext from data:\n\n${context}`,
      };

      const formattedMessages = [
        systemMessage,
        ...messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      ];

      const response = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages: formattedMessages as any,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 500,
        stream: false,
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      console.error('OpenAI chat completion with custom system prompt error:', error);
      throw error;
    }
  }

  /**
   * Generate chat completion with streaming
   */
  async *chatCompletionStream(
    messages: ChatMessage[],
    context?: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
    },
  ): AsyncGenerator<string, void, unknown> {
    try {
      const systemMessage = context
        ? {
            role: 'system' as const,
            content: `You are a personal AI assistant. Use the following context:\n\n${context}`,
          }
        : {
            role: 'system' as const,
            content: 'You are a helpful personal AI assistant.',
          };

      const formattedMessages = [
        systemMessage,
        ...messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      ];

      const stream = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages: formattedMessages as any,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 500,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      console.error('OpenAI streaming error:', error);
      throw error;
    }
  }

  /**
   * Generate image description using GPT-4 Vision
   * Uses 'auto' detail level for cost optimization
   */
  async describeImage(imageUrl: string): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Describe this image in detail. Include: main subjects, activities, setting, mood, notable objects, colors. Keep it under 150 words and natural.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                  detail: 'auto', // Cost optimization: auto adjusts detail level
                },
              },
            ],
          },
        ],
        max_tokens: 300,
      });

      const description = response.choices[0]?.message?.content || '';

      console.log(`Generated image description: ${description.substring(0, 50)}...`);
      return description;
    } catch (error) {
      console.error('Error describing image:', error);
      throw new Error('Failed to generate image description');
    }
  }

  /**
   * Batch describe multiple images (with rate limiting)
   * Processes in batches of 5 with 2 second delay to avoid rate limits
   */
  async describeImagesBatch(imageUrls: string[]): Promise<string[]> {
    const descriptions: string[] = [];

    // Process in batches of 5 with 2 second delay to avoid rate limits
    for (let i = 0; i < imageUrls.length; i += 5) {
      const batch = imageUrls.slice(i, i + 5);
      const batchPromises = batch.map((url) => this.describeImage(url));
      const batchResults = await Promise.all(batchPromises);
      descriptions.push(...batchResults);

      if (i + 5 < imageUrls.length) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    return descriptions;
  }

  /**
   * Clear embedding cache
   */
  clearCache(): void {
    this.embeddingCache.clear();
  }

  /**
   * Get cache key for text (simple hash)
   */
  private getCacheKey(text: string): string {
    // Simple hash function for caching
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }
}

// Export singleton instance
export default OpenAIService.getInstance();
