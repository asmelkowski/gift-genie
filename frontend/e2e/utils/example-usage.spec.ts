/**
 * Slimmed-down E2E Tests for Auth Setup Utilities
 * Only tests unique functionality not covered by auth tests
 */

import { test, expect } from '../fixtures';
import { TestDataFactory, AuthSetup, DatabaseCleanup, TestHelpers } from '../utils';

test.describe('Auth Setup Utilities - Essential Tests', () => {
  test('should demonstrate test helpers and retry functionality', async ({ browser }) => {
    const userData = TestDataFactory.createTestUser('helpers-example');

    const { page, cleanup } = await AuthSetup.createAuthenticatedContext({ browser });

    try {
      // Verify we're on groups page
      await TestHelpers.waitForVisible(page, '[data-testid="groups-page-header"]');

      // Test enhanced helpers with retry logic
      await TestHelpers.withTestStep(
        'Test enhanced interactions',
        async () => {
          // Click create group button
          await TestHelpers.clickAndWait(
            page,
            '[data-testid="groups-page-header"] button:has-text("Create Group")'
          );

          // Wait for dialog to appear
          await TestHelpers.waitForVisible(page, 'input[placeholder="Enter group name"]');

          // Fill group name
          const groupName = TestDataFactory.createTestGroupName();
          await TestHelpers.fillAndWait(page, 'input[placeholder="Enter group name"]', groupName);

          // Use specific selector for Create button inside dialog form
          await TestHelpers.retry(
            async () => {
              // More specific selector to avoid clicking wrong button
              await page.click('form button[type="submit"]:has-text("Create")');
              // Wait a bit for the group to be created
              await page.waitForTimeout(1000);
            },
            3, // max attempts
            1000, // base delay
            'create group with specific selector'
          );

          // Verify group was created (give it more time)
          await TestHelpers.waitForVisible(page, `text=${groupName}`, { timeout: 5000 });
        },
        page
      );
    } finally {
      await DatabaseCleanup.cleanupTestData(userData);
      await cleanup();
    }
  });

  test('should validate cleanup functionality properly', async ({ browser }) => {
    const userData = TestDataFactory.createTestUser('cleanup-validation');

    // Create authenticated context and test data
    const { page, cleanup } = await AuthSetup.createAuthenticatedContext({ browser });

    let createdGroupName = '';

    try {
      // Create test data
      createdGroupName = TestDataFactory.createTestGroupName();

      await TestHelpers.withTestStep(
        'Create test group for cleanup validation',
        async () => {
          // Open create group dialog
          await TestHelpers.clickAndWait(
            page,
            '[data-testid="groups-page-header"] button:has-text("Create Group")'
          );

          // Wait for dialog and fill form
          await TestHelpers.waitForVisible(page, 'input[placeholder="Enter group name"]');
          await TestHelpers.fillAndWait(
            page,
            'input[placeholder="Enter group name"]',
            createdGroupName
          );

          // Use specific selector for submit button
          await page.click('form button[type="submit"]:has-text("Create")');

          // Verify group was created
          await TestHelpers.waitForVisible(page, `text=${createdGroupName}`, { timeout: 5000 });
        },
        page
      );
    } finally {
      // Clean up
      await DatabaseCleanup.cleanupTestData(userData);
      await cleanup();
    }

    // Validate cleanup worked by creating new context and checking
    const validationContext = await AuthSetup.createAuthenticatedContext({
      browser,
      existingUser: true,
    });

    try {
      // Verify group is gone (with timeout)
      await TestHelpers.withTestStep(
        'Verify group was cleaned up',
        async () => {
          const groupExists = await validationContext.page
            .locator(`text=${createdGroupName}`)
            .isVisible({ timeout: 3000 });
          expect(groupExists).toBe(false);
        },
        validationContext.page
      );

      console.log('✅ Cleanup validation passed');
    } finally {
      await validationContext.cleanup();
    }
  });
});
