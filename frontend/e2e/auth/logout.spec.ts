import { test, expect } from '@playwright/test';
import { GroupsPage } from '../page-objects/GroupsPage';
import { AppLayoutPage } from '../page-objects/AppLayoutPage';

test.describe('Logout', () => {
  test('should logout successfully', async ({ page }) => {
    const groupsPage = new GroupsPage(page);
    const appLayout = new AppLayoutPage(page);

    // Navigate to groups page and wait for it to load
    await groupsPage.goto();
    await groupsPage.waitForLoad();

    // Verify we're authenticated
    await appLayout.expectAuthenticated();

    // Perform logout
    await appLayout.logout();

    // Verify we're redirected to login
    await page.waitForURL('/login');
    await expect(page).toHaveURL('/login');
  });

  test('should not access protected routes after logout', async ({ page }) => {
    const groupsPage = new GroupsPage(page);
    const appLayout = new AppLayoutPage(page);

    // Navigate to groups page
    await groupsPage.goto();
    await groupsPage.waitForLoad();

    // Logout
    await appLayout.logout();
    await page.waitForURL('/login');

    // Try to access protected route
    await groupsPage.goto();

    // Should be redirected back to login
    await page.waitForURL('/login');
    await expect(page).toHaveURL('/login');
  });
});
