import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  outputDir: 'test-results/',

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Optimize workers for environment
  workers: process.env.CI ? 4 : 2,

  // Reporter configuration
  reporter: process.env.CI
    ? [['list'], ['junit', { outputFile: 'test-results/junit.xml' }], ['html']]
    : [['html'], ['list']],

  // Shared settings for all projects
  use: {
    // Base URL for navigation
    baseURL: process.env.CI ? 'http://frontend:5173' : 'http://localhost:5173',

    // Capture artifacts on failure
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Reasonable timeouts
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  // Test timeout
  timeout: 60000,

  // Expect timeout
  expect: {
    timeout: 10000,
  },

  // Projects define different test contexts
  projects: [
    // Setup project - creates authentication state
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    // Authenticated project - tests that require login
    {
      name: 'authenticated',
      use: {
        ...devices['Desktop Chrome'],
      },
      dependencies: ['setup'],
      testIgnore: [
        '**/setup/**',
        '**/*.setup.ts',
        '**/auth/login.spec.ts',
        '**/auth/register.spec.ts',
      ],
    },

    // Unauthenticated project - login/register tests
    {
      name: 'unauthenticated',
      use: {
        ...devices['Desktop Chrome'],
        storageState: { cookies: [], origins: [] },
      },
      testMatch: ['**/auth/login.spec.ts', '**/auth/register.spec.ts'],
    },
  ],

  // Run local dev server before starting tests (local only, not CI)
  webServer: process.env.CI
    ? undefined
    : {
        command: 'bun run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: true,
        timeout: 120000,
      },
});
