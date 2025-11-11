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
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickSubmit();
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
