/**
 * Shared types for demo data operations
 * Used by both the CLI script and admin API routes
 */

export interface DemoProgressEvent {
  phase: number;
  phaseName: string;
  level: 'info' | 'success' | 'error' | 'warning';
  message: string;
  progress?: { current: number; total: number };
}

export interface DemoStatus {
  exists: boolean;
  uid?: string;
  email?: string;
  displayName?: string;
  counts: Record<string, number>;
  embeddingStatus: { total: number; completed: number; percentage: number };
  lifeFeedCount: number;
  friendExists?: boolean;
  friendUid?: string;
  friendDisplayName?: string;
  friendLifeFeedCount?: number;
  circleCount?: number;
}

export type ProgressCallback = (event: DemoProgressEvent) => void;
