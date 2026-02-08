/**
 * Shared test utilities for integration tests
 */

export interface TestResult {
  name: string;
  passed: boolean;
  reason?: string;
  details?: Record<string, unknown>;
  duration?: number;
}

export interface TestCase {
  name: string;
  fn: () => Promise<TestResult[]>;
}

export interface TestModule {
  name: string;
  run: () => Promise<TestResult[]>;
}

/**
 * Get date string for N days ago in YYYY-MM-DD format
 */
export function getDateNDaysAgo(n: number): string {
  const date = new Date();
  date.setDate(date.getDate() - n);
  return date.toISOString().split('T')[0];
}

/**
 * Get timestamp (ms) for a date string at noon UTC
 */
export function getTimestampForDate(dateStr: string): number {
  return new Date(dateStr + 'T12:00:00Z').getTime();
}

/**
 * Wait for a specified time
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate a unique test ID
 */
export function generateTestId(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get start of day timestamp for a date string
 */
export function getStartOfDay(dateStr: string): number {
  return new Date(dateStr + 'T00:00:00Z').getTime();
}

/**
 * Get end of day timestamp for a date string
 */
export function getEndOfDay(dateStr: string): number {
  return new Date(dateStr + 'T23:59:59Z').getTime();
}
