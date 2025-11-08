import { test, expect } from './fixtures';

/**
 * Application Authentication E2E Tests
 * Test app-level authentication functionality (requires auth setup)
 */

test('should display login page UI elements', async ({ page }) => {
  // Use a fresh page to ensure we're not authenticated
  await page.goto('/login');
  await expect(page.locator('[data-testid="login-page-title"]')).toContainText('Login');
  await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible();
  await expect(page.locator('[data-testid="login-password-input"]')).toBeVisible();
});

test('should show error with invalid credentials', async ({ page }) => {
  // Use a fresh page to test login error handling
  await page.goto('/login');
  await page.fill('input[type="email"]', 'invalid@example.com');
  await page.fill('input[type="password"]', 'wrongpassword');
  await page.click('button[type="submit"]');

  // Wait for error message to appear
  await expect(page.locator('text=Invalid email or password')).toBeVisible();
});

test('should login with valid credentials', async ({ page }) => {
  // Use a fresh page to test the complete login flow
  // Use the same credentials that were created in the auth setup
  const testEmail = 'test@example.com'; // Setup uses this in CI, and handles existing user in local
  const testPassword = '09%#3@0#rH3ksOqbL#qg8LAnT8c*35Vfa&5Q';

  await page.goto('/login');
  await page.fill('input[type="email"]', testEmail);
  await page.fill('input[type="password"]', testPassword);
  await page.click('button[type="submit"]');

  // Should redirect to groups page after successful login
  await page.waitForURL('/app/groups', { timeout: 15000 });
  await expect(page.locator('[data-testid="groups-page-header"]')).toContainText('Groups');
});

test('should logout successfully', async ({ authenticatedPage }) => {
  // Start with authenticated page from fixture
  await authenticatedPage.goto('/app/groups');

  // Click user menu button
  await authenticatedPage.click('button[data-testid="user-menu-button"]');

  // Click logout
  await authenticatedPage.click('text=Logout');

  // Should be redirected to login page
  await authenticatedPage.waitForURL('/login', { timeout: 10000 });
  await expect(authenticatedPage).toHaveURL('/login');
});

test('should navigate to groups page when authenticated', async ({ authenticatedPage }) => {
  // Start with authenticated page from fixture
  await authenticatedPage.goto('/app/groups');

  // Verify we're on the groups page and can see the header
  await expect(authenticatedPage.locator('[data-testid="groups-page-header"]')).toContainText(
    'Groups'
  );

  // Verify we can access authenticated content (groups list or create button)
  await expect(authenticatedPage.locator('button:has-text("Create Group")')).toBeVisible();
});
