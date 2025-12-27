import { test, expect } from '@playwright/test';
import { LoginPage } from '../page-objects/LoginPage';
import { GroupsPage } from '../page-objects/GroupsPage';
import { generateUser, registerUser, loginUser } from '../helpers';

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
    await loginPage.login('invalid@example.com', 'wrongpassword', { expectSuccess: false });

    // Expect error message
    await loginPage.expectErrorMessage('Invalid credentials');
  });

  test('should login successfully with valid credentials', async ({ page, context }) => {
    // Register first
    const userData = generateUser();
    await registerUser(page, userData);

    const groupsPage = new GroupsPage(page);

    // Login with valid credentials using helper
    await loginUser(page, context, userData);

    // Verify we're on the groups page
    await expect(page).toHaveURL('/groups');

    // Wait for page to load and verify it's visible
    await groupsPage.waitForLoad();
    await groupsPage.expectPageVisible();
  });
});
