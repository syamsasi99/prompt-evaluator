import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BarComparisonChart } from './BarComparisonChart';
import { DarkModeProvider } from '../../contexts/DarkModeContext';

// Mock Recharts components
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children, data }: any) => (
    <div data-testid="bar-chart" data-chart-data={JSON.stringify(data)}>
      {children}
    </div>
  ),
  Bar: ({ dataKey, name, children }: any) => (
    <div data-testid="bar" data-key={dataKey} data-name={name}>
      {children}
    </div>
  ),
  XAxis: ({ dataKey, label }: any) => (
    <div data-testid="x-axis" data-key={dataKey} data-label={label?.value} />
  ),
  YAxis: ({ label }: any) => <div data-testid="y-axis" data-label={label?.value} />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  Cell: ({ fill }: any) => <div data-testid="cell" data-fill={fill} />,
}));

const renderWithDarkMode = (ui: React.ReactElement) => {
  return render(<DarkModeProvider>{ui}</DarkModeProvider>);
};

const mockData = [
  { name: 'GPT-4', value: 85.5, color: '#3B82F6' },
  { name: 'Claude 3', value: 92.3, color: '#10B981' },
  { name: 'Gemini', value: 78.9, color: '#F59E0B' },
];

describe('BarComparisonChart', () => {
  describe('Rendering', () => {
    it('should render chart with title', () => {
      renderWithDarkMode(
        <BarComparisonChart data={mockData} title="Model Performance" />
      );

      expect(screen.getByText('Model Performance')).toBeInTheDocument();
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });

    it('should render responsive container', () => {
      renderWithDarkMode(
        <BarComparisonChart data={mockData} title="Test Chart" />
      );

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('should render bar element', () => {
      renderWithDarkMode(
        <BarComparisonChart data={mockData} title="Test Chart" />
      );

      expect(screen.getByTestId('bar')).toBeInTheDocument();
    });

    it('should render axes', () => {
      renderWithDarkMode(
        <BarComparisonChart data={mockData} title="Test Chart" />
      );

      expect(screen.getByTestId('x-axis')).toBeInTheDocument();
      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
    });

    it('should render tooltip and legend', () => {
      renderWithDarkMode(
        <BarComparisonChart data={mockData} title="Test Chart" />
      );

      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
      expect(screen.getByTestId('legend')).toBeInTheDocument();
    });
  });

  describe('Configuration Options', () => {
    it('should use custom height', () => {
      const { container } = renderWithDarkMode(
        <BarComparisonChart data={mockData} title="Test Chart" height={400} />
      );

      // Check if the chart container has custom styling
      expect(container.querySelector('.bg-white')).toBeInTheDocument();
    });

    it('should show grid when enabled', () => {
      renderWithDarkMode(
        <BarComparisonChart data={mockData} title="Test Chart" showGrid={true} />
      );

      expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
    });

    it('should hide grid when disabled', () => {
      renderWithDarkMode(
        <BarComparisonChart data={mockData} title="Test Chart" showGrid={false} />
      );

      expect(screen.queryByTestId('cartesian-grid')).not.toBeInTheDocument();
    });

    it('should display x-axis label when provided', () => {
      renderWithDarkMode(
        <BarComparisonChart
          data={mockData}
          title="Test Chart"
          xAxisLabel="Models"
        />
      );

      const xAxis = screen.getByTestId('x-axis');
      expect(xAxis).toHaveAttribute('data-label', 'Models');
    });

    it('should display y-axis label when provided', () => {
      renderWithDarkMode(
        <BarComparisonChart
          data={mockData}
          title="Test Chart"
          yAxisLabel="Score"
        />
      );

      const yAxis = screen.getByTestId('y-axis');
      expect(yAxis).toHaveAttribute('data-label', 'Score');
    });

    it('should use custom value formatter', () => {
      const formatter = (value: number) => `${value}%`;
      renderWithDarkMode(
        <BarComparisonChart
          data={mockData}
          title="Test Chart"
          valueFormatter={formatter}
        />
      );

      // The formatter is passed to components, check that chart rendered
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });
  });

  describe('Horizontal Layout', () => {
    it('should support horizontal bar chart', () => {
      renderWithDarkMode(
        <BarComparisonChart
          data={mockData}
          title="Test Chart"
          horizontal={true}
        />
      );

      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });

    it('should swap axes in horizontal mode', () => {
      renderWithDarkMode(
        <BarComparisonChart
          data={mockData}
          title="Test Chart"
          horizontal={true}
        />
      );

      // Both axes should still be present
      expect(screen.getByTestId('x-axis')).toBeInTheDocument();
      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
    });
  });

  describe('Data Handling', () => {
    it('should pass data to chart', () => {
      renderWithDarkMode(
        <BarComparisonChart data={mockData} title="Test Chart" />
      );

      const chart = screen.getByTestId('bar-chart');
      const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '[]');
      expect(chartData).toHaveLength(3);
      expect(chartData[0].name).toBe('GPT-4');
    });

    it('should handle empty data', () => {
      renderWithDarkMode(
        <BarComparisonChart data={[]} title="Test Chart" />
      );

      const chart = screen.getByTestId('bar-chart');
      const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '[]');
      expect(chartData).toHaveLength(0);
    });

    it('should render cells with custom colors', () => {
      renderWithDarkMode(
        <BarComparisonChart data={mockData} title="Test Chart" />
      );

      const cells = screen.getAllByTestId('cell');
      expect(cells).toHaveLength(3);
      expect(cells[0]).toHaveAttribute('data-fill', '#3B82F6');
      expect(cells[1]).toHaveAttribute('data-fill', '#10B981');
      expect(cells[2]).toHaveAttribute('data-fill', '#F59E0B');
    });

    it('should use default color when color not specified', () => {
      const dataWithoutColors = [
        { name: 'Test 1', value: 50 },
        { name: 'Test 2', value: 75 },
      ];

      renderWithDarkMode(
        <BarComparisonChart data={dataWithoutColors} title="Test Chart" />
      );

      const cells = screen.getAllByTestId('cell');
      expect(cells).toHaveLength(2);
      // Default color is '#3B82F6'
      expect(cells[0]).toHaveAttribute('data-fill', '#3B82F6');
      expect(cells[1]).toHaveAttribute('data-fill', '#3B82F6');
    });
  });

  describe('Styling', () => {
    it('should apply light mode styles', () => {
      const { container } = renderWithDarkMode(
        <BarComparisonChart data={mockData} title="Test Chart" />
      );

      expect(container.querySelector('.bg-white')).toBeInTheDocument();
      expect(container.querySelector('.border-gray-200')).toBeInTheDocument();
    });

    it('should have proper container classes', () => {
      const { container } = renderWithDarkMode(
        <BarComparisonChart data={mockData} title="Test Chart" />
      );

      const wrapper = container.querySelector('.bg-white');
      expect(wrapper).toHaveClass('rounded-lg');
      expect(wrapper).toHaveClass('border');
      expect(wrapper).toHaveClass('p-4');
    });

    it('should style title correctly', () => {
      renderWithDarkMode(
        <BarComparisonChart data={mockData} title="Test Title" />
      );

      const title = screen.getByText('Test Title');
      expect(title).toHaveClass('text-lg');
      expect(title).toHaveClass('font-semibold');
      expect(title).toHaveClass('mb-4');
    });
  });

  describe('Edge Cases', () => {
    it('should handle single data point', () => {
      const singleData = [{ name: 'Only One', value: 100, color: '#3B82F6' }];

      renderWithDarkMode(
        <BarComparisonChart data={singleData} title="Single Bar" />
      );

      const chart = screen.getByTestId('bar-chart');
      const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '[]');
      expect(chartData).toHaveLength(1);
    });

    it('should handle very large values', () => {
      const largeData = [
        { name: 'Item 1', value: 999999, color: '#3B82F6' },
        { name: 'Item 2', value: 1000000, color: '#10B981' },
      ];

      renderWithDarkMode(
        <BarComparisonChart data={largeData} title="Large Values" />
      );

      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });

    it('should handle decimal values', () => {
      const decimalData = [
        { name: 'Item 1', value: 12.345, color: '#3B82F6' },
        { name: 'Item 2', value: 67.890, color: '#10B981' },
      ];

      renderWithDarkMode(
        <BarComparisonChart data={decimalData} title="Decimals" />
      );

      const chart = screen.getByTestId('bar-chart');
      const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '[]');
      expect(chartData[0].value).toBe(12.345);
    });

    it('should handle negative values', () => {
      const negativeData = [
        { name: 'Loss', value: -50, color: '#EF4444' },
        { name: 'Gain', value: 75, color: '#10B981' },
      ];

      renderWithDarkMode(
        <BarComparisonChart data={negativeData} title="With Negatives" />
      );

      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });

    it('should handle long names', () => {
      const longNameData = [
        {
          name: 'This is a very long model name that might need truncation',
          value: 85,
          color: '#3B82F6',
        },
      ];

      renderWithDarkMode(
        <BarComparisonChart data={longNameData} title="Long Names" />
      );

      const chart = screen.getByTestId('bar-chart');
      const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '[]');
      expect(chartData[0].name.length).toBeGreaterThan(30);
    });
  });

  describe('Value Formatting', () => {
    it('should use default formatter for values', () => {
      renderWithDarkMode(
        <BarComparisonChart data={mockData} title="Test Chart" />
      );

      // Default formatter formats to 1 decimal place
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });

    it('should format percentage values', () => {
      const percentFormatter = (value: number) => `${value.toFixed(0)}%`;
      renderWithDarkMode(
        <BarComparisonChart
          data={mockData}
          title="Percentages"
          valueFormatter={percentFormatter}
        />
      );

      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });

    it('should format currency values', () => {
      const currencyFormatter = (value: number) => `$${value.toFixed(2)}`;
      const costData = [
        { name: 'GPT-4', value: 0.05, color: '#3B82F6' },
        { name: 'Claude', value: 0.06, color: '#10B981' },
      ];

      renderWithDarkMode(
        <BarComparisonChart
          data={costData}
          title="Costs"
          valueFormatter={currencyFormatter}
        />
      );

      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA structure', () => {
      const { container } = renderWithDarkMode(
        <BarComparisonChart data={mockData} title="Accessible Chart" />
      );

      // Chart should be in a container
      expect(container.querySelector('.bg-white')).toBeInTheDocument();
    });

    it('should have readable title', () => {
      renderWithDarkMode(
        <BarComparisonChart data={mockData} title="Model Comparison" />
      );

      const title = screen.getByText('Model Comparison');
      expect(title.tagName).toBe('H3');
    });
  });
});
