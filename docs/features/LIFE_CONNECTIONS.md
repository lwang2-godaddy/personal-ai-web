# Life Connections Feature

**Created:** February 6, 2026
**Last Updated:** February 6, 2026
**Author:** Claude Code

## Overview

Life Connections discovers cross-domain correlations in user's personal data to surface hidden patterns and relationships they wouldn't notice themselves.

**Example Insights:**
- "You sleep 23% better on days when you play badminton"
- "Your mood is 18% higher when you visit parks vs malls"
- "Morning gym sessions correlate with completing more events"
- "Your heart rate is 8% lower on days you record voice notes"

## Data Sources

### Currently Analyzed

| Domain | Metrics | Source Collection |
|--------|---------|-------------------|
| **Health** | sleepHours, sleepQuality, steps, activeMinutes, restingHeartRate, workoutsCount | `healthData` |
| **Activities** | Dynamic (badminton, gym, running, etc.) | `locationData` (activity field) |
| **Locations** | uniquePlaces, parkVisits, gymVisits | `locationData` |
| **Voice Notes** | notesCount, totalDuration, averageSentiment | `voiceNotes` |
| **Diary/Text Notes** | entriesCount, averageSentiment, totalWordCount | `textNotes` |
| **Photos** | count, withLocation, averageSentiment | `photoMemories` |
| **Mood** | mood score (0-1 scale) | `moodEntries` |

### Sentiment Analysis

Sentiment is extracted from:
- **Diary entries:** `analysis.sentiment.score` or `sentimentScore` field
- **Voice notes:** `sentiment` field (from transcription analysis)
- **Photos:** `analysis.sentiment.score` or `sentimentScore` field (from description)

Sentiment scores are typically on a -1 to +1 scale (negative to positive).

## Statistical Methods

### Pearson Correlation Coefficient (r)

Measures linear relationship between two variables:

```
r = Σ((xi - x̄)(yi - ȳ)) / √(Σ(xi - x̄)² × Σ(yi - ȳ)²)
```

**Interpretation:**
- r = 1.0: Perfect positive correlation
- r = 0.5: Moderate positive correlation
- r = 0.0: No correlation
- r = -0.5: Moderate negative correlation
- r = -1.0: Perfect negative correlation

### P-Value (Statistical Significance)

Tests if the correlation is statistically significant (not due to chance):

```
t = r × √((n-2) / (1-r²))
p = 2 × (1 - tCDF(|t|, n-2))
```

**Threshold:** p < 0.05 (95% confidence)

### Effect Size (Cohen's d)

Measures practical significance (how meaningful is the effect):

```
d = 2r / √(1 - r²)
```

**Interpretation:**
- |d| < 0.2: Negligible
- |d| 0.2-0.5: Small
- |d| 0.5-0.8: Medium
- |d| > 0.8: Large

**Threshold:** |d| > 0.3 (small-to-medium effect)

### Confidence Interval

95% confidence interval for the correlation:

```
z = 0.5 × ln((1+r)/(1-r))  // Fisher transformation
SE = 1 / √(n-3)
zLower = z - 1.96 × SE
zUpper = z + 1.96 × SE
rLower = (e^(2×zLower) - 1) / (e^(2×zLower) + 1)  // Inverse Fisher
rUpper = (e^(2×zUpper) - 1) / (e^(2×zUpper) + 1)
```

## Default Thresholds

| Parameter | Default | Description |
|-----------|---------|-------------|
| `lookbackDays` | 90 | Days of data to analyze |
| `minSampleSize` | 8 | Minimum overlapping days required |
| `minPValue` | 0.05 | Maximum p-value for significance |
| `minEffectSize` | 0.3 | Minimum effect size |
| `maxTimeLagDays` | 3 | Max days for time-lagged correlations |

## Correlation Pairs Analyzed

### Predefined Pairs

| Domain A | Domain B | Category | Time Lag |
|----------|----------|----------|----------|
| Badminton | Sleep Hours | health-activity | Yes |
| Gym | Sleep Quality | health-activity | Yes |
| Running | Resting Heart Rate | health-activity | No |
| Active Minutes | Sleep Quality | health-activity | Yes |
| Gym | Mood | mood-activity | Yes |
| Badminton | Mood | mood-activity | Yes |
| Park Visits | Mood | mood-activity | No |
| Steps | Mood | mood-health | No |
| Sleep Hours | Mood | mood-health | Yes |
| Voice Notes | Resting Heart Rate | mood-health | No |
| Diary Entries | Mood | mood-activity | No |
| Diary Sentiment | Mood | mood-health | No |
| Diary Sentiment | Sleep Hours | mood-health | Yes |
| Diary Entries | Steps | health-activity | No |
| Photos Taken | Mood | mood-activity | No |
| Photos Taken | Steps | health-activity | No |
| Voice Sentiment | Mood | mood-health | No |
| Voice Sentiment | Sleep Hours | mood-health | Yes |

### Dynamic Pairs

Additional pairs are generated dynamically based on available activity data:
- Each unique activity (from location data) is correlated with:
  - Sleep Hours (if available)
  - Mood

## Time-Lagged Correlations

For pairs marked with "Time Lag: Yes", the analyzer also checks:

1. **A leads B** (e.g., activity today → sleep tonight)
   - Lag 1-3 days tested

2. **B leads A** (e.g., poor sleep → skip gym tomorrow)
   - Lag 1-3 days tested

This helps discover causal relationships where one metric affects another with a delay.

## AI-Generated Content

When a significant correlation is found, AI (GPT-4o-mini) generates:

1. **Title** (max 8 words): e.g., "Badminton improves your sleep"
2. **Description**: e.g., "You sleep 23% better on days when you play badminton"
3. **Explanation**: 2-3 sentence explanation of the correlation
4. **Recommendation**: Actionable suggestion based on the finding

### Prompts Location

Prompts are stored in Firestore at:
```
promptConfigs/{language}/services/LifeConnectionsService
```

**Prompt IDs:**
- `system` - System prompt for AI context
- `explain_correlation` - Generate explanation
- `generate_title` - Generate short title
- `generate_recommendation` - Generate actionable recommendation

Prompts can be edited via the admin portal at `/admin/prompts`.

## Data Flow

```
1. Cloud Function triggered (analyzeLifeConnections)
   ↓
2. Fetch 90 days of data from all collections:
   - healthData, locationData, voiceNotes
   - moodEntries, textNotes, photoMemories
   ↓
3. Aggregate into daily buckets (DailyAggregate)
   ↓
4. For each correlation pair:
   a. Extract metric values for both domains
   b. Align data by date (only days with both values)
   c. Check minimum sample size (8 days)
   d. Calculate Pearson correlation coefficient
   e. Calculate p-value and effect size
   f. If significant (p < 0.05, |d| > 0.3):
      - Generate AI content (title, explanation, recommendation)
      - Create LifeConnection object
   ↓
5. Check time-lagged correlations (if enabled)
   ↓
6. Sort by effect size (most impactful first)
   ↓
7. Return top 10 connections
   ↓
8. Store in Firestore: users/{userId}/lifeConnections
```

## Firestore Structure

### Connection Document

```typescript
{
  id: string;                    // "conn_{userId}_{metricA}_{metricB}_{timestamp}"
  userId: string;
  category: "health-activity" | "mood-activity" | "mood-health";
  direction: "positive" | "negative";
  strength: "weak" | "moderate" | "strong";

  domainA: { type: string; metric: string; displayName: string };
  domainB: { type: string; metric: string; displayName: string };

  metrics: {
    coefficient: number;         // -1 to 1
    pValue: number;              // 0 to 1
    effectSize: number;          // Cohen's d
    sampleSize: number;          // Days of overlapping data
    confidenceInterval: { lower: number; upper: number };
  };

  title: string;                 // AI-generated
  description: string;           // AI-generated
  explanation: string;           // AI-generated
  recommendation?: {
    text: string;
    actionType: "do_more" | "do_less" | "schedule" | "observe";
  };

  timeLag?: {
    days: number;
    direction: "A_leads_B" | "B_leads_A";
  };

  dataPoints: Array<{ date: string; valueA: number; valueB: number }>;

  detectedAt: number;            // Timestamp
  expiresAt: number;             // 30 days from detection
  dismissed: boolean;
  userRating?: "helpful" | "not_helpful";
  aiGenerated: boolean;          // true if AI generated, false if fallback template
}
```

## Mobile App Integration

### Service

`src/services/connections/LifeConnectionsService.ts`
- Calls Cloud Function `analyzeLifeConnections`
- Falls back to local analysis if Cloud Function fails
- Caches results with 24-hour TTL

### Redux Slice

`src/store/slices/insightsSlice.ts`
- Stores connections in `state.insights.connections`
- Actions: `fetchInsights`, `dismissConnection`, `rateConnection`

### UI Components

- `LifeConnectionCard.tsx` - Card display for connection
- `LifeConnectionsHighlightCard.tsx` - Featured connection highlight
- `ConnectionDetailModal.tsx` - Detailed view with chart

### Screen

`InsightsScreen.tsx` - Tabbed view with Connections, Patterns, Anomalies

## Testing

### Lower Thresholds for Testing

To see connections with less data, temporarily modify in Cloud Function:

```typescript
// firebase/functions/src/index.ts
minPValue = 0.5,    // Lowered from 0.05
minEffectSize = 0.1, // Lowered from 0.3
```

**Remember to revert for production!**

### Mock Data

In development mode, tap the bug icon in InsightsScreen to inject mock connections for UI testing.

## Performance Considerations

- Analysis runs on Cloud Function with 5-minute timeout
- Daily aggregation caches results for 24 hours
- Only top 10 connections returned to reduce payload
- Connections expire after 30 days

## Future Enhancements

Potential improvements:
1. Weekly/monthly pattern correlations
2. Seasonal adjustments
3. Multi-variable regression
4. User feedback learning (helpful ratings improve future suggestions)
5. Push notifications for new discoveries
