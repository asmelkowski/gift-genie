/**
 * Auth Setup Utility
 * Handles user registration and login for independent e2e tests
 * Provides authenticated page contexts for testing
 */

import { Browser, BrowserContext, Page } from '@playwright/test';
import { chromium } from '@playwright/test';
import { TestDataFactory, TestUserData, TestCredentials } from './test-data-factory';
import { TestHelpers } from './test-helpers';
import { ParallelExecutionHelpers } from './parallel-execution-helpers';

export interface AuthenticatedContext {
  page: Page;
  context: BrowserContext;
  userData: TestUserData;
  cleanup: () => Promise<void>;
}

export interface AuthSetupOptions {
  existingUser?: boolean;
  skipRegistration?: boolean;
  customCredentials?: TestCredentials;
  userData?: TestUserData;
  browser?: Browser;
}

/**
 * Auth Setup Utility for independent e2e tests
 * Handles user registration, login, and authentication state management
 */
export class AuthSetup {
  private static readonly REGISTRATION_TIMEOUT = 30000;
  private static readonly LOGIN_TIMEOUT = 30000;
  private static readonly NAVIGATION_TIMEOUT = 30000;

  /**
   * Creates an authenticated context for testing
   * Handles both new user registration and existing user login
   */
  static async createAuthenticatedContext(
    options: AuthSetupOptions = {}
  ): Promise<AuthenticatedContext> {
    const {
      existingUser = false,
      skipRegistration = false,
      customCredentials,
      userData: providedUserData,
      browser,
    } = options;

    console.log('🔐 Setting up authenticated context...');
    console.log(`   👤 Existing user: ${existingUser}`);
    console.log(`   ⏭️  Skip registration: ${skipRegistration}`);

    // Use provided browser or create a new one
    const testBrowser =
      browser ||
      (await chromium.launch({
        args: TestHelpers.isCI() ? ['--no-sandbox', '--disable-dev-shm-usage'] : undefined,
      }));

    const context = await testBrowser.newContext();
    const page = await context.newPage();

    // Set navigation timeout
    page.setDefaultTimeout(this.NAVIGATION_TIMEOUT);

    let userData: TestUserData;
    const logPrefix = ParallelExecutionHelpers.getLogPrefix();

    try {
      console.log(`${logPrefix} Setting up authentication...`);

      if (skipRegistration) {
        // Use existing credentials - ensure consistent userData
        const credentials = customCredentials || TestDataFactory.createTestCredentials();
        userData = providedUserData || {
          email: credentials.email,
          password: credentials.password,
          name: 'Existing User',
          testId: 'existing',
        };

        console.log(`${logPrefix} ⏭️  Skipping registration, using existing credentials`);
        await this.loginUser(page, userData);
      } else if (existingUser) {
        // Try to login with existing user, fallback to registration
        // Use consistent credentials for both attempts
        const credentials = customCredentials || TestDataFactory.createTestCredentials();
        userData = providedUserData || {
          email: credentials.email,
          password: credentials.password,
          name: 'Existing User',
          testId: 'existing',
        };

        console.log(`${logPrefix} 👤 Attempting login with existing user...`);
        const loginSuccess = await this.attemptLogin(page, userData);

        if (!loginSuccess) {
          console.log(`${logPrefix} ⚠️  Existing user login failed, registering new user...`);
          // Create new user data for registration, but keep the same credentials for consistency
          userData = providedUserData || TestDataFactory.createTestUser();
          await this.registerAndLoginUser(page, userData);
        }
      } else {
        // Register new user
        if (customCredentials) {
          // Use custom credentials to create userData
          userData = providedUserData || {
            email: customCredentials.email,
            password: customCredentials.password,
            name: 'Custom User',
            testId: TestDataFactory.generateTestId('custom'),
          };
          console.log(
            `${logPrefix} 🎯 Using custom credentials for registration: ${customCredentials.email}`
          );
        } else {
          userData = providedUserData || TestDataFactory.createTestUser();
        }
        await this.registerAndLoginUser(page, userData);
      }

      // Verify authentication
      await this.verifyAuthentication(page);

      // Store user data on page for later retrieval
      await page.addScriptTag({
        content: `window.__testUserData = ${JSON.stringify(userData)};`,
      });

      console.log(`✅ Authenticated context created successfully with user: ${userData.email}`);

      // Return authenticated context with cleanup function
      return {
        page,
        context,
        userData,
        cleanup: async () => {
          console.log('🧹 Cleaning up authenticated context...');
          await context.close();
          if (!browser) {
            await testBrowser.close();
          }
        },
      };
    } catch (error) {
      console.error('❌ Failed to create authenticated context:', error);
      await context.close();
      if (!browser) {
        await testBrowser.close();
      }
      throw error;
    }
  }

  /**
   * Registers a new user and logs them in with retry logic for parallel execution
   */
  private static async registerAndLoginUser(
    page: Page,
    userData: TestUserData,
    maxRetries: number = 3
  ): Promise<void> {
    const logPrefix = ParallelExecutionHelpers.getLogPrefix();
    console.log(`${logPrefix} 📝 Registering and logging in user...`);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`${logPrefix} 🔄 Registration attempt ${attempt}/${maxRetries}`);

        // Try API registration first (more reliable than frontend form)
        const apiSuccess = await this.tryApiRegistration(userData);
        if (apiSuccess) {
          console.log(`${logPrefix} ✅ API registration successful`);
          break; // Success, exit retry loop
        } else {
          console.log(`${logPrefix} ⚠️  API registration failed, trying frontend form...`);
        }

        // Fallback to frontend form registration
        // Navigate to registration page
        await page.goto('/register', { waitUntil: 'domcontentloaded' });
        console.log(`${logPrefix} ✅ Navigated to registration page`);

        // Wait for form to be visible
        await page.waitForSelector('form', { timeout: 10000 });
        await page.waitForSelector('#name', { timeout: 10000 });
        await page.waitForSelector('#email', { timeout: 10000 });
        await page.waitForSelector('#password', { timeout: 10000 });

        // Fill registration form
        await page.fill('#name', userData.name, { timeout: 15000 });
        await page.fill('#email', userData.email, { timeout: 15000 });
        await page.fill('#password', userData.password, { timeout: 15000 });
        console.log(`${logPrefix} ✅ Registration form filled`);

        // Submit registration
        await page.click('button[type="submit"]', { timeout: 15000 });
        console.log(`${logPrefix} ✅ Registration form submitted`);

        // Wait for navigation to login page (either automatic or manual)
        try {
          await page.waitForURL('**/login', { timeout: 10000 });
          console.log(`${logPrefix} ✅ Successfully navigated to login page after registration`);
          break; // Success, exit retry loop
        } catch {
          // If automatic navigation didn't happen, check if we're still on register page
          const currentUrl = page.url();
          if (currentUrl.includes('/register')) {
            // If still on register page after submission, assume registration failed and retry with new data
            if (attempt < maxRetries) {
              console.log(
                `${logPrefix} ⚠️  Still on register page after submission (attempt ${attempt}), retrying with new data...`
              );
              // Generate new unique user data for retry
              const newUserData = TestDataFactory.createTestUser(
                `${userData.testId}-retry-${attempt}`
              );
              userData = { ...userData, ...newUserData }; // Update userData for next attempt
              console.log(`${logPrefix} 🔄 New user data for retry: ${userData.email}`);
              await new Promise(resolve => setTimeout(resolve, 1000)); // Brief delay before retry
              continue; // Retry with new data
            } else {
              console.log(
                `${logPrefix} ⚠️  Still on register page after ${maxRetries} attempts, treating as existing user`
              );
              // Navigate to login manually for existing user
              await page.goto('/login', { waitUntil: 'domcontentloaded' });
              console.log(`${logPrefix} ✅ Manually navigated to login page`);
              break; // Exit retry loop, proceed to login
            }
          } else if (currentUrl.includes('/login')) {
            console.log(`${logPrefix} ✅ Already on login page after registration`);
            break; // Success, exit retry loop
          } else {
            await TestHelpers.takeScreenshot(page, `registration-failure-attempt-${attempt}`);
            throw new Error(`Unexpected navigation after registration. Current URL: ${currentUrl}`);
          }
        }
      } catch (error) {
        if (attempt === maxRetries) {
          await TestHelpers.takeScreenshot(page, 'registration-failure-final');
          throw new Error(
            `Registration failed after ${maxRetries} attempts: ${error instanceof Error ? error.message : String(error)}`
          );
        } else {
          console.log(`${logPrefix} ⚠️  Registration attempt ${attempt} failed, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
        }
      }
    }

    // Login the user (will use the final userData which might have been updated during retries)
    await this.loginUser(page, userData);
  }

  /**
   * Try to register user via API directly (more reliable than frontend form)
   */
  private static async tryApiRegistration(userData: TestUserData): Promise<boolean> {
    try {
      const response = await fetch('http://localhost:8000/api/v1/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: userData.name,
          email: userData.email,
          password: userData.password,
        }),
      });

      if (response.ok) {
        return true;
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.log(`API registration failed: ${response.status} ${JSON.stringify(errorData)}`);
        return false;
      }
    } catch (error) {
      console.log(`API registration error: ${error}`);
      return false;
    }
  }

  /**
   * Attempts to login an existing user
   */
  private static async attemptLogin(page: Page, userData: TestUserData): Promise<boolean> {
    try {
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      await page.fill('input[type="email"]', userData.email, { timeout: 15000 });
      await page.fill('input[type="password"]', userData.password, { timeout: 15000 });
      await page.click('button[type="submit"]', { timeout: 15000 });

      // Check if login was successful (redirected to groups page)
      await page.waitForURL('**/app/groups', { timeout: 10000 });
      console.log('✅ Existing user login successful');
      return true;
    } catch {
      console.log('⚠️  Existing user login failed');
      return false;
    }
  }

  /**
   * Logs in a user (assumes already on login page or will navigate)
   */
  private static async loginUser(page: Page, userData: TestUserData): Promise<void> {
    console.log('🔑 Logging in user...');

    try {
      // Ensure we're on the login page
      if (!page.url().includes('/login')) {
        await page.goto('/login', { waitUntil: 'domcontentloaded' });
      }

      // Fill login form
      await page.fill('input[type="email"]', userData.email, { timeout: 15000 });
      await page.fill('input[type="password"]', userData.password, { timeout: 15000 });
      console.log('✅ Login form filled');

      // Submit login
      await page.click('button[type="submit"]', { timeout: 15000 });
      console.log('✅ Login form submitted');

      // Wait for either success (redirect to groups) or failure (error alert or timeout)
      try {
        await page.waitForURL('**/app/groups', { timeout: 5000 });
        console.log(`✅ Successfully logged in and redirected to: ${page.url()}`);
      } catch {
        // Check if login failed - look for error alert or if still on login page
        const currentUrl = page.url();
        const errorAlertVisible = await page
          .locator('[role="alert"]')
          .isVisible()
          .catch(() => false);

        if (currentUrl.includes('/login') || errorAlertVisible) {
          // Login failed - get error message if available
          let errorMessage = 'Login failed';
          try {
            const errorText = await page.locator('[role="alert"]').textContent();
            if (errorText) {
              errorMessage = `Login failed: ${errorText.trim()}`;
            }
          } catch {
            // Ignore error getting error text
          }
          throw new Error(errorMessage);
        } else {
          // Unexpected state - re-throw the original timeout error
          throw new Error('Login timeout - unexpected navigation behavior');
        }
      }

      // Additional wait to ensure the page has fully loaded and rendered
      await page.waitForLoadState('domcontentloaded');
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {
        // Ignore networkidle timeout as it can be flaky
        console.log('⚠️  Network idle timeout, but continuing...');
      });
    } catch (error) {
      await TestHelpers.takeScreenshot(page, 'login-failure');
      // Re-throw with a clear "Login failed" message if it's not already
      if (error instanceof Error && error.message.includes('Login failed')) {
        throw error;
      } else {
        throw new Error(`Login failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  /**
   * Verifies that the user is properly authenticated
   */
  private static async verifyAuthentication(page: Page): Promise<void> {
    console.log('🔍 Verifying authentication...');

    try {
      // Check if we're on the groups page
      const currentUrl = page.url();
      if (!currentUrl.includes('/app/groups')) {
        await page.goto('/app/groups', { waitUntil: 'domcontentloaded' });
      }

      // Wait for page to be fully loaded
      await page.waitForLoadState('domcontentloaded');
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {
        // Ignore networkidle timeout as it can be flaky
        console.log('⚠️  Network idle timeout during verification, but continuing...');
      });

      // Verify the groups page header is visible
      await page.waitForSelector('[data-testid="groups-page-header"]', {
        timeout: 15000,
      });

      // Additional verification - ensure we can see authenticated content
      await page.waitForSelector(
        '[data-testid="groups-page-header"] button:has-text("Create Group")',
        {
          timeout: 5000,
        }
      );

      console.log('✅ Authentication verified successfully');
    } catch (error) {
      await TestHelpers.takeScreenshot(page, 'auth-verification-failure');
      throw new Error(
        `Authentication verification failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Registers a user without logging them in
   * Useful for setting up test data before authentication
   */
  static async registerUser(userData: TestUserData): Promise<void> {
    console.log('📝 Registering user...');

    const browser = await chromium.launch({
      args: TestHelpers.isCI() ? ['--no-sandbox', '--disable-dev-shm-usage'] : undefined,
    });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await this.registerAndLoginUser(page, userData);
      console.log('✅ User registered successfully');
    } finally {
      await context.close();
      await browser.close();
    }
  }

  /**
   * Creates a quick authenticated page for simple tests
   * Less robust than full context creation but faster for basic tests
   */
  static async createAuthenticatedPage(browser: Browser, userData?: TestUserData): Promise<Page> {
    console.log('📄 Creating authenticated page...');

    const context = await browser.newContext();
    const page = await context.newPage();

    const testUserData = userData || TestDataFactory.createTestUser();

    try {
      // Quick registration and login
      await this.registerAndLoginUser(page, testUserData);

      // Store user data on page for later retrieval
      await page.addScriptTag({
        content: `window.__testUserData = ${JSON.stringify(testUserData)};`,
      });

      console.log('✅ Authenticated page created');
      return page;
    } catch (error) {
      await context.close();
      throw error;
    }
  }

  /**
   * Retrieves user data from an authenticated page
   */
  static async getUserDataFromPage(page: Page): Promise<TestUserData | null> {
    try {
      return await page.evaluate(
        () => (window as { __testUserData?: TestUserData }).__testUserData || null
      );
    } catch {
      return null;
    }
  }
}
