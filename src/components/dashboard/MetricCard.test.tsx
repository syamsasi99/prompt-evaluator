import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MetricCard } from './MetricCard';

describe('MetricCard', () => {
  const defaultProps = {
    title: 'Test Metric',
    value: '123',
  };

  describe('Rendering', () => {
    it('should render title', () => {
      render(<MetricCard {...defaultProps} />);
      expect(screen.getByText('Test Metric')).toBeInTheDocument();
    });

    it('should render value as string', () => {
      render(<MetricCard {...defaultProps} value="456" />);
      expect(screen.getByText('456')).toBeInTheDocument();
    });

    it('should render value as number', () => {
      render(<MetricCard {...defaultProps} value={789} />);
      expect(screen.getByText('789')).toBeInTheDocument();
    });

    it('should render subtitle when provided', () => {
      render(<MetricCard {...defaultProps} subtitle="Test subtitle" />);
      expect(screen.getByText('Test subtitle')).toBeInTheDocument();
    });

    it('should not render subtitle when not provided', () => {
      const { container } = render(<MetricCard {...defaultProps} />);
      const subtitle = container.querySelector('.text-xs.text-gray-500');
      expect(subtitle).not.toBeInTheDocument();
    });
  });

  describe('Icon Rendering', () => {
    it('should render icon when provided', () => {
      const icon = <span data-testid="test-icon">📊</span>;
      render(<MetricCard {...defaultProps} icon={icon} />);
      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    });

    it('should not render icon container when icon not provided', () => {
      const { container } = render(<MetricCard {...defaultProps} />);
      const iconContainer = container.querySelector('.p-3.rounded-lg.bg-gradient-to-br');
      expect(iconContainer).not.toBeInTheDocument();
    });

    it('should apply blue gradient by default', () => {
      const icon = <span data-testid="test-icon">📊</span>;
      const { container } = render(<MetricCard {...defaultProps} icon={icon} />);
      const iconContainer = container.querySelector('.from-blue-500.to-blue-600');
      expect(iconContainer).toBeInTheDocument();
    });

    it('should apply green gradient when color is green', () => {
      const icon = <span data-testid="test-icon">📊</span>;
      const { container } = render(<MetricCard {...defaultProps} icon={icon} color="green" />);
      const iconContainer = container.querySelector('.from-green-500.to-green-600');
      expect(iconContainer).toBeInTheDocument();
    });

    it('should apply purple gradient when color is purple', () => {
      const icon = <span data-testid="test-icon">📊</span>;
      const { container } = render(<MetricCard {...defaultProps} icon={icon} color="purple" />);
      const iconContainer = container.querySelector('.from-purple-500.to-purple-600');
      expect(iconContainer).toBeInTheDocument();
    });

    it('should apply orange gradient when color is orange', () => {
      const icon = <span data-testid="test-icon">📊</span>;
      const { container } = render(<MetricCard {...defaultProps} icon={icon} color="orange" />);
      const iconContainer = container.querySelector('.from-orange-500.to-orange-600');
      expect(iconContainer).toBeInTheDocument();
    });

    it('should apply red gradient when color is red', () => {
      const icon = <span data-testid="test-icon">📊</span>;
      const { container } = render(<MetricCard {...defaultProps} icon={icon} color="red" />);
      const iconContainer = container.querySelector('.from-red-500.to-red-600');
      expect(iconContainer).toBeInTheDocument();
    });
  });

  describe('Trend Display', () => {
    it('should display positive trend with up arrow', () => {
      render(<MetricCard {...defaultProps} trend={15.5} />);
      expect(screen.getByText('↑')).toBeInTheDocument();
      expect(screen.getByText('15.5%')).toBeInTheDocument();
    });

    it('should display negative trend with down arrow', () => {
      render(<MetricCard {...defaultProps} trend={-10.2} />);
      expect(screen.getByText('↓')).toBeInTheDocument();
      expect(screen.getByText('10.2%')).toBeInTheDocument();
    });

    it('should apply green color to positive trend', () => {
      const { container } = render(<MetricCard {...defaultProps} trend={5} />);
      const trendElement = container.querySelector('.text-green-600');
      expect(trendElement).toBeInTheDocument();
    });

    it('should apply red color to negative trend', () => {
      const { container } = render(<MetricCard {...defaultProps} trend={-5} />);
      const trendElement = container.querySelector('.text-red-600');
      expect(trendElement).toBeInTheDocument();
    });

    it('should not display trend when value is very small (< 0.1)', () => {
      render(<MetricCard {...defaultProps} trend={0.05} />);
      expect(screen.queryByText(/↑|↓/)).not.toBeInTheDocument();
    });

    it('should not display trend when trend is undefined', () => {
      render(<MetricCard {...defaultProps} />);
      expect(screen.queryByText(/↑|↓/)).not.toBeInTheDocument();
    });

    it('should format trend to 1 decimal place', () => {
      render(<MetricCard {...defaultProps} trend={12.3456} />);
      expect(screen.getByText('12.3%')).toBeInTheDocument();
    });

    it('should handle zero trend', () => {
      render(<MetricCard {...defaultProps} trend={0} />);
      expect(screen.queryByText(/↑|↓/)).not.toBeInTheDocument();
    });
  });

  describe('Info Tooltip', () => {
    it('should not render tooltip icon when infoText not provided', () => {
      const { container } = render(<MetricCard {...defaultProps} />);
      const infoButton = container.querySelector('button');
      expect(infoButton).not.toBeInTheDocument();
    });

    it('should render tooltip icon when infoText provided', () => {
      const { container } = render(<MetricCard {...defaultProps} infoText="Additional info" />);
      const infoButton = container.querySelector('button[type="button"]');
      expect(infoButton).toBeInTheDocument();
    });

    it('should show tooltip on mouse enter', () => {
      const { container } = render(<MetricCard {...defaultProps} infoText="Helpful information" />);
      const infoButton = container.querySelector('button[type="button"]')!;

      expect(screen.queryByText('Helpful information')).not.toBeInTheDocument();

      fireEvent.mouseEnter(infoButton);
      expect(screen.getByText('Helpful information')).toBeInTheDocument();
    });

    it('should hide tooltip on mouse leave', () => {
      const { container } = render(<MetricCard {...defaultProps} infoText="Helpful information" />);
      const infoButton = container.querySelector('button[type="button"]')!;

      fireEvent.mouseEnter(infoButton);
      expect(screen.getByText('Helpful information')).toBeInTheDocument();

      fireEvent.mouseLeave(infoButton);
      expect(screen.queryByText('Helpful information')).not.toBeInTheDocument();
    });

    it('should toggle tooltip on click', () => {
      const { container } = render(<MetricCard {...defaultProps} infoText="Toggle info" />);
      const infoButton = container.querySelector('button[type="button"]')!;

      fireEvent.click(infoButton);
      expect(screen.getByText('Toggle info')).toBeInTheDocument();

      fireEvent.click(infoButton);
      expect(screen.queryByText('Toggle info')).not.toBeInTheDocument();
    });

    it('should stop click propagation on info button', () => {
      const onClick = vi.fn();
      const { container } = render(
        <MetricCard {...defaultProps} infoText="Info" onClick={onClick} />
      );
      const infoButton = container.querySelector('button[type="button"]')!;

      fireEvent.click(infoButton);
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('Click Handler', () => {
    it('should call onClick when card is clicked', () => {
      const onClick = vi.fn();
      const { container } = render(<MetricCard {...defaultProps} onClick={onClick} />);
      const card = container.firstChild as HTMLElement;

      fireEvent.click(card);
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when not provided', () => {
      const { container } = render(<MetricCard {...defaultProps} />);
      const card = container.firstChild as HTMLElement;

      // Should not throw error
      expect(() => fireEvent.click(card)).not.toThrow();
    });

    it('should apply cursor-pointer class when onClick provided', () => {
      const { container } = render(<MetricCard {...defaultProps} onClick={() => {}} />);
      const card = container.firstChild as HTMLElement;

      expect(card).toHaveClass('cursor-pointer');
    });

    it('should apply hover:shadow-md class when onClick provided', () => {
      const { container } = render(<MetricCard {...defaultProps} onClick={() => {}} />);
      const card = container.firstChild as HTMLElement;

      expect(card).toHaveClass('hover:shadow-md');
    });

    it('should not apply cursor-pointer when onClick not provided', () => {
      const { container } = render(<MetricCard {...defaultProps} />);
      const card = container.firstChild as HTMLElement;

      expect(card).not.toHaveClass('cursor-pointer');
    });
  });

  describe('Styling', () => {
    it('should have base card styling', () => {
      const { container } = render(<MetricCard {...defaultProps} />);
      const card = container.firstChild as HTMLElement;

      expect(card).toHaveClass('bg-white', 'dark:bg-gray-800', 'rounded-lg', 'shadow-sm', 'p-6');
    });

    it('should have dark mode border', () => {
      const { container } = render(<MetricCard {...defaultProps} />);
      const card = container.firstChild as HTMLElement;

      expect(card).toHaveClass('dark:border-gray-700');
    });

    it('should have transition-shadow class', () => {
      const { container } = render(<MetricCard {...defaultProps} />);
      const card = container.firstChild as HTMLElement;

      expect(card).toHaveClass('transition-shadow');
    });

    it('should style value text as large and bold', () => {
      const { container } = render(<MetricCard {...defaultProps} value="999" />);
      const valueElement = screen.getByText('999');

      expect(valueElement).toHaveClass('text-3xl', 'font-bold', 'text-gray-900', 'dark:text-gray-100');
    });

    it('should style title text appropriately', () => {
      render(<MetricCard {...defaultProps} title="My Metric" />);
      const titleElement = screen.getByText('My Metric');

      expect(titleElement).toHaveClass('text-sm', 'font-medium', 'text-gray-600', 'dark:text-gray-400');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large numbers', () => {
      render(<MetricCard {...defaultProps} value={999999999} />);
      expect(screen.getByText('999999999')).toBeInTheDocument();
    });

    it('should handle very small trend values', () => {
      render(<MetricCard {...defaultProps} trend={0.001} />);
      expect(screen.queryByText(/↑|↓/)).not.toBeInTheDocument();
    });

    it('should handle long titles', () => {
      const longTitle = 'Very Long Metric Title That Might Wrap';
      render(<MetricCard {...defaultProps} title={longTitle} />);
      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it('should handle empty string value', () => {
      render(<MetricCard {...defaultProps} value="" />);
      const { container } = render(<MetricCard {...defaultProps} value="" />);
      expect(container.querySelector('.text-3xl.font-bold')).toBeInTheDocument();
    });

    it('should handle zero value', () => {
      render(<MetricCard {...defaultProps} value={0} />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should handle negative value', () => {
      render(<MetricCard {...defaultProps} value={-50} />);
      expect(screen.getByText('-50')).toBeInTheDocument();
    });

    it('should handle decimal values', () => {
      render(<MetricCard {...defaultProps} value={12.34} />);
      expect(screen.getByText('12.34')).toBeInTheDocument();
    });

    it('should handle very long info text', () => {
      const longInfo = 'A'.repeat(200);
      const { container } = render(<MetricCard {...defaultProps} infoText={longInfo} />);
      const infoButton = container.querySelector('button[type="button"]')!;

      fireEvent.mouseEnter(infoButton);
      expect(screen.getByText(longInfo)).toBeInTheDocument();
    });
  });

  describe('Complex Scenarios', () => {
    it('should render all props together', () => {
      const icon = <span data-testid="icon">💰</span>;
      render(
        <MetricCard
          title="Revenue"
          value="$50,000"
          subtitle="Last 30 days"
          trend={12.5}
          icon={icon}
          color="green"
          infoText="Total revenue for the period"
          onClick={() => {}}
        />
      );

      expect(screen.getByText('Revenue')).toBeInTheDocument();
      expect(screen.getByText('$50,000')).toBeInTheDocument();
      expect(screen.getByText('Last 30 days')).toBeInTheDocument();
      expect(screen.getByText('12.5%')).toBeInTheDocument();
      expect(screen.getByTestId('icon')).toBeInTheDocument();
    });

    it('should handle trend with subtitle', () => {
      render(
        <MetricCard {...defaultProps} subtitle="vs last month" trend={-5.3} />
      );

      expect(screen.getByText('vs last month')).toBeInTheDocument();
      expect(screen.getByText('5.3%')).toBeInTheDocument();
      expect(screen.getByText('↓')).toBeInTheDocument();
    });

    it('should handle icon with custom color', () => {
      const icon = <span data-testid="icon">🔥</span>;
      const { container } = render(
        <MetricCard {...defaultProps} icon={icon} color="red" />
      );

      expect(screen.getByTestId('icon')).toBeInTheDocument();
      const iconContainer = container.querySelector('.from-red-500.to-red-600');
      expect(iconContainer).toBeInTheDocument();
    });
  });
});
