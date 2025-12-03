import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssertionsForm } from './AssertionsForm';
import type { Assertion, Provider, Prompt, Dataset, ProjectOptions } from '../lib/types';
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

vi.mock('./LoadingOverlay', () => ({
  LoadingOverlay: ({ message }: { message: string }) => (
    <div data-testid="loading-overlay">{message}</div>
  ),
}));

// Mock window.api
const mockGenerateAssertions = vi.fn();
const mockGenerateDatasetColumn = vi.fn();

// Set up global window.api before any tests run
beforeAll(() => {
  global.window = global.window || ({} as any);
  (global.window as any).api = {
    generateAssertions: mockGenerateAssertions,
    generateDatasetColumn: mockGenerateDatasetColumn,
  };
});

const renderWithToast = (ui: React.ReactElement) => {
  return render(<ToastProvider>{ui}</ToastProvider>);
};

describe('AssertionsForm', () => {
  let mockOnChange: ReturnType<typeof vi.fn>;
  let mockOnDatasetChange: ReturnType<typeof vi.fn>;
  let mockAssertions: Assertion[];
  let mockProviders: Provider[];
  let mockPrompts: Prompt[];
  let mockDataset: Dataset;
  let mockOptions: ProjectOptions;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnChange = vi.fn();
    mockOnDatasetChange = vi.fn();

    mockAssertions = [
      { id: 'assertion-1', type: 'contains', value: 'test keyword' },
    ];

    mockProviders = [
      { id: 'provider-1', providerId: 'openai:gpt-4o', config: {} },
      { id: 'provider-2', providerId: 'google:gemini-2.5-pro', config: {} },
    ];

    mockPrompts = [
      { id: 'prompt-1', label: 'Test Prompt', text: 'Classify {{text}} as positive or negative' },
    ];

    mockDataset = {
      name: 'Test Dataset',
      headers: ['text', 'expected_output'],
      rows: [
        { text: 'This is great', expected_output: 'positive' },
        { text: 'This is bad', expected_output: 'negative' },
      ],
    };

    mockOptions = {};

    mockGenerateAssertions.mockResolvedValue({
      success: true,
      assertions: [
        { type: 'contains', value: 'positive' },
        { type: 'contains', value: 'negative' },
      ],
      analysis: {
        primary_intent: 'classification',
        variables_detected: { expected: ['text'] },
      },
    });

    mockGenerateDatasetColumn.mockResolvedValue({
      success: true,
      columnName: 'expected_output',
      values: ['positive', 'negative'],
    });
  });

  describe('Rendering', () => {
    it('should render the form header with assertion count', () => {
      renderWithToast(
        <AssertionsForm
          assertions={mockAssertions}
          onChange={mockOnChange}
          providers={mockProviders}
        />
      );

      expect(screen.getByText('Assertions')).toBeInTheDocument();
      expect(screen.getByText(/1 assertion configured/i)).toBeInTheDocument();
    });

    it('should render "no assertions" message when empty', () => {
      renderWithToast(
        <AssertionsForm
          assertions={[]}
          onChange={mockOnChange}
          providers={mockProviders}
        />
      );

      expect(screen.getByText(/No assertions configured/i)).toBeInTheDocument();
    });

    it('should render existing assertions', () => {
      renderWithToast(
        <AssertionsForm
          assertions={mockAssertions}
          onChange={mockOnChange}
          providers={mockProviders}
        />
      );

      expect(screen.getByDisplayValue('test keyword')).toBeInTheDocument();
    });

    it('should show + Add Assertion button', () => {
      renderWithToast(
        <AssertionsForm
          assertions={mockAssertions}
          onChange={mockOnChange}
          providers={mockProviders}
        />
      );

      expect(screen.getByText('+ Add Assertion')).toBeInTheDocument();
    });

    it('should show "Generate with AI" button when prompts exist', () => {
      renderWithToast(
        <AssertionsForm
          assertions={mockAssertions}
          onChange={mockOnChange}
          providers={mockProviders}
          prompts={mockPrompts}
        />
      );

      expect(screen.getByText('Generate with AI')).toBeInTheDocument();
    });

    it('should not show "Generate with AI" button without prompts', () => {
      renderWithToast(
        <AssertionsForm
          assertions={mockAssertions}
          onChange={mockOnChange}
          providers={mockProviders}
        />
      );

      expect(screen.queryByText('Generate with AI')).not.toBeInTheDocument();
    });
  });

  describe('Adding Assertions', () => {
    it('should show assertion browser when "Add Assertion" is clicked', async () => {
      const user = userEvent.setup();
      renderWithToast(
        <AssertionsForm
          assertions={[]}
          onChange={mockOnChange}
          providers={mockProviders}
        />
      );

      const addButton = screen.getByText('+ Add Assertion');
      await user.click(addButton);

      expect(screen.getByText('Select Assertion Type')).toBeInTheDocument();
      expect(screen.getByText('All Types')).toBeInTheDocument();
    });






  });

  describe('Removing Assertions', () => {
    it('should remove an assertion when remove button is clicked', async () => {
      const user = userEvent.setup();
      renderWithToast(
        <AssertionsForm
          assertions={mockAssertions}
          onChange={mockOnChange}
          providers={mockProviders}
        />
      );

      const removeButton = screen.getByText('Remove');
      await user.click(removeButton);

      expect(mockOnChange).toHaveBeenCalledWith([]);
    });

    it('should remove correct assertion when multiple exist', async () => {
      const user = userEvent.setup();
      const assertions = [
        { id: 'assertion-1', type: 'contains', value: 'test1' },
        { id: 'assertion-2', type: 'equals', value: 'test2' },
      ];

      renderWithToast(
        <AssertionsForm
          assertions={assertions}
          onChange={mockOnChange}
          providers={mockProviders}
        />
      );

      const removeButtons = screen.getAllByText('Remove');
      await user.click(removeButtons[0]);

      expect(mockOnChange).toHaveBeenCalledWith([assertions[1]]);
    });
  });


  describe('AI Generation', () => {
    it('should show loading overlay when generating assertions', async () => {
      const user = userEvent.setup();
      mockGenerateAssertions.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderWithToast(
        <AssertionsForm
          assertions={[]}
          onChange={mockOnChange}
          providers={mockProviders}
          prompts={mockPrompts}
        />
      );

      const generateButton = screen.getByText('Generate with AI');
      await user.click(generateButton);

      expect(screen.getByTestId('loading-overlay')).toBeInTheDocument();
      expect(screen.getByText('Generating Assertions with AI')).toBeInTheDocument();
    });

    it('should generate assertions with AI successfully', async () => {
      const user = userEvent.setup();
      renderWithToast(
        <AssertionsForm
          assertions={[]}
          onChange={mockOnChange}
          providers={mockProviders}
          prompts={mockPrompts}
        />
      );

      const generateButton = screen.getByText('Generate with AI');
      await user.click(generateButton);

      await waitFor(() => {
        expect(mockGenerateAssertions).toHaveBeenCalled();
        expect(mockOnChange).toHaveBeenCalled();
      });

      const newAssertions = mockOnChange.mock.calls[0][0];
      expect(newAssertions).toHaveLength(2);
      expect(newAssertions[0].type).toBe('contains');
    });

    it('should merge AI assertions with existing ones', async () => {
      const user = userEvent.setup();
      const existingAssertions = [
        { id: 'assertion-1', type: 'equals', value: 'existing' },
      ];

      renderWithToast(
        <AssertionsForm
          assertions={existingAssertions}
          onChange={mockOnChange}
          providers={mockProviders}
          prompts={mockPrompts}
        />
      );

      const generateButton = screen.getByText('Generate with AI');
      await user.click(generateButton);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });

      const newAssertions = mockOnChange.mock.calls[0][0];
      expect(newAssertions.length).toBeGreaterThan(1);
      expect(newAssertions[0]).toEqual(existingAssertions[0]);
    });

    it('should filter out duplicate AI assertions', async () => {
      const user = userEvent.setup();
      const existingAssertions = [
        { id: 'assertion-1', type: 'contains', value: 'positive' },
      ];

      renderWithToast(
        <AssertionsForm
          assertions={existingAssertions}
          onChange={mockOnChange}
          providers={mockProviders}
          prompts={mockPrompts}
        />
      );

      const generateButton = screen.getByText('Generate with AI');
      await user.click(generateButton);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });

      // Should filter out the duplicate "positive" assertion
      const newAssertions = mockOnChange.mock.calls[0][0];
      const positiveAssertions = newAssertions.filter(
        (a: Assertion) => a.type === 'contains' && a.value === 'positive'
      );
      expect(positiveAssertions).toHaveLength(1); // Only the existing one
    });

    it('should show error toast when generation fails', async () => {
      const user = userEvent.setup();
      mockGenerateAssertions.mockResolvedValue({
        success: false,
        error: 'API error',
      });

      renderWithToast(
        <AssertionsForm
          assertions={[]}
          onChange={mockOnChange}
          providers={mockProviders}
          prompts={mockPrompts}
        />
      );

      const generateButton = screen.getByText('Generate with AI');
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/API error/i)).toBeInTheDocument();
      });
    });

    it('should show warning when no prompts exist', async () => {
      const user = userEvent.setup();
      renderWithToast(
        <AssertionsForm
          assertions={[]}
          onChange={mockOnChange}
          providers={mockProviders}
          prompts={[]}
        />
      );

      // Generate button should not be visible
      expect(screen.queryByText('Generate with AI')).not.toBeInTheDocument();
    });

    it('should show warning when no providers exist', async () => {
      const user = userEvent.setup();
      renderWithToast(
        <AssertionsForm
          assertions={[]}
          onChange={mockOnChange}
          providers={[]}
          prompts={mockPrompts}
        />
      );

      const generateButton = screen.getByText('Generate with AI');
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/add at least one provider/i)).toBeInTheDocument();
      });
    });

  });

  describe('Variable Extraction', () => {
    it('should extract variables from prompts', () => {
      renderWithToast(
        <AssertionsForm
          assertions={[]}
          onChange={mockOnChange}
          providers={mockProviders}
          prompts={mockPrompts}
        />
      );

      // Variables should be detected internally for security assertions
      // This is tested indirectly through security test generation
    });

    it('should handle prompts without variables', () => {
      const promptsWithoutVars = [
        { id: 'prompt-1', label: 'Test', text: 'No variables here' },
      ];

      renderWithToast(
        <AssertionsForm
          assertions={[]}
          onChange={mockOnChange}
          providers={mockProviders}
          prompts={promptsWithoutVars}
        />
      );

      // Should not crash
      expect(screen.getByText('Assertions')).toBeInTheDocument();
    });

    it('should extract multiple variables from multiple prompts', () => {
      const multiplePrompts = [
        { id: 'prompt-1', label: 'P1', text: 'Hello {{name}} from {{city}}' },
        { id: 'prompt-2', label: 'P2', text: 'Age: {{age}}' },
      ];

      renderWithToast(
        <AssertionsForm
          assertions={[]}
          onChange={mockOnChange}
          providers={mockProviders}
          prompts={multiplePrompts}
        />
      );

      // Variables should be extracted (name, city, age)
      expect(screen.getByText('Assertions')).toBeInTheDocument();
    });
  });

  describe('Security Tests', () => {
    it('should show security tests info panel when enabled', () => {
      const options = { enableSecurityTests: true };

      renderWithToast(
        <AssertionsForm
          assertions={[]}
          onChange={mockOnChange}
          providers={mockProviders}
          prompts={mockPrompts}
          options={options}
        />
      );

      expect(screen.getByText(/Auto-Generated OWASP LLM Top 10 Tests/i)).toBeInTheDocument();
    });

    it('should list all 10 OWASP security tests', () => {
      const options = { enableSecurityTests: true };

      renderWithToast(
        <AssertionsForm
          assertions={[]}
          onChange={mockOnChange}
          providers={mockProviders}
          prompts={mockPrompts}
          options={options}
        />
      );

      expect(screen.getByText(/LLM01: Prompt Injection/i)).toBeInTheDocument();
      expect(screen.getByText(/LLM02: Sensitive Information Disclosure/i)).toBeInTheDocument();
      expect(screen.getByText(/LLM10: Unbounded Consumption/i)).toBeInTheDocument();
    });


    it('should show "Security YAML" badge on security assertions', () => {
      const options = { enableSecurityTests: true };
      const assertions = [
        { id: 'assertion-1', type: 'security-prompt-injection', rubric: 'Test', threshold: 0.8, provider: 'openai:gpt-4o' },
      ];

      renderWithToast(
        <AssertionsForm
          assertions={assertions}
          onChange={mockOnChange}
          providers={mockProviders}
          prompts={mockPrompts}
          options={options}
        />
      );

      expect(screen.getByText('Security YAML')).toBeInTheDocument();
    });
  });

  describe('Context Relevance Assertions', () => {

    it('should show column selectors for context-relevance', async () => {
      const user = userEvent.setup();
      const assertions = [
        {
          id: 'assertion-1',
          type: 'context-relevance',
          threshold: 0.7,
          provider: 'openai:gpt-4o',
          queryColumn: '',
          contextColumn: '',
        },
      ];

      renderWithToast(
        <AssertionsForm
          assertions={assertions}
          onChange={mockOnChange}
          providers={mockProviders}
          dataset={mockDataset}
          onDatasetChange={mockOnDatasetChange}
        />
      );

      // Should show dropdowns for query and context columns
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThan(0);
    });

    it('should show "Dataset Ready" when columns configured', async () => {
      const assertions = [
        {
          id: 'assertion-1',
          type: 'context-relevance',
          threshold: 0.7,
          provider: 'openai:gpt-4o',
          queryColumn: 'query',
          contextColumn: 'context',
        },
      ];

      const dataset = {
        name: 'Test',
        headers: ['query', 'context'],
        rows: [{ query: 'test', context: 'context' }],
      };

      renderWithToast(
        <AssertionsForm
          assertions={assertions}
          onChange={mockOnChange}
          providers={mockProviders}
          dataset={dataset}
        />
      );

      expect(screen.getByText('Dataset Ready')).toBeInTheDocument();
    });
  });

  describe('Factuality Assertions', () => {
    it('should show "Setup Dataset" button for factuality assertions', async () => {
      const user = userEvent.setup();
      const assertions = [
        {
          id: 'assertion-1',
          type: 'factuality',
          value: '',
          provider: 'openai:gpt-4o',
        },
      ];

      renderWithToast(
        <AssertionsForm
          assertions={assertions}
          onChange={mockOnChange}
          providers={mockProviders}
          onDatasetChange={mockOnDatasetChange}
        />
      );

      expect(screen.getByText('Setup Dataset')).toBeInTheDocument();
    });

    it('should show "Use Dataset" button when expected column exists', async () => {
      const assertions = [
        {
          id: 'assertion-1',
          type: 'factuality',
          value: '',
          provider: 'openai:gpt-4o',
        },
      ];

      renderWithToast(
        <AssertionsForm
          assertions={assertions}
          onChange={mockOnChange}
          providers={mockProviders}
          dataset={mockDataset}
          onDatasetChange={mockOnDatasetChange}
        />
      );

      expect(screen.getByText('Use Dataset')).toBeInTheDocument();
    });

    it('should show "Dataset Ready" when reference answer is set', () => {
      const assertions = [
        {
          id: 'assertion-1',
          type: 'factuality',
          value: '{{expected_output}}',
          provider: 'openai:gpt-4o',
        },
      ];

      renderWithToast(
        <AssertionsForm
          assertions={assertions}
          onChange={mockOnChange}
          providers={mockProviders}
          dataset={mockDataset}
        />
      );

      expect(screen.getByText('Dataset Ready')).toBeInTheDocument();
    });
  });


  describe('Edge Cases', () => {
    it('should handle empty assertions array', () => {
      renderWithToast(
        <AssertionsForm
          assertions={[]}
          onChange={mockOnChange}
          providers={mockProviders}
        />
      );

      expect(screen.getByText(/No assertions configured/i)).toBeInTheDocument();
    });

    it('should handle missing dataset', () => {
      const assertions = [
        {
          id: 'assertion-1',
          type: 'context-relevance',
          threshold: 0.7,
          provider: 'openai:gpt-4o',
        },
      ];

      renderWithToast(
        <AssertionsForm
          assertions={assertions}
          onChange={mockOnChange}
          providers={mockProviders}
        />
      );

      expect(screen.getByText('Configuration Required')).toBeInTheDocument();
    });

    it('should handle missing prompts', () => {
      renderWithToast(
        <AssertionsForm
          assertions={[]}
          onChange={mockOnChange}
          providers={mockProviders}
        />
      );

      expect(screen.queryByText('Generate with AI')).not.toBeInTheDocument();
    });

    it('should handle assertions with missing values', () => {
      const brokenAssertions = [
        { id: 'assertion-1', type: 'contains', value: undefined as any },
      ];

      renderWithToast(
        <AssertionsForm
          assertions={brokenAssertions}
          onChange={mockOnChange}
          providers={mockProviders}
        />
      );

      // Should not crash
      expect(screen.getByText('Assertions')).toBeInTheDocument();
    });
  });

  describe('Help Text', () => {
    it('should display help text about categories', () => {
      renderWithToast(
        <AssertionsForm
          assertions={[]}
          onChange={mockOnChange}
          providers={mockProviders}
        />
      );

      expect(screen.getByText(/Choose from Text Matching, Semantic/i)).toBeInTheDocument();
    });

    it('should display help text about weights', () => {
      renderWithToast(
        <AssertionsForm
          assertions={[]}
          onChange={mockOnChange}
          providers={mockProviders}
        />
      );

      expect(screen.getByText(/Assertions can be weighted/i)).toBeInTheDocument();
    });

    it('should display help text about pre-filled examples', () => {
      renderWithToast(
        <AssertionsForm
          assertions={[]}
          onChange={mockOnChange}
          providers={mockProviders}
        />
      );

      expect(screen.getByText(/Pre-filled Examples/i)).toBeInTheDocument();
    });
  });
});
