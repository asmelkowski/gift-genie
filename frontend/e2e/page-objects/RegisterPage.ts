import { type Page, expect } from '@playwright/test';

export class RegisterPage {
  constructor(public readonly page: Page) {}

  // Navigation
  async goto() {
    await this.page.goto('/register');
  }

  // Actions
  async fillName(name: string) {
    await this.page.getByTestId('register-name').fill(name);
  }

  async fillEmail(email: string) {
    await this.page.getByTestId('register-email').fill(email);
  }

  async fillPassword(password: string) {
    await this.page.getByTestId('register-password').fill(password);
  }

  async clickSubmit() {
    await this.page.getByTestId('register-submit').click();
  }

  async register(name: string, email: string, password: string) {
    await this.fillName(name);
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickSubmit();
  }

  // Assertions
  async expectNameVisible() {
    await expect(this.page.getByTestId('register-name')).toBeVisible();
  }

  async expectEmailVisible() {
    await expect(this.page.getByTestId('register-email')).toBeVisible();
  }

  async expectPasswordVisible() {
    await expect(this.page.getByTestId('register-password')).toBeVisible();
  }

  async expectSubmitVisible() {
    await expect(this.page.getByTestId('register-submit')).toBeVisible();
  }

  async expectErrorMessage(message: string) {
    await expect(this.page.getByTestId('register-error')).toContainText(message);
  }
}
