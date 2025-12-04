import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { LoadingOverlay } from './LoadingOverlay';

describe('LoadingOverlay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render with default message', () => {
      render(<LoadingOverlay />);
      expect(screen.getByText(/Processing with AI\.\.\./)).toBeInTheDocument();
    });

    it('should render with custom message', () => {
      render(<LoadingOverlay message="Custom loading message" />);
      expect(screen.getByText(/Custom loading message/)).toBeInTheDocument();
    });

    it('should render AI analysis description', () => {
      render(<LoadingOverlay />);
      expect(screen.getByText('AI is analyzing your prompts and generating results')).toBeInTheDocument();
    });

    it('should render spinner SVG icon', () => {
      const { container } = render(<LoadingOverlay />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass('w-10', 'h-10');
    });

    it('should render 5 floating particles', () => {
      const { container } = render(<LoadingOverlay />);
      const particles = container.querySelectorAll('.animate-float');
      expect(particles).toHaveLength(5);
    });
  });

  describe('Animated Dots', () => {
    it('should start with no dots', () => {
      const { container } = render(<LoadingOverlay message="Loading" />);
      const dotsSpan = container.querySelector('.inline-block.w-8');
      expect(dotsSpan?.textContent).toBe('');
    });

    it('should add dots progressively', () => {
      const { container } = render(<LoadingOverlay message="Loading" />);
      const getDotsContent = () => container.querySelector('.inline-block.w-8')?.textContent;

      // After 500ms - 1 dot
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(getDotsContent()).toBe('.');

      // After 1000ms - 2 dots
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(getDotsContent()).toBe('..');

      // After 1500ms - 3 dots
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(getDotsContent()).toBe('...');

      // After 2000ms - reset to no dots
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(getDotsContent()).toBe('');
    });

    it('should loop dots animation', () => {
      const { container } = render(<LoadingOverlay message="Loading" />);
      const getDotsContent = () => container.querySelector('.inline-block.w-8')?.textContent;

      // Complete one cycle (3 dots then reset)
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // After reset, advance to first dot of second cycle
      act(() => {
        vi.advanceTimersByTime(500);
      });
      const content = getDotsContent();
      // Should have one dot again
      expect(content).toBe('.');
    });
  });

  describe('Progress Bar', () => {
    it('should not render progress bar when progress is undefined', () => {
      const { container } = render(<LoadingOverlay />);
      expect(container.querySelector('.bg-gray-200.dark\\:bg-gray-700')).not.toBeInTheDocument();
    });

    it('should render progress bar when progress is provided', () => {
      render(<LoadingOverlay progress={50} />);
      expect(screen.getByText('Progress')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('should display correct progress percentage', () => {
      render(<LoadingOverlay progress={75} />);
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('should round progress percentage', () => {
      render(<LoadingOverlay progress={33.7} />);
      expect(screen.getByText('34%')).toBeInTheDocument();
    });

    it('should set progress bar width correctly', () => {
      const { container } = render(<LoadingOverlay progress={60} />);
      const progressBar = container.querySelector('.h-full.bg-gradient-to-r');
      expect(progressBar).toHaveStyle({ width: '60%' });
    });

    it('should handle 0% progress', () => {
      const { container } = render(<LoadingOverlay progress={0} />);
      expect(screen.getByText('0%')).toBeInTheDocument();
      const progressBar = container.querySelector('.h-full.bg-gradient-to-r');
      expect(progressBar).toHaveStyle({ width: '0%' });
    });

    it('should handle 100% progress', () => {
      const { container } = render(<LoadingOverlay progress={100} />);
      expect(screen.getByText('100%')).toBeInTheDocument();
      const progressBar = container.querySelector('.h-full.bg-gradient-to-r');
      expect(progressBar).toHaveStyle({ width: '100%' });
    });
  });

  describe('Timeout Functionality', () => {
    it('should not trigger timeout when onTimeout is not provided', () => {
      render(<LoadingOverlay />);
      vi.advanceTimersByTime(120000);
      expect(screen.queryByText(/taking longer than expected/)).not.toBeInTheDocument();
    });

    it('should call onTimeout after default timeout (120000ms)', () => {
      const onTimeout = vi.fn();
      render(<LoadingOverlay onTimeout={onTimeout} />);

      vi.advanceTimersByTime(119999);
      expect(onTimeout).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(onTimeout).toHaveBeenCalledTimes(1);
    });

    it('should call onTimeout after custom timeout', () => {
      const onTimeout = vi.fn();
      render(<LoadingOverlay onTimeout={onTimeout} timeoutMs={5000} />);

      vi.advanceTimersByTime(4999);
      expect(onTimeout).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(onTimeout).toHaveBeenCalledTimes(1);
    });

    it('should display timeout warning after timeout triggers', () => {
      const onTimeout = vi.fn();
      const { rerender } = render(<LoadingOverlay onTimeout={onTimeout} />);

      vi.advanceTimersByTime(120000);

      // Force a rerender to reflect state changes
      rerender(<LoadingOverlay onTimeout={onTimeout} />);

      expect(screen.getByText(/Request is taking longer than expected/)).toBeInTheDocument();
    });

    it('should show warning emoji in timeout message', () => {
      const onTimeout = vi.fn();
      const { rerender } = render(<LoadingOverlay onTimeout={onTimeout} />);

      vi.advanceTimersByTime(120000);

      // Force a rerender to reflect state changes
      rerender(<LoadingOverlay onTimeout={onTimeout} />);

      expect(screen.getByText(/⚠️/)).toBeInTheDocument();
    });
  });

  describe('Cleanup', () => {
    it('should clear dots interval on unmount', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      const { unmount } = render(<LoadingOverlay />);

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
    });

    it('should clear timeout on unmount', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      const onTimeout = vi.fn();
      const { unmount } = render(<LoadingOverlay onTimeout={onTimeout} />);

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
    });

    it('should not call onTimeout after unmount', () => {
      const onTimeout = vi.fn();
      const { unmount } = render(<LoadingOverlay onTimeout={onTimeout} timeoutMs={1000} />);

      unmount();
      vi.advanceTimersByTime(1000);

      expect(onTimeout).not.toHaveBeenCalled();
    });
  });

  describe('Styling', () => {
    it('should have backdrop blur overlay', () => {
      const { container } = render(<LoadingOverlay />);
      const overlay = container.querySelector('.fixed.inset-0');
      expect(overlay).toHaveClass('bg-black', 'bg-opacity-60', 'backdrop-blur-sm');
    });

    it('should have z-index 50 for overlay', () => {
      const { container } = render(<LoadingOverlay />);
      const overlay = container.querySelector('.fixed.inset-0');
      expect(overlay).toHaveClass('z-50');
    });

    it('should have rounded card with shadow', () => {
      const { container } = render(<LoadingOverlay />);
      const card = container.querySelector('.relative.bg-white');
      expect(card).toHaveClass('rounded-2xl', 'shadow-2xl');
    });

    it('should have animated gradient border effect', () => {
      const { container } = render(<LoadingOverlay />);
      const gradientBorder = container.querySelector('.bg-gradient-to-r.from-blue-500');
      expect(gradientBorder).toHaveClass('animate-pulse', 'opacity-20');
    });

    it('should have spinning ring animation', () => {
      const { container } = render(<LoadingOverlay />);
      const spinningRing = container.querySelector('.border-t-blue-500');
      expect(spinningRing).toHaveClass('animate-spin');
    });

    it('should apply smooth transition to progress bar', () => {
      const { container } = render(<LoadingOverlay progress={50} />);
      const progressBar = container.querySelector('.h-full.bg-gradient-to-r');
      expect(progressBar).toHaveClass('transition-all', 'duration-500', 'ease-out');
    });
  });

  describe('Accessibility', () => {
    it('should center content vertically and horizontally', () => {
      const { container } = render(<LoadingOverlay />);
      const overlay = container.querySelector('.fixed.inset-0');
      expect(overlay).toHaveClass('flex', 'items-center', 'justify-center');
    });

    it('should have proper contrast for text', () => {
      const { container } = render(<LoadingOverlay />);
      const heading = container.querySelector('h3');
      expect(heading).toHaveClass('text-gray-900', 'dark:text-white');
    });

    it('should have responsive max width', () => {
      const { container } = render(<LoadingOverlay />);
      const card = container.querySelector('.relative.bg-white');
      expect(card).toHaveClass('max-w-md', 'w-full', 'mx-4');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long messages', () => {
      const longMessage = 'A'.repeat(200);
      render(<LoadingOverlay message={longMessage} />);
      expect(screen.getByText(new RegExp(longMessage))).toBeInTheDocument();
    });

    it('should handle negative progress', () => {
      const { container } = render(<LoadingOverlay progress={-10} />);
      const progressBar = container.querySelector('.h-full.bg-gradient-to-r');
      expect(progressBar).toHaveStyle({ width: '-10%' });
    });

    it('should handle progress over 100', () => {
      const { container } = render(<LoadingOverlay progress={150} />);
      expect(screen.getByText('150%')).toBeInTheDocument();
    });

    it('should handle empty message', () => {
      render(<LoadingOverlay message="" />);
      const { container } = render(<LoadingOverlay message="" />);
      const heading = container.querySelector('h3');
      expect(heading).toBeInTheDocument();
    });

    it('should handle very short timeout', () => {
      const onTimeout = vi.fn();
      render(<LoadingOverlay onTimeout={onTimeout} timeoutMs={1} />);

      vi.advanceTimersByTime(1);
      expect(onTimeout).toHaveBeenCalledTimes(1);
    });
  });
});
