import type { HistoryItem } from './types';

export interface AggregateStats {
  totalEvaluations: number;
  totalTests: number;
  avgPassRate: number;
  totalCost: number;
  avgScore: number;
  avgLatency: number;
  passRateTrend: number; // Percentage change vs previous period
  costTrend: number; // Percentage change vs previous period
  totalTokens: number;
}

export interface FailingTest {
  promptLabel: string;
  variablesSummary: string;
  failureCount: number;
  totalRuns: number;
  failureRate: number;
  lastFailedAt: string;
}

export interface Regression {
  type: 'pass_rate' | 'cost' | 'latency';
  severity: 'high' | 'medium' | 'low';
  message: string;
  change: number;
  changePercentage: number;
}

export interface ProjectComparison {
  projectName: string;
  evaluationCount: number;
  avgPassRate: number;
  totalCost: number;
  lastRunAt: string;
  totalTests: number;
}

export interface TrendData {
  passRate: { timestamp: string; value: number }[];
  cost: { timestamp: string; value: number }[];
  tokens: { timestamp: string; value: number }[];
  latency: { timestamp: string; value: number }[];
}

/**
 * Calculate aggregate statistics from evaluation history
 */
export function calculateAggregateStats(history: HistoryItem[]): AggregateStats {
  if (history.length === 0) {
    return {
      totalEvaluations: 0,
      totalTests: 0,
      avgPassRate: 0,
      totalCost: 0,
      avgScore: 0,
      avgLatency: 0,
      passRateTrend: 0,
      costTrend: 0,
      totalTokens: 0,
    };
  }

  // Sort by timestamp (oldest to newest)
  const sorted = [...history].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Calculate overall stats
  const totalEvaluations = sorted.length;
  const totalTests = sorted.reduce((sum, item) => sum + item.stats.totalTests, 0);
  const totalPassed = sorted.reduce((sum, item) => sum + item.stats.passed, 0);
  const avgPassRate = totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;
  const totalCost = sorted.reduce((sum, item) => sum + item.stats.totalCost, 0);
  const avgScore = sorted.reduce((sum, item) => sum + item.stats.avgScore, 0) / totalEvaluations;
  const avgLatency =
    sorted.reduce((sum, item) => sum + item.stats.totalLatency, 0) / totalEvaluations;

  // Calculate token usage
  const totalTokens = sorted.reduce((sum, item) => {
    const tokenUsage =
      item.results?.results?.stats?.tokenUsage?.total ||
      item.results?.stats?.tokenUsage?.total ||
      0;
    return sum + tokenUsage;
  }, 0);

  // Calculate trends (compare first half vs second half)
  const midpoint = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, midpoint);
  const secondHalf = sorted.slice(midpoint);

  // Pass rate trend
  const firstHalfPassRate =
    firstHalf.reduce((sum, item) => {
      return sum + (item.stats.totalTests > 0 ? (item.stats.passed / item.stats.totalTests) * 100 : 0);
    }, 0) / (firstHalf.length || 1);

  const secondHalfPassRate =
    secondHalf.reduce((sum, item) => {
      return sum + (item.stats.totalTests > 0 ? (item.stats.passed / item.stats.totalTests) * 100 : 0);
    }, 0) / (secondHalf.length || 1);

  const passRateTrend =
    firstHalfPassRate !== 0
      ? ((secondHalfPassRate - firstHalfPassRate) / firstHalfPassRate) * 100
      : 0;

  // Cost trend
  const firstHalfCost =
    firstHalf.reduce((sum, item) => sum + item.stats.totalCost, 0) / (firstHalf.length || 1);
  const secondHalfCost =
    secondHalf.reduce((sum, item) => sum + item.stats.totalCost, 0) / (secondHalf.length || 1);
  const costTrend =
    firstHalfCost !== 0 ? ((secondHalfCost - firstHalfCost) / firstHalfCost) * 100 : 0;

  return {
    totalEvaluations,
    totalTests,
    avgPassRate,
    totalCost,
    avgScore: avgScore * 100, // Convert to percentage
    avgLatency,
    passRateTrend,
    costTrend,
    totalTokens,
  };
}

/**
 * Get recent evaluations sorted by timestamp
 */
export function getRecentEvaluations(history: HistoryItem[], limit: number = 10): HistoryItem[] {
  return [...history]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

/**
 * Get trend data for charts (filtered by days)
 */
export function getTrendData(history: HistoryItem[], days: number = 7): TrendData {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const filtered = history
    .filter((item) => new Date(item.timestamp) >= cutoffDate)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return {
    passRate: filtered.map((item) => ({
      timestamp: item.timestamp,
      value: item.stats.totalTests > 0 ? (item.stats.passed / item.stats.totalTests) * 100 : 0,
    })),
    cost: filtered.map((item) => ({
      timestamp: item.timestamp,
      value: item.stats.totalCost,
    })),
    tokens: filtered.map((item) => ({
      timestamp: item.timestamp,
      value:
        item.results?.results?.stats?.tokenUsage?.total ||
        item.results?.stats?.tokenUsage?.total ||
        0,
    })),
    latency: filtered.map((item) => ({
      timestamp: item.timestamp,
      value:
        item.stats.totalTests > 0 ? item.stats.totalLatency / item.stats.totalTests : 0,
    })),
  };
}

/**
 * Identify tests that fail frequently
 */
export function getTopFailingTests(history: HistoryItem[], limit: number = 5): FailingTest[] {
  const testMap = new Map<string, { failCount: number; totalCount: number; lastFailed: string }>();

  // Aggregate test results across all history
  history.forEach((item) => {
    const results = item.results?.results?.results || item.results?.results || [];

    results.forEach((result: any) => {
      const promptLabel = result.prompt?.label || result.prompt?.raw || 'Unknown';
      const vars = result.vars || {};
      const varsSummary = Object.keys(vars)
        .slice(0, 2)
        .map((k) => `${k}=${String(vars[k]).substring(0, 20)}`)
        .join(', ');
      const key = `${promptLabel}::${varsSummary}`;

      if (!testMap.has(key)) {
        testMap.set(key, { failCount: 0, totalCount: 0, lastFailed: '' });
      }

      const entry = testMap.get(key)!;
      entry.totalCount++;

      if (!result.success || result.score < 0.5) {
        entry.failCount++;
        entry.lastFailed = item.timestamp;
      }
    });
  });

  // Convert to array and sort by failure rate
  const failingTests: FailingTest[] = [];
  testMap.forEach((value, key) => {
    const [promptLabel, variablesSummary] = key.split('::');
    if (value.failCount > 0) {
      failingTests.push({
        promptLabel,
        variablesSummary,
        failureCount: value.failCount,
        totalRuns: value.totalCount,
        failureRate: (value.failCount / value.totalCount) * 100,
        lastFailedAt: value.lastFailed,
      });
    }
  });

  return failingTests
    .sort((a, b) => b.failureRate - a.failureRate || b.failureCount - a.failureCount)
    .slice(0, limit);
}

/**
 * Detect regressions by comparing recent runs to historical baseline
 */
export function detectRegressions(history: HistoryItem[]): Regression[] {
  if (history.length < 3) return [];

  const sorted = [...history].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const recent = sorted.slice(0, 2); // Last 2 runs
  const baseline = sorted.slice(2, Math.min(5, sorted.length)); // Previous 3 runs as baseline

  if (baseline.length === 0) return [];

  const regressions: Regression[] = [];

  // Pass rate regression
  const recentPassRate =
    recent.reduce((sum, item) => {
      return sum + (item.stats.totalTests > 0 ? (item.stats.passed / item.stats.totalTests) * 100 : 0);
    }, 0) / recent.length;

  const baselinePassRate =
    baseline.reduce((sum, item) => {
      return sum + (item.stats.totalTests > 0 ? (item.stats.passed / item.stats.totalTests) * 100 : 0);
    }, 0) / baseline.length;

  const passRateChange = recentPassRate - baselinePassRate;
  const passRateChangePercentage =
    baselinePassRate !== 0 ? (passRateChange / baselinePassRate) * 100 : 0;

  if (passRateChange < -10) {
    regressions.push({
      type: 'pass_rate',
      severity: passRateChange < -20 ? 'high' : 'medium',
      message: `Pass rate dropped by ${Math.abs(passRateChange).toFixed(1)}% in recent runs`,
      change: passRateChange,
      changePercentage: passRateChangePercentage,
    });
  }

  // Cost regression
  const recentCost = recent.reduce((sum, item) => sum + item.stats.totalCost, 0) / recent.length;
  const baselineCost = baseline.reduce((sum, item) => sum + item.stats.totalCost, 0) / baseline.length;
  const costChange = recentCost - baselineCost;
  const costChangePercentage = baselineCost !== 0 ? (costChange / baselineCost) * 100 : 0;

  if (costChangePercentage > 20) {
    regressions.push({
      type: 'cost',
      severity: costChangePercentage > 50 ? 'high' : costChangePercentage > 30 ? 'medium' : 'low',
      message: `Cost increased by ${costChangePercentage.toFixed(1)}% in recent runs`,
      change: costChange,
      changePercentage: costChangePercentage,
    });
  }

  // Latency regression
  const recentLatency =
    recent.reduce((sum, item) => {
      return sum + (item.stats.totalTests > 0 ? item.stats.totalLatency / item.stats.totalTests : 0);
    }, 0) / recent.length;

  const baselineLatency =
    baseline.reduce((sum, item) => {
      return sum + (item.stats.totalTests > 0 ? item.stats.totalLatency / item.stats.totalTests : 0);
    }, 0) / baseline.length;

  const latencyChange = recentLatency - baselineLatency;
  const latencyChangePercentage =
    baselineLatency !== 0 ? (latencyChange / baselineLatency) * 100 : 0;

  if (latencyChangePercentage > 50) {
    regressions.push({
      type: 'latency',
      severity: latencyChangePercentage > 100 ? 'high' : 'medium',
      message: `Latency increased by ${latencyChangePercentage.toFixed(1)}% in recent runs`,
      change: latencyChange,
      changePercentage: latencyChangePercentage,
    });
  }

  return regressions;
}

/**
 * Compare performance across different projects
 */
export function compareProjects(history: HistoryItem[]): ProjectComparison[] {
  const projectMap = new Map<
    string,
    {
      count: number;
      totalPassed: number;
      totalTests: number;
      totalCost: number;
      lastRun: string;
    }
  >();

  history.forEach((item) => {
    const projectName = item.projectName;
    if (!projectMap.has(projectName)) {
      projectMap.set(projectName, {
        count: 0,
        totalPassed: 0,
        totalTests: 0,
        totalCost: 0,
        lastRun: item.timestamp,
      });
    }

    const project = projectMap.get(projectName)!;
    project.count++;
    project.totalPassed += item.stats.passed;
    project.totalTests += item.stats.totalTests;
    project.totalCost += item.stats.totalCost;

    // Update last run if more recent
    if (new Date(item.timestamp) > new Date(project.lastRun)) {
      project.lastRun = item.timestamp;
    }
  });

  const comparisons: ProjectComparison[] = [];
  projectMap.forEach((data, projectName) => {
    comparisons.push({
      projectName,
      evaluationCount: data.count,
      avgPassRate: data.totalTests > 0 ? (data.totalPassed / data.totalTests) * 100 : 0,
      totalCost: data.totalCost,
      lastRunAt: data.lastRun,
      totalTests: data.totalTests,
    });
  });

  return comparisons.sort((a, b) => {
    return new Date(b.lastRunAt).getTime() - new Date(a.lastRunAt).getTime();
  });
}
