import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { TutorialProvider, useTutorial, tutorialSteps } from './TutorialContext';
import { logger } from '../lib/logger';

// Mock logger
vi.mock('../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('TutorialContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('useTutorial hook', () => {
    it('should throw error when used outside TutorialProvider', () => {
      // Suppress console.error for this test
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useTutorial());
      }).toThrow('useTutorial must be used within a TutorialProvider');

      consoleError.mockRestore();
    });

    it('should provide tutorial context when used inside TutorialProvider', () => {
      const { result } = renderHook(() => useTutorial(), {
        wrapper: TutorialProvider,
      });

      expect(result.current).toHaveProperty('isActive');
      expect(result.current).toHaveProperty('currentStep');
      expect(result.current).toHaveProperty('startTutorial');
      expect(result.current).toHaveProperty('endTutorial');
    });
  });

  describe('startTutorial', () => {
    it('should log when tutorial is started', () => {
      const { result } = renderHook(() => useTutorial(), {
        wrapper: TutorialProvider,
      });

      act(() => {
        result.current.startTutorial();
      });

      expect(logger.info).toHaveBeenCalledWith('tutorial', 'Tutorial started');
    });

    it('should set isActive to true', () => {
      const { result } = renderHook(() => useTutorial(), {
        wrapper: TutorialProvider,
      });

      expect(result.current.isActive).toBe(false);

      act(() => {
        result.current.startTutorial();
      });

      expect(result.current.isActive).toBe(true);
    });

    it('should reset to first step', () => {
      const { result } = renderHook(() => useTutorial(), {
        wrapper: TutorialProvider,
      });

      // Move to a different step first
      act(() => {
        result.current.startTutorial();
        result.current.nextStep();
      });

      expect(result.current.currentStepIndex).toBe(1);

      // Start tutorial again
      act(() => {
        result.current.startTutorial();
      });

      expect(result.current.currentStepIndex).toBe(0);
      expect(result.current.currentStep).toBe('welcome');
    });
  });

  describe('endTutorial', () => {
    it('should log when tutorial is ended', () => {
      const { result } = renderHook(() => useTutorial(), {
        wrapper: TutorialProvider,
      });

      act(() => {
        result.current.startTutorial();
        result.current.endTutorial();
      });

      expect(logger.info).toHaveBeenCalledWith('tutorial', 'Tutorial ended');
    });

    it('should set isActive to false', () => {
      const { result } = renderHook(() => useTutorial(), {
        wrapper: TutorialProvider,
      });

      act(() => {
        result.current.startTutorial();
      });

      expect(result.current.isActive).toBe(true);

      act(() => {
        result.current.endTutorial();
      });

      expect(result.current.isActive).toBe(false);
    });
  });

  describe('skipTutorial', () => {
    it('should log when tutorial is skipped', () => {
      const { result } = renderHook(() => useTutorial(), {
        wrapper: TutorialProvider,
      });

      act(() => {
        result.current.startTutorial();
        result.current.skipTutorial();
      });

      expect(logger.info).toHaveBeenCalledWith('tutorial', 'Tutorial skipped by user');
    });

    it('should save skip status to localStorage', () => {
      const { result } = renderHook(() => useTutorial(), {
        wrapper: TutorialProvider,
      });

      act(() => {
        result.current.startTutorial();
        result.current.skipTutorial();
      });

      expect(localStorageMock.getItem('promptfoo-tutorial-completed')).toBe('skipped');
    });

    it('should set isActive to false', () => {
      const { result } = renderHook(() => useTutorial(), {
        wrapper: TutorialProvider,
      });

      act(() => {
        result.current.startTutorial();
        result.current.skipTutorial();
      });

      expect(result.current.isActive).toBe(false);
    });
  });

  describe('completeTutorial', () => {
    it('should log when tutorial is completed', () => {
      const { result } = renderHook(() => useTutorial(), {
        wrapper: TutorialProvider,
      });

      act(() => {
        result.current.startTutorial();
        result.current.completeTutorial();
      });

      expect(logger.info).toHaveBeenCalledWith('tutorial', 'Tutorial completed successfully');
    });

    it('should save completion status to localStorage', () => {
      const { result } = renderHook(() => useTutorial(), {
        wrapper: TutorialProvider,
      });

      act(() => {
        result.current.startTutorial();
        result.current.completeTutorial();
      });

      expect(localStorageMock.getItem('promptfoo-tutorial-completed')).toBe('completed');
    });

    it('should set isActive to false', () => {
      const { result } = renderHook(() => useTutorial(), {
        wrapper: TutorialProvider,
      });

      act(() => {
        result.current.startTutorial();
        result.current.completeTutorial();
      });

      expect(result.current.isActive).toBe(false);
    });
  });

  describe('nextStep', () => {
    it('should log when moving to next step', () => {
      const { result } = renderHook(() => useTutorial(), {
        wrapper: TutorialProvider,
      });

      act(() => {
        result.current.startTutorial();
        result.current.nextStep();
      });

      expect(logger.debug).toHaveBeenCalledWith(
        'tutorial',
        'Moving to next step',
        { from: 'welcome', to: tutorialSteps[1].step }
      );
    });

    it('should move to next step', () => {
      const { result } = renderHook(() => useTutorial(), {
        wrapper: TutorialProvider,
      });

      act(() => {
        result.current.startTutorial();
      });

      expect(result.current.currentStepIndex).toBe(0);

      act(() => {
        result.current.nextStep();
      });

      expect(result.current.currentStepIndex).toBe(1);
    });

    it('should complete tutorial when on last step', () => {
      const { result } = renderHook(() => useTutorial(), {
        wrapper: TutorialProvider,
      });

      act(() => {
        result.current.startTutorial();
        // Move to last step
        result.current.goToStep('complete');
      });

      expect(result.current.currentStep).toBe('complete');

      act(() => {
        result.current.nextStep();
      });

      expect(logger.info).toHaveBeenCalledWith('tutorial', 'Tutorial completed successfully');
      expect(result.current.isActive).toBe(false);
    });
  });

  describe('previousStep', () => {
    it('should log when moving to previous step', () => {
      const { result } = renderHook(() => useTutorial(), {
        wrapper: TutorialProvider,
      });

      act(() => {
        result.current.startTutorial();
        result.current.nextStep();
      });

      vi.clearAllMocks();

      act(() => {
        result.current.previousStep();
      });

      expect(logger.debug).toHaveBeenCalledWith(
        'tutorial',
        'Moving to previous step',
        { from: tutorialSteps[1].step, to: 'welcome' }
      );
    });

    it('should move to previous step', () => {
      const { result } = renderHook(() => useTutorial(), {
        wrapper: TutorialProvider,
      });

      act(() => {
        result.current.startTutorial();
        result.current.nextStep();
      });

      expect(result.current.currentStepIndex).toBe(1);

      act(() => {
        result.current.previousStep();
      });

      expect(result.current.currentStepIndex).toBe(0);
    });

    it('should not go below first step', () => {
      const { result } = renderHook(() => useTutorial(), {
        wrapper: TutorialProvider,
      });

      act(() => {
        result.current.startTutorial();
      });

      expect(result.current.currentStepIndex).toBe(0);

      act(() => {
        result.current.previousStep();
      });

      expect(result.current.currentStepIndex).toBe(0);
    });
  });

  describe('goToStep', () => {
    it('should log when jumping to specific step', () => {
      const { result } = renderHook(() => useTutorial(), {
        wrapper: TutorialProvider,
      });

      act(() => {
        result.current.startTutorial();
        result.current.goToStep('add-dataset');
      });

      expect(logger.debug).toHaveBeenCalledWith(
        'tutorial',
        'Jumping to specific step',
        { step: 'add-dataset', index: expect.any(Number) }
      );
    });

    it('should jump to specified step', () => {
      const { result } = renderHook(() => useTutorial(), {
        wrapper: TutorialProvider,
      });

      act(() => {
        result.current.startTutorial();
        result.current.goToStep('add-assertions');
      });

      expect(result.current.currentStep).toBe('add-assertions');
    });

    it('should handle invalid step name', () => {
      const { result } = renderHook(() => useTutorial(), {
        wrapper: TutorialProvider,
      });

      const initialStep = result.current.currentStepIndex;

      act(() => {
        result.current.startTutorial();
        result.current.goToStep('invalid-step' as any);
      });

      // Should not change step
      expect(result.current.currentStepIndex).toBe(0);
    });
  });

  describe('getCurrentStepConfig', () => {
    it('should return current step configuration', () => {
      const { result } = renderHook(() => useTutorial(), {
        wrapper: TutorialProvider,
      });

      act(() => {
        result.current.startTutorial();
      });

      const config = result.current.getCurrentStepConfig();
      expect(config).toBeDefined();
      expect(config?.step).toBe('welcome');
    });

    it('should update when step changes', () => {
      const { result } = renderHook(() => useTutorial(), {
        wrapper: TutorialProvider,
      });

      act(() => {
        result.current.startTutorial();
      });

      let config = result.current.getCurrentStepConfig();
      expect(config?.step).toBe('welcome');

      act(() => {
        result.current.nextStep();
      });

      config = result.current.getCurrentStepConfig();
      expect(config?.step).toBe(tutorialSteps[1].step);
    });
  });

  describe('Auto-start behavior', () => {
    it('should not auto-start if tutorial was completed', () => {
      localStorageMock.setItem('promptfoo-tutorial-completed', 'completed');

      const { result } = renderHook(() => useTutorial(), {
        wrapper: TutorialProvider,
      });

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(result.current.isActive).toBe(false);
    });

    it('should not auto-start if tutorial was skipped', () => {
      localStorageMock.setItem('promptfoo-tutorial-completed', 'skipped');

      const { result } = renderHook(() => useTutorial(), {
        wrapper: TutorialProvider,
      });

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(result.current.isActive).toBe(false);
    });
  });

  describe('Tutorial steps', () => {
    it('should have correct total steps', () => {
      const { result } = renderHook(() => useTutorial(), {
        wrapper: TutorialProvider,
      });

      expect(result.current.totalSteps).toBe(tutorialSteps.length);
    });

    it('should start at welcome step', () => {
      const { result } = renderHook(() => useTutorial(), {
        wrapper: TutorialProvider,
      });

      act(() => {
        result.current.startTutorial();
      });

      expect(result.current.currentStep).toBe('welcome');
      expect(result.current.currentStepIndex).toBe(0);
    });
  });
});
