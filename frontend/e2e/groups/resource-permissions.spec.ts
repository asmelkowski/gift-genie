import { test, expect } from '@playwright/test';
import { createRegularUser } from '../helpers';
import { GroupsPage } from '../page-objects/GroupsPage';

test.describe('Resource-Level Permissions', () => {
  let groupsPage: GroupsPage;

  test.beforeEach(async ({ page }) => {
    groupsPage = new GroupsPage(page);
  });

  test('user creates group and can immediately manage members', async ({ page, context }) => {
    // 1. Register and login a new user
    // We use createRegularUser for speed and reliability in CI,
    // it handles registration and session setup in one go.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _user = await createRegularUser(page, context);

    // 2. Create a new group
    await groupsPage.goto();
    await groupsPage.waitForLoad();

    const groupName = `Permission Test Group ${Date.now()}`;
    await groupsPage.createGroup(groupName);

    // 3. Verify auto-grant: User should be redirected to members page and have access
    // The app redirects to /groups/[uuid]/members after creation
    await page.waitForURL(/\/groups\/[a-f0-9-]+\/members/);

    // Check that we are on the members page
    await expect(page.locator('h1, h2')).toContainText(/Members/i);

    // Verify we can see the "Add Member" button (indicates management permission)
    const addMemberButton = page.getByRole('button', { name: /Add Member/i }).first();
    await expect(addMemberButton).toBeVisible();

    // 4. Try to add a member to confirm permission is functional
    await addMemberButton.click();
    await page.getByPlaceholder(/Enter member name/i).fill('Test Member');
    await page
      .locator('form')
      .getByRole('button', { name: /Add Member/i })
      .click();

    // Verify member was added successfully
    await expect(page.getByText('Test Member')).toBeVisible();
  });

  test('user cannot access another users group members', async ({ page, context, browser }) => {
    // 1. User 1 creates a group
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _user1 = await createRegularUser(page, context);
    await groupsPage.goto();
    await groupsPage.waitForLoad();

    const groupName = `Private Group ${Date.now()}`;
    await groupsPage.createGroup(groupName);

    // Wait for redirect and capture the group ID
    await page.waitForURL(/\/groups\/([a-f0-9-]+)\/members/);
    const url = page.url();
    const groupId = url.match(/\/groups\/([a-f0-9-]+)\/members/)?.[1];
    expect(groupId).toBeDefined();

    // 2. User 2 tries to access User 1's group members
    // Create a new browser context for User 2 to ensure complete isolation
    const user2Context = await browser.newContext();
    const user2Page = await user2Context.newPage();
    await createRegularUser(user2Page, user2Context);

    // Navigate directly to User 1's group members page
    await user2Page.goto(`/groups/${groupId}/members`);

    // Wait for the page to finish loading and for network to be idle
    // This gives React Query time to make the API calls and get 403 responses
    await user2Page.waitForLoadState('networkidle');

    // Verify Access Denied state is shown
    await expect(user2Page.getByText('Access Denied')).toBeVisible();
    await expect(
      user2Page.getByText(/You don't have permission to view members of this group/i)
    ).toBeVisible();

    // 3. Verify User 2 cannot see User 1's group in their list
    const user2GroupsPage = new GroupsPage(user2Page);
    await user2GroupsPage.goto();
    await user2GroupsPage.waitForLoad();
    await expect(user2Page.getByText(groupName)).not.toBeVisible();

    await user2Context.close();
  });

  test('new user sees empty groups list', async ({ page, context }) => {
    // 1. Register and login a new user
    await createRegularUser(page, context);

    // 2. Go to groups page
    await groupsPage.goto();
    await groupsPage.waitForLoad();

    // 3. Verify empty state is shown instead of an error
    await expect(page.getByText(/No groups yet/i)).toBeVisible();
    await expect(page.getByTestId('empty-state-create-group')).toBeVisible();

    // Verify no groups are listed
    const groupItems = page.locator('[data-testid^="group-item-"]');
    await expect(groupItems).toHaveCount(0);
  });
});
