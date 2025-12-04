import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { Loader } from './Loader';

describe('Loader', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render the loader component', () => {
      render(<Loader />);
      expect(screen.getByText('Prompt Evaluator')).toBeInTheDocument();
    });

    it('should render the subtitle', () => {
      render(<Loader />);
      expect(screen.getByText('Intelligent AI Testing Tool')).toBeInTheDocument();
    });

    it('should start with "Initializing" text', () => {
      render(<Loader />);
      expect(screen.getByText(/Initializing/i)).toBeInTheDocument();
    });

    it('should render System Online status', () => {
      render(<Loader />);
      expect(screen.getByText('System Online')).toBeInTheDocument();
    });

    it('should render AI Ready status', () => {
      render(<Loader />);
      expect(screen.getByText('AI Ready')).toBeInTheDocument();
    });

    it('should render progress bar at 0% initially', () => {
      const { container } = render(<Loader />);
      const progressBar = container.querySelector('.h-full');
      expect(progressBar).toHaveStyle({ width: '0%' });
    });
  });

  describe('Progress Animation', () => {
    it('should increase progress over time', () => {
      const { container } = render(<Loader />);
      const progressBar = container.querySelector('.h-full') as HTMLElement;

      // Initial state
      expect(progressBar).toHaveStyle({ width: '0%' });

      // After 150ms
      act(() => {
        vi.advanceTimersByTime(150);
      });
      const width1 = parseFloat(progressBar.style.width);
      expect(width1).toBeGreaterThan(0);

      // After another 150ms
      act(() => {
        vi.advanceTimersByTime(150);
      });
      const width2 = parseFloat(progressBar.style.width);
      expect(width2).toBeGreaterThan(width1);
    });

    it('should cap progress at 95%', () => {
      const { container } = render(<Loader />);
      const progressBar = container.querySelector('.h-full') as HTMLElement;

      // Advance time enough to reach 95%
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      const finalWidth = parseFloat(progressBar.style.width);
      expect(finalWidth).toBeLessThanOrEqual(95);
    });
  });

  describe('Loading Messages', () => {
    it('should cycle through loading messages', () => {
      render(<Loader />);

      // Initial message
      expect(screen.getByText(/Initializing/i)).toBeInTheDocument();

      // After 800ms - should show second message
      act(() => {
        vi.advanceTimersByTime(800);
      });
      expect(screen.getByText(/Loading modules/i)).toBeInTheDocument();

      // After another 800ms - should show third message
      act(() => {
        vi.advanceTimersByTime(800);
      });
      expect(screen.getByText(/Connecting services/i)).toBeInTheDocument();

      // After another 800ms - should show fourth message
      act(() => {
        vi.advanceTimersByTime(800);
      });
      expect(screen.getByText(/Almost ready/i)).toBeInTheDocument();
    });

    it('should loop back to first message after all messages shown', () => {
      render(<Loader />);

      // Cycle through all 4 messages (800ms each)
      act(() => {
        vi.advanceTimersByTime(3200);
      });

      // Should be back to first message
      expect(screen.getByText(/Initializing/i)).toBeInTheDocument();
    });
  });

  describe('Visual Elements', () => {
    it('should render 20 floating particles', () => {
      const { container } = render(<Loader />);
      const particles = container.querySelectorAll('.absolute.w-1.h-1.bg-blue-400');
      expect(particles).toHaveLength(20);
    });

    it('should render animated dots', () => {
      const { container } = render(<Loader />);
      const dots = container.querySelectorAll('.inline-block.animate-ping.ml-1');
      expect(dots).toHaveLength(3);
    });
  });

  describe('Cleanup', () => {
    it('should clear intervals on unmount', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      const { unmount } = render(<Loader />);

      unmount();

      // Should clear both intervals (progress and messages)
      expect(clearIntervalSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Accessibility', () => {
    it('should have proper text contrast for visibility', () => {
      const { container } = render(<Loader />);
      const title = screen.getByText('Prompt Evaluator');
      expect(title).toHaveClass('text-transparent');
      expect(title).toHaveClass('bg-clip-text');
    });

    it('should use semantic HTML structure', () => {
      const { container } = render(<Loader />);
      expect(container.querySelector('h1')).toBeInTheDocument();
      expect(container.querySelector('p')).toBeInTheDocument();
    });
  });
});
