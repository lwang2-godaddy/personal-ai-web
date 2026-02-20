/**
 * Shared types for admin data viewer pages
 */

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  postCount: number;
  lastPostAt: string | null;
}

export interface LifeKeyword {
  id: string;
  userId: string;
  keyword: string;
  description: string;
  emoji?: string;
  category: string;
  periodType: string;
  periodStart?: string;
  periodEnd?: string;
  confidence?: number;
  dominanceScore?: number;
  dataPointCount?: number;
  sampleDataPoints?: Array<{ type: string; snippet: string; date?: string }>;
  relatedDataTypes?: string[];
  viewed?: boolean;
  expanded?: boolean;
  hidden?: boolean;
  generatedAt?: string;
}

export interface FunFact {
  id: string;
  userId: string;
  source: 'funFacts';
  text?: string;
  category?: string;
  type?: string;
  confidence?: number;
  emoji?: string;
  dataPoints?: Array<{ type: string; id: string; snippet?: string }>;
  dataPointCount?: number;
  insightType?: string;
  periodType?: string;
  periodStart?: string;
  periodEnd?: string;
  periodLabel?: string;
  generatedAt?: string;
  expiresAt?: string;
  viewed?: boolean;
  hidden?: boolean;
}

export interface LifeConnectionDomain {
  type: string;
  metric: string;
  displayName: string;
}

export interface LifeConnectionMetrics {
  coefficient: number;        // Spearman rho (primary)
  pearsonR?: number;          // Pearson r (secondary)
  pValue: number;             // Raw p-value
  adjustedPValue?: number;    // BH-corrected p-value
  effectSize: number;         // Cohen's d
  sampleSize: number;         // Raw sample size
  effectiveSampleSize?: number; // Autocorrelation-adjusted
  autocorrelation?: number;   // Max lag-1 autocorrelation
  correlationType?: 'spearman'; // Correlation method used
  confidenceInterval: { lower: number; upper: number };
}

export interface WithWithoutComparison {
  withActivity: { count: number; mean: number; median: number };
  withoutActivity: { count: number; mean: number; median: number };
  absoluteDifference: number;
  percentDifference: number;
}

export interface LifeConnection {
  id: string;
  userId: string;
  category: string;
  direction: 'positive' | 'negative';
  strength: 'weak' | 'moderate' | 'strong';
  domainA: LifeConnectionDomain;
  domainB: LifeConnectionDomain;
  metrics: LifeConnectionMetrics;
  title: string;
  description: string;
  explanation: string;
  recommendation?: { text: string; actionType: string };
  timeLag?: { days: number; direction: string };
  withWithout?: WithWithoutComparison;
  survivesConfounderControl?: boolean;
  confounderPartialR?: number;
  confounderNote?: string;
  trendDirection?: 'strengthening' | 'stable' | 'weakening';
  dataPoints: Array<{ date: string; valueA: number; valueB: number }>;
  detectedAt: number;
  expiresAt: number;
  dismissed: boolean;
  userRating?: 'helpful' | 'not_helpful';
  aiGenerated: boolean;
}
