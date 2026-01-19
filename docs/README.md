# Personal AI Web - Documentation

Welcome to the comprehensive documentation for Personal AI Web, a Next.js 16 web dashboard for the PersonalAI platform.

## Quick Links

| Document | Description |
|----------|-------------|
| [Architecture](./ARCHITECTURE.md) | System architecture, data flow, and tech stack |
| [API Reference](./API_REFERENCE.md) | Complete API endpoint documentation (51+ routes) |
| [Database Schema](./DATABASE_SCHEMA.md) | Firestore collections and TypeScript models |
| [Services](./SERVICES.md) | Core business logic services |
| [Components](./COMPONENTS.md) | UI component reference (60+ components) |

## Infrastructure

| Document | Description |
|----------|-------------|
| [Authentication](./infrastructure/AUTHENTICATION.md) | Firebase Auth, middleware, and session management |
| [State Management](./infrastructure/STATE_MANAGEMENT.md) | Redux architecture with 8 slices |
| [External Services](./infrastructure/EXTERNAL_SERVICES.md) | OpenAI, Pinecone, and Firebase integrations |
| [Deployment](./infrastructure/DEPLOYMENT.md) | Vercel deployment and environment setup |

## Features

| Document | Description |
|----------|-------------|
| [Dashboard](./features/DASHBOARD.md) | Stats, quick input, and activity feed |
| [Chat & RAG](./features/CHAT_RAG.md) | AI chat interface and RAG system |
| [Circles](./features/CIRCLES.md) | Social circles and group features |
| [Events](./features/EVENTS.md) | Calendar, events, and reminders |
| [Settings](./features/SETTINGS.md) | User preferences and notifications |
| [Admin](./features/ADMIN.md) | Admin dashboard and management tools |

## Mobile App Documentation

Documentation for the companion React Native mobile app (PersonalAIApp).

| Document | Description |
|----------|-------------|
| [Mobile Overview](./mobile/README.md) | Mobile app guide and quick links |
| [Architecture](./mobile/ARCHITECTURE.md) | Mobile system design and data flow |
| [Health Data](./mobile/HEALTH_DATA.md) | HealthKit (iOS) & Google Fit (Android) |
| [Location](./mobile/LOCATION.md) | Background GPS tracking and geofencing |
| [Voice](./mobile/VOICE.md) | Recording, TTS, and wake word detection |
| [Services](./mobile/SERVICES.md) | 38+ mobile services reference |
| [Sync & Storage](./mobile/SYNC.md) | WatermelonDB and cloud sync |
| [Build Guide](./mobile/BUILD.md) | iOS and Android build instructions |
| [Firebase Functions](./mobile/FIREBASE_FUNCTIONS.md) | Cloud Functions for embedding generation |

---

## Project Overview

**Personal AI Web** is a companion web dashboard for the PersonalAI mobile app. It provides:

- **RAG-Powered Chat**: Ask questions about your personal data with intelligent context retrieval
- **Data Input**: Quick thoughts, diary entries, voice notes, and photo uploads
- **Events Calendar**: View and manage extracted events with reminders
- **Social Circles**: Share data with close friends and family
- **Admin Tools**: User management, usage analytics, and billing overview

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS 4 |
| State | Redux Toolkit + Redux Persist |
| Backend | Firebase (Auth, Firestore, Storage, Functions) |
| AI | OpenAI (GPT-4o, Embeddings, Whisper) |
| Vector DB | Pinecone (serverless, 1536 dimensions) |
| Deployment | Vercel |

## Project Structure

```
personal-ai-web/
├── app/                    # Next.js App Router pages
│   ├── api/                # API route handlers (51+ endpoints)
│   ├── (auth)/             # Public auth pages (login, register)
│   ├── (dashboard)/        # Protected dashboard pages
│   ├── (admin)/            # Admin-only pages
│   └── layout.tsx          # Root layout with providers
├── components/             # React components (60+)
│   ├── auth/               # Authentication components
│   ├── chat/               # Chat interface components
│   ├── dashboard/          # Dashboard panel components
│   ├── circles/            # Social circles components
│   ├── events/             # Calendar and event components
│   ├── admin/              # Admin tool components
│   ├── common/             # Shared/reusable components
│   ├── create/             # Data creation forms
│   └── settings/           # User settings components
├── lib/                    # Core application logic
│   ├── api/                # API client utilities
│   │   ├── firebase/       # Firebase Admin SDK (server-side)
│   │   ├── openai/         # OpenAI API client
│   │   └── pinecone/       # Pinecone API client
│   ├── models/             # TypeScript interfaces (22+ models)
│   ├── services/           # Business logic services (23 services)
│   ├── store/              # Redux store configuration
│   │   └── slices/         # Redux slices (8 slices)
│   ├── middleware/         # Auth middleware
│   └── utils/              # Helper functions
├── public/                 # Static assets
└── docs/                   # This documentation
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- Firebase project with Firestore, Auth, and Storage enabled
- OpenAI API key
- Pinecone API key and index

### Installation

```bash
cd personal-ai-web
npm install
```

### Environment Variables

Create `.env.local` with:

```bash
# Firebase (all must be prefixed with NEXT_PUBLIC_)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# OpenAI
NEXT_PUBLIC_OPENAI_API_KEY=sk-...

# Pinecone
NEXT_PUBLIC_PINECONE_API_KEY=...
NEXT_PUBLIC_PINECONE_INDEX=personal-ai-data
NEXT_PUBLIC_PINECONE_ENVIRONMENT=us-east-1-aws

# Server-side only
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
OPENAI_ORG_API_KEY=sk-admin-...  # For billing API
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Key Concepts

### User Data Isolation

All user data is isolated by `userId`. Every Firestore document and Pinecone vector includes a `userId` field, and all queries filter by this field. This is enforced by:

1. **Firestore Security Rules**: `resource.data.userId == request.auth.uid`
2. **API Middleware**: `requireAuth()` validates tokens and extracts userId
3. **Pinecone Metadata Filter**: `filter: { userId: userId }` on all queries

### RAG (Retrieval-Augmented Generation)

The chat system uses RAG to answer questions about personal data:

1. User sends question
2. System generates embedding for the question
3. Pinecone returns top 10 relevant vectors (filtered by userId)
4. Context is built from retrieved documents
5. GPT-4o generates answer using context
6. Response includes source references with relevance scores

### Embedding Pipeline

All data types (health, location, voice, photo, text) are converted to embeddings:

1. Data is created via API or mobile app
2. Cloud Function triggers on Firestore document creation
3. Text representation is generated from data
4. OpenAI generates 1536-dimensional embedding
5. Vector is stored in Pinecone with metadata
6. `embeddingId` is written back to Firestore document

---

## Need Help?

- **Web App Docs**: Start with [Architecture](./ARCHITECTURE.md) and [API Reference](./API_REFERENCE.md)
- **Mobile App Docs**: See [Mobile Documentation](./mobile/README.md) or `PersonalAIApp/CLAUDE.md`
- **Firebase Functions**: See [Firebase Functions](./mobile/FIREBASE_FUNCTIONS.md) or `PersonalAIApp/firebase/functions/`
- **Admin Docs Viewer**: Access documentation at `/admin/docs` in the web app
- **Issues**: Report at repository issue tracker
