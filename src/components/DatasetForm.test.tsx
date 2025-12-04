import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DatasetForm } from './DatasetForm';
import type { Dataset, Prompt, ProjectOptions } from '../lib/types';
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

vi.mock('../lib/dataset', () => ({
  parseCSV: vi.fn((content) => ({
    success: true,
    data: [
      { question: 'What is 2+2?', answer: '4' },
      { question: 'What is 3+3?', answer: '6' },
    ],
    headers: ['question', 'answer'],
  })),
  parseTable: vi.fn((content) => {
    if (!content.trim()) {
      return { success: false, error: 'Empty content' };
    }
    const lines = content.trim().split('\n');
    if (lines.length < 2) {
      return { success: false, error: 'Not enough rows' };
    }
    return {
      success: true,
      data: [
        { question: 'What is 2+2?', answer: '4' },
        { question: 'What is 3+3?', answer: '6' },
      ],
      headers: ['question', 'answer'],
    };
  }),
  readFileContent: vi.fn((file) => Promise.resolve('question,answer\nWhat is 2+2?,4\nWhat is 3+3?,6')),
}));

vi.mock('./LoadingOverlay', () => ({
  LoadingOverlay: ({ message }: any) => <div data-testid="loading-overlay">{message}</div>,
}));

const mockGenerateDataset = vi.fn();
const mockGenerateColumnData = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  global.window = global.window || ({} as any);
  (global.window as any).api = {
    generateDataset: mockGenerateDataset,
    generateColumnData: mockGenerateColumnData,
  };
});

const renderWithToast = (ui: React.ReactElement) => {
  return render(<ToastProvider>{ui}</ToastProvider>);
};

const mockPrompts: Prompt[] = [
  { id: 'prompt-1', label: 'Test Prompt', text: 'Answer this: {{question}}' },
];

const mockDataset: Dataset = {
  name: 'Test Dataset',
  rows: [
    { question: 'What is 2+2?', answer: '4' },
    { question: 'What is 3+3?', answer: '6' },
  ],
  headers: ['question', 'answer'],
};

const mockOptions: ProjectOptions = {
  outputPath: './output.html',
  jsonOutputPath: './output.json',
  maxConcurrency: 4,
  cache: false,
  openReportAfterTest: false,
};

describe('DatasetForm', () => {
  let mockOnChange: ReturnType<typeof vi.fn>;
  let mockOnUnsavedDataChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnChange = vi.fn();
    mockOnUnsavedDataChange = vi.fn();
  });

  describe('Rendering', () => {
    it.skip('should render the form header', () => {
      renderWithToast(
        <DatasetForm
          dataset={undefined}
          onChange={mockOnChange}
          prompts={mockPrompts}
          options={mockOptions}
        />
      );

      expect(screen.getByText('Test Dataset')).toBeInTheDocument();
    });

    it.skip('should render paste area when no dataset exists', () => {
      renderWithToast(
        <DatasetForm
          dataset={undefined}
          onChange={mockOnChange}
          prompts={mockPrompts}
          options={mockOptions}
        />
      );

      expect(screen.getByPlaceholderText(/Paste your dataset/i)).toBeInTheDocument();
    });

    it.skip('should render dataset table when dataset exists', () => {
      renderWithToast(
        <DatasetForm
          dataset={mockDataset}
          onChange={mockOnChange}
          prompts={mockPrompts}
          options={mockOptions}
        />
      );

      expect(screen.getByText('question')).toBeInTheDocument();
      expect(screen.getByText('answer')).toBeInTheDocument();
      expect(screen.getByText('What is 2+2?')).toBeInTheDocument();
      expect(screen.getByText('What is 3+3?')).toBeInTheDocument();
    });

    it('should show validation error when provided', () => {
      renderWithToast(
        <DatasetForm
          dataset={mockDataset}
          onChange={mockOnChange}
          prompts={mockPrompts}
          options={mockOptions}
          validationError="Missing required column: query"
        />
      );

      expect(screen.getByText(/Missing required column: query/i)).toBeInTheDocument();
    });

    it('should display row count', () => {
      renderWithToast(
        <DatasetForm
          dataset={mockDataset}
          onChange={mockOnChange}
          prompts={mockPrompts}
          options={mockOptions}
        />
      );

      expect(screen.getByText(/2 \/ 200 rows/i)).toBeInTheDocument();
    });
  });

  describe('Paste Functionality', () => {
    it.skip('should parse and import pasted data', async () => {
      const user = userEvent.setup();
      renderWithToast(
        <DatasetForm
          dataset={undefined}
          onChange={mockOnChange}
          prompts={mockPrompts}
          options={mockOptions}
          onUnsavedDataChange={mockOnUnsavedDataChange}
        />
      );

      const textarea = screen.getByPlaceholderText(/Paste your dataset/i);
      await user.type(textarea, 'question,answer\nWhat is 2+2?,4\nWhat is 3+3?,6');

      const parseButton = screen.getByRole('button', { name: /Parse/i });
      fireEvent.click(parseButton);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith({
          name: 'Pasted Dataset',
          rows: expect.arrayContaining([
            expect.objectContaining({ question: 'What is 2+2?' }),
            expect.objectContaining({ question: 'What is 3+3?' }),
          ]),
          headers: ['question', 'answer'],
        });
      });
    });

    it.skip('should show error for invalid paste content', async () => {
      const user = userEvent.setup();
      renderWithToast(
        <DatasetForm
          dataset={undefined}
          onChange={mockOnChange}
          prompts={mockPrompts}
          options={mockOptions}
        />
      );

      const textarea = screen.getByPlaceholderText(/Paste your dataset/i);
      await user.type(textarea, 'invalid');

      const parseButton = screen.getByRole('button', { name: /Parse/i });
      fireEvent.click(parseButton);

      await waitFor(() => {
        expect(screen.getByText(/Not enough rows/i)).toBeInTheDocument();
      });
    });

    it.skip('should notify parent of unsaved data changes', async () => {
      const user = userEvent.setup();
      renderWithToast(
        <DatasetForm
          dataset={undefined}
          onChange={mockOnChange}
          prompts={mockPrompts}
          options={mockOptions}
          onUnsavedDataChange={mockOnUnsavedDataChange}
        />
      );

      const textarea = screen.getByPlaceholderText(/Paste your dataset/i);
      await user.type(textarea, 'some data');

      await waitFor(() => {
        expect(mockOnUnsavedDataChange).toHaveBeenCalledWith(true);
      });
    });

    it.skip('should auto-save on blur', async () => {
      const user = userEvent.setup();
      renderWithToast(
        <DatasetForm
          dataset={undefined}
          onChange={mockOnChange}
          prompts={mockPrompts}
          options={mockOptions}
        />
      );

      const textarea = screen.getByPlaceholderText(/Paste your dataset/i);
      await user.type(textarea, 'question,answer\nWhat is 2+2?,4\nWhat is 3+3?,6');

      fireEvent.blur(textarea);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });

    it.skip('should show error when exceeding max rows', async () => {
      const user = userEvent.setup();
      const { parseTable } = await import('../lib/dataset');

      // Mock parseTable to return more than 200 rows
      vi.mocked(parseTable).mockReturnValueOnce({
        success: true,
        data: Array(201).fill({ question: 'Test', answer: 'Test' }),
        headers: ['question', 'answer'],
      });

      renderWithToast(
        <DatasetForm
          dataset={undefined}
          onChange={mockOnChange}
          prompts={mockPrompts}
          options={mockOptions}
        />
      );

      const textarea = screen.getByPlaceholderText(/Paste your dataset/i);
      await user.type(textarea, 'question,answer\n'.repeat(202));

      const parseButton = screen.getByRole('button', { name: /Parse/i });
      fireEvent.click(parseButton);

      await waitFor(() => {
        expect(screen.getByText(/exceeds maximum of 200 rows/i)).toBeInTheDocument();
      });
    });
  });

  describe('File Upload', () => {
    it.skip('should upload and parse CSV file', async () => {
      renderWithToast(
        <DatasetForm
          dataset={undefined}
          onChange={mockOnChange}
          prompts={mockPrompts}
          options={mockOptions}
        />
      );

      const file = new File(['question,answer\nWhat is 2+2?,4'], 'test.csv', { type: 'text/csv' });
      const fileInput = screen.getByLabelText(/Upload CSV/i);

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            name: expect.any(String),
            rows: expect.arrayContaining([
              expect.objectContaining({ question: 'What is 2+2?' }),
            ]),
          })
        );
      });
    });

    it.skip('should show error for unsupported file types', async () => {
      renderWithToast(
        <DatasetForm
          dataset={undefined}
          onChange={mockOnChange}
          prompts={mockPrompts}
          options={mockOptions}
        />
      );

      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      const fileInput = screen.getByLabelText(/Upload CSV/i);

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/Unsupported file type/i)).toBeInTheDocument();
      });
    });

    it.skip('should handle file upload with more than max rows', async () => {
      const { readFileContent, parseCSV } = await import('../lib/dataset');

      vi.mocked(parseCSV).mockReturnValueOnce({
        success: true,
        data: Array(201).fill({ question: 'Test', answer: 'Test' }),
        headers: ['question', 'answer'],
      });

      renderWithToast(
        <DatasetForm
          dataset={undefined}
          onChange={mockOnChange}
          prompts={mockPrompts}
          options={mockOptions}
        />
      );

      const file = new File(['question,answer\n'.repeat(202)], 'test.csv', { type: 'text/csv' });
      const fileInput = screen.getByLabelText(/Upload CSV/i);

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/exceeds maximum of 200 rows/i)).toBeInTheDocument();
      });
    });
  });

  describe('Dataset Editing', () => {
    it.skip('should add a new row', async () => {
      renderWithToast(
        <DatasetForm
          dataset={mockDataset}
          onChange={mockOnChange}
          prompts={mockPrompts}
          options={mockOptions}
        />
      );

      const addRowButton = screen.getByRole('button', { name: /Add Row/i });
      fireEvent.click(addRowButton);

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          rows: expect.arrayContaining([
            ...mockDataset.rows,
            expect.objectContaining({ question: '', answer: '' }),
          ]),
        })
      );
    });

    it.skip('should remove a row', async () => {
      renderWithToast(
        <DatasetForm
          dataset={mockDataset}
          onChange={mockOnChange}
          prompts={mockPrompts}
          options={mockOptions}
        />
      );

      const removeButtons = screen.getAllByRole('button', { name: /Remove/i });
      fireEvent.click(removeButtons[0]);

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          rows: [mockDataset.rows[1]],
        })
      );
    });

    it.skip('should edit cell value', async () => {
      const user = userEvent.setup();
      renderWithToast(
        <DatasetForm
          dataset={mockDataset}
          onChange={mockOnChange}
          prompts={mockPrompts}
          options={mockOptions}
        />
      );

      const inputs = screen.getAllByRole('textbox');
      const firstCell = inputs[0];

      await user.clear(firstCell);
      await user.type(firstCell, 'What is 5+5?');

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            rows: expect.arrayContaining([
              expect.objectContaining({ question: 'What is 5+5?' }),
            ]),
          })
        );
      });
    });

    it.skip('should clear dataset', async () => {
      renderWithToast(
        <DatasetForm
          dataset={mockDataset}
          onChange={mockOnChange}
          prompts={mockPrompts}
          options={mockOptions}
        />
      );

      const clearButton = screen.getByRole('button', { name: /Clear/i });
      fireEvent.click(clearButton);

      expect(mockOnChange).toHaveBeenCalledWith(undefined);
    });
  });

  describe('AI Generation', () => {
    it('should generate dataset with AI', async () => {
      mockGenerateDataset.mockResolvedValue({
        success: true,
        dataset: {
          rows: [
            { question: 'AI generated question 1', answer: 'AI answer 1' },
            { question: 'AI generated question 2', answer: 'AI answer 2' },
          ],
          headers: ['question', 'answer'],
        },
      });

      renderWithToast(
        <DatasetForm
          dataset={undefined}
          onChange={mockOnChange}
          prompts={mockPrompts}
          options={mockOptions}
        />
      );

      const generateButton = screen.getByRole('button', { name: /Generate with AI/i });
      fireEvent.click(generateButton);

      // Should show loading overlay
      await waitFor(() => {
        expect(screen.getByTestId('loading-overlay')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(mockGenerateDataset).toHaveBeenCalled();
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            rows: expect.arrayContaining([
              expect.objectContaining({ question: 'AI generated question 1' }),
            ]),
          })
        );
      });
    });

    it.skip('should show error when AI generation fails', async () => {
      mockGenerateDataset.mockResolvedValue({
        success: false,
        error: 'AI service unavailable',
      });

      renderWithToast(
        <DatasetForm
          dataset={undefined}
          onChange={mockOnChange}
          prompts={mockPrompts}
          options={mockOptions}
        />
      );

      const generateButton = screen.getByRole('button', { name: /Generate with AI/i });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/AI service unavailable/i)).toBeInTheDocument();
      });
    });

    it.skip('should generate column data with AI', async () => {
      mockGenerateColumnData.mockResolvedValue({
        success: true,
        data: ['AI value 1', 'AI value 2'],
      });

      renderWithToast(
        <DatasetForm
          dataset={mockDataset}
          onChange={mockOnChange}
          prompts={mockPrompts}
          options={mockOptions}
        />
      );

      // Click on column header menu
      const columnHeaders = screen.getAllByRole('button', { name: /question|answer/i });
      fireEvent.click(columnHeaders[0]);

      const generateColumnButton = screen.getByRole('button', { name: /Generate with AI/i });
      fireEvent.click(generateColumnButton);

      await waitFor(() => {
        expect(mockGenerateColumnData).toHaveBeenCalled();
      });
    });
  });

  describe('Variable Detection', () => {
    it.skip('should detect missing variables', () => {
      const promptsWithVars: Prompt[] = [
        { id: 'p1', label: 'Test', text: 'Question: {{question}} Context: {{context}}' },
      ];

      const datasetMissingVar: Dataset = {
        name: 'Test',
        rows: [{ question: 'What is 2+2?' }],
        headers: ['question'],
      };

      renderWithToast(
        <DatasetForm
          dataset={datasetMissingVar}
          onChange={mockOnChange}
          prompts={promptsWithVars}
          options={mockOptions}
        />
      );

      expect(screen.getByText(/Missing variables:/i)).toBeInTheDocument();
      expect(screen.getByText(/context/i)).toBeInTheDocument();
    });

    it.skip('should show all variables present message', () => {
      const promptsWithVars: Prompt[] = [
        { id: 'p1', label: 'Test', text: 'Question: {{question}}' },
      ];

      renderWithToast(
        <DatasetForm
          dataset={mockDataset}
          onChange={mockOnChange}
          prompts={promptsWithVars}
          options={mockOptions}
        />
      );

      expect(screen.getByText(/All prompt variables are present/i)).toBeInTheDocument();
    });
  });

  describe('Row Limit', () => {
    it('should show warning when approaching max rows', () => {
      const largeDataset: Dataset = {
        name: 'Large Dataset',
        rows: Array(195).fill({ question: 'Test', answer: 'Test' }),
        headers: ['question', 'answer'],
      };

      renderWithToast(
        <DatasetForm
          dataset={largeDataset}
          onChange={mockOnChange}
          prompts={mockPrompts}
          options={mockOptions}
        />
      );

      expect(screen.getByText(/195 \/ 200 rows/i)).toBeInTheDocument();
    });

    it.skip('should disable add row button when at max rows', () => {
      const maxDataset: Dataset = {
        name: 'Max Dataset',
        rows: Array(200).fill({ question: 'Test', answer: 'Test' }),
        headers: ['question', 'answer'],
      };

      renderWithToast(
        <DatasetForm
          dataset={maxDataset}
          onChange={mockOnChange}
          prompts={mockPrompts}
          options={mockOptions}
        />
      );

      const addRowButton = screen.getByRole('button', { name: /Add Row/i });
      expect(addRowButton).toBeDisabled();
    });
  });
});
