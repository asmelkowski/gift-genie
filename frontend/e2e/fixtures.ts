import { test as base, expect, Page } from "@playwright/test";

/**
 * Base pages and fixtures for e2e tests
 * Implements the Page Object Model for maintainable tests
 */

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/login");
  }

  async login(email: string, password: string) {
    await this.page.fill('input[type="email"]', email);
    await this.page.fill('input[type="password"]', password);
    await this.page.click('button[type="submit"]');
    // Wait for navigation to complete
    await this.page.waitForURL("/app/groups");
  }

  async submitLogin(email: string, password: string) {
    await this.page.fill('input[type="email"]', email);
    await this.page.fill('input[type="password"]', password);
    await this.page.click('button[type="submit"]');
    // Don't wait for navigation - for testing invalid credentials
  }

  async expectErrorMessage(message: string) {
    const errorMessage = this.page.locator("text=" + message);
    await expect(errorMessage).toBeVisible();
  }
}

export class HomePage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/");
  }

  async logout() {
    await this.page.click('button[aria-label="Open user menu"]');
    await this.page.click("text=Logout");
  }
}

export class GroupsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/app/groups");
  }

  async expectLoggedIn() {
    // Verify the home page is accessible
    await expect(this.page).toHaveURL("/app/groups");
  }

  async createGroup(name: string, description?: string) {
    await this.page.click('button:has-text("Create Group")');
    await this.page.fill('input[placeholder*="Group name"]', name);
    if (description) {
      await this.page.fill("textarea", description);
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

  authenticatedPage: async ({ page }, use) => {
    // Login before each test
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    // Use test credentials (these should be set up in the test database)
    await loginPage.login(
      "test@example.com",
      "09%#3@0#rH3ksOqbL#qg8LAnT8c*35Vfa&5Q",
    );
    await use(page);
  },
});

export { expect };
