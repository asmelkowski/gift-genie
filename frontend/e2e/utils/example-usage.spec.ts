/**
 * Example E2E Test using the new Auth Setup Utilities
 * Demonstrates independent test execution with automatic cleanup
 */

import { test, expect } from '../fixtures';
import { TestDataFactory, AuthSetup, DatabaseCleanup, TestHelpers } from '../utils';

test.describe('Auth Setup Utilities - Examples', () => {
  test('should register new user and access protected routes', async ({ browser }) => {
    // Generate unique test user data
    const userData = TestDataFactory.createTestUser('new-user-example');

    // Create authenticated context (handles registration + login)
    const { page, cleanup } = await AuthSetup.createAuthenticatedContext({
      browser,
      existingUser: false, // Register new user
    });

    try {
      // Verify we're authenticated and on the groups page
      await TestHelpers.waitForVisible(page, '[data-testid="groups-page-header"]');
      await expect(page).toHaveURL('/app/groups');

      // Test basic functionality
      await TestHelpers.withTestStep(
        'Verify groups page loads',
        async () => {
          const headerText = await page.textContent('[data-testid="groups-page-header"]');
          expect(headerText).toContain('Groups');
        },
        page
      );
    } finally {
      // Clean up test data and browser context
      await DatabaseCleanup.cleanupTestData(userData);
      await cleanup();
    }
  });

  test('should handle existing user login gracefully', async ({ browser }) => {
    // Use existing user credentials (will fallback to registration if user doesn't exist)
    const { page, cleanup } = await AuthSetup.createAuthenticatedContext({
      browser,
      existingUser: true, // Try login first, register if needed
    });

    try {
      // Verify authentication
      await TestHelpers.waitForVisible(page, '[data-testid="groups-page-header"]');

      // Test that we can create a group
      const groupName = TestDataFactory.createTestGroupName();

      await TestHelpers.withTestStep(
        'Create test group',
        async () => {
          await page.click('[data-testid="groups-page-header"] button:has-text("Create Group")');
          await TestHelpers.waitForVisible(page, 'input[placeholder="Enter group name"]');
          await TestHelpers.fillAndWait(page, 'input[placeholder="Enter group name"]', groupName);
          await page.click('button:has-text("Create")');

          // Verify group appears
          await TestHelpers.waitForVisible(page, `text=${groupName}`);
        },
        page
      );
    } finally {
      // Note: cleanup will handle removing the test group
      await cleanup();
    }
  });

  test('should demonstrate test helpers and error handling', async ({ browser }) => {
    const userData = TestDataFactory.createTestUser('helpers-example');

    const { page, cleanup } = await AuthSetup.createAuthenticatedContext({ browser });

    try {
      // Demonstrate enhanced waiting
      await TestHelpers.waitForVisible(page, '[data-testid="groups-page-header"]');

      // Demonstrate enhanced interactions
      await TestHelpers.clickAndWait(
        page,
        '[data-testid="groups-page-header"] button:has-text("Create Group")'
      );

      // Demonstrate form filling with validation
      const groupName = TestDataFactory.createTestGroupName();
      await TestHelpers.waitForVisible(page, 'input[placeholder="Enter group name"]');
      await TestHelpers.fillAndWait(page, 'input[placeholder="Enter group name"]', groupName);

      // Demonstrate retry for potentially flaky operations
      await TestHelpers.retry(
        async () => {
          await page.click('button:has-text("Create")');
          await TestHelpers.waitForVisible(page, `text=${groupName}`, { timeout: 2000 });
        },
        2, // max attempts
        500, // base delay
        'create group'
      );

      // Verify the group was created
      await expect(page.locator(`text=${groupName}`)).toBeVisible();
    } catch (error) {
      // Screenshots are automatically taken by TestHelpers on failures
      console.error('Test failed:', error);
      throw error;
    } finally {
      await DatabaseCleanup.cleanupTestData(userData);
      await cleanup();
    }
  });

  test('should handle authentication failures gracefully', async ({ browser }) => {
    // Test with invalid credentials to demonstrate error handling
    const invalidUserData = {
      email: 'invalid@example.com',
      password: 'wrongpassword',
      name: 'Invalid User',
      testId: 'invalid-test',
    };

    try {
      // This should fail gracefully
      await AuthSetup.createAuthenticatedContext({
        browser,
        customCredentials: invalidUserData,
        skipRegistration: true, // Only try login
      });

      // If we get here, the test should fail
      expect(true).toBe(false); // Force failure
    } catch (error) {
      // Expected to fail - verify it's the right kind of failure
      expect(error.message).toContain('Login failed');
      console.log('✅ Authentication failure handled correctly');
    }
  });

  test('should validate cleanup functionality', async ({ browser }) => {
    const userData = TestDataFactory.createTestUser('cleanup-validation');

    // Create authenticated context
    const { page, cleanup } = await AuthSetup.createAuthenticatedContext({ browser });

    let createdGroupName = '';

    try {
      // Create some test data
      createdGroupName = TestDataFactory.createTestGroupName();
      await page.click('[data-testid="groups-page-header"] button:has-text("Create Group")');
      await TestHelpers.waitForVisible(page, 'input[placeholder="Enter group name"]');
      await TestHelpers.fillAndWait(
        page,
        'input[placeholder="Enter group name"]',
        createdGroupName
      );
      await page.click('button:has-text("Create")');

      // Verify data exists
      await TestHelpers.waitForVisible(page, `text=${createdGroupName}`);
    } finally {
      // Clean up
      await DatabaseCleanup.cleanupTestData(userData);
      await cleanup();
    }

    // Validate cleanup (create new context to check)
    const validationContext = await AuthSetup.createAuthenticatedContext({
      browser,
      existingUser: true,
    });

    try {
      // Verify the group is gone
      const groupExists = await validationContext.page
        .locator(`text=${createdGroupName}`)
        .isVisible();
      expect(groupExists).toBe(false);

      console.log('✅ Cleanup validation passed');
    } finally {
      await validationContext.cleanup();
    }
  });
});
