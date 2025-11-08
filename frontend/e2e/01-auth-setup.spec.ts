import { test, expect } from './fixtures';
import { chromium, Browser, BrowserContext, Page } from '@playwright/test';
import { mkdir } from 'fs/promises';
import { existsSync, readFileSync } from 'fs';
import * as path from 'path';

/**
 * Authentication Setup E2E Tests
 * These tests run first to create and authenticate the test user
 * Uses serial execution to ensure proper ordering in a single user journey
 */
test.describe.serial('Authentication Setup', () => {
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;

  const isCI = !!process.env.CI;
  const timestamp = Date.now();
  const testEmail = isCI ? 'test@example.com' : `test-${timestamp}@example.com`;
  const testPassword = '09%#3@0#rH3ksOqbL#qg8LAnT8c*35Vfa&5Q';
  const authFile = path.resolve(process.cwd(), 'playwright/.auth/user.json');
  const authDir = path.dirname(authFile);
  const screenshotDir = 'test-results/screenshots';

  test.beforeAll(async () => {
    // Ensure screenshot directory exists
    try {
      await mkdir(screenshotDir, { recursive: true });
      console.log(`📁 Screenshot directory ensured: ${screenshotDir}`);
    } catch (error) {
      console.warn(`⚠️ Could not create screenshot directory: ${error}`);
    }

    // Launch browser and create persistent context for the entire journey
    browser = await chromium.launch({
      args: isCI ? ['--no-sandbox', '--disable-dev-shm-usage'] : undefined,
    });

    context = await browser.newContext();
    page = await context.newPage();

    console.log('🚀 Starting Authentication Setup Tests');
    console.log(`📍 Environment: ${isCI ? 'CI' : 'Local'}`);
    console.log(`👤 Test email: ${testEmail}`);
    console.log(`📂 Auth file path: ${authFile}`);
    console.log(`📂 Auth directory: ${authDir}`);
    console.log(`📂 Current working directory: ${process.cwd()}`);
  });

  test.afterAll(async () => {
    if (context) {
      await context.close();
      console.log('🧹 Context closed');
    }
    if (browser) {
      await browser.close();
      console.log('🧹 Browser closed');
    }
  });

  test('should register user and login successfully', async () => {
    console.log('\n📝 Step 1: Register user and login...');

    // Navigate to registration page
    await page.goto('/register', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    console.log(`✅ Navigated to registration page: ${page.url()}`);

    // Fill registration form
    await page.fill('#name', 'Test User', { timeout: 15000 });
    console.log('✓ Name filled');

    await page.fill('#email', testEmail, { timeout: 15000 });
    console.log('✓ Email filled');

    await page.fill('#password', testPassword, { timeout: 15000 });
    console.log('✓ Password filled');

    // Submit registration
    await page.click('button[type="submit"]', { timeout: 15000 });
    console.log('✓ Registration form submitted');

    try {
      // Wait for success message
      await page.waitForSelector('text=Account created successfully! Please log in.', {
        timeout: 10000,
      });
      console.log('✅ Registration success message appeared');

      // Wait for navigation to login page
      await page.waitForURL('**/login', { timeout: 10000 });
      console.log('✅ Navigated to login page after registration');

      // Fill login form
      await page.fill('#email', testEmail, { timeout: 15000 });
      await page.fill('#password', testPassword, { timeout: 15000 });
      console.log('✓ Login form filled');

      // Submit login
      await page.click('button[type="submit"]', { timeout: 15000 });
      console.log('✓ Login form submitted');

      // Wait for redirect after login
      await page.waitForURL('**/app/groups', { timeout: 30000 });
      console.log(`✅ Successfully logged in and redirected to: ${page.url()}`);

      // Verify we're on the groups page
      await expect(page.locator('[data-testid="groups-page-header"]')).toBeVisible();
      console.log('✅ Groups page header is visible');
    } catch (registrationError) {
      // Check if user already exists (expected in CI on subsequent runs)
      console.log('ℹ️ Registration error, checking for existing user...');

      const emailError = await page
        .locator('text=Email already in use')
        .isVisible({ timeout: 5000 });

      if (emailError) {
        console.log('✅ Email conflict detected (user already exists), proceeding to login...');

        // Navigate to login page since user exists
        await page.goto('/login', {
          waitUntil: 'domcontentloaded',
          timeout: 60000,
        });
        console.log(`✅ Navigated to login page: ${page.url()}`);

        // Fill login form
        await page.fill('input[type="email"]', testEmail, { timeout: 15000 });
        await page.fill('input[type="password"]', testPassword, { timeout: 15000 });
        console.log('✓ Login form filled');

        // Submit login
        await page.click('button[type="submit"]', { timeout: 15000 });
        console.log('✓ Login form submitted');

        // Wait for redirect after login
        await page.waitForURL('**/app/groups', { timeout: 30000 });
        console.log(`✅ Successfully logged in and redirected to: ${page.url()}`);

        // Verify we're on the groups page
        await expect(page.locator('[data-testid="groups-page-header"]')).toBeVisible();
        console.log('✅ Groups page header is visible');
      } else {
        // Take screenshot for debugging
        const screenshotPath = `${screenshotDir}/registration-failure.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.error(`❌ Registration failed with unexpected error`);
        console.error(`📸 Screenshot saved to: ${screenshotPath}`);
        throw registrationError;
      }
    }
  });

  test('should verify user remains logged in', async () => {
    console.log('\n🔐 Step 2: Verify user remains logged in...');

    // Since we're using the same context, we should still be logged in from Step 1
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);

    // Verify we're still on the groups page (or navigate there if needed)
    if (!currentUrl.includes('/app/groups')) {
      await page.goto('/app/groups', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      console.log(`✅ Navigated to groups page: ${page.url()}`);
    }

    // Verify we're authenticated and on the groups page
    await expect(page.locator('[data-testid="groups-page-header"]')).toBeVisible();
    console.log('✅ User is still logged in and on groups page');
  });

  test('should save and verify authentication state', async () => {
    console.log('\n🔍 Step 3: Save and verify authentication state...');

    // Ensure auth directory exists before saving
    try {
      await mkdir(authDir, { recursive: true });
      console.log(`📁 Auth directory ensured: ${authDir}`);
    } catch (error) {
      console.warn(`⚠️ Could not create auth directory: ${error}`);
    }

    // Save authentication state from the current context with error handling
    try {
      console.log(`💾 Saving authentication state to: ${authFile}`);
      await context.storageState({ path: authFile });
      console.log(`✅ Authentication state saved to: ${authFile}`);
      if (isCI) {
        console.log(`🔍 CI Debug - Auth file saved successfully`);
      }
    } catch (error) {
      // Take screenshot for debugging
      const screenshotPath = `${screenshotDir}/auth-save-failure.png`;
      try {
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.error(`📸 Screenshot saved to: ${screenshotPath}`);
      } catch (screenshotError) {
        console.warn(`⚠️ Could not save screenshot: ${screenshotError}`);
      }

      console.error(
        `❌ Failed to save authentication state: ${error instanceof Error ? error.message : String(error)}`
      );
      console.error(`📍 Auth file path: ${authFile}`);
      console.error(`📍 Auth directory: ${authDir}`);
      console.error(`📍 Current working directory: ${process.cwd()}`);
      throw error;
    }

    // Verify the auth file was created and contains valid data
    try {
      if (!existsSync(authFile)) {
        throw new Error(`Authentication state file was not created at ${authFile}`);
      }

      // Check file size (should not be empty)
      const stats = await import('fs/promises').then(fs => fs.stat(authFile));
      if (stats.size === 0) {
        throw new Error(`Authentication state file is empty (size: 0 bytes)`);
      }

      // Try to parse the JSON to ensure it's valid
      const authData = JSON.parse(readFileSync(authFile, 'utf-8'));
      if (!authData.cookies || !Array.isArray(authData.cookies)) {
        throw new Error('Authentication state file does not contain valid cookie data');
      }

      console.log(`✅ Auth file verified: ${stats.size} bytes, ${authData.cookies.length} cookies`);
      if (isCI) {
        console.log(`🔍 CI Debug - Auth file location: ${authFile}`);
        console.log(`🔍 CI Debug - Auth file exists: ${existsSync(authFile)}`);
        console.log(`🔍 CI Debug - Auth file size: ${stats.size} bytes`);
      }
    } catch (error) {
      console.error(
        `❌ Auth file verification failed: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }

    // Create a new context with the saved auth state to verify it works
    let authenticatedContext: BrowserContext;
    try {
      authenticatedContext = await browser.newContext({ storageState: authFile });
    } catch (error) {
      console.error(
        `❌ Failed to create authenticated context: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }

    const authenticatedPage = await authenticatedContext.newPage();

    try {
      // Try to access a protected route with the saved state
      await authenticatedPage.goto('/app/groups', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      // Verify we're still authenticated (no redirect to login)
      await expect(authenticatedPage.locator('[data-testid="groups-page-header"]')).toBeVisible();
      console.log('✅ Authentication state is valid and reusable for other tests');

      if (isCI) {
        console.log(`🔍 CI Debug - Authenticated page URL: ${authenticatedPage.url()}`);
        console.log(
          `🔍 CI Debug - Groups page header visible: ${await authenticatedPage.locator('[data-testid="groups-page-header"]').isVisible()}`
        );
      }
    } catch (error) {
      // Take screenshot for debugging
      const screenshotPath = `${screenshotDir}/auth-verification-failure.png`;
      try {
        await authenticatedPage.screenshot({ path: screenshotPath, fullPage: true });
        console.error(`📸 Screenshot saved to: ${screenshotPath}`);
      } catch (screenshotError) {
        console.warn(`⚠️ Could not save screenshot: ${screenshotError}`);
      }

      console.error(
        `❌ Authentication state verification failed: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    } finally {
      await authenticatedContext.close();
    }
  });
});
