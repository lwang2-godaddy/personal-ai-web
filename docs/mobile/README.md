# Personal AI Mobile App

Comprehensive documentation for the PersonalAI React Native mobile application.

## Overview

PersonalAI Mobile is a React Native + Expo application that collects personal data (health, location, voice) and provides an AI-powered chatbot for querying your personal history.

**Tech Stack:**
- **Framework:** React Native 0.81.0 + Expo SDK 54.0
- **Language:** TypeScript (strict mode)
- **State Management:** Redux Toolkit + Redux Persist
- **Local Database:** WatermelonDB (SQLite)
- **Navigation:** React Navigation v6
- **Backend:** Firebase (Auth, Firestore, Storage, Cloud Functions)
- **AI Services:** OpenAI (GPT-4o, Embeddings, Whisper)
- **Vector Database:** Pinecone (serverless, 1536D)

---

## Quick Links

### Architecture
- [Architecture Overview](./ARCHITECTURE.md) - System design and data flow

### Native Features
- [Health Data Collection](./HEALTH_DATA.md) - HealthKit (iOS) & Google Fit (Android)
- [Background Location](./LOCATION.md) - GPS tracking and geofencing
- [Voice Features](./VOICE.md) - Recording, TTS, and wake word detection

### Services
- [Mobile Services](./SERVICES.md) - Business logic services reference
- [Sync & Storage](./SYNC.md) - WatermelonDB and cloud synchronization

### Build & Deploy
- [Build Guide](./BUILD.md) - iOS and Android build instructions
- [Firebase Functions](./FIREBASE_FUNCTIONS.md) - Cloud Functions for embedding generation

### AI Features
- [Related Memories](./RELATED_MEMORIES.md) - Semantic memory connections
- [Transcription Cleanup](./TRANSCRIPTION_CLEANUP.md) - AI cleanup for voice notes
- [Learned Vocabulary](./LEARNED_VOCABULARY.md) - User-learned corrections for transcription
- [Voice Topic Icons](./VOICE_TOPIC_ICONS.md) - Auto-categorization of voice notes

---

## Project Structure

```
PersonalAIApp/
├── src/
│   ├── api/                    # API clients (Firebase, OpenAI, Pinecone)
│   ├── components/             # 30+ UI component categories
│   ├── screens/                # 65+ screens across 21 directories
│   ├── services/               # 38+ service directories
│   │   ├── dataCollection/     # Health, location, voice collection
│   │   ├── sync/               # Cloud sync management
│   │   ├── rag/                # RAG engine
│   │   └── audio/              # TTS and audio processing
│   ├── store/                  # Redux slices (15 slices)
│   ├── models/                 # TypeScript models
│   ├── navigation/             # React Navigation config
│   ├── theme/                  # Design system (5 color themes)
│   └── utils/                  # Utility functions
├── firebase/                   # Firebase configuration
│   └── functions/              # Cloud Functions (Node.js 20)
├── ios/                        # iOS native project
├── android/                    # Android native project
└── docs/                       # Documentation
```

---

## Key Features

### 1. Data Collection

| Data Type | iOS | Android | Storage |
|-----------|-----|---------|---------|
| Health (steps, heart rate, sleep) | HealthKit | Google Fit | WatermelonDB → Firestore |
| Location (GPS, visits) | Core Location | Fused Location | WatermelonDB → Firestore |
| Voice Notes | AVFoundation | MediaRecorder | Local file + Firestore |
| Photos | PHPhotoLibrary | MediaStore | Firebase Storage |

### 2. AI-Powered Chat

The RAG (Retrieval-Augmented Generation) system enables intelligent queries:

```
User: "How many times did I play badminton this year?"
     ↓
1. Generate query embedding (OpenAI)
     ↓
2. Search Pinecone for relevant vectors (filtered by userId)
     ↓
3. Retrieve context from Firestore
     ↓
4. Send to GPT-4o with context
     ↓
AI: "Based on your location history, you visited SF Badminton Club
     23 times this year, typically on Tuesday and Thursday evenings."
```

### 3. Offline-First Architecture

- **WatermelonDB:** Local SQLite database for offline access
- **SyncManager:** Background sync when online
- **Conflict Resolution:** Last-write-wins with server timestamps

### 4. Voice Features

- **Voice Recording:** High-quality audio capture with Whisper transcription
- **Text-to-Speech:** Dual providers (native + premium voices)
- **Wake Word Detection:** "Hey SirCharge" activation (optional)

---

## Development Setup

### Prerequisites

- Node.js 20+
- Xcode 16+ (iOS)
- Android Studio (Android)
- CocoaPods (iOS)

### Installation

```bash
cd PersonalAIApp

# Install dependencies
npm install --legacy-peer-deps

# iOS: Install CocoaPods
cd ios && pod install && cd ..

# Start development server
npx expo start
```

### Running the App

```bash
# iOS Simulator
npx expo run:ios

# Android Emulator
npx expo run:android

# Specific iOS device
npx expo run:ios --device "iPhone 15 Pro"
```

### Environment Variables

Create `.env` in project root:

```bash
FIREBASE_API_KEY=...
FIREBASE_PROJECT_ID=...
FIREBASE_AUTH_DOMAIN=...
FIREBASE_STORAGE_BUCKET=...

OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...
PINECONE_INDEX_NAME=personal-ai-data
```

---

## Architecture Highlights

### Singleton Services

All major services use singleton pattern:

```typescript
class MyService {
  private static instance: MyService;

  static getInstance(): MyService {
    if (!MyService.instance) {
      MyService.instance = new MyService();
    }
    return MyService.instance;
  }
}
```

### User Data Isolation

**Critical:** All queries filter by `userId` to prevent data leakage:

```typescript
// Pinecone query with user filter
const results = await pinecone.query({
  vector: embedding,
  filter: { userId: userId }, // MANDATORY
  topK: 10
});
```

### Redux State Persistence

```typescript
// Only essential state is persisted
persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'settings'] // Minimal persistence
}
```

---

## Related Documentation

### Web Dashboard
The companion web app shares the same Firebase backend:
- Location: `/personal-ai-web/`
- Docs: [Web Documentation](../README.md)

### Firebase Backend
- Firestore collections: [Database Schema](../DATABASE_SCHEMA.md)
- Cloud Functions: [Firebase Functions](./FIREBASE_FUNCTIONS.md)
- Security rules: [Authentication](../infrastructure/AUTHENTICATION.md)
