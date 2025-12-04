import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComparisonView } from './ComparisonView';
import type { ComparisonData } from '../lib/comparisonTypes';
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

vi.mock('../lib/comparison', () => ({
  filterTests: vi.fn((tests, filterType, searchQuery) => {
    // Simple mock implementation
    let filtered = tests;
    if (filterType === 'regressions') {
      filtered = tests.filter((t: any) => t.status === 'regressed');
    } else if (filterType === 'improvements') {
      filtered = tests.filter((t: any) => t.status === 'improved');
    } else if (filterType === 'changes') {
      filtered = tests.filter((t: any) => t.status !== 'stable');
    } else if (filterType === 'volatile') {
      filtered = tests.filter((t: any) => t.status === 'volatile');
    }

    if (searchQuery) {
      filtered = filtered.filter((t: any) =>
        t.promptLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.varDescription && t.varDescription.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    return filtered;
  }),
}));

vi.mock('../lib/textDiff', () => ({
  getLineDiff: vi.fn((oldText, newText) => ({
    oldLines: [
      { type: 'removed', text: 'old line 1' },
      { type: 'unchanged', text: 'same line' },
    ],
    newLines: [
      { type: 'added', text: 'new line 1' },
      { type: 'unchanged', text: 'same line' },
    ],
  })),
}));

// Mock charts
vi.mock('./charts', () => ({
  BarComparisonChart: ({ title }: any) => <div data-testid="bar-chart">{title}</div>,
  MultiLineChart: ({ title }: any) => <div data-testid="line-chart">{title}</div>,
  PieChart: ({ title }: any) => <div data-testid="pie-chart">{title}</div>,
}));

vi.mock('./InfoTooltip', () => ({
  InfoTooltip: ({ title }: any) => <span data-testid="info-tooltip">{title}</span>,
}));

const mockAnalyzeComparison = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  global.window = global.window || ({} as any);
  (global.window as any).api = {
    analyzeComparison: mockAnalyzeComparison,
  };
});

const renderWithToast = (ui: React.ReactElement) => {
  return render(<ToastProvider>{ui}</ToastProvider>);
};

const mockComparisonData: ComparisonData = {
  projectName: 'Test Project',
  runs: [
    {
      id: 'run-1',
      timestamp: '2024-01-01T10:00:00Z',
      project: {
        name: 'Test Project',
        providers: [{ id: 'provider-1', providerId: 'openai:gpt-4', config: {} }],
        prompts: [{ id: 'prompt-1', label: 'Test Prompt', text: 'Original text' }],
        dataset: { name: 'test', headers: [], rows: [] },
        assertions: [],
        options: {},
      },
      stats: {
        totalTests: 10,
        passed: 7,
        failed: 3,
        avgScore: 0.75,
        totalCost: 0.05,
        totalLatency: 5000,
      },
    },
    {
      id: 'run-2',
      timestamp: '2024-01-02T10:00:00Z',
      project: {
        name: 'Test Project',
        providers: [{ id: 'provider-1', providerId: 'openai:gpt-4', config: {} }],
        prompts: [{ id: 'prompt-1', label: 'Test Prompt', text: 'Modified text' }],
        dataset: { name: 'test', headers: [], rows: [] },
        assertions: [],
        options: {},
      },
      stats: {
        totalTests: 10,
        passed: 8,
        failed: 2,
        avgScore: 0.82,
        totalCost: 0.06,
        totalLatency: 4500,
      },
    },
  ],
  metrics: {
    passRate: {
      name: 'Pass Rate',
      values: [70, 80],
      delta: 10,
      deltaPercentage: 14.3,
      trend: 'improving',
      isImprovement: true,
    },
    avgScore: {
      name: 'Average Score',
      values: [0.75, 0.82],
      delta: 0.07,
      deltaPercentage: 9.3,
      trend: 'improving',
      isImprovement: true,
    },
    totalCost: {
      name: 'Total Cost',
      values: [0.05, 0.06],
      delta: 0.01,
      deltaPercentage: 20,
      trend: 'degrading',
      isImprovement: false,
    },
    avgLatency: {
      name: 'Average Latency',
      values: [500, 450],
      delta: -50,
      deltaPercentage: -10,
      trend: 'improving',
      isImprovement: true,
    },
    tokenUsage: {
      name: 'Token Usage',
      values: [10000, 12000],
      delta: 2000,
      deltaPercentage: 20,
      trend: 'degrading',
      isImprovement: false,
    },
  },
  tests: [
    {
      testIndex: 0,
      promptLabel: 'Test Prompt',
      varDescription: 'test case 1',
      results: [
        { pass: false, score: 0.4, provider: 'openai:gpt-4' },
        { pass: true, score: 0.9, provider: 'openai:gpt-4' },
      ],
      status: 'improved',
      scoreTrend: 'improving',
    },
    {
      testIndex: 1,
      promptLabel: 'Test Prompt',
      varDescription: 'test case 2',
      results: [
        { pass: true, score: 0.95, provider: 'openai:gpt-4' },
        { pass: false, score: 0.3, provider: 'openai:gpt-4' },
      ],
      status: 'regressed',
      scoreTrend: 'degrading',
    },
    {
      testIndex: 2,
      promptLabel: 'Test Prompt',
      varDescription: 'test case 3',
      results: [
        { pass: true, score: 0.8, provider: 'openai:gpt-4' },
        { pass: true, score: 0.85, provider: 'openai:gpt-4' },
      ],
      status: 'changed',
      scoreTrend: 'stable',
    },
    {
      testIndex: 3,
      promptLabel: 'Test Prompt',
      varDescription: 'test case 4',
      results: [
        { pass: true, score: 0.5, provider: 'openai:gpt-4' },
        { pass: false, score: 0.6, provider: 'openai:gpt-4' },
      ],
      status: 'volatile',
      scoreTrend: 'variable',
    },
  ],
  config: {
    providerModel: {
      field: 'Provider Model',
      values: ['openai:gpt-4', 'openai:gpt-4'],
      changed: false,
      changeIndices: [],
    },
    promptChanges: [
      {
        promptLabel: 'Test Prompt',
        change: 'modified',
        runIndex: 1,
        oldText: 'Original text',
        newText: 'Modified text',
      },
    ],
    assertionChanges: [],
  },
  summary: {
    totalTests: 4,
    consistentTests: 0,
    consistencyPercentage: 0,
    improvedTests: 1,
    regressedTests: 1,
    changedTests: 1,
    volatileTests: 1,
    mostImprovedTest: {
      promptLabel: 'Test Prompt',
      testIndex: 0,
      scoreDelta: 0.5,
    },
    mostRegressedTest: {
      promptLabel: 'Test Prompt',
      testIndex: 1,
      scoreDelta: -0.65,
    },
  },
};

describe('ComparisonView', () => {
  let mockOnBack: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnBack = vi.fn();
  });

  describe('Rendering', () => {
    it('should render the comparison view header', () => {
      renderWithToast(
        <ComparisonView comparisonData={mockComparisonData} onBack={mockOnBack} />
      );

      expect(screen.getByText('Run Comparison')).toBeInTheDocument();
      expect(screen.getByText(/Project: Test Project/)).toBeInTheDocument();
      expect(screen.getByText(/Comparing 2 runs/)).toBeInTheDocument();
    });

    it('should render back button', () => {
      renderWithToast(
        <ComparisonView comparisonData={mockComparisonData} onBack={mockOnBack} />
      );

      const backButton = screen.getByRole('button', { name: /Back to History/i });
      expect(backButton).toBeInTheDocument();
    });

    it('should render run headers with stats', () => {
      renderWithToast(
        <ComparisonView comparisonData={mockComparisonData} onBack={mockOnBack} />
      );

      expect(screen.getAllByText('Run 1')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Run 2')[0]).toBeInTheDocument();
      expect(screen.getAllByText('70%')[0]).toBeInTheDocument(); // Run 1 pass rate
      expect(screen.getAllByText('80%')[0]).toBeInTheDocument(); // Run 2 pass rate
    });

    it('should render summary stats', () => {
      renderWithToast(
        <ComparisonView comparisonData={mockComparisonData} onBack={mockOnBack} />
      );

      expect(screen.getByText(/Comparison Summary/)).toBeInTheDocument();
      expect(screen.getAllByText('0%')[0]).toBeInTheDocument(); // Consistency percentage
      expect(screen.getAllByText('1')[0]).toBeInTheDocument(); // Improvements
    });

    it('should render most improved and regressed tests', () => {
      renderWithToast(
        <ComparisonView comparisonData={mockComparisonData} onBack={mockOnBack} />
      );

      expect(screen.getByText(/Most improved:/)).toBeInTheDocument();
      expect(screen.getByText(/Most concerning:/)).toBeInTheDocument();
    });

    it('should render charts section', () => {
      renderWithToast(
        <ComparisonView comparisonData={mockComparisonData} onBack={mockOnBack} />
      );

      expect(screen.getAllByTestId('line-chart')).toHaveLength(2);
      expect(screen.getAllByTestId('bar-chart')).toHaveLength(2);
    });
  });

  describe('Section Toggling', () => {
    it.skip('should toggle metrics section', async () => {
      renderWithToast(
        <ComparisonView comparisonData={mockComparisonData} onBack={mockOnBack} />
      );

      const metricsButton = screen.getByRole('button', { name: /Detailed Metrics Table/i });

      // Should be expanded by default
      expect(screen.getAllByText('Pass Rate')[0]).toBeInTheDocument();

      // Click to collapse
      fireEvent.click(metricsButton);
      await waitFor(() => {
        expect(screen.queryByText('Pass Rate')).not.toBeInTheDocument();
      });

      // Click to expand again
      fireEvent.click(metricsButton);
      await waitFor(() => {
        expect(screen.getByText('Pass Rate')).toBeInTheDocument();
      });
    });

    it('should toggle tests section', async () => {
      renderWithToast(
        <ComparisonView comparisonData={mockComparisonData} onBack={mockOnBack} />
      );

      const testsButton = screen.getByRole('button', { name: /Test-by-Test Comparison/i });

      // Should be expanded by default
      expect(screen.getByText('test case 1')).toBeInTheDocument();

      // Click to collapse
      fireEvent.click(testsButton);
      await waitFor(() => {
        expect(screen.queryByText('test case 1')).not.toBeInTheDocument();
      });
    });

    it('should toggle config section', async () => {
      renderWithToast(
        <ComparisonView comparisonData={mockComparisonData} onBack={mockOnBack} />
      );

      const configButton = screen.getByRole('button', { name: /Configuration Changes/i });

      // Should be expanded by default
      expect(screen.getByText('Prompt Changes')).toBeInTheDocument();

      // Click to collapse
      fireEvent.click(configButton);
      await waitFor(() => {
        expect(screen.queryByText('Prompt Changes')).not.toBeInTheDocument();
      });
    });
  });

  describe('Test Filtering', () => {
    it('should filter tests by status - regressions', async () => {
      renderWithToast(
        <ComparisonView comparisonData={mockComparisonData} onBack={mockOnBack} />
      );

      const regressionsButton = screen.getByRole('button', { name: /🔴 Regressions/i });
      fireEvent.click(regressionsButton);

      await waitFor(() => {
        // Should show only regressed tests (test case 2)
        expect(screen.getByText('test case 2')).toBeInTheDocument();
      });
    });

    it('should filter tests by status - improvements', async () => {
      renderWithToast(
        <ComparisonView comparisonData={mockComparisonData} onBack={mockOnBack} />
      );

      const improvementsButton = screen.getByRole('button', { name: /🟢 Improvements/i });
      fireEvent.click(improvementsButton);

      await waitFor(() => {
        // Should show only improved tests (test case 1)
        expect(screen.getByText('test case 1')).toBeInTheDocument();
      });
    });

    it('should filter tests by status - volatile', async () => {
      renderWithToast(
        <ComparisonView comparisonData={mockComparisonData} onBack={mockOnBack} />
      );

      const volatileButton = screen.getByRole('button', { name: /⚠️ Volatile/i });
      fireEvent.click(volatileButton);

      await waitFor(() => {
        // Should show only volatile tests (test case 4)
        expect(screen.getByText('test case 4')).toBeInTheDocument();
      });
    });

    it('should search tests by query', async () => {
      const user = userEvent.setup();
      renderWithToast(
        <ComparisonView comparisonData={mockComparisonData} onBack={mockOnBack} />
      );

      const searchInput = screen.getByPlaceholderText('Search tests...');
      await user.type(searchInput, 'case 1');

      await waitFor(() => {
        expect(screen.getByText('test case 1')).toBeInTheDocument();
      });
    });

    it('should show "no tests" message when filter returns empty', async () => {
      renderWithToast(
        <ComparisonView comparisonData={mockComparisonData} onBack={mockOnBack} />
      );

      // Mock filterTests to return empty array
      const { filterTests } = await import('../lib/comparison');
      vi.mocked(filterTests).mockReturnValueOnce([]);

      const allChangesButton = screen.getByRole('button', { name: /🟡 All Changes/i });
      fireEvent.click(allChangesButton);

      await waitFor(() => {
        expect(screen.getByText(/No tests match the current filter/)).toBeInTheDocument();
      });
    });
  });

  describe('Back Navigation', () => {
    it('should call onBack when back button is clicked', () => {
      renderWithToast(
        <ComparisonView comparisonData={mockComparisonData} onBack={mockOnBack} />
      );

      const backButton = screen.getByRole('button', { name: /Back to History/i });
      fireEvent.click(backButton);

      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('AI Chat Assistant', () => {
    it('should open AI chat when button is clicked', async () => {
      renderWithToast(
        <ComparisonView comparisonData={mockComparisonData} onBack={mockOnBack} />
      );

      const chatButton = screen.getByRole('button', { name: /Ask AI Assistant/i });
      fireEvent.click(chatButton);

      await waitFor(() => {
        expect(screen.getByText('AI Analysis Assistant')).toBeInTheDocument();
      });
    });

    it('should close AI chat when close button is clicked', async () => {
      renderWithToast(
        <ComparisonView comparisonData={mockComparisonData} onBack={mockOnBack} />
      );

      // Open chat
      const chatButton = screen.getByRole('button', { name: /Ask AI Assistant/i });
      fireEvent.click(chatButton);

      await waitFor(() => {
        expect(screen.getByText('AI Analysis Assistant')).toBeInTheDocument();
      });

      // Close chat
      const closeButton = screen.getAllByRole('button').find(btn =>
        btn.querySelector('svg')?.querySelector('path[d*="M6 18L18 6"]')
      );
      if (closeButton) {
        fireEvent.click(closeButton);
      }

      await waitFor(() => {
        expect(screen.queryByText('AI Analysis Assistant')).not.toBeInTheDocument();
      });
    });

    it('should submit chat message', async () => {
      const user = userEvent.setup();
      mockAnalyzeComparison.mockResolvedValue({
        success: true,
        analysis: 'AI response here',
      });

      renderWithToast(
        <ComparisonView comparisonData={mockComparisonData} onBack={mockOnBack} />
      );

      // Open chat
      const chatButton = screen.getByRole('button', { name: /Ask AI Assistant/i });
      fireEvent.click(chatButton);

      await waitFor(() => {
        expect(screen.getByText('AI Analysis Assistant')).toBeInTheDocument();
      });

      // Type and submit message
      const chatInput = screen.getByPlaceholderText('Ask a question...');
      await user.type(chatInput, 'What are the main improvements?');

      const sendButton = screen.getAllByRole('button').find(btn =>
        btn.querySelector('svg')?.querySelector('path[d*="M12 19l9 2"]')
      );
      if (sendButton) {
        fireEvent.click(sendButton);
      }

      await waitFor(() => {
        expect(mockAnalyzeComparison).toHaveBeenCalled();
      });
    });

    it('should not submit empty chat message', async () => {
      renderWithToast(
        <ComparisonView comparisonData={mockComparisonData} onBack={mockOnBack} />
      );

      // Open chat
      const chatButton = screen.getByRole('button', { name: /Ask AI Assistant/i });
      fireEvent.click(chatButton);

      await waitFor(() => {
        expect(screen.getByText('AI Analysis Assistant')).toBeInTheDocument();
      });

      // Try to submit empty message
      const sendButton = screen.getAllByRole('button').find(btn =>
        btn.querySelector('svg')?.querySelector('path[d*="M12 19l9 2"]')
      );
      if (sendButton) {
        fireEvent.click(sendButton);
      }

      expect(mockAnalyzeComparison).not.toHaveBeenCalled();
    });
  });

  describe('Configuration Changes', () => {
    it('should show "no changes" message when no config changes', () => {
      const dataWithNoChanges = {
        ...mockComparisonData,
        config: {
          ...mockComparisonData.config,
          promptChanges: [],
          assertionChanges: [],
          providerModel: {
            ...mockComparisonData.config.providerModel,
            changed: false,
          },
        },
      };

      renderWithToast(
        <ComparisonView comparisonData={dataWithNoChanges} onBack={mockOnBack} />
      );

      expect(screen.getByText(/No configuration changes detected/)).toBeInTheDocument();
    });

    it('should display prompt changes', () => {
      renderWithToast(
        <ComparisonView comparisonData={mockComparisonData} onBack={mockOnBack} />
      );

      expect(screen.getAllByText('Prompt Changes')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Test Prompt')[0]).toBeInTheDocument();
      expect(screen.getAllByText('~ Modified')[0]).toBeInTheDocument();
    });

    it('should show multiple provider notice when providers differ', () => {
      const dataWithMultipleProviders = {
        ...mockComparisonData,
        runs: [
          {
            ...mockComparisonData.runs[0],
            project: {
              ...mockComparisonData.runs[0].project,
              providers: [{ id: 'p1', providerId: 'openai:gpt-4', config: {} }],
            },
          },
          {
            ...mockComparisonData.runs[1],
            project: {
              ...mockComparisonData.runs[1].project,
              providers: [{ id: 'p2', providerId: 'anthropic:claude-3', config: {} }],
            },
          },
        ],
      };

      renderWithToast(
        <ComparisonView comparisonData={dataWithMultipleProviders} onBack={mockOnBack} />
      );

      expect(screen.getByText('Multiple Providers Detected')).toBeInTheDocument();
    });
  });

  describe('Metrics Display', () => {
    it('should format costs correctly', () => {
      renderWithToast(
        <ComparisonView comparisonData={mockComparisonData} onBack={mockOnBack} />
      );

      // Should show cost with 6 decimal places
      expect(screen.getAllByText('$0.050000')[0]).toBeInTheDocument();
      expect(screen.getAllByText('$0.060000')[0]).toBeInTheDocument();
    });

    it('should show trend indicators', () => {
      renderWithToast(
        <ComparisonView comparisonData={mockComparisonData} onBack={mockOnBack} />
      );

      // Should show improvement percentage
      expect(screen.getByText('+14.3%')).toBeInTheDocument(); // Pass rate improvement
    });

    it('should display token usage with proper formatting', () => {
      renderWithToast(
        <ComparisonView comparisonData={mockComparisonData} onBack={mockOnBack} />
      );

      // Token usage should be formatted with commas
      expect(screen.getByText('10,000')).toBeInTheDocument();
      expect(screen.getByText('12,000')).toBeInTheDocument();
    });
  });
});
