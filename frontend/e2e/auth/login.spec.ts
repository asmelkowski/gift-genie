// File: frontend/e2e/auth/login.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Login', () => {
  test('should display login page elements', async ({ page }) => {
    await page.goto('/login');

    // Verify login page elements
    await expect(page.locator('[data-testid="login-page-title"]')).toContainText('Login');
    await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-password-input"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill with invalid credentials
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('text=Invalid email or password')).toBeVisible();
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/login');

    // Use the test user credentials from auth.setup.ts
    await page.fill('input[type="email"]', 'e2e-test-user@example.com');
    await page.fill('input[type="password"]', 'TestPassword123!@#');
    await page.click('button[type="submit"]');

    // Wait for navigation to complete
    await page.waitForURL('/app/groups', { timeout: 15000 });

    // Verify we're on the groups page
    await expect(page).toHaveURL('/app/groups');
    await expect(page.locator('[data-testid="groups-page-header"]')).toBeVisible();
  });
});
