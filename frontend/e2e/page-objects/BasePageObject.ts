import { type Page } from '@playwright/test';

/**
 * Base page object with enhanced logging and diagnostic capabilities
 * Provides common patterns for waiting and debugging E2E tests
 */
export class BasePageObject {
  protected page: Page;
  protected testName: string;

  constructor(page: Page) {
    this.page = page;
    this.testName = page.context().browser?.name || 'unknown';
  }

  /**
   * Log a diagnostic message with context
   */
  protected log(message: string, data?: Record<string, unknown>) {
    const timestamp = new Date().toISOString();
    const context = data ? JSON.stringify(data) : '';
    console.log(`[${timestamp}] [E2E] ${message} ${context}`);
  }

  /**
   * Wait for a selector with enhanced diagnostics
   */
  protected async waitForSelector(
    selector: string,
    options: { timeout?: number; testId?: string } = {}
  ) {
    const { timeout = 10000, testId } = options;
    const startTime = Date.now();

    this.log(`Waiting for selector: ${selector}`, { timeout, testId });

    try {
      const locator = testId ? this.page.getByTestId(testId) : this.page.locator(selector);

      await locator.waitFor({ state: 'visible', timeout });
      const duration = Date.now() - startTime;

      this.log(`✓ Selector found in ${duration}ms`, { selector, testId });
      return locator;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.log(`✗ Selector timeout after ${duration}ms`, {
        selector,
        testId,
        error: String(error),
      });

      // Capture page state for debugging
      const pageState = await this.capturePageState();
      throw new Error(
        `Failed to find selector "${selector}" within ${timeout}ms\nPage state: ${JSON.stringify(pageState, null, 2)}`
      );
    }
  }

  /**
   * Capture comprehensive page state for diagnostics
   */
  protected async capturePageState() {
    try {
      return await this.page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const windowAny = window as any;
        return {
          url: window.location.href,
          title: document.title,
          readyState: document.readyState,
          bodyClasses: document.body.className,
          appReady: windowAny.__app_ready || false,
          hasErrors: !!windowAny.__errors,
          visibleText: document.body.innerText.substring(0, 200),
          // Check for common loading indicators
          hasLoadingSpinner: !!document.querySelector('[data-testid*="loading"]'),
          hasErrorMessage: !!document.querySelector('[data-testid*="error"]'),
          // Check for key test IDs
          testIds: {
            groupsPageHeader: !!document.querySelector('[data-testid="groups-page-header"]'),
            loadingState: !!document.querySelector('[data-testid="loading-state"]'),
            errorState: !!document.querySelector('[data-testid="error-state"]'),
            emptyState: !!document.querySelector('[data-testid="empty-state"]'),
          },
        };
      });
    } catch (error) {
      return { error: 'Failed to capture page state', details: String(error) };
    }
  }

  /**
   * Wait for app to be fully bootstrapped and ready
   */
  async waitForAppReady(timeout = 15000) {
    const startTime = Date.now();

    this.log('Waiting for app to be ready...');

    try {
      await this.page.waitForFunction(
        () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return (window as any).__app_ready === true;
        },
        { timeout }
      );

      const duration = Date.now() - startTime;
      this.log(`✓ App ready in ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.log(`✗ App not ready after ${duration}ms`, { error: String(error) });

      // If app not ready, capture state and throw
      const pageState = await this.capturePageState();
      throw new Error(
        `App failed to bootstrap within ${timeout}ms\nPage state: ${JSON.stringify(pageState, null, 2)}`
      );
    }
  }

  /**
   * Wait for network to idle with diagnostics
   */
  async waitForNetworkIdle(timeout = 10000) {
    const startTime = Date.now();

    this.log('Waiting for network to idle...');

    try {
      await this.page.waitForLoadState('networkidle', { timeout });
      const duration = Date.now() - startTime;
      this.log(`✓ Network idle in ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.log(`⚠ Network did not idle within ${timeout}ms (after ${duration}ms)`, {
        error: String(error),
      });

      // Network idle timeout is not always fatal, log but continue
      const pageState = await this.capturePageState();
      this.log('Page state during network wait', pageState);
    }
  }

  /**
   * Navigate with diagnostics
   */
  async navigateTo(url: string, waitForNavigation = true) {
    const startTime = Date.now();

    this.log(`Navigating to: ${url}`);

    try {
      await this.page.goto(url);

      if (waitForNavigation) {
        // Wait for the page to stabilize after navigation
        await this.page.waitForLoadState('domcontentloaded');
        const duration = Date.now() - startTime;
        this.log(`✓ Navigation completed in ${duration}ms`, { url });
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      this.log(`✗ Navigation failed after ${duration}ms`, { url, error: String(error) });
      throw error;
    }
  }

  /**
   * Get detailed page diagnostics for debugging
   */
  async getDiagnostics() {
    const pageState = await this.capturePageState();
    const cookies = await this.page.context().cookies();
    const localStorage = await this.page.evaluate(() => {
      return JSON.parse(JSON.stringify(window.localStorage));
    });

    return {
      timestamp: new Date().toISOString(),
      url: this.page.url(),
      pageState,
      cookies: cookies.map(c => ({ name: c.name, value: c.value.substring(0, 50) })),
      localStorage,
      console: 'Check browser console in video/trace for errors',
    };
  }

  /**
   * Assert a condition with diagnostics
   */
  protected async assertCondition(condition: boolean, message: string) {
    if (!condition) {
      const diagnostics = await this.getDiagnostics();
      throw new Error(
        `Assertion failed: ${message}\n\nDiagnostics:\n${JSON.stringify(diagnostics, null, 2)}`
      );
    }
  }

  /**
   * Take a screenshot with a descriptive name
   */
  async takeScreenshot(name: string) {
    const filename = `${name}-${Date.now()}.png`;
    await this.page.screenshot({ path: `test-results/${filename}` });
    this.log(`Screenshot saved: ${filename}`);
  }
}
