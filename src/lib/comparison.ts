import type { HistoryItem } from './types';
import type {
  ComparisonData,
  MetricsComparison,
  MetricComparison,
  TestComparison,
  TestRunResult,
  ConfigComparison,
  ConfigChange,
  ComparisonSummary,
  TrendDirection,
  TestStatus,
} from './comparisonTypes';

/**
 * Calculate trend direction for a metric
 * @param values Array of metric values across runs
 * @param lowerIsBetter Whether lower values are better (e.g., latency, cost)
 */
function calculateTrend(
  values: number[],
  lowerIsBetter: boolean = false
): { direction: TrendDirection; delta: number; deltaPercentage: number; isImprovement: boolean } {
  if (values.length < 2) {
    return { direction: 'stable', delta: 0, deltaPercentage: 0, isImprovement: false };
  }

  const first = values[0];
  const last = values[values.length - 1];
  const delta = last - first;
  const deltaPercentage = first !== 0 ? (delta / first) * 100 : 0;

  // Calculate variance to detect volatility
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = avg !== 0 ? stdDev / avg : 0;

  // If coefficient of variation is high (>0.2), mark as variable
  if (coefficientOfVariation > 0.2) {
    return {
      direction: 'variable',
      delta,
      deltaPercentage,
      isImprovement: false,
    };
  }

  // Determine if improving or degrading
  const threshold = 0.01; // 1% threshold for "stable"
  if (Math.abs(deltaPercentage) < threshold) {
    return { direction: 'stable', delta, deltaPercentage, isImprovement: false };
  }

  const isIncreasing = delta > 0;
  const isImproving = lowerIsBetter ? !isIncreasing : isIncreasing;

  return {
    direction: isImproving ? 'improving' : 'degrading',
    delta,
    deltaPercentage,
    isImprovement: isImproving,
  };
}

/**
 * Create a metric comparison object
 */
function createMetricComparison(
  name: string,
  values: number[],
  lowerIsBetter: boolean = false
): MetricComparison {
  const { direction, delta, deltaPercentage, isImprovement } = calculateTrend(values, lowerIsBetter);

  return {
    name,
    values,
    trend: direction,
    delta,
    deltaPercentage,
    isImprovement,
  };
}

/**
 * Compare metrics across runs
 */
function compareMetrics(runs: HistoryItem[]): MetricsComparison {
  const passRates = runs.map((run) =>
    run.stats.totalTests > 0 ? (run.stats.passed / run.stats.totalTests) * 100 : 0
  );
  const avgScores = runs.map((run) => run.stats.avgScore);
  const totalCosts = runs.map((run) => run.stats.totalCost);
  const avgLatencies = runs.map((run) =>
    run.stats.totalTests > 0 ? run.stats.totalLatency / run.stats.totalTests : 0
  );

  // Calculate token usage from results.results.stats.tokenUsage or results.stats.tokenUsage (legacy)
  const tokenUsages = runs.map((run) => {
    // Support both new format (results.results.stats) and legacy format (results.stats)
    const stats = (run.results as any)?.results?.stats || (run.results as any)?.stats;
    if (stats?.tokenUsage?.total) {
      return stats.tokenUsage.total;
    }
    return 0;
  });

  return {
    passRate: createMetricComparison('Pass Rate (%)', passRates, false),
    avgScore: createMetricComparison('Average Score', avgScores, false),
    totalCost: createMetricComparison('Total Cost ($)', totalCosts, true),
    avgLatency: createMetricComparison('Avg Latency (ms)', avgLatencies, true),
    tokenUsage: createMetricComparison('Token Usage', tokenUsages, true),
  };
}

/**
 * Determine test status across runs
 */
function determineTestStatus(results: TestRunResult[]): TestStatus {
  if (results.length < 2) return 'stable';

  const passStates = results.map((r) => r.pass);
  const scores = results.map((r) => r.score);

  // Check if all pass/fail states are the same
  const allSamePassFail = passStates.every((p) => p === passStates[0]);

  if (!allSamePassFail) {
    // Check for volatility (flipping between pass/fail)
    let changes = 0;
    for (let i = 1; i < passStates.length; i++) {
      if (passStates[i] !== passStates[i - 1]) changes++;
    }

    if (changes > 1) return 'volatile'; // Multiple flips

    // Single change: improved or regressed
    const firstPass = passStates[0];
    const lastPass = passStates[passStates.length - 1];

    if (!firstPass && lastPass) return 'improved'; // Was failing, now passing
    if (firstPass && !lastPass) return 'regressed'; // Was passing, now failing
  }

  // Same pass/fail state, check score changes
  const scoreVariance = Math.max(...scores) - Math.min(...scores);
  if (scoreVariance > 0.2) {
    // Significant score change (>0.2)
    return 'changed';
  }

  return 'stable';
}

/**
 * Extract test results for comparison
 * Groups tests by dataset variables + provider (not just by index)
 */
function extractTestComparisons(runs: HistoryItem[]): TestComparison[] {
  const testComparisons: TestComparison[] = [];

  // Build a map of all unique tests across all runs
  // Key: JSON.stringify({vars, provider})
  const testMap = new Map<string, {
    varsObj: any;
    provider: string;
    promptLabel: string;
    testsByRun: Map<number, any>; // runIndex -> test data
  }>();

  // Collect all tests from all runs
  runs.forEach((run, runIndex) => {
    // Support both formats:
    // - Legacy: run.results.results is the array
    // - Current: run.results.results.results is the array (matches HistoryService)
    const testResults = (run.results as any)?.results?.results || (run.results as any)?.results || [];

    // Each testResult is a single test case
    testResults.forEach((testResult: any, testIdx: number) => {
      const varsObj = testResult.vars || testResult.testCase?.vars || {};
      const provider = testResult.provider?.id || testResult.provider || 'unknown';
      const promptLabel = testResult.prompt?.label || testResult.prompt?.raw?.substring(0, 50) || `Test ${testIdx + 1}`;

      // Create unique key: variables + provider + prompt
      const testKey = JSON.stringify({ vars: varsObj, provider, promptLabel });

      if (!testMap.has(testKey)) {
        testMap.set(testKey, {
          varsObj,
          provider,
          promptLabel,
          testsByRun: new Map(),
        });
      }

      // Store the test result for this test in this run
      testMap.get(testKey)!.testsByRun.set(runIndex, testResult);
    });
  });

  // Now create comparisons for each unique test
  let comparisonIndex = 0;
  testMap.forEach((testData) => {
    const results: TestRunResult[] = [];

    // For each run, get the result for this test (or null if not present)
    runs.forEach((run, runIndex) => {
      const testResult = testData.testsByRun.get(runIndex);

      if (testResult) {
        // Extract pass status - check multiple possible locations
        // Based on HistoryService.calculateStats: success || gradingResult?.pass
        const pass = testResult.success ?? testResult.gradingResult?.pass ?? testResult.pass ?? false;
        const score = testResult.score ?? testResult.gradingResult?.score ?? 0;

        results.push({
          pass,
          score,
          latencyMs: testResult.latencyMs || 0,
          cost: testResult.cost || 0,
          output: testResult.response?.output || testResult.output,
          gradingResult: testResult.gradingResult,
          provider: testResult.provider?.id || testResult.provider || testData.provider,
        });
      } else{
        // Test not present in this run
        results.push({
          pass: false,
          score: 0,
          latencyMs: 0,
          cost: 0,
          output: undefined,
          provider: testData.provider,
        });
      }
    });

    const scores = results.map((r) => r.score);
    const scoreDelta = scores[scores.length - 1] - scores[0];
    const scoreVariance = Math.max(...scores) - Math.min(...scores);
    const status = determineTestStatus(results);

    // Build description from test data - only show key variables, not all
    const varsObj = testData.varsObj;

    // Filter to only show important variables (exclude internal/meta fields)
    const importantKeys = ['product_title', 'title', 'text', 'query', 'input', 'question', 'prompt', 'user_message'];
    const filteredVars = Object.entries(varsObj)
      .filter(([key]) => {
        // Show if it's in important keys list, or if there are no matches, show first 2 keys
        return importantKeys.some(k => key.toLowerCase().includes(k)) ||
               Object.keys(varsObj).length <= 2;
      })
      .slice(0, 2); // Show max 2 variables

    const varsDescription = filteredVars.length > 0
      ? filteredVars
          .map(([key, value]) => {
            const valStr = typeof value === 'string' ? value : JSON.stringify(value);
            // Truncate to 50 chars
            return `${key}: ${valStr.length > 50 ? valStr.substring(0, 50) + '...' : valStr}`;
          })
          .join(' | ')
      : '';

    testComparisons.push({
      testIndex: comparisonIndex++,
      promptLabel: testData.promptLabel,
      varDescription: varsDescription,
      results,
      scoreDelta,
      scoreVariance,
      status,
    });
  });

  return testComparisons;
}

/**
 * Compare configurations across runs
 */
function compareConfigs(runs: HistoryItem[]): ConfigComparison {
  const createChange = (field: string, values: (string | number)[]): ConfigChange => {
    const changed = !values.every((v) => v === values[0]);
    const changeIndices: number[] = [];
    for (let i = 1; i < values.length; i++) {
      if (values[i] !== values[i - 1]) {
        changeIndices.push(i);
      }
    }

    return { field, values, changed, changeIndices };
  };

  const promptCounts = runs.map((run) => run.project?.prompts?.length || 0);
  const providerModels = runs.map((run) => {
    const providers = run.project?.providers || [];
    // Show all providers, not just the first one
    if (providers.length === 0) return 'Unknown';
    if (providers.length === 1) return providers[0].providerId;
    // Multiple providers - sort alphabetically so order doesn't matter for comparison
    return providers.map(p => p.providerId).sort().join(', ');
  });
  const datasetRowCounts = runs.map((run) => run.project?.dataset?.rows?.length || 0);
  const assertionCounts = runs.map((run) => run.project?.assertions?.length || 0);

  // Detailed prompt changes
  const promptChanges: any[] = [];
  for (let i = 1; i < runs.length; i++) {
    const prevPrompts = runs[i - 1].project?.prompts || [];
    const currPrompts = runs[i].project?.prompts || [];

    // Create maps for easier comparison - filter out prompts without ids
    const prevMap = new Map(prevPrompts.filter(p => p && p.id).map(p => [p.id, p]));
    const currMap = new Map(currPrompts.filter(p => p && p.id).map(p => [p.id, p]));

    // Find added prompts
    currPrompts.forEach(prompt => {
      if (prompt && prompt.id && !prevMap.has(prompt.id)) {
        promptChanges.push({
          promptLabel: prompt.label || 'Unnamed',
          change: 'added',
          newText: prompt.text || '',
          runIndex: i,
        });
      }
    });

    // Find removed prompts
    prevPrompts.forEach(prompt => {
      if (prompt && prompt.id && !currMap.has(prompt.id)) {
        promptChanges.push({
          promptLabel: prompt.label || 'Unnamed',
          change: 'removed',
          oldText: prompt.text || '',
          runIndex: i,
        });
      }
    });

    // Find modified prompts
    currPrompts.forEach(prompt => {
      if (prompt && prompt.id) {
        const prevPrompt = prevMap.get(prompt.id);
        if (prevPrompt && prevPrompt.text !== prompt.text) {
          promptChanges.push({
            promptLabel: prompt.label || 'Unnamed',
            change: 'modified',
            oldText: prevPrompt.text || '',
            newText: prompt.text || '',
            runIndex: i,
          });
        }
      }
    });
  }

  // Detailed assertion changes
  const assertionChanges: any[] = [];
  for (let i = 1; i < runs.length; i++) {
    const prevAssertions = runs[i - 1].project?.assertions || [];
    const currAssertions = runs[i].project?.assertions || [];

    // Create maps for easier comparison - filter out assertions without ids
    const prevMap = new Map(prevAssertions.filter(a => a && a.id).map(a => [a.id, a]));
    const currMap = new Map(currAssertions.filter(a => a && a.id).map(a => [a.id, a]));

    // Helper to safely convert assertion value to string
    const getAssertionValueString = (assertion: any): string => {
      if (assertion.value !== undefined && assertion.value !== null) {
        return typeof assertion.value === 'object' ? JSON.stringify(assertion.value) : String(assertion.value);
      }
      if (assertion.threshold !== undefined && assertion.threshold !== null) {
        return assertion.threshold.toString();
      }
      return '';
    };

    // Find added assertions
    currAssertions.forEach(assertion => {
      if (assertion && assertion.id && !prevMap.has(assertion.id)) {
        assertionChanges.push({
          type: assertion.type || 'unknown',
          change: 'added',
          details: getAssertionValueString(assertion),
          runIndex: i,
        });
      }
    });

    // Find removed assertions
    prevAssertions.forEach(assertion => {
      if (assertion && assertion.id && !currMap.has(assertion.id)) {
        assertionChanges.push({
          type: assertion.type || 'unknown',
          change: 'removed',
          details: getAssertionValueString(assertion),
          runIndex: i,
        });
      }
    });

    // Find modified assertions
    currAssertions.forEach(assertion => {
      if (assertion && assertion.id) {
        const prevAssertion = prevMap.get(assertion.id);
        if (prevAssertion) {
          const prevDetails = JSON.stringify({ value: prevAssertion.value, threshold: prevAssertion.threshold });
          const currDetails = JSON.stringify({ value: assertion.value, threshold: assertion.threshold });
          if (prevDetails !== currDetails) {
            assertionChanges.push({
              type: assertion.type || 'unknown',
              change: 'modified',
              details: `${getAssertionValueString(prevAssertion)} → ${getAssertionValueString(assertion)}`,
              runIndex: i,
            });
          }
        }
      }
    });
  }

  return {
    promptCount: createChange('Prompts', promptCounts),
    providerModel: createChange('Provider/Model', providerModels),
    datasetRows: createChange('Dataset Rows', datasetRowCounts),
    assertionCount: createChange('Assertions', assertionCounts),
    promptChanges: promptChanges.length > 0 ? promptChanges : undefined,
    assertionChanges: assertionChanges.length > 0 ? assertionChanges : undefined,
  };
}

/**
 * Generate comparison summary statistics
 */
function generateSummary(tests: TestComparison[]): ComparisonSummary {
  const totalTests = tests.length;
  const consistentTests = tests.filter((t) => t.status === 'stable').length;
  const improvedTests = tests.filter((t) => t.status === 'improved').length;
  const regressedTests = tests.filter((t) => t.status === 'regressed').length;
  const changedTests = tests.filter((t) => t.status === 'changed').length;
  const volatileTests = tests.filter((t) => t.status === 'volatile').length;

  // Find most improved and most regressed
  let mostImprovedTest: TestComparison | undefined;
  let mostRegressedTest: TestComparison | undefined;

  if (tests.length > 0) {
    const sortedByDelta = [...tests].sort((a, b) => b.scoreDelta - a.scoreDelta);
    const topTest = sortedByDelta[0];
    const bottomTest = sortedByDelta[sortedByDelta.length - 1];

    mostImprovedTest = topTest && topTest.scoreDelta > 0 ? topTest : undefined;
    mostRegressedTest = bottomTest && bottomTest.scoreDelta < -0.1 ? bottomTest : undefined;
  }

  return {
    totalTests,
    consistentTests,
    consistencyPercentage: totalTests > 0 ? (consistentTests / totalTests) * 100 : 0,
    improvedTests,
    regressedTests,
    changedTests,
    volatileTests,
    mostImprovedTest,
    mostRegressedTest,
  };
}

/**
 * Main function to compare runs
 * @param runs Array of 2-3 history items to compare (should be pre-sorted chronologically)
 */
export function compareRuns(runs: HistoryItem[]): ComparisonData {
  if (runs.length < 2 || runs.length > 3) {
    throw new Error('Can only compare 2-3 runs');
  }

  // Validate all runs are from the same project
  const projectNames = runs.map((r) => r.projectName);
  if (!projectNames.every((name) => name === projectNames[0])) {
    throw new Error('All runs must be from the same project');
  }

  // Sort runs chronologically (oldest first)
  const sortedRuns = [...runs].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const metrics = compareMetrics(sortedRuns);
  const tests = extractTestComparisons(sortedRuns);
  const config = compareConfigs(sortedRuns);
  const summary = generateSummary(tests);

  return {
    runs: sortedRuns,
    projectName: sortedRuns[0].projectName,
    metrics,
    tests,
    config,
    summary,
  };
}

/**
 * Filter tests based on criteria
 */
export function filterTests(
  tests: TestComparison[],
  filterType: 'all' | 'regressions' | 'improvements' | 'changes' | 'consistent-failures' | 'volatile',
  searchQuery: string = ''
): TestComparison[] {
  let filtered = tests;

  // Apply status filter
  switch (filterType) {
    case 'regressions':
      filtered = tests.filter((t) => t.status === 'regressed');
      break;
    case 'improvements':
      filtered = tests.filter((t) => t.status === 'improved');
      break;
    case 'changes':
      filtered = tests.filter((t) => t.status !== 'stable');
      break;
    case 'consistent-failures':
      filtered = tests.filter((t) => t.results.every((r) => !r.pass));
      break;
    case 'volatile':
      filtered = tests.filter((t) => t.status === 'volatile');
      break;
    case 'all':
    default:
      break;
  }

  // Apply search filter
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (t) =>
        t.promptLabel.toLowerCase().includes(query) ||
        (t.description && t.description.toLowerCase().includes(query)) ||
        (t.varDescription && t.varDescription.toLowerCase().includes(query)) ||
        (t.variables && JSON.stringify(t.variables).toLowerCase().includes(query))
    );
  }

  return filtered;
}
