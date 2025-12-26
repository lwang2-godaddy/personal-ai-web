# Security Quick Reference

**Quick guide to prevent API key exposure**

## ⚠️ Golden Rules

1. **NEVER import services from `lib/api/` in client code**
   - ❌ `import OpenAIService from '@/lib/api/openai/client'` (in Redux/components)
   - ✅ `import OpenAIService from '@/lib/api/openai/client'` (in API routes only)

2. **ALWAYS use API routes for sensitive operations**
   - ❌ Direct OpenAI call from component
   - ✅ Component → fetch('/api/chat') → API route → OpenAIService

3. **Server-only files MUST use `.server.ts` suffix**
   - ✅ `RAGEngine.server.ts`
   - ✅ `OpenAIService.server.ts` (if creating new ones)

## 🔍 Before Committing

Run these checks:

```bash
# 1. Security check (automated)
./scripts/check-api-exposure.sh

# 2. Lint check
npm run lint

# 3. Build check
npm run build
```

All three must pass before pushing!

## 🚨 Common Mistakes

### ❌ WRONG: Import in Redux Slice
```typescript
// lib/store/slices/quickCreateSlice.ts
import OpenAIService from '@/lib/api/openai/client'; // EXPOSES API KEY!

export const transcribeAudio = createAsyncThunk(async (blob) => {
  return await OpenAIService.transcribeAudio(blob); // DANGEROUS!
});
```

### ✅ CORRECT: Use API Route
```typescript
// lib/store/slices/quickCreateSlice.ts
export const transcribeAudio = createAsyncThunk(async (blob) => {
  const formData = new FormData();
  formData.append('audio', blob);

  const res = await fetch('/api/transcribe', {
    method: 'POST',
    body: formData
  });
  return await res.json(); // SAFE!
});
```

## 📋 File Location Rules

| Location | What | Can Import Services? |
|----------|------|---------------------|
| `app/api/**/route.ts` | API routes (server) | ✅ YES - All services |
| `**/*.server.ts` | Server-only code | ✅ YES - All services |
| `lib/api/*` | Service implementations | ✅ YES - Internal only |
| `lib/services/*` | Business logic | ⚠️ RENAME to `.server.ts` if uses API services |
| `lib/store/slices/*` | Redux slices | ❌ NO - Client code |
| `components/*` | React components | ❌ NO - Client code |
| `app/**/page.tsx` | Next.js pages | ⚠️ Server components OK, client NO |

## 🛠️ Tools Installed

1. **ESLint Rules** - Blocks dangerous imports at dev time
2. **Security Script** - `./scripts/check-api-exposure.sh`
3. **GitHub Actions** - Auto-check on every PR

## 📚 Full Documentation

- [Comprehensive Guide](./PREVENTING_API_KEY_EXPOSURE.md) - Read this for details
- [User Data Isolation](./USER_DATA_ISOLATION.md) - Multi-user security

## 🆘 If You Get Blocked

**Error: "OpenAIService cannot run in the browser!"**

You imported a server-only service in client code. Fix:

1. Move logic to API route: `app/api/my-feature/route.ts`
2. Call from client: `fetch('/api/my-feature')`
3. API route calls the service safely

**Example Fix:**
```typescript
// app/api/my-feature/route.ts (NEW FILE)
import OpenAIService from '@/lib/api/openai/client.server';

export async function POST(request: Request) {
  const { text } = await request.json();
  const result = await OpenAIService.doSomething(text);
  return Response.json({ result });
}
```

```typescript
// Your component or Redux slice (UPDATED)
const result = await fetch('/api/my-feature', {
  method: 'POST',
  body: JSON.stringify({ text: 'hello' })
}).then(r => r.json());
```

## ✅ Checklist for New Features

- [ ] No service imports in client code
- [ ] All API calls use `/api/*` routes
- [ ] Server-only files use `.server.ts` suffix
- [ ] `npm run lint` passes
- [ ] `./scripts/check-api-exposure.sh` passes
- [ ] `npm run build` succeeds
- [ ] No `process.env.OPENAI_API_KEY` in client files

---

**Last Updated**: 2025-12-26
