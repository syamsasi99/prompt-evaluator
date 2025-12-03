import { describe, it, expect } from 'vitest';
import { ValidationService } from './ValidationService';
import type { Provider, Prompt, Dataset, Assertion, ProjectOptions } from '../lib/types';

describe('ValidationService', () => {
  describe('validateProjectName', () => {
    it('should validate correct project name', () => {
      const result = ValidationService.validateProjectName('My Test Project');

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject empty project name', () => {
      const result = ValidationService.validateProjectName('');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject whitespace-only project name', () => {
      const result = ValidationService.validateProjectName('   ');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should accept project name with numbers', () => {
      const result = ValidationService.validateProjectName('Project 123');

      expect(result.valid).toBe(true);
    });

    it('should accept project name with special characters', () => {
      const result = ValidationService.validateProjectName('Test-Project_v1.0');

      expect(result.valid).toBe(true);
    });
  });

  describe('validateProviders', () => {
    it('should validate correct providers', () => {
      const providers: Provider[] = [
        { id: '1', providerId: 'openai:gpt-4', config: {} },
        { id: '2', providerId: 'anthropic:claude-3', config: {} },
      ];

      const result = ValidationService.validateProviders(providers);

      expect(result.valid).toBe(true);
    });

    it('should reject empty providers array', () => {
      const result = ValidationService.validateProviders([]);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least one provider');
    });

    it('should reject provider without providerId', () => {
      const providers: Provider[] = [
        { id: '1', providerId: '', config: {} },
      ];

      const result = ValidationService.validateProviders(providers);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('invalid or missing provider IDs');
    });

    it('should reject provider without colon in providerId', () => {
      const providers: Provider[] = [
        { id: '1', providerId: 'invalid-provider-id', config: {} },
      ];

      const result = ValidationService.validateProviders(providers);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('invalid or missing provider IDs');
    });

    it('should accept multiple valid providers', () => {
      const providers: Provider[] = [
        { id: '1', providerId: 'openai:gpt-4', config: {} },
        { id: '2', providerId: 'google:gemini-pro', config: {} },
        { id: '3', providerId: 'anthropic:claude-3', config: {} },
      ];

      const result = ValidationService.validateProviders(providers);

      expect(result.valid).toBe(true);
    });
  });

  describe('validatePrompts', () => {
    it('should validate correct prompts', () => {
      const prompts: Prompt[] = [
        { id: '1', label: 'Prompt 1', text: 'Hello {{name}}' },
      ];

      const result = ValidationService.validatePrompts(prompts);

      expect(result.valid).toBe(true);
    });

    it('should reject empty prompts array', () => {
      const result = ValidationService.validatePrompts([]);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least one prompt');
    });

    it('should accept multiple prompts', () => {
      const prompts: Prompt[] = [
        { id: '1', label: 'Prompt 1', text: 'Hello {{name}}' },
        { id: '2', label: 'Prompt 2', text: 'Goodbye {{name}}' },
      ];

      const result = ValidationService.validatePrompts(prompts);

      expect(result.valid).toBe(true);
    });
  });

  describe('validateDataset', () => {
    it('should validate when no variables in prompts', () => {
      const prompts: Prompt[] = [
        { id: '1', label: 'Prompt 1', text: 'Static prompt' },
      ];
      const dataset: Dataset = {
        name: 'Test Dataset',
        headers: ['name'],
        rows: [{ name: 'Alice' }],
      };
      const assertions: Assertion[] = [
        { id: '1', type: 'contains', value: 'test' },
      ];

      const result = ValidationService.validateDataset(prompts, dataset, assertions);

      expect(result.valid).toBe(true);
    });

    it('should validate when variables match dataset columns', () => {
      const prompts: Prompt[] = [
        { id: '1', label: 'Prompt 1', text: 'Hello {{name}}' },
      ];
      const dataset: Dataset = {
        name: 'Test Dataset',
        headers: ['name'],
        rows: [{ name: 'Alice' }],
      };
      const assertions: Assertion[] = [
        { id: '1', type: 'contains', value: 'test' },
      ];

      const result = ValidationService.validateDataset(prompts, dataset, assertions);

      expect(result.valid).toBe(true);
    });

    it('should reject when variables missing from dataset', () => {
      const prompts: Prompt[] = [
        { id: '1', label: 'Prompt 1', text: 'Hello {{name}} {{age}}' },
      ];
      const dataset: Dataset = {
        name: 'Test Dataset',
        headers: ['name'],
        rows: [{ name: 'Alice' }],
      };
      const assertions: Assertion[] = [
        { id: '1', type: 'contains', value: 'test' },
      ];

      const result = ValidationService.validateDataset(prompts, dataset, assertions);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('missing required variables');
      expect(result.error).toContain('age');
    });

    it('should reject when dataset is empty but variables exist', () => {
      const prompts: Prompt[] = [
        { id: '1', label: 'Prompt 1', text: 'Hello {{name}}' },
      ];
      const dataset: Dataset | undefined = undefined;
      const assertions: Assertion[] = [
        { id: '1', type: 'contains', value: 'test' },
      ];

      const result = ValidationService.validateDataset(prompts, dataset, assertions);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Please add at least one row to your dataset');
    });

    it('should reject when dataset is empty even with no assertions', () => {
      const prompts: Prompt[] = [
        { id: '1', label: 'Prompt 1', text: 'Hello {{name}}' },
      ];
      const dataset: Dataset | undefined = undefined;
      const assertions: Assertion[] = [];

      const result = ValidationService.validateDataset(prompts, dataset, assertions);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Please add at least one row to your dataset');
    });
  });

  describe('validateAssertions', () => {
    it('should validate when assertions exist', () => {
      const assertions: Assertion[] = [
        { id: '1', type: 'contains', value: 'test' },
      ];
      const dataset: Dataset = {
        name: 'Test Dataset',
        headers: ['input'],
        rows: [{ input: 'test' }],
      };

      const result = ValidationService.validateAssertions(assertions, dataset);

      expect(result.valid).toBe(true);
    });

    it('should reject when no assertions and no security tests', () => {
      const assertions: Assertion[] = [];
      const dataset: Dataset = {
        name: 'Test Dataset',
        headers: ['input'],
        rows: [{ input: 'test' }],
      };

      const result = ValidationService.validateAssertions(assertions, dataset);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least one assertion');
    });

    it('should validate when no assertions but security tests enabled', () => {
      const assertions: Assertion[] = [];
      const dataset: Dataset = {
        name: 'Test Dataset',
        headers: ['input'],
        rows: [{ input: 'test' }],
      };

      const result = ValidationService.validateAssertions(assertions, dataset, {
        enableSecurityTests: true,
      });

      expect(result.valid).toBe(true);
    });

    it('should reject when assertion requires expected_output but column missing', () => {
      const assertions: Assertion[] = [
        { id: '1', type: 'factuality', value: '{{expected_output}}' },
      ];
      const dataset: Dataset = {
        name: 'Test Dataset',
        headers: ['input'],
        rows: [{ input: 'test' }],
      };

      const result = ValidationService.validateAssertions(assertions, dataset);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('expected_output');
    });

    it('should validate when expected column exists', () => {
      const assertions: Assertion[] = [
        { id: '1', type: 'factuality', value: '{{expected_output}}' },
      ];
      const dataset: Dataset = {
        name: 'Test Dataset',
        headers: ['input', 'expected_output'],
        rows: [{ input: 'test', expected_output: 'result' }],
      };

      const result = ValidationService.validateAssertions(assertions, dataset);

      expect(result.valid).toBe(true);
    });

    it('should accept expected column with different naming', () => {
      const assertions: Assertion[] = [
        { id: '1', type: 'factuality', value: '{{expected_output}}' },
      ];
      const dataset: Dataset = {
        name: 'Test Dataset',
        headers: ['input', 'Expected'],
        rows: [{ input: 'test', Expected: 'result' }],
      };

      const result = ValidationService.validateAssertions(assertions, dataset);

      expect(result.valid).toBe(true);
    });
  });

  describe('validateBigQueryConfig', () => {
    it('should validate when BigQuery disabled', () => {
      const options: ProjectOptions & { bigQueryEnabled?: boolean } = {
        outputPath: 'output.html',
        jsonOutputPath: 'output.json',
        bigQueryEnabled: false,
      };

      const result = ValidationService.validateBigQueryConfig(options);

      expect(result.valid).toBe(true);
    });

    it('should validate when BigQuery enabled with complete config', () => {
      const options: ProjectOptions & {
        bigQueryEnabled?: boolean;
        bigQueryProjectId?: string;
        bigQueryDatasetId?: string;
        bigQueryTableId?: string;
      } = {
        outputPath: 'output.html',
        jsonOutputPath: 'output.json',
        bigQueryEnabled: true,
        bigQueryProjectId: 'my-project',
        bigQueryDatasetId: 'my-dataset',
        bigQueryTableId: 'my-table',
      };

      const result = ValidationService.validateBigQueryConfig(options);

      expect(result.valid).toBe(true);
    });

    it('should reject when BigQuery enabled but projectId missing', () => {
      const options: ProjectOptions & {
        bigQueryEnabled?: boolean;
        bigQueryDatasetId?: string;
        bigQueryTableId?: string;
      } = {
        outputPath: 'output.html',
        jsonOutputPath: 'output.json',
        bigQueryEnabled: true,
        bigQueryDatasetId: 'my-dataset',
        bigQueryTableId: 'my-table',
      };

      const result = ValidationService.validateBigQueryConfig(options);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('BigQuery');
    });

    it('should reject when BigQuery enabled but datasetId missing', () => {
      const options: ProjectOptions & {
        bigQueryEnabled?: boolean;
        bigQueryProjectId?: string;
        bigQueryTableId?: string;
      } = {
        outputPath: 'output.html',
        jsonOutputPath: 'output.json',
        bigQueryEnabled: true,
        bigQueryProjectId: 'my-project',
        bigQueryTableId: 'my-table',
      };

      const result = ValidationService.validateBigQueryConfig(options);

      expect(result.valid).toBe(false);
    });

    it('should reject when BigQuery enabled but tableId missing', () => {
      const options: ProjectOptions & {
        bigQueryEnabled?: boolean;
        bigQueryProjectId?: string;
        bigQueryDatasetId?: string;
      } = {
        outputPath: 'output.html',
        jsonOutputPath: 'output.json',
        bigQueryEnabled: true,
        bigQueryProjectId: 'my-project',
        bigQueryDatasetId: 'my-dataset',
      };

      const result = ValidationService.validateBigQueryConfig(options);

      expect(result.valid).toBe(false);
    });

    it('should trim whitespace and validate', () => {
      const options: ProjectOptions & {
        bigQueryEnabled?: boolean;
        bigQueryProjectId?: string;
        bigQueryDatasetId?: string;
        bigQueryTableId?: string;
      } = {
        outputPath: 'output.html',
        jsonOutputPath: 'output.json',
        bigQueryEnabled: true,
        bigQueryProjectId: '  ',
        bigQueryDatasetId: 'my-dataset',
        bigQueryTableId: 'my-table',
      };

      const result = ValidationService.validateBigQueryConfig(options);

      expect(result.valid).toBe(false);
    });
  });

  describe('validateProject', () => {
    const validProviders: Provider[] = [
      { id: '1', providerId: 'openai:gpt-4', config: {} },
    ];
    const validPrompts: Prompt[] = [
      { id: '1', label: 'Prompt 1', text: 'Hello {{name}}' },
    ];
    const validDataset: Dataset = {
      name: 'Test Dataset',
      headers: ['name'],
      rows: [{ name: 'Alice' }],
    };
    const validAssertions: Assertion[] = [
      { id: '1', type: 'contains', value: 'test' },
    ];
    const validOptions: ProjectOptions = {
      outputPath: 'output.html',
      jsonOutputPath: 'output.json',
    };

    it('should validate complete valid project', () => {
      const result = ValidationService.validateProject(
        'Test Project',
        validProviders,
        validPrompts,
        validDataset,
        validAssertions,
        validOptions
      );

      expect(result.valid).toBe(true);
    });

    it('should reject invalid project name', () => {
      const result = ValidationService.validateProject(
        '',
        validProviders,
        validPrompts,
        validDataset,
        validAssertions,
        validOptions
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject invalid providers', () => {
      const result = ValidationService.validateProject(
        'Test Project',
        [],
        validPrompts,
        validDataset,
        validAssertions,
        validOptions
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('provider');
    });

    it('should reject invalid prompts', () => {
      const result = ValidationService.validateProject(
        'Test Project',
        validProviders,
        [],
        validDataset,
        validAssertions,
        validOptions
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('prompt');
    });

    it('should reject invalid dataset', () => {
      const result = ValidationService.validateProject(
        'Test Project',
        validProviders,
        validPrompts,
        undefined,
        validAssertions,
        validOptions
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('dataset');
    });

    it('should reject invalid assertions', () => {
      const result = ValidationService.validateProject(
        'Test Project',
        validProviders,
        validPrompts,
        validDataset,
        [],
        validOptions
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('assertion');
    });

    it('should reject invalid BigQuery config', () => {
      const invalidBQOptions = {
        ...validOptions,
        bigQueryEnabled: true,
      };

      const result = ValidationService.validateProject(
        'Test Project',
        validProviders,
        validPrompts,
        validDataset,
        validAssertions,
        invalidBQOptions
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('BigQuery');
    });

    it('should return first validation error encountered', () => {
      const result = ValidationService.validateProject(
        '',
        [],
        [],
        undefined,
        [],
        validOptions
      );

      // Should fail on project name first
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
