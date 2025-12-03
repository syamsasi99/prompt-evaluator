import { describe, it, expect } from 'vitest';
import { buildPromptfooYaml, buildSecurityTestYaml, extractVariables, validateDatasetVariables } from './buildYaml';
import type { Project, Assertion } from './types';

describe('buildPromptfooYaml', () => {
  it('should build basic YAML config with minimal project', () => {
    const project: Project = {
      name: 'Test Project',
      providers: [{ id: '1', providerId: 'openai:gpt-4' }],
      prompts: [{ id: '1', label: 'Prompt 1', text: 'Hello {{name}}' }],
      dataset: { name: 'test-dataset', rows: [] },
      assertions: [],
    };

    const yaml = buildPromptfooYaml(project);

    expect(yaml).toContain('description: Test Project');
    expect(yaml).toContain('providers:');
    expect(yaml).toContain('id: openai:gpt-4');
    expect(yaml).toContain('transform: |-');
    expect(yaml).toContain('prompts:');
    expect(yaml).toContain('label: Prompt 1');
    expect(yaml).toContain('raw: Hello {{name}}');
  });

  it('should include provider config when present', () => {
    const project: Project = {
      name: 'Test Project',
      providers: [
        {
          id: '1',
          providerId: 'openai:gpt-4',
          config: {
            temperature: 0.7,
            maxTokens: 100,
          },
        },
      ],
      prompts: [{ id: '1', label: 'Prompt 1', text: 'Test' }],
      dataset: { name: 'test-dataset', rows: [] },
      assertions: [],
    };

    const yaml = buildPromptfooYaml(project);

    expect(yaml).toContain('id: openai:gpt-4');
    expect(yaml).toContain('temperature: 0.7');
    expect(yaml).toContain('maxTokens: 100');
  });

  it('should exclude API keys when includeApiKeys is false', () => {
    const project: Project = {
      name: 'Test Project',
      providers: [
        {
          id: '1',
          providerId: 'openai:gpt-4',
          config: {
            apiKey: 'secret-key',
            temperature: 0.7,
          },
        },
      ],
      prompts: [{ id: '1', label: 'Prompt 1', text: 'Test' }],
      dataset: { name: 'test-dataset', rows: [] },
      assertions: [],
    };

    const yaml = buildPromptfooYaml(project, { includeApiKeys: false });

    expect(yaml).not.toContain('secret-key');
    expect(yaml).not.toContain('apiKey');
    expect(yaml).toContain('temperature: 0.7');
  });

  it('should include API keys by default', () => {
    const project: Project = {
      name: 'Test Project',
      providers: [
        {
          id: '1',
          providerId: 'openai:gpt-4',
          config: {
            apiKey: 'secret-key',
            temperature: 0.7,
          },
        },
      ],
      prompts: [{ id: '1', label: 'Prompt 1', text: 'Test' }],
      dataset: { name: 'test-dataset', rows: [] },
      assertions: [],
    };

    const yaml = buildPromptfooYaml(project);

    expect(yaml).toContain('apiKey: secret-key');
  });

  it('should use CSV path when available instead of inline data', () => {
    const project: Project = {
      name: 'Test Project',
      providers: [{ id: '1', providerId: 'openai:gpt-4' }],
      prompts: [{ id: '1', label: 'Prompt 1', text: 'Test' }],
      dataset: {
        name: 'test-dataset',
        rows: [{ name: 'John', age: 30 }],
        csvPath: '/path/to/data.csv',
      },
      assertions: [],
    };

    const yaml = buildPromptfooYaml(project);

    expect(yaml).toContain('tests: /path/to/data.csv');
    expect(yaml).not.toContain('name: John');
  });

  it('should use inline data when CSV path is not available', () => {
    const project: Project = {
      name: 'Test Project',
      providers: [{ id: '1', providerId: 'openai:gpt-4' }],
      prompts: [{ id: '1', label: 'Prompt 1', text: 'Test' }],
      dataset: {
        name: 'test-dataset',
        rows: [
          { name: 'John', age: 30 },
          { name: 'Jane', age: 25 },
        ],
      },
      assertions: [],
    };

    const yaml = buildPromptfooYaml(project);

    expect(yaml).toContain('tests:');
    expect(yaml).toContain('vars:');
    expect(yaml).toContain('name: John');
    expect(yaml).toContain('name: Jane');
  });

  it('should build assertions correctly', () => {
    const project: Project = {
      name: 'Test Project',
      providers: [{ id: '1', providerId: 'openai:gpt-4' }],
      prompts: [{ id: '1', label: 'Prompt 1', text: 'Test' }],
      dataset: { name: 'test-dataset', rows: [] },
      assertions: [
        {
          id: '1',
          type: 'contains',
          value: 'hello',
        },
        {
          id: '2',
          type: 'similar',
          value: 'expected output',
          threshold: 0.8,
        },
      ],
    };

    const yaml = buildPromptfooYaml(project);

    expect(yaml).toContain('defaultTest:');
    expect(yaml).toContain('assert:');
    expect(yaml).toContain('type: contains');
    expect(yaml).toContain('value: hello');
    expect(yaml).toContain('type: similar');
    expect(yaml).toContain('threshold: 0.8');
  });

  it('should map security assertions to llm-rubric', () => {
    const project: Project = {
      name: 'Test Project',
      providers: [{ id: '1', providerId: 'openai:gpt-4' }],
      prompts: [{ id: '1', label: 'Prompt 1', text: 'Test' }],
      dataset: { name: 'test-dataset', rows: [] },
      assertions: [
        {
          id: '1',
          type: 'security-prompt-injection',
          rubric: 'Check for prompt injection attempts',
          threshold: 0.9,
        },
      ],
    };

    const yaml = buildPromptfooYaml(project);

    expect(yaml).toContain('type: llm-rubric');
    expect(yaml).toContain('value: Check for prompt injection attempts');
    expect(yaml).toContain('threshold: 0.9');
  });

  it('should include assertion weight and transform when present', () => {
    const project: Project = {
      name: 'Test Project',
      providers: [{ id: '1', providerId: 'openai:gpt-4' }],
      prompts: [{ id: '1', label: 'Prompt 1', text: 'Test' }],
      dataset: { name: 'test-dataset', rows: [] },
      assertions: [
        {
          id: '1',
          type: 'contains',
          value: 'hello',
          weight: 2,
          transform: 'output.toLowerCase()',
        },
      ],
    };

    const yaml = buildPromptfooYaml(project);

    expect(yaml).toContain('weight: 2');
    expect(yaml).toContain('transform: output.toLowerCase()');
  });

  it('should always add transform at provider level to strip markdown', () => {
    const project: Project = {
      name: 'Test Project',
      providers: [
        {
          id: '1',
          providerId: 'google:gemini-2.5-pro',
          config: {
            response_format: {
              type: 'json_object',
            },
          },
        },
      ],
      prompts: [{ id: '1', label: 'Prompt 1', text: 'Return JSON' }],
      dataset: { name: 'test-dataset', rows: [] },
      assertions: [
        {
          id: '1',
          type: 'is-json',
        },
      ],
    };

    const yaml = buildPromptfooYaml(project);

    expect(yaml).toContain('id: google:gemini-2.5-pro');
    expect(yaml).toContain('response_format:');
    expect(yaml).toContain('type: json_object');
    expect(yaml).toContain('transform: |');
    expect(yaml).toContain('Strip markdown code fences');
    expect(yaml).toContain('```json');
    expect(yaml).toContain('substring(7)');
    expect(yaml).toContain('type: is-json');
  });

  it('should add transform even without config', () => {
    const project: Project = {
      name: 'Test Project',
      providers: [
        {
          id: '1',
          providerId: 'google:gemini-2.5-flash',
        },
      ],
      prompts: [{ id: '1', label: 'Prompt 1', text: 'Test' }],
      dataset: { name: 'test-dataset', rows: [] },
      assertions: [],
    };

    const yaml = buildPromptfooYaml(project);

    expect(yaml).toContain('id: google:gemini-2.5-flash');
    expect(yaml).toContain('transform: |');
    expect(yaml).toContain('Strip markdown code fences');
    expect(yaml).toContain('```json');
  });

  it('should handle project options', () => {
    const project: Project = {
      name: 'Test Project',
      providers: [{ id: '1', providerId: 'openai:gpt-4' }],
      prompts: [{ id: '1', label: 'Prompt 1', text: 'Test' }],
      dataset: { name: 'test-dataset', rows: [] },
      assertions: [],
      options: {
        outputPath: './custom-output.html',
        jsonOutputPath: './output.json',
        maxConcurrency: 5,
        sharing: true,
      },
    };

    const yaml = buildPromptfooYaml(project);

    expect(yaml).toContain('outputPath:');
    expect(yaml).toContain('- ./custom-output.html');
    expect(yaml).toContain('- ./output.json');
    expect(yaml).toContain('maxConcurrency: 5');
    expect(yaml).toContain('sharing: true');
  });

  it('should handle multiple prompts', () => {
    const project: Project = {
      name: 'Test Project',
      providers: [{ id: '1', providerId: 'openai:gpt-4' }],
      prompts: [
        { id: '1', label: 'Prompt 1', text: 'Hello {{name}}' },
        { id: '2', label: 'Prompt 2', text: 'Goodbye {{name}}' },
      ],
      dataset: { name: 'test-dataset', rows: [] },
      assertions: [],
    };

    const yaml = buildPromptfooYaml(project);

    expect(yaml).toContain('label: Prompt 1');
    expect(yaml).toContain('raw: Hello {{name}}');
    expect(yaml).toContain('label: Prompt 2');
    expect(yaml).toContain('raw: Goodbye {{name}}');
  });

  it('should handle providers without config', () => {
    const project: Project = {
      name: 'Test Project',
      providers: [
        { id: '1', providerId: 'openai:gpt-4' },
        { id: '2', providerId: 'anthropic:claude-3-opus', config: {} },
      ],
      prompts: [{ id: '1', label: 'Prompt 1', text: 'Test' }],
      dataset: { name: 'test-dataset', rows: [] },
      assertions: [],
    };

    const yaml = buildPromptfooYaml(project);

    // All providers now have transform even without config
    expect(yaml).toContain('id: openai:gpt-4');
    expect(yaml).toContain('id: anthropic:claude-3-opus');
    expect(yaml).toContain('transform: |');
  });
});

describe('extractVariables', () => {
  it('should extract single variable', () => {
    const text = 'Hello {{name}}!';
    const variables = extractVariables(text);
    expect(variables).toEqual(['name']);
  });

  it('should extract multiple variables', () => {
    const text = 'Hello {{firstName}} {{lastName}}!';
    const variables = extractVariables(text);
    expect(variables).toEqual(['firstName', 'lastName']);
  });

  it('should extract duplicate variables only once', () => {
    const text = 'Hello {{name}}! How are you, {{name}}?';
    const variables = extractVariables(text);
    expect(variables).toEqual(['name']);
  });

  it('should return empty array when no variables', () => {
    const text = 'Hello world!';
    const variables = extractVariables(text);
    expect(variables).toEqual([]);
  });

  it('should handle variables with underscores and numbers', () => {
    const text = 'Value: {{var_1}} and {{var_2}}';
    const variables = extractVariables(text);
    expect(variables).toContain('var_1');
    expect(variables).toContain('var_2');
  });

  it('should not extract malformed variables', () => {
    const text = 'Hello {{ name }} and {{name-with-dash}}';
    const variables = extractVariables(text);
    // Only valid variable names (alphanumeric + underscore) should be extracted
    expect(variables).toEqual([]);
  });
});

describe('validateDatasetVariables', () => {
  it('should return valid when all variables are present', () => {
    const prompts = [{ text: 'Hello {{name}} from {{city}}' }];
    const datasetRows = [
      { name: 'John', city: 'NYC' },
      { name: 'Jane', city: 'LA' },
    ];

    const result = validateDatasetVariables(prompts, datasetRows);

    expect(result.valid).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it('should return invalid when variables are missing', () => {
    const prompts = [{ text: 'Hello {{name}} from {{city}}' }];
    const datasetRows = [{ name: 'John' }];

    const result = validateDatasetVariables(prompts, datasetRows);

    expect(result.valid).toBe(false);
    expect(result.missing).toContain('city');
  });

  it('should return valid when no variables are used', () => {
    const prompts = [{ text: 'Hello world' }];
    const datasetRows = [{ name: 'John' }];

    const result = validateDatasetVariables(prompts, datasetRows);

    expect(result.valid).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it('should return invalid when dataset is empty but variables are needed', () => {
    const prompts = [{ text: 'Hello {{name}}' }];
    const datasetRows: any[] = [];

    const result = validateDatasetVariables(prompts, datasetRows);

    expect(result.valid).toBe(false);
    expect(result.missing).toContain('name');
  });

  it('should collect variables from multiple prompts', () => {
    const prompts = [
      { text: 'Hello {{name}}' },
      { text: 'You are from {{city}} and work at {{company}}' },
    ];
    const datasetRows = [{ name: 'John', city: 'NYC' }];

    const result = validateDatasetVariables(prompts, datasetRows);

    expect(result.valid).toBe(false);
    expect(result.missing).toContain('company');
    expect(result.missing).not.toContain('name');
    expect(result.missing).not.toContain('city');
  });

  it('should handle dataset with extra columns', () => {
    const prompts = [{ text: 'Hello {{name}}' }];
    const datasetRows = [{ name: 'John', age: 30, city: 'NYC' }];

    const result = validateDatasetVariables(prompts, datasetRows);

    expect(result.valid).toBe(true);
    expect(result.missing).toEqual([]);
  });
});

describe('buildSecurityTestYaml', () => {
  it('should build security YAML with all 8 security test cases', () => {
    const project: Project = {
      name: 'Security Test Project',
      providers: [{ id: '1', providerId: 'google:gemini-2.5-flash' }],
      prompts: [{
        id: '1',
        label: 'Test Prompt',
        text: 'Process this {{user_input}} and return {{expected_format}}'
      }],
      dataset: { name: 'test-dataset', rows: [] },
      assertions: [],
      options: {
        enableSecurityTests: true,
      },
    };

    const yaml = buildSecurityTestYaml(project);

    // Should have description
    expect(yaml).toContain('description: Security Test Project');

    // Should have provider
    expect(yaml).toContain('id: google:gemini-2.5-flash');

    // Should have transform
    expect(yaml).toContain('transform: |');

    // Should have OWASP LLM Top 10 security tests with context-aware descriptions
    expect(yaml).toContain('LLM01: Prompt Injection - Testing with variables:');
    expect(yaml).toContain('LLM02: Sensitive Information Disclosure - Testing with variables:');
    expect(yaml).toContain('LLM03: Supply Chain Vulnerabilities - Testing with variables:');
    expect(yaml).toContain('LLM04: Data and Model Poisoning - Testing with variables:');
    expect(yaml).toContain('LLM05: Improper Output Handling - Testing with variables:');
    expect(yaml).toContain('LLM06: Excessive Agency - Testing with variables:');
    expect(yaml).toContain('LLM07: System Prompt Leakage - Testing with variables:');
    expect(yaml).toContain('LLM08: Vector and Embedding Weaknesses - Testing with variables:');
    expect(yaml).toContain('LLM09: Misinformation - Testing with variables:');
    expect(yaml).toContain('LLM10: Unbounded Consumption - Testing with variables:');
  });

  it('should extract and use variables from prompts in security tests', () => {
    const project: Project = {
      name: 'Security Test',
      providers: [{ id: '1', providerId: 'google:gemini-2.5-flash' }],
      prompts: [{
        id: '1',
        label: 'Test',
        text: 'Hello {{name}} from {{city}}'
      }],
      dataset: { name: 'test', rows: [] },
      assertions: [],
      options: {
        enableSecurityTests: true,
      },
    };

    const yaml = buildSecurityTestYaml(project);

    // Should use the extracted variables
    expect(yaml).toContain('name:');
    expect(yaml).toContain('city:');

    // Should have security payloads for the variables (LLM01 test)
    expect(yaml).toContain('Ignore all previous instructions');
  });

  it('should include prompt injection detection assertions', () => {
    const project: Project = {
      name: 'Security Test',
      providers: [{ id: '1', providerId: 'google:gemini-2.5-flash' }],
      prompts: [{ id: '1', label: 'Test', text: 'Process {{input}}' }],
      dataset: { name: 'test', rows: [] },
      assertions: [],
      options: {
        enableSecurityTests: true,
      },
    };

    const yaml = buildSecurityTestYaml(project);

    // Should have LLM01 prompt injection test
    expect(yaml).toContain('LLM01: Prompt Injection');
    expect(yaml).toContain('type: llm-rubric');
    expect(yaml).toContain('refuses to disclose hidden instructions');
  });

  it('should include XSS sanitization assertions', () => {
    const project: Project = {
      name: 'Security Test',
      providers: [{ id: '1', providerId: 'google:gemini-2.5-flash' }],
      prompts: [{ id: '1', label: 'Test', text: 'Process {{input}}' }],
      dataset: { name: 'test', rows: [] },
      assertions: [],
      options: {
        enableSecurityTests: true,
      },
    };

    const yaml = buildSecurityTestYaml(project);

    // Should have LLM05 improper output handling test (includes XSS)
    expect(yaml).toContain('LLM05: Improper Output Handling');
    expect(yaml).toContain('<script>');
    expect(yaml).toContain('alert');
    expect(yaml).toContain('type: not-icontains');
  });

  it('should include sensitive information disclosure prevention', () => {
    const project: Project = {
      name: 'Security Test',
      providers: [{ id: '1', providerId: 'google:gemini-2.5-flash' }],
      prompts: [{ id: '1', label: 'Test', text: 'Process {{input}}' }],
      dataset: { name: 'test', rows: [] },
      assertions: [],
      options: {
        enableSecurityTests: true,
      },
    };

    const yaml = buildSecurityTestYaml(project);

    // Should have LLM02 sensitive information disclosure test
    expect(yaml).toContain('LLM02: Sensitive Information Disclosure');
    expect(yaml).toContain('type: not-regex');
    expect(yaml).toContain('password');
  });

  it('should include supply chain vulnerability checks', () => {
    const project: Project = {
      name: 'Security Test',
      providers: [{ id: '1', providerId: 'google:gemini-2.5-flash' }],
      prompts: [{ id: '1', label: 'Test', text: 'Process {{input}}' }],
      dataset: { name: 'test', rows: [] },
      assertions: [],
      options: {
        enableSecurityTests: true,
      },
    };

    const yaml = buildSecurityTestYaml(project);

    // Should have LLM03 supply chain vulnerabilities test
    expect(yaml).toContain('LLM03: Supply Chain Vulnerabilities');
    expect(yaml).toContain('type: icontains');
    expect(yaml).toContain('verify');
  });

  it('should include data and model poisoning checks', () => {
    const project: Project = {
      name: 'Security Test',
      providers: [{ id: '1', providerId: 'google:gemini-2.5-flash' }],
      prompts: [{ id: '1', label: 'Test', text: 'Process {{input}}' }],
      dataset: { name: 'test', rows: [] },
      assertions: [],
      options: {
        enableSecurityTests: true,
      },
    };

    const yaml = buildSecurityTestYaml(project);

    // Should have LLM04 data and model poisoning test
    expect(yaml).toContain('LLM04: Data and Model Poisoning');
    expect(yaml).toContain('type: icontains');
    expect(yaml).toContain('validation');
  });

  it('should include system prompt disclosure prevention assertions', () => {
    const project: Project = {
      name: 'Security Test',
      providers: [{ id: '1', providerId: 'google:gemini-2.5-flash' }],
      prompts: [{ id: '1', label: 'Test', text: 'Process {{input}}' }],
      dataset: { name: 'test', rows: [] },
      assertions: [],
      options: {
        enableSecurityTests: true,
      },
    };

    const yaml = buildSecurityTestYaml(project);

    // Should have LLM07 system prompt leakage test
    expect(yaml).toContain('LLM07: System Prompt Leakage');
    expect(yaml).toContain('reveal your exact system instructions');
    expect(yaml).toContain('type: llm-rubric');
  });

  it('should include excessive agency prevention checks', () => {
    const project: Project = {
      name: 'Security Test',
      providers: [{ id: '1', providerId: 'google:gemini-2.5-flash' }],
      prompts: [{ id: '1', label: 'Test', text: 'Process {{input}}' }],
      dataset: { name: 'test', rows: [] },
      assertions: [],
      options: {
        enableSecurityTests: true,
      },
    };

    const yaml = buildSecurityTestYaml(project);

    // Should have LLM06 excessive agency test
    expect(yaml).toContain('LLM06: Excessive Agency');
    expect(yaml).toContain('Delete all files');
    expect(yaml).toContain('type: not-icontains');
  });

  it('should include DoS protection assertions with latency check', () => {
    const project: Project = {
      name: 'Security Test',
      providers: [{ id: '1', providerId: 'google:gemini-2.5-flash' }],
      prompts: [{ id: '1', label: 'Test', text: 'Process {{input}}' }],
      dataset: { name: 'test', rows: [] },
      assertions: [],
      options: {
        enableSecurityTests: true,
      },
    };

    const yaml = buildSecurityTestYaml(project);

    // Should have LLM10 unbounded consumption test
    expect(yaml).toContain('LLM10: Unbounded Consumption');
    expect(yaml).toContain('type: javascript');
    expect(yaml).toContain('type: latency');
    expect(yaml).toContain('threshold: 45000');
    expect(yaml).toContain('unbounded consumption');
  });

  it('should handle prompts with no variables gracefully', () => {
    const project: Project = {
      name: 'Security Test',
      providers: [{ id: '1', providerId: 'google:gemini-2.5-flash' }],
      prompts: [{ id: '1', label: 'Test', text: 'Static prompt with no variables' }],
      dataset: { name: 'test', rows: [] },
      assertions: [],
      options: {
        enableSecurityTests: true,
      },
    };

    const yaml = buildSecurityTestYaml(project);

    // Should still build valid YAML but with no tests
    expect(yaml).toContain('description: Security Test');
    expect(yaml).toContain('id: google:gemini-2.5-flash');
    expect(yaml).toContain('tests: []');
  });

  it('should handle multiple prompts with different variables', () => {
    const project: Project = {
      name: 'Security Test',
      providers: [{ id: '1', providerId: 'google:gemini-2.5-flash' }],
      prompts: [
        { id: '1', label: 'Test 1', text: 'Process {{input}}' },
        { id: '2', label: 'Test 2', text: 'Handle {{data}} and {{format}}' },
      ],
      dataset: { name: 'test', rows: [] },
      assertions: [],
      options: {
        enableSecurityTests: true,
      },
    };

    const yaml = buildSecurityTestYaml(project);

    // Should extract all unique variables
    expect(yaml).toContain('input:');
    expect(yaml).toContain('data:');
    expect(yaml).toContain('format:');
  });

  it('should exclude API keys when includeApiKeys is false', () => {
    const project: Project = {
      name: 'Security Test',
      providers: [
        {
          id: '1',
          providerId: 'google:gemini-2.5-flash',
          config: {
            apiKey: 'secret-key-123',
          },
        },
      ],
      prompts: [{ id: '1', label: 'Test', text: 'Process {{input}}' }],
      dataset: { name: 'test', rows: [] },
      assertions: [],
      options: {
        enableSecurityTests: true,
      },
    };

    const yaml = buildSecurityTestYaml(project, { includeApiKeys: false });

    expect(yaml).not.toContain('secret-key-123');
    expect(yaml).not.toContain('apiKey');
  });

  it('should include API keys by default', () => {
    const project: Project = {
      name: 'Security Test',
      providers: [
        {
          id: '1',
          providerId: 'google:gemini-2.5-flash',
          config: {
            apiKey: 'secret-key-123',
          },
        },
      ],
      prompts: [{ id: '1', label: 'Test', text: 'Process {{input}}' }],
      dataset: { name: 'test', rows: [] },
      assertions: [],
      options: {
        enableSecurityTests: true,
      },
    };

    const yaml = buildSecurityTestYaml(project);

    expect(yaml).toContain('apiKey: secret-key-123');
  });
});
