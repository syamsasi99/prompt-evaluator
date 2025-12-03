// Dataset utility functions for variable extraction and validation

/**
 * Extracts variables from prompt text using {{variable}} syntax
 */
export function extractVariables(text: string): string[] {
  const regex = /\{\{(\w+)\}\}/g;
  const variables = new Set<string>();
  let match;

  while ((match = regex.exec(text)) !== null) {
    variables.add(match[1]);
  }

  return Array.from(variables);
}

/**
 * Extracts all variables from an array of prompts
 */
export function extractAllVariables(prompts: Array<{ text: string }>): Set<string> {
  const allVariables = new Set<string>();

  prompts.forEach((prompt) => {
    extractVariables(prompt.text).forEach((v) => allVariables.add(v));
  });

  return allVariables;
}

/**
 * Validates that dataset has all required variables from prompts
 * @returns Object with validation status and missing variables
 */
export function validateDatasetVariables(
  prompts: Array<{ text: string }>,
  datasetRows: Array<Record<string, any>>
): { valid: boolean; missing: string[] } {
  const allVariables = extractAllVariables(prompts);

  if (allVariables.size === 0) {
    return { valid: true, missing: [] };
  }

  if (datasetRows.length === 0) {
    return { valid: false, missing: Array.from(allVariables) };
  }

  const datasetKeys = new Set(Object.keys(datasetRows[0]));
  const missing = Array.from(allVariables).filter((v) => !datasetKeys.has(v));

  return { valid: missing.length === 0, missing };
}

/**
 * Validates that dataset rows contain the required column
 */
export function validateDatasetHasColumn(
  datasetRows: Array<Record<string, any>>,
  columnName: string,
  options?: { caseInsensitive?: boolean; partial?: boolean }
): { valid: boolean; foundColumn?: string } {
  if (!datasetRows || datasetRows.length === 0) {
    return { valid: false };
  }

  const headers = Object.keys(datasetRows[0]);
  const caseInsensitive = options?.caseInsensitive ?? false;
  const partial = options?.partial ?? false;

  if (caseInsensitive || partial) {
    const lowerColumnName = columnName.toLowerCase();
    const foundHeader = headers.find(h => {
      const lowerHeader = h.toLowerCase();
      if (partial) {
        return lowerHeader.includes(lowerColumnName) || lowerColumnName.includes(lowerHeader);
      }
      return lowerHeader === lowerColumnName;
    });

    if (foundHeader) {
      return { valid: true, foundColumn: foundHeader };
    }
  } else {
    if (headers.includes(columnName)) {
      return { valid: true, foundColumn: columnName };
    }
  }

  return { valid: false };
}

/**
 * Validates that dataset has an "expected_*" column for assertions that require it
 */
export function validateDatasetHasExpectedColumn(
  datasetRows: Array<Record<string, any>>
): { valid: boolean; foundColumn?: string } {
  if (!datasetRows || datasetRows.length === 0) {
    return { valid: false };
  }

  const headers = Object.keys(datasetRows[0]);
  const expectedColumn = headers.find(h => h.toLowerCase().startsWith('expected'));

  if (expectedColumn) {
    return { valid: true, foundColumn: expectedColumn };
  }

  return { valid: false };
}

/**
 * Get dataset headers from rows, handling empty datasets
 */
export function getDatasetHeaders(datasetRows?: Array<Record<string, any>>): string[] {
  if (!datasetRows || datasetRows.length === 0) {
    return [];
  }
  return Object.keys(datasetRows[0]);
}

/**
 * Count total tests based on dataset, providers, and prompts
 */
export function calculateTotalTests(
  datasetRowCount: number,
  providersCount: number,
  promptsCount: number
): number {
  return datasetRowCount * providersCount * promptsCount;
}
