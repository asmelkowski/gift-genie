import { test, expect } from './fixtures';

/**
 * Authentication E2E Tests
 * Test the full login and registration flows
 */

test('should display login page', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('[data-testid="login-page-title"]')).toContainText('Login');
  await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible();
  await expect(page.locator('[data-testid="login-password-input"]')).toBeVisible();
});

test('should login with valid credentials', async ({ groupsPage, authenticatedPage }) => {
  await authenticatedPage.goto('/app/groups');
  await groupsPage.expectLoggedIn();
});

test('should show error with invalid credentials', async ({ loginPage }) => {
  await loginPage.goto();
  await loginPage.submitLogin('test@example.com', 'WrongPassword');
  await loginPage.expectErrorMessage('Invalid email or password');
});

test('should logout successfully', async ({ authenticatedPage }) => {
  // We're already logged in via the fixture
  const homePage = authenticatedPage;

  // Click user menu
  await homePage.click('button[data-testid="user-menu-button"]');

  // Click logout
  await homePage.click('button:has-text("Logout")');

  // Should be redirected to login
  await expect(homePage).toHaveURL('/login');
});

test('should navigate to groups page when logged in', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/app/groups');
  await expect(authenticatedPage.locator('[data-testid="groups-page-header"]')).toContainText(
    'Groups'
  );
});
