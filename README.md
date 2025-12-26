# PersonalAI Web Dashboard

Web application companion to the PersonalAI mobile app. View and interact with your personal data through an AI-powered dashboard.

## Overview

This web app shares **100% of the backend** (Firebase, OpenAI, Pinecone) with the PersonalAI mobile app. Data collection happens on mobile, while the web provides:

- 💬 **AI Chat** - RAG-powered conversations about your personal data
- 📊 **Dashboard** - View health, location, voice, and photo data
- 🔍 **Search** - Advanced filters to find specific activities
- 🤝 **Social** - Friends, challenges, and shared activities

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **UI:** Tailwind CSS 4
- **State:** Redux Toolkit + Redux Persist (localStorage)
- **Backend:** Firebase Web SDK (Auth, Firestore, Storage)
- **AI:** OpenAI (GPT-4, Embeddings)
- **Vector DB:** Pinecone

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- Firebase project (shared with mobile app)
- OpenAI API key
- Pinecone API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd personal-ai-web
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   Copy `.env.local` and fill in your credentials:

   ```bash
   # Firebase Configuration (from Firebase Console)
   # These are safe to expose (NEXT_PUBLIC_) - Firebase security rules protect data
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

   # 🔒 CRITICAL: OpenAI/Pinecone keys are SERVER-ONLY (NO NEXT_PUBLIC_ prefix!)
   # These MUST NEVER be exposed to the browser
   OPENAI_API_KEY=sk-...
   PINECONE_API_KEY=your_pinecone_key
   PINECONE_INDEX=personal-ai-data
   PINECONE_ENVIRONMENT=us-east-1-aws
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
personal-ai-web/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth pages (login, signup)
│   ├── (dashboard)/       # Protected dashboard pages
│   └── layout.tsx         # Root layout with Redux provider
├── lib/                   # Business logic
│   ├── api/               # API clients
│   │   ├── firebase/      # Firebase Auth, Firestore, Storage
│   │   ├── openai/        # OpenAI client (to be ported)
│   │   └── pinecone/      # Pinecone client (to be ported)
│   ├── services/          # Business logic services
│   │   ├── rag/           # RAGEngine (to be ported)
│   │   ├── search/        # SearchService (to be ported)
│   │   └── social/        # SocialService (to be ported)
│   ├── store/             # Redux store
│   │   └── slices/        # Redux slices (auth, chat, search, social)
│   └── models/            # TypeScript interfaces
├── components/            # React components
│   ├── auth/              # AuthGuard, etc.
│   ├── chat/              # Chat UI components
│   └── ui/                # Reusable UI components
└── .env.local             # Environment variables
```

## Features Status

### ✅ Phase 1 Complete (Week 1)

- [x] Next.js 16 project initialized
- [x] Firebase Web SDK configured
- [x] Authentication (Google + Email/Password)
- [x] Redux store with persist
- [x] Protected routes
- [x] Login page with form validation
- [x] Dashboard layout with navigation

### 🚧 In Progress (Week 2)

- [ ] Port TypeScript models from mobile app
- [ ] Port RAGEngine service
- [ ] Port SearchService
- [ ] Port SocialService
- [ ] Adapt OpenAI and Pinecone clients for web

### 📅 Upcoming (Weeks 3-10)

- **Week 3:** Chat interface with RAG
- **Week 4:** Dashboard with data viewing
- **Week 5:** Search functionality
- **Week 6:** Data visualizations
- **Week 7:** Social features
- **Week 8:** Settings and profile
- **Week 9-10:** Polish, testing, deployment

## Development

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Code Style

- TypeScript with strict mode
- ESLint with Next.js config
- Tailwind CSS for styling
- Client components with 'use client' directive

## Architecture

### Authentication Flow

1. User visits `/` → Redirects to `/login` or `/dashboard`
2. Login page offers Google OAuth or email/password
3. On successful auth, Redux stores user data in localStorage
4. Protected routes use `AuthGuard` to check authentication
5. Dashboard provides navigation to all features

### Data Flow

```
Mobile App (Data Collection)
    ↓
Firebase Firestore + Storage
    ↓
Cloud Functions (Embedding Generation)
    ↓
Pinecone Vector DB
    ↓
Web App (Query & View)
    ↓
RAGEngine + GPT-4
    ↓
User Chat Interface
```

### Key Adaptations from Mobile

| Mobile (React Native) | Web (Next.js) |
|----------------------|----------------|
| AsyncStorage | localStorage |
| @react-native-firebase | firebase (web SDK) |
| NetInfo | navigator.onLine |
| React Navigation | Next.js App Router |
| react-native components | React + Tailwind |

## Environment Variables

**🔒 CRITICAL SECURITY:**
- **NEVER** prefix secret API keys with `NEXT_PUBLIC_` - they will be exposed to browsers!
- **ONLY** use `NEXT_PUBLIC_` for non-sensitive config (Firebase project IDs, etc.)
- See [Security Guide](docs/security/PREVENTING_API_KEY_EXPOSURE.md) for details

| Variable Type | Prefix | Example | Exposed to Browser? |
|--------------|--------|---------|---------------------|
| Firebase config | `NEXT_PUBLIC_` | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | ✅ Yes (protected by security rules) |
| OpenAI API key | ❌ **NO PREFIX** | `OPENAI_API_KEY` | ❌ No (server-only) |
| Pinecone API key | ❌ **NO PREFIX** | `PINECONE_API_KEY` | ❌ No (server-only) |

**Security Note:** Never commit `.env.local` to version control. The file is included in `.gitignore`.

## Security

### API Key Protection

**⚠️ CRITICAL:** This application has multiple layers of protection to prevent API key exposure:

1. **ESLint Rules** - Automatically blocks dangerous imports at dev time
2. **Security Check Script** - Run `./scripts/check-api-exposure.sh` before commits
3. **GitHub Actions** - Automated checks on every PR
4. **Server-only Files** - Use `.server.ts` suffix for server-only code

**Before Every Commit:**
```bash
./scripts/check-api-exposure.sh  # Must pass
npm run lint                      # Must pass
npm run build                     # Must pass
```

**Documentation:**
- 📚 [Full Security Guide](docs/security/PREVENTING_API_KEY_EXPOSURE.md)
- ⚡ [Quick Reference](docs/security/SECURITY_QUICK_REFERENCE.md)
- 🔒 [User Data Isolation](docs/security/USER_DATA_ISOLATION.md)

### Common Security Mistakes to Avoid

❌ **NEVER DO THIS:**
```typescript
// In Redux slice or component
import OpenAIService from '@/lib/api/openai/client'; // EXPOSES KEY!
```

✅ **ALWAYS DO THIS:**
```typescript
// In Redux slice or component
const response = await fetch('/api/chat', {
  method: 'POST',
  body: JSON.stringify({ message })
}); // SAFE - API route handles service calls
```

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import repository in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on push to `main`

### Other Platforms

This is a standard Next.js app and can be deployed to:
- Netlify
- AWS Amplify
- Google Cloud Run
- Self-hosted with Node.js

## Troubleshooting

### "Firebase: Error (auth/...)"

Check that Firebase credentials in `.env.local` are correct and that the Firebase project has Google Sign-In enabled in Authentication settings.

### "Module not found: Can't resolve '@/...'"

The `@/` alias is configured in `tsconfig.json` to point to the root directory. Make sure you're importing from the correct path.

### Build errors

Run `npm run build` to check for TypeScript errors. All errors must be resolved before deployment.

## Contributing

This project is part of the PersonalAI ecosystem. See the main repository for contribution guidelines.

## License

See main repository for license information.

## Related Documentation

- **Implementation Guide:** `../PersonalAIApp/docs/planning/WEB_APP_IMPLEMENTATION_GUIDE.md`
- **Mobile App Docs:** `../PersonalAIApp/CLAUDE.md`
- **Mobile Knowledge Base:** `../PersonalAIApp/KNOWLEDGE_BASE.md`
