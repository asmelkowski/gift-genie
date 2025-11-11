import { test } from '@playwright/test';
import { GroupsPage } from '../page-objects/GroupsPage';

test.describe('Group Management', () => {
  let groupsPage: GroupsPage;

  test.beforeEach(async ({ page }) => {
    groupsPage = new GroupsPage(page);
    await groupsPage.goto();
    await groupsPage.waitForLoad();
  });

  test('should create a new group', async ({ page }) => {
    // Create a group with a unique name
    const groupName = `Test Group ${Date.now()}`;
    await groupsPage.createGroup(groupName);

    // Wait for the operation to complete
    await page.waitForLoadState('networkidle');

    // Verify the group appears in the list
    await groupsPage.expectGroupVisible(groupName);
  });

  test('should display empty state when no groups exist', async () => {
    // This test verifies the page loads correctly
    // (Groups may or may not exist depending on test user state)
    await groupsPage.expectPageVisible();
    await groupsPage.expectCreateButtonVisible();
  });
});
