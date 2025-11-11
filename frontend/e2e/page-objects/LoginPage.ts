import { type Page, expect } from '@playwright/test';
import { BasePageObject } from './BasePageObject';

export class LoginPage extends BasePageObject {
  constructor(page: Page) {
    super(page);
  }

  // Navigation
  async goto() {
    this.log('LoginPage: Navigating to login page...');
    await this.navigateTo('/login');
    this.log('✓ Login page loaded');
  }

  // Actions
  async fillEmail(email: string) {
    this.log(`LoginPage: Filling email: ${email}`);
    await this.page.getByTestId('login-email').fill(email);
  }

  async fillPassword(password: string) {
    this.log('LoginPage: Filling password');
    await this.page.getByTestId('login-password').fill(password);
  }

  async clickSubmit() {
    this.log('LoginPage: Clicking submit button');
    await this.page.getByTestId('login-submit').click();
  }

  async login(email: string, password: string) {
    this.log(`LoginPage: Starting login flow for ${email}`);
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickSubmit();
    this.log(`LoginPage: Login form submitted, waiting for navigation...`);
  }

  /**
   * Wait for successful login completion
   * This verifies both navigation and app state
   */
  async waitForLoginSuccess(timeout = 20000) {
    this.log('LoginPage: Waiting for login to complete...');
    const startTime = Date.now();

    try {
      // Wait for navigation to /app/groups
      this.log('  → Waiting for navigation to /app/groups...');
      await this.page.waitForURL('/app/groups', { timeout: 15000 });

      this.log('  → Navigation complete, waiting for app to be ready...');
      // Wait for app to be fully initialized
      await this.waitForAppReady(10000);

      const duration = Date.now() - startTime;
      this.log(`✓ Login successful in ${duration}ms`);

      // Verify we're authenticated
      const diagnostics = await this.getDiagnostics();
      this.log('Login successful - diagnostics:', diagnostics);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.log(`✗ Login failed after ${duration}ms`, { error: String(error) });

      const pageState = await this.capturePageState();
      throw new Error(
        `Login did not complete successfully within ${timeout}ms\n` +
          `Page state: ${JSON.stringify(pageState, null, 2)}`
      );
    }
  }

  // Assertions
  async expectEmailVisible() {
    this.log('LoginPage: Checking if email field is visible');
    await expect(this.page.getByTestId('login-email')).toBeVisible();
  }

  async expectPasswordVisible() {
    this.log('LoginPage: Checking if password field is visible');
    await expect(this.page.getByTestId('login-password')).toBeVisible();
  }

  async expectSubmitVisible() {
    this.log('LoginPage: Checking if submit button is visible');
    await expect(this.page.getByTestId('login-submit')).toBeVisible();
  }

  async expectErrorMessage(message: string) {
    this.log(`LoginPage: Checking for error message: ${message}`);
    await expect(this.page.getByTestId('login-error')).toContainText(message);
  }
}
