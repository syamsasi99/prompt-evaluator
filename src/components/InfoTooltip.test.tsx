import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InfoTooltip } from './InfoTooltip';

describe('InfoTooltip', () => {
  const defaultProps = {
    title: 'Test Title',
    description: 'Test description for the tooltip',
  };

  beforeEach(() => {
    // Mock getBoundingClientRect for position calculations
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      width: 200,
      height: 100,
      top: 100,
      left: 100,
      bottom: 200,
      right: 300,
      x: 100,
      y: 100,
      toJSON: () => {},
    }));

    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render info icon button', () => {
      const { container } = render(<InfoTooltip {...defaultProps} />);
      const button = container.querySelector('button');
      expect(button).toBeInTheDocument();
    });

    it('should render SVG icon', () => {
      const { container } = render(<InfoTooltip {...defaultProps} />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass('w-4', 'h-4');
    });

    it('should not show tooltip initially', () => {
      render(<InfoTooltip {...defaultProps} />);
      expect(screen.queryByText('Test Title')).not.toBeInTheDocument();
    });
  });

  describe('Tooltip Display', () => {
    it('should show tooltip on mouse enter', async () => {
      const { container } = render(<InfoTooltip {...defaultProps} />);
      const button = container.querySelector('button')!;

      fireEvent.mouseEnter(button);

      await waitFor(() => {
        expect(screen.getByText('Test Title')).toBeInTheDocument();
      });
    });

    it('should hide tooltip on mouse leave', async () => {
      const { container } = render(<InfoTooltip {...defaultProps} />);
      const button = container.querySelector('button')!;

      fireEvent.mouseEnter(button);
      await waitFor(() => {
        expect(screen.getByText('Test Title')).toBeInTheDocument();
      });

      fireEvent.mouseLeave(button);
      await waitFor(() => {
        expect(screen.queryByText('Test Title')).not.toBeInTheDocument();
      });
    });

    it('should display title in tooltip', async () => {
      const { container } = render(<InfoTooltip {...defaultProps} />);
      const button = container.querySelector('button')!;

      fireEvent.mouseEnter(button);

      await waitFor(() => {
        expect(screen.getByText('Test Title')).toBeInTheDocument();
      });
    });

    it('should display description in tooltip', async () => {
      const { container } = render(<InfoTooltip {...defaultProps} />);
      const button = container.querySelector('button')!;

      fireEvent.mouseEnter(button);

      await waitFor(() => {
        expect(screen.getByText('Test description for the tooltip')).toBeInTheDocument();
      });
    });

    it('should display calculation when provided', async () => {
      const propsWithCalculation = {
        ...defaultProps,
        calculation: 'sum(values) / count',
      };
      const { container } = render(<InfoTooltip {...propsWithCalculation} />);
      const button = container.querySelector('button')!;

      fireEvent.mouseEnter(button);

      await waitFor(() => {
        expect(screen.getByText(/Calculation:/)).toBeInTheDocument();
        expect(screen.getByText(/sum\(values\) \/ count/)).toBeInTheDocument();
      });
    });

    it('should not display calculation section when not provided', async () => {
      const { container } = render(<InfoTooltip {...defaultProps} />);
      const button = container.querySelector('button')!;

      fireEvent.mouseEnter(button);

      await waitFor(() => {
        expect(screen.queryByText(/Calculation:/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Positioning', () => {
    it('should position tooltip to the right by default', async () => {
      const { container } = render(<InfoTooltip {...defaultProps} />);
      const button = container.querySelector('button')!;

      fireEvent.mouseEnter(button);

      await waitFor(() => {
        const tooltip = container.querySelector('.absolute.z-50');
        expect(tooltip).toHaveClass('left-6');
      });
    });

    it('should position tooltip to the left when overflowing right edge', async () => {
      Element.prototype.getBoundingClientRect = vi.fn(function (this: Element) {
        if (this.tagName === 'BUTTON') {
          return {
            width: 20,
            height: 20,
            top: 100,
            left: 900, // Near right edge
            bottom: 120,
            right: 920,
            x: 900,
            y: 100,
            toJSON: () => {},
          };
        }
        return {
          width: 288, // w-72
          height: 100,
          top: 100,
          left: 100,
          bottom: 200,
          right: 388,
          x: 100,
          y: 100,
          toJSON: () => {},
        };
      });

      const { container } = render(<InfoTooltip {...defaultProps} />);
      const button = container.querySelector('button')!;

      fireEvent.mouseEnter(button);

      await waitFor(() => {
        const tooltip = container.querySelector('.absolute.z-50');
        expect(tooltip).toHaveClass('right-6');
      });
    });

    it('should position tooltip to the top when overflowing bottom edge', async () => {
      Element.prototype.getBoundingClientRect = vi.fn(function (this: Element) {
        if (this.tagName === 'BUTTON') {
          return {
            width: 20,
            height: 20,
            top: 700, // Near bottom edge
            left: 100,
            bottom: 720,
            right: 120,
            x: 100,
            y: 700,
            toJSON: () => {},
          };
        }
        return {
          width: 288,
          height: 100,
          top: 100,
          left: 100,
          bottom: 200,
          right: 388,
          x: 100,
          y: 100,
          toJSON: () => {},
        };
      });

      const { container } = render(<InfoTooltip {...defaultProps} />);
      const button = container.querySelector('button')!;

      fireEvent.mouseEnter(button);

      await waitFor(() => {
        const tooltip = container.querySelector('.absolute.z-50');
        expect(tooltip).toHaveClass('bottom-full');
      });
    });
  });

  describe('Styling', () => {
    it('should apply correct base styles to tooltip', async () => {
      const { container } = render(<InfoTooltip {...defaultProps} />);
      const button = container.querySelector('button')!;

      fireEvent.mouseEnter(button);

      await waitFor(() => {
        const tooltip = container.querySelector('.absolute.z-50');
        expect(tooltip).toHaveClass('w-72', 'p-3', 'bg-gray-900', 'text-white', 'rounded-lg', 'shadow-lg');
      });
    });

    it('should render arrow with correct styling', async () => {
      const { container } = render(<InfoTooltip {...defaultProps} />);
      const button = container.querySelector('button')!;

      fireEvent.mouseEnter(button);

      await waitFor(() => {
        const arrow = container.querySelector('.w-2.h-2.bg-gray-900');
        expect(arrow).toBeInTheDocument();
        expect(arrow).toHaveClass('transform', 'rotate-45');
      });
    });

    it('should apply hover styles to button', () => {
      const { container } = render(<InfoTooltip {...defaultProps} />);
      const button = container.querySelector('button')!;

      expect(button).toHaveClass('text-gray-400', 'hover:text-gray-600');
    });
  });

  describe('Accessibility', () => {
    it('should have button type attribute', () => {
      const { container } = render(<InfoTooltip {...defaultProps} />);
      const button = container.querySelector('button')!;

      expect(button).toHaveAttribute('type', 'button');
    });

    it('should have focus outline removed', () => {
      const { container } = render(<InfoTooltip {...defaultProps} />);
      const button = container.querySelector('button')!;

      expect(button).toHaveClass('focus:outline-none');
    });

    it('should have proper z-index for tooltip overlay', async () => {
      const { container } = render(<InfoTooltip {...defaultProps} />);
      const button = container.querySelector('button')!;

      fireEvent.mouseEnter(button);

      await waitFor(() => {
        const tooltip = container.querySelector('.absolute.z-50');
        expect(tooltip).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty title gracefully', async () => {
      const { container } = render(<InfoTooltip {...defaultProps} title="" />);
      const button = container.querySelector('button')!;

      fireEvent.mouseEnter(button);

      await waitFor(() => {
        const tooltip = container.querySelector('.absolute.z-50');
        expect(tooltip).toBeInTheDocument();
      });
    });

    it('should handle long text with word wrapping', async () => {
      const longProps = {
        title: 'Very Long Title '.repeat(10),
        description: 'Very long description '.repeat(20),
      };
      const { container } = render(<InfoTooltip {...longProps} />);
      const button = container.querySelector('button')!;

      fireEvent.mouseEnter(button);

      await waitFor(() => {
        const tooltip = container.querySelector('.absolute.z-50');
        expect(tooltip).toHaveClass('whitespace-normal', 'break-words');
      });
    });

    it('should handle rapid mouse enter/leave events', async () => {
      const { container } = render(<InfoTooltip {...defaultProps} />);
      const button = container.querySelector('button')!;

      // Rapid toggling
      fireEvent.mouseEnter(button);
      fireEvent.mouseLeave(button);
      fireEvent.mouseEnter(button);

      await waitFor(() => {
        expect(screen.getByText('Test Title')).toBeInTheDocument();
      });

      fireEvent.mouseLeave(button);

      await waitFor(() => {
        expect(screen.queryByText('Test Title')).not.toBeInTheDocument();
      });
    });
  });
});
