/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, expect, Page } from '@playwright/test';
import * as path from 'path';

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
  unauthenticatedPage: Page;
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

  authenticatedPage: async ({ browser }, use) => {
    // Use absolute path consistent with 01-auth-setup.spec.ts
    const authFile = path.resolve(process.cwd(), 'playwright/.auth/user.json');
    const authDir = path.dirname(authFile);
    const isCI = !!process.env.CI;

    console.log('🔐 Setting up authenticated page fixture...');
    console.log(`📂 Current working directory: ${process.cwd()}`);
    console.log(`📂 Auth file path: ${authFile}`);
    console.log(`📂 Auth directory: ${authDir}`);
    console.log(`🔍 Environment: ${isCI ? 'CI' : 'Local'}`);

    try {
      // Import fs modules
      const fs = await import('fs');
      const fsPromises = await import('fs/promises');
      const { existsSync, readFileSync } = fs;
      const { stat } = fsPromises;

      // Check if auth directory exists
      if (!existsSync(authDir)) {
        throw new Error(
          `Authentication directory not found at ${authDir}. ` +
            `Please ensure that 01-auth-setup.spec.ts runs first to create the authentication directory.`
        );
      }

      // Check if auth state file exists
      if (!existsSync(authFile)) {
        throw new Error(
          `Authentication state file not found at ${authFile}. ` +
            `Please ensure that 01-auth-setup.spec.ts runs first to create the authentication state.`
        );
      }

      // Validate auth file content
      let authStats;
      try {
        authStats = await stat(authFile);
        if (authStats.size === 0) {
          throw new Error(`Authentication state file is empty (size: 0 bytes)`);
        }

        // Try to parse the JSON to ensure it's valid
        const authData = JSON.parse(readFileSync(authFile, 'utf-8'));
        if (!authData.cookies || !Array.isArray(authData.cookies)) {
          throw new Error('Authentication state file does not contain valid cookie data');
        }

        console.log(
          `✅ Auth file validated: ${authStats.size} bytes, ${authData.cookies.length} cookies`
        );
        if (isCI) {
          console.log(`🔍 CI Debug - Auth file location: ${authFile}`);
          console.log(`🔍 CI Debug - Auth file exists: ${existsSync(authFile)}`);
          console.log(`🔍 CI Debug - Auth file size: ${authStats.size} bytes`);
        }
      } catch (validationError) {
        throw new Error(
          `Authentication state file validation failed: ${validationError instanceof Error ? validationError.message : String(validationError)}. ` +
            `The file may be corrupted or incomplete. Please re-run 01-auth-setup.spec.ts to recreate the authentication state.`
        );
      }

      console.log('📂 Loading saved authentication state...');

      // Create context with saved auth state
      let context;
      try {
        context = await browser.newContext({ storageState: authFile });
      } catch (contextError) {
        throw new Error(
          `Failed to create browser context with authentication state: ${contextError instanceof Error ? contextError.message : String(contextError)}. ` +
            `The saved state may be corrupted. Please re-run 01-auth-setup.spec.ts to recreate the authentication state.`
        );
      }

      // Create a new page from the authenticated context
      const page = await context.newPage();

      // Verify the auth state is working by checking if we can access a protected route
      try {
        console.log('🔍 Verifying authentication state...');
        await page.goto('/app/groups', { waitUntil: 'domcontentloaded', timeout: 15000 });

        // Additional verification - check for groups page header
        const headerVisible = await page
          .locator('[data-testid="groups-page-header"]')
          .isVisible({ timeout: 5000 });
        if (!headerVisible) {
          throw new Error('Groups page header not visible after authentication');
        }

        console.log('✅ Authentication state loaded and verified successfully');
        if (isCI) {
          console.log(`🔍 CI Debug - Authenticated page URL: ${page.url()}`);
          console.log(`🔍 CI Debug - Groups page header visible: ${headerVisible}`);
        }
      } catch (verificationError) {
        // Clean up the context if auth verification fails
        await context.close();
        throw new Error(
          `Failed to verify authentication state. The saved state may be expired or invalid. ` +
            `Please re-run 01-auth-setup.spec.ts to refresh the authentication state. ` +
            `Error: ${verificationError instanceof Error ? verificationError.message : String(verificationError)}`
        );
      }

      // Provide the authenticated page to the test
      await use(page);

      // Clean up
      await context.close();
    } catch (error) {
      // Provide a helpful error message for debugging
      if (error instanceof Error) {
        console.error('❌ Authentication fixture failed:', error.message);

        // Add specific guidance for common issues
        if (
          error.message.includes('Authentication directory not found') ||
          error.message.includes('Authentication state file not found')
        ) {
          console.error('\n💡 To fix this issue:');
          console.error('   1. Ensure 01-auth-setup.spec.ts runs before this test');
          console.error('   2. Check that the auth setup tests complete successfully');
          console.error('   3. Verify the playwright/.auth directory exists and is writable');
          console.error(
            `   4. Check file paths: authFile=${authFile}, authDir=${authDir}, cwd=${process.cwd()}`
          );
        } else if (
          error.message.includes('Failed to verify authentication state') ||
          error.message.includes('validation failed')
        ) {
          console.error('\n💡 To fix this issue:');
          console.error('   1. Re-run 01-auth-setup.spec.ts to refresh the auth state');
          console.error('   2. Check if the backend server is running and accessible');
          console.error('   3. Verify the test user credentials are still valid');
          console.error('   4. Check network connectivity and backend health');
        } else if (error.message.includes('Failed to create browser context')) {
          console.error('\n💡 To fix this issue:');
          console.error('   1. The authentication state file may be corrupted');
          console.error('   2. Re-run 01-auth-setup.spec.ts to recreate the auth state');
          console.error('   3. Check file permissions and disk space');
        }

        // Additional CI-specific guidance
        if (isCI) {
          console.error('\n🔍 CI Environment Debugging:');
          console.error(`   - CI detected: ${isCI}`);
          console.error(`   - Auth file path: ${authFile}`);
          console.error(`   - Auth directory: ${authDir}`);
          console.error(`   - Current working directory: ${process.cwd()}`);
          console.error(
            '   - Check that the auth setup job completed successfully in the CI pipeline'
          );
          console.error('   - Verify that artifacts are properly shared between CI jobs');
        }
      }

      // Re-throw the error to fail the test
      throw error;
    }
  },
});

export { expect };
