import type { Provider, Prompt, Dataset, Assertion, ProjectOptions } from '../lib/types';
import { validateDatasetVariables, extractAllVariables } from '../lib/datasetUtils';
import { ProjectNameSchema } from '../lib/schemas';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
}

export class ValidationService {
  /**
   * Validates project name
   */
  static validateProjectName(projectName: string): ValidationResult {
    const result = ProjectNameSchema.safeParse(projectName);
    if (!result.success) {
      return {
        valid: false,
        error: result.error.errors[0].message,
      };
    }
    return { valid: true };
  }

  /**
   * Validates providers configuration
   */
  static validateProviders(providers: Provider[]): ValidationResult {
    if (providers.length === 0) {
      return {
        valid: false,
        error: 'Please add at least one provider',
      };
    }

    const invalidProviders = providers.filter(
      (p) => !p.providerId || !p.providerId.includes(':')
    );

    if (invalidProviders.length > 0) {
      return {
        valid: false,
        error: 'Some providers have invalid or missing provider IDs. Please check the Providers tab.',
      };
    }

    return { valid: true };
  }

  /**
   * Validates prompts configuration
   */
  static validatePrompts(prompts: Prompt[]): ValidationResult {
    if (prompts.length === 0) {
      return {
        valid: false,
        error: 'Please add at least one prompt',
      };
    }

    // Check if at least one prompt has variables
    const allVariables = extractAllVariables(prompts);
    if (allVariables.size === 0) {
      return {
        valid: false,
        error: 'Your prompts must contain at least one variable (e.g., {{variable_name}}). Please add variables to your prompt in the Prompts tab.',
      };
    }

    return { valid: true };
  }

  /**
   * Validates dataset against prompt variables
   */
  static validateDataset(
    prompts: Prompt[],
    dataset: Dataset | undefined,
    assertions: Assertion[]
  ): ValidationResult {
    const allVariables = extractAllVariables(prompts);

    // Always require at least one row in dataset
    if (!dataset || !dataset.rows || dataset.rows.length === 0) {
      return {
        valid: false,
        error: `Please add at least one row to your dataset. Your prompts use variables (${Array.from(allVariables).join(', ')}). Add data in the Dataset tab.`,
      };
    }

    // Validate that dataset has all required variables from prompts
    const validation = validateDatasetVariables(prompts, dataset.rows);
    if (!validation.valid) {
      return {
        valid: false,
        error: `Dataset is missing required variables: ${validation.missing.join(', ')}. Please add these columns to your dataset.`,
      };
    }

    return { valid: true };
  }

  /**
   * Validates assertions configuration
   */
  static validateAssertions(
    assertions: Assertion[],
    dataset: Dataset | undefined,
    options?: { enableSecurityTests?: boolean }
  ): ValidationResult {
    const hasSecurityTests = options?.enableSecurityTests;

    // Assertions are optional if security tests are enabled
    if ((!assertions || assertions.length === 0) && !hasSecurityTests) {
      return {
        valid: false,
        error: 'Please add at least one assertion to validate your test results. Go to the Assertions tab to add assertions, or enable Security Testing in Options.',
      };
    }

    // Check if any assertions require expected_output column
    const assertionsRequiringExpectedOutput = ['factuality', 'similar'];
    const hasAssertionRequiringExpectedOutput = assertions?.some(
      (a) =>
        assertionsRequiringExpectedOutput.includes(a.type) &&
        a.value &&
        typeof a.value === 'string' &&
        a.value.includes('{{expected_output}}')
    );

    if (hasAssertionRequiringExpectedOutput && dataset?.rows && dataset.rows.length > 0) {
      const datasetHeaders = Object.keys(dataset.rows[0]);
      const hasExpectedColumn = datasetHeaders.some((h) =>
        h.toLowerCase().startsWith('expected')
      );

      if (!hasExpectedColumn) {
        const assertionTypesNeedingIt = assertions
          ?.filter(
            (a) =>
              assertionsRequiringExpectedOutput.includes(a.type) &&
              a.value &&
              typeof a.value === 'string' &&
              a.value.includes('{{expected_output}}')
          )
          .map((a) => a.type)
          .join(', ') || 'assertions';

        return {
          valid: false,
          error: `Your assertions use {{expected_output}} but your dataset does not have an "expected_output" or "expected_*" column. Required for: ${assertionTypesNeedingIt}`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Validates BigQuery configuration
   */
  static validateBigQueryConfig(
    options: ProjectOptions & {
      bigQueryEnabled?: boolean;
      bigQueryProjectId?: string;
      bigQueryDatasetId?: string;
      bigQueryTableId?: string;
    }
  ): ValidationResult {
    const bigQueryEnabled = options.bigQueryEnabled === true;

    if (!bigQueryEnabled) {
      return { valid: true };
    }

    const bqProjectId = (options.bigQueryProjectId || '').trim();
    const bqDatasetId = (options.bigQueryDatasetId || '').trim();
    const bqTableId = (options.bigQueryTableId || '').trim();

    if (!bqProjectId || !bqDatasetId || !bqTableId) {
      return {
        valid: false,
        error: 'Store evaluation results in Google BigQuery is turned on but the table details are not configured. Please configure BigQuery settings in the Options tab or disable BigQuery integration.',
      };
    }

    return { valid: true };
  }

  /**
   * Validates entire project before running evaluation
   */
  static validateProject(
    projectName: string,
    providers: Provider[],
    prompts: Prompt[],
    dataset: Dataset | undefined,
    assertions: Assertion[],
    options: ProjectOptions & {
      enableSecurityTests?: boolean;
      bigQueryEnabled?: boolean;
      bigQueryProjectId?: string;
      bigQueryDatasetId?: string;
      bigQueryTableId?: string;
    }
  ): ValidationResult {
    // Validate project name
    const nameValidation = this.validateProjectName(projectName);
    if (!nameValidation.valid) {
      return nameValidation;
    }

    // Validate providers
    const providersValidation = this.validateProviders(providers);
    if (!providersValidation.valid) {
      return providersValidation;
    }

    // Validate prompts
    const promptsValidation = this.validatePrompts(prompts);
    if (!promptsValidation.valid) {
      return promptsValidation;
    }

    // Validate dataset
    const datasetValidation = this.validateDataset(prompts, dataset, assertions);
    if (!datasetValidation.valid) {
      return datasetValidation;
    }

    // Validate assertions
    const assertionsValidation = this.validateAssertions(assertions, dataset, options);
    if (!assertionsValidation.valid) {
      return assertionsValidation;
    }

    // Validate BigQuery configuration
    const bigQueryValidation = this.validateBigQueryConfig(options);
    if (!bigQueryValidation.valid) {
      return bigQueryValidation;
    }

    return { valid: true };
  }
}
