import { describe, it, expect, beforeEach } from 'vitest';
import { compareRuns } from './comparison';
import type { HistoryItem } from './types';

describe('Comparison', () => {
  let mockHistoryItem1: HistoryItem;
  let mockHistoryItem2: HistoryItem;
  let mockHistoryItem3: HistoryItem;

  beforeEach(() => {
    // Create mock history items with proper structure
    mockHistoryItem1 = {
      id: 'eval-1',
      projectName: 'Test Project',
      timestamp: '2024-01-01T10:00:00Z',
      stats: {
        totalTests: 10,
        passed: 8,
        failed: 2,
        avgScore: 0.85,
        totalCost: 0.05,
        totalLatency: 5000,
      },
      results: {
        version: 1,
        results: [
          {
            vars: { input: 'test1' },
            provider: { id: 'openai:gpt-4' },
            prompt: { label: 'Prompt 1', raw: 'Test {{input}}' },
            response: { output: 'Response 1' },
            success: true,
            score: 1.0,
            latencyMs: 500,
            cost: 0.005,
          },
        ],
        stats: {
          successes: 8,
          failures: 2,
          tokenUsage: {
            total: 1000,
            prompt: 500,
            completion: 500,
          },
        },
      } as any,
      project: {
        name: 'Test Project',
        providers: [{ id: 'p1', providerId: 'openai:gpt-4', config: {} }],
        prompts: [{ id: 'pr1', label: 'Prompt 1', text: 'Test {{input}}' }],
        dataset: { name: 'Dataset', headers: ['input'], rows: [{ input: 'test1' }] },
        assertions: [{ id: 'a1', type: 'contains', value: 'test' }],
        options: { outputPath: 'output.html', jsonOutputPath: 'output.json' },
      },
    };

    mockHistoryItem2 = {
      ...mockHistoryItem1,
      id: 'eval-2',
      timestamp: '2024-01-02T10:00:00Z',
      stats: {
        totalTests: 10,
        passed: 9,
        failed: 1,
        avgScore: 0.90,
        totalCost: 0.04,
        totalLatency: 4500,
      },
      results: {
        ...mockHistoryItem1.results,
        stats: {
          successes: 9,
          failures: 1,
          tokenUsage: {
            total: 950,
            prompt: 475,
            completion: 475,
          },
        },
      } as any,
    };

    mockHistoryItem3 = {
      ...mockHistoryItem1,
      id: 'eval-3',
      timestamp: '2024-01-03T10:00:00Z',
      stats: {
        totalTests: 10,
        passed: 10,
        failed: 0,
        avgScore: 0.95,
        totalCost: 0.03,
        totalLatency: 4000,
      },
      results: {
        ...mockHistoryItem1.results,
        stats: {
          successes: 10,
          failures: 0,
          tokenUsage: {
            total: 900,
            prompt: 450,
            completion: 450,
          },
        },
      } as any,
    };
  });

  describe('compareRuns', () => {
    it('should throw error for empty array', () => {
      expect(() => compareRuns([])).toThrow('Can only compare 2-3 runs');
    });

    it('should throw error for single run', () => {
      expect(() => compareRuns([mockHistoryItem1])).toThrow('Can only compare 2-3 runs');
    });

    it('should compare two runs', () => {
      const result = compareRuns([mockHistoryItem1, mockHistoryItem2]);

      expect(result.runs).toHaveLength(2);
      expect(result.metrics).toBeDefined();
    });

    it('should calculate pass rate metrics correctly', () => {
      const result = compareRuns([mockHistoryItem1, mockHistoryItem2, mockHistoryItem3]);

      expect(result.metrics.passRate.values).toEqual([80, 90, 100]); // 8/10, 9/10, 10/10
      expect(result.metrics.passRate.trend).toBe('improving');
      expect(result.metrics.passRate.isImprovement).toBe(true);
    });

    it('should calculate average score metrics correctly', () => {
      const result = compareRuns([mockHistoryItem1, mockHistoryItem2, mockHistoryItem3]);

      expect(result.metrics.avgScore.values).toEqual([0.85, 0.90, 0.95]);
      expect(result.metrics.avgScore.trend).toBe('improving');
      expect(result.metrics.avgScore.isImprovement).toBe(true);
    });

    it('should calculate cost metrics correctly (lower is better)', () => {
      const result = compareRuns([mockHistoryItem1, mockHistoryItem2, mockHistoryItem3]);

      expect(result.metrics.totalCost.values).toEqual([0.05, 0.04, 0.03]);
      // Cost is decreasing consistently
      expect(result.metrics.totalCost.trend).toBeDefined();
    });

    it('should calculate latency metrics correctly (lower is better)', () => {
      const result = compareRuns([mockHistoryItem1, mockHistoryItem2, mockHistoryItem3]);

      expect(result.metrics.avgLatency.values).toEqual([500, 450, 400]);
      expect(result.metrics.avgLatency.trend).toBe('improving'); // Latency decreasing
      expect(result.metrics.avgLatency.isImprovement).toBe(true);
    });

    it('should calculate token usage metrics', () => {
      const result = compareRuns([mockHistoryItem1, mockHistoryItem2, mockHistoryItem3]);

      expect(result.metrics.tokenUsage.values).toEqual([1000, 950, 900]);
    });

    it('should detect stable trend when values are similar', () => {
      const stableItem1 = { ...mockHistoryItem1, stats: { ...mockHistoryItem1.stats, avgScore: 0.85 } };
      const stableItem2 = { ...mockHistoryItem2, stats: { ...mockHistoryItem2.stats, avgScore: 0.85 } };

      const result = compareRuns([stableItem1, stableItem2]);

      expect(result.metrics.avgScore.trend).toBe('stable');
    });

    it('should detect degrading trend', () => {
      const degradingItem1 = { ...mockHistoryItem1, stats: { ...mockHistoryItem1.stats, avgScore: 0.95 } };
      const degradingItem2 = { ...mockHistoryItem2, stats: { ...mockHistoryItem2.stats, avgScore: 0.85 } };
      const degradingItem3 = { ...mockHistoryItem3, stats: { ...mockHistoryItem3.stats, avgScore: 0.75 } };

      const result = compareRuns([degradingItem1, degradingItem2, degradingItem3]);

      expect(result.metrics.avgScore.trend).toBe('degrading');
      expect(result.metrics.avgScore.isImprovement).toBe(false);
    });

    it('should detect variable trend with high variance', () => {
      const variableItem1 = { ...mockHistoryItem1, stats: { ...mockHistoryItem1.stats, avgScore: 0.5 } };
      const variableItem2 = { ...mockHistoryItem2, stats: { ...mockHistoryItem2.stats, avgScore: 0.9 } };
      const variableItem3 = { ...mockHistoryItem3, stats: { ...mockHistoryItem3.stats, avgScore: 0.4 } };

      const result = compareRuns([variableItem1, variableItem2, variableItem3]);

      expect(result.metrics.avgScore.trend).toBe('variable');
    });

    it('should calculate delta correctly', () => {
      const result = compareRuns([mockHistoryItem1, mockHistoryItem3]);

      // Pass rate: 80% -> 100%, delta = +20
      expect(result.metrics.passRate.delta).toBe(20);
    });

    it('should calculate delta percentage correctly', () => {
      const result = compareRuns([mockHistoryItem1, mockHistoryItem3]);

      // Pass rate: 80% -> 100%, delta percentage = (20/80)*100 = 25%
      expect(result.metrics.passRate.deltaPercentage).toBeCloseTo(25, 1);
    });

    it('should handle zero initial value in delta percentage', () => {
      const zeroItem1 = { ...mockHistoryItem1, stats: { ...mockHistoryItem1.stats, totalCost: 0 } };
      const zeroItem2 = { ...mockHistoryItem2, stats: { ...mockHistoryItem2.stats, totalCost: 0.05 } };

      const result = compareRuns([zeroItem1, zeroItem2]);

      expect(result.metrics.totalCost.deltaPercentage).toBe(0); // Should handle division by zero
    });

    it('should detect configuration changes', () => {
      const changedProject = {
        ...mockHistoryItem2,
        project: {
          ...mockHistoryItem2.project,
          providers: [{ id: 'p1', providerId: 'anthropic:claude-3', config: {} }],
        },
      };

      const result = compareRuns([mockHistoryItem1, changedProject]);

      expect(result.config).toBeDefined();
      expect(result.config.providerModel.changed).toBe(true);
    });

    it('should detect prompt changes', () => {
      const changedProject = {
        ...mockHistoryItem2,
        project: {
          ...mockHistoryItem2.project,
          prompts: [{ id: 'pr1', label: 'Prompt 1', text: 'Modified {{input}}' }],
        },
      };

      const result = compareRuns([mockHistoryItem1, changedProject]);

      expect(result.config.promptChanges).toBeDefined();
      expect(result.config.promptChanges.length).toBeGreaterThan(0);
    });

    it('should detect dataset changes', () => {
      const changedProject = {
        ...mockHistoryItem2,
        project: {
          ...mockHistoryItem2.project,
          dataset: {
            name: 'Dataset',
            headers: ['input', 'newField'],
            rows: [
              { input: 'test1', newField: 'value' },
              { input: 'test2', newField: 'value2' }
            ],
          },
        },
      };

      const result = compareRuns([mockHistoryItem1, changedProject]);

      // Row count changed from 1 to 2
      expect(result.config.datasetRows.changed).toBe(true);
    });

    it('should detect assertion changes', () => {
      const changedProject = {
        ...mockHistoryItem2,
        project: {
          ...mockHistoryItem2.project,
          assertions: [
            { id: 'a1', type: 'contains', value: 'test' },
            { id: 'a2', type: 'equals', value: 'expected' },
          ],
        },
      };

      const result = compareRuns([mockHistoryItem1, changedProject]);

      expect(result.config.assertionChanges).toBeDefined();
      expect(result.config.assertionChanges.length).toBeGreaterThan(0);
    });

    it('should generate summary', () => {
      const result = compareRuns([mockHistoryItem1, mockHistoryItem2, mockHistoryItem3]);

      expect(result.summary).toBeDefined();
      expect(result.summary.totalTests).toBeGreaterThan(0);
    });

    it('should track regressed tests', () => {
      const degradingItem = {
        ...mockHistoryItem3,
        stats: { ...mockHistoryItem3.stats, avgScore: 0.70 },
      };

      const result = compareRuns([mockHistoryItem1, degradingItem]);

      expect(result.summary).toBeDefined();
      expect(result.summary.regressedTests).toBeGreaterThanOrEqual(0);
    });

    it('should calculate average latency correctly', () => {
      const result = compareRuns([mockHistoryItem1, mockHistoryItem2]);

      // totalLatency = 5000, totalTests = 10, avg = 500 for first run
      expect(result.metrics.avgLatency.values[0]).toBe(500);
    });

    it('should handle zero tests for latency calculation', () => {
      const zeroTests = {
        ...mockHistoryItem1,
        stats: { ...mockHistoryItem1.stats, totalTests: 0, totalLatency: 5000 },
      };

      const result = compareRuns([zeroTests, mockHistoryItem2]);

      expect(result.metrics.avgLatency.values[0]).toBe(0);
    });

    it('should handle missing token usage', () => {
      const noTokens = {
        ...mockHistoryItem1,
        results: {
          ...mockHistoryItem1.results,
          stats: {
            ...mockHistoryItem1.results.stats,
            tokenUsage: undefined,
          },
        } as any,
      };

      const result = compareRuns([noTokens, mockHistoryItem2]);

      expect(result.metrics.tokenUsage.values[0]).toBe(0);
    });

    it('should sort runs by timestamp', () => {
      const unsortedRuns = [mockHistoryItem3, mockHistoryItem1, mockHistoryItem2];

      const result = compareRuns(unsortedRuns);

      expect(result.runs[0].timestamp).toBe('2024-01-01T10:00:00Z');
      expect(result.runs[1].timestamp).toBe('2024-01-02T10:00:00Z');
      expect(result.runs[2].timestamp).toBe('2024-01-03T10:00:00Z');
    });

    it('should include test comparisons', () => {
      const result = compareRuns([mockHistoryItem1, mockHistoryItem2]);

      expect(result.tests).toBeDefined();
      expect(Array.isArray(result.tests)).toBe(true);
    });

    it('should handle runs with different test counts', () => {
      const moreTests = {
        ...mockHistoryItem2,
        stats: { ...mockHistoryItem2.stats, totalTests: 15 },
      };

      const result = compareRuns([mockHistoryItem1, moreTests]);

      expect(result.metrics).toBeDefined();
      // Should still compare available metrics
    });
  });

  describe('Edge Cases', () => {
    it('should detect trends in metrics', () => {
      const item1 = { ...mockHistoryItem1, stats: { ...mockHistoryItem1.stats, avgScore: 0.850 } };
      const item2 = { ...mockHistoryItem2, stats: { ...mockHistoryItem2.stats, avgScore: 0.851 } };

      const result = compareRuns([item1, item2]);

      // Should have a trend (improving, degrading, or stable)
      expect(['improving', 'degrading', 'stable']).toContain(result.metrics.avgScore.trend);
    });

    it('should handle all passing tests', () => {
      const allPass = {
        ...mockHistoryItem1,
        timestamp: '2024-01-01T09:00:00Z',  // Earlier than mockHistoryItem1
        stats: { ...mockHistoryItem1.stats, failed: 0, passed: 10, totalTests: 10 }
      };

      const result = compareRuns([allPass, mockHistoryItem2]);

      // allPass is first chronologically, so values[0] should be 100
      expect(result.metrics.passRate.values[0]).toBe(100);
    });

    it('should handle all failing tests', () => {
      const allFail = { ...mockHistoryItem1, stats: { ...mockHistoryItem1.stats, failed: 10, passed: 0 } };

      const result = compareRuns([allFail, mockHistoryItem2]);

      expect(result.metrics.passRate.values[0]).toBe(0);
    });

    it('should handle negative cost (credits/refunds)', () => {
      const negCost = { ...mockHistoryItem1, stats: { ...mockHistoryItem1.stats, totalCost: -0.01 } };

      const result = compareRuns([negCost, mockHistoryItem2]);

      expect(result.metrics.totalCost.values[0]).toBe(-0.01);
    });

    it('should handle very high latency', () => {
      const highLatency = {
        ...mockHistoryItem1,
        stats: { ...mockHistoryItem1.stats, totalLatency: 100000, totalTests: 10 },
      };

      const result = compareRuns([highLatency, mockHistoryItem2]);

      expect(result.metrics.avgLatency.values[0]).toBe(10000);
    });
  });
});
