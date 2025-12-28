# Production Deployment Guide - SirCharge Web Dashboard

## Overview

This guide covers deploying the SirCharge Next.js web dashboard to production. We'll focus on two recommended platforms:
1. **Vercel** (Recommended) - Zero-config, optimized for Next.js
2. **Firebase Hosting** (Alternative) - Already using Firebase backend

---

## Prerequisites

Before deploying, ensure you have:
- ✅ All features tested locally
- ✅ Firebase project configured (personalaiapp-90131)
- ✅ OpenAI API key
- ✅ Pinecone API key and index created
- ✅ Firestore security rules deployed
- ✅ Firestore indexes deployed
- ✅ Git repository with latest code

---

## Option 1: Vercel Deployment (Recommended)

### Why Vercel?
- Made by Next.js creators - zero configuration needed
- Automatic HTTPS and CDN
- Preview deployments for every git push
- Generous free tier
- Excellent performance and DX

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```

This will open a browser for authentication.

### Step 3: Deploy from Project Root

```bash
cd /Users/lwang2/Documents/GitHub/ios/personal/personal-ai-web
vercel
```

Follow the prompts:
- **Set up and deploy?** Yes
- **Which scope?** Your personal account
- **Link to existing project?** No (first time)
- **Project name?** personal-ai-web (or choose your own)
- **Directory?** ./ (current directory)
- **Override settings?** No

This will:
1. Create a new Vercel project
2. Upload and build your app
3. Deploy to a preview URL (e.g., personal-ai-web-xyz.vercel.app)

### Step 4: Configure Environment Variables in Vercel

**IMPORTANT:** You must add all environment variables in the Vercel dashboard.

1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to **Settings → Environment Variables**
4. Add the following variables for **Production** environment:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBy2DQOYfXTh951zdcakqTWzNMMZABA7_o
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=personalaiapp-90131.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=personalaiapp-90131
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=personalaiapp-90131.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=47652374818
NEXT_PUBLIC_FIREBASE_APP_ID=1:47652374818:web:a86f0d2eb96da89f7dfd7b

# OpenAI Configuration
NEXT_PUBLIC_OPENAI_API_KEY=sk-proj-YOUR_OPENAI_API_KEY_HERE

# Pinecone Configuration
NEXT_PUBLIC_PINECONE_API_KEY=pcsk_YOUR_PINECONE_API_KEY_HERE
NEXT_PUBLIC_PINECONE_INDEX=personal-ai-data
NEXT_PUBLIC_PINECONE_ENVIRONMENT=us-east-1-aws

# API Base URL (Cloud Functions)
NEXT_PUBLIC_API_BASE_URL=https://us-central1-personalaiapp-90131.cloudfunctions.net
```

**Click "Add" for each variable.**

### Step 5: Deploy to Production

After adding environment variables, trigger a production deployment:

```bash
vercel --prod
```

This will:
1. Build the app with production optimizations
2. Deploy to your production domain
3. Return the production URL

### Step 6: Configure Custom Domain (Optional)

1. Go to **Settings → Domains** in Vercel dashboard
2. Add your custom domain (e.g., app.personalai.com)
3. Follow DNS configuration instructions
4. Vercel will automatically provision SSL certificate

---

## Option 2: Firebase Hosting Deployment

### Why Firebase Hosting?
- Already using Firebase backend
- Free tier: 10GB storage, 360MB/day transfer
- Global CDN
- Automatic SSL

### Step 1: Install Firebase CLI (if not already)

```bash
npm install -g firebase-tools
firebase login
```

### Step 2: Initialize Firebase Hosting

```bash
cd /Users/lwang2/Documents/GitHub/ios/personal/personal-ai-web
firebase init hosting
```

Select:
- **Project:** Use existing project → personalaiapp-90131
- **Public directory:** out (Next.js static export directory)
- **Single-page app:** Yes
- **Automatic builds with GitHub:** No (for now)

### Step 3: Configure Next.js for Static Export

**⚠️ IMPORTANT:** Firebase Hosting requires static export. However, your app uses:
- Server-side Firebase initialization
- Dynamic routes
- API routes

**This makes Firebase Hosting NOT suitable for this application.**

**Recommendation:** Use Vercel instead, which supports full Next.js features including:
- Server-side rendering
- API routes
- Dynamic imports
- Middleware

---

## Recommended: Vercel Deployment

Based on your application architecture, **Vercel is the best choice** because:
1. ✅ Supports all Next.js features (SSR, API routes, middleware)
2. ✅ Zero configuration needed
3. ✅ Automatic HTTPS and CDN
4. ✅ Preview deployments for testing
5. ✅ Excellent performance

Firebase Hosting would require significant refactoring to static-only pages.

---

## Post-Deployment Verification

### 1. Test Authentication

1. Visit your production URL
2. Click "Login with Google"
3. Verify successful login
4. Check that user profile appears

### 2. Test Dashboard

1. Navigate to `/dashboard`
2. Verify stats load correctly
3. Check that recent data appears (health, location, voice, photo, diary)

### 3. Test Data Input Features

**Voice Notes:**
1. Navigate to `/create`
2. Record a short voice note
3. Verify upload and transcription works
4. Check that it appears in dashboard

**Photo Upload:**
1. Navigate to `/create` → Photo tab
2. Upload a test photo
3. Verify AI description generates
4. Check that it appears in dashboard

**Diary Entry:**
1. Navigate to `/create` → Diary tab
2. Write a test entry
3. Save and verify it appears in dashboard

### 4. Test Chat

1. Navigate to `/chat`
2. Ask a question about your data
3. Verify RAG search works and returns relevant context

### 5. Verify Cloud Functions Triggered

1. Go to Firebase Console → Firestore
2. Check that new documents have `embeddingId` field populated
3. This confirms Cloud Functions are running

### 6. Check Logs for Errors

**Vercel:**
- Dashboard → Project → Deployments → View Logs

**Firebase:**
```bash
firebase functions:log
```

---

## Environment Variables Security

### ⚠️ CRITICAL SECURITY ISSUE

Your `.env.local` file contains sensitive API keys with `NEXT_PUBLIC_` prefix. This means they are **exposed in the browser**!

**Current exposure:**
- ❌ OpenAI API key is visible in browser (anyone can steal and use it)
- ❌ Pinecone API key is visible in browser
- ⚠️ Firebase config is okay to expose (protected by Firebase Auth rules)

### Recommended Fix: Move Secrets to Server-Side

**Option A: Use API Routes (Recommended)**

1. Remove `NEXT_PUBLIC_` prefix from OpenAI and Pinecone keys
2. Create server-side API routes that use these keys
3. Client calls your API routes instead of calling OpenAI/Pinecone directly

**Example:**

```typescript
// .env.local (NO NEXT_PUBLIC_ prefix)
OPENAI_API_KEY=sk-proj-...
PINECONE_API_KEY=pcsk_...

// app/api/generate-embedding/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Server-side only
});

export async function POST(request: NextRequest) {
  const { text } = await request.json();

  // Verify user is authenticated
  // ... auth check ...

  const embedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });

  return NextResponse.json({ embedding: embedding.data[0].embedding });
}
```

**Option B: Use Firebase Cloud Functions**

Move all OpenAI and Pinecone operations to Firebase Cloud Functions (you're already doing this for embeddings).

**For immediate deployment:**
- Accept the risk that API keys are exposed
- Set up API key usage limits in OpenAI dashboard
- Monitor usage for anomalies
- Plan to refactor to server-side API routes

---

## Firebase Configuration

### Authorized Domains

Add your production domain to Firebase authorized domains:

1. Go to Firebase Console → Authentication → Settings
2. Scroll to **Authorized domains**
3. Add your Vercel domain (e.g., `personal-ai-web.vercel.app`)
4. If using custom domain, add that too

---

## Continuous Deployment

### Vercel + GitHub (Recommended)

1. **Push to GitHub:**
```bash
git remote add origin https://github.com/yourusername/personal-ai-web.git
git push -u origin main
```

2. **Connect in Vercel Dashboard:**
   - Go to Vercel dashboard
   - Click "Import Project"
   - Select your GitHub repository
   - Vercel will auto-deploy on every push to main

3. **Preview Deployments:**
   - Every pull request gets a preview URL
   - Test changes before merging to production

---

## Monitoring and Maintenance

### 1. Set Up Vercel Monitoring

- Go to Vercel dashboard → Analytics
- Monitor page views, performance, errors

### 2. Set Up Firebase Monitoring

```bash
# View Cloud Functions logs
firebase functions:log

# View real-time logs
firebase functions:log --only textNoteCreated --follow
```

### 3. Set Up OpenAI Usage Alerts

1. Go to OpenAI dashboard → Usage
2. Set up email alerts for:
   - High usage (e.g., > $50/month)
   - Unusual spikes

### 4. Set Up Pinecone Monitoring

1. Go to Pinecone dashboard
2. Monitor vector count and query volume

---

## Troubleshooting

### Issue: "Firebase: Error (auth/unauthorized-domain)"

**Solution:** Add your production domain to Firebase authorized domains (see above).

### Issue: Environment variables not loading

**Solution:**
1. Verify variables are set in Vercel dashboard
2. Redeploy: `vercel --prod`
3. Check spelling and `NEXT_PUBLIC_` prefix

### Issue: Firestore permission denied

**Solution:**
1. Verify user is authenticated
2. Check Firestore security rules are deployed
3. Check userId matches authenticated user

### Issue: Build fails

**Solution:**
1. Check build logs in Vercel dashboard
2. Run `npm run build` locally to reproduce
3. Fix TypeScript errors or missing dependencies

---

## Quick Start Commands

### Deploy to Vercel (First Time)

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
cd /Users/lwang2/Documents/GitHub/ios/personal/personal-ai-web
vercel

# After adding env vars in dashboard, deploy to production
vercel --prod
```

### Update Deployment

```bash
# Push to git (if connected to GitHub)
git add .
git commit -m "Update feature"
git push

# OR deploy directly
vercel --prod
```

---

## Cost Estimation

### Vercel Free Tier
- 100GB bandwidth/month
- Unlimited deployments
- **Cost:** $0/month (sufficient for testing and small user base)

### Vercel Pro (if needed)
- 1TB bandwidth/month
- Advanced analytics
- **Cost:** $20/month

### Firebase (Current Usage)
- Firestore: Free tier (50K reads/day, 20K writes/day)
- Storage: Free tier (5GB, 1GB/day transfer)
- Cloud Functions: Free tier (2M invocations/month)
- **Cost:** $0/month for low usage, $25-50/month for moderate usage

### OpenAI API (Critical)
- Embeddings (text-embedding-3-small): $0.02 per 1M tokens
- GPT-4o: $5 per 1M input tokens, $15 per 1M output tokens
- Whisper: $0.006 per minute of audio
- Vision: $5 per 1M tokens
- **Estimated:** $10-50/month depending on usage

### Pinecone Free Tier
- 1 index, 100K vectors, 1 pod
- **Cost:** $0/month (sufficient for testing)

### Total Estimated Cost
- **Development/Testing:** $0-20/month
- **Production (100 active users):** $50-150/month

---

## Next Steps After Deployment

1. ✅ Deploy to Vercel
2. ✅ Add environment variables
3. ✅ Test all features on production URL
4. ✅ Add production domain to Firebase authorized domains
5. ⚠️ **Plan to move API keys to server-side** (security improvement)
6. ⚠️ Set up monitoring and alerts
7. ⚠️ Configure custom domain (optional)
8. ⚠️ Set up GitHub auto-deployments (optional)

---

## Summary

**Recommended deployment flow:**

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Deploy from project directory
cd /Users/lwang2/Documents/GitHub/ios/personal/personal-ai-web
vercel

# 3. Add environment variables in Vercel dashboard
# (See "Step 4: Configure Environment Variables" above)

# 4. Deploy to production
vercel --prod

# 5. Test everything
# (See "Post-Deployment Verification" above)

# 6. Add production domain to Firebase authorized domains
# (Firebase Console → Authentication → Settings → Authorized domains)
```

Your production app will be live at: `https://personal-ai-web.vercel.app` (or your custom domain)

---

**Questions or issues? Check the Troubleshooting section or Vercel documentation.**
