/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, expect, Page } from '@playwright/test';
import {
  TestDataFactory,
  AuthSetup,
  DatabaseCleanup,
  ParallelExecutionHelpers,
  TestUserData,
} from './utils';

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
    await this.page.click('button[data-testid="user-menu-button"]');
    await this.page.waitForSelector('button:has-text("Logout")', { state: 'visible' });
    await this.page.click('button[role="menuitem"]:has-text("Logout")');
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

  async createGroup(name: string) {
    await this.page.click('[data-testid="groups-page-header"] button:has-text("Create Group")');
    await this.page.waitForSelector('input[placeholder="Enter group name"]');
    await this.page.fill('input[placeholder="Enter group name"]', name);
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
 * New independent auth fixtures using the AuthSetup utility
 */
export interface AuthenticatedContextFixture {
  page: Page;
  userData: TestUserData;
  cleanup: () => Promise<void>;
}

export interface AuthenticatedPageFixture {
  page: Page;
  userData: TestUserData;
  cleanup: () => Promise<void>;
}

/**
 * Custom test with fixtures
 */
type TestFixtures = {
  loginPage: LoginPage;
  homePage: HomePage;
  groupsPage: GroupsPage;
  drawsPage: DrawsPage;
  unauthenticatedPage: Page;
  // New independent auth fixtures
  authenticatedContext: AuthenticatedContextFixture;
  authenticatedPage: AuthenticatedPageFixture;
};

export const test = base.extend<TestFixtures>({
  // Override the base page fixture to ensure it's always unauthenticated
  page: async ({ browser }, use) => {
    // Create a fresh browser context without any storage state to ensure no authentication
    const context = await browser.newContext();
    const page = await context.newPage();

    await use(page);

    // Clean up the context
    await context.close();
  },

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

  unauthenticatedPage: async ({ browser }, use) => {
    // Create a fresh browser context without any storage state to ensure no authentication
    const context = await browser.newContext();
    const page = await context.newPage();

    await use(page);

    // Clean up the context
    await context.close();
  },

  // New independent authenticated context fixture
  authenticatedContext: async ({ browser }, use) => {
    const logPrefix = ParallelExecutionHelpers.getLogPrefix();
    console.log(`${logPrefix} 🔐 Setting up independent authenticated context fixture...`);

    // Generate unique test user data for this fixture
    const userData = TestDataFactory.createTestUser('fixture-auth-context');

    // Create authenticated context using the new AuthSetup utility
    const authContext = await AuthSetup.createAuthenticatedContext({
      browser,
      userData, // Use the generated userData
      existingUser: false, // Register new user for each test
    });

    // Provide the authenticated context to the test
    await use({
      page: authContext.page,
      userData: authContext.userData,
      cleanup: async () => {
        console.log(`${logPrefix} 🧹 Cleaning up authenticated context fixture...`);
        // Clean up test data and browser context
        await DatabaseCleanup.cleanupTestData(userData);
        await authContext.cleanup();
      },
    });

    // Note: cleanup is called by the test using the fixture
  },

  // New authenticated page fixture (simpler version for basic tests)
  authenticatedPage: async ({ browser }, use) => {
    const logPrefix = ParallelExecutionHelpers.getLogPrefix();
    console.log(`${logPrefix} 📄 Setting up independent authenticated page fixture...`);

    // Generate unique test user data for this fixture
    const userData = TestDataFactory.createTestUser('fixture-auth-page');

    // Create authenticated page using the AuthSetup utility
    const page = await AuthSetup.createAuthenticatedPage(browser, userData);

    // Create cleanup function
    const cleanup = async () => {
      console.log(`${logPrefix} 🧹 Cleaning up authenticated page fixture...`);
      // Clean up test data
      await DatabaseCleanup.cleanupTestData(userData);
      // Close the page context
      await page.context().close();
    };

    // Provide the authenticated page to the test
    await use({
      page,
      userData,
      cleanup,
    });

    // Note: cleanup is called by the test using the fixture
  },
});

export { expect };
