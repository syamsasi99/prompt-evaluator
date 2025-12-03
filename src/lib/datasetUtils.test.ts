import { describe, it, expect } from 'vitest';
import {
  extractVariables,
  extractAllVariables,
  validateDatasetVariables,
  validateDatasetHasColumn,
  validateDatasetHasExpectedColumn,
  getDatasetHeaders,
  calculateTotalTests,
} from './datasetUtils';

describe('DatasetUtils', () => {
  describe('extractVariables', () => {
    it('should extract variables from text with {{variable}} syntax', () => {
      const text = 'Hello {{name}}, your score is {{score}}';
      const variables = extractVariables(text);

      expect(variables).toEqual(['name', 'score']);
    });

    it('should return empty array for text with no variables', () => {
      const text = 'Hello world, no variables here';
      const variables = extractVariables(text);

      expect(variables).toEqual([]);
    });

    it('should handle duplicate variables', () => {
      const text = 'Hello {{name}}, {{name}} is {{age}} years old';
      const variables = extractVariables(text);

      // Should only return unique variables
      expect(variables).toEqual(['name', 'age']);
    });

    it('should handle empty string', () => {
      const variables = extractVariables('');
      expect(variables).toEqual([]);
    });

    it('should extract variables with underscores', () => {
      const text = 'User {{user_name}} has email {{email_address}}';
      const variables = extractVariables(text);

      expect(variables).toEqual(['user_name', 'email_address']);
    });

    it('should extract variables with numbers', () => {
      const text = 'Item {{item1}} and {{item2}}';
      const variables = extractVariables(text);

      expect(variables).toEqual(['item1', 'item2']);
    });

    it('should not extract malformed variables', () => {
      const text = 'Missing closing {{name or opening name}}';
      const variables = extractVariables(text);

      expect(variables).toEqual([]);
    });
  });

  describe('extractAllVariables', () => {
    it('should extract variables from multiple prompts', () => {
      const prompts = [
        { text: 'Hello {{name}}' },
        { text: 'Score: {{score}}' },
        { text: 'Age: {{age}}' },
      ];

      const variables = extractAllVariables(prompts);

      expect(variables).toEqual(new Set(['name', 'score', 'age']));
    });

    it('should handle duplicate variables across prompts', () => {
      const prompts = [
        { text: 'Hello {{name}}' },
        { text: 'Hi {{name}}, your {{score}} is good' },
      ];

      const variables = extractAllVariables(prompts);

      expect(variables).toEqual(new Set(['name', 'score']));
    });

    it('should return empty set for prompts with no variables', () => {
      const prompts = [
        { text: 'No variables' },
        { text: 'Still no variables' },
      ];

      const variables = extractAllVariables(prompts);

      expect(variables.size).toBe(0);
    });

    it('should handle empty prompts array', () => {
      const variables = extractAllVariables([]);

      expect(variables.size).toBe(0);
    });
  });

  describe('validateDatasetVariables', () => {
    it('should return valid when all variables are present', () => {
      const prompts = [
        { text: 'Hello {{name}}' },
        { text: 'Score: {{score}}' },
      ];
      const datasetRows = [
        { name: 'Alice', score: 100 },
        { name: 'Bob', score: 90 },
      ];

      const result = validateDatasetVariables(prompts, datasetRows);

      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it('should return invalid when variables are missing', () => {
      const prompts = [
        { text: 'Hello {{name}} {{age}}' },
      ];
      const datasetRows = [
        { name: 'Alice' }, // missing age
      ];

      const result = validateDatasetVariables(prompts, datasetRows);

      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(['age']);
    });

    it('should return valid when prompts have no variables', () => {
      const prompts = [
        { text: 'Static prompt' },
      ];
      const datasetRows = [
        { name: 'Alice' },
      ];

      const result = validateDatasetVariables(prompts, datasetRows);

      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it('should return invalid when dataset is empty and variables exist', () => {
      const prompts = [
        { text: 'Hello {{name}}' },
      ];
      const datasetRows: any[] = [];

      const result = validateDatasetVariables(prompts, datasetRows);

      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(['name']);
    });

    it('should return valid for empty prompts', () => {
      const prompts: any[] = [];
      const datasetRows = [
        { name: 'Alice' },
      ];

      const result = validateDatasetVariables(prompts, datasetRows);

      expect(result.valid).toBe(true);
    });
  });

  describe('validateDatasetHasColumn', () => {
    const datasetRows = [
      { name: 'Alice', Email: 'alice@test.com', user_id: '123' },
    ];

    it('should find exact match column', () => {
      const result = validateDatasetHasColumn(datasetRows, 'name');

      expect(result.valid).toBe(true);
      expect(result.foundColumn).toBe('name');
    });

    it('should return invalid for missing column', () => {
      const result = validateDatasetHasColumn(datasetRows, 'age');

      expect(result.valid).toBe(false);
      expect(result.foundColumn).toBeUndefined();
    });

    it('should find case-insensitive match when option enabled', () => {
      const result = validateDatasetHasColumn(datasetRows, 'email', { caseInsensitive: true });

      expect(result.valid).toBe(true);
      expect(result.foundColumn).toBe('Email');
    });

    it('should not find case-insensitive match when option disabled', () => {
      const result = validateDatasetHasColumn(datasetRows, 'email', { caseInsensitive: false });

      expect(result.valid).toBe(false);
    });

    it('should find partial match when option enabled', () => {
      const result = validateDatasetHasColumn(datasetRows, 'user', { partial: true });

      expect(result.valid).toBe(true);
      expect(result.foundColumn).toBe('user_id');
    });

    it('should find partial match case-insensitive', () => {
      const result = validateDatasetHasColumn(datasetRows, 'EMAIL', {
        caseInsensitive: true,
        partial: true,
      });

      expect(result.valid).toBe(true);
      expect(result.foundColumn).toBe('Email');
    });

    it('should return invalid for empty dataset', () => {
      const result = validateDatasetHasColumn([], 'name');

      expect(result.valid).toBe(false);
    });
  });

  describe('validateDatasetHasExpectedColumn', () => {
    it('should find column starting with "expected"', () => {
      const datasetRows = [
        { input: 'test', expected_output: 'result' },
      ];

      const result = validateDatasetHasExpectedColumn(datasetRows);

      expect(result.valid).toBe(true);
      expect(result.foundColumn).toBe('expected_output');
    });

    it('should find "Expected" with capital E', () => {
      const datasetRows = [
        { input: 'test', Expected: 'result' },
      ];

      const result = validateDatasetHasExpectedColumn(datasetRows);

      expect(result.valid).toBe(true);
      expect(result.foundColumn).toBe('Expected');
    });

    it('should return invalid when no expected column exists', () => {
      const datasetRows = [
        { input: 'test', output: 'result' },
      ];

      const result = validateDatasetHasExpectedColumn(datasetRows);

      expect(result.valid).toBe(false);
      expect(result.foundColumn).toBeUndefined();
    });

    it('should return invalid for empty dataset', () => {
      const result = validateDatasetHasExpectedColumn([]);

      expect(result.valid).toBe(false);
    });
  });

  describe('getDatasetHeaders', () => {
    it('should return headers from dataset rows', () => {
      const datasetRows = [
        { name: 'Alice', age: 30, email: 'alice@test.com' },
      ];

      const headers = getDatasetHeaders(datasetRows);

      expect(headers).toEqual(['name', 'age', 'email']);
    });

    it('should return empty array for empty dataset', () => {
      const headers = getDatasetHeaders([]);

      expect(headers).toEqual([]);
    });

    it('should return empty array for undefined dataset', () => {
      const headers = getDatasetHeaders(undefined);

      expect(headers).toEqual([]);
    });

    it('should get headers from first row only', () => {
      const datasetRows = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25, extra: 'field' },
      ];

      const headers = getDatasetHeaders(datasetRows);

      // Should only include headers from first row
      expect(headers).toEqual(['name', 'age']);
    });
  });

  describe('calculateTotalTests', () => {
    it('should calculate total tests correctly', () => {
      const total = calculateTotalTests(5, 3, 2);

      expect(total).toBe(30); // 5 rows * 3 providers * 2 prompts
    });

    it('should return 0 when dataset is empty', () => {
      const total = calculateTotalTests(0, 3, 2);

      expect(total).toBe(0);
    });

    it('should return 0 when providers is 0', () => {
      const total = calculateTotalTests(5, 0, 2);

      expect(total).toBe(0);
    });

    it('should return 0 when prompts is 0', () => {
      const total = calculateTotalTests(5, 3, 0);

      expect(total).toBe(0);
    });

    it('should calculate for single row, provider, and prompt', () => {
      const total = calculateTotalTests(1, 1, 1);

      expect(total).toBe(1);
    });

    it('should calculate for large numbers', () => {
      const total = calculateTotalTests(100, 5, 10);

      expect(total).toBe(5000);
    });
  });
});
