/**
 * Console reporting utilities for integration tests
 */

import type { TestResult } from './test-utils';

// ANSI color codes for console output
export const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};

/**
 * Log a message with optional color
 */
export function log(message: string, color: string = colors.reset): void {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Log a passing test
 */
export function logPass(testName: string): void {
  log(`  \u2713 ${testName}`, colors.green);
}

/**
 * Log a failing test
 */
export function logFail(testName: string, reason?: string): void {
  log(`  \u2717 ${testName}`, colors.red);
  if (reason) {
    log(`    Reason: ${reason}`, colors.dim);
  }
}

/**
 * Log an info message
 */
export function logInfo(message: string): void {
  log(`  \u2139 ${message}`, colors.cyan);
}

/**
 * Log a section header
 */
export function logSection(title: string): void {
  log(`\n${'='.repeat(60)}`, colors.cyan);
  log(`  ${title}`, colors.cyan);
  log('='.repeat(60), colors.cyan);
}

/**
 * Log a test case header
 */
export function logTestCase(name: string): void {
  log(`\n\ud83d\udcdd ${name}`, colors.yellow);
}

/**
 * Print a summary of test results
 */
export function printSummary(results: TestResult[]): void {
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  logSection('Test Summary');
  log(`\n  Total: ${results.length}`);
  log(`  Passed: ${passed}`, passed > 0 ? colors.green : colors.reset);
  log(`  Failed: ${failed}`, failed > 0 ? colors.red : colors.reset);

  if (failed > 0) {
    log('\n  Failed Tests:', colors.red);
    results.filter(r => !r.passed).forEach(r => {
      log(`    - ${r.name}: ${r.reason || 'Unknown reason'}`, colors.red);
    });
  }

  log('\n');
}

/**
 * Print test file result
 */
export function printTestFileResult(fileName: string, results: TestResult[], duration: number): void {
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const status = failed === 0 ? colors.green : colors.red;
  const icon = failed === 0 ? '\u2713' : '\u2717';

  log(`\n${icon} ${fileName} (${(duration / 1000).toFixed(1)}s) - ${passed}/${results.length} passed`, status);
}

/**
 * Log a boxed message for query visualization
 */
export function logQueryBox(title: string, lines: string[]): void {
  log('', colors.reset);
  log(`  \u250c\u2500 ${title}`, colors.cyan);
  lines.forEach(line => {
    log(`  \u2502 ${line}`, colors.dim);
  });
  log('  \u2514\u2500', colors.cyan);
}

/**
 * Log cleanup section
 */
export function logCleanup(items: string[]): void {
  log('', colors.reset);
  log('  \u250c\u2500 Cleanup', colors.yellow);
  items.forEach(item => {
    log(`  \u2502 ${item}`, colors.dim);
  });
}

/**
 * Log cleanup result
 */
export function logCleanupResult(success: boolean, message?: string): void {
  if (success) {
    log('  \u2514\u2500 \u2713 All test data deleted', colors.green);
  } else {
    log(`  \u2514\u2500 \u26a0 Cleanup warning: ${message}`, colors.yellow);
  }
}
