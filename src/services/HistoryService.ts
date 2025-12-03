import type { HistoryItem, PromptfooResults, Provider, Prompt, Dataset, Assertion, ProjectOptions } from '../lib/types';

export interface HistoryStats {
  totalTests: number;
  passed: number;
  failed: number;
  avgScore: number;
  totalCost: number;
  totalLatency: number;
}

export class HistoryService {
  /**
   * Calculates statistics from evaluation results
   */
  static calculateStats(results: PromptfooResults): HistoryStats {
    const testResults = (results as any)?.results?.results || [];
    let totalTests = 0;
    let passed = 0;
    let totalScore = 0;
    let totalLatency = 0;
    let totalCost = 0;

    testResults.forEach((testResult: any) => {
      totalTests++;
      if (testResult.success || testResult.gradingResult?.pass) {
        passed++;
      }
      totalScore += testResult.score || 0;
      totalLatency += testResult.latencyMs || 0;
      totalCost += testResult.cost || 0;
    });

    return {
      totalTests,
      passed,
      failed: totalTests - passed,
      avgScore: totalTests > 0 ? totalScore / totalTests : 0,
      totalCost,
      totalLatency,
    };
  }

  /**
   * Creates a history item from evaluation results
   */
  static createHistoryItem(
    projectName: string,
    results: PromptfooResults,
    project: {
      name: string;
      providers: Provider[];
      prompts: Prompt[];
      dataset: Dataset | undefined;
      assertions: Assertion[];
      options: ProjectOptions;
    }
  ): HistoryItem {
    const stats = this.calculateStats(results);

    return {
      id: `eval-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      projectName,
      timestamp: new Date().toISOString(),
      results,
      project,
      stats,
    };
  }

  /**
   * Saves evaluation results to history
   */
  static async saveToHistory(historyItem: HistoryItem): Promise<{ success: boolean; error?: string }> {
    if (!window.api?.saveToHistory) {
      return {
        success: false,
        error: 'History API not available',
      };
    }

    try {
      const result = await window.api.saveToHistory(historyItem);
      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to save to history',
      };
    }
  }

  /**
   * Gets all history items
   */
  static async getAllHistory(): Promise<{ success: boolean; history?: HistoryItem[]; error?: string }> {
    if (!window.api?.getAllHistory) {
      return {
        success: false,
        error: 'History API not available',
      };
    }

    try {
      const result = await window.api.getAllHistory();
      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to load history',
      };
    }
  }

  /**
   * Gets a specific history item by ID
   */
  static async getHistoryById(id: string): Promise<{ success: boolean; historyItem?: HistoryItem; error?: string }> {
    if (!window.api?.getHistoryById) {
      return {
        success: false,
        error: 'History API not available',
      };
    }

    try {
      const result = await window.api.getHistoryById(id);
      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to load history item',
      };
    }
  }

  /**
   * Deletes a history item by ID
   */
  static async deleteHistoryById(id: string): Promise<{ success: boolean; error?: string }> {
    if (!window.api?.deleteHistoryById) {
      return {
        success: false,
        error: 'History API not available',
      };
    }

    try {
      const result = await window.api.deleteHistoryById(id);
      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to delete history item',
      };
    }
  }

  /**
   * Clears all history
   */
  static async clearAllHistory(): Promise<{ success: boolean; error?: string }> {
    if (!window.api?.clearAllHistory) {
      return {
        success: false,
        error: 'History API not available',
      };
    }

    try {
      const result = await window.api.clearAllHistory();
      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to clear history',
      };
    }
  }

  /**
   * Saves evaluation results to history with automatic stats calculation
   */
  static async saveEvaluationResults(
    projectName: string,
    results: PromptfooResults,
    project: {
      name: string;
      providers: Provider[];
      prompts: Prompt[];
      dataset: Dataset | undefined;
      assertions: Assertion[];
      options: ProjectOptions;
    }
  ): Promise<{ success: boolean; historyItem?: HistoryItem; error?: string }> {
    const historyItem = this.createHistoryItem(projectName, results, project);
    const saveResult = await this.saveToHistory(historyItem);

    if (saveResult.success) {
      return {
        success: true,
        historyItem,
      };
    }

    return saveResult;
  }
}
