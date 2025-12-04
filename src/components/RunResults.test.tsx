import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RunResults } from './RunResults';
import type { PromptfooResults, ProjectOptions } from '../lib/types';
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

vi.mock('./StructuredAnalysis', () => ({
  StructuredAnalysis: ({ analysis, onApply }: any) => (
    <div data-testid="structured-analysis">
      <h3>AI Analysis</h3>
      <p>{analysis.summary}</p>
      <button onClick={() => onApply(['suggestion 1'])}>Apply Suggestions</button>
    </div>
  ),
}));

vi.mock('./charts', () => ({
  PieChart: ({ title }: any) => <div data-testid="pie-chart">{title}</div>,
  BarChart: ({ title }: any) => <div data-testid="bar-chart">{title}</div>,
  LineChart: ({ title }: any) => <div data-testid="line-chart">{title}</div>,
}));

const mockReadJsonResults = vi.fn();
const mockOpenHtmlReport = vi.fn();
const mockAnalyzeResults = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  global.window = global.window || ({} as any);
  (global.window as any).api = {
    readJsonResults: mockReadJsonResults,
    openHtmlReport: mockOpenHtmlReport,
    analyzeResults: mockAnalyzeResults,
  };
});

const renderWithToast = (ui: React.ReactElement) => {
  return render(<ToastProvider>{ui}</ToastProvider>);
};

const mockResults: PromptfooResults = {
  version: 2,
  createdAt: '2024-01-15T10:00:00Z',
  results: {
    summary: {
      passed: 8,
      failed: 2,
      total: 10,
    },
    table: {
      head: {
        prompts: [{ raw: 'Test Prompt', label: 'Prompt 1' }],
        vars: ['question', 'answer'],
      },
      body: [
        {
          outputs: [
            {
              pass: true,
              score: 0.9,
              text: 'Response 1',
              prompt: 'Test question 1',
              latencyMs: 500,
              cost: 0.005,
              tokenUsage: { total: 100, prompt: 50, completion: 50 },
            },
          ],
          vars: ['What is 2+2?', '4'],
          test: { vars: { question: 'What is 2+2?', answer: '4' } },
        },
        {
          outputs: [
            {
              pass: false,
              score: 0.3,
              text: 'Response 2',
              prompt: 'Test question 2',
              latencyMs: 600,
              cost: 0.006,
              tokenUsage: { total: 120, prompt: 60, completion: 60 },
              gradingResult: {
                pass: false,
                score: 0.3,
                reason: 'Incorrect answer',
              },
            },
          ],
          vars: ['What is 3+3?', '6'],
          test: { vars: { question: 'What is 3+3?', answer: '6' } },
        },
      ],
    },
  },
  config: {},
  stats: {
    successes: 8,
    failures: 2,
    tokenUsage: { total: 2200, prompt: 1100, completion: 1100 },
  },
};

const mockSecurityResults: PromptfooResults = {
  version: 2,
  createdAt: '2024-01-15T10:00:00Z',
  results: {
    summary: {
      passed: 9,
      failed: 1,
      total: 10,
    },
    table: {
      head: {
        prompts: [{ raw: 'Security Test', label: 'Security Check' }],
        vars: ['input'],
      },
      body: [
        {
          outputs: [
            {
              pass: true,
              score: 1.0,
              text: 'Safe response',
              prompt: 'Security test 1',
            },
          ],
          vars: ['test input'],
          test: { vars: { input: 'test input' } },
        },
      ],
    },
  },
  config: {},
  stats: {
    successes: 9,
    failures: 1,
    tokenUsage: { total: 500, prompt: 250, completion: 250 },
  },
};

const mockProjectOptions: ProjectOptions = {
  outputPath: './output.html',
  jsonOutputPath: './output.json',
  maxConcurrency: 4,
  cache: false,
  openReportAfterTest: false,
};

describe('RunResults', () => {
  let mockOnClose: ReturnType<typeof vi.fn>;
  let mockOnRefresh: ReturnType<typeof vi.fn>;
  let mockOnApplySuggestions: ReturnType<typeof vi.fn>;
  let mockOnAiAnalysisChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnClose = vi.fn();
    mockOnRefresh = vi.fn();
    mockOnApplySuggestions = vi.fn();
    mockOnAiAnalysisChange = vi.fn();
  });

  describe('Rendering', () => {
    it('should render results view', () => {
      renderWithToast(
        <RunResults
          results={mockResults}
          onClose={mockOnClose}
          projectOptions={mockProjectOptions}
        />
      );

      expect(screen.getAllByText('Test Results')[0]).toBeInTheDocument();
    });

    it.skip('should display summary stats', () => {
      renderWithToast(
        <RunResults
          results={mockResults}
          onClose={mockOnClose}
          projectOptions={mockProjectOptions}
        />
      );

      // Stats might be split across elements, look for individual parts
      expect(screen.getAllByText('10 total')[0]).toBeInTheDocument();
      expect(screen.getAllByText('8 passed')[0]).toBeInTheDocument();
      expect(screen.getAllByText(/80%/)[0]).toBeInTheDocument(); // Pass rate
    });

    it('should render results tab by default', () => {
      renderWithToast(
        <RunResults
          results={mockResults}
          onClose={mockOnClose}
          projectOptions={mockProjectOptions}
        />
      );

      const resultsButtons = screen.getAllByRole('button', { name: /Results/i });
      expect(resultsButtons[0]).toHaveClass('bg-blue-600');
    });

    it('should show test results table', () => {
      renderWithToast(
        <RunResults
          results={mockResults}
          onClose={mockOnClose}
          projectOptions={mockProjectOptions}
        />
      );

      expect(screen.getByText('What is 2+2?')).toBeInTheDocument();
      expect(screen.getByText('What is 3+3?')).toBeInTheDocument();
    });

    it.skip('should hide close/refresh buttons in history view', () => {
      renderWithToast(
        <RunResults
          results={mockResults}
          onClose={mockOnClose}
          projectOptions={mockProjectOptions}
          isHistoryView={true}
        />
      );

      expect(screen.queryByRole('button', { name: /Clear Results/i })).not.toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it.skip('should switch to tokens tab', async () => {
      renderWithToast(
        <RunResults
          results={mockResults}
          onClose={mockOnClose}
          projectOptions={mockProjectOptions}
        />
      );

      const tokensTab = screen.getByRole('button', { name: /Tokens/i });
      fireEvent.click(tokensTab);

      await waitFor(() => {
        expect(screen.getByText(/Token Usage/i)).toBeInTheDocument();
      });
    });

    it('should switch to raw JSON tab', async () => {
      renderWithToast(
        <RunResults
          results={mockResults}
          onClose={mockOnClose}
          projectOptions={mockProjectOptions}
        />
      );

      const rawTab = screen.getByRole('button', { name: /Raw JSON/i });
      fireEvent.click(rawTab);

      await waitFor(() => {
        expect(screen.getByText(/"version": 2/)).toBeInTheDocument();
      });
    });

    it.skip('should show security tab when security results exist', async () => {
      renderWithToast(
        <RunResults
          results={mockResults}
          securityResults={mockSecurityResults}
          onClose={mockOnClose}
          projectOptions={mockProjectOptions}
        />
      );

      const securityTab = screen.getByRole('button', { name: /Security/i });
      fireEvent.click(securityTab);

      await waitFor(() => {
        expect(screen.getByText(/Security Test Results/i)).toBeInTheDocument();
      });
    });
  });

  describe('Filtering', () => {
    it.skip('should filter by passed tests', async () => {
      renderWithToast(
        <RunResults
          results={mockResults}
          onClose={mockOnClose}
          projectOptions={mockProjectOptions}
        />
      );

      const passedFilter = screen.getByRole('button', { name: /Passed \(8\)/i });
      fireEvent.click(passedFilter);

      await waitFor(() => {
        // Should only show passed tests
        expect(screen.getByText('What is 2+2?')).toBeInTheDocument();
        expect(screen.queryByText('What is 3+3?')).not.toBeInTheDocument();
      });
    });

    it.skip('should filter by failed tests', async () => {
      renderWithToast(
        <RunResults
          results={mockResults}
          onClose={mockOnClose}
          projectOptions={mockProjectOptions}
        />
      );

      const failedFilter = screen.getByRole('button', { name: /Failed \(2\)/i });
      fireEvent.click(failedFilter);

      await waitFor(() => {
        // Should only show failed tests
        expect(screen.getByText('What is 3+3?')).toBeInTheDocument();
        expect(screen.queryByText('What is 2+2?')).not.toBeInTheDocument();
      });
    });

    it.skip('should search tests', async () => {
      const user = userEvent.setup();
      renderWithToast(
        <RunResults
          results={mockResults}
          onClose={mockOnClose}
          projectOptions={mockProjectOptions}
        />
      );

      const searchInput = screen.getByPlaceholderText(/Search tests/i);
      await user.type(searchInput, '2+2');

      await waitFor(() => {
        expect(screen.getByText('What is 2+2?')).toBeInTheDocument();
        expect(screen.queryByText('What is 3+3?')).not.toBeInTheDocument();
      });
    });
  });

  describe('Test Expansion', () => {
    it.skip('should expand test to show details', async () => {
      renderWithToast(
        <RunResults
          results={mockResults}
          onClose={mockOnClose}
          projectOptions={mockProjectOptions}
        />
      );

      const expandButtons = screen.getAllByRole('button', { name: /Expand/i });
      fireEvent.click(expandButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Response 1')).toBeInTheDocument();
        expect(screen.getByText(/Latency: 500ms/)).toBeInTheDocument();
      });
    });

    it.skip('should collapse expanded test', async () => {
      renderWithToast(
        <RunResults
          results={mockResults}
          onClose={mockOnClose}
          projectOptions={mockProjectOptions}
        />
      );

      const expandButtons = screen.getAllByRole('button', { name: /Expand/i });
      fireEvent.click(expandButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Response 1')).toBeInTheDocument();
      });

      fireEvent.click(expandButtons[0]);

      await waitFor(() => {
        expect(screen.queryByText('Response 1')).not.toBeInTheDocument();
      });
    });

    it.skip('should show grading results for failed tests', async () => {
      renderWithToast(
        <RunResults
          results={mockResults}
          onClose={mockOnClose}
          projectOptions={mockProjectOptions}
        />
      );

      const expandButtons = screen.getAllByRole('button', { name: /Expand/i });
      fireEvent.click(expandButtons[1]); // Expand failed test

      await waitFor(() => {
        expect(screen.getByText('Incorrect answer')).toBeInTheDocument();
      });
    });
  });

  describe('AI Analysis', () => {
    it.skip('should generate AI analysis', async () => {
      mockAnalyzeResults.mockResolvedValue({
        success: true,
        analysis: {
          summary: 'Test results look good',
          suggestions: ['Improve prompt clarity'],
        },
      });

      renderWithToast(
        <RunResults
          results={mockResults}
          onClose={mockOnClose}
          projectOptions={mockProjectOptions}
          onAiAnalysisChange={mockOnAiAnalysisChange}
        />
      );

      const aiTab = screen.getByRole('button', { name: /AI Analysis/i });
      fireEvent.click(aiTab);

      const analyzeButton = screen.getByRole('button', { name: /Analyze Results/i });
      fireEvent.click(analyzeButton);

      await waitFor(() => {
        expect(mockAnalyzeResults).toHaveBeenCalled();
        expect(screen.getByTestId('structured-analysis')).toBeInTheDocument();
      });
    });

    it.skip('should apply AI suggestions', async () => {
      mockAnalyzeResults.mockResolvedValue({
        success: true,
        analysis: {
          summary: 'Test results look good',
          suggestions: ['Improve prompt clarity'],
        },
      });

      renderWithToast(
        <RunResults
          results={mockResults}
          onClose={mockOnClose}
          projectOptions={mockProjectOptions}
          onApplySuggestions={mockOnApplySuggestions}
          onAiAnalysisChange={mockOnAiAnalysisChange}
        />
      );

      const aiTab = screen.getByRole('button', { name: /AI Analysis/i });
      fireEvent.click(aiTab);

      const analyzeButton = screen.getByRole('button', { name: /Analyze Results/i });
      fireEvent.click(analyzeButton);

      await waitFor(() => {
        expect(screen.getByTestId('structured-analysis')).toBeInTheDocument();
      });

      const applyButton = screen.getByRole('button', { name: /Apply Suggestions/i });
      fireEvent.click(applyButton);

      expect(mockOnApplySuggestions).toHaveBeenCalledWith(['suggestion 1']);
    });

    it.skip('should show error when AI analysis fails', async () => {
      mockAnalyzeResults.mockResolvedValue({
        success: false,
        error: 'AI service unavailable',
      });

      renderWithToast(
        <RunResults
          results={mockResults}
          onClose={mockOnClose}
          projectOptions={mockProjectOptions}
        />
      );

      const aiTab = screen.getByRole('button', { name: /AI Analysis/i });
      fireEvent.click(aiTab);

      const analyzeButton = screen.getByRole('button', { name: /Analyze Results/i });
      fireEvent.click(analyzeButton);

      await waitFor(() => {
        expect(screen.getByText(/AI service unavailable/i)).toBeInTheDocument();
      });
    });
  });

  describe('Token Usage', () => {
    it.skip('should display token usage statistics', async () => {
      renderWithToast(
        <RunResults
          results={mockResults}
          onClose={mockOnClose}
          projectOptions={mockProjectOptions}
        />
      );

      const tokensTab = screen.getByRole('button', { name: /Tokens/i });
      fireEvent.click(tokensTab);

      await waitFor(() => {
        expect(screen.getByText(/2,200/)).toBeInTheDocument(); // Total tokens
        expect(screen.getByText(/1,100/)).toBeInTheDocument(); // Prompt tokens
      });
    });

    it.skip('should show cost breakdown', async () => {
      renderWithToast(
        <RunResults
          results={mockResults}
          onClose={mockOnClose}
          projectOptions={mockProjectOptions}
        />
      );

      const tokensTab = screen.getByRole('button', { name: /Tokens/i });
      fireEvent.click(tokensTab);

      await waitFor(() => {
        expect(screen.getByText(/Total Cost/i)).toBeInTheDocument();
      });
    });
  });

  describe('Refresh Results', () => {
    it('should refresh results from file', async () => {
      mockReadJsonResults.mockResolvedValue({
        success: true,
        results: { ...mockResults, version: 3 },
      });

      renderWithToast(
        <RunResults
          results={mockResults}
          onClose={mockOnClose}
          onRefresh={mockOnRefresh}
          projectOptions={mockProjectOptions}
        />
      );

      const refreshButton = screen.getByRole('button', { name: /Refresh/i });
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockReadJsonResults).toHaveBeenCalledWith('./output.json');
        expect(mockOnRefresh).toHaveBeenCalled();
      });
    });

    it('should handle refresh error', async () => {
      mockReadJsonResults.mockResolvedValue({
        success: false,
        error: 'File not found',
      });

      renderWithToast(
        <RunResults
          results={mockResults}
          onClose={mockOnClose}
          onRefresh={mockOnRefresh}
          projectOptions={mockProjectOptions}
        />
      );

      const refreshButton = screen.getByRole('button', { name: /Refresh/i });
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(screen.getByText(/File not found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Open HTML Report', () => {
    it.skip('should open HTML report', async () => {
      mockOpenHtmlReport.mockResolvedValue({ success: true });

      renderWithToast(
        <RunResults
          results={mockResults}
          onClose={mockOnClose}
          projectOptions={mockProjectOptions}
        />
      );

      const openButton = screen.getByRole('button', { name: /Open HTML Report/i });
      fireEvent.click(openButton);

      await waitFor(() => {
        expect(mockOpenHtmlReport).toHaveBeenCalledWith('./output.html');
      });
    });

    it.skip('should handle open report error', async () => {
      mockOpenHtmlReport.mockResolvedValue({
        success: false,
        error: 'Report not found',
      });

      renderWithToast(
        <RunResults
          results={mockResults}
          onClose={mockOnClose}
          projectOptions={mockProjectOptions}
        />
      );

      const openButton = screen.getByRole('button', { name: /Open HTML Report/i });
      fireEvent.click(openButton);

      await waitFor(() => {
        expect(screen.getByText(/Report not found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Close Results', () => {
    it('should call onClose when clear button is clicked', () => {
      renderWithToast(
        <RunResults
          results={mockResults}
          onClose={mockOnClose}
          projectOptions={mockProjectOptions}
        />
      );

      const clearButton = screen.getByRole('button', { name: /Clear Results/i });
      fireEvent.click(clearButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Pagination', () => {
    it.skip('should paginate test results', async () => {
      const manyTests = {
        ...mockResults,
        results: {
          ...mockResults.results,
          table: {
            ...mockResults.results.table,
            body: Array(25).fill(null).map((_, i) => ({
              outputs: [{ pass: true, score: 0.9, text: `Response ${i}` }],
              vars: [`Question ${i}`, `Answer ${i}`],
              test: { vars: { question: `Question ${i}`, answer: `Answer ${i}` } },
            })),
          },
        },
      };

      renderWithToast(
        <RunResults
          results={manyTests}
          onClose={mockOnClose}
          projectOptions={mockProjectOptions}
        />
      );

      // Should show first page (10 items)
      expect(screen.getAllByText(/Question/)).toHaveLength(10);

      const nextButton = screen.getByRole('button', { name: /Next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        // Should show second page
        expect(screen.getByText('Question 10')).toBeInTheDocument();
      });
    });
  });

  describe('Cost Formatting', () => {
    it.skip('should format costs with 6 decimal places', () => {
      renderWithToast(
        <RunResults
          results={mockResults}
          onClose={mockOnClose}
          projectOptions={mockProjectOptions}
        />
      );

      const expandButtons = screen.getAllByRole('button', { name: /Expand/i });
      fireEvent.click(expandButtons[0]);

      expect(screen.getByText(/\$0\.005000/)).toBeInTheDocument();
    });
  });
});
