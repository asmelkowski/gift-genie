import { type Page, expect } from '@playwright/test';
import { BasePageObject } from './BasePageObject';

export class AppLayoutPage extends BasePageObject {
  constructor(page: Page) {
    super(page);
  }

  // Actions
  async openUserMenu() {
    this.log('AppLayoutPage: Opening user menu...');
    await this.page.getByTestId('user-menu-button').click();
    this.log('✓ User menu opened');
  }

  async clickLogoutButton() {
    this.log('AppLayoutPage: Clicking logout button...');
    await this.page.getByRole('button', { name: 'Logout' }).click();
    this.log('✓ Logout button clicked');
  }

  async logout() {
    this.log('AppLayoutPage: Starting logout flow...');
    await this.openUserMenu();
    await this.clickLogoutButton();

    // Wait for logout to complete
    this.log('AppLayoutPage: Waiting for logout to complete...');
    try {
      await this.page.waitForURL('/login', { timeout: 10000 });
      this.log('✓ Logout complete, redirected to login');
    } catch (logoutError) {
      this.log('⚠ Logout may not have completed properly', { error: String(logoutError) });
      throw logoutError;
    }
  }

  /**
   * Wait for app layout to be ready and interactive
   */
  async waitForLayoutReady(timeout = 15000) {
    this.log('AppLayoutPage: Waiting for app layout to be ready...');

    try {
      // First ensure app is bootstrapped
      await this.waitForAppReady(timeout);

      // Then verify user menu is visible (indicates successful render)
      await this.page.getByTestId('user-menu-button').waitFor({
        state: 'visible',
        timeout: 5000,
      });

      this.log('✓ App layout is ready');
    } catch {
      const pageState = await this.capturePageState();
      throw new Error(`App layout failed to be ready\n${JSON.stringify(pageState, null, 2)}`);
    }
  }

  // Assertions
  async expectUserMenuVisible() {
    this.log('AppLayoutPage: Checking if user menu button is visible...');
    await expect(this.page.getByTestId('user-menu-button')).toBeVisible();
    this.log('✓ User menu button is visible');
  }

  async expectAuthenticated() {
    this.log('AppLayoutPage: Verifying authentication...');
    await this.expectUserMenuVisible();
    this.log('✓ User is authenticated');
  }
}
