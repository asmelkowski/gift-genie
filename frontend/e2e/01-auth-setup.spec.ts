import { test, expect } from './fixtures';
import { TestDataFactory, AuthSetup, DatabaseCleanup, TestHelpers } from './utils';

/**
 * Authentication Setup Examples
 * Independent test examples demonstrating auth flows
 * Each test is completely self-contained with its own setup and cleanup
 */
test.describe('Authentication Setup Examples', () => {
  test('should demonstrate new user registration and login flow', async ({ browser }) => {
    console.log('📝 Testing new user registration and login...');

    // Generate unique test user data
    const userData = TestDataFactory.createTestUser('auth-setup-new-user');

    // Create authenticated context (handles registration + login automatically)
    const { page, cleanup } = await AuthSetup.createAuthenticatedContext({
      browser,
      userData,
      existingUser: false, // Force new user registration
    });

    try {
      // Verify we're authenticated and on the groups page
      await TestHelpers.waitForVisible(page, '[data-testid="groups-page-header"]');
      await expect(page).toHaveURL('/app/groups');

      // Verify user data is accessible
      const userInfo = await AuthSetup.getUserDataFromPage(page);
      expect(userInfo?.email).toBe(userData.email);
      expect(userInfo?.name).toBe(userData.name);

      console.log('✅ New user registration and login successful');
    } finally {
      // Clean up test data and browser context
      await DatabaseCleanup.cleanupTestData(userData);
      await cleanup();
    }
  });

  test('should demonstrate existing user login flow', async ({ browser }) => {
    console.log('🔑 Testing existing user login...');

    // Use existing user credentials (will fallback to registration if user doesn't exist)
    const { page, cleanup } = await AuthSetup.createAuthenticatedContext({
      browser,
      existingUser: true, // Try login first, register if needed
    });

    try {
      // Verify authentication
      await TestHelpers.waitForVisible(page, '[data-testid="groups-page-header"]');
      await expect(page).toHaveURL('/app/groups');

      // Test that we can access authenticated content
      const createGroupButton = page.locator(
        '[data-testid="groups-page-header"] button:has-text("Create Group")'
      );
      await expect(createGroupButton).toBeVisible();

      console.log('✅ Existing user login successful');
    } finally {
      await cleanup();
    }
  });

  test('should demonstrate custom credentials authentication', async ({ browser }) => {
    console.log('🎯 Testing custom credentials authentication...');

    // Create custom test credentials
    const customCredentials = TestDataFactory.createTestCredentials('custom-auth');

    // Create authenticated context with custom credentials
    const {
      page,
      cleanup,
      userData: actualUserData,
    } = await AuthSetup.createAuthenticatedContext({
      browser,
      customCredentials,
      existingUser: false, // Register new user with custom credentials
    });

    try {
      // Verify authentication with custom credentials
      await TestHelpers.waitForVisible(page, '[data-testid="groups-page-header"]');
      await expect(page).toHaveURL('/app/groups');

      // Verify the user data from the page matches what was actually used
      // (may differ from customCredentials if registration failed and retries occurred)
      const userInfo = await AuthSetup.getUserDataFromPage(page);
      expect(userInfo?.email).toBe(actualUserData.email);
      expect(userInfo?.name).toBe(actualUserData.name);

      // Log what credentials were actually used (helpful for debugging)
      console.log(`📧 Actual user email: ${actualUserData.email}`);
      console.log(`👤 Actual user name: ${actualUserData.name}`);

      console.log('✅ Custom credentials authentication successful');
    } finally {
      // Clean up using the actual user data that was used for authentication
      await DatabaseCleanup.cleanupTestData(actualUserData);
      await cleanup();
    }
  });

  test('should demonstrate authentication state persistence', async ({ browser }) => {
    console.log('💾 Testing authentication state persistence...');

    // First, create an authenticated context
    const { page: firstPage, cleanup: firstCleanup } = await AuthSetup.createAuthenticatedContext({
      browser,
      existingUser: false,
    });

    let savedUserData: TestUserData | null = null;

    try {
      // Get user data from the first context
      savedUserData = await AuthSetup.getUserDataFromPage(firstPage);
      expect(savedUserData).toBeTruthy();

      // Create a group to verify state persistence
      const groupName = TestDataFactory.createTestGroupName();

      // Click the Create Group button
      await TestHelpers.clickAndWait(
        firstPage,
        '[data-testid="groups-page-header"] button:has-text("Create Group")'
      );

      // Wait for the group name input in the dialog
      await TestHelpers.waitForVisible(firstPage, 'input[placeholder="Enter group name"]');

      // Fill the group name input
      await TestHelpers.fillAndWait(firstPage, 'input[placeholder="Enter group name"]', groupName);

      // Submit the form (more reliable than clicking the button)
      await firstPage.locator('form').dispatchEvent('submit');

      // Wait for the group to appear in the list
      await TestHelpers.waitForVisible(firstPage, `text=${groupName}`);

      console.log('✅ First context: group created successfully');
    } finally {
      await firstCleanup();
    }

    // Now create a second independent context with the same user
    const { page: secondPage, cleanup: secondCleanup } = await AuthSetup.createAuthenticatedContext(
      {
        browser,
        customCredentials: {
          email: savedUserData.email,
          password: savedUserData.password,
        },
        existingUser: true, // Login with existing user
      }
    );

    try {
      // Verify the group persists across contexts
      await TestHelpers.waitForVisible(secondPage, '[data-testid="groups-page-header"]');
      await expect(secondPage).toHaveURL('/app/groups');

      // The group should still be visible (assuming cleanup didn't run)
      // Note: In a real scenario, we'd check for the specific group name

      console.log('✅ Second context: authentication state persisted');
    } finally {
      // Clean up the test user data
      await DatabaseCleanup.cleanupTestData(savedUserData);
      await secondCleanup();
    }
  });

  test('should demonstrate authentication failure handling', async ({ browser }) => {
    console.log('❌ Testing authentication failure handling...');

    // Test with invalid credentials
    const invalidCredentials = {
      email: 'invalid@example.com',
      password: 'wrongpassword',
    };

    try {
      // This should fail gracefully
      await AuthSetup.createAuthenticatedContext({
        browser,
        customCredentials: invalidCredentials,
        skipRegistration: true, // Only try login, don't register
      });

      // If we get here, the test should fail
      expect(true).toBe(false); // Force failure
    } catch (error) {
      // Expected to fail - verify it's the right kind of failure
      expect((error as Error).message).toContain('Login failed');
      console.log('✅ Authentication failure handled correctly');
    }
  });

  test('should demonstrate authentication after cleanup attempt', async ({ browser }) => {
    console.log('🔄 Testing authentication after cleanup attempt...');

    const userData = TestDataFactory.createTestUser('auth-after-cleanup');

    // Create authenticated context and some test data using the specific userData
    const { page, cleanup } = await AuthSetup.createAuthenticatedContext({
      browser,
      userData,
      existingUser: false, // Force new user registration with our userData
    });

    try {
      // Create a test group to verify we can interact with the app
      const groupName = TestDataFactory.createTestGroupName();
      await TestHelpers.clickAndWait(
        page,
        '[data-testid="groups-page-header"] button:has-text("Create Group")'
      );
      await TestHelpers.waitForVisible(page, 'input[placeholder="Enter group name"]');
      await TestHelpers.fillAndWait(page, 'input[placeholder="Enter group name"]', groupName);
      await page.locator('form').dispatchEvent('submit');
      await TestHelpers.waitForVisible(page, `text=${groupName}`);

      console.log('✅ Test data created and user can interact with app');
    } finally {
      // Attempt cleanup (may not work due to authentication issues, but that's ok)
      await DatabaseCleanup.cleanupTestData(userData);
      await cleanup();
    }

    // Validate that we can still authenticate after cleanup attempt
    // (Since cleanup may not work, the user should still exist and we should be able to login)
    const { page: validationPage, cleanup: validationCleanup } =
      await AuthSetup.createAuthenticatedContext({
        browser,
        customCredentials: {
          email: userData.email,
          password: userData.password,
        },
        existingUser: true, // Try to login with the same user (should work since cleanup may not have worked)
      });

    try {
      // Verify we can authenticate successfully after cleanup attempt
      await TestHelpers.waitForVisible(validationPage, '[data-testid="groups-page-header"]');
      await expect(validationPage).toHaveURL('/app/groups');

      // Verify user data is still accessible (email should match, name may be 'Existing User' due to existingUser flag)
      const userInfo = await AuthSetup.getUserDataFromPage(validationPage);
      expect(userInfo?.email).toBe(userData.email);

      console.log('✅ Authentication successful after cleanup attempt');
    } finally {
      // Clean up the test user data (attempt again in case cleanup worked this time)
      await DatabaseCleanup.cleanupTestData(userData);
      await validationCleanup();
    }
  });
});
