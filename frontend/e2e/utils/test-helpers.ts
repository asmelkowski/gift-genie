/**
 * Test Helpers
 * Common utilities for e2e tests including waits, assertions, screenshots, and error handling
 */

import { Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs/promises';

export interface ScreenshotOptions {
  fullPage?: boolean;
  omitBackground?: boolean;
  quality?: number;
}

export interface WaitOptions {
  timeout?: number;
  interval?: number;
}

/**
 * Common test utilities and helpers for e2e tests
 */
export class TestHelpers {
  private static readonly DEFAULT_TIMEOUT = 10000;
  private static readonly DEFAULT_INTERVAL = 100;
  private static readonly SCREENSHOT_DIR = 'test-results/screenshots';

  /**
   * Detects if running in CI environment
   */
  static isCI(): boolean {
    return !!process.env.CI;
  }

  /**
   * Gets the base URL for the application
   */
  static getBaseUrl(): string {
    return this.isCI() ? 'http://frontend:5173' : 'http://localhost:5173';
  }

  /**
   * Gets the API base URL
   */
  static getApiBaseUrl(): string {
    return this.isCI() ? 'http://backend:8000' : 'http://localhost:8000';
  }

  /**
   * Takes a screenshot with automatic naming and error handling
   */
  static async takeScreenshot(
    page: Page,
    name: string,
    options: ScreenshotOptions = {}
  ): Promise<string | null> {
    try {
      // Check if page is still available and not closed
      if (page.isClosed()) {
        console.warn(`⚠️  Cannot take screenshot "${name}": page is closed`);
        return null;
      }

      const timestamp = Date.now();
      const filename = `${name}-${timestamp}.png`;
      const filepath = path.join(this.SCREENSHOT_DIR, filename);

      // Ensure screenshot directory exists
      await fs.mkdir(this.SCREENSHOT_DIR, { recursive: true });

      await page.screenshot({
        path: filepath,
        fullPage: options.fullPage ?? true,
        omitBackground: options.omitBackground ?? false,
        quality: options.quality,
      });

      console.log(`📸 Screenshot saved: ${filepath}`);
      return filepath;
    } catch (error) {
      console.error(`❌ Failed to take screenshot "${name}":`, error);
      return null;
    }
  }

  /**
   * Waits for an element to be visible with better error messages
   */
  static async waitForVisible(
    page: Page,
    selector: string,
    options: WaitOptions = {}
  ): Promise<void> {
    const { timeout = this.DEFAULT_TIMEOUT } = options;

    try {
      await page.waitForSelector(selector, {
        state: 'visible',
        timeout,
      });
    } catch (error) {
      const screenshotPath = await this.takeScreenshot(page, 'wait-failure');
      throw new Error(
        `Element not visible: ${selector}. ` +
          `Timeout: ${timeout}ms. ` +
          `Screenshot: ${screenshotPath || 'failed to capture'}. ` +
          `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Waits for an element to be hidden
   */
  static async waitForHidden(
    page: Page,
    selector: string,
    options: WaitOptions = {}
  ): Promise<void> {
    const { timeout = this.DEFAULT_TIMEOUT } = options;

    try {
      await page.waitForSelector(selector, {
        state: 'hidden',
        timeout,
      });
    } catch (error) {
      const screenshotPath = await this.takeScreenshot(page, 'wait-hidden-failure');
      throw new Error(
        `Element not hidden: ${selector}. ` +
          `Timeout: ${timeout}ms. ` +
          `Screenshot: ${screenshotPath || 'failed to capture'}. ` +
          `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Waits for navigation to complete
   */
  static async waitForNavigation(
    page: Page,
    urlPattern?: string | RegExp,
    options: WaitOptions = {}
  ): Promise<void> {
    const { timeout = this.DEFAULT_TIMEOUT } = options;

    try {
      // Wait for URL change and page load to complete
      await page.waitForURL(urlPattern || /.*/, { timeout });
      // Additional wait for any async operations to complete
      await page.waitForLoadState('domcontentloaded', { timeout: 5000 });
    } catch (error) {
      const screenshotPath = await this.takeScreenshot(page, 'navigation-failure');
      throw new Error(
        `Navigation failed. ` +
          `Expected URL: ${urlPattern || 'any'}. ` +
          `Current URL: ${page.url()}. ` +
          `Timeout: ${timeout}ms. ` +
          `Screenshot: ${screenshotPath || 'failed to capture'}. ` +
          `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Waits for a specific condition with polling
   */
  static async waitForCondition(
    condition: () => Promise<boolean>,
    description: string,
    options: WaitOptions = {}
  ): Promise<void> {
    const { timeout = this.DEFAULT_TIMEOUT, interval = this.DEFAULT_INTERVAL } = options;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        if (await condition()) {
          return;
        }
      } catch {
        // Continue polling on errors
      }

      await new Promise(resolve => setTimeout(resolve, interval));
    }

    throw new Error(`Condition not met within ${timeout}ms: ${description}`);
  }

  /**
   * Enhanced click with better error handling and waiting
   */
  static async clickAndWait(
    page: Page,
    selector: string,
    options: { timeout?: number; waitForNavigation?: boolean } = {}
  ): Promise<void> {
    const { timeout = this.DEFAULT_TIMEOUT, waitForNavigation = false } = options;

    try {
      // Wait for element to be visible first
      await this.waitForVisible(page, selector, { timeout });

      // Click the element
      await page.click(selector, { timeout });

      // Wait for navigation if requested
      if (waitForNavigation) {
        await page.waitForLoadState('networkidle', { timeout });
      }
    } catch (error) {
      const screenshotPath = await this.takeScreenshot(page, 'click-failure');
      throw new Error(
        `Click failed on: ${selector}. ` +
          `Timeout: ${timeout}ms. ` +
          `Screenshot: ${screenshotPath || 'failed to capture'}. ` +
          `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Enhanced fill with better error handling
   */
  static async fillAndWait(
    page: Page,
    selector: string,
    value: string,
    options: { timeout?: number } = {}
  ): Promise<void> {
    const { timeout = this.DEFAULT_TIMEOUT } = options;

    try {
      // Wait for element to be visible
      await this.waitForVisible(page, selector, { timeout });

      // Clear and fill the field
      await page.fill(selector, value, { timeout });

      // Verify the value was set
      const actualValue = await page.inputValue(selector);
      if (actualValue !== value) {
        throw new Error(`Value not set correctly. Expected: "${value}", Got: "${actualValue}"`);
      }
    } catch (error) {
      const screenshotPath = await this.takeScreenshot(page, 'fill-failure');
      throw new Error(
        `Fill failed on: ${selector} with value: "${value}". ` +
          `Timeout: ${timeout}ms. ` +
          `Screenshot: ${screenshotPath || 'failed to capture'}. ` +
          `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Gets page console logs for debugging
   */
  static async getConsoleLogs(page: Page): Promise<string[]> {
    const logs: string[] = [];

    page.on('console', msg => {
      logs.push(`[${msg.type()}] ${msg.text()}`);
    });

    return logs;
  }

  /**
   * Gets page errors for debugging
   */
  static async getPageErrors(page: Page): Promise<string[]> {
    const errors: string[] = [];

    page.on('pageerror', error => {
      errors.push(error.message);
    });

    return errors;
  }

  /**
   * Creates a test step with automatic logging and error handling
   */
  static async withTestStep<T>(stepName: string, step: () => Promise<T>, page?: Page): Promise<T> {
    console.log(`▶️  Starting: ${stepName}`);

    try {
      const result = await step();
      console.log(`✅ Completed: ${stepName}`);
      return result;
    } catch (error) {
      console.error(`❌ Failed: ${stepName}`);

      if (page) {
        await this.takeScreenshot(
          page,
          `step-failure-${stepName.toLowerCase().replace(/\s+/g, '-')}`
        );
      }

      throw error;
    }
  }

  /**
   * Retries an operation with exponential backoff
   */
  static async retry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelay: number = 1000,
    description: string = 'operation'
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxAttempts) {
          const delay = baseDelay * Math.pow(2, attempt - 1);
          console.warn(
            `⚠️  ${description} failed (attempt ${attempt}/${maxAttempts}), retrying in ${delay}ms:`,
            lastError.message
          );
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(
      `${description} failed after ${maxAttempts} attempts. Last error: ${lastError.message}`
    );
  }

  /**
   * Generates a random string for test data
   */
  static generateRandomString(length: number = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Sleeps for a specified number of milliseconds
   */
  static async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Logs environment information for debugging
   */
  static logEnvironmentInfo(): void {
    console.log('🌍 Environment Information:');
    console.log(`   🖥️  Platform: ${process.platform}`);
    console.log(`   🏗️  Architecture: ${process.arch}`);
    console.log(`   📦 Node Version: ${process.version}`);
    console.log(`   🌐 CI Environment: ${this.isCI()}`);
    console.log(`   🏠 Base URL: ${this.getBaseUrl()}`);
    console.log(`   🔗 API Base URL: ${this.getApiBaseUrl()}`);
    console.log(`   📁 Current Directory: ${process.cwd()}`);
    console.log(`   📊 Process ID: ${process.pid}`);

    if (this.isCI()) {
      console.log(`   🔄 GitHub Actions: ${process.env.GITHUB_ACTIONS}`);
      console.log(`   📋 Run ID: ${process.env.GITHUB_RUN_ID}`);
      console.log(`   🏷️  SHA: ${process.env.GITHUB_SHA}`);
    }
  }
}
