import { test as setup, expect } from '@playwright/test';

const authFile = '.auth/user.json';

// Test user credentials - same for all test runs
const TEST_USER = {
  email: 'e2e-test-user@example.com',
  password: 'TestPassword123!@#',
  name: 'E2E Test User',
};

setup('authenticate', async ({ page }) => {
  // Try to login first (user might already exist)
  await page.goto('/login');

  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');

  // Check if login succeeded or if we need to register
  try {
    await page.waitForURL('/app/groups', { timeout: 5000 });
    console.log('✅ Logged in with existing user');
  } catch {
    // Login failed, try registration
    console.log('⚠️  Login failed, attempting registration...');

    await page.goto('/register');
    await page.fill('#name', TEST_USER.name);
    await page.fill('#email', TEST_USER.email);
    await page.fill('#password', TEST_USER.password);
    await page.click('button[type="submit"]');

    // After registration, should redirect to login or auto-login
    // Wait for either login page or groups page
    await Promise.race([
      page.waitForURL('/login', { timeout: 10000 }),
      page.waitForURL('/app/groups', { timeout: 10000 }),
    ]);

    // If on login page, login now
    if (page.url().includes('/login')) {
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[type="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('/app/groups', { timeout: 10000 });
    }

    console.log('✅ Registered and logged in new user');
  }

  // Verify we're authenticated
  await expect(page.locator('[data-testid="groups-page-header"]')).toBeVisible({ timeout: 10000 });

  // Save authentication state
  await page.context().storageState({ path: authFile });

  console.log(`✅ Authentication state saved to ${authFile}`);
});
