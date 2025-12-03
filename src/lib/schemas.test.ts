import { describe, it, expect } from 'vitest';
import {
  PromptLabelSchema,
  PromptTextSchema,
  PromptSchema,
  ProviderSchema,
  AssertionSchema,
  HtmlOutputPathSchema,
  JsonOutputPathSchema,
  ProjectNameSchema,
  ProjectSchema,
  DatasetSchema,
} from './schemas';

describe('PromptLabelSchema', () => {
  it('should validate valid labels', () => {
    expect(PromptLabelSchema.parse('Valid Label')).toBe('Valid Label');
    expect(PromptLabelSchema.parse('Label-123')).toBe('Label-123');
  });

  it('should reject empty labels', () => {
    expect(() => PromptLabelSchema.parse('')).toThrow('Label is required');
  });

  it('should reject whitespace-only labels', () => {
    expect(() => PromptLabelSchema.parse('   ')).toThrow('cannot be only whitespace');
  });

  it('should reject labels over 100 characters', () => {
    const longLabel = 'a'.repeat(101);
    expect(() => PromptLabelSchema.parse(longLabel)).toThrow('less than 100 characters');
  });
});

describe('PromptTextSchema', () => {
  it('should validate valid prompt text', () => {
    expect(PromptTextSchema.parse('Hello {{name}}')).toBe('Hello {{name}}');
  });

  it('should reject empty text', () => {
    expect(() => PromptTextSchema.parse('')).toThrow('Prompt text is required');
  });

  it('should reject whitespace-only text', () => {
    expect(() => PromptTextSchema.parse('   ')).toThrow('cannot be only whitespace');
  });

  it('should reject text over 10000 characters', () => {
    const longText = 'a'.repeat(10001);
    expect(() => PromptTextSchema.parse(longText)).toThrow('less than 10000 characters');
  });
});

describe('PromptSchema', () => {
  it('should validate valid prompt', () => {
    const prompt = {
      id: '1',
      label: 'Test Prompt',
      text: 'Hello {{name}}',
    };

    expect(PromptSchema.parse(prompt)).toEqual(prompt);
  });

  it('should reject prompt without required fields', () => {
    expect(() => PromptSchema.parse({ id: '1' })).toThrow();
  });
});

describe('ProviderSchema', () => {
  it('should validate provider with config', () => {
    const provider = {
      id: '1',
      providerId: 'openai:gpt-4',
      config: { temperature: 0.7 },
    };

    expect(ProviderSchema.parse(provider)).toEqual(provider);
  });

  it('should validate provider without config', () => {
    const provider = {
      id: '1',
      providerId: 'openai:gpt-4',
    };

    expect(ProviderSchema.parse(provider)).toEqual(provider);
  });

  it('should reject empty providerId', () => {
    expect(() =>
      ProviderSchema.parse({ id: '1', providerId: '' })
    ).toThrow('Provider ID is required');
  });
});

describe('AssertionSchema', () => {
  it('should validate basic assertion', () => {
    const assertion = {
      id: '1',
      type: 'contains',
      value: 'hello',
    };

    expect(AssertionSchema.parse(assertion)).toEqual(assertion);
  });

  it('should validate assertion with threshold', () => {
    const assertion = {
      id: '1',
      type: 'similar',
      value: 'expected',
      threshold: 0.8,
    };

    expect(AssertionSchema.parse(assertion)).toEqual(assertion);
  });

  it('should reject threshold outside 0-1 range', () => {
    expect(() =>
      AssertionSchema.parse({
        id: '1',
        type: 'similar',
        threshold: 1.5,
      })
    ).toThrow();

    expect(() =>
      AssertionSchema.parse({
        id: '1',
        type: 'similar',
        threshold: -0.1,
      })
    ).toThrow();
  });

  it('should validate assertion with optional fields', () => {
    const assertion = {
      id: '1',
      type: 'llm-rubric',
      rubric: 'Check quality',
      threshold: 0.9,
      provider: 'openai:gpt-4',
      weight: 2,
      transform: 'output.trim()',
    };

    expect(AssertionSchema.parse(assertion)).toEqual(assertion);
  });
});

describe('HtmlOutputPathSchema', () => {
  it('should validate valid HTML paths', () => {
    expect(HtmlOutputPathSchema.parse('output.html')).toBe('output.html');
    expect(HtmlOutputPathSchema.parse('results.htm')).toBe('results.htm');
    expect(HtmlOutputPathSchema.parse('./output/results.html')).toBe('./output/results.html');
  });

  it('should reject paths without .html/.htm extension', () => {
    expect(() => HtmlOutputPathSchema.parse('output.txt')).toThrow('must end with .html or .htm');
    expect(() => HtmlOutputPathSchema.parse('output')).toThrow('must end with .html or .htm');
  });

  it('should reject path traversal attempts', () => {
    expect(() => HtmlOutputPathSchema.parse('../output.html')).toThrow('Path traversal is not allowed');
    expect(() => HtmlOutputPathSchema.parse('dir/../output.html')).toThrow('Path traversal is not allowed');
  });

  it('should reject paths with invalid characters', () => {
    expect(() => HtmlOutputPathSchema.parse('output*.html')).toThrow('can only contain');
    expect(() => HtmlOutputPathSchema.parse('output?.html')).toThrow('can only contain');
  });

  it('should reject empty filenames', () => {
    expect(() => HtmlOutputPathSchema.parse('.html')).toThrow('cannot be empty');
  });

  it('should reject consecutive slashes', () => {
    expect(() => HtmlOutputPathSchema.parse('dir//output.html')).toThrow('consecutive slashes');
  });

  it('should accept filenames with underscores, hyphens, and dots', () => {
    expect(HtmlOutputPathSchema.parse('test_output-v1.0.html')).toBe('test_output-v1.0.html');
  });
});

describe('JsonOutputPathSchema', () => {
  it('should validate valid JSON paths', () => {
    expect(JsonOutputPathSchema.parse('output.json')).toBe('output.json');
    expect(JsonOutputPathSchema.parse('./results/data.json')).toBe('./results/data.json');
  });

  it('should reject paths without .json extension', () => {
    expect(() => JsonOutputPathSchema.parse('output.txt')).toThrow('must end with .json');
    expect(() => JsonOutputPathSchema.parse('output.jsonl')).toThrow('must end with .json');
  });

  it('should reject path traversal attempts', () => {
    expect(() => JsonOutputPathSchema.parse('../output.json')).toThrow('Path traversal is not allowed');
  });

  it('should reject paths with invalid characters', () => {
    expect(() => JsonOutputPathSchema.parse('output!.json')).toThrow('can only contain');
  });

  it('should reject empty filenames', () => {
    expect(() => JsonOutputPathSchema.parse('.json')).toThrow('cannot be empty');
  });
});

describe('ProjectNameSchema', () => {
  it('should validate valid project names', () => {
    expect(ProjectNameSchema.parse('My Project')).toBe('My Project');
    expect(ProjectNameSchema.parse('Project-123')).toBe('Project-123');
    expect(ProjectNameSchema.parse('Project_v1.0')).toBe('Project_v1.0');
  });

  it('should reject empty names', () => {
    expect(() => ProjectNameSchema.parse('')).toThrow('Project name is required');
  });

  it('should reject whitespace-only names', () => {
    expect(() => ProjectNameSchema.parse('   ')).toThrow('cannot be only whitespace');
  });

  it('should reject names with invalid characters', () => {
    expect(() => ProjectNameSchema.parse('Project@123')).toThrow('can only contain');
    expect(() => ProjectNameSchema.parse('Project/Name')).toThrow('can only contain');
  });

  it('should reject names over 100 characters', () => {
    const longName = 'a'.repeat(101);
    expect(() => ProjectNameSchema.parse(longName)).toThrow('less than 100 characters');
  });
});

describe('DatasetSchema', () => {
  it('should validate valid dataset', () => {
    const dataset = {
      name: 'Test Dataset',
      rows: [
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25 },
      ],
    };

    expect(DatasetSchema.parse(dataset)).toEqual(dataset);
  });

  it('should reject dataset without name', () => {
    expect(() =>
      DatasetSchema.parse({
        rows: [{ name: 'John' }],
      })
    ).toThrow();
  });

  it('should accept empty rows', () => {
    const dataset = {
      name: 'Empty Dataset',
      rows: [],
    };

    expect(DatasetSchema.parse(dataset)).toEqual(dataset);
  });
});

describe('ProjectSchema', () => {
  it('should validate complete project', () => {
    const project = {
      name: 'Test Project',
      providers: [
        {
          id: '1',
          providerId: 'openai:gpt-4',
          config: { temperature: 0.7 },
        },
      ],
      prompts: [
        {
          id: '1',
          label: 'Prompt 1',
          text: 'Hello {{name}}',
        },
      ],
      dataset: {
        name: 'Dataset 1',
        rows: [{ name: 'John' }],
      },
      assertions: [
        {
          id: '1',
          type: 'contains',
          value: 'hello',
        },
      ],
      options: {
        outputPath: './output.html',
        maxConcurrency: 5,
      },
    };

    expect(ProjectSchema.parse(project)).toEqual(project);
  });

  it('should require at least one provider', () => {
    expect(() =>
      ProjectSchema.parse({
        name: 'Test',
        providers: [],
        prompts: [{ id: '1', label: 'Test', text: 'Test' }],
        assertions: [],
      })
    ).toThrow('At least one provider is required');
  });

  it('should require at least one prompt', () => {
    expect(() =>
      ProjectSchema.parse({
        name: 'Test',
        providers: [{ id: '1', providerId: 'openai:gpt-4' }],
        prompts: [],
        assertions: [],
      })
    ).toThrow('At least one prompt is required');
  });

  it('should validate project without optional fields', () => {
    const project = {
      name: 'Test Project',
      providers: [{ id: '1', providerId: 'openai:gpt-4' }],
      prompts: [{ id: '1', label: 'Test', text: 'Test' }],
      assertions: [],
    };

    expect(ProjectSchema.parse(project)).toEqual(project);
  });

  it('should validate sharing option as boolean', () => {
    const project = {
      name: 'Test',
      providers: [{ id: '1', providerId: 'openai:gpt-4' }],
      prompts: [{ id: '1', label: 'Test', text: 'Test' }],
      assertions: [],
      options: {
        sharing: true,
      },
    };

    expect(ProjectSchema.parse(project)).toEqual(project);
  });

  it('should validate sharing option as object', () => {
    const project = {
      name: 'Test',
      providers: [{ id: '1', providerId: 'openai:gpt-4' }],
      prompts: [{ id: '1', label: 'Test', text: 'Test' }],
      assertions: [],
      options: {
        sharing: {
          apiBaseUrl: 'https://api.example.com',
          appBaseUrl: 'https://app.example.com',
        },
      },
    };

    expect(ProjectSchema.parse(project)).toEqual(project);
  });
});
