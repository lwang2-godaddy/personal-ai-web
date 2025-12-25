# Environment Setup - API Keys Configured

## ✅ API Keys Copied from Mobile App

All API keys have been successfully copied from the mobile app (`PersonalAIApp/.env`) to the web app (`.env.local`).

### Configured Services:

#### 1. Firebase (Authentication, Firestore, Storage)
- **Project ID:** `personalaiapp-90131`
- **API Key:** ✅ Configured
- **Auth Domain:** `personalaiapp-90131.firebaseapp.com`
- **Storage Bucket:** `personalaiapp-90131.firebasestorage.app`
- **App ID:** `1:47652374818:web:a86f0d2eb96da89f7dfd7b`

#### 2. OpenAI (GPT-4, Embeddings, Whisper)
- **API Key:** ✅ Configured (sk-proj-...)
- **Model:** GPT-4, text-embedding-3-small
- **Usage:** RAG chatbot, embeddings generation

#### 3. Pinecone (Vector Database)
- **API Key:** ✅ Configured (pcsk_...)
- **Index:** `personal-ai-data`
- **Environment:** `us-east-1-aws`
- **Dimension:** 1536 (text-embedding-3-small)

#### 4. Firebase Cloud Functions
- **Base URL:** `https://us-central1-personalaiapp-90131.cloudfunctions.net`
- **Region:** us-central1

---

## Security Notes

### ✅ Protected from Git Commits
The `.env.local` file is already in `.gitignore` and will NOT be committed to the repository.

```bash
# .gitignore includes:
.env*
```

### ⚠️ Important: For Deployment

When deploying to Vercel (or any platform), you'll need to manually add these environment variables:

**Vercel Dashboard:** Project Settings → Environment Variables

Copy these from `.env.local`:
```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_OPENAI_API_KEY
NEXT_PUBLIC_PINECONE_API_KEY
NEXT_PUBLIC_PINECONE_INDEX
NEXT_PUBLIC_PINECONE_ENVIRONMENT
NEXT_PUBLIC_API_BASE_URL
```

---

## Firebase Configuration Needed

After deploying the web app, update Firebase Console settings:

### 1. Add Web App to Firebase Project

If not already added:
1. Go to [Firebase Console](https://console.firebase.google.com/project/personalaiapp-90131)
2. Click ⚙️ (Settings) → Project settings
3. Scroll to "Your apps" section
4. If no web app exists, click "Add app" → Web (</>) icon
5. Register app with nickname: "PersonalAI Web"
6. Copy configuration (already in `.env.local`)

### 2. Configure Authorized Domains

Go to **Authentication → Settings → Authorized domains**

Add these domains when deploying:
- ✅ `localhost` (already there for development)
- ➕ `your-app-name.vercel.app` (add after Vercel deployment)
- ➕ `your-custom-domain.com` (if using custom domain)

### 3. Enable Authentication Methods

Verify these are enabled:
- ✅ Email/Password
- ✅ Google Sign-In

---

## Testing Locally

### Start Development Server:
```bash
npm run dev
```

Visit: `http://localhost:3000`

### Test Authentication:
1. Click "Sign In with Google"
2. Or create account with Email/Password
3. Should redirect to `/dashboard` after successful login

### Test Data Sync:
1. Ensure mobile app has synced data to Firebase
2. Dashboard should show real statistics
3. Chat should respond using RAG with your personal data

---

## Build Verification

✅ **Build Status:** Successful

```bash
npm run build
```

Output:
```
✓ Compiled successfully in 1775.6ms
✓ Generating static pages using 13 workers (7/7) in 220.7ms

Route (app)
├ ○ /login
├ ○ /dashboard
├ ○ /chat
└ ƒ /api/chat (dynamic API route)
```

---

## Shared Infrastructure

The web app shares the same backend as the mobile app:

| Service | Shared? | Details |
|---------|---------|---------|
| **Firebase Project** | ✅ Yes | `personalaiapp-90131` |
| **Firestore Database** | ✅ Yes | Same collections: `users`, `health_data`, `location_data`, etc. |
| **Firebase Storage** | ✅ Yes | Same bucket for photos, voice notes |
| **Firebase Auth** | ✅ Yes | Same users can sign in on both platforms |
| **Cloud Functions** | ✅ Yes | Same 11 functions (embeddings, triggers) |
| **OpenAI Account** | ✅ Yes | Shared API key and usage |
| **Pinecone Index** | ✅ Yes | Same vector database: `personal-ai-data` |

**Benefit:** Users have a seamless experience - data collected on mobile is instantly available on web.

---

## Troubleshooting

### Issue: "Firebase API key invalid"
**Solution:** Verify `.env.local` has correct values (no spaces, no quotes)

### Issue: "OpenAI API key unauthorized"
**Solution:** Check if API key has credits/billing enabled at platform.openai.com

### Issue: "Pinecone connection failed"
**Solution:** Verify index name is `personal-ai-data` and environment is `us-east-1-aws`

### Issue: "No data showing in dashboard"
**Solution:**
1. Ensure mobile app has synced data to Firestore
2. Check Firestore Console: should see documents in collections
3. Verify userId matches between mobile and web

---

## Next Steps

1. ✅ API keys configured
2. ✅ Build successful
3. ➡️ Test locally: `npm run dev`
4. ➡️ Deploy to Vercel (see `DEPLOYMENT.md`)
5. ➡️ Update Firebase authorized domains after deployment

---

**Last Updated:** December 25, 2025
**Configuration Status:** ✅ Complete and ready for deployment
