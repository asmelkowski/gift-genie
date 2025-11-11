import { type Page, expect } from '@playwright/test';

export class AppLayoutPage {
  constructor(public readonly page: Page) {}

  // Actions
  async openUserMenu() {
    await this.page.getByTestId('user-menu-button').click();
  }

  async clickLogoutButton() {
    await this.page.getByRole('button', { name: 'Logout' }).click();
  }

  async logout() {
    await this.openUserMenu();
    await this.clickLogoutButton();
  }

  // Assertions
  async expectUserMenuVisible() {
    await expect(this.page.getByTestId('user-menu-button')).toBeVisible();
  }

  async expectAuthenticated() {
    await this.expectUserMenuVisible();
  }
}
