import Papa from 'papaparse';
import type { DatasetRow } from './types';

export interface ParseResult {
  success: boolean;
  data?: DatasetRow[];
  error?: string;
  headers?: string[];
}

// Parse CSV content
export function parseCSV(content: string): ParseResult {
  try {
    const result = Papa.parse<Record<string, string>>(content, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      transformHeader: (header) => header.trim(),
    });

    if (result.errors.length > 0) {
      return {
        success: false,
        error: result.errors.map((e) => e.message).join(', '),
      };
    }

    const headers = result.meta.fields || [];
    const data = result.data.map((row) => ({ ...row }));

    return {
      success: true,
      data,
      headers,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to parse CSV',
    };
  }
}

// Parse JSONL content (one JSON object per line)
export function parseJSONL(content: string): ParseResult {
  try {
    const lines = content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      return {
        success: false,
        error: 'No valid lines found in JSONL file',
      };
    }

    const data: DatasetRow[] = [];
    const headersSet = new Set<string>();

    for (let i = 0; i < lines.length; i++) {
      try {
        const parsed = JSON.parse(lines[i]);
        if (typeof parsed !== 'object' || parsed === null) {
          return {
            success: false,
            error: `Line ${i + 1}: Expected object, got ${typeof parsed}`,
          };
        }
        data.push(parsed);
        Object.keys(parsed).forEach((key) => headersSet.add(key));
      } catch (e: any) {
        return {
          success: false,
          error: `Line ${i + 1}: ${e.message}`,
        };
      }
    }

    return {
      success: true,
      data,
      headers: Array.from(headersSet),
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to parse JSONL',
    };
  }
}

// Parse table from pasted text (tab or comma separated)
export function parseTable(content: string): ParseResult {
  // Try to detect separator
  const lines = content.split('\n').filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return {
      success: false,
      error: 'No content to parse',
    };
  }

  // Count tabs vs commas in first line to determine separator
  const firstLine = lines[0];
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;

  const separator = tabCount > commaCount ? '\t' : ',';

  // Parse with header detection
  try {
    const withHeader = Papa.parse<Record<string, string>>(content, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      transformHeader: (header) => header.trim(),
    });

    // If we got data rows, use header mode
    if (withHeader.data && withHeader.data.length > 0) {
      const headers = withHeader.meta.fields || [];
      return {
        success: true,
        data: withHeader.data,
        headers,
      };
    }

    // Otherwise, parse without headers and generate column names
    const withoutHeader = Papa.parse<string[]>(content, {
      header: false,
      skipEmptyLines: true,
      dynamicTyping: true,
    });

    if (!withoutHeader.data || withoutHeader.data.length === 0) {
      return {
        success: false,
        error: 'No data found',
      };
    }

    // Generate column names (col1, col2, etc.)
    const numColumns = withoutHeader.data[0].length;
    const headers = Array.from({ length: numColumns }, (_, i) => `col${i + 1}`);

    // Convert arrays to objects
    const data: DatasetRow[] = withoutHeader.data.map((row) => {
      const obj: DatasetRow = {};
      headers.forEach((header, i) => {
        obj[header] = row[i];
      });
      return obj;
    });

    return {
      success: true,
      data,
      headers,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to parse table',
    };
  }
}

// Read file content from File object
export async function readFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (e) => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

// Infer headers from dataset rows
export function inferHeaders(rows: DatasetRow[]): string[] {
  if (rows.length === 0) return [];

  const headersSet = new Set<string>();
  rows.forEach((row) => {
    Object.keys(row).forEach((key) => headersSet.add(key));
  });

  return Array.from(headersSet);
}

// Validate dataset rows have consistent structure
export function validateDataset(rows: DatasetRow[]): { valid: boolean; error?: string } {
  if (rows.length === 0) {
    return { valid: false, error: 'Dataset is empty' };
  }

  const firstRowKeys = Object.keys(rows[0]).sort();

  for (let i = 1; i < rows.length; i++) {
    const currentKeys = Object.keys(rows[i]).sort();
    if (JSON.stringify(currentKeys) !== JSON.stringify(firstRowKeys)) {
      return {
        valid: false,
        error: `Row ${i + 1} has different keys than the first row`,
      };
    }
  }

  return { valid: true };
}
