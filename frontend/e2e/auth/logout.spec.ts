import { test, expect } from '@playwright/test';
import { GroupsPage } from '../page-objects/GroupsPage';
import { AppLayoutPage } from '../page-objects/AppLayoutPage';
import { generateUser, loginUser, registerUser } from '../helpers';
import { LoginPage } from '../page-objects/LoginPage';

test.describe('Logout', () => {
  test('should logout successfully', async ({ page }) => {
    // Register and login
    const userData = generateUser();
    await registerUser(page, userData);
    await loginUser(page, userData);

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
    const loginPage = new LoginPage(page);
    const groupsPage = new GroupsPage(page);
    await groupsPage.goto();
    await expect(page).toHaveURL('/login');
    await loginPage.expectPasswordVisible();
  });
});
