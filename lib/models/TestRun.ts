export interface TestRun {
  id: string;
  type: 'integration' | 'maestro';
  status: 'pending' | 'running' | 'passed' | 'failed' | 'error';
  trigger: 'manual' | 'scheduled' | 'pr';
  triggeredBy: string; // userId or 'scheduler' or 'github'
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  // Integration config
  filter?: string;
  skipE2E?: boolean;
  e2eOnly?: boolean;
  // Maestro specifics
  githubRunId?: number;
  githubRunUrl?: string;
  branch?: string;
  commitSha?: string;
  errorMessage?: string;
  createdAt: string;
}

export interface TestCaseResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  durationMs?: number;
  errorMessage?: string;
}

export interface TestSchedulerConfig {
  version: string;
  lastUpdatedAt: string;
  lastUpdatedBy: string;
  integration: {
    enabled: boolean;
    intervalHours: number;
    preferredHourUTC: number;
    filter?: string;
    skipE2E?: boolean;
    lastRunAt?: string;
  };
  maestro: {
    enabled: boolean;
    intervalHours: number;
    preferredHourUTC: number;
    branch: string;
    lastRunAt?: string;
  };
}

export const DEFAULT_TEST_SCHEDULER_CONFIG: TestSchedulerConfig = {
  version: '1.0.0',
  lastUpdatedAt: new Date().toISOString(),
  lastUpdatedBy: 'system',
  integration: {
    enabled: false,
    intervalHours: 24,
    preferredHourUTC: 6,
  },
  maestro: {
    enabled: false,
    intervalHours: 168,
    preferredHourUTC: 6,
    branch: 'develop',
  },
};
