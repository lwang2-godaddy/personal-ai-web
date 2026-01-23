# Life Keywords - AI-Powered Theme Generation

## Overview

Life Keywords is an AI-powered feature that analyzes user data stored in Pinecone over longer time periods (weeks, months, quarters, years) and generates meaningful **keywords** that capture themes and patterns in the user's life.

**Example Output:**
- **Week 12, 2025:** "Badminton Renaissance" - "You've been hitting the courts 4x weekly, up from your usual 2x. Your badminton game is clearly becoming a bigger part of your life this month."
- **January 2025:** "Health Focus" - "This month saw a 40% increase in gym visits and you started tracking sleep more consistently. A clear shift toward prioritizing wellness."

---

## Keyword Generation Algorithm

The keyword generation process follows a 4-step pipeline:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    KEYWORD GENERATION PIPELINE                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Step 1: GATHER VECTORS                                              │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │  Query Pinecone for all user vectors                        │     │
│  │  • Filter by userId                                         │     │
│  │  • topK: 1000 vectors max                                   │     │
│  │  • Client-side date range filtering                         │     │
│  └────────────────────────────────────────────────────────────┘     │
│                              ↓                                       │
│  Step 2: CLUSTER BY THEME                                            │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │  Group vectors by type + activity                           │     │
│  │  • Calculate centroid for each cluster                      │     │
│  │  • Calculate cohesion (avg similarity to centroid)          │     │
│  │  • Sort by: cohesion × √(cluster_size)                      │     │
│  └────────────────────────────────────────────────────────────┘     │
│                              ↓                                       │
│  Step 3: GENERATE KEYWORDS (OpenAI)                                  │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │  For each top cluster:                                      │     │
│  │  • Send sample data points to GPT-4o-mini                   │     │
│  │  • Generate: keyword phrase + description + emoji           │     │
│  │  • Filter by minimum confidence threshold                   │     │
│  └────────────────────────────────────────────────────────────┘     │
│                              ↓                                       │
│  Step 4: SAVE TO FIRESTORE                                           │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │  Batch write to lifeKeywords collection                     │     │
│  │  • Include vector references for "related memories"         │     │
│  │  • Store confidence, dominance, and category                │     │
│  └────────────────────────────────────────────────────────────┘     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Step 1: Gather Vectors from Pinecone

### Method
```typescript
private async gatherPeriodVectors(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<PineconeVector[]>
```

### How It Works

1. **Generate a random query vector** (1536 dimensions) - Pinecone requires a vector for querying
2. **Query Pinecone** with userId filter and topK=1000
3. **Filter by date range** on the client side (Pinecone doesn't support date range queries natively)

### Why Random Query Vector?

Pinecone doesn't have a "list all vectors" operation. We use a random vector to get diverse results across the user's data space. The actual content similarity doesn't matter here because we're retrieving all vectors for a user, not searching for semantically similar content.

### Date Filtering

```typescript
// Extract timestamp from metadata
const timestamp = metadata.timestamp || metadata.createdAt || metadata.date;
const vectorDate = new Date(timestamp).getTime();

// Check if within period
if (vectorDate >= startMs && vectorDate <= endMs) {
  vectors.push(vector);
}
```

### Memory Optimization

- **topK limited to 1000** to prevent Cloud Function memory exhaustion
- Previous implementation used topK=10000 which caused memory overflow errors

---

## Step 2: Cluster Vectors by Theme

### Method
```typescript
private async clusterVectorsByTheme(
  vectors: PineconeVector[],
  numClusters: number
): Promise<ThemeCluster[]>
```

### Clustering Strategy

Instead of true k-means clustering (which is expensive for 1536-dimensional vectors), we use a **semantic grouping approach**:

1. **Group by type + activity**
   ```typescript
   const key = activity ? `${type}:${activity}` : type;
   // Examples: "location:badminton", "health", "photo:birthday"
   ```

2. **Sort groups by size** (largest first)

3. **Calculate cluster metrics:**
   - **Centroid**: Average of all vectors in the cluster
   - **Cohesion**: Average cosine similarity of all vectors to the centroid

4. **Rank clusters** by: `cohesion × √(cluster_size)`
   - This balances cluster quality (cohesion) with significance (size)
   - Square root prevents large clusters from dominating

### Centroid Calculation

```typescript
private calculateCentroid(vectors: PineconeVector[]): number[] {
  const dim = vectors[0].values.length;  // 1536
  const centroid = new Array(dim).fill(0);

  for (const vector of vectors) {
    for (let i = 0; i < dim; i++) {
      centroid[i] += vector.values[i];
    }
  }

  for (let i = 0; i < dim; i++) {
    centroid[i] /= vectors.length;
  }

  return centroid;
}
```

### Cohesion Score

Cohesion measures how tightly grouped the vectors are:

```typescript
private calculateCohesion(vectors: PineconeVector[], centroid: number[]): number {
  let totalSimilarity = 0;
  for (const vector of vectors) {
    totalSimilarity += this.cosineSimilarity(vector.values, centroid);
  }
  return totalSimilarity / vectors.length;
}
```

- **High cohesion (>0.8)**: Vectors are very similar - strong theme
- **Medium cohesion (0.5-0.8)**: Moderate similarity - decent theme
- **Low cohesion (<0.5)**: Diverse vectors - weak theme

### Category Inference

Categories are inferred from metadata patterns:

| Category | Detection Rules |
|----------|-----------------|
| `health` | type="health" OR activity matches gym/workout/exercise/fitness |
| `activity` | type="location" with sports-related activity |
| `social` | activity matches restaurant/cafe/bar/party/dinner |
| `work` | activity matches office/work/meeting/conference |
| `travel` | activity matches airport/hotel/travel/vacation |
| `milestone` | type="photo" (special moments are often photographed) |
| `general` | Default for text/voice notes |

---

## Step 3: Generate Keywords with OpenAI

### Method
```typescript
private async generateKeywordFromCluster(
  userId: string,
  cluster: ThemeCluster,
  periodType: KeywordPeriodType,
  periodStart: Date,
  periodEnd: Date,
  periodLabel: string,
  totalVectors: number,
  language: string
): Promise<LifeKeyword | null>
```

### Prompt Structure

**System Prompt:**
```
You are a personal life analyst. Your job is to identify meaningful themes
and patterns from a user's personal data and express them as memorable keywords.

Guidelines:
- Keywords should be 2-4 words, catchy and memorable
- Descriptions should be 2-4 sentences, insightful and personal
- Use first person ("You've been..." or "Your...")
- Be positive and encouraging
- Focus on patterns, not individual events
- Make observations feel like discoveries
```

**User Prompt:**
```
Analyze this cluster of data points from {{periodLabel}} and generate a keyword.

Data points ({{dataPointCount}} total):
{{#each sampleDataPoints}}
- {{this.date}}: {{this.summary}} ({{this.type}})
{{/each}}

Common themes: {{themes}}
Dominant category: {{category}}

Generate:
1. A 2-4 word keyword that captures this theme
2. A 2-4 sentence description explaining the pattern
3. An emoji that represents this theme

Respond in JSON format:
{
  "keyword": "...",
  "description": "...",
  "emoji": "..."
}
```

### AI Configuration

| Parameter | Value | Notes |
|-----------|-------|-------|
| Model | `gpt-4o-mini` | Fast and cost-effective |
| Temperature | 0.8 | Creative output |
| Max Tokens | 300 | Enough for keyword + description |
| Response Format | JSON | Structured output |

### Sample Data Points

Only 5 representative data points are sent to OpenAI to:
1. Keep token usage low
2. Provide enough context for pattern recognition
3. Avoid overwhelming the model with redundant data

---

## Step 4: Save to Firestore

### Collection Structure

```
lifeKeywords/
  └── {keywordId}/
      ├── id: "kw_user123_weekly_2025-01-20_1705836400000"
      ├── userId: "user123"
      ├── keyword: "Badminton Renaissance"
      ├── description: "You've been hitting..."
      ├── emoji: "🏸"
      ├── periodType: "weekly"
      ├── periodStart: "2025-01-20T00:00:00.000Z"
      ├── periodEnd: "2025-01-26T23:59:59.999Z"
      ├── periodLabel: "Week 4, 2025"
      ├── confidence: 0.85
      ├── category: "activity"
      ├── relatedVectorIds: ["vec_1", "vec_2", ...]
      ├── relatedDataTypes: ["location", "health"]
      ├── sampleDataPoints: [{...}, {...}]
      ├── dataPointCount: 15
      ├── dominanceScore: 0.25
      ├── viewed: false
      ├── expanded: false
      ├── generatedAt: "2025-01-27T08:00:00.000Z"
      ├── publishedAt: "2025-01-27T08:00:00.000Z"
      └── hidden: false
```

### Key Metrics Stored

| Field | Description | Range |
|-------|-------------|-------|
| `confidence` | Cluster cohesion score | 0.0 - 1.0 |
| `dominanceScore` | Fraction of total data this cluster represents | 0.0 - 1.0 |
| `dataPointCount` | Number of vectors in this cluster | 1+ |

### Batch Writing

Keywords are written in a single batch operation for efficiency:

```typescript
const batch = admin.firestore().batch();
for (const keyword of keywords) {
  const docRef = admin.firestore().collection('lifeKeywords').doc(keyword.id);
  batch.set(docRef, keyword);
}
await batch.commit();
```

---

## Configuration Options

Settings are stored in Firestore at `config/lifeKeywordsSettings`:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `keywordsPerWeek` | 3 | Max keywords generated per week |
| `keywordsPerMonth` | 5 | Max keywords generated per month |
| `keywordsPerQuarter` | 3 | Max keywords generated per quarter |
| `keywordsPerYear` | 10 | Max keywords generated per year |
| `minDataPointsWeekly` | 10 | Minimum vectors required for weekly generation |
| `minDataPointsMonthly` | 30 | Minimum vectors required for monthly generation |
| `minConfidence` | 0.6 | Minimum cohesion score to publish keyword |

---

## Cost Analysis

### Per Keyword Generation

| Service | Cost | Notes |
|---------|------|-------|
| Pinecone Query | ~$0.00008 | 1000 vectors @ $0.08/1M reads |
| OpenAI GPT-4o-mini | ~$0.001 | ~500 input + 200 output tokens |
| Firestore Write | ~$0.000018 | 1 document write |
| **Total per keyword** | **~$0.001** | |

### Monthly Cost Estimate (Active User)

Assuming 4 weekly + 1 monthly generation per month:
- 4 weeks × 3 keywords = 12 weekly keywords
- 1 month × 5 keywords = 5 monthly keywords
- **Total: ~17 keywords/month = ~$0.017/user/month**

---

## Cloud Function Configuration

The `generateKeywordsNow` function requires elevated resources:

```typescript
export const generateKeywordsNow = onCall({
  enforceAppCheck: false,
  cors: true,
  timeoutSeconds: 300,   // 5 minutes max
  memory: '1GiB',        // Increased from 512MiB
}, async (request) => {
  // ...
});
```

### Why 1 GiB Memory?

- Vector operations on 1000 × 1536 dimensional arrays require significant memory
- Clustering calculations and centroid computation are memory-intensive
- Previous 512 MiB limit caused "memory exceeded" errors

---

## Scheduled Generation

### Weekly Keywords (Monday 8 AM UTC)

```typescript
export const generateWeeklyKeywords = onSchedule({
  schedule: '0 8 * * 1',
  timeZone: 'UTC',
}, async () => {
  // Generate for previous week (completed period)
  const weekStart = KeywordGenerator.getPreviousWeekStart();
  // ...
});
```

### Monthly Keywords (1st of Month 8 AM UTC)

```typescript
export const generateMonthlyKeywords = onSchedule({
  schedule: '0 8 1 * *',
  timeZone: 'UTC',
}, async () => {
  // Generate for previous month
  const monthStart = KeywordGenerator.getPreviousMonthStart();
  // ...
});
```

---

## Related Files

| File | Purpose |
|------|---------|
| `firebase/functions/src/services/KeywordGenerator.ts` | Core generation logic |
| `firebase/functions/src/index.ts` | Cloud Functions entry points |
| `firebase/functions/src/config/prompts/locales/en/lifeKeywords.yaml` | AI prompts |
| `src/models/LifeKeyword.ts` | TypeScript interfaces |
| `src/services/keywords/KeywordService.ts` | Mobile client service |
| `src/store/slices/keywordsSlice.ts` | Redux state management |

---

## Firestore Security Rules

```javascript
match /lifeKeywords/{keywordId} {
  // Users can read their own keywords
  allow read: if resource.data.userId == request.auth.uid;

  // Only Cloud Functions create keywords
  allow create: if false;

  // Users can update engagement fields only
  allow update: if resource.data.userId == request.auth.uid &&
    request.resource.data.diff(resource.data).affectedKeys().hasOnly([
      'viewed', 'viewedAt', 'expanded', 'expandedAt', 'hidden'
    ]);

  // Soft delete via hidden flag
  allow delete: if false;
}
```

---

## Debugging

### Check Cloud Function Logs

```bash
firebase functions:log --only generateKeywordsNow
```

### Common Issues

| Issue | Solution |
|-------|----------|
| "Not enough data points" | User needs more activity data in the period |
| "Memory exceeded" | Increase memory allocation or reduce topK |
| "No clusters found" | Data lacks pattern diversity |
| "Confidence too low" | Lower `minConfidence` threshold or improve data quality |

### Test Manually

```bash
# From mobile app or web dashboard
curl -X POST https://us-central1-your-project.cloudfunctions.net/generateKeywordsNow \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ID_TOKEN>" \
  -d '{"data":{"periodType":"weekly","force":true}}'
```
