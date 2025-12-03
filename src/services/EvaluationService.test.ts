import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EvaluationService } from './EvaluationService';
import type { Project } from '../lib/types';

describe('EvaluationService', () => {
  let mockProject: Project;
  let mockRunPromptfoo: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockProject = {
      name: 'Test Project',
      providers: [
        { id: '1', providerId: 'openai:gpt-4', config: {} },
        { id: '2', providerId: 'anthropic:claude-3', config: {} },
      ],
      prompts: [
        { id: '1', label: 'Prompt 1', text: 'Hello {{name}}' },
        { id: '2', label: 'Prompt 2', text: 'Goodbye {{name}}' },
      ],
      dataset: {
        name: 'Test Dataset',
        headers: ['name'],
        rows: [
          { name: 'Alice' },
          { name: 'Bob' },
          { name: 'Charlie' },
        ],
      },
      assertions: [
        { id: '1', type: 'contains', value: 'hello' },
      ],
      options: {
        outputPath: 'output.html',
        jsonOutputPath: 'output.json',
      },
    };

    mockRunPromptfoo = vi.fn().mockResolvedValue({
      success: true,
      results: {},
      htmlPath: '/path/to/output.html',
    });

    (global.window as any) = {
      api: {
        runPromptfoo: mockRunPromptfoo,
      },
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete (global.window as any).api;
  });

  describe('calculateTotalTests', () => {
    it('should calculate total tests correctly', () => {
      const total = EvaluationService.calculateTotalTests(mockProject);

      // 3 dataset rows * 2 providers * 2 prompts = 12 tests
      expect(total).toBe(12);
    });

    it('should return 0 when dataset is empty', () => {
      const project = { ...mockProject, dataset: undefined };

      const total = EvaluationService.calculateTotalTests(project);

      expect(total).toBe(0);
    });

    it('should return 0 when dataset has no rows', () => {
      const project = {
        ...mockProject,
        dataset: { name: 'Empty', headers: [], rows: [] },
      };

      const total = EvaluationService.calculateTotalTests(project);

      expect(total).toBe(0);
    });

    it('should handle single provider and prompt', () => {
      const project = {
        ...mockProject,
        providers: [{ id: '1', providerId: 'openai:gpt-4', config: {} }],
        prompts: [{ id: '1', label: 'Prompt', text: 'Test' }],
      };

      const total = EvaluationService.calculateTotalTests(project);

      expect(total).toBe(3); // 3 rows * 1 provider * 1 prompt
    });
  });

  describe('shouldRunSecurityTests', () => {
    it('should return true when security tests enabled and prompts have variables', () => {
      const project = {
        ...mockProject,
        options: { ...mockProject.options, enableSecurityTests: true },
      };

      const result = EvaluationService.shouldRunSecurityTests(project);

      expect(result).toBe(true);
    });

    it('should return false when security tests disabled', () => {
      const result = EvaluationService.shouldRunSecurityTests(mockProject);

      expect(result).toBe(false);
    });

    it('should return false when prompts have no variables', () => {
      const project = {
        ...mockProject,
        prompts: [{ id: '1', label: 'Prompt', text: 'Static prompt' }],
        options: { ...mockProject.options, enableSecurityTests: true },
      };

      const result = EvaluationService.shouldRunSecurityTests(project);

      expect(result).toBe(false);
    });

    it('should return false when no prompts', () => {
      const project = {
        ...mockProject,
        prompts: [],
        options: { ...mockProject.options, enableSecurityTests: true },
      };

      const result = EvaluationService.shouldRunSecurityTests(project);

      expect(result).toBe(false);
    });
  });

  describe('shouldRunFunctionalTests', () => {
    it('should return true when assertions exist', () => {
      const result = EvaluationService.shouldRunFunctionalTests(mockProject);

      expect(result).toBe(true);
    });

    it('should return false when no assertions', () => {
      const project = { ...mockProject, assertions: [] };

      const result = EvaluationService.shouldRunFunctionalTests(project);

      expect(result).toBe(false);
    });

    it('should return false when assertions undefined', () => {
      const project = { ...mockProject, assertions: undefined as any };

      const result = EvaluationService.shouldRunFunctionalTests(project);

      expect(result).toBe(false);
    });
  });

  describe('buildYamlConfig', () => {
    it('should build YAML configuration', () => {
      const yaml = EvaluationService.buildYamlConfig(mockProject);

      expect(yaml).toBeDefined();
      expect(typeof yaml).toBe('string');
      expect(yaml.length).toBeGreaterThan(0);
    });

    it('should include providers in YAML', () => {
      const yaml = EvaluationService.buildYamlConfig(mockProject);

      expect(yaml).toContain('openai:gpt-4');
      expect(yaml).toContain('anthropic:claude-3');
    });

    it('should include prompts in YAML', () => {
      const yaml = EvaluationService.buildYamlConfig(mockProject);

      expect(yaml).toContain('Hello {{name}}');
    });
  });

  describe('buildSecurityYamlConfig', () => {
    it('should build security YAML configuration', () => {
      const yaml = EvaluationService.buildSecurityYamlConfig(mockProject);

      expect(yaml).toBeDefined();
      expect(typeof yaml).toBe('string');
    });
  });

  describe('runFunctionalEvaluation', () => {
    it('should run functional evaluation successfully', async () => {
      const yamlContent = 'test: yaml';
      const options = {
        runId: 'test-run-123',
        onLog: vi.fn(),
      };

      const result = await EvaluationService.runFunctionalEvaluation(yamlContent, options);

      expect(result.success).toBe(true);
      expect(mockRunPromptfoo).toHaveBeenCalledWith(
        yamlContent,
        'test-run-123',
        expect.any(Function)
      );
    });

    it('should call onLog callback with functional prefix', async () => {
      const yamlContent = 'test: yaml';
      const onLog = vi.fn();
      const options = {
        runId: 'test-run-123',
        onLog,
      };

      mockRunPromptfoo.mockImplementation((yaml, runId, callback) => {
        callback('Test log message');
        return Promise.resolve({ success: true, results: {} });
      });

      await EvaluationService.runFunctionalEvaluation(yamlContent, options);

      expect(onLog).toHaveBeenCalledWith('[Functional] Test log message', undefined);
    });

    it('should handle evaluation failure', async () => {
      mockRunPromptfoo.mockResolvedValue({
        success: false,
        error: 'Evaluation failed',
      });

      const result = await EvaluationService.runFunctionalEvaluation('yaml', {
        runId: 'test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Evaluation failed');
    });

    it('should handle API not available', async () => {
      delete (global.window as any).api;

      const result = await EvaluationService.runFunctionalEvaluation('yaml', {
        runId: 'test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Electron mode');
    });

    it('should handle thrown errors', async () => {
      mockRunPromptfoo.mockRejectedValue(new Error('Connection failed'));

      const result = await EvaluationService.runFunctionalEvaluation('yaml', {
        runId: 'test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection failed');
    });
  });

  describe('runSecurityEvaluation', () => {
    it('should run security evaluation successfully', async () => {
      const yamlContent = 'test: yaml';
      const options = {
        runId: 'test-run-123',
        onLog: vi.fn(),
      };

      const result = await EvaluationService.runSecurityEvaluation(yamlContent, options);

      expect(result.success).toBe(true);
      expect(mockRunPromptfoo).toHaveBeenCalledWith(
        yamlContent,
        'test-run-123-security',
        expect.any(Function)
      );
    });

    it('should use security suffix for runId', async () => {
      const yamlContent = 'test: yaml';
      const options = {
        runId: 'test-run',
        onLog: vi.fn(),
      };

      await EvaluationService.runSecurityEvaluation(yamlContent, options);

      expect(mockRunPromptfoo).toHaveBeenCalledWith(
        yamlContent,
        'test-run-security',
        expect.any(Function)
      );
    });

    it('should call onLog callback with security prefix', async () => {
      const yamlContent = 'test: yaml';
      const onLog = vi.fn();
      const options = {
        runId: 'test-run-123',
        onLog,
      };

      mockRunPromptfoo.mockImplementation((yaml, runId, callback) => {
        callback('Test log message');
        return Promise.resolve({ success: true, results: {} });
      });

      await EvaluationService.runSecurityEvaluation(yamlContent, options);

      expect(onLog).toHaveBeenCalledWith('[Security] Test log message', undefined);
    });

    it('should handle API not available', async () => {
      delete (global.window as any).api;

      const result = await EvaluationService.runSecurityEvaluation('yaml', {
        runId: 'test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Electron mode');
    });

    it('should handle thrown errors', async () => {
      mockRunPromptfoo.mockRejectedValue(new Error('Security test failed'));

      const result = await EvaluationService.runSecurityEvaluation('yaml', {
        runId: 'test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Security test failed');
    });
  });
});
