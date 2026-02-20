/**
 * Life Connections Statistics - Unit Tests
 *
 * Pure math tests for the statistical functions added to statistics.ts
 * for the Life Connections correlation analysis feature.
 *
 * Tests the following functions:
 * - rankData
 * - spearmanCorrelation
 * - benjaminiHochberg
 * - lag1Autocorrelation
 * - effectiveSampleSize
 * - partialSpearmanCorrelation
 * - computeWithWithoutComparison
 * - correlation (existing Pearson)
 * - correlationPValue (existing)
 * - analyzeCorrelation (updated)
 *
 * Run standalone: npx tsx scripts/integration-tests/tests/life-connections-statistics.test.ts
 */

import {
  rankData,
  spearmanCorrelation,
  benjaminiHochberg,
  lag1Autocorrelation,
  effectiveSampleSize,
  partialSpearmanCorrelation,
  computeWithWithoutComparison,
  correlation,
  correlationPValue,
  analyzeCorrelation,
} from '../../../../PersonalAIApp/firebase/functions/src/utils/statistics';

// ============================================================================
// Test infrastructure
// ============================================================================

interface TestCaseResult {
  name: string;
  passed: boolean;
  reason?: string;
}

let totalPassed = 0;
let totalFailed = 0;
const allResults: TestCaseResult[] = [];

function pass(testName: string): void {
  totalPassed++;
  allResults.push({ name: testName, passed: true });
  console.log(`\x1b[32m  \u2713 PASS\x1b[0m: ${testName}`);
}

function fail(testName: string, reason: string): void {
  totalFailed++;
  allResults.push({ name: testName, passed: false, reason });
  console.log(`\x1b[31m  \u2717 FAIL\x1b[0m: ${testName} - ${reason}`);
}

function assertApprox(actual: number, expected: number, tolerance: number, testName: string): void {
  if (Math.abs(actual - expected) <= tolerance) {
    pass(testName);
  } else {
    fail(testName, `expected ~${expected} (tolerance ${tolerance}), got ${actual}`);
  }
}

function assertTrue(condition: boolean, testName: string, failReason: string): void {
  if (condition) {
    pass(testName);
  } else {
    fail(testName, failReason);
  }
}

function logSection(title: string): void {
  console.log(`\n\x1b[36m${'='.repeat(60)}\x1b[0m`);
  console.log(`\x1b[36m  ${title}\x1b[0m`);
  console.log(`\x1b[36m${'='.repeat(60)}\x1b[0m`);
}

// ============================================================================
// Test 1: Spearman on monotonic data
// ============================================================================

function test1_spearmanCorrelation(): void {
  logSection('Test 1: Spearman rank correlation');

  // Nearly monotonic data - should have high positive rho
  const x1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const y1 = [1, 3, 2, 5, 4, 7, 6, 9, 8, 10];
  const rho1 = spearmanCorrelation(x1, y1);
  assertApprox(rho1, 0.939, 0.05, 'Spearman rho on nearly monotonic data ~ 0.939');

  // Perfect negative correlation
  const x2 = [1, 2, 3, 4, 5];
  const y2 = [5, 4, 3, 2, 1];
  const rho2 = spearmanCorrelation(x2, y2);
  assertApprox(rho2, -1.0, 0.001, 'Spearman rho on perfect negative = -1.0');

  // Perfect positive correlation
  const x3 = [1, 2, 3, 4, 5];
  const y3 = [1, 2, 3, 4, 5];
  const rho3 = spearmanCorrelation(x3, y3);
  assertApprox(rho3, 1.0, 0.001, 'Spearman rho on perfect positive = 1.0');

  // Verify rankData produces correct ranks with ties
  const ranks = rankData([10, 20, 20, 30]);
  const expectedRanks = [1, 2.5, 2.5, 4];
  const ranksMatch = ranks.every((r, i) => Math.abs(r - expectedRanks[i]) < 0.001);
  assertTrue(ranksMatch, 'rankData handles ties correctly (averaged ranks)', `got [${ranks}], expected [${expectedRanks}]`);
}

// ============================================================================
// Test 2: Benjamini-Hochberg FDR correction
// ============================================================================

function test2_benjaminiHochberg(): void {
  logSection('Test 2: Benjamini-Hochberg FDR correction');

  const pValues = [0.001, 0.01, 0.03, 0.04, 0.05, 0.10, 0.20, 0.50];
  const adjusted = benjaminiHochberg(pValues, 0.05);

  // At FDR=0.05, the first two (0.001, 0.01) should survive
  const survivingCount = adjusted.filter(p => p < 0.05).length;
  assertTrue(
    survivingCount === 2,
    'BH correction: exactly 2 p-values survive at FDR=0.05',
    `expected 2 surviving, got ${survivingCount} (adjusted: [${adjusted.map(p => p.toFixed(4)).join(', ')}])`
  );

  // Verify first two are significant
  assertTrue(
    adjusted[0] < 0.05 && adjusted[1] < 0.05,
    'BH correction: p=0.001 and p=0.01 survive',
    `adjusted[0]=${adjusted[0].toFixed(4)}, adjusted[1]=${adjusted[1].toFixed(4)}`
  );

  // Verify remaining are not significant
  const remainingAllAbove = adjusted.slice(2).every(p => p >= 0.05);
  assertTrue(
    remainingAllAbove,
    'BH correction: remaining p-values have adjusted p >= 0.05',
    `adjusted values: [${adjusted.slice(2).map(p => p.toFixed(4)).join(', ')}]`
  );

  // Adjusted p-values should be monotonically non-decreasing (after sorting by original order)
  // Since input was already sorted, adjusted should be non-decreasing
  let isMonotone = true;
  for (let i = 1; i < adjusted.length; i++) {
    if (adjusted[i] < adjusted[i - 1] - 1e-10) {
      isMonotone = false;
      break;
    }
  }
  assertTrue(
    isMonotone,
    'BH correction: adjusted p-values are monotonically non-decreasing',
    `adjusted: [${adjusted.map(p => p.toFixed(4)).join(', ')}]`
  );
}

// ============================================================================
// Test 3: Lag-1 autocorrelation
// ============================================================================

function test3_lag1Autocorrelation(): void {
  logSection('Test 3: Lag-1 autocorrelation');

  // Linear increasing values should have high positive autocorrelation
  const linear = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const autoLinear = lag1Autocorrelation(linear);
  assertTrue(
    autoLinear >= 0.7,
    'Lag-1 autocorrelation on linear data >= 0.7',
    `got ${autoLinear.toFixed(4)}`
  );

  // Alternating values should have strong negative autocorrelation
  const alternating = [1, -1, 1, -1, 1, -1, 1, -1, 1, -1];
  const autoAlternating = lag1Autocorrelation(alternating);
  assertApprox(autoAlternating, -1.0, 0.15, `Lag-1 autocorrelation on alternating data ~ -1.0 (got ${autoAlternating.toFixed(4)})`);
}

// ============================================================================
// Test 4: Effective sample size
// ============================================================================

function test4_effectiveSampleSize(): void {
  logSection('Test 4: Effective sample size');

  // Highly autocorrelated series: linear values
  // For linear [1..30], lag-1 autocorrelation is ~0.97
  // nEff = 30 * (1-0.97)/(1+0.97) ~ 0.46, clamped to 3
  const linearA = Array.from({ length: 30 }, (_, i) => i + 1);
  const linearB = Array.from({ length: 30 }, (_, i) => i + 1);
  const nEffLinear = effectiveSampleSize(linearA, linearB);
  assertTrue(
    nEffLinear < 30,
    'Effective sample size < n for highly autocorrelated data',
    `nEff=${nEffLinear}, n=30`
  );

  // Low autocorrelation series: data with jumps that break serial correlation
  // Using a seeded-like sequence that alternates unpredictably
  const lowAutoA = [5, 2, 8, 1, 9, 3, 7, 4, 6, 10, 2, 8, 1, 9, 3, 7, 4, 6, 10, 5,
                    8, 1, 9, 3, 7, 4, 6, 10, 5, 2, 9, 3, 7, 4, 6, 10, 5, 2, 8, 1,
                    7, 4, 6, 10, 5, 2, 8, 1, 9, 3];
  const lowAutoB = [9, 4, 1, 7, 3, 10, 6, 2, 8, 5, 4, 1, 7, 3, 10, 6, 2, 8, 5, 9,
                    1, 7, 3, 10, 6, 2, 8, 5, 9, 4, 3, 10, 6, 2, 8, 5, 9, 4, 1, 7,
                    6, 2, 8, 5, 9, 4, 1, 7, 3, 10];
  const nEffLow = effectiveSampleSize(lowAutoA, lowAutoB);
  // For the linear series above (n=30, very high autocorrelation), nEff clamps to 3.
  // For this scrambled data (n=50, lower autocorrelation), nEff should be larger.
  assertTrue(
    nEffLow > nEffLinear,
    'Effective sample size is larger for less autocorrelated data',
    `nEffLow=${nEffLow} vs nEffLinear=${nEffLinear}`
  );

  // The formula: nEff = n * (1 - r1) / (1 + r1) where r1 = max(|r1A|, |r1B|)
  // For autocorrelation = 0.5: nEff = 30 * 0.5/1.5 = 10
  // We can't easily create a series with exact autocorrelation=0.5, so just verify the math:
  // effectiveSampleSize takes two series, computes lag-1 autocorrelation for each,
  // picks the max, and applies Bartlett's formula. Already tested above.
  assertTrue(
    nEffLinear >= 3,
    'Effective sample size has minimum floor of 3',
    `got ${nEffLinear}`
  );
}

// ============================================================================
// Test 5: With/without comparison
// ============================================================================

function test5_withWithoutComparison(): void {
  logSection('Test 5: With/without comparison');

  // 10 "with" days (activity=1) and 10 "without" days (activity=0)
  const activity = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  // "With" days have higher outcome (mean=8.0)
  // "Without" days have lower outcome (mean=5.2)
  const outcomes = [7, 8, 9, 7, 8, 9, 7, 8, 9, 8, 5, 6, 4, 5, 6, 4, 5, 6, 4, 7];

  const result = computeWithWithoutComparison(activity, outcomes);

  assertTrue(result !== null, 'With/without comparison returns non-null result', 'result was null');

  if (result) {
    // Verify counts
    assertTrue(
      result.withActivity.count === 10 && result.withoutActivity.count === 10,
      'With/without: correct group counts (10 each)',
      `withCount=${result.withActivity.count}, withoutCount=${result.withoutActivity.count}`
    );

    // Verify means
    assertApprox(
      result.withActivity.mean, 8.0, 0.01,
      `With/without: withMean = 8.0 (got ${result.withActivity.mean})`
    );
    assertApprox(
      result.withoutActivity.mean, 5.2, 0.01,
      `With/without: withoutMean = 5.2 (got ${result.withoutActivity.mean})`
    );

    // Verify absolute difference
    const expectedAbsDiff = 8.0 - 5.2;
    assertApprox(
      result.absoluteDifference, expectedAbsDiff, 0.01,
      `With/without: absoluteDifference = ${expectedAbsDiff}`
    );

    // Verify percent difference: ((8.0 - 5.2) / |5.2|) * 100 ~ 53.85%
    const expectedPctDiff = ((8.0 - 5.2) / 5.2) * 100;
    assertApprox(
      result.percentDifference, expectedPctDiff, 0.5,
      `With/without: percentDifference ~ ${expectedPctDiff.toFixed(1)}%`
    );
  }
}

// ============================================================================
// Test 6: Partial Spearman correlation (confounder control)
// ============================================================================

function test6_partialCorrelation(): void {
  logSection('Test 6: Partial Spearman correlation (confounder control)');

  // Create x and y that both strongly correlate with z (the confounder)
  // z = [1, 2, 3, ..., 20]
  // x = z + small noise (x highly correlated with z)
  // y = z + small noise (y highly correlated with z)
  // Raw r_xy should be high (both driven by z)
  // After controlling for z, partial r should be much smaller
  const z = Array.from({ length: 20 }, (_, i) => i + 1);
  // Small deterministic "noise" that doesn't create a real correlation after z is removed
  const noiseX = [0.1, -0.2, 0.3, -0.1, 0.2, -0.3, 0.1, -0.2, 0.3, -0.1, 0.2, -0.3, 0.1, -0.2, 0.3, -0.1, 0.2, -0.3, 0.1, -0.2];
  const noiseY = [-0.15, 0.25, -0.1, 0.2, -0.25, 0.15, -0.2, 0.1, -0.15, 0.25, -0.1, 0.2, -0.25, 0.15, -0.2, 0.1, -0.15, 0.25, -0.1, 0.2];

  const x = z.map((zi, i) => zi + noiseX[i]);
  const y = z.map((zi, i) => zi + noiseY[i]);

  // Raw Spearman correlation between x and y (should be high, driven by z)
  const rawRho = spearmanCorrelation(x, y);
  assertTrue(
    rawRho > 0.8,
    `Raw Spearman r_xy > 0.8 (both driven by confounder z)`,
    `got ${rawRho.toFixed(4)}`
  );

  // Partial correlation controlling for z (should be much smaller)
  const partialRho = partialSpearmanCorrelation(x, y, z);
  assertTrue(
    Math.abs(partialRho) < Math.abs(rawRho),
    `Partial r after controlling for z is smaller than raw r`,
    `partial=${partialRho.toFixed(4)}, raw=${rawRho.toFixed(4)}`
  );

  assertTrue(
    Math.abs(partialRho) < 0.5,
    `Partial correlation close to 0 after removing confounder (|r| < 0.5)`,
    `got |${partialRho.toFixed(4)}|`
  );
}

// ============================================================================
// Test 7: Existing Pearson correlation regression
// ============================================================================

function test7_pearsonCorrelation(): void {
  logSection('Test 7: Existing Pearson correlation (regression)');

  // Perfect linear relationship: y = 2x
  const x = [1, 2, 3, 4, 5];
  const y = [2, 4, 6, 8, 10];
  const r = correlation(x, y);
  assertApprox(r, 1.0, 0.001, 'Pearson r on y=2x is exactly 1.0');

  // No correlation (orthogonal patterns)
  const x2 = [1, 2, 3, 4, 5];
  const y2 = [3, 1, 4, 2, 5]; // Not linearly related
  const r2 = correlation(x2, y2);
  assertTrue(
    Math.abs(r2) < 0.8,
    'Pearson r on uncorrelated data is low',
    `got ${r2.toFixed(4)}`
  );

  // Perfect negative: y = -x
  const x3 = [1, 2, 3, 4, 5];
  const y3 = [-1, -2, -3, -4, -5];
  const r3 = correlation(x3, y3);
  assertApprox(r3, -1.0, 0.001, 'Pearson r on y=-x is exactly -1.0');
}

// ============================================================================
// Test 8: p-value calculation
// ============================================================================

function test8_pValueCalculation(): void {
  logSection('Test 8: Correlation p-value calculation');

  // r=0.7, n=30 should be highly significant
  const pValue1 = correlationPValue(0.7, 30);
  assertTrue(
    pValue1 < 0.05,
    `p-value for r=0.7, n=30 is < 0.05 (highly significant)`,
    `got p=${pValue1.toFixed(6)}`
  );
  assertTrue(
    pValue1 < 0.001,
    `p-value for r=0.7, n=30 is < 0.001 (very highly significant)`,
    `got p=${pValue1.toFixed(6)}`
  );

  // Weak correlation with small sample: r=0.2, n=10 should NOT be significant
  const pValue2 = correlationPValue(0.2, 10);
  assertTrue(
    pValue2 > 0.05,
    `p-value for r=0.2, n=10 is > 0.05 (not significant)`,
    `got p=${pValue2.toFixed(6)}`
  );

  // analyzeCorrelation should produce consistent results
  const x = Array.from({ length: 30 }, (_, i) => i);
  const y = x.map(xi => xi * 2 + Math.sin(xi) * 0.5);
  const result = analyzeCorrelation(x, y);
  assertTrue(
    result.correlationType === 'spearman',
    'analyzeCorrelation uses Spearman as primary method',
    `got ${result.correlationType}`
  );
  assertTrue(
    result.sampleSize === 30,
    'analyzeCorrelation reports correct sample size',
    `got ${result.sampleSize}`
  );
  assertTrue(
    result.effectiveSampleSize <= result.sampleSize,
    'Effective sample size <= raw sample size',
    `nEff=${result.effectiveSampleSize}, n=${result.sampleSize}`
  );
  assertTrue(
    typeof result.pearsonR === 'number' && typeof result.coefficient === 'number',
    'analyzeCorrelation returns both Spearman (coefficient) and Pearson (pearsonR)',
    `coefficient=${result.coefficient}, pearsonR=${result.pearsonR}`
  );
}

// ============================================================================
// Main runner
// ============================================================================

function main(): void {
  console.log('\n\x1b[1m\x1b[36mLife Connections Statistics - Unit Tests\x1b[0m');
  console.log('\x1b[2mPure math tests for statistics.ts functions\x1b[0m\n');

  test1_spearmanCorrelation();
  test2_benjaminiHochberg();
  test3_lag1Autocorrelation();
  test4_effectiveSampleSize();
  test5_withWithoutComparison();
  test6_partialCorrelation();
  test7_pearsonCorrelation();
  test8_pValueCalculation();

  // Summary
  console.log(`\n\x1b[36m${'='.repeat(60)}\x1b[0m`);
  console.log(`\x1b[36m  Test Summary\x1b[0m`);
  console.log(`\x1b[36m${'='.repeat(60)}\x1b[0m`);
  console.log(`\n  Total:  ${totalPassed + totalFailed}`);
  console.log(`\x1b[32m  Passed: ${totalPassed}\x1b[0m`);
  if (totalFailed > 0) {
    console.log(`\x1b[31m  Failed: ${totalFailed}\x1b[0m`);
    console.log(`\n\x1b[31m  Failed Tests:\x1b[0m`);
    allResults.filter(r => !r.passed).forEach(r => {
      console.log(`\x1b[31m    - ${r.name}: ${r.reason}\x1b[0m`);
    });
  } else {
    console.log(`  Failed: 0`);
  }
  console.log('');

  if (totalFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main();
