/**
 * Shared types for E2E test data operations
 * Re-exports DemoProgressEvent so DemoActionButton/DemoProgressLog components work
 */

export type { DemoProgressEvent, ProgressCallback } from '../demo/types';

export interface E2EStatus {
  primaryUser: {
    exists: boolean;
    uid?: string;
    email?: string;
    displayName?: string;
  };
  friendUser: {
    exists: boolean;
    uid?: string;
    email?: string;
    displayName?: string;
  };
  dataCounts: Record<string, number>;
  totalDocuments: number;
}
