/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, expect, Page } from '@playwright/test';

/**
 * Base pages and fixtures for e2e tests
 * Implements the Page Object Model for maintainable tests
 */

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.page.fill('input[type="email"]', email);
    await this.page.fill('input[type="password"]', password);
    await this.page.click('button[type="submit"]');
    // Wait for navigation to complete with explicit timeout
    await this.page.waitForURL('/app/groups', { timeout: 15000 });
  }

  async submitLogin(email: string, password: string) {
    await this.page.fill('input[type="email"]', email);
    await this.page.fill('input[type="password"]', password);
    await this.page.click('button[type="submit"]');
    // Don't wait for navigation - for testing invalid credentials
  }

  async expectErrorMessage(message: string) {
    const errorMessage = this.page.locator('text=' + message);
    await expect(errorMessage).toBeVisible();
  }
}

export class HomePage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/');
  }

  async logout() {
    await this.page.click('button[aria-label="Open user menu"]');
    await this.page.click('text=Logout');
  }
}

export class GroupsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/app/groups');
  }

  async expectLoggedIn() {
    // Verify the home page is accessible
    await expect(this.page).toHaveURL('/app/groups');
  }

  async createGroup(name: string, description?: string) {
    await this.page.click('button:has-text("Create Group")');
    await this.page.fill('input[placeholder*="Group name"]', name);
    if (description) {
      await this.page.fill('textarea', description);
    }
    await this.page.click('button:has-text("Create")');
  }

  async expectGroupVisible(groupName: string) {
    await expect(this.page.locator(`text=${groupName}`)).toBeVisible();
  }
}

export class DrawsPage {
  constructor(private page: Page) {}

  async goto(groupId: string) {
    await this.page.goto(`/groups/${groupId}/draws`);
  }

  async createDraw(name: string) {
    await this.page.click('button:has-text("Create Draw")');
    await this.page.fill('input[placeholder*="Draw name"]', name);
    await this.page.click('button:has-text("Create")');
  }

  async executeDraw() {
    await this.page.click('button:has-text("Execute")');
  }

  async finalizeDraw() {
    await this.page.click('button:has-text("Finalize")');
  }

  async expectDrawVisible(drawName: string) {
    await expect(this.page.locator(`text=${drawName}`)).toBeVisible();
  }
}

/**
 * Custom test with fixtures
 */
type TestFixtures = {
  loginPage: LoginPage;
  homePage: HomePage;
  groupsPage: GroupsPage;
  drawsPage: DrawsPage;
  authenticatedPage: Page;
};

export const test = base.extend<TestFixtures>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },

  homePage: async ({ page }, use) => {
    const homePage = new HomePage(page);
    await use(homePage);
  },

  groupsPage: async ({ page }, use) => {
    const groupsPage = new GroupsPage(page);
    await use(groupsPage);
  },

  drawsPage: async ({ page }, use) => {
    const drawsPage = new DrawsPage(page);
    await use(drawsPage);
  },

  authenticatedPage: async ({ browser }, use) => {
    // Try to load saved auth state first
    let context;
    const authFile = 'playwright/.auth/user.json';

    try {
      // Check if auth state exists (it should be created by global-setup.ts)
      const fs = await import('fs');
      const { existsSync } = fs;

      if (existsSync(authFile)) {
        console.log('📂 Loading saved authentication state...');
        context = await browser.newContext({ storageState: authFile });
      } else {
        throw new Error('Auth state not found, will perform login');
      }
    } catch {
      console.log('⚠️  No saved auth state, performing login...');
      context = await browser.newContext();
      const page = await context.newPage();

      const loginPage = new LoginPage(page);
      await loginPage.goto();

      const testEmail = 'test@example.com';
      const testPassword = '09%#3@0#rH3ksOqbL#qg8LAnT8c*35Vfa&5Q';
      await loginPage.login(testEmail, testPassword);

      // Save the state for next time
      await context.storageState({ path: authFile });
      console.log('✅ Authentication state saved');

      await page.close();
    }

    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect };
