import type { Project, PromptfooResults } from '../lib/types';
import { buildPromptfooYaml, buildSecurityTestYaml } from '../lib/buildYaml';
import { extractAllVariables } from '../lib/datasetUtils';

export interface EvaluationOptions {
  runId: string;
  onLog?: (log: string, progress?: { current: number; total: number }) => void;
}

export interface EvaluationResult {
  success: boolean;
  results?: PromptfooResults;
  securityResults?: PromptfooResults;
  error?: string;
  logs?: string[];
  aborted?: boolean;
  htmlPath?: string;
}

export class EvaluationService {
  /**
   * Calculates total number of tests based on dataset, providers, and prompts
   */
  static calculateTotalTests(project: Project): number {
    const datasetRowCount = project.dataset?.rows.length || 0;
    const providersCount = project.providers.length;
    const promptsCount = project.prompts.length;
    return datasetRowCount * providersCount * promptsCount;
  }

  /**
   * Determines if security tests should be run
   */
  static shouldRunSecurityTests(project: Project): boolean {
    const allVariables = extractAllVariables(project.prompts);
    return !!(
      project.options?.enableSecurityTests &&
      project.prompts.length > 0 &&
      allVariables.size > 0
    );
  }

  /**
   * Determines if functional tests should be run
   */
  static shouldRunFunctionalTests(project: Project): boolean {
    return !!(project.assertions && project.assertions.length > 0);
  }

  /**
   * Builds YAML configuration for evaluation
   */
  static buildYamlConfig(project: Project): string {
    return buildPromptfooYaml(project);
  }

  /**
   * Builds YAML configuration for security tests
   */
  static buildSecurityYamlConfig(project: Project): string {
    return buildSecurityTestYaml(project);
  }

  /**
   * Runs functional evaluation
   */
  static async runFunctionalEvaluation(
    yamlContent: string,
    options: EvaluationOptions
  ): Promise<EvaluationResult> {
    if (!window.api?.runPromptfoo) {
      return {
        success: false,
        error: 'This feature requires running the app in Electron mode. Please use "npm run dev" to start the full app.',
      };
    }

    try {
      const result = await window.api.runPromptfoo(
        yamlContent,
        options.runId,
        (log, progressUpdate) => {
          if (options.onLog) {
            options.onLog(`[Functional] ${log}`, progressUpdate);
          }
        }
      );

      return {
        success: result.success,
        results: result.results,
        error: result.error,
        logs: result.logs,
        aborted: result.aborted,
        htmlPath: result.htmlPath,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to run functional evaluation',
      };
    }
  }

  /**
   * Runs security evaluation
   */
  static async runSecurityEvaluation(
    yamlContent: string,
    options: EvaluationOptions
  ): Promise<EvaluationResult> {
    if (!window.api?.runPromptfoo) {
      return {
        success: false,
        error: 'This feature requires running the app in Electron mode.',
      };
    }

    try {
      const securityRunId = `${options.runId}-security`;
      const result = await window.api.runPromptfoo(
        yamlContent,
        securityRunId,
        (log, progressUpdate) => {
          if (options.onLog) {
            options.onLog(`[Security] ${log}`, progressUpdate);
          }
        }
      );

      return {
        success: result.success,
        results: result.results,
        error: result.error,
        logs: result.logs,
        aborted: result.aborted,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to run security evaluation',
      };
    }
  }

  /**
   * Attempts to load results from JSON file
   */
  static async loadResultsFromFile(
    jsonOutputPath: string
  ): Promise<PromptfooResults | null> {
    console.log('🔧 [EvaluationService] loadResultsFromFile called with path:', jsonOutputPath);

    if (!window.api?.readJsonResults) {
      console.log('🔧 [EvaluationService] window.api.readJsonResults not available');
      return null;
    }

    try {
      const fileResult = await window.api.readJsonResults(jsonOutputPath);
      console.log('🔧 [EvaluationService] File read result:', {
        success: fileResult.success,
        hasResults: !!fileResult.results,
        error: fileResult.error,
      });
      if (fileResult.success && fileResult.results) {
        console.log('🔧 [EvaluationService] Successfully loaded results from file');
        return fileResult.results;
      }
    } catch (error) {
      console.error('🔧 [EvaluationService] Failed to load results from file:', error);
    }

    console.log('🔧 [EvaluationService] Returning null - no results loaded');
    return null;
  }

  /**
   * Attempts to load security results from JSON file
   */
  static async loadSecurityResultsFromFile(
    jsonOutputPath: string
  ): Promise<PromptfooResults | null> {
    const securityJsonPath = jsonOutputPath.replace(/\.json$/, '-security.json');
    return this.loadResultsFromFile(securityJsonPath);
  }

  /**
   * Aborts a running evaluation
   */
  static async abortEvaluation(runId: string): Promise<{ success: boolean; error?: string }> {
    if (!window.api?.abortPromptfoo) {
      return {
        success: false,
        error: 'Abort functionality not available',
      };
    }

    try {
      await window.api.abortPromptfoo(runId);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to abort evaluation',
      };
    }
  }

  /**
   * Opens HTML report in default browser
   */
  static async openHtmlReport(htmlPath: string): Promise<{ success: boolean; error?: string }> {
    if (!window.api?.openPath) {
      return {
        success: false,
        error: 'Open path functionality not available',
      };
    }

    try {
      const result = await window.api.openPath(htmlPath);
      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to open HTML report',
      };
    }
  }

  /**
   * Runs complete evaluation (functional + security if enabled)
   */
  static async runEvaluation(
    project: Project,
    options: EvaluationOptions
  ): Promise<{
    functionalResult?: EvaluationResult;
    securityResult?: EvaluationResult;
    success: boolean;
  }> {
    const shouldRunFunctional = this.shouldRunFunctionalTests(project);
    const shouldRunSecurity = this.shouldRunSecurityTests(project);

    let functionalResult: EvaluationResult | undefined;
    let securityResult: EvaluationResult | undefined;

    // Run functional tests
    if (shouldRunFunctional) {
      const yamlContent = this.buildYamlConfig(project);
      console.log('🔧 [EvaluationService] Running functional eval with project options:', project.options);
      functionalResult = await this.runFunctionalEvaluation(yamlContent, options);
      console.log('🔧 [EvaluationService] Functional eval result:', {
        hasResults: !!functionalResult.results,
        success: functionalResult.success,
        aborted: functionalResult.aborted,
      });

      // Try to load from file if no results in response
      if (
        !functionalResult.results &&
        !functionalResult.aborted &&
        project.options?.jsonOutputPath
      ) {
        console.log('🔧 [EvaluationService] Attempting to load results from file:', project.options.jsonOutputPath);
        const results = await this.loadResultsFromFile(project.options.jsonOutputPath);
        console.log('🔧 [EvaluationService] File load result:', !!results);
        if (results) {
          functionalResult.results = results;
        }
      } else {
        console.log('🔧 [EvaluationService] Not loading from file:', {
          hasResults: !!functionalResult.results,
          aborted: functionalResult.aborted,
          hasJsonOutputPath: !!project.options?.jsonOutputPath,
        });
      }
    }

    // Run security tests
    if (shouldRunSecurity) {
      if (options.onLog) {
        options.onLog('\n=== Starting Security Tests ===\n');
      }

      const securityYamlContent = this.buildSecurityYamlConfig(project);
      securityResult = await this.runSecurityEvaluation(securityYamlContent, options);

      // Try to load from file if no results in response
      if (
        !securityResult.results &&
        !securityResult.aborted &&
        project.options?.jsonOutputPath
      ) {
        const results = await this.loadSecurityResultsFromFile(
          project.options.jsonOutputPath
        );
        if (results) {
          securityResult.results = results;
        }
      }
    }

    const functionalSuccess = !shouldRunFunctional || (functionalResult?.success === true && !!functionalResult?.results);
    const securitySuccess = !shouldRunSecurity || (securityResult?.success === true && !!securityResult?.results);

    return {
      functionalResult,
      securityResult,
      success: functionalSuccess && securitySuccess,
    };
  }
}
