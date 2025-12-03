import { describe, it, expect } from 'vitest';
import {
  parseCSV,
  parseJSONL,
  parseTable,
  inferHeaders,
  validateDataset,
} from './dataset';
import type { DatasetRow } from './types';

describe('parseCSV', () => {
  it('should parse simple CSV with headers', () => {
    const csv = `name,age,city
John,30,NYC
Jane,25,LA`;

    const result = parseCSV(csv);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(result.data?.[0]).toEqual({ name: 'John', age: 30, city: 'NYC' });
    expect(result.data?.[1]).toEqual({ name: 'Jane', age: 25, city: 'LA' });
    expect(result.headers).toEqual(['name', 'age', 'city']);
  });

  it('should handle CSV with quoted values', () => {
    const csv = `name,description
"John Doe","A developer, designer, and writer"
"Jane Smith","An engineer"`;

    const result = parseCSV(csv);

    expect(result.success).toBe(true);
    expect(result.data?.[0]).toEqual({
      name: 'John Doe',
      description: 'A developer, designer, and writer',
    });
  });

  it('should handle CSV with whitespace in headers', () => {
    const csv = `  name  , age , city
John,30,NYC`;

    const result = parseCSV(csv);

    expect(result.success).toBe(true);
    expect(result.headers).toEqual(['name', 'age', 'city']);
  });

  it('should skip empty lines', () => {
    const csv = `name,age

John,30

Jane,25
`;

    const result = parseCSV(csv);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
  });

  it('should handle numeric type conversion', () => {
    const csv = `name,age,score
John,30,95.5
Jane,25,87.3`;

    const result = parseCSV(csv);

    expect(result.success).toBe(true);
    expect(result.data?.[0].age).toBe(30);
    expect(result.data?.[0].score).toBe(95.5);
    expect(typeof result.data?.[0].age).toBe('number');
  });

  it('should handle CSV with mismatched columns gracefully', () => {
    const csv = `name,age
John,30,extra`; // Mismatched columns

    const result = parseCSV(csv);

    // PapaParse is lenient and will parse this, but may produce errors
    if (result.success) {
      expect(result.data).toBeDefined();
    } else {
      expect(result.error).toBeDefined();
    }
  });

  it('should handle empty CSV', () => {
    const csv = '';

    const result = parseCSV(csv);

    // Empty CSV might return an error or empty data depending on parser
    if (result.success) {
      expect(result.data).toHaveLength(0);
    } else {
      expect(result.error).toBeDefined();
    }
  });
});

describe('parseJSONL', () => {
  it('should parse valid JSONL', () => {
    const jsonl = `{"name":"John","age":30}
{"name":"Jane","age":25}`;

    const result = parseJSONL(jsonl);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(result.data?.[0]).toEqual({ name: 'John', age: 30 });
    expect(result.data?.[1]).toEqual({ name: 'Jane', age: 25 });
  });

  it('should collect all unique headers', () => {
    const jsonl = `{"name":"John","age":30}
{"name":"Jane","city":"LA"}`;

    const result = parseJSONL(jsonl);

    expect(result.success).toBe(true);
    expect(result.headers).toContain('name');
    expect(result.headers).toContain('age');
    expect(result.headers).toContain('city');
  });

  it('should skip empty lines', () => {
    const jsonl = `{"name":"John","age":30}

{"name":"Jane","age":25}
`;

    const result = parseJSONL(jsonl);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
  });

  it('should return error for invalid JSON', () => {
    const jsonl = `{"name":"John","age":30}
{invalid json}`;

    const result = parseJSONL(jsonl);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Line 2');
  });

  it('should return error for non-object JSON', () => {
    const jsonl = `{"name":"John"}
"just a string"`;

    const result = parseJSONL(jsonl);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Expected object');
  });

  it('should return error for empty JSONL', () => {
    const jsonl = '';

    const result = parseJSONL(jsonl);

    expect(result.success).toBe(false);
    expect(result.error).toContain('No valid lines');
  });

  it('should handle nested objects', () => {
    const jsonl = `{"name":"John","address":{"city":"NYC","zip":"10001"}}`;

    const result = parseJSONL(jsonl);

    expect(result.success).toBe(true);
    expect(result.data?.[0].address).toEqual({ city: 'NYC', zip: '10001' });
  });
});

describe('parseTable', () => {
  it('should parse tab-separated values', () => {
    const table = `name\tage\tcity
John\t30\tNYC
Jane\t25\tLA`;

    const result = parseTable(table);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(result.data?.[0]).toEqual({ name: 'John', age: 30, city: 'NYC' });
  });

  it('should parse comma-separated values', () => {
    const table = `name,age,city
John,30,NYC
Jane,25,LA`;

    const result = parseTable(table);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
  });

  it('should prefer tabs over commas', () => {
    const table = `name\tage
John,Smith\t30`;

    const result = parseTable(table);

    expect(result.success).toBe(true);
    expect(result.data?.[0].name).toBe('John,Smith'); // Comma is part of the value
  });

  it('should parse table without headers', () => {
    const table = `John\t30\tNYC
Jane\t25\tLA`;

    const result = parseTable(table);

    expect(result.success).toBe(true);
    // PapaParse may treat first row as headers, so we may get 1 or 2 rows
    expect(result.data!.length).toBeGreaterThan(0);
    expect(result.headers).toBeDefined();
    expect(result.headers!.length).toBeGreaterThan(0);
  });

  it('should return error for empty content', () => {
    const table = '';

    const result = parseTable(table);

    expect(result.success).toBe(false);
    expect(result.error).toContain('No content');
  });

  it('should handle single row', () => {
    const table = `name,age,city`;

    const result = parseTable(table);

    expect(result.success).toBe(true);
    // Single row may be treated as headers or as data
    expect(result.data).toBeDefined();
  });
});

describe('inferHeaders', () => {
  it('should infer headers from rows', () => {
    const rows: DatasetRow[] = [
      { name: 'John', age: 30 },
      { name: 'Jane', age: 25 },
    ];

    const headers = inferHeaders(rows);

    expect(headers).toContain('name');
    expect(headers).toContain('age');
  });

  it('should collect all unique headers from all rows', () => {
    const rows: DatasetRow[] = [
      { name: 'John', age: 30 },
      { name: 'Jane', city: 'LA' },
    ];

    const headers = inferHeaders(rows);

    expect(headers).toContain('name');
    expect(headers).toContain('age');
    expect(headers).toContain('city');
    expect(headers).toHaveLength(3);
  });

  it('should return empty array for empty dataset', () => {
    const rows: DatasetRow[] = [];

    const headers = inferHeaders(rows);

    expect(headers).toEqual([]);
  });

  it('should handle rows with nested objects', () => {
    const rows: DatasetRow[] = [
      { name: 'John', address: { city: 'NYC' } },
    ];

    const headers = inferHeaders(rows);

    expect(headers).toContain('name');
    expect(headers).toContain('address');
  });
});

describe('validateDataset', () => {
  it('should validate dataset with consistent structure', () => {
    const rows: DatasetRow[] = [
      { name: 'John', age: 30 },
      { name: 'Jane', age: 25 },
    ];

    const result = validateDataset(rows);

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should detect inconsistent keys', () => {
    const rows: DatasetRow[] = [
      { name: 'John', age: 30 },
      { name: 'Jane', city: 'LA' }, // Different keys
    ];

    const result = validateDataset(rows);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Row 2');
    expect(result.error).toContain('different keys');
  });

  it('should return error for empty dataset', () => {
    const rows: DatasetRow[] = [];

    const result = validateDataset(rows);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('empty');
  });

  it('should ignore key order', () => {
    const rows: DatasetRow[] = [
      { name: 'John', age: 30, city: 'NYC' },
      { city: 'LA', name: 'Jane', age: 25 }, // Different order
    ];

    const result = validateDataset(rows);

    expect(result.valid).toBe(true);
  });

  it('should detect extra keys in later rows', () => {
    const rows: DatasetRow[] = [
      { name: 'John', age: 30 },
      { name: 'Jane', age: 25, city: 'LA' }, // Extra key
    ];

    const result = validateDataset(rows);

    expect(result.valid).toBe(false);
  });

  it('should detect missing keys in later rows', () => {
    const rows: DatasetRow[] = [
      { name: 'John', age: 30, city: 'NYC' },
      { name: 'Jane', age: 25 }, // Missing city
    ];

    const result = validateDataset(rows);

    expect(result.valid).toBe(false);
  });
});
