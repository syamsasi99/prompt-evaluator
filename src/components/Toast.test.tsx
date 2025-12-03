import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastItem, ToastContainer } from './Toast';
import type { Toast } from './Toast';

describe('ToastItem', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render toast message', () => {
    const toast: Toast = {
      id: '1',
      message: 'Test message',
      type: 'success',
    };
    const onClose = vi.fn();

    render(<ToastItem toast={toast} onClose={onClose} />);

    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', async () => {
    vi.useRealTimers(); // Use real timers for user interaction
    const user = userEvent.setup();
    const toast: Toast = {
      id: '1',
      message: 'Test message',
      type: 'success',
    };
    const onClose = vi.fn();

    render(<ToastItem toast={toast} onClose={onClose} />);

    const closeButton = screen.getByRole('button');
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalledWith('1');
    vi.useFakeTimers(); // Restore fake timers
  });

  it('should auto-close after default duration (3000ms)', () => {
    const toast: Toast = {
      id: '1',
      message: 'Test message',
      type: 'success',
    };
    const onClose = vi.fn();

    render(<ToastItem toast={toast} onClose={onClose} />);

    expect(onClose).not.toHaveBeenCalled();

    vi.advanceTimersByTime(3000);

    expect(onClose).toHaveBeenCalledWith('1');
  });

  it('should auto-close after custom duration', () => {
    const toast: Toast = {
      id: '1',
      message: 'Test message',
      type: 'success',
      duration: 5000,
    };
    const onClose = vi.fn();

    render(<ToastItem toast={toast} onClose={onClose} />);

    vi.advanceTimersByTime(3000);
    expect(onClose).not.toHaveBeenCalled();

    vi.advanceTimersByTime(2000);
    expect(onClose).toHaveBeenCalledWith('1');
  });

  it('should render success toast with correct styling', () => {
    const toast: Toast = {
      id: '1',
      message: 'Success message',
      type: 'success',
    };
    const onClose = vi.fn();

    const { container } = render(<ToastItem toast={toast} onClose={onClose} />);

    const toastElement = container.firstChild as HTMLElement;
    expect(toastElement).toHaveClass('bg-green-50', 'text-green-800', 'border-green-200');
  });

  it('should render error toast with correct styling', () => {
    const toast: Toast = {
      id: '1',
      message: 'Error message',
      type: 'error',
    };
    const onClose = vi.fn();

    const { container } = render(<ToastItem toast={toast} onClose={onClose} />);

    const toastElement = container.firstChild as HTMLElement;
    expect(toastElement).toHaveClass('bg-red-50', 'text-red-800', 'border-red-200');
  });

  it('should render warning toast with correct styling', () => {
    const toast: Toast = {
      id: '1',
      message: 'Warning message',
      type: 'warning',
    };
    const onClose = vi.fn();

    const { container } = render(<ToastItem toast={toast} onClose={onClose} />);

    const toastElement = container.firstChild as HTMLElement;
    expect(toastElement).toHaveClass('bg-yellow-50', 'text-yellow-800', 'border-yellow-200');
  });

  it('should render info toast with correct styling', () => {
    const toast: Toast = {
      id: '1',
      message: 'Info message',
      type: 'info',
    };
    const onClose = vi.fn();

    const { container } = render(<ToastItem toast={toast} onClose={onClose} />);

    const toastElement = container.firstChild as HTMLElement;
    expect(toastElement).toHaveClass('bg-blue-50', 'text-blue-800', 'border-blue-200');
  });

  it('should render appropriate icon for each toast type', () => {
    const types: Array<'success' | 'error' | 'warning' | 'info'> = [
      'success',
      'error',
      'warning',
      'info',
    ];

    types.forEach((type) => {
      const toast: Toast = {
        id: `${type}-1`,
        message: `${type} message`,
        type,
      };
      const onClose = vi.fn();

      const { container, unmount } = render(<ToastItem toast={toast} onClose={onClose} />);

      // Check that an SVG icon is rendered
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();

      unmount();
    });
  });
});

describe('ToastContainer', () => {
  it('should render multiple toasts', () => {
    const toasts: Toast[] = [
      { id: '1', message: 'First toast', type: 'success' },
      { id: '2', message: 'Second toast', type: 'error' },
      { id: '3', message: 'Third toast', type: 'info' },
    ];
    const onClose = vi.fn();

    render(<ToastContainer toasts={toasts} onClose={onClose} />);

    expect(screen.getByText('First toast')).toBeInTheDocument();
    expect(screen.getByText('Second toast')).toBeInTheDocument();
    expect(screen.getByText('Third toast')).toBeInTheDocument();
  });

  it('should render empty container when no toasts', () => {
    const onClose = vi.fn();

    const { container } = render(<ToastContainer toasts={[]} onClose={onClose} />);

    expect(container.firstChild?.childNodes.length).toBe(0);
  });

  it('should position container in top-right corner', () => {
    const toasts: Toast[] = [{ id: '1', message: 'Test', type: 'info' }];
    const onClose = vi.fn();

    const { container } = render(<ToastContainer toasts={toasts} onClose={onClose} />);

    const containerElement = container.firstChild as HTMLElement;
    expect(containerElement).toHaveClass('fixed', 'top-4', 'right-4', 'z-50');
  });

  it('should pass onClose to each toast item', async () => {
    vi.useRealTimers(); // Use real timers for user interaction
    const user = userEvent.setup();
    const toasts: Toast[] = [
      { id: '1', message: 'First toast', type: 'success' },
      { id: '2', message: 'Second toast', type: 'error' },
    ];
    const onClose = vi.fn();

    render(<ToastContainer toasts={toasts} onClose={onClose} />);

    const buttons = screen.getAllByRole('button');
    await user.click(buttons[0]);

    expect(onClose).toHaveBeenCalledWith('1');
  });
});
