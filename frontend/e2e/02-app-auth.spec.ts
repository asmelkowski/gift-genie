import { test, expect } from './fixtures';
import { TestDataFactory, AuthSetup, DatabaseCleanup, TestHelpers } from './utils';

/**
 * Application Authentication E2E Tests
 * Independent tests for app-level authentication functionality
 * Each test creates its own authenticated context and cleans up after itself
 */

test('should display login page UI elements', async ({ page }) => {
  console.log('🎨 Testing login page UI elements...');

  // Use a fresh page to ensure we're not authenticated
  await page.goto('/login');

  // Verify login page elements are visible
  await TestHelpers.waitForVisible(page, '[data-testid="login-page-title"]');
  await expect(page.locator('[data-testid="login-page-title"]')).toContainText('Login');

  await TestHelpers.waitForVisible(page, '[data-testid="login-email-input"]');
  await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible();

  await TestHelpers.waitForVisible(page, '[data-testid="login-password-input"]');
  await expect(page.locator('[data-testid="login-password-input"]')).toBeVisible();

  console.log('✅ Login page UI elements verified');
});

test('should show error with invalid credentials', async ({ page }) => {
  console.log('❌ Testing invalid credentials error handling...');

  // Use a fresh page to test login error handling
  await page.goto('/login');

  // Fill with invalid credentials
  await TestHelpers.fillAndWait(page, 'input[type="email"]', 'invalid@example.com');
  await TestHelpers.fillAndWait(page, 'input[type="password"]', 'wrongpassword');

  // Submit login
  await TestHelpers.clickAndWait(page, 'button[type="submit"]');

  // Wait for error message to appear
  await TestHelpers.waitForVisible(page, 'text=Invalid email or password');
  await expect(page.locator('text=Invalid email or password')).toBeVisible();

  console.log('✅ Invalid credentials error displayed correctly');
});

test('should login with valid credentials', async ({ browser }) => {
  console.log('✅ Testing valid credentials login flow...');

  // Generate unique test user data
  const userData = TestDataFactory.createTestUser('valid-login-test');

  // Create authenticated context (handles registration + login automatically)
  const { page, cleanup } = await AuthSetup.createAuthenticatedContext({
    browser,
    existingUser: false, // Register new user
  });

  try {
    // Verify we're on the groups page after login with improved waiting
    await TestHelpers.waitForNavigation(page, '/app/groups');
    await TestHelpers.waitForVisible(page, '[data-testid="groups-page-header"]');
    await expect(page.locator('[data-testid="groups-page-header"]')).toContainText('Groups');
    await expect(page).toHaveURL('/app/groups');

    console.log('✅ Valid credentials login successful');
  } finally {
    // Clean up test data and browser context
    await DatabaseCleanup.cleanupTestData(userData);
    await cleanup();
  }
});

test('should logout successfully', async ({ browser }) => {
  console.log('🚪 Testing logout functionality...');

  // Generate unique test user data
  const userData = TestDataFactory.createTestUser('logout-test');

  // Create authenticated context with specific user data
  const { page, cleanup } = await AuthSetup.createAuthenticatedContext({
    browser,
    existingUser: false,
    userData,
  });

  try {
    // Ensure we're on the groups page
    await page.goto('/app/groups');
    await TestHelpers.waitForVisible(page, '[data-testid="groups-page-header"]');

    // Click user menu button to open dropdown
    await TestHelpers.clickAndWait(page, 'button[data-testid="user-menu-button"]');

    // Wait for the logout menu item to be visible in the dropdown
    await TestHelpers.waitForVisible(page, 'button:has-text("Logout")');

    // Small delay to ensure dropdown animation completes
    await TestHelpers.sleep(100);

    // Click logout button in the dropdown menu (more specific selector)
    await page.click('button[role="menuitem"]:has-text("Logout")');

    // Wait for logout API call and navigation to complete
    // The logout process: API call -> store update -> navigation
    await TestHelpers.waitForNavigation(page, '/login');

    // Verify we're on the login page
    await expect(page).toHaveURL('/login');

    // Verify we can't access protected routes anymore
    await page.goto('/app/groups');
    await expect(page).toHaveURL('/login'); // Should redirect back to login

    console.log('✅ Logout successful');
  } finally {
    // Clean up test data and browser context
    await DatabaseCleanup.cleanupTestData(userData);
    await cleanup();
  }
});

test('should navigate to groups page when authenticated', async ({ browser }) => {
  console.log('📄 Testing authenticated navigation to groups page...');

  // Generate unique test user data
  const userData = TestDataFactory.createTestUser('groups-navigation-test');

  // Create authenticated context with specific user data
  const { page, cleanup } = await AuthSetup.createAuthenticatedContext({
    browser,
    existingUser: false,
    userData,
  });

  try {
    // Navigate to groups page
    await page.goto('/app/groups');

    // Verify we're on the groups page and can see the header
    await TestHelpers.waitForVisible(page, '[data-testid="groups-page-header"]');
    await expect(page.locator('[data-testid="groups-page-header"]')).toContainText('Groups');

    // Verify we can access authenticated content (create group button)
    await TestHelpers.waitForVisible(
      page,
      '[data-testid="groups-page-header"] button:has-text("Create Group")'
    );
    await expect(
      page.locator('[data-testid="groups-page-header"] button:has-text("Create Group")')
    ).toBeVisible();

    // Test that we can interact with the page
    const createButton = page.locator(
      '[data-testid="groups-page-header"] button:has-text("Create Group")'
    );
    await expect(createButton).toBeEnabled();

    console.log('✅ Authenticated groups page navigation successful');
  } finally {
    // Clean up test data and browser context
    await DatabaseCleanup.cleanupTestData(userData);
    await cleanup();
  }
});

test('should handle multiple login attempts gracefully', async ({ browser }) => {
  console.log('🔄 Testing multiple login attempts...');

  // Generate unique test user data
  const userData = TestDataFactory.createTestUser('multiple-login-test');

  // Create authenticated context with specific user data
  const { page, cleanup } = await AuthSetup.createAuthenticatedContext({
    browser,
    existingUser: false,
    userData,
  });

  try {
    // First login should work
    await TestHelpers.waitForVisible(page, '[data-testid="groups-page-header"]');

    // Logout
    await TestHelpers.clickAndWait(page, 'button[data-testid="user-menu-button"]');
    await TestHelpers.waitForVisible(page, 'button:has-text("Logout")');
    await TestHelpers.sleep(100);
    await page.click('button[role="menuitem"]:has-text("Logout")');
    await TestHelpers.waitForNavigation(page, '/login');

    // Second login attempt with same credentials
    await TestHelpers.fillAndWait(page, 'input[type="email"]', userData.email);
    await TestHelpers.fillAndWait(page, 'input[type="password"]', userData.password);
    await TestHelpers.clickAndWait(page, 'button[type="submit"]');

    // Should redirect to groups page again
    await TestHelpers.waitForNavigation(page, '/app/groups');
    await TestHelpers.waitForVisible(page, '[data-testid="groups-page-header"]');
    await expect(page).toHaveURL('/app/groups');

    console.log('✅ Multiple login attempts handled successfully');
  } finally {
    // Clean up test data and browser context
    await DatabaseCleanup.cleanupTestData(userData);
    await cleanup();
  }
});

test('should maintain authentication across page refreshes', async ({ browser }) => {
  console.log('🔄 Testing authentication persistence across refreshes...');

  // Generate unique test user data
  const userData = TestDataFactory.createTestUser('refresh-persistence-test');

  // Create authenticated context with specific user data
  const { page, cleanup } = await AuthSetup.createAuthenticatedContext({
    browser,
    existingUser: false,
    userData,
  });

  try {
    // Verify initial authentication
    await TestHelpers.waitForVisible(page, '[data-testid="groups-page-header"]');

    // Refresh the page
    await page.reload({ waitUntil: 'domcontentloaded' });

    // Verify authentication persists after refresh
    await TestHelpers.waitForVisible(page, '[data-testid="groups-page-header"]');

    // Verify we can still access authenticated content
    await TestHelpers.waitForVisible(
      page,
      '[data-testid="groups-page-header"] button:has-text("Create Group")'
    );

    console.log('✅ Authentication maintained across page refresh');
  } finally {
    // Clean up test data and browser context
    await DatabaseCleanup.cleanupTestData(userData);
    await cleanup();
  }
});
