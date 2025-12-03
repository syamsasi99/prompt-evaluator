import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HistoryService } from './HistoryService';
import type { PromptfooResults } from '../lib/types';

describe('HistoryService', () => {
  let mockResults: PromptfooResults;
  let mockSaveToHistory: ReturnType<typeof vi.fn>;
  let mockGetAllHistory: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockResults = {
      version: 1,
      results: {
        results: [
          { success: true, score: 1.0, latencyMs: 500, cost: 0.001 },
          { success: true, score: 0.9, latencyMs: 600, cost: 0.002 },
          { success: false, score: 0.5, latencyMs: 400, cost: 0.001 },
        ],
      },
    } as any;

    mockSaveToHistory = vi.fn().mockResolvedValue({ success: true });
    mockGetAllHistory = vi.fn().mockResolvedValue({ success: true, history: [] });

    (global.window as any) = {
      api: {
        saveToHistory: mockSaveToHistory,
        getAllHistory: mockGetAllHistory,
      },
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete (global.window as any).api;
  });

  describe('calculateStats', () => {
    it('should calculate stats correctly', () => {
      const stats = HistoryService.calculateStats(mockResults);

      expect(stats.totalTests).toBe(3);
      expect(stats.passed).toBe(2);
      expect(stats.failed).toBe(1);
      expect(stats.avgScore).toBeCloseTo(0.8, 1); // (1.0 + 0.9 + 0.5) / 3
      expect(stats.totalLatency).toBe(1500);
      expect(stats.totalCost).toBeCloseTo(0.004, 3);
    });

    it('should handle empty results', () => {
      const emptyResults = { version: 1, results: { results: [] } } as any;

      const stats = HistoryService.calculateStats(emptyResults);

      expect(stats.totalTests).toBe(0);
      expect(stats.passed).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.avgScore).toBe(0);
    });

    it('should count tests with gradingResult.pass', () => {
      const results = {
        version: 1,
        results: {
          results: [
            { gradingResult: { pass: true }, score: 1.0 },
            { gradingResult: { pass: false }, score: 0.5 },
          ],
        },
      } as any;

      const stats = HistoryService.calculateStats(results);

      expect(stats.passed).toBe(1);
      expect(stats.failed).toBe(1);
    });

    it('should handle missing latency and cost', () => {
      const results = {
        version: 1,
        results: {
          results: [
            { success: true, score: 1.0 },
          ],
        },
      } as any;

      const stats = HistoryService.calculateStats(results);

      expect(stats.totalLatency).toBe(0);
      expect(stats.totalCost).toBe(0);
    });
  });

  describe('createHistoryItem', () => {
    it('should create history item with correct structure', () => {
      const project = {
        name: 'Test Project',
        providers: [],
        prompts: [],
        dataset: undefined,
        assertions: [],
        options: { outputPath: 'test.html', jsonOutputPath: 'test.json' },
      };

      const item = HistoryService.createHistoryItem('Test Project', mockResults, project);

      expect(item.id).toBeDefined();
      expect(item.projectName).toBe('Test Project');
      expect(item.timestamp).toBeDefined();
      expect(item.results).toBe(mockResults);
      expect(item.project).toBe(project);
      expect(item.stats).toBeDefined();
    });

    it('should generate unique IDs', () => {
      const project = {
        name: 'Test',
        providers: [],
        prompts: [],
        dataset: undefined,
        assertions: [],
        options: { outputPath: 'test.html', jsonOutputPath: 'test.json' },
      };

      const item1 = HistoryService.createHistoryItem('Test', mockResults, project);
      const item2 = HistoryService.createHistoryItem('Test', mockResults, project);

      expect(item1.id).not.toBe(item2.id);
    });

    it('should include timestamp in ISO format', () => {
      const project = {
        name: 'Test',
        providers: [],
        prompts: [],
        dataset: undefined,
        assertions: [],
        options: { outputPath: 'test.html', jsonOutputPath: 'test.json' },
      };

      const item = HistoryService.createHistoryItem('Test', mockResults, project);

      expect(item.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('saveToHistory', () => {
    it('should save history item successfully', async () => {
      const historyItem = {
        id: 'test-1',
        projectName: 'Test',
        timestamp: new Date().toISOString(),
        results: mockResults,
        project: {} as any,
        stats: {
          totalTests: 3,
          passed: 2,
          failed: 1,
          avgScore: 0.8,
          totalCost: 0.004,
          totalLatency: 1500,
        },
      };

      const result = await HistoryService.saveToHistory(historyItem);

      expect(result.success).toBe(true);
      expect(mockSaveToHistory).toHaveBeenCalledWith(historyItem);
    });

    it('should handle API not available', async () => {
      delete (global.window as any).api;

      const historyItem = {
        id: 'test-1',
        projectName: 'Test',
        timestamp: new Date().toISOString(),
        results: mockResults,
        project: {} as any,
        stats: {} as any,
      };

      const result = await HistoryService.saveToHistory(historyItem);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not available');
    });

    it('should handle save error', async () => {
      mockSaveToHistory.mockRejectedValue(new Error('Save failed'));

      const historyItem = {
        id: 'test-1',
        projectName: 'Test',
        timestamp: new Date().toISOString(),
        results: mockResults,
        project: {} as any,
        stats: {} as any,
      };

      const result = await HistoryService.saveToHistory(historyItem);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Save failed');
    });
  });

  describe('getAllHistory', () => {
    it('should get all history successfully', async () => {
      const mockHistory = [
        { id: '1', projectName: 'Test 1' },
        { id: '2', projectName: 'Test 2' },
      ];
      mockGetAllHistory.mockResolvedValue({ success: true, history: mockHistory });

      const result = await HistoryService.getAllHistory();

      expect(result.success).toBe(true);
      expect(result.history).toEqual(mockHistory);
    });

    it('should handle API not available', async () => {
      delete (global.window as any).api;

      const result = await HistoryService.getAllHistory();

      expect(result.success).toBe(false);
      expect(result.error).toContain('not available');
    });

    it('should handle get error', async () => {
      mockGetAllHistory.mockRejectedValue(new Error('Load failed'));

      const result = await HistoryService.getAllHistory();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Load failed');
    });
  });
});
