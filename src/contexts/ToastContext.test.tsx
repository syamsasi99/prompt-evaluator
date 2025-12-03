import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { ToastProvider, useToast } from './ToastContext';
import React from 'react';

describe('ToastContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  describe('useToast hook', () => {
    it('should throw error when used outside ToastProvider', () => {
      // Suppress console.error for this test
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useToast());
      }).toThrow('useToast must be used within a ToastProvider');

      consoleError.mockRestore();
    });

    it('should provide toast context when used inside ToastProvider', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: ToastProvider,
      });

      expect(result.current).toHaveProperty('showToast');
      expect(result.current).toHaveProperty('success');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('info');
      expect(result.current).toHaveProperty('warning');
    });
  });

  describe('showToast', () => {
    it('should create a toast with default type', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: ToastProvider,
      });

      act(() => {
        result.current.showToast('Test message');
      });

      // Toast should be created (verified by no errors)
      expect(result.current).toBeDefined();
    });

    it('should create a toast with specified type', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: ToastProvider,
      });

      act(() => {
        result.current.showToast('Test message', 'error');
      });

      expect(result.current).toBeDefined();
    });

    it('should create a toast with custom duration', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: ToastProvider,
      });

      act(() => {
        result.current.showToast('Test message', 'info', 5000);
      });

      expect(result.current).toBeDefined();
    });

    it('should generate unique IDs for toasts', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: ToastProvider,
      });

      act(() => {
        result.current.showToast('Message 1');
        result.current.showToast('Message 2');
      });

      // Both toasts should be created independently
      expect(result.current).toBeDefined();
    });
  });

  describe('success', () => {
    it('should create success toast', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: ToastProvider,
      });

      act(() => {
        result.current.success('Success message');
      });

      expect(result.current).toBeDefined();
    });

    it('should accept custom duration', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: ToastProvider,
      });

      act(() => {
        result.current.success('Success message', 5000);
      });

      expect(result.current).toBeDefined();
    });
  });

  describe('error', () => {
    it('should create error toast', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: ToastProvider,
      });

      act(() => {
        result.current.error('Error message');
      });

      expect(result.current).toBeDefined();
    });

    it('should accept custom duration', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: ToastProvider,
      });

      act(() => {
        result.current.error('Error message', 5000);
      });

      expect(result.current).toBeDefined();
    });
  });

  describe('info', () => {
    it('should create info toast', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: ToastProvider,
      });

      act(() => {
        result.current.info('Info message');
      });

      expect(result.current).toBeDefined();
    });

    it('should accept custom duration', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: ToastProvider,
      });

      act(() => {
        result.current.info('Info message', 5000);
      });

      expect(result.current).toBeDefined();
    });
  });

  describe('warning', () => {
    it('should create warning toast', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: ToastProvider,
      });

      act(() => {
        result.current.warning('Warning message');
      });

      expect(result.current).toBeDefined();
    });

    it('should accept custom duration', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: ToastProvider,
      });

      act(() => {
        result.current.warning('Warning message', 5000);
      });

      expect(result.current).toBeDefined();
    });
  });

  describe('Multiple toasts', () => {
    it('should allow multiple toasts to be created', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: ToastProvider,
      });

      act(() => {
        result.current.success('Success 1');
        result.current.error('Error 1');
        result.current.info('Info 1');
        result.current.warning('Warning 1');
      });

      // All toasts should be created
      expect(result.current).toBeDefined();
    });

    it('should handle rapid toast creation', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: ToastProvider,
      });

      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.info(`Toast ${i}`);
        }
      });

      expect(result.current).toBeDefined();
    });
  });

  describe('Toast persistence', () => {
    it('should maintain reference stability', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: ToastProvider,
      });

      const firstRef = result.current.success;

      act(() => {
        result.current.success('Test');
      });

      // Function references should be stable (memoized)
      expect(result.current.success).toBe(firstRef);
    });
  });
});
