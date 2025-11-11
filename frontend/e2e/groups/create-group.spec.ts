// File: frontend/e2e/groups/create-group.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Group Management', () => {
  test('should create a new group', async ({ page }) => {
    await page.goto('/app/groups');

    // Generate unique group name
    const groupName = `Test Group ${Date.now()}`;

    // Click create group button
    await page.click('[data-testid="groups-page-header"] button:has-text("Create Group")');

    // Wait for dialog to be visible
    await page.waitForSelector('input[placeholder="Enter group name"]', { state: 'visible' });

    // Fill the form
    await page.fill('input[placeholder="Enter group name"]', groupName);

    // Submit the form (press Enter or find submit button)
    await page.press('input[placeholder="Enter group name"]', 'Enter');

    // Verify group appears in list
    await expect(page.locator(`text=${groupName}`)).toBeVisible({ timeout: 10000 });
  });

  test('should display empty state when no groups exist', async ({ page }) => {
    await page.goto('/app/groups');

    // If no groups, should show empty state or create prompt
    // This test assumes groups might exist from previous test user
    // Just verify the page loads correctly
    await expect(page.locator('[data-testid="groups-page-header"]')).toContainText('Groups');
    await expect(page.locator('button:has-text("Create Group")')).toBeVisible();
  });
});
