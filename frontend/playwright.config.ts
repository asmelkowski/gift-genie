import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  /* Output directory for all test artifacts */
  outputDir: 'test-results/',

  /**
   * Enhanced Parallel Execution Strategy:
   * - Tests are now independent and can run in parallel
   * - Each test creates its own authenticated context with unique data
   * - Worker-specific test data generation prevents collisions
   * - Mutex-based cleanup prevents race conditions
   * - Retry logic handles registration conflicts
   * - CI: Uses multiple workers for faster execution
   * - Local: Uses fewer workers to avoid resource contention
   */
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Use multiple workers for parallel execution with enhanced isolation */
  workers: process.env.CI ? 4 : 2,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI
    ? [['list'], ['junit', { outputFile: 'test-results/junit.xml' }]]
    : [['html'], ['list']],
  /* Enhanced global setup for parallel execution */
  globalSetup: './e2e/global-setup.ts',
  /* Timeout for global setup */
  globalTimeout: process.env.CI ? 60000 : 30000,
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Test grep pattern - include all .spec.ts files in e2e directory */
    testMatch: '**/*.spec.ts',
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.CI ? 'http://frontend:5173' : 'http://localhost:5173',
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    /* Screenshot configuration - capture on failure only */
    screenshot: 'only-on-failure',
    /* Video configuration - record on first retry */
    video: 'retain-on-failure',
    /* Action timeout for individual actions like click, fill, etc. */
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  /* Test timeout - increased for parallel execution */
  timeout: process.env.CI ? 90000 : 75000,
  /* Expect timeout - increased for parallel execution */
  expect: {
    timeout: 20000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: process.env.CI
          ? {
              args: [
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-software-rasterizer',
              ],
            }
          : undefined,
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: process.env.CI
    ? undefined
    : {
        command: 'bun run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: true,
      },
});
