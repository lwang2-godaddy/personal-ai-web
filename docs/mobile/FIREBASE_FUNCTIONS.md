# Firebase Functions

Documentation for Firebase Cloud Functions used by the PersonalAI mobile app.

## Overview

Firebase Cloud Functions handle server-side processing:

- **Embedding Generation:** Convert data to vectors for RAG
- **Transcription:** Process voice notes
- **User Management:** Handle new user setup
- **RAG Queries:** Server-side RAG endpoint

**Location:** `PersonalAIApp/firebase/functions/`

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Firebase Cloud Functions                   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐     ┌─────────────────┐                │
│  │  Firestore      │     │  HTTPS          │                │
│  │  Triggers       │     │  Callable       │                │
│  │                 │     │                 │                │
│  │ onHealthCreated │     │ queryRAG        │                │
│  │ onLocationCreated     │ processVoice    │                │
│  │ onVoiceCreated  │     │                 │                │
│  │ onTextCreated   │     │                 │                │
│  │ onPhotoCreated  │     │                 │                │
│  │ onUserCreated   │     │                 │                │
│  └────────┬────────┘     └────────┬────────┘                │
│           │                       │                          │
│           ▼                       ▼                          │
│  ┌─────────────────────────────────────────┐                │
│  │           Shared Services               │                │
│  │                                         │                │
│  │  EmbeddingService  │  PineconeService   │                │
│  │  OpenAIService     │  FirestoreService  │                │
│  └────────────────────┬────────────────────┘                │
│                       │                                      │
└───────────────────────│──────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
   ┌─────────┐    ┌─────────┐    ┌─────────┐
   │ OpenAI  │    │Pinecone │    │Firestore│
   │   API   │    │   API   │    │  Admin  │
   └─────────┘    └─────────┘    └─────────┘
```

---

## Project Setup

### Directory Structure

```
firebase/functions/
├── src/
│   ├── index.ts              # Function exports
│   ├── triggers/             # Firestore triggers
│   │   ├── onHealthCreated.ts
│   │   ├── onLocationCreated.ts
│   │   ├── onVoiceCreated.ts
│   │   ├── onTextCreated.ts
│   │   ├── onPhotoCreated.ts
│   │   └── onUserCreated.ts
│   ├── callable/             # HTTPS callable functions
│   │   ├── queryRAG.ts
│   │   └── processVoice.ts
│   └── services/             # Shared services
│       ├── embedding.ts
│       ├── openai.ts
│       ├── pinecone.ts
│       └── textGenerator.ts
├── .env                      # Environment variables
├── package.json
└── tsconfig.json
```

### Environment Variables

Create `.env` in `firebase/functions/`:

```bash
OPENAI_KEY=sk-your_openai_key
PINECONE_KEY=your_pinecone_key
PINECONE_INDEX=personal-ai-data
PINECONE_ENVIRONMENT=us-east-1-aws
```

### Installation

```bash
cd firebase/functions

# Install dependencies
npm install

# Build TypeScript
npm run build

# Deploy all functions
npm run deploy

# Deploy specific function
firebase deploy --only functions:onHealthDataCreated
```

---

## Firestore Triggers

### onHealthDataCreated

**Trigger:** When a new health data document is created

```typescript
// src/triggers/onHealthCreated.ts
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { EmbeddingService } from '../services/embedding';
import { PineconeService } from '../services/pinecone';
import { HealthTextGenerator } from '../services/textGenerator';

export const onHealthDataCreated = onDocumentCreated(
  {
    document: 'healthData/{docId}',
    region: 'us-central1',
    timeoutSeconds: 120,
    memory: '256MiB',
  },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const docId = event.params.docId;

    try {
      // Generate natural language text
      const text = HealthTextGenerator.generate(data);

      // Generate embedding
      const embedding = await EmbeddingService.generateEmbedding(text);

      // Prepare metadata (filter nulls)
      const metadata = filterNullValues({
        userId: data.userId,
        type: 'health',
        dataType: data.dataType,
        value: data.value,
        unit: data.unit,
        text: text,
        recordedAt: data.recordedAt,
      });

      // Store in Pinecone
      await PineconeService.upsert({
        id: `health_${docId}`,
        values: embedding,
        metadata,
      });

      // Update Firestore with embedding ID
      await event.data?.ref.update({
        embeddingId: `health_${docId}`,
        embeddingCreatedAt: new Date().toISOString(),
      });

      console.log(`Successfully processed health data: ${docId}`);
    } catch (error: any) {
      console.error(`Error processing health data ${docId}:`, error);

      // Record error in Firestore
      await event.data?.ref.update({
        embeddingError: error.message,
        embeddingErrorAt: new Date().toISOString(),
      });
    }
  }
);
```

### onLocationDataCreated

**Trigger:** When a new location document is created

```typescript
export const onLocationDataCreated = onDocumentCreated(
  {
    document: 'locationData/{docId}',
    region: 'us-central1',
    timeoutSeconds: 120,
    memory: '256MiB',
  },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const docId = event.params.docId;

    try {
      // Generate natural language text
      const text = LocationTextGenerator.generate(data);

      // Generate embedding
      const embedding = await EmbeddingService.generateEmbedding(text);

      // Prepare metadata
      const metadata = filterNullValues({
        userId: data.userId,
        type: 'location',
        latitude: data.latitude,
        longitude: data.longitude,
        placeName: data.placeName,
        activityType: data.activityType,
        text: text,
        recordedAt: data.recordedAt,
      });

      // Store in Pinecone
      await PineconeService.upsert({
        id: `location_${docId}`,
        values: embedding,
        metadata,
      });

      // Update Firestore
      await event.data?.ref.update({
        embeddingId: `location_${docId}`,
        embeddingCreatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error(`Error processing location ${docId}:`, error);
      await event.data?.ref.update({
        embeddingError: error.message,
        embeddingErrorAt: new Date().toISOString(),
      });
    }
  }
);
```

### onVoiceNoteCreated

**Trigger:** When a new voice note is created

```typescript
export const onVoiceNoteCreated = onDocumentCreated(
  {
    document: 'voiceNotes/{docId}',
    region: 'us-central1',
    timeoutSeconds: 300, // 5 minutes for transcription
    memory: '512MiB',
  },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const docId = event.params.docId;

    try {
      // Download audio file
      const audioUrl = data.audioUrl;
      if (!audioUrl) {
        throw new Error('No audio URL provided');
      }

      // Transcribe with Whisper
      const transcription = await OpenAIService.transcribe(audioUrl);

      // Update document with transcription
      await event.data?.ref.update({
        transcription: transcription,
        transcriptionStatus: 'completed',
      });

      // Generate text for embedding
      const text = VoiceNoteTextGenerator.generate({
        ...data,
        transcription,
      });

      // Generate embedding
      const embedding = await EmbeddingService.generateEmbedding(text);

      // Store in Pinecone
      await PineconeService.upsert({
        id: `voice_${docId}`,
        values: embedding,
        metadata: filterNullValues({
          userId: data.userId,
          type: 'voice',
          text: text,
          transcription: transcription,
          duration: data.duration,
          recordedAt: data.recordedAt,
        }),
      });

      // Update Firestore with embedding ID
      await event.data?.ref.update({
        embeddingId: `voice_${docId}`,
        embeddingCreatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error(`Error processing voice note ${docId}:`, error);
      await event.data?.ref.update({
        transcriptionStatus: 'failed',
        embeddingError: error.message,
        embeddingErrorAt: new Date().toISOString(),
      });
    }
  }
);
```

### onTextNoteCreated

**Trigger:** When a new text note (diary/thought) is created

```typescript
export const onTextNoteCreated = onDocumentCreated(
  {
    document: 'textNotes/{docId}',
    region: 'us-central1',
    timeoutSeconds: 120,
    memory: '256MiB',
  },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const docId = event.params.docId;

    try {
      // Generate text for embedding
      const text = TextNoteTextGenerator.generate(data);

      // Generate embedding
      const embedding = await EmbeddingService.generateEmbedding(text);

      // Store in Pinecone
      await PineconeService.upsert({
        id: `text_${docId}`,
        values: embedding,
        metadata: filterNullValues({
          userId: data.userId,
          type: data.type === 'thought' ? 'thought' : 'diary',
          text: text,
          title: data.title,
          tags: data.tags?.join(','),
          createdAt: data.createdAt,
        }),
      });

      // Update Firestore
      await event.data?.ref.update({
        embeddingId: `text_${docId}`,
        embeddingCreatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error(`Error processing text note ${docId}:`, error);
      await event.data?.ref.update({
        embeddingError: error.message,
        embeddingErrorAt: new Date().toISOString(),
      });
    }
  }
);
```

### onUserCreated

**Trigger:** When a new user signs up (Auth trigger)

```typescript
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { beforeUserCreated } from 'firebase-functions/v2/identity';

// Firestore trigger for user document
export const onUserDocumentCreated = onDocumentCreated(
  {
    document: 'users/{userId}',
    region: 'us-central1',
  },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const userId = event.params.userId;

    // Initialize user-specific resources
    await initializeUserResources(userId);

    // Send welcome notification
    await sendWelcomeNotification(userId, data.email);

    console.log(`User initialized: ${userId}`);
  }
);

// Auth trigger (before user is fully created)
export const beforeUserCreate = beforeUserCreated(async (event) => {
  const { email, displayName } = event.data;

  // Validate email domain (optional)
  // Block certain email domains if needed

  return {
    displayName: displayName || email?.split('@')[0] || 'User',
  };
});
```

---

## HTTPS Callable Functions

### queryRAG

**Purpose:** Server-side RAG query endpoint

```typescript
// src/callable/queryRAG.ts
import { onCall, HttpsError } from 'firebase-functions/v2/https';

export const queryRAG = onCall(
  {
    region: 'us-central1',
    timeoutSeconds: 120,
    memory: '512MiB',
  },
  async (request) => {
    // Verify authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = request.auth.uid;
    const { message, history, options } = request.data;

    if (!message || typeof message !== 'string') {
      throw new HttpsError('invalid-argument', 'Message is required');
    }

    try {
      // Generate query embedding
      const queryEmbedding = await EmbeddingService.generateEmbedding(message);

      // Query Pinecone
      const topK = options?.topK || 10;
      const vectors = await PineconeService.query({
        vector: queryEmbedding,
        filter: { userId },
        topK,
      });

      // Build context from retrieved vectors
      const context = buildContext(vectors);

      // Prepare chat messages
      const messages = [
        {
          role: 'system',
          content: `You are PersonalAI, a helpful assistant with access to the user's personal data. Use the following context to answer questions accurately.\n\nContext:\n${context}`,
        },
        ...(history || []),
        { role: 'user', content: message },
      ];

      // Generate response
      const response = await OpenAIService.chatCompletion(messages, {
        model: 'gpt-4o',
        maxTokens: options?.maxTokens || 2000,
        temperature: options?.temperature || 0.7,
      });

      return {
        response,
        sources: vectors.map((v) => ({
          id: v.id,
          type: v.metadata.type,
          text: v.metadata.text,
          score: v.score,
        })),
      };
    } catch (error: any) {
      console.error('RAG query error:', error);
      throw new HttpsError('internal', error.message);
    }
  }
);
```

---

## Services

### EmbeddingService

```typescript
// src/services/embedding.ts
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY,
});

export class EmbeddingService {
  static async generateEmbedding(text: string): Promise<number[]> {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    return response.data[0].embedding;
  }
}
```

### PineconeService

```typescript
// src/services/pinecone.ts
import { Pinecone } from '@pinecone-database/pinecone';

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_KEY!,
});

const index = pinecone.index(process.env.PINECONE_INDEX!);

export class PineconeService {
  static async upsert(vector: {
    id: string;
    values: number[];
    metadata: Record<string, any>;
  }): Promise<void> {
    await index.upsert([vector]);
  }

  static async query(params: {
    vector: number[];
    filter: Record<string, any>;
    topK: number;
  }): Promise<QueryResult[]> {
    const results = await index.query({
      vector: params.vector,
      filter: params.filter,
      topK: params.topK,
      includeMetadata: true,
    });

    return results.matches || [];
  }

  static async delete(ids: string[]): Promise<void> {
    await index.deleteMany(ids);
  }
}
```

### OpenAIService

```typescript
// src/services/openai.ts
import OpenAI from 'openai';
import fetch from 'node-fetch';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY,
});

export class OpenAIService {
  static async chatCompletion(
    messages: Array<{ role: string; content: string }>,
    options?: { model?: string; maxTokens?: number; temperature?: number }
  ): Promise<string> {
    const response = await openai.chat.completions.create({
      model: options?.model || 'gpt-4o',
      messages: messages as any,
      max_tokens: options?.maxTokens || 2000,
      temperature: options?.temperature || 0.7,
    });

    return response.choices[0]?.message?.content || '';
  }

  static async transcribe(audioUrl: string): Promise<string> {
    // Download audio file
    const response = await fetch(audioUrl);
    const buffer = await response.buffer();

    // Create file object for OpenAI
    const file = new File([buffer], 'audio.m4a', { type: 'audio/m4a' });

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
    });

    return transcription.text;
  }
}
```

---

## Utilities

### filterNullValues

```typescript
// CRITICAL: Pinecone rejects null values in metadata
function filterNullValues(
  obj: Record<string, any>
): Record<string, any> {
  const filtered: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined) {
      filtered[key] = value;
    }
  }

  return filtered;
}
```

### buildContext

```typescript
function buildContext(vectors: QueryResult[]): string {
  const sortedVectors = vectors.sort((a, b) => b.score - a.score);

  return sortedVectors
    .map((v, i) => {
      const relevance = (v.score * 100).toFixed(1);
      const text = v.metadata?.text || 'No text available';
      return `[${i + 1}] (${relevance}% relevant) ${text}`;
    })
    .join('\n\n');
}
```

---

## Deployment

### Deploy Commands

```bash
# Deploy all functions
cd firebase/functions
npm run deploy

# Deploy specific function
firebase deploy --only functions:onHealthDataCreated

# Deploy multiple functions
firebase deploy --only functions:onHealthDataCreated,functions:onLocationDataCreated

# View logs
firebase functions:log

# View specific function logs
firebase functions:log --only onHealthDataCreated
```

### Function Configuration

```typescript
// Configure function resources
export const myFunction = onDocumentCreated(
  {
    document: 'collection/{docId}',
    region: 'us-central1',        // Region
    timeoutSeconds: 120,          // Max 540 for 2nd gen
    memory: '256MiB',             // 128MiB to 32GiB
    minInstances: 0,              // Keep warm instances
    maxInstances: 100,            // Max concurrent
    concurrency: 80,              // Requests per instance
  },
  async (event) => {
    // Function code
  }
);
```

---

## Monitoring & Debugging

### View Logs

```bash
# All function logs
firebase functions:log

# Specific function
firebase functions:log --only onHealthDataCreated

# Recent logs
firebase functions:log -n 100
```

### Error Handling

```typescript
// Always update Firestore with error status
try {
  // Processing logic
} catch (error: any) {
  console.error(`Error processing ${docId}:`, error);

  // Record error for debugging
  await event.data?.ref.update({
    embeddingError: error.message,
    embeddingErrorAt: new Date().toISOString(),
  });

  // Optionally rethrow for retry
  throw error;
}
```

### Performance Monitoring

```typescript
import { logger } from 'firebase-functions/v2';

export const myFunction = onDocumentCreated(
  { document: 'collection/{docId}' },
  async (event) => {
    const startTime = Date.now();

    // Processing...

    const duration = Date.now() - startTime;
    logger.info(`Processed ${event.params.docId} in ${duration}ms`);
  }
);
```

---

## Cost Optimization

### Recommendations

1. **Right-size memory:** Start with 256MiB, increase only if needed
2. **Set appropriate timeouts:** Don't use max timeout unnecessarily
3. **Use minInstances sparingly:** Cold starts are usually acceptable
4. **Batch operations:** Combine multiple Pinecone upserts when possible

### Cost Estimates

| Operation | Approximate Cost |
|-----------|-----------------|
| Function invocation | ~$0.000001 per invocation |
| Memory usage | ~$0.0000025 per GB-second |
| OpenAI embedding | ~$0.0001 per text |
| Pinecone query | ~$0.000001 per query |

---

## Related Documentation

- [Architecture](./ARCHITECTURE.md) - System design
- [Sync & Storage](./SYNC.md) - Data synchronization
- [Build Guide](./BUILD.md) - Deployment instructions
