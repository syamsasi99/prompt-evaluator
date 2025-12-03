import { describe, it, expect } from 'vitest';
import { transformProviderForYaml, transformProvidersForYaml } from './providerUtils';
import type { Provider } from './types';

describe('ProviderUtils', () => {
  describe('transformProviderForYaml', () => {
    it('should transform provider with basic info', () => {
      const provider: Provider = {
        id: 'provider-1',
        providerId: 'google:gemini-2.5-flash',
        config: {},
      };

      const result = transformProviderForYaml(provider);

      expect(result.id).toBe('google:gemini-2.5-flash');
      expect(result.transform).toBeDefined();
      expect(result.transform).toContain('Strip markdown code fences');
    });

    it('should include config when present', () => {
      const provider: Provider = {
        id: 'provider-1',
        providerId: 'openai:gpt-4',
        config: {
          temperature: 0.7,
          maxTokens: 1000,
        },
      };

      const result = transformProviderForYaml(provider);

      expect(result.config).toEqual({
        temperature: 0.7,
        maxTokens: 1000,
      });
    });

    it('should include API key by default', () => {
      const provider: Provider = {
        id: 'provider-1',
        providerId: 'openai:gpt-4',
        config: {
          apiKey: 'sk-test123',
          temperature: 0.7,
        },
      };

      const result = transformProviderForYaml(provider);

      expect(result.config.apiKey).toBe('sk-test123');
      expect(result.config.temperature).toBe(0.7);
    });

    it('should exclude API key when includeApiKeys is false', () => {
      const provider: Provider = {
        id: 'provider-1',
        providerId: 'openai:gpt-4',
        config: {
          apiKey: 'sk-test123',
          temperature: 0.7,
        },
      };

      const result = transformProviderForYaml(provider, { includeApiKeys: false });

      expect(result.config.apiKey).toBeUndefined();
      expect(result.config.temperature).toBe(0.7);
    });

    it('should not include config field when only apiKey is present and includeApiKeys is false', () => {
      const provider: Provider = {
        id: 'provider-1',
        providerId: 'openai:gpt-4',
        config: {
          apiKey: 'sk-test123',
        },
      };

      const result = transformProviderForYaml(provider, { includeApiKeys: false });

      expect(result.config).toBeUndefined();
    });

    it('should handle empty config', () => {
      const provider: Provider = {
        id: 'provider-1',
        providerId: 'google:gemini-pro',
        config: {},
      };

      const result = transformProviderForYaml(provider);

      expect(result.config).toBeUndefined();
    });

    it('should generate correct markdown stripping transform', () => {
      const provider: Provider = {
        id: 'provider-1',
        providerId: 'anthropic:claude-3',
        config: {},
      };

      const result = transformProviderForYaml(provider);

      expect(result.transform).toContain('```json');
      expect(result.transform).toContain('output.startsWith');
      expect(result.transform).toContain('output.endsWith');
      expect(result.transform).toContain('output.substring');
    });

    it('should handle provider with complex config', () => {
      const provider: Provider = {
        id: 'provider-1',
        providerId: 'openai:gpt-4',
        config: {
          apiKey: 'sk-test',
          temperature: 0.9,
          maxTokens: 2000,
          topP: 0.95,
          frequencyPenalty: 0.5,
          presencePenalty: 0.3,
        },
      };

      const result = transformProviderForYaml(provider, { includeApiKeys: false });

      expect(result.config).toEqual({
        temperature: 0.9,
        maxTokens: 2000,
        topP: 0.95,
        frequencyPenalty: 0.5,
        presencePenalty: 0.3,
      });
    });
  });

  describe('transformProvidersForYaml', () => {
    it('should transform array of providers', () => {
      const providers: Provider[] = [
        {
          id: 'provider-1',
          providerId: 'google:gemini-pro',
          config: {},
        },
        {
          id: 'provider-2',
          providerId: 'openai:gpt-4',
          config: { temperature: 0.7 },
        },
      ];

      const result = transformProvidersForYaml(providers);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('google:gemini-pro');
      expect(result[1].id).toBe('openai:gpt-4');
      expect(result[1].config.temperature).toBe(0.7);
    });

    it('should pass includeApiKeys option to all providers', () => {
      const providers: Provider[] = [
        {
          id: 'provider-1',
          providerId: 'openai:gpt-4',
          config: { apiKey: 'sk-test1' },
        },
        {
          id: 'provider-2',
          providerId: 'anthropic:claude-3',
          config: { apiKey: 'sk-test2' },
        },
      ];

      const result = transformProvidersForYaml(providers, { includeApiKeys: false });

      expect(result[0].config).toBeUndefined();
      expect(result[1].config).toBeUndefined();
    });

    it('should handle empty providers array', () => {
      const result = transformProvidersForYaml([]);

      expect(result).toEqual([]);
    });

    it('should maintain provider order', () => {
      const providers: Provider[] = [
        { id: '1', providerId: 'provider-a', config: {} },
        { id: '2', providerId: 'provider-b', config: {} },
        { id: '3', providerId: 'provider-c', config: {} },
      ];

      const result = transformProvidersForYaml(providers);

      expect(result[0].id).toBe('provider-a');
      expect(result[1].id).toBe('provider-b');
      expect(result[2].id).toBe('provider-c');
    });

    it('should include API keys by default for all providers', () => {
      const providers: Provider[] = [
        {
          id: 'provider-1',
          providerId: 'openai:gpt-4',
          config: { apiKey: 'sk-test1', temperature: 0.7 },
        },
        {
          id: 'provider-2',
          providerId: 'anthropic:claude-3',
          config: { apiKey: 'sk-test2', maxTokens: 1000 },
        },
      ];

      const result = transformProvidersForYaml(providers);

      expect(result[0].config.apiKey).toBe('sk-test1');
      expect(result[1].config.apiKey).toBe('sk-test2');
    });
  });

  describe('Transform Script', () => {
    it('should generate valid JavaScript code', () => {
      const provider: Provider = {
        id: 'provider-1',
        providerId: 'test:provider',
        config: {},
      };

      const result = transformProviderForYaml(provider);

      // Should not throw when evaluated
      expect(() => {
        new Function(result.transform);
      }).not.toThrow();
    });

    it('should include trim operations', () => {
      const provider: Provider = {
        id: 'provider-1',
        providerId: 'test:provider',
        config: {},
      };

      const result = transformProviderForYaml(provider);

      expect(result.transform).toContain('output.trim()');
    });

    it('should check for string type', () => {
      const provider: Provider = {
        id: 'provider-1',
        providerId: 'test:provider',
        config: {},
      };

      const result = transformProviderForYaml(provider);

      expect(result.transform).toContain("typeof output === 'string'");
    });

    it('should return output at the end', () => {
      const provider: Provider = {
        id: 'provider-1',
        providerId: 'test:provider',
        config: {},
      };

      const result = transformProviderForYaml(provider);

      expect(result.transform).toContain('return output');
    });
  });
});
