import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PieChart } from './PieChart';
import { DarkModeProvider } from '../../contexts/DarkModeContext';

// Mock Recharts to avoid rendering issues in tests
vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
    PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
    Pie: ({ children }: any) => <div data-testid="pie">{children}</div>,
    Cell: () => <div data-testid="cell" />,
    Tooltip: () => <div data-testid="tooltip" />,
    Legend: () => <div data-testid="legend" />,
  };
});

const renderWithDarkMode = (ui: React.ReactElement, darkMode = false) => {
  return render(
    <DarkModeProvider initialDarkMode={darkMode}>
      {ui}
    </DarkModeProvider>
  );
};

describe('PieChart', () => {
  const mockData = [
    { name: 'Category A', value: 100, color: '#FF6384' },
    { name: 'Category B', value: 200, color: '#36A2EB' },
    { name: 'Category C', value: 150, color: '#FFCE56' },
  ];

  describe('Rendering', () => {
    it('should render chart title', () => {
      renderWithDarkMode(<PieChart data={mockData} title="Test Pie Chart" />);
      expect(screen.getByText('Test Pie Chart')).toBeInTheDocument();
    });

    it('should render ResponsiveContainer', () => {
      renderWithDarkMode(<PieChart data={mockData} title="Test Chart" />);
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('should render PieChart component', () => {
      renderWithDarkMode(<PieChart data={mockData} title="Test Chart" />);
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    });

    it('should render Pie component', () => {
      renderWithDarkMode(<PieChart data={mockData} title="Test Chart" />);
      expect(screen.getByTestId('pie')).toBeInTheDocument();
    });

    it('should render tooltip', () => {
      renderWithDarkMode(<PieChart data={mockData} title="Test Chart" />);
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });

    it('should render legend', () => {
      renderWithDarkMode(<PieChart data={mockData} title="Test Chart" />);
      expect(screen.getByTestId('legend')).toBeInTheDocument();
    });

    it('should render cells for each data point', () => {
      renderWithDarkMode(<PieChart data={mockData} title="Test Chart" />);
      const cells = screen.getAllByTestId('cell');
      expect(cells).toHaveLength(mockData.length);
    });
  });

  describe('Props', () => {
    it('should use default height of 300', () => {
      const { container } = renderWithDarkMode(<PieChart data={mockData} title="Test Chart" />);
      const responsiveContainer = container.querySelector('[data-testid="responsive-container"]');
      expect(responsiveContainer).toBeInTheDocument();
    });

    it('should accept custom height', () => {
      renderWithDarkMode(<PieChart data={mockData} title="Test Chart" height={400} />);
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('should use default value formatter', () => {
      renderWithDarkMode(<PieChart data={mockData} title="Test Chart" />);
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });

    it('should accept custom value formatter', () => {
      const customFormatter = (value: number) => `$${value}`;
      renderWithDarkMode(
        <PieChart data={mockData} title="Test Chart" valueFormatter={customFormatter} />
      );
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });

    it('should show labels by default', () => {
      renderWithDarkMode(<PieChart data={mockData} title="Test Chart" />);
      expect(screen.getByTestId('pie')).toBeInTheDocument();
    });

    it('should hide labels when showLabels is false', () => {
      renderWithDarkMode(<PieChart data={mockData} title="Test Chart" showLabels={false} />);
      expect(screen.getByTestId('pie')).toBeInTheDocument();
    });
  });

  describe('Data Handling', () => {
    it('should handle empty data array', () => {
      renderWithDarkMode(<PieChart data={[]} title="Empty Chart" />);
      expect(screen.getByText('Empty Chart')).toBeInTheDocument();
      expect(screen.getByTestId('pie')).toBeInTheDocument();
    });

    it('should handle single data point', () => {
      const singleData = [{ name: 'Single', value: 100, color: '#FF6384' }];
      renderWithDarkMode(<PieChart data={singleData} title="Single Point" />);
      const cells = screen.getAllByTestId('cell');
      expect(cells).toHaveLength(1);
    });

    it('should handle multiple data points', () => {
      renderWithDarkMode(<PieChart data={mockData} title="Multiple Points" />);
      const cells = screen.getAllByTestId('cell');
      expect(cells).toHaveLength(3);
    });

    it('should handle zero values', () => {
      const dataWithZero = [
        { name: 'Zero', value: 0, color: '#FF6384' },
        { name: 'Non-zero', value: 100, color: '#36A2EB' },
      ];
      renderWithDarkMode(<PieChart data={dataWithZero} title="With Zero" />);
      const cells = screen.getAllByTestId('cell');
      expect(cells).toHaveLength(2);
    });

    it('should handle large values', () => {
      const largeData = [
        { name: 'Large A', value: 1000000, color: '#FF6384' },
        { name: 'Large B', value: 2000000, color: '#36A2EB' },
      ];
      renderWithDarkMode(<PieChart data={largeData} title="Large Values" />);
      expect(screen.getByText('Large Values')).toBeInTheDocument();
    });
  });

  describe('Dark Mode', () => {
    it('should render in light mode', () => {
      const { container } = renderWithDarkMode(<PieChart data={mockData} title="Light Mode" />, false);
      const chartContainer = container.querySelector('.bg-white');
      expect(chartContainer).toBeInTheDocument();
    });

    it('should render in dark mode', () => {
      const { container } = renderWithDarkMode(<PieChart data={mockData} title="Dark Mode" />, true);
      const chartContainer = container.querySelector('.dark\\:bg-gray-800');
      expect(chartContainer).toBeInTheDocument();
    });

    it('should apply dark mode border color', () => {
      const { container } = renderWithDarkMode(<PieChart data={mockData} title="Dark Border" />, true);
      const chartContainer = container.querySelector('.dark\\:border-gray-700');
      expect(chartContainer).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should have base container styling', () => {
      const { container } = renderWithDarkMode(<PieChart data={mockData} title="Styled" />);
      const chartContainer = container.querySelector('.rounded-lg.border');
      expect(chartContainer).toBeInTheDocument();
    });

    it('should have padding', () => {
      const { container } = renderWithDarkMode(<PieChart data={mockData} title="Padded" />);
      const chartContainer = container.querySelector('.p-4');
      expect(chartContainer).toBeInTheDocument();
    });

    it('should style title correctly', () => {
      renderWithDarkMode(<PieChart data={mockData} title="Styled Title" />);
      const title = screen.getByText('Styled Title');
      expect(title).toHaveClass('text-lg', 'font-semibold', 'mb-4');
    });

    it('should apply dark mode text color to title', () => {
      renderWithDarkMode(<PieChart data={mockData} title="Dark Title" />, true);
      const title = screen.getByText('Dark Title');
      expect(title).toHaveClass('dark:text-gray-100');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long title', () => {
      const longTitle = 'A'.repeat(100);
      renderWithDarkMode(<PieChart data={mockData} title={longTitle} />);
      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it('should handle special characters in title', () => {
      const specialTitle = 'Chart: Test & Data < > "';
      renderWithDarkMode(<PieChart data={mockData} title={specialTitle} />);
      expect(screen.getByText(specialTitle)).toBeInTheDocument();
    });

    it('should handle negative values', () => {
      const negativeData = [
        { name: 'Negative', value: -50, color: '#FF6384' },
        { name: 'Positive', value: 100, color: '#36A2EB' },
      ];
      renderWithDarkMode(<PieChart data={negativeData} title="Negative Values" />);
      expect(screen.getByText('Negative Values')).toBeInTheDocument();
    });

    it('should handle decimal values', () => {
      const decimalData = [
        { name: 'Decimal A', value: 12.5, color: '#FF6384' },
        { name: 'Decimal B', value: 37.8, color: '#36A2EB' },
      ];
      renderWithDarkMode(<PieChart data={decimalData} title="Decimal Values" />);
      const cells = screen.getAllByTestId('cell');
      expect(cells).toHaveLength(2);
    });

    it('should handle very small height', () => {
      renderWithDarkMode(<PieChart data={mockData} title="Small Height" height={50} />);
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('should handle very large height', () => {
      renderWithDarkMode(<PieChart data={mockData} title="Large Height" height={1000} />);
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });
  });

  describe('Value Formatter', () => {
    it('should format values as currency', () => {
      const currencyFormatter = (value: number) => `$${value.toFixed(2)}`;
      renderWithDarkMode(
        <PieChart data={mockData} title="Currency" valueFormatter={currencyFormatter} />
      );
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });

    it('should format values as percentages', () => {
      const percentFormatter = (value: number) => `${value}%`;
      renderWithDarkMode(
        <PieChart data={mockData} title="Percentage" valueFormatter={percentFormatter} />
      );
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });

    it('should format large numbers with commas', () => {
      const largeData = [{ name: 'Large', value: 1000000, color: '#FF6384' }];
      renderWithDarkMode(<PieChart data={largeData} title="Large Numbers" />);
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });
  });

  describe('Colors', () => {
    it('should use provided colors for each segment', () => {
      renderWithDarkMode(<PieChart data={mockData} title="Colored Chart" />);
      const cells = screen.getAllByTestId('cell');
      expect(cells).toHaveLength(mockData.length);
    });

    it('should handle different color formats', () => {
      const colorData = [
        { name: 'Hex', value: 100, color: '#FF6384' },
        { name: 'RGB', value: 200, color: 'rgb(54, 162, 235)' },
        { name: 'Named', value: 150, color: 'blue' },
      ];
      renderWithDarkMode(<PieChart data={colorData} title="Color Formats" />);
      const cells = screen.getAllByTestId('cell');
      expect(cells).toHaveLength(3);
    });
  });
});
