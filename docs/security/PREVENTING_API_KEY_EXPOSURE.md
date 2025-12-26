# Preventing API Key Exposure in Browser

**CRITICAL SECURITY GUIDE**

## Table of Contents
1. [The Problem](#the-problem)
2. [Prevention Strategies](#prevention-strategies)
3. [Automated Safeguards](#automated-safeguards)
4. [Safe Code Patterns](#safe-code-patterns)
5. [Dangerous Patterns to Avoid](#dangerous-patterns-to-avoid)
6. [Enforcement Checklist](#enforcement-checklist)

---

## The Problem

### What Happened
On 2025-12-26, we discovered OpenAIService (a server-side service containing API keys) was imported in `quickCreateSlice.ts`, a Redux slice that runs in the browser. This would have exposed our OpenAI API key to all users.

### Why This Is Dangerous
- **API keys exposed**: Anyone can open browser DevTools and extract API keys
- **Unlimited spending**: Attackers can use stolen keys to make API calls at our expense
- **Data breach**: Keys may grant access to our data stores (Pinecone, Firebase, etc.)
- **Account suspension**: API providers will suspend accounts with exposed keys
- **Legal liability**: Exposed keys can lead to regulatory violations (GDPR, CCPA)

### Detection
The error manifested as:
```
Error: OpenAIService cannot run in the browser!
API keys must stay on the server.
Use it only in API routes (app/api/**/route.ts).
```

This was caught because OpenAIService has a built-in browser check:
```typescript
if (typeof window !== 'undefined') {
  throw new Error('OpenAIService cannot run in the browser!');
}
```

**BUT:** Not all services have this check! We need defense-in-depth.

---

## Prevention Strategies

### 1. Architectural Separation

**Server-Only Code Location:**
```
✅ SAFE: app/api/**/route.ts              (Next.js API routes)
✅ SAFE: lib/services/**/*.server.ts      (Explicitly server-side)
✅ SAFE: lib/api/**/client.ts             (But ONLY imported in API routes)
```

**Client Code Location:**
```
⚠️  CAREFUL: lib/store/slices/*.ts        (Redux slices - runs in browser)
⚠️  CAREFUL: components/**/*.tsx           (React components - runs in browser)
⚠️  CAREFUL: app/**/page.tsx              (Next.js pages - runs in browser)
⚠️  CAREFUL: lib/services/**/*.ts         (Unless explicitly .server.ts)
```

### 2. File Naming Convention

**Adopt .server.ts suffix for server-only files:**
```
lib/api/openai/client.server.ts      ← Server-only (won't bundle for client)
lib/services/rag/RAGEngine.server.ts  ← Server-only
lib/utils/encryption.server.ts        ← Server-only
```

Next.js automatically prevents `.server.ts` files from being bundled in client code.

### 3. Environment Variable Protection

**NEVER use `process.env` directly in non-API route code:**
```typescript
❌ WRONG (in Redux slice or component):
const apiKey = process.env.OPENAI_API_KEY;

✅ CORRECT (in API route only):
const apiKey = process.env.OPENAI_API_KEY;
```

**Use environment variable prefixes correctly:**
```bash
# .env.local

# ❌ EXPOSED to browser (NEXT_PUBLIC_ prefix)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...

# ✅ SERVER-ONLY (no prefix)
OPENAI_API_KEY=sk-...                 # Server-only
PINECONE_API_KEY=...                  # Server-only
FIREBASE_ADMIN_PRIVATE_KEY=...        # Server-only
```

**Rule**: If it's a secret, NEVER use `NEXT_PUBLIC_` prefix!

---

## Automated Safeguards

### 1. ESLint Rules

**Install ESLint plugin:**
```bash
npm install --save-dev eslint-plugin-no-server-imports
```

**Create `.eslintrc.js` with custom rules:**
```javascript
// .eslintrc.js
module.exports = {
  extends: ['next/core-web-vitals'],
  rules: {
    // Custom rule to prevent server imports in client code
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@/lib/api/*/client', '@/lib/api/*/client.*'],
            message:
              'Do not import API clients (OpenAI, Pinecone, etc.) in client code. ' +
              'Use API routes instead (app/api/**/route.ts).',
          },
          {
            group: ['openai', 'openai/*'],
            message:
              'Do not import OpenAI SDK directly in client code. ' +
              'Use API routes that call OpenAIService on the server.',
          },
          {
            group: ['@pinecone-database/*'],
            message:
              'Do not import Pinecone SDK in client code. ' +
              'Use API routes that call PineconeService on the server.',
          },
          {
            group: ['firebase-admin', 'firebase-admin/*'],
            message:
              'Do not import firebase-admin in client code. ' +
              'Use regular firebase SDK for client, firebase-admin for server only.',
          },
        ],
      },
    ],
  },
  overrides: [
    {
      // API routes CAN import these
      files: ['app/api/**/*.ts', '**/*.server.ts'],
      rules: {
        'no-restricted-imports': 'off',
      },
    },
  ],
};
```

### 2. Pre-commit Hook

**Create `.husky/pre-commit`:**
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Check for dangerous imports
echo "🔒 Checking for API key exposure risks..."

# Search for OpenAI imports outside API routes
OPENAI_CLIENT=$(git diff --cached --name-only | grep -E '\.tsx?$' | grep -v 'app/api/' | xargs grep -l "from '@/lib/api/openai/client'" 2>/dev/null || true)

if [ -n "$OPENAI_CLIENT" ]; then
  echo "❌ BLOCKED: OpenAIService imported in client code!"
  echo "Files:"
  echo "$OPENAI_CLIENT"
  echo ""
  echo "SECURITY: API keys must never be exposed to the browser."
  echo "Use API routes instead: app/api/**/route.ts"
  exit 1
fi

# Check for direct OpenAI SDK imports outside API routes
OPENAI_SDK=$(git diff --cached --name-only | grep -E '\.tsx?$' | grep -v 'app/api/' | grep -v '\.server\.ts$' | xargs grep -l "from 'openai'" 2>/dev/null || true)

if [ -n "$OPENAI_SDK" ]; then
  echo "❌ BLOCKED: OpenAI SDK imported in client code!"
  echo "Files:"
  echo "$OPENAI_SDK"
  echo ""
  echo "SECURITY: OpenAI SDK requires API keys that must not be in browser."
  echo "Use API routes instead: app/api/**/route.ts"
  exit 1
fi

# Check for environment variable usage outside API routes
ENV_USAGE=$(git diff --cached --name-only | grep -E '\.tsx?$' | grep -v 'app/api/' | grep -v '\.server\.ts$' | xargs grep -l "process\.env\.OPENAI_API_KEY\|process\.env\.PINECONE_API_KEY" 2>/dev/null || true)

if [ -n "$ENV_USAGE" ]; then
  echo "❌ BLOCKED: Secret environment variables used in client code!"
  echo "Files:"
  echo "$ENV_USAGE"
  echo ""
  echo "SECURITY: API keys must never be exposed to the browser."
  echo "Use API routes and pass data through authenticated requests."
  exit 1
fi

echo "✅ No API key exposure detected"
```

**Install husky:**
```bash
npm install --save-dev husky
npx husky install
chmod +x .husky/pre-commit
```

### 3. CI/CD Check (GitHub Actions)

**Create `.github/workflows/security-check.yml`:**
```yaml
name: Security - API Key Exposure Check

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  check-api-key-exposure:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Check for dangerous imports
        run: |
          # Find all TypeScript files outside app/api/ and *.server.ts
          CLIENT_FILES=$(find lib components app -name '*.ts' -o -name '*.tsx' | grep -v 'app/api/' | grep -v '\.server\.ts$' || true)

          # Check for OpenAIService imports
          if echo "$CLIENT_FILES" | xargs grep -l "from '@/lib/api/openai/client'" 2>/dev/null; then
            echo "❌ SECURITY: OpenAIService imported in client code!"
            exit 1
          fi

          # Check for direct SDK imports
          if echo "$CLIENT_FILES" | xargs grep -l "from 'openai'" 2>/dev/null; then
            echo "❌ SECURITY: OpenAI SDK imported in client code!"
            exit 1
          fi

          if echo "$CLIENT_FILES" | xargs grep -l "from '@pinecone-database" 2>/dev/null; then
            echo "❌ SECURITY: Pinecone SDK imported in client code!"
            exit 1
          fi

          # Check for API key environment variables
          if echo "$CLIENT_FILES" | xargs grep -l "process\.env\.OPENAI_API_KEY\|process\.env\.PINECONE_API_KEY" 2>/dev/null; then
            echo "❌ SECURITY: Secret API keys used in client code!"
            exit 1
          fi

          echo "✅ No dangerous imports detected"
```

### 4. TypeScript Type Safety

**Create a server-only marker type:**
```typescript
// lib/types/server-only.ts

/**
 * Marker type that makes it harder to accidentally use server-only code in client
 *
 * Usage:
 * import type { ServerOnly } from '@/lib/types/server-only';
 *
 * export class OpenAIService {
 *   private serverOnly!: ServerOnly;  // Forces awareness this is server-only
 *   // ...
 * }
 */
export type ServerOnly = { __brand: 'ServerOnly' };

/**
 * Ensures a value can only be used on the server
 */
export function assertServer(): ServerOnly {
  if (typeof window !== 'undefined') {
    throw new Error('This code must only run on the server');
  }
  return {} as ServerOnly;
}
```

**Use in services:**
```typescript
// lib/api/openai/client.server.ts
import type { ServerOnly } from '@/lib/types/server-only';
import { assertServer } from '@/lib/types/server-only';

export class OpenAIService {
  private serverOnly: ServerOnly;

  private constructor() {
    this.serverOnly = assertServer(); // Throws if in browser
    // ... rest of initialization
  }
}
```

---

## Safe Code Patterns

### Pattern 1: Client → API Route → Server Service

**✅ CORRECT: Client-side code (Redux slice, component)**
```typescript
// lib/store/slices/quickCreateSlice.ts (CLIENT CODE)
export const submitQuickVoice = createAsyncThunk(
  'quickCreate/submitVoice',
  async (data: { audioBlob: Blob; duration: number }) => {
    // Create FormData to send to API route
    const formData = new FormData();
    formData.append('audioFile', new File([data.audioBlob], 'audio.webm'));

    // Call API route (keeps keys server-side)
    const response = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Transcription failed');
    }

    const { transcription } = await response.json();
    return { transcription };
  }
);
```

**✅ CORRECT: API Route (Server-side)**
```typescript
// app/api/transcribe/route.ts (SERVER CODE)
import { NextRequest, NextResponse } from 'next/server';
import OpenAIService from '@/lib/api/openai/client.server'; // ← OK here!

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audioFile') as File;

    // Use OpenAIService - safe because this runs server-side
    const transcription = await OpenAIService.transcribeAudio(audioFile);

    return NextResponse.json({ transcription });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### Pattern 2: Server Components (Next.js 13+)

**✅ CORRECT: Server Component**
```typescript
// app/dashboard/page.tsx (SERVER COMPONENT - no 'use client' directive)
import OpenAIService from '@/lib/api/openai/client.server';
import { getCurrentUser } from '@/lib/auth';

export default async function DashboardPage() {
  const user = await getCurrentUser();

  // Safe to use OpenAIService in server components
  const summary = await OpenAIService.generateSummary(user.id);

  return <div>{summary}</div>;
}
```

### Pattern 3: Client Component with API Call

**✅ CORRECT: Client Component**
```typescript
// components/ChatInterface.tsx (CLIENT COMPONENT)
'use client';

import { useState } from 'react';

export function ChatInterface() {
  const [messages, setMessages] = useState([]);

  const sendMessage = async (text: string) => {
    // Call API route, NOT OpenAIService directly
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text }),
    });

    const data = await response.json();
    setMessages(prev => [...prev, data.reply]);
  };

  return <div>{/* UI code */}</div>;
}
```

---

## Dangerous Patterns to Avoid

### ❌ WRONG: Direct Import in Client Code

```typescript
// ❌ components/ChatBox.tsx (CLIENT CODE)
import OpenAIService from '@/lib/api/openai/client'; // ← DANGEROUS!

export function ChatBox() {
  const handleSubmit = async (message: string) => {
    // This exposes API key to browser!
    const response = await OpenAIService.chatCompletion(message);
    return response;
  };
}
```

### ❌ WRONG: Environment Variables in Client

```typescript
// ❌ lib/config.ts (imported by client code)
export const config = {
  openaiKey: process.env.OPENAI_API_KEY, // ← EXPOSED TO BROWSER!
};
```

### ❌ WRONG: Passing API Keys Through Props

```typescript
// ❌ app/page.tsx
<ChatComponent apiKey={process.env.OPENAI_API_KEY} /> // ← VISIBLE IN HTML!
```

### ❌ WRONG: Storing Keys in Redux

```typescript
// ❌ lib/store/slices/configSlice.ts
const configSlice = createSlice({
  name: 'config',
  initialState: {
    openaiKey: process.env.OPENAI_API_KEY, // ← STORED IN BROWSER!
  },
});
```

---

## Enforcement Checklist

### For Every New Feature
- [ ] Does this code run in the browser? (components, pages, Redux slices)
- [ ] Am I importing any service from `lib/api/`?
- [ ] Am I using `process.env` for anything secret?
- [ ] Am I calling OpenAI/Pinecone/Firebase Admin directly?
- [ ] If yes to any above → **Refactor to use API route pattern**

### Code Review Checklist
- [ ] No imports of `@/lib/api/*` in client code
- [ ] No imports of `openai`, `@pinecone-database/*`, `firebase-admin` outside API routes
- [ ] No `process.env.OPENAI_API_KEY` or similar in non-API route files
- [ ] All API calls go through `/api/*` routes
- [ ] Server-only files use `.server.ts` suffix

### Deployment Checklist
- [ ] Run `npm run lint` (catches ESLint violations)
- [ ] Run security check script
- [ ] Verify GitHub Actions passed
- [ ] Check Vercel build logs for warnings
- [ ] Test in production: open DevTools → Sources → search for "sk-" (API key prefix)

---

## Quick Reference

### Where API Keys Should Be

| Location | Safe? | Reason |
|----------|-------|--------|
| `app/api/**/route.ts` | ✅ YES | Server-side only, never sent to browser |
| `**/*.server.ts` | ✅ YES | Next.js prevents bundling these for client |
| `lib/services/**/*.ts` | ❌ NO | May be imported by client code |
| `lib/store/slices/*.ts` | ❌ NO | Redux runs in browser |
| `components/**/*.tsx` | ❌ NO | React components run in browser |
| `app/**/page.tsx` (with 'use client') | ❌ NO | Client components run in browser |
| `app/**/page.tsx` (without 'use client') | ⚠️ MAYBE | Server components are safe, but can be confusing |

### Commands to Run

```bash
# Check for dangerous patterns manually
grep -r "from '@/lib/api/openai/client'" --include="*.ts" --include="*.tsx" --exclude-dir="app/api" .

# Run linter
npm run lint

# Run type check
npm run type-check

# Run full security check
./scripts/check-api-exposure.sh
```

---

## Summary

**The Three Rules:**

1. **API keys NEVER leave the server** - Use API routes (`app/api/**/route.ts`)
2. **Client code calls API routes** - Not services directly
3. **Automate enforcement** - ESLint + pre-commit hooks + CI/CD

**When in doubt**: If you're working in Redux slices, components, or client-side pages, you should be calling `fetch('/api/something')`, NOT importing services.

---

**Last Updated**: 2025-12-26
**Next Review**: 2026-01-26 (monthly security review)
