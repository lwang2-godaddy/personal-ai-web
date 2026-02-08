/**
 * Test discovery and orchestration for integration tests
 */

import * as fs from 'fs';
import * as path from 'path';
import type { TestResult, TestModule } from './test-utils';
import { log, colors, printTestFileResult } from './reporter';

const TESTS_DIR = path.join(__dirname, '..', 'tests');

/**
 * Discover all test files in the tests/ directory
 */
export async function discoverTests(): Promise<string[]> {
  if (!fs.existsSync(TESTS_DIR)) {
    return [];
  }

  const files = fs.readdirSync(TESTS_DIR);
  return files
    .filter(f => f.endsWith('.test.ts'))
    .map(f => path.join(TESTS_DIR, f))
    .sort();
}

/**
 * Filter tests by pattern
 */
export function filterTests(testFiles: string[], pattern?: string): string[] {
  if (!pattern) {
    return testFiles;
  }

  const lowerPattern = pattern.toLowerCase();
  return testFiles.filter(f => {
    const basename = path.basename(f).toLowerCase();
    return basename.includes(lowerPattern);
  });
}

/**
 * Run a single test file
 */
export async function runTestFile(filePath: string): Promise<{ results: TestResult[], duration: number }> {
  const startTime = Date.now();

  try {
    // Dynamic import of the test file
    const testModule: TestModule = await import(filePath);

    if (typeof testModule.run !== 'function') {
      throw new Error(`Test file must export a 'run' function: ${filePath}`);
    }

    const results = await testModule.run();
    const duration = Date.now() - startTime;

    return { results, duration };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    return {
      results: [{
        name: `Load test file: ${path.basename(filePath)}`,
        passed: false,
        reason: error.message
      }],
      duration
    };
  }
}

/**
 * Run all tests
 */
export async function runAllTests(options: {
  filter?: string;
  verbose?: boolean;
} = {}): Promise<{ passed: number; failed: number; total: number; results: TestResult[] }> {
  const testFiles = await discoverTests();
  const filteredFiles = filterTests(testFiles, options.filter);

  if (filteredFiles.length === 0) {
    if (options.filter) {
      log(`\nNo tests found matching filter: "${options.filter}"`, colors.yellow);
    } else {
      log('\nNo test files found in tests/ directory', colors.yellow);
    }
    return { passed: 0, failed: 0, total: 0, results: [] };
  }

  log(`\nFound ${filteredFiles.length} test file(s)${options.filter ? ` matching "${options.filter}"` : ''}:`, colors.dim);
  filteredFiles.forEach(f => {
    log(`  - ${path.basename(f)}`, colors.dim);
  });

  const allResults: TestResult[] = [];

  for (const file of filteredFiles) {
    const fileName = path.basename(file, '.test.ts');
    const { results, duration } = await runTestFile(file);

    allResults.push(...results);
    printTestFileResult(fileName, results, duration);
  }

  const passed = allResults.filter(r => r.passed).length;
  const failed = allResults.filter(r => !r.passed).length;

  return {
    passed,
    failed,
    total: allResults.length,
    results: allResults
  };
}

/**
 * Parse command line arguments
 */
export function parseArgs(args: string[]): { filter?: string; verbose?: boolean } {
  const result: { filter?: string; verbose?: boolean } = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--filter' && args[i + 1]) {
      result.filter = args[i + 1];
      i++; // Skip next arg
    } else if (arg.startsWith('--filter=')) {
      result.filter = arg.split('=')[1];
    } else if (arg === '--verbose' || arg === '-v') {
      result.verbose = true;
    }
  }

  return result;
}
