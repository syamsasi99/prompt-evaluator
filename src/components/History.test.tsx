import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { History } from './History';
import type { HistoryItem } from '../lib/types';
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

vi.mock('./RunResults', () => ({
  RunResults: ({ results, onClose }: any) => (
    <div data-testid="run-results">
      <h2>Run Results</h2>
      <button onClick={onClose}>Close Results</button>
      <pre>{JSON.stringify(results.results?.summary, null, 2)}</pre>
    </div>
  ),
}));

vi.mock('./ComparisonView', () => ({
  ComparisonView: ({ comparisonData, onBack }: any) => (
    <div data-testid="comparison-view">
      <h2>Comparison View</h2>
      <button onClick={onBack}>Back to History</button>
      <p>{comparisonData.projectName}</p>
    </div>
  ),
}));

vi.mock('../lib/comparison', () => ({
  compareRuns: vi.fn((items) => ({
    projectName: items[0].projectName,
    runs: items,
    metrics: {},
    tests: [],
    config: {},
    summary: {},
  })),
}));

const mockGetAllHistory = vi.fn();
const mockDeleteHistoryById = vi.fn();
const mockDeleteAllHistory = vi.fn();
const mockExportHistoryItem = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  global.window = global.window || ({} as any);
  (global.window as any).api = {
    getAllHistory: mockGetAllHistory,
    deleteHistoryById: mockDeleteHistoryById,
    deleteAllHistory: mockDeleteAllHistory,
    exportHistoryItem: mockExportHistoryItem,
  };
});

const renderWithToast = (ui: React.ReactElement) => {
  return render(<ToastProvider>{ui}</ToastProvider>);
};

const mockHistoryItems: HistoryItem[] = [
  {
    id: 'history-1',
    projectName: 'Test Project 1',
    timestamp: '2024-01-15T10:00:00Z',
    stats: {
      totalTests: 10,
      passed: 8,
      failed: 2,
      passRate: 80,
      avgScore: 0.8,
      totalCost: 0.05,
      totalLatency: 5000,
    },
    results: {
      version: 2,
      createdAt: '2024-01-15T10:00:00Z',
      results: {
        summary: { passed: 8, failed: 2, total: 10 },
        table: {
          head: { prompts: [], vars: [] },
          body: [],
        },
      },
      config: {},
      stats: {
        successes: 8,
        failures: 2,
        tokenUsage: { total: 1000, prompt: 500, completion: 500 },
      },
    },
    project: {
      name: 'Test Project 1',
      providers: [{ id: 'p1', providerId: 'openai:gpt-4', config: {} }],
      prompts: [{ id: 'pr1', label: 'Prompt 1', text: 'Test' }],
      dataset: { name: 'test', headers: [], rows: [] },
      assertions: [],
      options: {},
    },
  },
  {
    id: 'history-2',
    projectName: 'Test Project 2',
    timestamp: '2024-01-14T10:00:00Z',
    stats: {
      totalTests: 10,
      passed: 7,
      failed: 3,
      passRate: 70,
      avgScore: 0.7,
      totalCost: 0.06,
      totalLatency: 6000,
    },
    results: {
      version: 2,
      createdAt: '2024-01-14T10:00:00Z',
      results: {
        summary: { passed: 7, failed: 3, total: 10 },
        table: {
          head: { prompts: [], vars: [] },
          body: [],
        },
      },
      config: {},
      stats: {
        successes: 7,
        failures: 3,
        tokenUsage: { total: 1200, prompt: 600, completion: 600 },
      },
    },
    project: {
      name: 'Test Project 2',
      providers: [{ id: 'p2', providerId: 'anthropic:claude-3', config: {} }],
      prompts: [{ id: 'pr2', label: 'Prompt 2', text: 'Test' }],
      dataset: { name: 'test', headers: [], rows: [] },
      assertions: [],
      options: {},
    },
  },
  {
    id: 'history-3',
    projectName: 'Test Project 1',
    timestamp: '2024-01-13T10:00:00Z',
    stats: {
      totalTests: 10,
      passed: 6,
      failed: 4,
      passRate: 60,
      avgScore: 0.6,
      totalCost: 0.045,
      totalLatency: 4500,
    },
    results: {
      version: 2,
      createdAt: '2024-01-13T10:00:00Z',
      results: {
        summary: { passed: 6, failed: 4, total: 10 },
        table: {
          head: { prompts: [], vars: [] },
          body: [],
        },
      },
      config: {},
      stats: {
        successes: 6,
        failures: 4,
        tokenUsage: { total: 900, prompt: 450, completion: 450 },
      },
    },
    project: {
      name: 'Test Project 1',
      providers: [{ id: 'p1', providerId: 'openai:gpt-4', config: {} }],
      prompts: [{ id: 'pr1', label: 'Prompt 1', text: 'Test' }],
      dataset: { name: 'test', headers: [], rows: [] },
      assertions: [],
      options: {},
    },
  },
];

const mockProjectOptions = {
  outputPath: './output.html',
  jsonOutputPath: './output.json',
  maxConcurrency: 4,
  cache: false,
  openReportAfterTest: false,
};

describe('History', () => {
  beforeEach(() => {
    mockGetAllHistory.mockResolvedValue({
      success: true,
      history: mockHistoryItems,
    });
  });

  describe('Rendering', () => {
    it('should render the history page', async () => {
      renderWithToast(<History projectOptions={mockProjectOptions} />);

      await waitFor(() => {
        expect(screen.getByText('Evaluation History')).toBeInTheDocument();
      });
    });

    it('should load and display history items', async () => {
      renderWithToast(<History projectOptions={mockProjectOptions} />);

      await waitFor(() => {
        expect(screen.getAllByText('Test Project 1')[0]).toBeInTheDocument();
        expect(screen.getAllByText('Test Project 2')[0]).toBeInTheDocument();
      });
    });

    it('should show loading state initially', () => {
      mockGetAllHistory.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderWithToast(<History projectOptions={mockProjectOptions} />);

      expect(screen.getByText(/Loading history/i)).toBeInTheDocument();
    });

    it.skip('should show empty state when no history', async () => {
      mockGetAllHistory.mockResolvedValue({
        success: true,
        history: [],
      });

      renderWithToast(<History projectOptions={mockProjectOptions} />);

      await waitFor(() => {
        expect(screen.getByText(/No evaluation history yet/i)).toBeInTheDocument();
      });
    });

    it.skip('should display history item cards with details', async () => {
      renderWithToast(<History projectOptions={mockProjectOptions} />);

      await waitFor(() => {
        // Should show pass/fail stats
        expect(screen.getAllByText(/8 \/ 10/)[0]).toBeInTheDocument();
        expect(screen.getAllByText(/7 \/ 10/)[0]).toBeInTheDocument();
      });
    });
  });

  describe('Filtering and Search', () => {
    it.skip('should filter history by search query', async () => {
      const user = userEvent.setup();
      renderWithToast(<History projectOptions={mockProjectOptions} />);

      await waitFor(() => {
        expect(screen.getAllByText('Test Project 1')[0]).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search history/i);
      await user.type(searchInput, 'Project 2');

      await waitFor(() => {
        expect(screen.getAllByText('Test Project 2')[0]).toBeInTheDocument();
        expect(screen.queryByText('Test Project 1')).not.toBeInTheDocument();
      });
    });

    it('should sort history by newest first', async () => {
      renderWithToast(<History projectOptions={mockProjectOptions} />);

      await waitFor(() => {
        const projectTitles = screen.getAllByRole('heading', { level: 3 });
        expect(projectTitles[0]).toHaveTextContent('Test Project 1'); // Most recent
      });
    });

    it.skip('should sort history by oldest first', async () => {
      renderWithToast(<History projectOptions={mockProjectOptions} />);

      await waitFor(() => {
        expect(screen.getAllByText('Test Project 1')[0]).toBeInTheDocument();
      });

      const sortSelect = screen.getByRole('combobox', { name: /Sort by/i });
      fireEvent.change(sortSelect, { target: { value: 'oldest' } });

      await waitFor(() => {
        const projectTitles = screen.getAllByRole('heading', { level: 3 });
        expect(projectTitles[0]).toHaveTextContent('Test Project 1'); // Oldest run
      });
    });

    it.skip('should filter by project name', async () => {
      renderWithToast(<History projectOptions={mockProjectOptions} />);

      await waitFor(() => {
        expect(screen.getAllByText(/Test Project/)).toHaveLength(3);
      });

      const projectFilter = screen.getByRole('combobox', { name: /Filter by project/i });
      fireEvent.change(projectFilter, { target: { value: 'Test Project 1' } });

      await waitFor(() => {
        // Should only show Project 1 runs
        expect(screen.getAllByText('Test Project 1')).toHaveLength(2);
      });
    });

    it.skip('should filter by date range', async () => {
      const user = userEvent.setup();
      renderWithToast(<History projectOptions={mockProjectOptions} />);

      await waitFor(() => {
        expect(screen.getAllByText(/Test Project/)).toHaveLength(3);
      });

      const dateFromInput = screen.getByLabelText(/From/i);
      await user.type(dateFromInput, '2024-01-14');

      await waitFor(() => {
        // Should filter to only items from Jan 14 onwards
        expect(screen.getAllByText(/Test Project/)).toHaveLength(2);
      });
    });
  });

  describe('Viewing Details', () => {
    it.skip('should view run results when item is clicked', async () => {
      renderWithToast(<History projectOptions={mockProjectOptions} />);

      await waitFor(() => {
        expect(screen.getAllByText('Test Project 1')[0]).toBeInTheDocument();
      });

      const viewButtons = screen.getAllByRole('button', { name: /View/i });
      fireEvent.click(viewButtons[0]);

      await waitFor(() => {
        expect(screen.getByTestId('run-results')).toBeInTheDocument();
      });
    });

    it.skip('should close results view', async () => {
      renderWithToast(<History projectOptions={mockProjectOptions} />);

      await waitFor(() => {
        expect(screen.getAllByText('Test Project 1')[0]).toBeInTheDocument();
      });

      const viewButtons = screen.getAllByRole('button', { name: /View/i });
      fireEvent.click(viewButtons[0]);

      await waitFor(() => {
        expect(screen.getByTestId('run-results')).toBeInTheDocument();
      });

      const closeButton = screen.getByRole('button', { name: /Close Results/i });
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('run-results')).not.toBeInTheDocument();
      });
    });
  });

  describe('Comparison Mode', () => {
    it.skip('should enter comparison mode', async () => {
      renderWithToast(<History projectOptions={mockProjectOptions} />);

      await waitFor(() => {
        expect(screen.getAllByText('Test Project 1')[0]).toBeInTheDocument();
      });

      const compareButton = screen.getByRole('button', { name: /Compare Runs/i });
      fireEvent.click(compareButton);

      expect(screen.getByText(/Select 2-3 runs to compare/i)).toBeInTheDocument();
    });

    it('should select runs for comparison', async () => {
      renderWithToast(<History projectOptions={mockProjectOptions} />);

      await waitFor(() => {
        expect(screen.getAllByText('Test Project 1')[0]).toBeInTheDocument();
      });

      const compareButton = screen.getByRole('button', { name: /Compare Runs/i });
      fireEvent.click(compareButton);

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      fireEvent.click(checkboxes[2]); // Select 2 runs from same project

      expect(checkboxes[0]).toBeChecked();
      expect(checkboxes[2]).toBeChecked();
    });

    it('should compare selected runs', async () => {
      renderWithToast(<History projectOptions={mockProjectOptions} />);

      await waitFor(() => {
        expect(screen.getAllByText('Test Project 1')[0]).toBeInTheDocument();
      });

      const compareButton = screen.getByRole('button', { name: /Compare Runs/i });
      fireEvent.click(compareButton);

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      fireEvent.click(checkboxes[2]);

      const compareSelectedButton = screen.getByRole('button', { name: /Compare Selected/i });
      fireEvent.click(compareSelectedButton);

      await waitFor(() => {
        expect(screen.getByTestId('comparison-view')).toBeInTheDocument();
      });
    });

    it.skip('should prevent comparing runs from different projects', async () => {
      renderWithToast(<History projectOptions={mockProjectOptions} />);

      await waitFor(() => {
        expect(screen.getAllByText('Test Project 1')[0]).toBeInTheDocument();
      });

      const compareButton = screen.getByRole('button', { name: /Compare Runs/i });
      fireEvent.click(compareButton);

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]); // Project 1
      fireEvent.click(checkboxes[1]); // Project 2

      const compareSelectedButton = screen.getByRole('button', { name: /Compare Selected/i });
      fireEvent.click(compareSelectedButton);

      // Should show error
      await waitFor(() => {
        expect(screen.getByText(/can only compare runs from the same project/i)).toBeInTheDocument();
      });
    });

    it.skip('should exit comparison mode', async () => {
      renderWithToast(<History projectOptions={mockProjectOptions} />);

      await waitFor(() => {
        expect(screen.getAllByText('Test Project 1')[0]).toBeInTheDocument();
      });

      const compareButton = screen.getByRole('button', { name: /Compare Runs/i });
      fireEvent.click(compareButton);

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);

      expect(screen.queryByText(/Select 2-3 runs to compare/i)).not.toBeInTheDocument();
    });
  });

  describe('Delete Operations', () => {
    it.skip('should delete individual history item', async () => {
      mockDeleteHistoryById.mockResolvedValue({ success: true });

      renderWithToast(<History projectOptions={mockProjectOptions} />);

      await waitFor(() => {
        expect(screen.getAllByText('Test Project 1')[0]).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /Delete/i });
      fireEvent.click(deleteButtons[0]);

      // Should show confirmation dialog
      const confirmButton = screen.getByRole('button', { name: /Confirm/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockDeleteHistoryById).toHaveBeenCalledWith('history-1');
      });
    });

    it.skip('should cancel delete operation', async () => {
      renderWithToast(<History projectOptions={mockProjectOptions} />);

      await waitFor(() => {
        expect(screen.getAllByText('Test Project 1')[0]).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /Delete/i });
      fireEvent.click(deleteButtons[0]);

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);

      expect(mockDeleteHistoryById).not.toHaveBeenCalled();
    });

    it.skip('should delete all history', async () => {
      mockDeleteAllHistory.mockResolvedValue({ success: true });

      renderWithToast(<History projectOptions={mockProjectOptions} />);

      await waitFor(() => {
        expect(screen.getAllByText('Test Project 1')[0]).toBeInTheDocument();
      });

      const deleteAllButton = screen.getByRole('button', { name: /Delete All/i });
      fireEvent.click(deleteAllButton);

      const confirmButton = screen.getByRole('button', { name: /Confirm/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockDeleteAllHistory).toHaveBeenCalled();
      });
    });

    it.skip('should block delete when using BigQuery history source', async () => {
      const bigQueryOptions = {
        ...mockProjectOptions,
        bigQueryHistoryEnabled: true,
        bigQueryProjectId: 'test-project',
        bigQueryDatasetId: 'test-dataset',
        bigQueryTableId: 'test-table',
      };

      renderWithToast(<History projectOptions={bigQueryOptions} />);

      await waitFor(() => {
        expect(screen.getAllByText('Test Project 1')[0]).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /Delete/i });
      fireEvent.click(deleteButtons[0]);

      const confirmButton = screen.getByRole('button', { name: /Confirm/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockDeleteHistoryById).not.toHaveBeenCalled();
      });
    });
  });

  describe('Export', () => {
    it.skip('should export history item', async () => {
      mockExportHistoryItem.mockResolvedValue({ success: true, filePath: '/path/to/export.json' });

      renderWithToast(<History projectOptions={mockProjectOptions} />);

      await waitFor(() => {
        expect(screen.getAllByText('Test Project 1')[0]).toBeInTheDocument();
      });

      const exportButtons = screen.getAllByRole('button', { name: /Export/i });
      fireEvent.click(exportButtons[0]);

      await waitFor(() => {
        expect(mockExportHistoryItem).toHaveBeenCalledWith(mockHistoryItems[0]);
      });
    });

    it.skip('should handle export error', async () => {
      mockExportHistoryItem.mockResolvedValue({ success: false, error: 'Export failed' });

      renderWithToast(<History projectOptions={mockProjectOptions} />);

      await waitFor(() => {
        expect(screen.getAllByText('Test Project 1')[0]).toBeInTheDocument();
      });

      const exportButtons = screen.getAllByRole('button', { name: /Export/i });
      fireEvent.click(exportButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/Export failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Pagination', () => {
    it.skip('should paginate history items', async () => {
      const manyItems = Array(20).fill(null).map((_, i) => ({
        ...mockHistoryItems[0],
        id: `history-${i}`,
        projectName: `Project ${i}`,
      }));

      mockGetAllHistory.mockResolvedValue({
        success: true,
        history: manyItems,
      });

      renderWithToast(<History projectOptions={mockProjectOptions} />);

      await waitFor(() => {
        // Should show only first page (6 items per page)
        expect(screen.getAllByRole('article')).toHaveLength(6);
      });

      const nextButton = screen.getByRole('button', { name: /Next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        // Should show second page
        expect(screen.getAllByRole('article')).toHaveLength(6);
      });
    });
  });
});
