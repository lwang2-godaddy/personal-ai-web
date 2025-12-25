# PersonalAI Web Dashboard - Deployment Guide

## Overview

The PersonalAI web dashboard is a Next.js 16 application that can be deployed to Vercel (recommended), or any Node.js hosting platform.

## Prerequisites

Before deploying, ensure you have:
- ✅ Firebase project created and configured
- ✅ OpenAI API key
- ✅ Pinecone vector database created
- ✅ GitHub repository (for Vercel deployment)

## Deployment Options

### Option 1: Vercel (Recommended) ⭐

Vercel is the recommended platform as it's built by the creators of Next.js and offers the best performance.

#### Step 1: Prepare Repository

1. **Push to GitHub:**
   ```bash
   git remote add origin https://github.com/your-username/personal-ai-web.git
   git push -u origin main
   ```

2. **Verify `.gitignore` excludes secrets:**
   ```bash
   # Should already be ignored:
   .env.local
   .env*.local
   ```

#### Step 2: Deploy to Vercel

**Via Vercel Dashboard:**

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click "Add New..." → "Project"
3. Import your `personal-ai-web` repository
4. Configure build settings:
   - **Framework Preset:** Next.js
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
   - **Install Command:** `npm install --legacy-peer-deps`

5. **Add Environment Variables** (click "Environment Variables"):

   ```env
   # Firebase Configuration
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

   # OpenAI Configuration
   NEXT_PUBLIC_OPENAI_API_KEY=sk-...

   # Pinecone Configuration
   NEXT_PUBLIC_PINECONE_API_KEY=your_pinecone_key
   NEXT_PUBLIC_PINECONE_INDEX=personal-ai-data
   NEXT_PUBLIC_PINECONE_ENVIRONMENT=us-east-1
   ```

   **Important:** All variables must have `NEXT_PUBLIC_` prefix to be accessible in browser.

6. Click **"Deploy"**

7. Wait for deployment (usually 2-3 minutes)

8. Your app will be live at: `https://your-app-name.vercel.app`

**Via Vercel CLI:**

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? personal-ai-web
# - Directory? ./
# - Override settings? No

# Add environment variables
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY production
vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN production
# ... (add all variables)

# Deploy to production
vercel --prod
```

#### Step 3: Configure Custom Domain (Optional)

1. Go to your Vercel project → Settings → Domains
2. Add your custom domain (e.g., `app.yourdomain.com`)
3. Add DNS records as instructed by Vercel
4. Wait for SSL certificate provisioning (automatic)

---

### Option 2: Self-Hosted (VPS/Cloud)

Deploy to your own server (AWS EC2, DigitalOcean, etc.)

#### Requirements:
- Node.js 20+ installed
- PM2 or similar process manager
- Nginx as reverse proxy
- SSL certificate (Let's Encrypt)

#### Step 1: Setup Server

```bash
# SSH into your server
ssh user@your-server-ip

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt update
sudo apt install nginx
```

#### Step 2: Clone and Build

```bash
# Clone repository
git clone https://github.com/your-username/personal-ai-web.git
cd personal-ai-web

# Install dependencies
npm install --legacy-peer-deps

# Create .env.local file
nano .env.local
# (paste your environment variables)

# Build production bundle
npm run build
```

#### Step 3: Configure PM2

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'personal-ai-web',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

Start with PM2:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### Step 4: Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/personal-ai-web
```

Add configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site and restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/personal-ai-web /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Step 5: Setup SSL (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

### Option 3: Docker Deployment

Deploy using Docker containers.

#### Create `Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy application files
COPY . .

# Build application
RUN npm run build

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
```

#### Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env.local
    restart: unless-stopped
```

#### Deploy:

```bash
# Build image
docker-compose build

# Start container
docker-compose up -d

# View logs
docker-compose logs -f
```

---

## Firebase Configuration

### Update Firebase Console Settings

After deploying, update Firebase configuration:

1. **Authentication → Settings → Authorized Domains**
   - Add your production domain(s):
     - `your-app-name.vercel.app`
     - `your-custom-domain.com`

2. **Firestore Rules** - Already configured for production

3. **Storage Rules** - Already configured for production

---

## Environment Variables Reference

### Required Variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase API key | `AIzaSyD...` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | `project.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID | `personal-ai-123` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Storage bucket | `project.appspot.com` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Sender ID | `123456789` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | App ID | `1:123:web:abc` |
| `NEXT_PUBLIC_OPENAI_API_KEY` | OpenAI API key | `sk-...` |
| `NEXT_PUBLIC_PINECONE_API_KEY` | Pinecone API key | `abc123...` |
| `NEXT_PUBLIC_PINECONE_INDEX` | Pinecone index name | `personal-ai-data` |
| `NEXT_PUBLIC_PINECONE_ENVIRONMENT` | Pinecone region | `us-east-1` |

**Important:** All variables must be prefixed with `NEXT_PUBLIC_` to be accessible in the browser.

---

## Post-Deployment Checklist

After deploying, verify:

- [ ] Application loads without errors
- [ ] Google Sign-In works
- [ ] Email/Password sign-in works
- [ ] Dashboard loads with data
- [ ] Chat interface responds to queries
- [ ] Language switcher works (6 languages)
- [ ] Firebase data syncs from mobile app
- [ ] SSL certificate is valid
- [ ] Custom domain resolves (if configured)

---

## Monitoring & Analytics

### Vercel Analytics (Recommended)

Vercel provides built-in analytics:

1. Go to your project → Analytics tab
2. View real-time traffic, performance metrics
3. Monitor Web Vitals (LCP, FID, CLS)

### Firebase Analytics

Already integrated via Firebase SDK:
- User authentication events
- Page views
- Error tracking

### External Monitoring (Optional)

Consider adding:
- **Sentry** - Error tracking and performance monitoring
- **Google Analytics** - User behavior analytics
- **LogRocket** - Session replay and debugging

---

## Continuous Deployment

### Automatic Deployments (Vercel)

Vercel automatically deploys when you push to GitHub:

1. **Production:** Pushes to `main` branch deploy to production
2. **Preview:** Pull requests create preview deployments
3. **Rollback:** Instant rollback to previous deployments

### Manual Deployments

```bash
# Deploy to production
vercel --prod

# Deploy preview
vercel
```

---

## Troubleshooting

### Build Fails

**Issue:** `npm install` fails with peer dependency conflicts

**Solution:** Use `--legacy-peer-deps` flag:
```bash
npm install --legacy-peer-deps
```

**Vercel:** Update Install Command to `npm install --legacy-peer-deps`

### Environment Variables Not Working

**Issue:** Variables undefined in browser

**Solution:** Ensure all variables have `NEXT_PUBLIC_` prefix

### Firebase Authentication Fails

**Issue:** `auth/unauthorized-domain`

**Solution:** Add your domain to Firebase Console → Authentication → Settings → Authorized domains

### OpenAI/Pinecone API Errors

**Issue:** API keys not working in production

**Solution:**
1. Verify keys are correct in Vercel environment variables
2. Redeploy after adding/updating variables
3. Check API key quotas/billing

### Performance Issues

**Issue:** Slow page loads

**Solution:**
1. Enable Vercel Edge Functions for API routes
2. Add ISR (Incremental Static Regeneration) where possible
3. Optimize images with Next.js Image component
4. Enable Redis caching for Firestore queries

---

## Scaling Considerations

### Current Architecture Limits:

- **Vercel Free Tier:**
  - 100 GB bandwidth/month
  - 100 deployments/day
  - 12 serverless functions

- **Firebase Free Tier:**
  - 50K reads/day (Firestore)
  - 20K writes/day
  - 1 GB storage

- **Upgrade Path:**
  - Vercel Pro: $20/month (unlimited bandwidth)
  - Firebase Blaze: Pay-as-you-go
  - OpenAI: Based on usage
  - Pinecone: Serverless tier with auto-scaling

---

## Security Best Practices

✅ **Already Implemented:**
- Environment variables for secrets
- Firebase security rules
- HTTPS enforced
- CORS configured
- Input validation

❗ **Additional Recommendations:**
- Enable Vercel's DDoS protection
- Set up rate limiting for API routes
- Monitor API usage/costs
- Regular security audits
- Keep dependencies updated

---

## Cost Estimates

### Vercel Deployment:

| Tier | Cost | Limits |
|------|------|--------|
| Hobby (Free) | $0 | 100 GB bandwidth, 100 deployments/day |
| Pro | $20/month | 1 TB bandwidth, unlimited deployments |
| Enterprise | Custom | Custom limits, SLA |

### Backend Services:

- **Firebase:** $0-25/month (typically under $10 for low traffic)
- **OpenAI:** ~$0.03 per 1K GPT-4 tokens (usage-based)
- **Pinecone:** Free tier → $70/month (serverless)

**Estimated Total:** $0-50/month for low-medium traffic

---

## Support

For deployment issues:
- Vercel: https://vercel.com/docs
- Next.js: https://nextjs.org/docs
- Firebase: https://firebase.google.com/docs

---

**🚀 Ready to deploy? Start with Vercel for the fastest setup!**
