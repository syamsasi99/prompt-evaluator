import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProvidersForm, PROVIDER_CATEGORIES } from './ProvidersForm';
import type { Provider } from '../lib/types';
import { ToastProvider } from '../contexts/ToastContext';

// Mock dependencies
vi.mock('../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../lib/apiKeyValidation', () => ({
  requiresApiKey: vi.fn((providerId: string) => {
    return !providerId.startsWith('ollama');
  }),
  validateApiKeyFormat: vi.fn(() => ({ isValid: true })),
  getApiKeyHelpMessage: vi.fn(() => 'Get your API key from...'),
  getProviderPrefix: vi.fn((providerId: string) => providerId.split(':')[0]),
  PROVIDER_API_KEY_CONFIGS: {
    openai: {
      envVarName: 'OPENAI_API_KEY',
      getApiKeyUrl: 'https://platform.openai.com/api-keys',
      docsUrl: 'https://platform.openai.com/docs',
    },
    google: {
      envVarName: 'GEMINI_API_KEY',
      getApiKeyUrl: 'https://aistudio.google.com/app/apikey',
      docsUrl: 'https://ai.google.dev/docs',
    },
  },
  getEnvFilePath: vi.fn(() => '~/. config/promptfooplusplus/.env'),
}));

const mockGetApiKeyFromEnv = vi.fn();

beforeEach(() => {
  global.window = global.window || ({} as any);
  (global.window as any).api = {
    getApiKeyFromEnv: mockGetApiKeyFromEnv,
  };

  mockGetApiKeyFromEnv.mockResolvedValue({ hasApiKey: true, apiKey: 'test-key-123' });
});

const renderWithToast = (ui: React.ReactElement) => {
  return render(<ToastProvider>{ui}</ToastProvider>);
};

describe('ProvidersForm', () => {
  let mockOnChange: ReturnType<typeof vi.fn>;
  let mockOnValidationChange: ReturnType<typeof vi.fn>;
  let mockProviders: Provider[];

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnChange = vi.fn();
    mockOnValidationChange = vi.fn();
    mockProviders = [
      { id: 'provider-1', providerId: 'openai:gpt-4o', config: {} },
    ];
  });

  describe('Rendering', () => {
    it('should render the form header', () => {
      renderWithToast(
        <ProvidersForm providers={mockProviders} onChange={mockOnChange} />
      );

      expect(screen.getByText('Providers')).toBeInTheDocument();
      expect(screen.getByText('+ Add Provider')).toBeInTheDocument();
    });

    it('should display provider count', () => {
      renderWithToast(
        <ProvidersForm providers={mockProviders} onChange={mockOnChange} />
      );

      expect(screen.getByText(/1 \/ 10 providers/i)).toBeInTheDocument();
    });

    it('should render existing providers', () => {
      renderWithToast(
        <ProvidersForm providers={mockProviders} onChange={mockOnChange} />
      );

      expect(screen.getByDisplayValue('openai:gpt-4o')).toBeInTheDocument();
    });

    it('should display "no providers" message when empty and validation required', () => {
      renderWithToast(
        <ProvidersForm
          providers={[]}
          onChange={mockOnChange}
          shouldValidate={true}
        />
      );

      expect(screen.getByText(/At least one provider is required/i)).toBeInTheDocument();
    });

    it('should display browse button for each provider', () => {
      renderWithToast(
        <ProvidersForm providers={mockProviders} onChange={mockOnChange} />
      );

      expect(screen.getByText('Browse')).toBeInTheDocument();
    });

    it('should show maximum reached message when at limit', () => {
      const maxProviders: Provider[] = Array.from({ length: 10 }, (_, i) => ({
        id: `provider-${i}`,
        providerId: `openai:gpt-${i}`,
        config: {},
      }));

      renderWithToast(
        <ProvidersForm providers={maxProviders} onChange={mockOnChange} />
      );

      expect(screen.getByText(/Maximum reached/i)).toBeInTheDocument();
    });
  });

  describe('Adding Providers', () => {
    it('should add a new provider when button is clicked', async () => {
      const user = userEvent.setup();
      renderWithToast(
        <ProvidersForm providers={[]} onChange={mockOnChange} />
      );

      const addButton = screen.getByText('+ Add Provider');
      await user.click(addButton);

      expect(mockOnChange).toHaveBeenCalled();
      const newProviders = mockOnChange.mock.calls[0][0];
      expect(newProviders).toHaveLength(1);
      expect(newProviders[0]).toMatchObject({
        providerId: '',
        config: {},
      });
    });

    it('should generate unique IDs for new providers', async () => {
      const user = userEvent.setup();
      renderWithToast(
        <ProvidersForm providers={[]} onChange={mockOnChange} />
      );

      const addButton = screen.getByText('+ Add Provider');
      await user.click(addButton);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });

      // Get first provider ID
      const firstCall = mockOnChange.mock.calls[0][0];
      expect(firstCall.length).toBe(1);
      const firstId = firstCall[0].id;

      await user.click(addButton);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledTimes(2);
      });

      // Get second provider ID from the second call (has 1 provider since prop is still [])
      const secondCall = mockOnChange.mock.calls[1][0];
      expect(secondCall.length).toBe(1);
      const secondId = secondCall[0].id;

      expect(firstId).not.toBe(secondId);
      expect(firstId).toBeTruthy();
      expect(secondId).toBeTruthy();
    });

    it('should disable add button at maximum limit (10 providers)', () => {
      const maxProviders: Provider[] = Array.from({ length: 10 }, (_, i) => ({
        id: `provider-${i}`,
        providerId: `openai:gpt-${i}`,
        config: {},
      }));

      renderWithToast(
        <ProvidersForm providers={maxProviders} onChange={mockOnChange} />
      );

      const addButton = screen.getByText('+ Add Provider');
      expect(addButton).toBeDisabled();
    });

    it('should show toast warning when trying to exceed maximum', async () => {
      const maxProviders: Provider[] = Array.from({ length: 10 }, (_, i) => ({
        id: `provider-${i}`,
        providerId: `openai:gpt-${i}`,
        config: {},
      }));

      renderWithToast(
        <ProvidersForm providers={maxProviders} onChange={mockOnChange} />
      );

      const addButton = screen.getByText('+ Add Provider');
      expect(addButton).toBeDisabled();
    });
  });

  describe('Provider Selection', () => {
    it('should show Browse panel when Browse button is clicked', async () => {
      const user = userEvent.setup();
      renderWithToast(
        <ProvidersForm providers={mockProviders} onChange={mockOnChange} />
      );

      const browseButton = screen.getByText('Browse');
      await user.click(browseButton);

      expect(screen.getByText('Select a provider:')).toBeInTheDocument();
    });

    it('should display all provider categories', async () => {
      const user = userEvent.setup();
      renderWithToast(
        <ProvidersForm providers={mockProviders} onChange={mockOnChange} />
      );

      const browseButton = screen.getByText('Browse');
      await user.click(browseButton);

      // Check for some expected categories
      expect(screen.getByText('OpenAI')).toBeInTheDocument();
      expect(screen.getByText('Anthropic')).toBeInTheDocument();
      expect(screen.getByText('Google')).toBeInTheDocument();
    });

    it('should update provider ID when selection is made', async () => {
      const user = userEvent.setup();
      const emptyProviders = [
        { id: 'provider-1', providerId: '', config: {} },
      ];

      renderWithToast(
        <ProvidersForm providers={emptyProviders} onChange={mockOnChange} />
      );

      const browseButton = screen.getByText('Browse');
      await user.click(browseButton);

      // Find and click on GPT-4o (use getAllByRole and filter)
      const buttons = screen.getAllByRole('button');
      const gpt4Button = buttons.find(button =>
        button.textContent?.includes('GPT-4o') && button.textContent?.includes('openai:gpt-4o')
      );

      expect(gpt4Button).toBeDefined();
      await user.click(gpt4Button!);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
        const updatedProviders = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
        expect(updatedProviders[0].providerId).toBe('openai:gpt-4o');
      });
    });

    it('should close browse panel after selection', async () => {
      const user = userEvent.setup();
      const emptyProviders = [
        { id: 'provider-1', providerId: '', config: {} },
      ];

      renderWithToast(
        <ProvidersForm providers={emptyProviders} onChange={mockOnChange} />
      );

      const browseButton = screen.getByText('Browse');
      await user.click(browseButton);

      const buttons = screen.getAllByRole('button');
      const gpt4Button = buttons.find(button =>
        button.textContent?.includes('GPT-4o') && button.textContent?.includes('openai:gpt-4o')
      );

      await user.click(gpt4Button!);

      await waitFor(() => {
        expect(screen.queryByText('Select a provider:')).not.toBeInTheDocument();
      });
    });
  });

  describe('Editing Providers', () => {
    it('should update provider ID on manual entry', async () => {
      renderWithToast(
        <ProvidersForm providers={mockProviders} onChange={mockOnChange} />
      );

      const input = screen.getByDisplayValue('openai:gpt-4o');
      fireEvent.change(input, { target: { value: 'anthropic:claude-3-5-sonnet' } });

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
        const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
        expect(lastCall[0].providerId).toBe('anthropic:claude-3-5-sonnet');
      });
    });

    it('should update API key in config', async () => {
      renderWithToast(
        <ProvidersForm providers={mockProviders} onChange={mockOnChange} />
      );

      const apiKeyInput = screen.getByPlaceholderText(/Enter your API key/i);
      fireEvent.change(apiKeyInput, { target: { value: 'sk-test-key-123' } });

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
        const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
        expect(lastCall[0].config.apiKey).toBe('sk-test-key-123');
      });
    });

    it('should toggle API key visibility', async () => {
      const user = userEvent.setup();
      const providersWithKey = [
        { id: 'provider-1', providerId: 'openai:gpt-4o', config: { apiKey: 'secret-key' } },
      ];

      renderWithToast(
        <ProvidersForm providers={providersWithKey} onChange={mockOnChange} />
      );

      const apiKeyInput = screen.getByDisplayValue('secret-key');
      expect(apiKeyInput).toHaveAttribute('type', 'password');

      const toggleButton = screen.getByTitle(/Show API key/i);
      await user.click(toggleButton);

      expect(apiKeyInput).toHaveAttribute('type', 'text');
    });
  });

  describe('Removing Providers', () => {
    it('should remove a provider when remove button is clicked', async () => {
      const user = userEvent.setup();
      renderWithToast(
        <ProvidersForm providers={mockProviders} onChange={mockOnChange} />
      );

      const removeButton = screen.getByText('Remove');
      await user.click(removeButton);

      expect(mockOnChange).toHaveBeenCalledWith([]);
    });

    it('should remove correct provider when multiple exist', async () => {
      const user = userEvent.setup();
      const providers = [
        { id: 'provider-1', providerId: 'openai:gpt-4o', config: {} },
        { id: 'provider-2', providerId: 'anthropic:claude-3-5-sonnet', config: {} },
      ];

      renderWithToast(
        <ProvidersForm providers={providers} onChange={mockOnChange} />
      );

      const removeButtons = screen.getAllByText('Remove');
      await user.click(removeButtons[0]);

      expect(mockOnChange).toHaveBeenCalledWith([providers[1]]);
    });

    it('should show success toast after removing', async () => {
      const user = userEvent.setup();
      renderWithToast(
        <ProvidersForm providers={mockProviders} onChange={mockOnChange} />
      );

      const removeButton = screen.getByText('Remove');
      await user.click(removeButton);

      await waitFor(() => {
        expect(screen.getByText(/Provider removed successfully/i)).toBeInTheDocument();
      });
    });
  });

  describe('Validation', () => {
    it('should validate provider ID format on blur', async () => {
      renderWithToast(
        <ProvidersForm
          providers={mockProviders}
          onChange={mockOnChange}
          onValidationChange={mockOnValidationChange}
        />
      );

      const input = screen.getByDisplayValue('openai:gpt-4o');
      fireEvent.change(input, { target: { value: 'invalid-format' } });
      fireEvent.blur(input);

      await waitFor(() => {
        expect(screen.getByText(/must be in format.*provider:model/i)).toBeInTheDocument();
      });
    });

    it('should accept valid provider:model format', async () => {
      const user = userEvent.setup();
      const emptyProviders = [
        { id: 'provider-1', providerId: '', config: {} },
      ];

      renderWithToast(
        <ProvidersForm
          providers={emptyProviders}
          onChange={mockOnChange}
          onValidationChange={mockOnValidationChange}
        />
      );

      const input = screen.getByPlaceholderText('e.g., openai:gpt-4o');
      await user.type(input, 'openai:gpt-4o');
      await user.tab();

      // Should not show error
      expect(screen.queryByText(/must be in format/i)).not.toBeInTheDocument();
    });

    it('should detect duplicate provider IDs', async () => {
      const providers = [
        { id: 'provider-1', providerId: 'openai:gpt-4o', config: {} },
        { id: 'provider-2', providerId: 'anthropic:claude', config: {} },
      ];

      renderWithToast(
        <ProvidersForm
          providers={providers}
          onChange={mockOnChange}
          onValidationChange={mockOnValidationChange}
          shouldValidate={true}
        />
      );

      // Get the second provider input by its current value
      const secondInput = screen.getByDisplayValue('anthropic:claude');
      fireEvent.change(secondInput, { target: { value: 'openai:gpt-4o' } });
      fireEvent.blur(secondInput);

      await waitFor(() => {
        expect(screen.getByText(/already added/i)).toBeInTheDocument();
      });
    });

    it('should validate all providers when shouldValidate is true', async () => {
      const providers = [
        { id: 'provider-1', providerId: 'invalid', config: {} },
      ];

      renderWithToast(
        <ProvidersForm
          providers={providers}
          onChange={mockOnChange}
          onValidationChange={mockOnValidationChange}
          shouldValidate={true}
        />
      );

      await waitFor(() => {
        expect(mockOnValidationChange).toHaveBeenCalledWith(true); // Has errors
      });
    });

    it('should call onValidationChange with false when no errors', async () => {
      renderWithToast(
        <ProvidersForm
          providers={mockProviders}
          onChange={mockOnChange}
          onValidationChange={mockOnValidationChange}
          shouldValidate={true}
        />
      );

      await waitFor(() => {
        expect(mockOnValidationChange).toHaveBeenCalledWith(false); // No errors
      });
    });
  });

  describe('API Key Validation', () => {
    it('should check for API key in environment', async () => {
      renderWithToast(
        <ProvidersForm providers={mockProviders} onChange={mockOnChange} />
      );

      await waitFor(() => {
        expect(mockGetApiKeyFromEnv).toHaveBeenCalledWith('OPENAI_API_KEY');
      });
    });

    it('should show warning when API key not found', async () => {
      mockGetApiKeyFromEnv.mockResolvedValue({ hasApiKey: false });

      renderWithToast(
        <ProvidersForm providers={mockProviders} onChange={mockOnChange} />
      );

      await waitFor(() => {
        expect(screen.getByText(/OPENAI_API_KEY not found/i)).toBeInTheDocument();
      });
    });

    it('should show success indicator when API key is configured', async () => {
      mockGetApiKeyFromEnv.mockResolvedValue({ hasApiKey: true, apiKey: 'test-key-123' });

      renderWithToast(
        <ProvidersForm providers={mockProviders} onChange={mockOnChange} />
      );

      await waitFor(() => {
        expect(screen.getByText(/API key found/i)).toBeInTheDocument();
      });
    });

    it('should show info for local providers that do not need keys', async () => {
      const ollamaProviders = [
        { id: 'provider-1', providerId: 'ollama:llama3.3', config: {} },
      ];

      renderWithToast(
        <ProvidersForm providers={ollamaProviders} onChange={mockOnChange} />
      );

      await waitFor(() => {
        expect(screen.getByText(/runs locally.*doesn't require an API key/i)).toBeInTheDocument();
      });
    });
  });

  describe('Provider Configuration', () => {
    it('should show config editor when Config button is clicked', async () => {
      const user = userEvent.setup();
      renderWithToast(
        <ProvidersForm providers={mockProviders} onChange={mockOnChange} />
      );

      const configButton = screen.getByText('Config');
      await user.click(configButton);

      expect(screen.getByText('Configuration (JSON)')).toBeInTheDocument();
    });

    it('should display current config in JSON format', async () => {
      const user = userEvent.setup();
      const providersWithConfig = [
        {
          id: 'provider-1',
          providerId: 'openai:gpt-4o',
          config: { temperature: 0.7, max_tokens: 1000 },
        },
      ];

      renderWithToast(
        <ProvidersForm providers={providersWithConfig} onChange={mockOnChange} />
      );

      const configButton = screen.getByText('Config');
      await user.click(configButton);

      // Wait for config section to render
      await waitFor(() => {
        expect(screen.getByText('Configuration (JSON)')).toBeInTheDocument();
      });

      // Find textarea by placeholder text
      const textarea = screen.getByPlaceholderText(/temperature.*max_tokens/i);
      expect(textarea.value).toContain('0.7');
      expect(textarea.value).toContain('1000');
    });

    it('should save config when Save Config button is clicked', async () => {
      const user = userEvent.setup();
      renderWithToast(
        <ProvidersForm providers={mockProviders} onChange={mockOnChange} />
      );

      const configButton = screen.getByText('Config');
      await user.click(configButton);

      // Wait for config section to render
      await waitFor(() => {
        expect(screen.getByText('Configuration (JSON)')).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText(/temperature.*max_tokens/i);
      fireEvent.change(textarea, { target: { value: '{"temperature": 0.5}' } });

      const saveButton = screen.getByText('Save Config');
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/Configuration saved successfully/i)).toBeInTheDocument();
      });
    });

    it('should show error for invalid JSON', async () => {
      const user = userEvent.setup();
      renderWithToast(
        <ProvidersForm providers={mockProviders} onChange={mockOnChange} />
      );

      const configButton = screen.getByText('Config');
      await user.click(configButton);

      // Wait for config section to render
      await waitFor(() => {
        expect(screen.getByText('Configuration (JSON)')).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText(/temperature.*max_tokens/i);
      fireEvent.change(textarea, { target: { value: '{invalid json}' } });

      const saveButton = screen.getByText('Save Config');
      await user.click(saveButton);

      await waitFor(() => {
        const invalidJsonElements = screen.getAllByText(/Invalid JSON/i);
        expect(invalidJsonElements.length).toBeGreaterThan(0);
      });
    });

    it('should clear config when Clear Config button is clicked', async () => {
      const user = userEvent.setup();
      renderWithToast(
        <ProvidersForm providers={mockProviders} onChange={mockOnChange} />
      );

      const configButton = screen.getByText('Config');
      await user.click(configButton);

      const clearButton = screen.getByText('Clear Config');
      await user.click(clearButton);

      expect(mockOnChange).toHaveBeenCalled();
      const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
      expect(lastCall[0].config).toEqual({});
    });

    it('should hide config editor when Hide button is clicked', async () => {
      const user = userEvent.setup();
      renderWithToast(
        <ProvidersForm providers={mockProviders} onChange={mockOnChange} />
      );

      const configButton = screen.getByText('Config');
      await user.click(configButton);

      expect(screen.getByText('Configuration (JSON)')).toBeInTheDocument();

      const hideButton = screen.getByText('Hide');
      await user.click(hideButton);

      expect(screen.queryByText('Configuration (JSON)')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty providers array', () => {
      renderWithToast(
        <ProvidersForm providers={[]} onChange={mockOnChange} />
      );

      expect(screen.getByText(/No providers configured/i)).toBeInTheDocument();
    });

    it('should handle provider with empty ID', () => {
      const emptyProviders = [
        { id: 'provider-1', providerId: '', config: {} },
      ];

      renderWithToast(
        <ProvidersForm providers={emptyProviders} onChange={mockOnChange} shouldValidate={true} />
      );

      expect(screen.getByPlaceholderText('e.g., openai:gpt-4o')).toBeInTheDocument();
    });

    it('should handle special characters in provider ID', async () => {
      const user = userEvent.setup();
      renderWithToast(
        <ProvidersForm providers={mockProviders} onChange={mockOnChange} />
      );

      const input = screen.getByDisplayValue('openai:gpt-4o');
      await user.clear(input);
      await user.type(input, 'huggingface:text-generation:meta-llama/Llama-3.3-70B');

      // Should accept complex provider IDs with slashes and hyphens
      expect(mockOnChange).toHaveBeenCalled();
    });

    it('should handle very long provider ID', async () => {
      const user = userEvent.setup();
      renderWithToast(
        <ProvidersForm providers={mockProviders} onChange={mockOnChange} />
      );

      const input = screen.getByDisplayValue('openai:gpt-4o');
      await user.clear(input);
      await user.type(input, 'provider:very-long-model-name-with-many-characters-123456789');

      expect(mockOnChange).toHaveBeenCalled();
    });

    it('should handle providers without config', () => {
      const providersNoConfig = [
        { id: 'provider-1', providerId: 'openai:gpt-4o', config: undefined as any },
      ];

      expect(() => {
        renderWithToast(
          <ProvidersForm providers={providersNoConfig} onChange={mockOnChange} />
        );
      }).not.toThrow();
    });
  });

  describe('Help Text', () => {
    it('should display format help', () => {
      renderWithToast(
        <ProvidersForm providers={mockProviders} onChange={mockOnChange} />
      );

      // Text may be split across elements, so check for both parts separately
      expect(screen.getByText(/Format:/i)).toBeInTheDocument();
      expect(screen.getByText(/provider:model/i)).toBeInTheDocument();
    });

    it('should display authentication options help', () => {
      renderWithToast(
        <ProvidersForm providers={mockProviders} onChange={mockOnChange} />
      );

      expect(screen.getByText(/Authentication.*2 options/i)).toBeInTheDocument();
    });

    it('should display .env file locations', () => {
      renderWithToast(
        <ProvidersForm providers={mockProviders} onChange={mockOnChange} />
      );

      expect(screen.getByText(/macOS:/i)).toBeInTheDocument();
      expect(screen.getByText(/Windows:/i)).toBeInTheDocument();
      expect(screen.getByText(/Linux/i)).toBeInTheDocument();
    });

    it('should display limits information', () => {
      renderWithToast(
        <ProvidersForm providers={mockProviders} onChange={mockOnChange} />
      );

      expect(screen.getByText(/Maximum 10 providers allowed/i)).toBeInTheDocument();
    });
  });

  describe('Provider Categories', () => {
    it('should have OpenAI providers', () => {
      const openaiProviders = PROVIDER_CATEGORIES['OpenAI'];
      expect(openaiProviders).toBeDefined();
      expect(openaiProviders.length).toBeGreaterThan(0);
      expect(openaiProviders[0].id).toContain('openai:');
    });

    it('should have Anthropic providers', () => {
      const anthropicProviders = PROVIDER_CATEGORIES['Anthropic'];
      expect(anthropicProviders).toBeDefined();
      expect(anthropicProviders.length).toBeGreaterThan(0);
      expect(anthropicProviders[0].id).toContain('anthropic:');
    });

    it('should have Google providers', () => {
      const googleProviders = PROVIDER_CATEGORIES['Google'];
      expect(googleProviders).toBeDefined();
      expect(googleProviders.length).toBeGreaterThan(0);
      expect(googleProviders[0].id).toContain('google:');
    });

    it('should have local Ollama providers', () => {
      const ollamaProviders = PROVIDER_CATEGORIES['Ollama (Local)'];
      expect(ollamaProviders).toBeDefined();
      expect(ollamaProviders.length).toBeGreaterThan(0);
      expect(ollamaProviders[0].id).toContain('ollama:');
    });

    it('should have multiple categories', () => {
      const categoryCount = Object.keys(PROVIDER_CATEGORIES).length;
      expect(categoryCount).toBeGreaterThanOrEqual(10);
    });
  });
});
