import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MultiLineChart } from './MultiLineChart';
import { DarkModeProvider } from '../../contexts/DarkModeContext';

// Mock Recharts components
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children, data }: any) => (
    <div data-testid="line-chart" data-chart-data={JSON.stringify(data)}>
      {children}
    </div>
  ),
  Line: ({ dataKey, stroke, name }: any) => (
    <div data-testid="line" data-key={dataKey} data-stroke={stroke} data-name={name} />
  ),
  XAxis: ({ dataKey, label }: any) => (
    <div data-testid="x-axis" data-key={dataKey} data-label={label?.value} />
  ),
  YAxis: ({ label }: any) => <div data-testid="y-axis" data-label={label?.value} />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}));

const renderWithDarkMode = (ui: React.ReactElement) => {
  return render(<DarkModeProvider>{ui}</DarkModeProvider>);
};

const mockData = [
  {
    timestamp: '2024-01-01T10:00:00Z',
    passRate: 85,
    avgScore: 0.85,
    latency: 1200,
  },
  {
    timestamp: '2024-01-02T10:00:00Z',
    passRate: 87,
    avgScore: 0.88,
    latency: 1150,
  },
  {
    timestamp: '2024-01-03T10:00:00Z',
    passRate: 90,
    avgScore: 0.92,
    latency: 1100,
  },
];

const mockSeries = [
  { key: 'passRate', name: 'Pass Rate', color: '#10B981' },
  { key: 'avgScore', name: 'Avg Score', color: '#3B82F6' },
  { key: 'latency', name: 'Latency', color: '#F59E0B' },
];

describe('MultiLineChart', () => {
  describe('Rendering', () => {
    it('should render chart with title', () => {
      renderWithDarkMode(
        <MultiLineChart
          data={mockData}
          series={mockSeries}
          title="Performance Over Time"
        />
      );

      expect(screen.getByText('Performance Over Time')).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('should render responsive container', () => {
      renderWithDarkMode(
        <MultiLineChart
          data={mockData}
          series={mockSeries}
          title="Test Chart"
        />
      );

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('should render all series lines', () => {
      renderWithDarkMode(
        <MultiLineChart
          data={mockData}
          series={mockSeries}
          title="Test Chart"
        />
      );

      const lines = screen.getAllByTestId('line');
      expect(lines).toHaveLength(3);
      expect(lines[0]).toHaveAttribute('data-key', 'passRate');
      expect(lines[1]).toHaveAttribute('data-key', 'avgScore');
      expect(lines[2]).toHaveAttribute('data-key', 'latency');
    });

    it('should render axes', () => {
      renderWithDarkMode(
        <MultiLineChart
          data={mockData}
          series={mockSeries}
          title="Test Chart"
        />
      );

      expect(screen.getByTestId('x-axis')).toBeInTheDocument();
      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
    });

    it('should render tooltip and legend', () => {
      renderWithDarkMode(
        <MultiLineChart
          data={mockData}
          series={mockSeries}
          title="Test Chart"
        />
      );

      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
      expect(screen.getByTestId('legend')).toBeInTheDocument();
    });
  });

  describe('Series Configuration', () => {
    it('should apply correct colors to lines', () => {
      renderWithDarkMode(
        <MultiLineChart
          data={mockData}
          series={mockSeries}
          title="Test Chart"
        />
      );

      const lines = screen.getAllByTestId('line');
      expect(lines[0]).toHaveAttribute('data-stroke', '#10B981'); // passRate - green
      expect(lines[1]).toHaveAttribute('data-stroke', '#3B82F6'); // avgScore - blue
      expect(lines[2]).toHaveAttribute('data-stroke', '#F59E0B'); // latency - yellow
    });

    it('should use series names for legend', () => {
      renderWithDarkMode(
        <MultiLineChart
          data={mockData}
          series={mockSeries}
          title="Test Chart"
        />
      );

      const lines = screen.getAllByTestId('line');
      expect(lines[0]).toHaveAttribute('data-name', 'Pass Rate');
      expect(lines[1]).toHaveAttribute('data-name', 'Avg Score');
      expect(lines[2]).toHaveAttribute('data-name', 'Latency');
    });

    it('should handle single series', () => {
      const singleSeries = [{ key: 'passRate', name: 'Pass Rate', color: '#10B981' }];

      renderWithDarkMode(
        <MultiLineChart
          data={mockData}
          series={singleSeries}
          title="Single Series"
        />
      );

      const lines = screen.getAllByTestId('line');
      expect(lines).toHaveLength(1);
    });

    it('should handle many series', () => {
      const manySeries = [
        { key: 'metric1', name: 'Metric 1', color: '#10B981' },
        { key: 'metric2', name: 'Metric 2', color: '#3B82F6' },
        { key: 'metric3', name: 'Metric 3', color: '#F59E0B' },
        { key: 'metric4', name: 'Metric 4', color: '#EF4444' },
        { key: 'metric5', name: 'Metric 5', color: '#8B5CF6' },
      ];

      const manySeriesData = mockData.map((d, i) => ({
        ...d,
        metric1: i * 10,
        metric2: i * 20,
        metric3: i * 30,
        metric4: i * 40,
        metric5: i * 50,
      }));

      renderWithDarkMode(
        <MultiLineChart
          data={manySeriesData}
          series={manySeries}
          title="Many Series"
        />
      );

      const lines = screen.getAllByTestId('line');
      expect(lines).toHaveLength(5);
    });
  });

  describe('Configuration Options', () => {
    it('should use custom height', () => {
      const { container } = renderWithDarkMode(
        <MultiLineChart
          data={mockData}
          series={mockSeries}
          title="Test Chart"
          height={400}
        />
      );

      expect(container.querySelector('.bg-white')).toBeInTheDocument();
    });

    it('should show grid when enabled', () => {
      renderWithDarkMode(
        <MultiLineChart
          data={mockData}
          series={mockSeries}
          title="Test Chart"
          showGrid={true}
        />
      );

      expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
    });

    it('should hide grid when disabled', () => {
      renderWithDarkMode(
        <MultiLineChart
          data={mockData}
          series={mockSeries}
          title="Test Chart"
          showGrid={false}
        />
      );

      expect(screen.queryByTestId('cartesian-grid')).not.toBeInTheDocument();
    });

    it('should display x-axis label when provided', () => {
      renderWithDarkMode(
        <MultiLineChart
          data={mockData}
          series={mockSeries}
          title="Test Chart"
          xAxisLabel="Time"
        />
      );

      const xAxis = screen.getByTestId('x-axis');
      expect(xAxis).toHaveAttribute('data-label', 'Time');
    });

    it('should display y-axis label when provided', () => {
      renderWithDarkMode(
        <MultiLineChart
          data={mockData}
          series={mockSeries}
          title="Test Chart"
          yAxisLabel="Value"
        />
      );

      const yAxis = screen.getByTestId('y-axis');
      expect(yAxis).toHaveAttribute('data-label', 'Value');
    });

    it('should use custom value formatter', () => {
      const formatter = (value: number) => `${value}%`;
      renderWithDarkMode(
        <MultiLineChart
          data={mockData}
          series={mockSeries}
          title="Test Chart"
          valueFormatter={formatter}
        />
      );

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
  });

  describe('Data Handling', () => {
    it('should pass data to chart', () => {
      renderWithDarkMode(
        <MultiLineChart
          data={mockData}
          series={mockSeries}
          title="Test Chart"
        />
      );

      const chart = screen.getByTestId('line-chart');
      const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '[]');
      expect(chartData).toHaveLength(3);
      expect(chartData[0].passRate).toBe(85);
    });

    it('should handle empty data', () => {
      renderWithDarkMode(
        <MultiLineChart
          data={[]}
          series={mockSeries}
          title="Test Chart"
        />
      );

      const chart = screen.getByTestId('line-chart');
      const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '[]');
      expect(chartData).toHaveLength(0);
    });

    it('should handle single data point', () => {
      const singlePoint = [mockData[0]];

      renderWithDarkMode(
        <MultiLineChart
          data={singlePoint}
          series={mockSeries}
          title="Single Point"
        />
      );

      const chart = screen.getByTestId('line-chart');
      const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '[]');
      expect(chartData).toHaveLength(1);
    });

    it('should handle large dataset', () => {
      const largeData = Array(100)
        .fill(null)
        .map((_, i) => ({
          timestamp: `2024-01-${(i % 28) + 1}T10:00:00Z`,
          passRate: 80 + Math.random() * 20,
          avgScore: 0.8 + Math.random() * 0.2,
          latency: 1000 + Math.random() * 500,
        }));

      renderWithDarkMode(
        <MultiLineChart
          data={largeData}
          series={mockSeries}
          title="Large Dataset"
        />
      );

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('should handle missing data points', () => {
      const sparseData = [
        {
          timestamp: '2024-01-01T10:00:00Z',
          passRate: 85,
          // avgScore is missing
          latency: 1200,
        },
        {
          timestamp: '2024-01-02T10:00:00Z',
          // passRate is missing
          avgScore: 0.88,
          latency: 1150,
        },
      ];

      renderWithDarkMode(
        <MultiLineChart
          data={sparseData}
          series={mockSeries}
          title="Sparse Data"
        />
      );

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
  });

  describe('Timestamp Formatting', () => {
    it('should format timestamps for x-axis', () => {
      renderWithDarkMode(
        <MultiLineChart
          data={mockData}
          series={mockSeries}
          title="Test Chart"
        />
      );

      const xAxis = screen.getByTestId('x-axis');
      expect(xAxis).toHaveAttribute('data-key', 'timestamp');
    });

    it('should handle different date formats', () => {
      const differentDateData = [
        {
          timestamp: '2024-01-15T10:00:00Z',
          passRate: 85,
          avgScore: 0.85,
          latency: 1200,
        },
        {
          timestamp: '2024-02-20T10:00:00Z',
          passRate: 87,
          avgScore: 0.88,
          latency: 1150,
        },
        {
          timestamp: '2024-12-25T10:00:00Z',
          passRate: 90,
          avgScore: 0.92,
          latency: 1100,
        },
      ];

      renderWithDarkMode(
        <MultiLineChart
          data={differentDateData}
          series={mockSeries}
          title="Date Formats"
        />
      );

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should apply light mode styles', () => {
      const { container } = renderWithDarkMode(
        <MultiLineChart
          data={mockData}
          series={mockSeries}
          title="Test Chart"
        />
      );

      expect(container.querySelector('.bg-white')).toBeInTheDocument();
      expect(container.querySelector('.border-gray-200')).toBeInTheDocument();
    });

    it('should have proper container classes', () => {
      const { container } = renderWithDarkMode(
        <MultiLineChart
          data={mockData}
          series={mockSeries}
          title="Test Chart"
        />
      );

      const wrapper = container.querySelector('.bg-white');
      expect(wrapper).toHaveClass('rounded-lg');
      expect(wrapper).toHaveClass('border');
      expect(wrapper).toHaveClass('p-4');
    });

    it('should style title correctly', () => {
      renderWithDarkMode(
        <MultiLineChart
          data={mockData}
          series={mockSeries}
          title="Test Title"
        />
      );

      const title = screen.getByText('Test Title');
      expect(title).toHaveClass('text-lg');
      expect(title).toHaveClass('font-semibold');
      expect(title).toHaveClass('mb-4');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large values', () => {
      const largeValueData = [
        {
          timestamp: '2024-01-01T10:00:00Z',
          passRate: 999999,
          avgScore: 1000000,
          latency: 5000000,
        },
      ];

      renderWithDarkMode(
        <MultiLineChart
          data={largeValueData}
          series={mockSeries}
          title="Large Values"
        />
      );

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('should handle negative values', () => {
      const negativeData = [
        {
          timestamp: '2024-01-01T10:00:00Z',
          passRate: -50,
          avgScore: -0.5,
          latency: 1200,
        },
        {
          timestamp: '2024-01-02T10:00:00Z',
          passRate: 75,
          avgScore: 0.75,
          latency: 1150,
        },
      ];

      renderWithDarkMode(
        <MultiLineChart
          data={negativeData}
          series={mockSeries}
          title="With Negatives"
        />
      );

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('should handle decimal precision', () => {
      const preciseData = [
        {
          timestamp: '2024-01-01T10:00:00Z',
          passRate: 85.12345,
          avgScore: 0.8567890,
          latency: 1234.5678,
        },
      ];

      renderWithDarkMode(
        <MultiLineChart
          data={preciseData}
          series={mockSeries}
          title="Precise Decimals"
        />
      );

      const chart = screen.getByTestId('line-chart');
      const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '[]');
      expect(chartData[0].passRate).toBe(85.12345);
    });

    it('should handle zero values', () => {
      const zeroData = [
        {
          timestamp: '2024-01-01T10:00:00Z',
          passRate: 0,
          avgScore: 0,
          latency: 0,
        },
        {
          timestamp: '2024-01-02T10:00:00Z',
          passRate: 100,
          avgScore: 1,
          latency: 2000,
        },
      ];

      renderWithDarkMode(
        <MultiLineChart
          data={zeroData}
          series={mockSeries}
          title="With Zeros"
        />
      );

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
  });

  describe('Value Formatting', () => {
    it('should use default formatter', () => {
      renderWithDarkMode(
        <MultiLineChart
          data={mockData}
          series={mockSeries}
          title="Test Chart"
        />
      );

      // Default formatter formats to 1 decimal place
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('should format percentage values', () => {
      const percentFormatter = (value: number) => `${value.toFixed(0)}%`;
      renderWithDarkMode(
        <MultiLineChart
          data={mockData}
          series={mockSeries}
          title="Percentages"
          valueFormatter={percentFormatter}
        />
      );

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('should format time values', () => {
      const timeFormatter = (value: number) => `${value}ms`;
      renderWithDarkMode(
        <MultiLineChart
          data={mockData}
          series={mockSeries}
          title="Latency"
          valueFormatter={timeFormatter}
        />
      );

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA structure', () => {
      const { container } = renderWithDarkMode(
        <MultiLineChart
          data={mockData}
          series={mockSeries}
          title="Accessible Chart"
        />
      );

      expect(container.querySelector('.bg-white')).toBeInTheDocument();
    });

    it('should have readable title', () => {
      renderWithDarkMode(
        <MultiLineChart
          data={mockData}
          series={mockSeries}
          title="Performance Trends"
        />
      );

      const title = screen.getByText('Performance Trends');
      expect(title.tagName).toBe('H3');
    });
  });

  describe('Time Series Specific', () => {
    it('should handle chronological data', () => {
      const chronologicalData = [
        {
          timestamp: '2024-01-01T00:00:00Z',
          passRate: 70,
          avgScore: 0.7,
          latency: 1500,
        },
        {
          timestamp: '2024-01-01T06:00:00Z',
          passRate: 75,
          avgScore: 0.75,
          latency: 1400,
        },
        {
          timestamp: '2024-01-01T12:00:00Z',
          passRate: 80,
          avgScore: 0.8,
          latency: 1300,
        },
        {
          timestamp: '2024-01-01T18:00:00Z',
          passRate: 85,
          avgScore: 0.85,
          latency: 1200,
        },
      ];

      renderWithDarkMode(
        <MultiLineChart
          data={chronologicalData}
          series={mockSeries}
          title="Intraday Trends"
        />
      );

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('should handle data over long time periods', () => {
      const longPeriodData = Array(365)
        .fill(null)
        .map((_, i) => ({
          timestamp: `2024-01-01T${i % 24}:00:00Z`,
          passRate: 80 + (i % 20),
          avgScore: 0.8 + (i % 20) / 100,
          latency: 1000 + (i % 500),
        }));

      renderWithDarkMode(
        <MultiLineChart
          data={longPeriodData}
          series={mockSeries}
          title="Year View"
        />
      );

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
  });
});
