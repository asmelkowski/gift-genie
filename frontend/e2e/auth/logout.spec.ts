// File: frontend/e2e/auth/logout.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Logout', () => {
  test('should logout successfully', async ({ page }) => {
    await page.goto('/app/groups');

    // Verify we're logged in
    await expect(page.locator('[data-testid="groups-page-header"]')).toBeVisible();

    // Open user menu and click logout
    await page.click('button[data-testid="user-menu-button"]');
    await page.click('button:has-text("Logout")');

    // Should redirect to login page
    await expect(page).toHaveURL('/login');
  });

  test('should not access protected routes after logout', async ({ page }) => {
    await page.goto('/app/groups');

    // Logout
    await page.click('button[data-testid="user-menu-button"]');
    await page.click('button:has-text("Logout")');
    await expect(page).toHaveURL('/login');

    // Try to access protected route
    await page.goto('/app/groups');

    // Should redirect back to login
    await expect(page).toHaveURL('/login');
  });
});
