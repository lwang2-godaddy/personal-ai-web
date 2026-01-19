# Deployment

This document describes deployment and environment configuration for Personal AI Web.

## Deployment Platform

Personal AI Web is deployed on **Vercel**.

| Setting | Value |
|---------|-------|
| Framework | Next.js |
| Node.js | 20.x |
| Region | Auto (US by default) |
| Build Command | `npm run build` |
| Output Directory | `.next` |

## Deployment Process

### Automatic Deployments

Vercel automatically deploys on:

1. **Production**: Push to `main` branch
2. **Preview**: Push to any other branch or PR

### Manual Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy preview
vercel

# Deploy to production
vercel --prod
```

### Deployment Checklist

Before deploying to production:

- [ ] All environment variables set in Vercel dashboard
- [ ] Firebase service account key uploaded
- [ ] OpenAI API key has sufficient credits
- [ ] Pinecone index exists with correct dimensions
- [ ] Firebase security rules deployed
- [ ] No TypeScript errors (`npm run build` succeeds locally)

---

## Environment Variables

### Vercel Dashboard Configuration

Navigate to: **Project Settings → Environment Variables**

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Web API Key | `AIzaSy...` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain | `project.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase Project ID | `my-project-id` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Storage Bucket | `project.appspot.com` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Messaging Sender ID | `123456789` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase App ID | `1:123:web:abc` |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Service Account JSON | `{"type":"service_account",...}` |
| `NEXT_PUBLIC_OPENAI_API_KEY` | OpenAI API Key | `sk-proj-...` |
| `NEXT_PUBLIC_PINECONE_API_KEY` | Pinecone API Key | `...` |
| `NEXT_PUBLIC_PINECONE_INDEX` | Pinecone Index Name | `personal-ai-data` |
| `NEXT_PUBLIC_PINECONE_ENVIRONMENT` | Pinecone Environment | `us-east-1-aws` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_ORG_API_KEY` | OpenAI Organization Key (billing) | - |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps API Key | - |

### Environment Scopes

Vercel supports different values per environment:

| Scope | Branch | Usage |
|-------|--------|-------|
| Production | `main` | Live site |
| Preview | Other branches | PR previews |
| Development | Local | `vercel dev` |

### Setting Service Account Key

The Firebase service account key is a JSON object that must be stored as a single-line string:

1. Download service account JSON from Firebase Console
2. Minify to single line: `cat key.json | jq -c`
3. Paste entire JSON as value in Vercel dashboard

---

## Build Configuration

### package.json Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

### next.config.js

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable strict mode
  reactStrictMode: true,

  // Image optimization domains
  images: {
    domains: [
      'firebasestorage.googleapis.com',
      'lh3.googleusercontent.com',
    ],
  },

  // Experimental features
  experimental: {
    // Enable if using server actions
    serverActions: true,
  },
};

module.exports = nextConfig;
```

### TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

---

## Version Management

### Git Tags

Use semantic versioning:

```bash
# Create version tag
git tag v1.0.0
git push origin v1.0.0
```

### Version Display

The app displays version info in the footer via `lib/utils/version.ts`:

```typescript
export function getVersion() {
  return {
    version: process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0',
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || 'dev',
  };
}
```

Vercel automatically sets `VERCEL_GIT_COMMIT_SHA`.

---

## Domain Configuration

### Custom Domain

1. Navigate to **Project Settings → Domains**
2. Add custom domain (e.g., `app.personalai.com`)
3. Configure DNS:
   - **A Record**: `76.76.21.21`
   - **CNAME**: `cname.vercel-dns.com`

### SSL

Vercel automatically provisions SSL certificates for all domains.

---

## Monitoring & Logs

### Vercel Dashboard

- **Deployments**: Build logs, deployment history
- **Analytics**: Core Web Vitals, traffic
- **Logs**: Runtime logs (Serverless Functions)

### Runtime Logs

API route logs are available in:

1. **Vercel Dashboard → Logs**
2. **CLI**: `vercel logs --follow`

### Error Tracking

Consider integrating:

- **Sentry**: Error tracking and performance
- **LogRocket**: Session replay
- **Vercel Analytics**: Built-in analytics

---

## Performance Optimization

### Edge Functions

For latency-sensitive routes, consider Edge Runtime:

```typescript
// app/api/route.ts
export const runtime = 'edge';
```

**Note**: Edge functions don't support Firebase Admin SDK.

### Caching

#### API Route Caching

```typescript
export async function GET() {
  return new Response(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
    },
  });
}
```

#### Static Generation

For pages that can be pre-rendered:

```typescript
// app/page.tsx
export const revalidate = 3600; // Revalidate every hour
```

### Image Optimization

Use Next.js Image component:

```typescript
import Image from 'next/image';

<Image
  src={photoUrl}
  alt="Photo"
  width={256}
  height={256}
  placeholder="blur"
  blurDataURL={thumbnailUrl}
/>
```

---

## Security

### Headers

Configure security headers in `next.config.js`:

```javascript
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin',
  },
];

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};
```

### API Key Security

- Never expose server-side API keys to client
- Use `NEXT_PUBLIC_` prefix only for client-safe keys
- Firebase Admin SDK key should NOT have `NEXT_PUBLIC_` prefix

### Rate Limiting

Implement rate limiting for API routes:

```typescript
// Using Vercel KV or Redis
import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';

const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'anonymous';
  const { success } = await ratelimit.limit(ip);

  if (!success) {
    return new Response('Too many requests', { status: 429 });
  }

  // Process request...
}
```

---

## Rollback

### Via Dashboard

1. Navigate to **Deployments**
2. Find previous successful deployment
3. Click **...** → **Promote to Production**

### Via CLI

```bash
# List deployments
vercel ls

# Promote specific deployment
vercel promote <deployment-url>
```

---

## Local Development

### Using Vercel Dev

```bash
# Pull environment variables
vercel env pull

# Start local development
vercel dev
```

### Using Next.js Dev

```bash
# Create .env.local from .env.example
cp .env.example .env.local
# Fill in values

# Start development server
npm run dev
```

---

## Troubleshooting

### Build Failures

1. **TypeScript errors**: Run `npm run build` locally to see errors
2. **Missing env vars**: Check Vercel dashboard for missing variables
3. **Memory issues**: Increase Node.js memory in build settings

### Runtime Errors

1. **Check logs**: Vercel Dashboard → Logs
2. **Firebase errors**: Verify service account key format
3. **API timeouts**: Default is 10s, increase if needed

### Common Issues

| Issue | Solution |
|-------|----------|
| `FIREBASE_SERVICE_ACCOUNT_KEY` not working | Ensure JSON is minified to single line |
| `Module not found` | Check import paths and `@/` alias |
| `504 Gateway Timeout` | Optimize slow API routes or increase timeout |
| `401 Unauthorized` | Verify API keys are correct |

---

## Cost Considerations

### Vercel Pricing

| Tier | Included | Overage |
|------|----------|---------|
| Hobby | 100GB bandwidth | - |
| Pro | 1TB bandwidth | $40/100GB |
| Enterprise | Custom | Custom |

### Firebase Pricing

| Service | Free Tier | Beyond |
|---------|-----------|--------|
| Auth | 50K users/month | $0.0055/user |
| Firestore | 1GB storage, 50K reads/day | Pay per read/write |
| Storage | 5GB | $0.026/GB |

### OpenAI Pricing

Monitor usage in OpenAI dashboard. Set spending limits to prevent overages.

### Pinecone Pricing

Serverless tier is pay-per-use. Monitor via Pinecone dashboard.

---

## Related Documentation

- [Architecture](../ARCHITECTURE.md) - System overview
- [External Services](./EXTERNAL_SERVICES.md) - API integrations
- [Authentication](./AUTHENTICATION.md) - Auth configuration
