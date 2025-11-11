import { test, expect } from '@playwright/test';
import { LoginPage } from '../page-objects/LoginPage';
import { GroupsPage } from '../page-objects/GroupsPage';

test.describe('Login', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('should display login page elements', async () => {
    // Verify all login form elements are visible
    await loginPage.expectEmailVisible();
    await loginPage.expectPasswordVisible();
    await loginPage.expectSubmitVisible();
  });

  test('should show error with invalid credentials', async () => {
    // Try to login with invalid credentials
    await loginPage.login('invalid@example.com', 'wrongpassword');

    // Expect error message
    await loginPage.expectErrorMessage('Invalid credentials');
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    const groupsPage = new GroupsPage(page);

    // Login with valid credentials (same as setup)
    await loginPage.login('e2e-test-user@example.com', 'SecurePassword123!');

    // Wait for navigation to groups page
    await page.waitForURL('/app/groups', { timeout: 15000 });

    // Verify we're on the groups page
    await expect(page).toHaveURL('/app/groups');

    // Wait for page to load and verify it's visible
    await groupsPage.waitForLoad();
    await groupsPage.expectPageVisible();
  });
});
