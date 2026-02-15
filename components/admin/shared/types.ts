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
