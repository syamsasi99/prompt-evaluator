import type { HistoryItem, PromptfooResults } from './types';

export type TestStatus = 'stable' | 'improved' | 'regressed' | 'changed' | 'volatile';
export type TrendDirection = 'improving' | 'degrading' | 'stable' | 'variable';

export interface TestRunResult {
  pass: boolean;
  score: number;
  latencyMs: number;
  cost: number;
  output?: string;
  gradingResult?: any;
  provider?: string; // Provider ID for this test result
}

export interface TestComparison {
  testIndex: number;
  description?: string;
  promptLabel: string;
  varDescription?: string;
  variables?: Record<string, any>;
  results: TestRunResult[]; // One per run (2-3 items)
  status: TestStatus;
  scoreDelta: number; // Change from first to last run
  scoreVariance: number; // How much scores vary across runs
}

export interface MetricComparison {
  name: string;
  values: number[]; // One per run
  trend: TrendDirection;
  delta: number; // Change from first to last
  deltaPercentage: number;
  isImprovement: boolean; // Whether trend direction is positive for this metric
}

export interface MetricsComparison {
  passRate: MetricComparison;
  avgScore: MetricComparison;
  totalCost: MetricComparison;
  avgLatency: MetricComparison;
  tokenUsage: MetricComparison;
}

export interface DetailedChange {
  type: 'added' | 'removed' | 'modified';
  field: string;
  oldValue?: any;
  newValue?: any;
  runIndex: number; // Which run this change occurred in
}

export interface ConfigChange {
  field: string;
  values: (string | number)[]; // One per run
  changed: boolean;
  changeIndices: number[]; // Which runs have changes (0-based)
  detailedChanges?: DetailedChange[]; // Detailed info about what changed
}

export interface PromptChange {
  promptLabel: string;
  change: 'added' | 'removed' | 'modified';
  oldText?: string;
  newText?: string;
  runIndex: number;
}

export interface AssertionChange {
  type: string;
  change: 'added' | 'removed' | 'modified';
  details?: string;
  runIndex: number;
}

export interface ConfigComparison {
  promptCount: ConfigChange;
  providerModel: ConfigChange;
  datasetRows: ConfigChange;
  assertionCount: ConfigChange;
  temperature?: ConfigChange;
  promptChanges?: PromptChange[]; // Detailed prompt changes
  assertionChanges?: AssertionChange[]; // Detailed assertion changes
}

export interface ComparisonSummary {
  totalTests: number;
  consistentTests: number;
  consistencyPercentage: number;
  improvedTests: number;
  regressedTests: number;
  changedTests: number;
  volatileTests: number;
  mostImprovedTest?: TestComparison;
  mostRegressedTest?: TestComparison;
}

export interface ComparisonData {
  runs: HistoryItem[]; // 2-3 runs in chronological order
  projectName: string;
  metrics: MetricsComparison;
  tests: TestComparison[];
  config: ConfigComparison;
  summary: ComparisonSummary;
}

export interface ComparisonFilter {
  type: 'all' | 'regressions' | 'improvements' | 'changes' | 'consistent-failures' | 'volatile';
  searchQuery: string;
}
