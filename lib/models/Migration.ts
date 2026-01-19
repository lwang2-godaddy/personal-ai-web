/**
 * Migration models for the admin migrations page
 *
 * @description TypeScript interfaces for migration definitions (registry)
 * and migration runs (Firestore history)
 */

// =============================================================================
// Migration Registry Types (Code-defined)
// =============================================================================

/**
 * Migration category for filtering in the UI
 */
export type MigrationCategory = 'user_data' | 'privacy' | 'notifications' | 'cleanup' | 'other';

/**
 * Cloud Function type for triggering migrations
 */
export type MigrationType = 'callable' | 'http';

/**
 * Schema for a configurable migration option
 */
export interface MigrationOptionSchema {
  key: string;
  type: 'boolean' | 'number' | 'string' | 'select';
  label: string;
  description: string;
  default?: boolean | number | string;
  min?: number;
  max?: number;
  options?: { value: string; label: string }[];
}

/**
 * Migration definition in the registry
 * Add new migrations by adding entries to the registry file
 */
export interface MigrationDefinition {
  /** Unique identifier, e.g., 'createPredefinedCircles' */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of what this migration does */
  description: string;
  /** Category for filtering */
  category: MigrationCategory;
  /** Cloud Function type */
  type: MigrationType;
  /** Function name (callable) or URL path (http) */
  endpoint: string;
  /** Configurable options for this migration */
  options: MigrationOptionSchema[];
  /** Whether this migration supports dry run mode */
  supportsDryRun: boolean;
  /** Whether this migration can be resumed from a cursor */
  supportsResume: boolean;
  /** If true, shows destructive warning in UI */
  destructive: boolean;
}

// =============================================================================
// Migration Run Types (Firestore-stored)
// =============================================================================

/**
 * Status of a migration run
 */
export type MigrationRunStatus =
  | 'idle'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'partial';

/**
 * Error encountered during migration
 */
export interface MigrationError {
  userId?: string;
  message: string;
  timestamp: string;
}

/**
 * Result of a completed/failed migration run
 */
export interface MigrationResult {
  success: boolean;
  usersProcessed: number;
  usersCreated: number;
  usersSkipped: number;
  errors: MigrationError[];
  lastProcessedUserId?: string;
}

/**
 * Progress tracking for running migrations
 */
export interface MigrationProgress {
  current: number;
  total: number;
  phase: string;
}

/**
 * Options used to trigger a migration
 */
export interface MigrationRunOptions {
  dryRun: boolean;
  batchSize: number;
  startAfterUserId?: string;
  [key: string]: boolean | number | string | undefined;
}

/**
 * A single migration run stored in Firestore (migrationRuns collection)
 */
export interface MigrationRun {
  id: string;
  migrationId: string;
  status: MigrationRunStatus;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  options: MigrationRunOptions;
  result?: MigrationResult;
  progress?: MigrationProgress;
  triggeredBy: string;
  triggeredByEmail?: string;
}

// =============================================================================
// API Response Types
// =============================================================================

/**
 * Stats for a single migration
 */
export interface MigrationStats {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  lastRunAt?: string;
  lastRunStatus?: MigrationRunStatus;
}

/**
 * Migration with its current stats and recent runs
 */
export interface MigrationWithStats extends MigrationDefinition {
  stats: MigrationStats;
  recentRuns: MigrationRun[];
}

/**
 * Response from GET /api/admin/migrations
 */
export interface MigrationsListResponse {
  migrations: MigrationWithStats[];
  activeMigrations: MigrationRun[];
  totalRuns: number;
}

/**
 * Response from GET /api/admin/migrations/[id]/status
 */
export interface MigrationStatusResponse {
  totalUsers: number;
  usersProcessed: number;
  usersRemaining: number;
  percentComplete: number;
  estimatedTimeMinutes?: number;
}

/**
 * Response from POST /api/admin/migrations/[id] (trigger)
 */
export interface TriggerMigrationResponse {
  success: boolean;
  runId: string;
  message: string;
}

/**
 * Response from GET /api/admin/migrations/[id]/runs
 */
export interface MigrationRunsResponse {
  runs: MigrationRun[];
  total: number;
  hasMore: boolean;
}

/**
 * Response from GET /api/admin/migrations/[id]/runs/[runId]/progress
 */
export interface MigrationProgressResponse {
  status: MigrationRunStatus;
  progress?: MigrationProgress;
  result?: MigrationResult;
  durationMs?: number;
}

// =============================================================================
// UI Helper Types
// =============================================================================

/**
 * Category info for filtering UI
 */
export interface CategoryInfo {
  id: MigrationCategory;
  label: string;
  icon: string;
}

/**
 * Category definitions for the UI
 */
export const MIGRATION_CATEGORIES: CategoryInfo[] = [
  { id: 'user_data', label: 'User Data', icon: '👤' },
  { id: 'privacy', label: 'Privacy', icon: '🔒' },
  { id: 'notifications', label: 'Notifications', icon: '🔔' },
  { id: 'cleanup', label: 'Cleanup', icon: '🧹' },
  { id: 'other', label: 'Other', icon: '📦' },
];

/**
 * Get status badge color classes
 */
export function getStatusBadgeClasses(status: MigrationRunStatus): string {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'running':
      return 'bg-blue-100 text-blue-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    case 'cancelled':
      return 'bg-gray-100 text-gray-800';
    case 'partial':
      return 'bg-yellow-100 text-yellow-800';
    case 'idle':
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

/**
 * Get status display text
 */
export function getStatusDisplayText(status: MigrationRunStatus): string {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'running':
      return 'Running';
    case 'failed':
      return 'Failed';
    case 'cancelled':
      return 'Cancelled';
    case 'partial':
      return 'Partial';
    case 'idle':
    default:
      return 'Idle';
  }
}

/**
 * Format duration in milliseconds to human-readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}
