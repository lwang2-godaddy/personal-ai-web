# Next.js Code Execution: Client vs Server

## The Key Question: Where Does My Code Run?

In Next.js, the **same TypeScript file** can run in different places depending on **where it's imported from**. This is confusing but critical to understand for security.

## The Rules

### Files That ALWAYS Run Server-Side

```
app/api/**/route.ts          ← API routes ALWAYS run on server
app/api/**/route.js          ← (JavaScript version)
```

**Cannot be overridden.** These files never execute in the browser.

### Files That Run Client-Side by Default

```
app/**/page.tsx              ← Pages with 'use client' directive
components/**/*.tsx          ← Components with 'use client' directive
```

**Example:**
```typescript
// components/MyButton.tsx
'use client';  // ← This directive makes it client-side

export default function MyButton() {
  // This code runs in the BROWSER
  const handleClick = () => {
    console.log('Clicked!'); // Logs in browser console
  };
  return <button onClick={handleClick}>Click me</button>;
}
```

### Files That Are AMBIGUOUS (Depends on Import Chain)

```
lib/**/*.ts                  ← Helper modules (no directive)
utils/**/*.ts                ← Utility functions
services/**/*.ts             ← Service classes
```

**These files run wherever they're imported from:**

- If imported in `app/api/*/route.ts` → Runs on SERVER
- If imported in a component with `'use client'` → Runs in BROWSER
- If imported in both → Code is included in BOTH bundles!

## Real Example from Our App

### Example 1: PineconeService (Server-Side Only)

```
File: lib/api/pinecone/client.ts
Location: lib/ directory (ambiguous)

Import chain:
app/api/chat/route.ts (SERVER)
    ↓ imports
lib/services/rag/RAGEngine.ts
    ↓ imports
lib/api/pinecone/client.ts

Result: PineconeService runs on SERVER only ✅
```

**Why?** Because the import chain starts from an API route.

### Example 2: What If We Made a Mistake?

```typescript
// ❌ BAD: Importing server-side service in client component
// components/ChatInterface.tsx
'use client';

import PineconeService from '@/lib/api/pinecone/client';  // ← MISTAKE!

export default function ChatInterface() {
  const handleSearch = async () => {
    // This would try to run in the browser!
    // process.env.PINECONE_API_KEY would be undefined
    // The code would crash
    const results = await PineconeService.queryVectors(...);
  };

  return <button onClick={handleSearch}>Search</button>;
}
```

**What happens?**
1. Next.js includes PineconeService in the browser JavaScript bundle
2. When user clicks "Search", code tries to run in browser
3. `process.env.PINECONE_API_KEY` is undefined (not available in browser)
4. Code crashes with error

**Our protection:**
```typescript
// lib/api/pinecone/client.ts
private constructor() {
  if (typeof window !== 'undefined') {
    throw new Error('PineconeService cannot run in the browser!');
  }
  // ...
}
```

Now if someone imports it in a client component, they get a clear error message immediately.

## How to Verify Where Code Runs

### Method 1: Check Import Chain

```bash
# Find where a file is imported
grep -r "from '@/lib/api/pinecone/client'" .
```

If it's only imported in `app/api/**/route.ts`, it's server-side only.

### Method 2: Check for 'window' in Build

```bash
npm run build

# After build, check if code is in browser bundle
# Files starting with "static" are sent to browsers
ls .next/static/chunks/

# Check if your service is in browser bundle
grep -r "PineconeService" .next/static/
```

If grep returns nothing, your service is server-side only ✅

### Method 3: Runtime Check

Add this to your constructor:
```typescript
if (typeof window !== 'undefined') {
  throw new Error('This must run on server only!');
}
```

## Current Architecture (Secure)

### Client Components (Browser)
```
components/create/DiaryEditor.tsx
components/create/VoiceRecorder.tsx
components/create/PhotoUploader.tsx
components/dashboard/TextNoteCard.tsx
app/(dashboard)/dashboard/page.tsx
```

These make `fetch()` calls to API routes. They never access API keys directly.

### Server-Side API Routes
```
app/api/transcribe/route.ts       ← Whisper transcription
app/api/describe-image/route.ts   ← Vision API
app/api/chat/route.ts             ← RAG chat
```

These have access to `process.env.OPENAI_API_KEY` and `process.env.PINECONE_API_KEY`.

### Server-Side Services (Protected)
```
lib/api/openai/client.ts          ← OpenAIService (has runtime check)
lib/api/pinecone/client.ts        ← PineconeService (has runtime check)
lib/services/rag/RAGEngine.ts     ← Uses both services
```

These throw errors if accidentally imported in client components.

## Data Flow Example

User creates a diary entry:

```
1. User types in DiaryEditor.tsx (CLIENT)
   ↓
2. Clicks "Save" button
   ↓
3. DiaryEditor calls lib/services/textNoteService.ts
   ↓
4. Service writes to Firestore (CLIENT SDK - safe, protected by auth)
   ↓
5. Firebase Cloud Function triggered (SERVER)
   ↓
6. Cloud Function generates embedding using OpenAI (SERVER)
   ↓
7. Cloud Function uploads to Pinecone (SERVER)
   ↓
8. User's data is now searchable via RAG
```

**Key point:** OpenAI and Pinecone API keys are only used in step 6-7 (server-side Cloud Functions).

## Common Mistakes to Avoid

### ❌ Mistake 1: Using NEXT_PUBLIC_ for Secrets

```bash
# ❌ WRONG - Exposed to browser
NEXT_PUBLIC_OPENAI_API_KEY=sk-proj-...

# ✅ CORRECT - Server-side only
OPENAI_API_KEY=sk-proj-...
```

### ❌ Mistake 2: Importing Server-Side Service in Client Component

```typescript
// ❌ WRONG
'use client';
import OpenAIService from '@/lib/api/openai/client';

// ✅ CORRECT - Call API route instead
'use client';
const response = await fetch('/api/transcribe', {
  method: 'POST',
  body: formData,
});
```

### ❌ Mistake 3: Assuming lib/ Files Are Server-Side Only

```typescript
// lib/utils/someHelper.ts
// ⚠️ This could run on client OR server depending on who imports it!

export function someHelper() {
  // Don't use secrets here!
}
```

## Best Practices

### ✅ 1. Keep Secrets in API Routes

```typescript
// app/api/my-endpoint/route.ts
export async function POST(request: NextRequest) {
  const apiKey = process.env.MY_SECRET_KEY;  // ✅ Safe - server-side only
  // ...
}
```

### ✅ 2. Add Runtime Checks for Sensitive Services

```typescript
// lib/services/SensitiveService.ts
class SensitiveService {
  constructor() {
    if (typeof window !== 'undefined') {
      throw new Error('This service must run on server only!');
    }
  }
}
```

### ✅ 3. Use Fetch from Client Components

```typescript
// components/MyComponent.tsx
'use client';

export default function MyComponent() {
  const handleAction = async () => {
    // ✅ Correct - Call API route
    const response = await fetch('/api/my-endpoint', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`,
      },
      body: JSON.stringify({ data: 'value' }),
    });
    const result = await response.json();
  };
}
```

### ✅ 4. Environment Variables Naming

```bash
# For browser (safe to expose)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_API_BASE_URL=...

# For server only (secrets)
OPENAI_API_KEY=...
PINECONE_API_KEY=...
DATABASE_URL=...
```

## Summary Table

| Location | Execution | Use For | Can Access Secrets? |
|----------|-----------|---------|---------------------|
| `app/api/**/route.ts` | Server always | API endpoints | ✅ Yes |
| `'use client'` components | Browser | UI interactions | ❌ No |
| `'use server'` functions | Server | Server actions | ✅ Yes |
| `lib/**/*.ts` (no directive) | **Depends on import** | Shared utilities | ⚠️ Only if server-side |
| Firebase Cloud Functions | Server (Google Cloud) | Background processing | ✅ Yes |

## Debugging Tips

### How to find where a file is used:

```bash
# Find all imports of a specific file
grep -r "from '@/lib/api/pinecone/client'" .

# Find all uses of an environment variable
grep -r "process.env.PINECONE_API_KEY" .
```

### How to check if code reached the browser:

```bash
# Build the app
npm run build

# Search browser bundle for sensitive strings
grep -r "sk-proj-" .next/static/  # Should return NOTHING
grep -r "pcsk_" .next/static/     # Should return NOTHING
```

### How to test runtime protection:

```typescript
// Try importing in a client component (should throw error)
'use client';
import PineconeService from '@/lib/api/pinecone/client';  // ← Error!
```

---

**Key Takeaway:** In Next.js, files in `lib/` are ambiguous. They run wherever they're imported from. Always use runtime checks or only import them in API routes to ensure secrets stay on the server.
