import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Playwright configuration for Electron E2E testing
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',

  // Maximum time one test can run
  timeout: 60 * 1000,

  // Maximum time for the whole test suite
  globalTimeout: 10 * 60 * 1000,

  // Run tests in files in parallel
  fullyParallel: false, // Electron tests should run serially

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI (Electron apps can conflict)
  workers: 1,

  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    process.env.CI ? ['github'] : ['line'],
  ],

  // Shared settings for all the projects below
  use: {
    // Base URL for the app (not applicable for Electron)
    // baseURL: 'http://localhost:5173',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',
  },

  // Configure projects for different test scenarios
  projects: [
    {
      name: 'electron',
      testMatch: /.*\.spec\.ts/,
    },
  ],

  // Global setup/teardown
  // globalSetup: path.join(__dirname, 'tests/e2e/global-setup.ts'),
  // globalTeardown: path.join(__dirname, 'tests/e2e/global-teardown.ts'),
});
