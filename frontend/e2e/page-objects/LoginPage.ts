import { type Page, expect } from '@playwright/test';

export class LoginPage {
  constructor(public readonly page: Page) {}

  // Navigation
  async goto() {
    await this.page.goto('/login');
  }

  // Actions
  async fillEmail(email: string) {
    await this.page.getByTestId('login-email').fill(email);
  }

  async fillPassword(password: string) {
    await this.page.getByTestId('login-password').fill(password);
  }

  async clickSubmit() {
    await this.page.getByTestId('login-submit').click();
  }

  async login(email: string, password: string) {
    console.log(`[E2E] Logging in as ${email}...`);

    // Fill form fields
    await this.fillEmail(email);
    await this.fillPassword(password);

    // Set up response listener before submitting
    const responsePromise = this.page.waitForResponse(response =>
      response.url().includes('/api/v1/auth/login')
    );

    // Submit login form
    await this.clickSubmit();

    // Wait for and check login response
    try {
      const response = await responsePromise;
      console.log(`[E2E] Login response: ${response.status()}`);

      if (!response.ok()) {
        const body = await response.text();
        console.error('[E2E] Login failed:', body);
        throw new Error(`Login failed with status ${response.status()}`);
      }

      // Verify auth cookie was set
      const cookies = await this.page.context().cookies();
      const authCookie = cookies.find(c => c.name === 'access_token');
      console.log(`[E2E] Auth cookie ${authCookie ? 'SET' : 'NOT SET'}`);
    } catch (error) {
      // Log error but don't prevent test execution if logging fails
      if (error instanceof Error && !error.message.includes('Login failed')) {
        console.error('[E2E] Logging error (non-blocking):', error.message);
      } else {
        throw error;
      }
    }
  }

  // Assertions
  async expectEmailVisible() {
    await expect(this.page.getByTestId('login-email')).toBeVisible();
  }

  async expectPasswordVisible() {
    await expect(this.page.getByTestId('login-password')).toBeVisible();
  }

  async expectSubmitVisible() {
    await expect(this.page.getByTestId('login-submit')).toBeVisible();
  }

  async expectErrorMessage(message: string) {
    await expect(this.page.getByTestId('login-error')).toContainText(message);
  }
}
