import { expect, afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Note: With @testing-library/jest-dom/vitest import, matchers are automatically extended

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Setup before each test
beforeEach(() => {
  // Mock window object
  global.window = global.window || ({} as any);

  // Mock clipboard API (use defineProperty to override read-only property)
  Object.defineProperty(navigator, 'clipboard', {
    value: {
      writeText: vi.fn().mockResolvedValue(undefined),
      readText: vi.fn().mockResolvedValue(''),
    },
    writable: true,
    configurable: true,
  });

  // Mock window.getSelection
  global.window.getSelection = vi.fn(() => ({
    rangeCount: 0,
    addRange: vi.fn(),
    removeAllRanges: vi.fn(),
  })) as any;

  // Mock document.createRange
  global.document.createRange = vi.fn(() => ({
    setStart: vi.fn(),
    setEnd: vi.fn(),
    commonAncestorContainer: {
      nodeName: 'BODY',
      ownerDocument: document,
    },
  })) as any;
});

// Mock window.electron API for tests
global.window = global.window || ({} as any);
(global.window as any).electron = {
  runEval: vi.fn(),
  getResults: vi.fn(),
  openFile: vi.fn(),
  saveFile: vi.fn(),
  saveResults: vi.fn(),
  selectDirectory: vi.fn(),
  checkFirstLaunch: vi.fn(),
  installDeps: vi.fn(),
  getInstallerLogs: vi.fn(),
};
